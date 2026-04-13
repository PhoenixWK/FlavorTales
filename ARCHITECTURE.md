# FlavorTales – Thiết Kế Kiến Trúc Hệ Thống

> Tài liệu này ghi lại yêu cầu phi chức năng, thiết kế kiến trúc hiện tại, đánh giá chuyên sâu, giải thích các điểm nghẽn và đề xuất giải pháp cải tiến dưới góc độ Solution Architect.

---

## 1. Yêu Cầu Hệ Thống

### 1.1 Bối Cảnh

FlavorTales là nền tảng du lịch ẩm thực kết nối du khách với các điểm ẩm thực địa phương (vendor). Hệ thống có hai nhóm người dùng chính:

| Nhóm      | Đặc điểm hành vi                                                                 |
|-----------|----------------------------------------------------------------------------------|
| **Tourist** | Trải nghiệm POI, nghe audio dẫn tour, xem menu, like địa điểm — nhiều lần/ngày |
| **Vendor** | Quản lý shop, menu, upload media, theo dõi analytics — thưa                     |
| **Admin**  | Duyệt nội dung, xem dashboard real-time visitor count                           |

### 1.2 Yêu Cầu Phi Chức Năng (NFR)

| ID        | Yêu cầu                                                                  | Mức tiêu chuẩn                          |
|-----------|--------------------------------------------------------------------------|-----------------------------------------|
| NFR-01    | **Concurrent load**: chịu được 1.000 tourist + 500 vendor hoạt động đồng thời | Tổng ~1.500 concurrent connections      |
| NFR-02    | **Latency**: API REST ≤ 500ms (P95) trong điều kiện tải bình thường       | P95 ≤ 500ms, P99 ≤ 2000ms              |
| NFR-03    | **Throughput**: hỗ trợ browse POI, play audio, like, validate session     | ≥ 200 RPS bình thường, spike 500+ RPS  |
| NFR-04    | **Real-time**: đếm visitor trực tiếp hiển thị trên admin dashboard        | Update latency ≤ 2s                     |
| NFR-05    | **Availability**: luôn hoạt động trong giờ cao điểm                       | Uptime ≥ 99% (tương đương ~7h downtime/tháng) |
| NFR-06    | **Storage**: lưu trữ media audio/image, sessions, analytics               | Tự quản lý (Cloudflare R2 + local DBs)  |
| NFR-07    | **Cost**: triển khai trên phần cứng tự có, không dùng cloud compute       | Chi phí vận hành ≤ tiền điện + Cloudflare|

### 1.3 Phần cứng triển khai

| Thông số   | Giá trị                                     |
|------------|---------------------------------------------|
| Thiết bị   | GMTEK mini PC                               |
| CPU        | Intel N100 — 4 core / 4 thread (no HT), 3.4 GHz turbo, TDP 6W |
| RAM        | 32 GB DDR4                                  |
| Storage    | ~1 TB (SSD hoặc NVMe)                       |
| Network    | Cloudflare Tunnel → internet                |
| Domain     | `flavortales.site` (frontend), `api.flavortales.site` (backend) |

> **Tương quan hiệu năng:** N100 có IPC tương đương Intel Xeon E3 v3 (2013), nhưng chỉ 4 luồng và TDP 6W. Không có hyperthreading nên tất cả I/O-bound workload phải được pool hóa kỹ.

---

## 2. Thiết Kế Hiện Tại

### 2.1 Sơ đồ kiến trúc tổng thể

