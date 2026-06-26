# Tài Liệu Thiết Kế Cơ Sở Dữ Liệu – FlavorTales

> **Mục 12 – Database Design Document**
> Phiên bản: 1.0 | Ngày: 07/04/2026

---

## 12.1 Tổng Quan

Hệ thống FlavorTales sử dụng **ba hệ quản trị cơ sở dữ liệu** phục vụ các mục đích khác nhau:

| Hệ thống | Phiên bản | Mục đích chính |
|---|---|---|
| **MySQL 8.0** | 8.0 (Primary + Replica) | Lưu trữ dữ liệu nghiệp vụ chính: người dùng, POI, gian hàng, menu, file, audio |
| **Redis 7.2** | 7.2 | Cache dữ liệu thường xuyên đọc, giới hạn tốc độ đăng nhập, blacklist JWT |
| **MongoDB 7.0** | 7.0 | Lưu dữ liệu phi cấu trúc: phiên du khách, sự kiện vị trí theo thời gian thực |

### Kiến trúc tổng thể

```
                     ┌─────────────────────────────────┐
                     │         Spring Boot Backend      │
                     └────────┬──────────┬──────────────┘
                              │          │          │
                   ┌──────────▼──┐  ┌────▼────┐  ┌─▼──────────┐
                   │  MySQL      │  │  Redis  │  │  MongoDB   │
                   │  Primary    │  │  7.2    │  │  7.0       │
                   │  (Writes)   │  │         │  │            │
                   └──────────┬──┘  └─────────┘  └────────────┘
                              │ GTID Replication
                   ┌──────────▼──┐
                   │  MySQL      │
                   │  Replica    │
                   │  (Reads)    │
                   └─────────────┘
```

**Chiến lược định tuyến đọc/ghi**: AOP-based `DataSourceContextHolder` + `RoutingDataSource` tự động phân luồng truy vấn `SELECT` sang Replica và `INSERT/UPDATE/DELETE` sang Primary.

---

## 12.2 MySQL – Thiết Kế Bảng

**Bộ ký tự mặc định**: `utf8mb4` / `utf8mb4_unicode_ci` (hỗ trợ đầy đủ Unicode, emoji, tiếng CJK).

**Quy tắc chung**:
- Tất cả bảng dùng `ENGINE=InnoDB` để hỗ trợ transaction và foreign key
- Trường `created_at`, `updated_at` dùng `TIMESTAMP DEFAULT CURRENT_TIMESTAMP`
- Soft delete dùng `deleted_at TIMESTAMP NULL` (NULL = chưa xóa)
- Trạng thái dùng `ENUM` tường minh

### 12.2.1 Nhóm Quản Lý Người Dùng

#### Bảng `user`

Lưu thông tin tài khoản của vendor và admin.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `user_id` | INT | PRIMARY KEY, AUTO_INCREMENT | Khóa chính |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Email đăng nhập, duy nhất toàn hệ thống |
| `password_hash` | VARCHAR(255) | NOT NULL | Mật khẩu đã mã hóa |
| `role` | ENUM('vendor','admin') | NOT NULL | Vai trò người dùng |
| `full_name` | VARCHAR(100) | NOT NULL | Họ tên đầy đủ |
| `phone` | VARCHAR(20) | NULL | Số điện thoại liên hệ |
| `status` | ENUM(...) | DEFAULT 'inactive' | Trạng thái tài khoản |
| `password_changed_at` | TIMESTAMP | NULL | Thời điểm đổi mật khẩu; vô hiệu hóa JWT cũ |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Thời điểm tạo tài khoản |
| `updated_at` | TIMESTAMP | ON UPDATE NOW() | Thời điểm cập nhật gần nhất |

**Trạng thái `status`**: `active` | `inactive` | `pending` | `rejected` | `suspended` | `disabled`

**Chỉ mục**: `idx_email(email)`, `idx_role_status(role, status)`, `idx_created_at(created_at)`

---

#### Bảng `email_verification`

