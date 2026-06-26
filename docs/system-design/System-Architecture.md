# Kiến trúc hệ thống — FlavorTales

> **Ngày tạo:** 07/04/2026
> **Phiên bản:** 1.0
> **Phạm vi:** Mô tả toàn diện kiến trúc kỹ thuật của hệ thống FlavorTales

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Sơ đồ thành phần](#2-sơ-đồ-thành-phần)
3. [Frontend — Next.js](#3-frontend--nextjs)
4. [Backend — Spring Boot](#4-backend--spring-boot)
5. [Cơ sở dữ liệu](#5-cơ-sở-dữ-liệu)
6. [Dịch vụ bên ngoài](#6-dịch-vụ-bên-ngoài)
7. [Giao tiếp giữa các thành phần](#7-giao-tiếp-giữa-các-thành-phần)
8. [Bảo mật](#8-bảo-mật)
9. [Hạ tầng & Triển khai](#9-hạ-tầng--triển-khai)
10. [Thiết kế cơ sở dữ liệu](#10-thiết-kế-cơ-sở-dữ-liệu)

---

## 1. Tổng quan kiến trúc

FlavorTales được xây dựng theo mô hình **kiến trúc phân tầng (Layered Architecture)** kết hợp với **mô hình module hoá (Modular Monolith)** ở phía backend. Toàn bộ hệ thống được đóng gói và triển khai bằng Docker Compose, phục vụ ba nhóm người dùng: Vendor, Admin và Khách du lịch ẩn danh.

**Các nguyên tắc thiết kế chính:**

| Nguyên tắc | Mô tả |
|-----------|-------|
| Tách biệt mối quan tâm | Frontend, Backend và Database hoàn toàn độc lập, giao tiếp qua REST API và WebSocket |
| Module hoá backend | Mỗi nghiệp vụ (auth, POI, shop, audio…) là một Maven module riêng biệt |
| Phân tách đọc/ghi | MySQL Master nhận ghi; MySQL Replica xử lý đọc — định tuyến tự động qua AOP |
| Stateless Authentication | JWT trong HTTP-only cookie; không lưu phiên phía server |
| Xử lý bất đồng bộ | Email, dịch thuật, TTS đều chạy bất đồng bộ — không chặn luồng chính |
| Thời gian thực | WebSocket STOMP cho tính năng theo dõi khách trực tuyến |

---

## 2. Sơ đồ thành phần

```
┌─────────────────────────────────────────────────────────────────┐
│                        NGƯỜI DÙNG                               │
│   Khách du lịch (ẩn danh)  │  Vendor  │  Admin                 │
└──────────────┬──────────────┴────┬─────┴──────┬─────────────────┘
               │                   │             │
               ▼                   ▼             ▼
┌─────────────────────────────────────────────────────────────────┐
│                  CLOUDFLARE TUNNEL                               │
│         flavortales.site  │  api.flavortales.site               │
└──────────────┬────────────┴──────┬──────────────────────────────┘
               │                   │
               ▼                   ▼
┌──────────────────────┐   ┌───────────────────────────────────────┐
│  FRONTEND (Next.js)  │   │        BACKEND (Spring Boot)          │
│  Port 3000           │◄──┤  Port 8080                            │
│  - App Router        │   │  - REST API (/api/**)                 │
│  - React 19          │   │  - WebSocket (/ws)                    │
│  - Tailwind CSS      │   │  - 12 Maven Modules                   │
│  - Leaflet Maps      │   │  - Stateless JWT Auth                 │
│  - STOMP/SockJS      │   │  - Master/Slave DB Routing            │
└──────────────────────┘   └──────────┬────────────────────────────┘
                                       │
               ┌───────────────────────┼──────────────────────────┐
               ▼                       ▼                          ▼
┌──────────────────────┐ ┌─────────────────────┐ ┌───────────────────┐
│  MySQL Primary       │ │  MySQL Replica       │ │  Redis 7.2        │
│  Port 3308           │ │  Port 3309           │ │  Port 6379        │
│  Read + Write        │ │  Read Only           │ │  Cache & Rate Limit│
│  GTID Replication ──►│ │  GTID Auto-position  │ └───────────────────┘
└──────────────────────┘ └─────────────────────┘
                                       │
               ┌───────────────────────┘
               ▼
┌──────────────────────┐   ┌──────────────────────┐
│  MongoDB 7.0         │   │  Cloudflare R2        │
│  Port 27017          │   │  (S3-compatible)      │
│  Tourist Sessions    │   │  Ảnh + Audio Files    │
│  Analytics Events    │   │  CDN: cdn.flavor...   │
└──────────────────────┘   └──────────────────────┘
                                       │
               ┌───────────────────────┘
               ▼
┌──────────────────────────────────────┐
│  Google Cloud APIs                   │
│  - Translation API (6 ngôn ngữ)      │
│  - Text-to-Speech API (6 giọng đọc)  │
└──────────────────────────────────────┘
```

---

## 3. Frontend — Next.js

### 3.1 Tổng quan

| Thuộc tính | Giá trị |
|-----------|---------|
| Framework | Next.js 16.1.4 (App Router) |
| Ngôn ngữ | TypeScript (strict mode) |
| UI Library | React 19.2.3 |
| Styling | Tailwind CSS 4 |
| Build Output | Standalone (không cần Node server riêng) |
| Port | 3000 |

### 3.2 Cấu trúc thư mục

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── admin/              # Trang quản trị Admin
│   ├── vendor/             # Trang quản lý Vendor
│   ├── auth/               # Trang đăng nhập / đăng ký
│   ├── map/                # Trang bản đồ du lịch
│   └── api/                # Route handlers (Next.js API)
├── modules/                # Logic nghiệp vụ theo module
│   ├── auth/               # Xác thực, token management
│   ├── poi/                # Points of Interest
│   ├── shop/               # Thông tin quán ăn
│   ├── audio/              # Quản lý audio TTS
│   ├── analytics/          # Dashboard thống kê
│   ├── location/           # Phiên du lịch, WebSocket
│   └── ...                 # Các module khác
└── shared/                 # Thành phần dùng chung
    ├── components/         # UI components tái sử dụng
    ├── hooks/              # Custom React hooks
    ├── i18n/               # Đa ngôn ngữ giao diện
    └── utils/              # Tiện ích
```

### 3.3 Các thư viện chính

| Thư viện | Phiên bản | Mục đích |
|---------|---------|---------|
| `react-leaflet` + `leaflet` | 5.0.0 / 1.9.4 | Bản đồ tương tác, hiển thị POI |
| `leaflet.markercluster` | 1.5.3 | Gom nhóm POI khi zoom out |
| `recharts` | 3.8.1 | Biểu đồ analytics |
| `@stomp/stompjs` + `sockjs-client` | 7.3.0 / 1.6.1 | WebSocket real-time |
| `qrcode` | 1.5.4 | Tạo QR code chia sẻ |
| `@ducanh2912/next-pwa` | — | Progressive Web App |
| `vitest` + `@testing-library/react` | 4.1.1 / 16.3.2 | Unit & component testing |

### 3.4 Bảo vệ Route (Middleware)

Next.js Middleware kiểm tra JWT cookie phía server trước khi render trang:

- **`/vendor/**`** → yêu cầu cookie `access_token`
- **`/admin/**`** → yêu cầu cookie `admin_access_token`
- Nếu thiếu token → redirect đến trang đăng nhập tương ứng, giữ URL gốc trong query param `from`

### 3.5 Tối ưu hình ảnh

Next.js Image Optimization được cấu hình để chấp nhận URL từ:
- `*.r2.cloudflarestorage.com`
- `pub-*.r2.dev`
- `cdn.flavortales.site` (Cloudflare CDN)

---

## 4. Backend — Spring Boot

### 4.1 Tổng quan

| Thuộc tính | Giá trị |
|-----------|---------|
| Framework | Spring Boot 3.5.11 |
| Ngôn ngữ | Java 21 |
| Build Tool | Maven (multi-module) |
| Kiến trúc | Modular Monolith |
| Port | 8080 |
| Auth | JWT Stateless (JJWT 0.12.6) |
| ORM | JPA/Hibernate (DDL: none — schema quản lý thủ công) |
| Mapping | MapStruct 1.6.3 |

### 4.2 Cấu trúc module

| Module | Trách nhiệm chính |
|--------|-----------------|
| `flavortales-app` | Điểm khởi động Spring Boot, tổng hợp tất cả module |
| `flavortales-common` | DTO dùng chung, `ApiResponse<T>`, exceptions, AOP, cấu hình datasource/async |
| `flavortales-auth` | Đăng ký, đăng nhập, xác thực OTP, đặt lại mật khẩu, rate limiting |
| `flavortales-user` | Hồ sơ người dùng, phân quyền role |
| `flavortales-poi` | Quản lý POI, geofencing, dịch thuật, like |
| `flavortales-content` | Quản lý Shop, Menu, phê duyệt admin |
| `flavortales-file` | Upload/quản lý file lên Cloudflare R2 |
| `flavortales-audio` | Tổng hợp TTS đa ngôn ngữ, upload audio |
| `flavortales-location` | Tourist session (MongoDB), WebSocket active visitors |
| `flavortales-analytics` | Thống kê lượt truy cập từ MongoDB |
| `flavortales-notification` | Gửi email bất đồng bộ theo sự kiện |
| `flavortales-search` | Full-text search (stub — chưa triển khai) |
| `flavortales-moderation` | Kiểm duyệt nội dung (stub — chưa triển khai) |

### 4.3 Định tuyến đọc/ghi Database (AOP)

Hệ thống sử dụng AOP và `RoutingDataSource` để tự động phân tách lưu lượng:

```
Request đến Service
        ↓
AOP Aspect kiểm tra annotation @ReadOnly
   ↙                      ↘
@ReadOnly = true        @ReadOnly = false
        ↓                      ↓
DataSource SLAVE         DataSource MASTER
(MySQL Replica :3309)    (MySQL Primary :3308)
```

- **Master** (Port 3308): INSERT, UPDATE, DELETE, tất cả ghi
- **Slave** (Port 3309): SELECT — truy vấn đọc, bao gồm tra cứu khi đăng nhập

### 4.4 Response Format chuẩn

Mọi API đều trả về cấu trúc thống nhất:

```json
{
  "success": true,
  "message": "Thành công",
  "data": { ... },
  "timestamp": "2026-04-07T10:30:00"
}
```

### 4.5 Xử lý bất đồng bộ

Các tác vụ nặng chạy bất đồng bộ qua `@Async`, không chặn luồng xử lý chính:

| Tác vụ | Module |
|--------|--------|
| Gửi email xác thực, phê duyệt, từ chối | `flavortales-notification` |
| Dịch thuật POI/Shop sang 5 ngôn ngữ | `flavortales-poi`, `flavortales-content` |
| Tổng hợp TTS âm thanh | `flavortales-audio` |

---

## 5. Cơ sở dữ liệu

### 5.1 MySQL — Dữ liệu nghiệp vụ chính

| Thuộc tính | Giá trị |
|-----------|---------|
| Phiên bản | MySQL 8.0 |
| Character set | utf8mb4_unicode_ci |
| Mô hình | Primary + Replica (GTID-based replication) |
| Port Primary | 3308 (host) / 3306 (container) |
| Port Replica | 3309 (host) / 3306 (container) |
| Connection pool | HikariCP — 5 min idle / 10 max per datasource |

**Cấu hình replication:**
- GTID (Global Transaction Identifier) — tự động định vị vị trí đồng bộ
- `read_only=ON` trên Replica — ngăn ghi trực tiếp
- Bootstrap tự động qua script `replica-setup.sh` khi khởi động container

**Danh sách bảng (20 bảng):**

| Nhóm | Bảng |
|------|------|
| Người dùng & Xác thực | `user`, `email_verification`, `login_attempt`, `password_reset_token` |
| POI | `poi`, `poi_english`, `poi_korean`, `poi_chinese`, `poi_russian`, `poi_japanese`, `poi_likes` |
| Shop & Menu | `shop`, `shop_english`, `shop_korean`, `shop_chinese`, `shop_russian`, `shop_japanese`, `menu_item`, `shop_image` |
| File & Audio | `file_asset`, `audio` |

### 5.2 Redis 7.2 — Cache & Rate Limiting

| Thuộc tính | Giá trị |
|-----------|---------|
| Phiên bản | Redis 7.2 (Alpine) |
| Port | 6379 |
| Client | Jedis 7.1.0 |
| Connection pool | 8 max-active / 8 max-idle / 1000ms max-wait |

**Dữ liệu được cache:**

| Dữ liệu | Mục đích |
|---------|---------|
| Danh sách POI active | Tăng tốc API bản đồ, tránh query DB lặp lại |
| Chi tiết từng POI | Cache theo `poiId` |
| Audio của từng Shop | Cache theo `shopId` |
| Token blacklist | Lưu JWT đã đăng xuất |
| Rate limiting counter | Đếm số lần đăng nhập thất bại theo IP/user |

### 5.3 MongoDB 7.0 — Dữ liệu phi cấu trúc & Thời gian thực

| Thuộc tính | Giá trị |
|-----------|---------|
| Phiên bản | MongoDB 7.0 |
| Port | 27017 |
| Auto-index creation | Bật |

**Collections:**

| Collection | Nội dung | Đặc điểm |
|-----------|---------|----------|
| `tourist_sessions` | Phiên du lịch ẩn danh: sessionId, ngôn ngữ ưa thích, POI đã xem, audio đã nghe | TTL index 1 giờ — tự động xóa session hết hạn |
| `visitor_events` | Lượt ghé thăm: timestamp, sessionId | Dùng cho báo cáo analytics theo giờ/ngày/tháng/năm |

---

## 6. Dịch vụ bên ngoài

| Dịch vụ | Nhà cung cấp | Mục đích | Ràng buộc |
|---------|-------------|---------|----------|
| **File Storage** | Cloudflare R2 (S3-compatible) | Lưu trữ ảnh (JPEG, PNG) và file audio (MP3) của shop & POI. Phục vụ qua CDN Cloudflare. | Ảnh tối đa 20MB/file, request tối đa 25MB. File audio tối đa 10MB. Naming convention: `{email_username}/images/{filename}`. Cần pre-signed URL để upload; public CDN URL để đọc. |
| **Text-to-Speech** | Google Cloud TTS API | Tổng hợp giọng đọc từ văn bản tiếng Việt cho 6 ngôn ngữ: vi, en, zh, ko, ru, ja | Wavenet voice models. Xử lý song song 6 luồng. Thất bại một ngôn ngữ không ảnh hưởng ngôn ngữ khác. |
| **Dịch thuật** | Google Cloud Translation API | Dịch nội dung POI và Shop từ tiếng Việt sang 5 ngôn ngữ (EN, KO, ZH, JA, RU) | Kích hoạt tự động khi tạo/cập nhật POI và Shop. Chạy bất đồng bộ. |
| **Email** | Gmail SMTP | Gửi email xác thực, thông báo phê duyệt, OTP đặt lại mật khẩu | SMTP TLS port 587. Template HTML Thymeleaf. Gửi bất đồng bộ `@Async`. |
| **CDN & Tunnel** | Cloudflare | Phân phối tài nguyên tĩnh (R2 CDN) + expose ứng dụng qua Cloudflare Tunnel | Domain: `flavortales.site` (frontend), `api.flavortales.site` (backend) |
| **WebSocket** | STOMP over WebSocket + SockJS | Hiển thị số lượng khách trực tuyến theo thời gian thực trên Admin Dashboard | Endpoint `/ws`. Reconnect tự động sau 5 giây. Không lưu thông tin cá nhân. |

---

## 7. Giao tiếp giữa các thành phần

### 7.1 Frontend ↔ Backend

| Phương thức | Mô tả | Ví dụ |
|------------|-------|-------|
| REST API (HTTP/HTTPS) | Giao thức chính cho mọi tác vụ CRUD | `GET /api/poi`, `POST /api/auth/login` |
| WebSocket (STOMP) | Kênh thời gian thực cho admin dashboard | Subscribe `/topic/active-visitors` |
| HTTP-only Cookie | Truyền JWT token an toàn | `access_token`, `admin_access_token` |

### 7.2 Phân quyền API

| Nhóm endpoint | Quyền truy cập |
|--------------|----------------|
| `POST /api/auth/**` | Công khai (đăng ký, đăng nhập, OTP) |
| `GET /api/poi`, `/api/poi/*/like` | Công khai (khách du lịch ẩn danh) |
| `GET /api/tourist/**` | Công khai (phiên du lịch ẩn danh) |
| `GET /ws/**` | Công khai (WebSocket handshake) |
| `GET /api/analytics/admin/**` | Chỉ `ROLE_admin` |
| Tất cả route còn lại | Yêu cầu JWT hợp lệ |

### 7.3 Luồng giao tiếp nội bộ Backend

```
HTTP Request
     ↓
JwtAuthenticationFilter (validate token)
     ↓
Controller → Service → Repository
     ↓
AOP DataSource Routing (@ReadOnly → Slave / else → Master)
     ↓
Event Publisher (ApplicationEvent)
     ↓
@Async Listeners (Notification, Translation, TTS)
```

---

## 8. Bảo mật

### 8.1 Xác thực & Phân quyền

| Cơ chế | Chi tiết |
|--------|---------|
| JWT Algorithm | HMAC-SHA-256 |
| Token Lifetime | Access: 24h (7 ngày nếu Remember Me); Refresh: 30 ngày |
| Lưu trữ Token | HTTP-only cookie — không thể truy cập từ JavaScript, ngăn XSS |
| Token Invalidation | Blacklist in-memory; `passwordChangedAt` vô hiệu token cũ sau đổi mật khẩu |
| Session Policy | STATELESS — không lưu phiên phía server |

### 8.2 Bảo vệ đăng nhập

| Quy tắc | Giá trị |
|---------|---------|
| Rate limit | 5 lần / 15 phút mỗi IP |
| Lockout | 10 lần thất bại liên tiếp → khoá 30 phút |
| Enumeration protection | Thông báo lỗi chung, không tiết lộ email/mật khẩu sai |
| Password hashing | BCrypt cost factor 12 |

### 8.3 Bảo mật khác

| Cơ chế | Mô tả |
|--------|-------|
| CORS | Cấu hình qua env `APP_CORS_ALLOWED_ORIGINS` |
| HTTPS | Bắt buộc trên production qua Cloudflare Tunnel |
| File upload validation | Chỉ JPEG/PNG; max 20MB/file, 25MB/request |
| Dữ liệu ẩn danh | Tourist session không lưu PII — chỉ UUID ngẫu nhiên |
| Reset password limit | Tối đa 3 yêu cầu/giờ mỗi IP |

---

## 9. Hạ tầng & Triển khai

### 9.1 Docker Compose Services

| Service | Image | Port (host:container) | Mô tả |
|---------|-------|-----------------------|-------|
| `frontend` | Built từ Dockerfile | 3000:3000 | Next.js standalone server |
| `backend` | Built từ Dockerfile | 8080:8080 | Spring Boot application |
| `mysql-primary` | mysql:8.0 | 3308:3306 | MySQL Master — nhận ghi |
| `mysql-replicate` | mysql:8.0 | 3309:3306 | MySQL Replica — chỉ đọc |
| `replication-setup` | mysql:8.0 | — | Bootstrap replication (one-shot) |
| `redis` | redis:7.2-alpine | 6379:6379 | Cache & rate limiting |
| `mongodb` | mongo:7.0 | 27017:27017 | Document store |
| `cloudflared` | cloudflare/cloudflared | — | Tunnel: expose ra internet |

### 9.2 Volumes bền vững

| Volume | Dữ liệu |
|--------|---------|
| `flavortales-primary-data` | MySQL Primary data |
| `flavortales-replicate-data` | MySQL Replica data |
| `flavortales-redis-data` | Redis persistence (AOF/RDB) |
| `flavortales-mongodb-data` | MongoDB collections |

### 9.3 Biến môi trường quan trọng

| Biến | Mô tả |
|------|-------|
| `APP_JWT_SECRET` | Khoá bí mật ký JWT |
| `APP_CORS_ALLOWED_ORIGINS` | Origin được phép CORS |
| `REDIS_HOST` / `REDIS_PORT` | Kết nối Redis |
| `MONGODB_URI` | MongoDB connection string |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY`, `R2_SECRET_KEY` | Cloudflare R2 credentials |
| `R2_PUBLIC_URL` | CDN URL công khai |
| `GOOGLE_TTS_API_KEY` | Google Cloud API key (dùng cho cả TTS và Translate) |
| `SPRING_MAIL_USERNAME` / `SPRING_MAIL_PASSWORD` | Gmail SMTP credentials |
| `NEXT_PUBLIC_API_BASE_URL` | URL backend dùng phía client |
| `INTERNAL_API_BASE_URL` | URL backend dùng từ Next.js server (SSR) |

---

## 10. Thiết kế cơ sở dữ liệu

### 10.1 Sơ đồ quan hệ (ER)

```
user ──────────────────────────────────────────────────────┐
  │ (1)                                                      │
  │                                                          │
  ├── email_verification (N)                                 │
  ├── login_attempt (N)                                      │
  └── password_reset_token (N)                               │
                                                             │ vendor_id
poi ─────────────────────────────────────────────────────── ┤
  │ (1)                             (N)                      │
  ├── poi_english/korean/chinese/russian/japanese             │
  └── poi_likes (N, anonymous via session_id)                │
       │                                                      │
       └── shop ──────────────────────────────── vendor_id ──┘
             │ (1)
             ├── shop_english/korean/chinese/russian/japanese
             ├── shop_image (N, sort_order)
             ├── menu_item (N)
             └── audio (N, unique: shop_id + language_code)
                   └── file_asset (1)

file_asset ── tham chiếu bởi: audio, shop_image
```

### 10.2 Thiết kế đa ngôn ngữ

Mỗi entity có thể dịch được (POI, Shop) có bảng translation riêng theo ngôn ngữ:

| Bảng chính | Bảng dịch |
|-----------|----------|
| `poi` | `poi_english`, `poi_korean`, `poi_chinese`, `poi_russian`, `poi_japanese` |
| `shop` | `shop_english`, `shop_korean`, `shop_chinese`, `shop_russian`, `shop_japanese` |

Các bảng dịch lưu: `name`, `address`/`description`, trạng thái dịch, và thông tin ngôn ngữ. Quan hệ 1:1 với bảng cha theo `poi_id`/`shop_id`.

### 10.3 Trạng thái nghiệp vụ

| Entity | Các trạng thái |
|--------|---------------|
| `user.status` | `inactive` → `active` → `suspended` / `disabled` / `rejected` |
| `poi.status` | `pending` → `active` / `rejected` / `inactive` / `deleted` |
| `shop.status` | `pending` → `active` / `rejected` / `disabled` |
| `audio.processing_status` | `processing` → `completed` / `failed` |

---

*Tài liệu này mô tả kiến trúc hệ thống FlavorTales phiên bản 1.0, ngày 07/04/2026.*