```
┌─────────────────────────────────────────────────────────────┐
│                     INTERNET                                  │
└───────────────────────┬─────────────────────────────────────┘
                        │ HTTPS
               ┌────────▼────────┐
               │ Cloudflare Tunnel │  (ingress duy nhất)
               │  flavortales.site │
               │ api.flavortales.site │
               └────────┬────────┘
                        │ HTTP (docker network)
        ┌───────────────┼───────────────┐
        │               │               │
  ┌─────▼─────┐   ┌─────▼──────┐       │
  │ frontend  │   │  backend   │       │
  │ Next.js 15│──▶│Spring Boot │       │
  │ port 3000 │   │ port 8080  │       │
  │           │   │            │       │
  │ SSR / BFF │   │ JWT+Stateless      │
  └───────────┘   │ 12 modules │       │
                  └─────┬──────┘       │
                        │              │
        ┌───────────────┼──────────────┤
        │               │              │
  ┌─────▼─────┐  ┌─────▼──────┐ ┌─────▼──────┐
  │  MySQL    │  │   Redis    │ │  MongoDB   │
  │ primary   │  │   7.2      │ │   7.0      │
  │ :3308     │  │   :6379    │ │  :27017    │
  │           │  │            │ │            │
  │ replicate │  │ POI cache  │ │  Sessions  │
  │ :3309     │  │ Rate limit │ │  Analytics │
  │ (GTID RO) │  │ Trans.draft│ │  Events    │
  └───────────┘  └────────────┘ └────────────┘

  Tất cả chạy trong Docker Compose trên 1 mini PC
```

### 2.2 Các thành phần chi tiết

#### Backend — Spring Boot 3.5 / Java 21

| Module               | Chức năng                                                |
|----------------------|----------------------------------------------------------|
| `flavortales-auth`   | JWT login/register, email verify, password reset, rate limiting |
| `flavortales-user`   | Hồ sơ người dùng, phân quyền ROLE_vendor / ROLE_admin   |
| `flavortales-poi`    | POI, geofencing, workflow duyệt pending→active/rejected  |
| `flavortales-content`| Shop & menu, dịch thuật tự động (Google Translate)       |
| `flavortales-file`   | Upload/download media lên Cloudflare R2                  |
| `flavortales-audio`  | Audio tour upload & management                           |
| `flavortales-location`| WebSocket STOMP, đếm visitor real-time, session tourist  |
| `flavortales-analytics`| Ghi event vào MongoDB, đọc analytics                   |
| `flavortales-search` | Full-text search indexing                                |
| `flavortales-notification` | Gửi thông báo (email, in-app)                     |
| `flavortales-common` | Shared DTOs, `ApiResponse<T>`, exceptions, AOP           |

#### Cấu hình pool hiện tại (ghi lại từ source code)

```yaml
# database-dev.yml
spring.datasource.master.hikari.maximum-pool-size: 10
spring.datasource.slave.hikari.maximum-pool-size:  10

# redis.yml
spring.data.redis.jedis.pool.max-active: 8

# WebSocketConfig.java
applicationTaskExecutor.setMaxPoolSize(8)
configureClientInboundChannel: maxPoolSize(8)
```

#### MySQL — Master/Slave với GTID

```
┌─────────────────┐    Binary Log (ROW format)    ┌─────────────────────┐
│  mysql-primary  │ ──────────────────────────▶  │  mysql-replicate    │
│   port 3308     │    GTID replication           │   port 3309         │
│  server-id=1    │                               │  server-id=2        │
│  log-bin=ON     │                               │  read-only=ON       │
│  Writes + Reads │                               │  Read-only queries  │
└─────────────────┘                               └─────────────────────┘
        ▲
Spring AOP (@Master / @Slave routing)
```

#### WebSocket — STOMP in-memory broker

```
Tourist Browser
    │  SockJS/WebSocket /ws
    ▼
Spring STOMP Broker (in-memory SimpleBroker)
    │  /topic/active-visitors
    ▼
Admin Dashboard
```

`VisitorPresenceRegistry` = `ConcurrentHashMap<stompSessionId, Instant>` — toàn bộ lưu trong JVM heap.

#### Sơ đồ luồng dữ liệu Locust Test

```
TouristUser.on_start()
  └─▶ POST /api/tourist-sessions          (tạo session)

Task weights:
  × 5  GET  /api/poi                      (browse POI list, từ Redis cache)
  × 3  GET  /api/audio/{poiId}            (play audio, từ Cloudflare R2)
  × 2  POST /api/poi/{id}/like            (write MySQL primary)
  × 1  GET  /api/tourist-sessions/validate (read MongoDB)

TouristUser.on_stop()
  └─▶ DELETE /api/tourist-sessions/{id}  (xóa session)

Breaking point phát hiện: ~915 concurrent users
  - Error rate > 5%
  - P95 latency > 5.000ms
```