Lưu mã OTP xác minh email khi đăng ký tài khoản mới.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `verification_id` | INT | PRIMARY KEY | Khóa chính |
| `user_id` | INT | FK → user | Tài khoản cần xác minh |
| `verification_code` | VARCHAR(6) | NOT NULL | Mã OTP 6 chữ số |
| `expires_at` | TIMESTAMP | NOT NULL | Thời hạn hiệu lực của mã |
| `is_verified` | BOOLEAN | DEFAULT FALSE | Đánh dấu đã xác minh thành công |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Thời điểm gửi mã |

**Quan hệ**: `user` **1:N** `email_verification` — một tài khoản có thể có nhiều lần xác minh email (`user_id` → `user(user_id)` ON DELETE CASCADE)

---

#### Bảng `login_attempt`

Ghi nhận lịch sử đăng nhập phục vụ giới hạn tốc độ và khóa tài khoản tạm thời.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT | PRIMARY KEY | Khóa chính |
| `identifier` | VARCHAR(255) | NOT NULL | Email hoặc định danh đăng nhập |
| `success` | BOOLEAN | DEFAULT FALSE | Đăng nhập thành công/thất bại |
| `locked_until` | TIMESTAMP | NULL | Nếu không NULL: thời điểm hết khóa |
| `attempted_at` | TIMESTAMP | DEFAULT NOW() | Thời điểm thử đăng nhập |

**Quan hệ**: Bảng này **không có FK** — identifier chỉ là chuỗi email, không ràng buộc trực tiếp với `user`. Mối quan hệ logic là **N:1** (nhiều lần thử → một định danh).

**Chỉ mục**: `idx_la_identifier(identifier)`, `idx_la_attempted_at(attempted_at)`

---

#### Bảng `password_reset_token`

Quản lý mã đặt lại mật khẩu gửi qua email.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | BIGINT | PRIMARY KEY | Khóa chính |
| `user_id` | INT | FK → user | Tài khoản yêu cầu đặt lại |
| `token` | CHAR(6) | NOT NULL, UNIQUE | Mã ngẫu nhiên 6 chữ số |
| `expires_at` | TIMESTAMP | NOT NULL | Hết hạn sau 30 phút |
| `is_used` | BOOLEAN | DEFAULT FALSE | TRUE sau khi đã sử dụng |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Thời điểm tạo mã |

**Quan hệ**: `user` **1:N** `password_reset_token` — một tài khoản có thể có nhiều token đặt lại mật khẩu qua thời gian (`user_id` → `user(user_id)` ON DELETE CASCADE)

---

### 12.2.2 Nhóm Quản Lý POI (Điểm Tham Quan)

#### Bảng `poi`

Bảng chính lưu thông tin điểm tham quan bằng tiếng Việt.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `poi_id` | INT | PRIMARY KEY | Khóa chính |
| `vendor_id` | INT | FK → user | Vendor sở hữu POI |
| `name` | VARCHAR(255) | NOT NULL | Tên điểm tham quan |
| `latitude` | DECIMAL(10,8) | NOT NULL | Vĩ độ địa lý |
| `longitude` | DECIMAL(11,8) | NOT NULL | Kinh độ địa lý |
| `radius` | DECIMAL(8,2) | NOT NULL | Bán kính geofence (mét) |
| `address` | VARCHAR(500) | NULL | Địa chỉ mô tả |
| `status` | ENUM(...) | DEFAULT 'pending' | Trạng thái duyệt |
| `likes_count` | INT UNSIGNED | DEFAULT 0 | Tổng số lượt thích từ du khách |
| `deleted_at` | TIMESTAMP | NULL | Soft-delete; NULL = chưa xóa |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Ngày tạo |
| `updated_at` | TIMESTAMP | ON UPDATE NOW() | Ngày cập nhật |

**Trạng thái `status`**: `pending` | `active` | `inactive` | `rejected` | `deleted`

