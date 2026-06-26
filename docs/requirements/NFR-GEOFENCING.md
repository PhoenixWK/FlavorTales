# NFR-GEOFENCING: Non-Functional Requirements — Geofencing & Audio Trigger

> Liên quan: FR-LM-007, FR-LM-008  
> Modules: `flavortales-location`, `flavortales-poi`, `flavortales-audio`  
> Cập nhật lần cuối: 2026-03-25

---

## 1. Performance (Hiệu năng)

### NFR-GEO-P01 — Độ trễ Geofence Check
- Thời gian xử lý mỗi lần kiểm tra inside/outside (Haversine + so sánh bán kính) phải hoàn thành trong **< 50ms** trên thiết bị tầm trung (RAM 3GB, Android 10+).
- Đo tại: client-side, tính từ lúc nhận GPS update đến khi emit event `onEnterPOI` / `onExitPOI`.

### NFR-GEO-P02 — Độ trễ Overlap Resolution
- Toàn bộ pipeline overlap resolution (cooldown + tính weighted score + emit `onResolveOverlap`) phải hoàn thành trong **< 6 giây** kể từ khi `onEnterOverlapZone` được kích hoạt.
- Trong đó: cooldown tối đa 5 giây + tính score tối đa 1 giây.

### NFR-GEO-P03 — Throughput kiểm tra POI
- Khi viewport hiển thị tối đa **50 POI** đồng thời, vòng lặp geofence check toàn bộ viewport phải hoàn thành trong **< 100ms**.
- Throttle tối thiểu 2 giây giữa các lần check để tránh overload CPU.

### NFR-GEO-P04 — Độ trễ Audio Trigger
- Kể từ khi `onResolveOverlap` (hoặc `onEnterPOI` trong trường hợp không giao thoa) được emit, nút Phát chuyển sang trạng thái BẬT trong **< 300ms**.
- Audio bắt đầu phát sau khi người dùng nhấn nút trong **< 1 giây** (bao gồm thời gian fetch stream nếu cần).

---

## 2. Accuracy (Độ chính xác)

### NFR-GEO-A01 — Độ chính xác GPS tối thiểu
- Hệ thống chỉ xử lý GPS update có `accuracy ≤ 15 meters` (trường `horizontalAccuracy` từ device).
- GPS update có `accuracy > 15m` bị **bỏ qua hoàn toàn** — không cập nhật vị trí, không trigger event.
- Nếu 3 lần liên tiếp nhận update với `accuracy > 15m`: hiển thị cảnh báo UI *"Tín hiệu GPS yếu, vị trí có thể không chính xác"*.

### NFR-GEO-A02 — Ngưỡng phát hiện chuyển động
- Người dùng được coi là **đứng yên** khi tốc độ di chuyển < 0.5 m/s trong 5 giây liên tiếp.
- Người dùng được coi là **di chuyển nhanh** (đi xe) khi tốc độ > 2 m/s liên tục trong 3 giây — tắt grace period, không phát audio mới.

### NFR-GEO-A03 — Độ chính xác heading_match
- Vector hướng di chuyển được tính từ **5 điểm GPS gần nhất** (sliding window).
- `heading_match = 1` khi góc lệch giữa hướng đi và vector user→POI **< 45°**.
- Nếu buffer chưa đủ 5 điểm (mới khởi động): mặc định `heading_match = 0`, tăng trọng số `w1` lên 0.55 và `w3` lên 0.25.

---

## 3. Reliability (Độ tin cậy)

### NFR-GEO-R01 — Grace Period chống nhiễu GPS
- Grace period **10 giây** áp dụng khi người dùng thoát vùng POI với tốc độ ≤ 2 m/s.
- Grace period đảm bảo audio không bị ngắt do GPS drift ngắn hạn (tín hiệu bị che khuất tạm thời).
- Trong grace period, trạng thái hệ thống vẫn là `inside` — không emit `onExitPOI`.

### NFR-GEO-R02 — Cooldown chống phát lại
- Mỗi POI sau khi đã được phát audio sẽ bị đánh dấu `played_at = timestamp`.
- Trong vòng **10 phút** kể từ `played_at`, POI đó không được phát lại dù người dùng re-enter vùng.
- Giá trị 10 phút có thể cấu hình tại Admin panel theo từng POI.

### NFR-GEO-R03 — Tính nhất quán khi mất GPS
- Khi mất tín hiệu GPS > 10 giây: giữ nguyên trạng thái inside/outside cuối cùng, hiển thị cảnh báo UI.
- Khi GPS phục hồi: re-evaluate ngay lập tức mà không cần chờ throttle 2 giây.

---

## 4. Usability (Trải nghiệm người dùng)

### NFR-GEO-U01 — Phản hồi trực quan vùng giao thoa
- Trong thời gian cooldown overlap resolution: spinner trên nút Phát không được kéo dài quá **6 giây** (tương ứng NFR-GEO-P02).
- Nếu resolution thất bại (không có POI hợp lệ): ẩn spinner, không hiện lỗi kỹ thuật — chỉ giữ nút Phát ở trạng thái TẮT.

### NFR-GEO-U02 — Banner thông báo
- Banner *"Đang ở tại [Tên gian hàng]"* chỉ hiển thị sau khi overlap resolution hoàn tất — không hiển thị tên POI tạm thời trong cooldown.
- Banner *"Bạn đã rời vùng thuyết minh"* chỉ xuất hiện sau khi hết grace period 10 giây.

### NFR-GEO-U03 — Không ngắt audio đột ngột
- Khi người dùng di chuyển từ vùng POI A sang POI B (hết giao thoa): audio POI A tiếp tục đến hết câu/đoạn hiện tại (tối đa 15 giây) trước khi hệ thống trigger POI B.
- Độ trễ tối đa chấp nhận được giữa khi hết audio POI A và bắt đầu phát POI B: **< 1 giây**.

---

## 5. Testability (Khả năng kiểm thử)

### NFR-GEO-T01 — GPS Simulation Mode
- Module `flavortales-location` phải hỗ trợ **mock GPS provider** trong môi trường test/staging.
- Mock provider có thể inject chuỗi tọa độ theo kịch bản: đi thẳng, đứng yên trong overlap, di chuyển nhanh.

### NFR-GEO-T02 — Observability overlap resolution
- Mỗi lần overlap resolution hoàn tất, hệ thống log:
  - Danh sách POI_IDs trong overlap
  - Điểm score của từng POI
  - POI được chọn và lý do (dominant factor)
  - Thời gian xử lý (ms)
- Log level: `DEBUG` (tắt mặc định ở production, bật được qua feature flag).

### NFR-GEO-T03 — Unit test coverage
- Hàm Haversine và hàm tính weighted score phải đạt **coverage ≥ 90%**.
- Phải có test case bao phủ: 2 POI giao thoa bằng nhau về score (tie-breaking), người dùng đứng yên, người dùng di chuyển nhanh.

---

## Ma trận liên kết NFR → Module

| NFR ID | Module chính | Module liên quan |
|---|---|---|
| NFR-GEO-P01 ~ P03 | `flavortales-location` | — |
| NFR-GEO-P04 | `flavortales-audio` | `flavortales-location` |
| NFR-GEO-A01 ~ A03 | `flavortales-location` | `flavortales-poi` |
| NFR-GEO-R01 ~ R03 | `flavortales-location` | `flavortales-audio` |
| NFR-GEO-U01 ~ U03 | *(Frontend)* | `flavortales-location`, `flavortales-audio` |
| NFR-GEO-T01 ~ T03 | `flavortales-location` | `flavortales-poi` |