---

## 3. Đánh Giá Kiến Trúc

### 3.1 Điểm mạnh

| Điểm mạnh | Ghi chú |
|-----------|---------|
| **MySQL GTID replication** | Tách đọc/ghi rõ ràng, tự động failover nhất quán hơn position-based |
| **AOP routing datasource** | Trong suốt với service layer — không lộ trực tiếp trong business logic |
| **MongoDB cho session** | Document store phù hợp với tourist session có schema linh hoạt; time-series event không cần JOIN |
| **Redis multi-purpose** | POI cache + rate limiting + bản thảo dịch thuật — tận dụng tốt một instance |
| **JWT stateless** | Không session server-side → không cần sticky session → nền tảng cho horizontal scale |
| **Async event-driven** | `ApplicationEventPublisher` tách notification/analytics khỏi request thread |
| **Cloudflare R2** | Offload media storage khỏi mini PC — quyết định đúng đắn |
| **Health check** | Tất cả container đều có `healthcheck` với `depends_on: condition: service_healthy` |

### 3.2 Điểm nghẽn và vấn đề

---

#### ❶ Pool size quá nhỏ (Vấn đề nghiêm trọng nhất)

**Triệu chứng:** Breaking point tại 915 users.

**Phân tích:**

```
Với 1.000 tourist concurrent:
  - Mỗi request cần 1 thread Tomcat (mặc định max=200) ✓
  - Mỗi DB query cần 1 connection từ HikariCP pool

Kịch bản worst-case:
  - 200 request đồng thời cần DB write (like, session) → chờ pool(master=10)
  - 200 request khác cần DB read → chờ pool(slave=10)
  - 100 request Redis → chờ pool(jedis=8)
  - Tất cả thread đều BỊ BLOCK chờ pool → thread starvation
  - Tomcat request queue đầy → timeout → error rate tăng
```

**Tính toán tối ưu cho N100 + 32GB RAM:**

```
HikariCP formula: pool_size = (core_count × 2) + effective_spindle_count
  Với N100 4C + SSD (IOPS tốt):  pool_size ≈ 4×2+1 = 9    (tối thiểu)
  Thực tế I/O-bound web app:      pool_size ≈ 20–30          (khuyến nghị)
  Với 32GB RAM, mỗi MySQL connection ~1MB: 30 connections = 30MB → an toàn

Redis:
  max-active: 8 → tăng lên 20–30
  (mỗi Jedis connection cực kỳ nhẹ ~100KB)

WebSocket thread pool:
  max=8 → nếu >8 STOMP messages đến đồng thời → queue → delay real-time
  Tăng lên 16–32 phù hợp hơn
```

---

#### ❷ `VisitorPresenceRegistry` — In-memory state (Blockers for scale-out)

```java
// Hiện tại:
private final ConcurrentHashMap<String, Instant> sessions = new ConcurrentHashMap<>();
// Toàn bộ state nằm trong JVM heap của 1 instance
```

**Vấn đề:**
- Nếu backend restart → mất toàn bộ presence data → count về 0 đột ngột
- Nếu muốn chạy 2 instance backend → 2 map tách biệt, count sai
- Memory leak nếu `PresenceCleanupScheduler` gặp bug → sessions tích lũy vô hạn

**Giải pháp đề xuất:** Migrate sang Redis:
```
SETEX ft:presence:{stompSessionId} 90 "1"    # TTL tự expire = tự cleanup
INCR  ft:visitor:count                         # atomic counter
DECR  ft:visitor:count                         # khi disconnect
```

---

#### ❸ In-memory STOMP Broker — Single Point of Failure

```
Spring SimpleBroker (enableSimpleBroker("/topic"))
  └─ Chỉ hoạt động trong cùng 1 JVM process
  └─ Nếu backend restart → tất cả subscriber mất kết nối
  └─ Không thể share giữa nhiều instance
```

**Giải pháp đề xuất (nếu cần scale):** Nâng lên `enableStompBrokerRelay` với Redis Pub/Sub:
```java
registry.enableStompBrokerRelay("/topic")
        .setRelayHost("redis")
        .setRelayPort(6379);
```

---