**Quan hệ**:
- `user` **1:N** `poi` — một vendor có thể tạo nhiều POI (`vendor_id` → `user(user_id)` ON DELETE RESTRICT)
- `poi` **1:1** `poi_english`, `poi_korean`, `poi_chinese`, `poi_russian`, `poi_japanese` — mỗi POI có đúng một bản dịch cho mỗi ngôn ngữ
- `poi` **1:N** `poi_likes` — một POI có nhiều lượt thích từ các phiên du khách khác nhau
- `poi` **1:N** `shop` — một POI có thể liên kết với nhiều gian hàng (nullable)
- `poi` **1:N** `audio` — một POI liên kết với nhiều file audio (thông qua gian hàng)

**Chỉ mục**: `idx_status(status)`, `idx_vendor(vendor_id)`, `idx_location(latitude, longitude)`

---

#### Bảng Dịch Thuật POI

Hệ thống duy trì **5 bảng dịch thuật** theo cấu trúc đồng nhất, mỗi bảng cho một ngôn ngữ:

| Tên bảng | Ngôn ngữ |
|---|---|
| `poi_english` | Tiếng Anh (en) |
| `poi_korean` | Tiếng Hàn (ko) |
| `poi_chinese` | Tiếng Trung (zh) |
| `poi_russian` | Tiếng Nga (ru) |
| `poi_japanese` | Tiếng Nhật (ja) |

**Cấu trúc**: `poi_id` là PRIMARY KEY đồng thời là FOREIGN KEY → `poi(poi_id)` ON DELETE CASCADE.

**Quan hệ**: `poi` **1:1** `poi_{ngôn_ngữ}` — mỗi POI có **đúng một** bản dịch cho mỗi ngôn ngữ. Đây là quan hệ **1:1 bắt buộc** được đảm bảo bởi việc dùng `poi_id` làm PRIMARY KEY của bảng dịch.

Các trường dịch thuật: `name`, `address`. Các trường còn lại (tọa độ, trạng thái, số lượt thích) được denormalize để truy vấn linh hoạt.

---

#### Bảng `poi_likes`

Lưu lượt thích của du khách ẩn danh theo phiên.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `poi_id` | INT | PK (composite), FK → poi | POI được thích |
| `session_id` | VARCHAR(36) | PK (composite) | UUID phiên du khách ẩn danh |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Thời điểm thích |

**Quan hệ**: `poi` **1:N** `poi_likes` — một POI có thể nhận lượt thích từ nhiều phiên du khách khác nhau. Composite PK `(poi_id, session_id)` đảm bảo mỗi phiên chỉ thích một POI đúng một lần.

---

### 12.2.3 Nhóm Quản Lý File

#### Bảng `file_asset`

Trung tâm quản lý mọi file tải lên Cloudflare R2.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `file_id` | INT | PRIMARY KEY | Khóa chính |
| `owner_id` | INT | FK → user | Người dùng tải file lên |
| `bucket` | VARCHAR(100) | NOT NULL | Tên R2 bucket |
| `object_key` | VARCHAR(1000) | NOT NULL | Đường dẫn object trong R2 |
| `file_url` | VARCHAR(1000) | NOT NULL | URL công khai hoặc pre-signed |
| `file_type` | ENUM(...) | NOT NULL | Loại file: image, audio, document, other |
| `mime_type` | VARCHAR(100) | NULL | MIME type (vd: image/jpeg) |
| `size_bytes` | BIGINT UNSIGNED | NULL | Kích thước file (bytes) |
| `checksum` | VARCHAR(64) | NULL | SHA-256 kiểm tra toàn vẹn |
| `version` | INT UNSIGNED | DEFAULT 1 | Phiên bản file (khi thay thế) |
| `status` | ENUM('active','deleted') | DEFAULT 'active' | Trạng thái file |
| `uploaded_at` | TIMESTAMP | DEFAULT NOW() | Thời điểm tải lên |
| `deleted_at` | TIMESTAMP | NULL | Thời điểm xóa (soft-delete) |

**Quan hệ**:
- `user` **1:N** `file_asset` — một vendor có thể tải lên nhiều file (`owner_id` → `user(user_id)` ON DELETE RESTRICT)
- `file_asset` **1:1** `shop` (avatar) — một file ảnh làm avatar cho **tối đa một** gian hàng (nullable)
- `file_asset` **1:1** `menu_item` (image) — một file ảnh dùng cho **tối đa một** món ăn (nullable)
- `file_asset` **1:1** `audio` — một file audio tương ứng với **đúng một** bản ghi audio
- `file_asset` **1:N** `shop_image` — một file ảnh có thể xuất hiện trong gallery của gian hàng

**Chỉ mục**: `idx_owner(owner_id)`, `idx_file_type(file_type)`, `idx_bucket_key(bucket, object_key(255))`, `idx_status(status)`

---

### 12.2.4 Nhóm Quản Lý Nội Dung (Gian Hàng & Menu)

#### Bảng `shop`

Thông tin gian hàng ẩm thực của vendor.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `shop_id` | INT | PRIMARY KEY | Khóa chính |
| `vendor_id` | INT | FK → user | Vendor sở hữu |
| `poi_id` | INT | FK → poi, NULL | POI liên kết (tùy chọn) |
| `avatar_file_id` | INT | FK → file_asset, NULL | Ảnh đại diện gian hàng |
| `name` | VARCHAR(255) | NOT NULL | Tên gian hàng |
| `description` | TEXT | NULL | Mô tả tổng quát |
| `cuisine_style` | VARCHAR(100) | NULL | Phong cách ẩm thực |
| `featured_dish` | VARCHAR(255) | NULL | Món đặc trưng |
| `status` | ENUM(...) | DEFAULT 'pending' | Trạng thái duyệt |
| `tags` | JSON | NULL | Nhãn phân loại (tối đa 5) |
| `opening_hours` | JSON | NULL | Giờ mở cửa theo từng ngày |
| `draft_data` | JSON | NULL | Dữ liệu nháp tự động lưu |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Ngày tạo |
| `updated_at` | TIMESTAMP | ON UPDATE NOW() | Ngày cập nhật |

**Trạng thái `status`**: `pending` | `active` | `rejected` | `disabled`

**Quan hệ**:
- `user` **1:N** `shop` — một vendor có thể sở hữu nhiều gian hàng (`vendor_id` → `user(user_id)` ON DELETE RESTRICT)
- `poi` **1:N** `shop` — một POI có thể liên kết nhiều gian hàng; nullable (`poi_id` → `poi(poi_id)` ON DELETE SET NULL)
- `file_asset` **1:1** `shop` — một file ảnh làm avatar cho tối đa một gian hàng; nullable (`avatar_file_id` → `file_asset(file_id)` ON DELETE SET NULL)
- `shop` **1:1** `shop_english/korean/chinese/russian/japanese` — mỗi gian hàng có đúng một bản dịch cho mỗi ngôn ngữ
- `shop` **1:N** `menu_item` — một gian hàng có nhiều món ăn
- `shop` **1:N** `shop_image` — một gian hàng có nhiều ảnh trong gallery
- `shop` **1:N** `audio` — một gian hàng có tối đa một audio cho mỗi ngôn ngữ (6 ngôn ngữ)

---

#### Bảng Dịch Thuật Shop

5 bảng dịch thuật song song với bảng gốc `shop`:

| Tên bảng | Ngôn ngữ |
|---|---|
| `shop_english` | Tiếng Anh (en) |
| `shop_korean` | Tiếng Hàn (ko) |
| `shop_chinese` | Tiếng Trung (zh) |
| `shop_russian` | Tiếng Nga (ru) |
| `shop_japanese` | Tiếng Nhật (ja) |

**Cấu trúc**: `shop_id` là PRIMARY KEY + FOREIGN KEY → `shop(shop_id)` ON DELETE CASCADE.

**Quan hệ**: `shop` **1:1** `shop_{ngôn_ngữ}` — mỗi gian hàng có **đúng một** bản dịch cho mỗi ngôn ngữ. Quan hệ **1:1 bắt buộc**, đảm bảo bởi `shop_id` là PRIMARY KEY của bảng dịch.

Các trường dịch thuật: `name`, `description`, `cuisine_style`, `featured_dish`. Các trường mở rộng `tags`, `opening_hours` cũng có trong bảng dịch để hỗ trợ nội dung đa ngôn ngữ.