#### ❹ Cloudflare Tunnel — Bottleneck ẩn cho WebSocket

**Phân tích:**
- Cloudflare Tunnel giữ **persistent TCP connection** từ mini PC ra Cloudflare edge
- WebSocket connections (SockJS) PHẢI đi qua cùng tunnel đó
- Cloudflare Free plan: không giới hạn WebSocket connections rõ ràng, nhưng có idle timeout 100s
- Với 1.000 tourist × 1 WebSocket connection mỗi người = 1.000 concurrent WS qua tunnel → có thể bị throttle

**Rủi ro:** Cloudflare có thể ngắt WebSocket idle sau 100s nếu không có heartbeat. SockJS có fallback nhưng mỗi lần reconnect tốn overhead.

---

#### ❺ Không có reverse proxy layer (Nginx)

**Hiện tại:** Internet → Cloudflare Tunnel → Docker network → backend:8080 / frontend:3000

**Vấn đề:**
- Không có HTTP/2 multiplexing ở tầng nội bộ
- Không có gzip compression (Next.js có nhưng Spring Boot mặc định tắt)
- Static asset từ Next.js không được cache ở edge nội bộ
- Không có rate limiting ở tầng network (chỉ có trong Spring Boot = tốn thread)

---

#### ❻ Thiếu Circuit Breaker cho external API

**External calls hiện tại:**
- Google Translate API (dịch POI/shop descriptions)
- Cloudflare R2 (upload/download media)
- SMTP server (gửi email verify)

**Rủi ro:** Nếu Google Translate chậm (>5s), tất cả `@Async` translation thread pool sẽ bị block. Không có timeout/fallback → pool exhaustion → ảnh hưởng các async task khác.

---

### 3.3 Tóm tắt đánh giá

| Hạng mục              | Điểm (1–10) | Nhận xét                              |
|-----------------------|------------|---------------------------------------|
| Database design       | 8/10       | GTID + read/write split đúng hướng   |
| Cache strategy        | 7/10       | Redis đúng chỗ, chưa có eviction policy rõ |
| Async design          | 7/10       | Event-driven tốt, thiếu circuit breaker |
| Connection pooling    | 4/10       | Cấu hình mặc định thấp — bottleneck chính |
| Real-time architecture| 5/10       | In-memory state không bền vững       |
| Security              | 8/10       | Stateless JWT, HTTP-only cookie       |
| Observability         | 4/10       | Chưa có metrics/tracing tập trung     |
| **Tổng thể**          | **6/10**   | Nền tảng tốt, cần tune pool + Redis state migration |

---

## 4. Giải Pháp Kiến Trúc Đề Xuất

### 4.1 Ngắn hạn — Không thay đổi hạ tầng (chi phí = 0)

#### Fix ❶: Tăng pool size

```yaml
# backend/flavortales-app/src/main/resources/database-dev.yml
spring:
  datasource:
    master:
      hikari:
        maximum-pool-size: 25      # từ 10 → 25
        minimum-idle: 5
        connection-timeout: 30000
        idle-timeout: 600000
    slave:
      hikari:
        maximum-pool-size: 25      # từ 10 → 25
        minimum-idle: 5
```

```yaml
# backend/flavortales-app/src/main/resources/redis.yml
spring:
  data:
    redis:
      jedis:
        pool:
          max-active: 25           # từ 8 → 25
          max-idle: 10
          min-idle: 2
          max-wait: 2000ms
```

```java
// WebSocketConfig.java
executor.setCorePoolSize(8);       // từ 4 → 8
executor.setMaxPoolSize(32);       // từ 8 → 32
```

**Tác động dự kiến:** Giải phóng thread starvation, breaking point tăng từ 915 lên ~1.400–1.600 users.

---

#### Fix ❷: Migrate VisitorPresenceRegistry sang Redis

**Trước:**
```java
// ConcurrentHashMap trong JVM heap
private final ConcurrentHashMap<String, Instant> sessions = new ConcurrentHashMap<>();
```

**Sau:**
```java
@Component
public class VisitorPresenceRegistry {
    private final StringRedisTemplate redis;
    private static final String COUNT_KEY = "ft:visitor:count";
    private static final long TTL_SECONDS = 90;

    public void heartbeat(String stompSessionId) {
        String key = "ft:presence:" + stompSessionId;
        Boolean isNew = redis.opsForValue().setIfAbsent(key, "1", Duration.ofSeconds(TTL_SECONDS));
        if (Boolean.TRUE.equals(isNew)) {
            redis.opsForValue().increment(COUNT_KEY);
        } else {
            redis.expire(key, Duration.ofSeconds(TTL_SECONDS));  // refresh TTL
        }
    }

    public boolean remove(String stompSessionId) {
        String key = "ft:presence:" + stompSessionId;
        Boolean existed = redis.delete(key);
        if (Boolean.TRUE.equals(existed)) {
            redis.opsForValue().decrement(COUNT_KEY);
        }
        return Boolean.TRUE.equals(existed);
    }

    public int getCount() {
        String val = redis.opsForValue().get(COUNT_KEY);
        return val == null ? 0 : Integer.parseInt(val);
    }
}
```

**Tác động:** State bền vững qua restart, nền tảng cho scale-out.

---

#### Fix ❸: Thêm timeout cho external API calls

```java
// application.yml
app:
  google-translate:
    timeout-ms: 3000    # fail fast nếu Google chậm
  r2:
    timeout-ms: 10000

// Trong TranslationService:
@Async
@Timeout(3)  // Resilience4j hoặc CompletableFuture.orTimeout
public CompletableFuture<String> translate(String text, String lang) {
    return CompletableFuture
        .supplyAsync(() -> googleTranslateClient.translate(text, lang))
        .orTimeout(3, TimeUnit.SECONDS)
        .exceptionally(ex -> text);  // fallback = giữ nguyên text gốc
}
```

---

### 4.2 Trung hạn — Thêm Nginx vào docker-compose

```yaml
# Thêm vào docker-compose.yml
  nginx:
    image: nginx:alpine
    container_name: flavortales-nginx
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend
      - frontend
```

```nginx
# nginx/nginx.conf
upstream backend_pool {
    server backend:8080;
    keepalive 32;
}

upstream frontend_pool {
    server frontend:3000;
    keepalive 16;
}

server {
    listen 80;

    # Gzip compression
    gzip on;
    gzip_types application/json text/css application/javascript;

    # API routing
    location /api/ {
        proxy_pass http://backend_pool;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_read_timeout 60s;
    }

    # WebSocket
    location /ws/ {
        proxy_pass http://backend_pool;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 3600s;      # giữ WS lâu hơn
    }

    # Frontend
    location / {
        proxy_pass http://frontend_pool;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
    }
}
```

**Tác động:**
- Gzip giảm bandwidth ~60–70% cho JSON response
- Keepalive upstream giảm TCP handshake overhead
- WebSocket timeout 3600s tránh Cloudflare 100s idle timeout issue
- Tập trung logging ở một điểm

---

### 4.3 Dài hạn — Kiến trúc scale-out (nếu vượt 2.000 users)

```
┌─────────────────────────────────────────────────────────────────┐
│                        CLOUDFLARE TUNNEL                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────▼────────┐
                    │     Nginx       │  (Load Balancer + Reverse Proxy)
                    │  round-robin    │
                    └──────┬──┬───────┘
                           │  │
              ┌────────────┘  └────────────┐
              │                             │
     ┌────────▼──────┐             ┌────────▼──────┐
     │  backend-1    │             │  backend-2    │
     │ Spring Boot   │             │ Spring Boot   │
     │  (stateless)  │             │  (stateless)  │
     └───────────────┘             └───────────────┘
              │  shared state via Redis              │
              └──────────────┬───────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
  ┌─────▼─────┐      ┌───────▼────┐      ┌───────▼────┐
  │  MySQL    │      │   Redis    │      │  MongoDB   │
  │ primary   │      │  (shared   │      │            │
  │ +replica  │      │   state)   │      │            │
  └───────────┘      └────────────┘      └────────────┘
```