---

#### Bảng `menu_item`

Danh sách món ăn trong mỗi gian hàng.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `item_id` | INT | PRIMARY KEY | Khóa chính |
| `shop_id` | INT | FK → shop | Gian hàng chứa món |
| `image_file_id` | INT | FK → file_asset, NULL | Ảnh món ăn |
| `name` | VARCHAR(255) | NOT NULL | Tên món |
| `description` | TEXT | NULL | Mô tả món ăn |
| `status` | ENUM(...) | DEFAULT 'pending' | Trạng thái duyệt |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Ngày tạo |
| `updated_at` | TIMESTAMP | ON UPDATE NOW() | Ngày cập nhật |

**Quan hệ**:
- `shop` **1:N** `menu_item` — một gian hàng có nhiều món ăn (`shop_id` → `shop(shop_id)` ON DELETE CASCADE)
- `file_asset` **1:1** `menu_item` — một file ảnh dùng cho tối đa một món ăn; nullable (`image_file_id` → `file_asset(file_id)` ON DELETE SET NULL)

**Trạng thái**: `pending` | `active` | `rejected` | `disabled`

---

#### Bảng `shop_image`

Thư viện ảnh (gallery) của mỗi gian hàng.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `id` | INT | PRIMARY KEY | Khóa chính |
| `shop_id` | INT | FK → shop | Gian hàng sở hữu ảnh |
| `file_id` | INT | FK → file_asset | File ảnh trong R2 |
| `sort_order` | INT | DEFAULT 0 | Thứ tự hiển thị (kéo thả) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Ngày tải lên |

**Quan hệ**:
- `shop` **1:N** `shop_image` — một gian hàng có nhiều ảnh gallery (`shop_id` → `shop(shop_id)` ON DELETE CASCADE)
- `file_asset` **1:N** `shop_image` — một file ảnh có thể xuất hiện trong gallery (`file_id` → `file_asset(file_id)` ON DELETE CASCADE)

---

### 12.2.5 Nhóm Quản Lý Audio

#### Bảng `audio`

Lưu thông tin file audio hướng dẫn cho từng gian hàng theo ngôn ngữ.

| Cột | Kiểu dữ liệu | Ràng buộc | Mô tả |
|---|---|---|---|
| `audio_id` | INT | PRIMARY KEY | Khóa chính |
| `shop_id` | INT | FK → shop | Gian hàng sở hữu audio |
| `poi_id` | INT | FK → poi, NULL | POI liên kết (nullable) |
| `file_id` | INT | FK → file_asset | File audio trên R2 |
| `language_code` | VARCHAR(10) | NOT NULL | Mã ngôn ngữ: vi, en, zh, ko, ru, ja |
| `duration_seconds` | DECIMAL(8,2) | NULL | Thời lượng audio (giây) |
| `tts_provider` | VARCHAR(50) | NULL | Dịch vụ TTS: google_tts, upload… |
| `processing_status` | ENUM(...) | DEFAULT 'completed' | Trạng thái xử lý TTS |
| `status` | ENUM(...) | DEFAULT 'pending' | Trạng thái duyệt |
| `uploaded_by` | INT | FK → user | Vendor tải lên |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Ngày tạo |
| `updated_at` | TIMESTAMP | ON UPDATE NOW() | Ngày cập nhật |

**Ràng buộc duy nhất**: `UNIQUE KEY uq_shop_language(shop_id, language_code)` – mỗi gian hàng chỉ có đúng 1 audio cho mỗi ngôn ngữ.

**`processing_status`**: `processing` | `completed` | `failed`

**Quan hệ**:
- `shop` **1:N** `audio` — một gian hàng có **tối đa một audio cho mỗi ngôn ngữ** (ràng buộc unique `uq_shop_language`); về mặt FK là 1:N nhưng bị giới hạn bởi unique constraint (`shop_id` → `shop(shop_id)` ON DELETE CASCADE)
- `poi` **1:N** `audio` — một POI liên kết với nhiều audio qua các gian hàng; nullable (`poi_id` → `poi(poi_id)` ON DELETE SET NULL)
- `file_asset` **1:1** `audio` — một file audio tương ứng với đúng một bản ghi audio (`file_id` → `file_asset(file_id)` ON DELETE RESTRICT)
- `user` **1:N** `audio` — một vendor có thể tải lên nhiều audio cho nhiều gian hàng (`uploaded_by` → `user(user_id)` ON DELETE RESTRICT)

**`status`**: `pending` | `active` | `rejected` | `disabled`

---

## 12.3 Sơ Đồ Quan Hệ (ERD)

```
user (user_id) ──────────────────┬──────────────────┬───────────────────┐
     │                           │                  │                   │
     │ 1:N                       │ 1:N              │ 1:N               │ 1:N
     ▼                           ▼                  ▼                   ▼
poi (poi_id)              file_asset (file_id)  shop (shop_id)   login_attempt
     │                           │                  │
     │ 1:N                       │ 1:1 (avatar)     │ 1:N
     ▼                           ▼                  ▼
poi_likes              ┌─────────┴─────────┐   menu_item (item_id)
poi_english            │                   │
poi_korean             shop (avatar)     audio    shop_image
poi_chinese
poi_russian                              shop ─── poi (poi_id, nullable)
poi_japanese                             │
                                         │ 1:N (translation tables)
                                         ├── shop_english
                                         ├── shop_korean
                                         ├── shop_chinese
                                         ├── shop_russian
                                         └── shop_japanese
```

### Bảng tổng hợp quan hệ chính

| Bảng cha | Bảng con | Loại quan hệ | ON DELETE |
|---|---|---|---|
| `user` | `poi` | 1:N | RESTRICT |
| `user` | `shop` | 1:N | RESTRICT |
| `user` | `file_asset` | 1:N | RESTRICT |
| `user` | `audio` (uploaded_by) | 1:N | RESTRICT |
| `user` | `email_verification` | 1:N | CASCADE |
| `user` | `password_reset_token` | 1:N | CASCADE |
| `poi` | `poi_english/korean/chinese/russian/japanese` | 1:1 | CASCADE |
| `poi` | `poi_likes` | 1:N | CASCADE |
| `poi` | `shop` | 1:N (nullable) | SET NULL |
| `shop` | `shop_english/korean/chinese/russian/japanese` | 1:1 | CASCADE |
| `shop` | `menu_item` | 1:N | CASCADE |
| `shop` | `shop_image` | 1:N | CASCADE |
| `shop` | `audio` | 1:N | CASCADE |
| `file_asset` | `shop` (avatar_file_id) | 1:1 (nullable) | SET NULL |
| `file_asset` | `menu_item` (image_file_id) | 1:1 (nullable) | SET NULL |
| `file_asset` | `audio` (file_id) | 1:1 | RESTRICT |
| `file_asset` | `shop_image` | 1:N | CASCADE |

---

## 12.4 Chiến Lược Chỉ Mục (Index Strategy)

### Nguyên tắc

- **Composite index**: ưu tiên khi thường xuyên lọc theo nhiều cột cùng lúc (vd: `role + status`, `shop_id + sort_order`)
- **Chỉ mục trên cột ngoại khóa**: mọi FK đều có chỉ mục để tối ưu JOIN
- **Chỉ mục địa lý**: `(latitude, longitude)` trên bảng `poi` phục vụ bounding-box query geofencing
- **Partial index trên prefix**: `object_key(255)` thay vì full-length VARCHAR(1000) để tránh vượt giới hạn key length của MySQL

### Danh sách chỉ mục quan trọng

| Bảng | Chỉ mục | Mục đích |
|---|---|---|
| `user` | `idx_email` | Tra cứu nhanh theo email đăng nhập |
| `user` | `idx_role_status` | Lọc người dùng theo vai trò và trạng thái |
| `poi` | `idx_location` | Truy vấn địa lý, geofencing |
| `poi` | `idx_status` | Lọc danh sách POI theo trạng thái |
| `login_attempt` | `idx_la_identifier` | Kiểm tra số lần đăng nhập thất bại |
| `file_asset` | `idx_bucket_key` | Tra cứu file theo đường dẫn R2 |
| `audio` | `uq_shop_language` | Đảm bảo duy nhất 1 audio/ngôn ngữ/shop |
| `shop_image` | `idx_shop_sort` | Lấy ảnh gallery theo thứ tự hiển thị |