**Điều kiện cần để scale-out hoạt động:**
1. ✅ JWT stateless — đã đáp ứng
2. ⚠️ `VisitorPresenceRegistry` phải migrate sang Redis (Fix ❷)
3. ⚠️ STOMP broker phải nâng lên Redis relay hoặc RabbitMQ STOMP
4. ✅ Cloudflare R2 cho media — không tie vào local filesystem
5. ⚠️ Session tourist (MongoDB) phải không có local cache in-memory

---

## 5. Phân Tích Kafka — Có Cần Thiết Không?

> Câu hỏi thường gặp khi thiết kế event-driven system: "Có nên dùng Kafka không?"

### Hiện tại: Spring ApplicationEventPublisher (in-process)

```
HTTP Request Thread
    └─▶ ShopService.approveShop()
            └─▶ applicationEventPublisher.publishEvent(ShopApprovedEvent)
                    └─▶ [same JVM] NotificationEventListener.handle()
                    └─▶ [same JVM] AnalyticsEventListener.handle()
                    └─▶ [same JVM] SearchIndexEventListener.handle()
```

### Kafka phù hợp khi:

| Điều kiện                           | FlavorTales thực tế            |
|------------------------------------|-------------------------------|
| Sản xuất > 100.000 events/giờ      | ~10.000–50.000 events/giờ (ở 1.000 users) |
| Cần fan-out tới ≥5 consumers độc lập| 3 listeners hiện tại          |
| Cần replay event (audit log)        | Chưa có yêu cầu               |
| Cần decoupling giữa microservices tách biệt | Monolith hiện tại       |
| Team có kinh nghiệm vận hành Kafka  | Thường chưa có ở giai đoạn seminar |

### Kết luận: **Không nên dùng Kafka tại thời điểm này**

- Kafka broker tiêu thụ ~512MB–1GB RAM minimum → ăn vào 32GB RAM của mini PC
- Overhead vận hành (Zookeeper/KRaft, partition management, consumer group) không tương xứng lợi ích
- `ApplicationEventPublisher` hiện đủ dùng với `@Async` + dedicated thread pool
- **Điểm tái đánh giá:** khi throughput vượt 100.000 events/giờ hoặc khi tách thành microservices thực sự

---

## 6. Roadmap Cải Tiến

| Ưu tiên | Thay đổi                                        | Effort | Impact |
|--------|-------------------------------------------------|--------|--------|
| 🔴 P0   | Tăng pool size (MySQL, Redis, WebSocket)         | 30 phút | Cao — fix bottleneck chính |
| 🔴 P0   | Migrate `VisitorPresenceRegistry` sang Redis     | 2 giờ   | Cao — state bền vững      |
| 🟠 P1   | Thêm timeout/fallback cho Google Translate       | 1 giờ   | Trung bình — reliability  |
| 🟠 P1   | Thêm Nginx vào docker-compose                   | 2 giờ   | Trung bình — gzip + keepalive |
| 🟡 P2   | STOMP broker → Redis relay                      | 4 giờ   | Thấp (chỉ cần khi scale-out)  |
| 🟡 P2   | Prometheus + Grafana dashboard                  | 4 giờ   | Trung bình — visibility   |
| 🟢 P3   | Horizontal scale (2nd instance)                 | 1 ngày  | Chỉ sau P0+P1 xong        |

---

## 7. Kết Luận

Thiết kế kiến trúc FlavorTales thể hiện tư duy hệ thống tốt ở cấp độ sinh viên nâng cao:

- **Đúng hướng:** Tách read/write DB, dùng Redis đúng mục đích, stateless JWT, offload media lên R2, async event processing.
- **Điểm nghẽn chính:** Không phải do kiến trúc sai mà do cấu hình pool mặc định quá thấp — đây là lỗi vận hành, không phải lỗi thiết kế.
- **Blockers cho scale:** `VisitorPresenceRegistry` in-memory và in-memory STOMP broker là hai điểm cần giải quyết trước khi chạy multi-instance.
- **Hardware N100:** Đủ khả năng phục vụ 1.000–1.500 concurrent users sau khi fix pool size, miễn là workload chủ yếu là I/O-bound (đúng với web app đọc DB/cache).

> Sau khi áp dụng P0 fixes (pool tuning + Redis presence), hệ thống dự kiến đạt ~1.400–1.600 concurrent users — vượt mục tiêu 1.500 đặt ra.