---

## 12.5 Redis – Thiết Kế Cache

### Tổng quan

Redis 7.2 được dùng làm **in-memory store** theo mô hình Cache-Aside. Backend kiểm tra Redis trước khi truy vấn MySQL; cache được xóa (invalidate) khi dữ liệu nguồn thay đổi.

**Kết nối**: Jedis 7.1.0 với connection pool.

### Cấu trúc Key và TTL

| Namespace Key | Kiểu dữ liệu | TTL | Nội dung lưu trữ |
|---|---|---|---|
| `poi:detail:{poiId}` | String (JSON) | 5 phút | Chi tiết POI (tọa độ, tên, trạng thái) |
| `poi:list:{vendorId}` | String (JSON) | 5 phút | Danh sách POI của vendor |
| `poi:active` | String (JSON) | 10 phút | Tất cả POI đang hoạt động (cho du khách) |
| `audio:{shopId}:{lang}` | String (JSON) | 10 phút | Thông tin file audio theo ngôn ngữ |
| `audio:list:{shopId}` | String (JSON) | 10 phút | Danh sách audio của gian hàng |
| `token:blacklist:{jti}` | String | Đến hết hạn JWT | JWT đã vô hiệu hóa (đăng xuất / đổi mật khẩu) |
| `rate:login:{identifier}` | String (số) | Cửa sổ 15 phút | Đếm số lần đăng nhập thất bại |

### Chiến lược Cache Invalidation

| Sự kiện | Key bị xóa |
|---|---|
| Admin duyệt/từ chối POI | `poi:detail:{id}`, `poi:list:{vendorId}`, `poi:active` |
| Vendor cập nhật POI | `poi:detail:{id}`, `poi:list:{vendorId}` |
| Admin duyệt/hủy audio | `audio:{shopId}:{lang}`, `audio:list:{shopId}` |
| Vendor logout | `token:blacklist:{jti}` được thêm vào |
| Vendor đổi mật khẩu | Tất cả JWT cũ bị vô hiệu theo `password_changed_at` |

### Rate Limiting

Cơ chế đếm thất bại đăng nhập dựa trên Redis:
- **Ngưỡng**: 5 lần thất bại trong cửa sổ 15 phút → tài khoản bị khóa tạm thời
- **Lưu trữ**: Counter trong Redis + sentinel row trong bảng `login_attempt` (MySQL) ghi nhận `locked_until`
- **Giải phóng**: Tự động sau 15 phút hoặc admin mở khóa thủ công

---

## 12.6 MongoDB – Thiết Kế Collection

### Tổng quan

MongoDB 7.0 lưu **dữ liệu phi cấu trúc và time-series** liên quan đến hành vi du khách theo thời gian thực. Dữ liệu có TTL ngắn và không cần tính nhất quán cao.

**Cơ sở dữ liệu**: `flavortales`

### 12.6.1 Collection `tourist_sessions`

Lưu phiên làm việc của du khách ẩn danh.

**Document mẫu**:

```json
{
  "_id": ObjectId("..."),
  "sessionId": "uuid-v4-string",
  "startedAt": ISODate("2026-04-07T10:00:00Z"),
  "lastActiveAt": ISODate("2026-04-07T10:45:00Z"),
  "deviceInfo": {
    "userAgent": "Mozilla/5.0 ...",
    "language": "en"
  },
  "visitedPois": ["poi_id_1", "poi_id_2"],
  "currentLocation": {
    "latitude": 10.776530,
    "longitude": 106.700981
  }
}
```

**Chỉ mục**:

| Trường | Loại | Mục đích |
|---|---|---|
| `sessionId` | Unique | Tra cứu phiên theo ID |
| `lastActiveAt` | TTL (3600s) | Tự xóa phiên sau 1 giờ không hoạt động |

**TTL Index**: `db.tourist_sessions.createIndex({ "lastActiveAt": 1 }, { expireAfterSeconds: 3600 })`

---

### 12.6.2 Collection `visitor_events`

Ghi nhận các sự kiện vị trí và hành động của du khách.

**Document mẫu**:

```json
{
  "_id": ObjectId("..."),
  "sessionId": "uuid-v4-string",
  "eventType": "ENTER_POI",
  "poiId": 42,
  "timestamp": ISODate("2026-04-07T10:15:00Z"),
  "location": {
    "latitude": 10.776530,
    "longitude": 106.700981
  },
  "metadata": {
    "language": "en",
    "audioPlayed": true
  }
}
```

**Các loại sự kiện `eventType`**:

| Giá trị | Mô tả |
|---|---|
| `ENTER_POI` | Du khách vào vùng geofence POI |
| `EXIT_POI` | Du khách rời vùng geofence |
| `AUDIO_PLAY` | Phát audio hướng dẫn |
| `POI_LIKE` | Du khách thích POI |
| `PING` | Tín hiệu hiện diện định kỳ (WebSocket) |

**Chỉ mục**:

| Trường | Loại | Mục đích |
|---|---|---|
| `sessionId` | Standard | Lấy tất cả sự kiện của một phiên |
| `poiId` | Standard | Thống kê sự kiện theo POI |
| `timestamp` | TTL (86400s) | Tự xóa sự kiện sau 24 giờ |

---

## 12.7 Chiến Lược Sao Lưu và Phục Hồi

### MySQL

| Phương pháp | Chi tiết |
|---|---|
| **Replication GTID** | Primary → Replica; tự động failover khi cấu hình đúng |
| **Backup thủ công** | `mysqldump --single-transaction` để backup không khóa bảng |
| **File dự phòng** | `flavortales_backup.sql` lưu trong workspace |
| **Phục hồi Replica** | Script `resync-replica-from-backup.sh` đồng bộ lại từ bản sao lưu |

### Redis

| Phương pháp | Chi tiết |
|---|---|
| **RDB Snapshot** | Cấu hình mặc định Docker; snapshot định kỳ |
| **Không persistence quan trọng** | Redis chỉ là cache; mất dữ liệu Redis không ảnh hưởng nghiệp vụ |

### MongoDB

| Phương pháp | Chi tiết |
|---|---|
| **TTL tự động dọn dẹp** | Dữ liệu cũ hơn ngưỡng TTL tự xóa |
| **Volume Docker** | Dữ liệu persistent qua Docker volume `mongo_data` |

---

## 12.8 Quy Ước Đặt Tên

| Đối tượng | Quy ước | Ví dụ |
|---|---|---|
| Tên bảng | snake_case, số ít | `user`, `file_asset`, `menu_item` |
| Tên cột khóa chính | `{table}_id` | `user_id`, `shop_id` |
| Tên cột khóa ngoại | `{bảng_cha}_id` | `vendor_id`, `poi_id` |
| Tên chỉ mục | `idx_{cột}` | `idx_email`, `idx_status` |
| Chỉ mục duy nhất | `uq_{cột}` | `uq_shop_language` |
| Bảng dịch thuật | `{bảng}_{ngôn_ngữ}` | `poi_english`, `shop_korean` |
| Redis key | `{domain}:{entity}:{id}` | `poi:detail:42` |
| MongoDB collection | camelCase, số ít | `touristSession`, `visitorEvent` |

---

## 12.9 Thống Kê Cấu Trúc Dữ Liệu

| Hệ thống | Số lượng | Chi tiết |
|---|---|---|
| MySQL | **26 bảng** | 4 bảng user, 8 bảng POI (1 gốc + 5 dịch + 1 likes + 1 table unused), 1 file_asset, 7 bảng shop (1 gốc + 5 dịch + 1 image), 1 menu_item, 1 audio |
| Redis | **7 namespace key** | POI cache (3), audio cache (2), token blacklist (1), rate limit (1) |
| MongoDB | **2 collection** | `tourist_sessions` (TTL 1h), `visitor_events` (TTL 24h) |
