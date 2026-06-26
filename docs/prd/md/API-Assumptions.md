# API Assumptions — FlavorTales

> **Ngày tạo:** 07/04/2026  
> **Phiên bản:** 1.0  
> **Phạm vi:** Tất cả các module backend trong hệ thống FlavorTales

---

## Mục lục

1. [Kiến trúc chung](#1-kiến-trúc-chung)
2. [Module Auth](#2-module-auth--apiauth)
3. [Module User](#3-module-user--apiuser)
4. [Module POI](#4-module-poi--apipoi)
5. [Module Content (Shop)](#5-module-content-shop--apishop)
6. [Module File](#6-module-file--apifile)
7. [Module Audio](#7-module-audio--apiaudio)
8. [Module Location](#8-module-location--apitouristsessions)
9. [Module Analytics](#9-module-analytics--apianalyticsadmin)
10. [Module Search](#10-module-search)
11. [Module Notification](#11-module-notification)
12. [Module Moderation](#12-module-moderation)
13. [Bảng phân quyền tổng hợp](#13-bảng-phân-quyền-tổng-hợp)

---

## 1. Kiến trúc chung

### 1.1 Response Wrapper

Mọi endpoint đều trả về `ResponseEntity<ApiResponse<T>>` với cấu trúc:

```json
{
  "success": true,
  "message": "Mô tả kết quả",
  "data": { ... },
  "timestamp": "2026-04-07T10:00:00"
}
```

| Trường | Kiểu | Mô tả |
|--------|------|-------|
| `success` | `boolean` | `true` nếu request thành công |
| `message` | `String` | Thông báo mô tả kết quả hoặc lỗi |
| `data` | `T` (generic) | Payload trả về; `null` nếu không có dữ liệu |
| `timestamp` | `LocalDateTime` | Thời điểm server xử lý request |

### 1.2 Xác thực & Phân quyền

- **Cơ chế**: JWT (JJWT 0.12.6), stateless Spring Security.
- **Truyền token**: JWT được lưu trong HTTP-only cookies (`access_token`, `refresh_token`). Với API/mobile client, token cũng được trả về trong response body.
- **Session policy**: `STATELESS` — server không lưu session.
- **Roles**: `ROLE_vendor`, `ROLE_admin`.

**Giả định:**
- Mọi endpoint không được đánh dấu *Public* đều yêu cầu header `Authorization: Bearer <token>` hoặc cookie `access_token` hợp lệ.
- Admin endpoint yêu cầu `ROLE_admin`; vendor endpoint yêu cầu `ROLE_vendor`.
- `X-Session-Id` header được sử dụng cho các thao tác ẩn danh của khách du lịch.

### 1.3 Base URL & Versioning

- **Base URL (dev):** `http://localhost:8080`
- **Prefix:** `/api`
- Không có versioning trong URL path (v1, v2...) ở thời điểm hiện tại.

### 1.4 Error Handling

Hệ thống sử dụng global `@ControllerAdvice` để map các custom exception sang HTTP status code tương ứng. Không sử dụng `RuntimeException` chung cho lỗi nghiệp vụ.

| HTTP Status | Ý nghĩa |
|-------------|---------|
| `200 OK` | Request thành công |
| `201 Created` | Tạo tài nguyên thành công |
| `204 No Content` | Xóa thành công, không có dữ liệu trả về |
| `400 Bad Request` | Dữ liệu đầu vào không hợp lệ |
| `401 Unauthorized` | Token không hợp lệ hoặc hết hạn |
| `403 Forbidden` | Không có quyền truy cập |
| `404 Not Found` | Tài nguyên không tồn tại |
| `409 Conflict` | Trùng lặp dữ liệu (email, username...) |
| `429 Too Many Requests` | Vượt quá giới hạn request (rate limiting) |

---

## 2. Module Auth — `/api/auth`

**Giả định chung:**
- Tất cả endpoint trong module này đều **Public** — không yêu cầu JWT.
- Rate limiting được áp dụng ở cấp IP cho các endpoint nhạy cảm (forgot-password, login).
- OTP email có thời hạn sử dụng và giới hạn số lần gửi lại (tối đa 3 lần).
- Sau khi đăng ký, tài khoản ở trạng thái `pending` cho đến khi xác thực email thành công.

### 2.1 Endpoints

| Method | Path | Mô tả | HTTP Status |
|--------|------|-------|-------------|
| `POST` | `/api/auth/vendor/register` | Đăng ký tài khoản vendor mới | `201 Created` |
| `POST` | `/api/auth/vendor/verify` | Xác thực email bằng OTP | `200 OK` |
| `POST` | `/api/auth/vendor/resend-code` | Gửi lại OTP xác thực email | `200 OK` |
| `POST` | `/api/auth/vendor/login` | Đăng nhập, nhận JWT | `200 OK` |
| `POST` | `/api/auth/vendor/logout` | Đăng xuất, xóa cookie và invalidate token | `200 OK` |
| `POST` | `/api/auth/vendor/forgot-password` | Yêu cầu reset mật khẩu qua email | `200 OK` |
| `POST` | `/api/auth/vendor/reset-password` | Đặt lại mật khẩu bằng OTP token | `200 OK` |

### 2.2 Request / Response DTOs

**`VendorRegisterRequest`**

```json
{
  "username": "vendor_abc",
  "email": "vendor@example.com",
  "password": "P@ssw0rd123",
  "confirmPassword": "P@ssw0rd123",
  "phone": "0901234567"
}
```

| Trường | Ràng buộc |
|--------|-----------|
| `username` | 4–32 ký tự, chỉ chứa chữ và số |
| `email` | Định dạng email hợp lệ, chưa tồn tại trong hệ thống |
| `password` | Tối thiểu 8 ký tự, có ký tự hoa, thường, số và ký tự đặc biệt |
| `confirmPassword` | Phải khớp với `password` |
| `phone` | Định dạng số điện thoại Việt Nam |

**`LoginRequest`**

```json
{
  "email": "vendor@example.com",
  "password": "P@ssw0rd123",
  "rememberMe": false
}
```

**`LoginResponse`** — trả về trong `data`:

```json
{
  "userId": 1,
  "email": "vendor@example.com",
  "username": "vendor_abc",
  "role": "ROLE_vendor",
  "accessToken": "<jwt>",
  "refreshToken": "<jwt>",
  "tokenType": "Bearer"
}
```

**`ResetPasswordRequest`**

```json
{
  "token": "<otp-token>",
  "newPassword": "NewP@ssw0rd1"
}
```

---

## 3. Module User — `/api/user`

**Giả định chung:**
- Module này hiện chỉ expose endpoint thống kê cho admin.
- Quản lý hồ sơ người dùng (profile update...) được xử lý nội bộ hoặc chưa được triển khai REST endpoint.

### 3.1 Endpoints

| Method | Path | Mô tả | Access | HTTP Status |
|--------|------|-------|--------|-------------|
| `GET` | `/api/user/admin/stats` | Lấy thống kê số lượng vendor | Admin | `200 OK` |

### 3.2 Response

```json
{
  "success": true,
  "data": {
    "activeVendors": 42
  }
}
```

### 3.3 Status Enum của User

| Trạng thái | Ý nghĩa |
|------------|---------|
| `pending` | Chờ xác thực email |
| `active` | Tài khoản đang hoạt động |
| `inactive` | Tài khoản tạm không hoạt động |
| `suspended` | Bị đình chỉ bởi admin |
| `rejected` | Bị từ chối |
| `disabled` | Bị vô hiệu hóa vĩnh viễn |

---

## 4. Module POI — `/api/poi`

**Giả định chung:**
- POI (Point of Interest) là điểm địa lý đại diện cho địa điểm ẩm thực của vendor.
- Mỗi POI có một bán kính geofence từ 10–100 mét.
- Vendor chỉ có thể thao tác trên POI của chính họ.
- POI ở trạng thái `active` mới hiển thị trên danh sách công khai.
- Thao tác like/unlike sử dụng `X-Session-Id` header (không yêu cầu đăng nhập) để định danh khách du lịch ẩn danh.
- Xóa mềm (soft delete) chuyển trạng thái thành `deleted`; xóa cứng (hard delete) xóa vĩnh viễn khỏi database.

### 4.1 Endpoints — POI CRUD & Like

| Method | Path | Request | Response | Access |
|--------|------|---------|----------|--------|
| `POST` | `/api/poi` | `CreatePoiRequest` (body) | `ApiResponse<PoiResponse>` | Vendor |
| `GET` | `/api/poi` | _(none)_ | `ApiResponse<List<PoiResponse>>` | Public |
| `GET` | `/api/poi/my` | _(none)_ | `ApiResponse<List<PoiResponse>>` | Vendor |
| `GET` | `/api/poi/{poiId}` | path var | `ApiResponse<PoiResponse>` | Vendor (owns) |
| `PUT` | `/api/poi/{poiId}` | `UpdatePoiRequest` (body) | `ApiResponse<PoiResponse>` | Vendor (owns) |
| `DELETE` | `/api/poi/{poiId}?hard=false` | path var + query `hard` | `ApiResponse<Void>` | Vendor (owns) |
| `POST` | `/api/poi/{poiId}/like` | Header: `X-Session-Id` | `ApiResponse<Integer>` | Public |
| `DELETE` | `/api/poi/{poiId}/like` | Header: `X-Session-Id` | `ApiResponse<Integer>` | Public |
| `GET` | `/api/poi/admin/stats` | _(none)_ | `ApiResponse<Map<String,Long>>` | Admin |

### 4.2 Endpoints — Translation

| Method | Path | Request | Response | Access |
|--------|------|---------|----------|--------|
| `POST` | `/api/poi/{poiId}/translate` | _(none)_ | `ApiResponse<List<PoiLanguageResult>>` | Authenticated |
| `GET` | `/api/poi/{poiId}/translation/{lang}` | path var `lang` (e.g. `"en"`, `"zh"`) | `ApiResponse<PoiTranslationResponse>` | Authenticated |

### 4.3 DTOs

**`CreatePoiRequest`**

```json
{
  "name": "Bún bò Huế Mậu Thân",
  "latitude": 16.4637,
  "longitude": 107.5909,
  "radius": 50,
  "address": "12 Nguyễn Huệ, Huế",
  "shopName": "Quán Bún Bò",
  "shopDescription": "Quán bún bò nổi tiếng Huế",
  "avatarFileId": "file-uuid-001",
  "additionalImageIds": ["file-uuid-002", "file-uuid-003"],
  "specialtyDescription": "Bún bò chuẩn vị Huế",
  "openingHours": ["Mon-Fri: 06:00-22:00"],
  "tags": ["bún", "Huế", "truyền thống"]
}
```

| Trường | Ràng buộc |
|--------|-----------|
| `latitude` | -90.0 đến 90.0 |
| `longitude` | -180.0 đến 180.0 |
| `radius` | 10–100 (mét) |
| `avatarFileId` | ID file đã upload qua `/api/file/upload` |

**`PoiResponse`**

```json
{
  "poiId": 1,
  "name": "Bún bò Huế Mậu Thân",
  "latitude": 16.4637,
  "longitude": 107.5909,
  "radius": 50,
  "address": "12 Nguyễn Huệ, Huế",
  "status": "active",
  "likesCount": 128,
  "linkedShopId": 5,
  "linkedShopName": "Quán Bún Bò",
  "linkedShopAvatarUrl": "https://r2.example.com/...",
  "shopDescription": "...",
  "shopTags": ["bún", "Huế"],
  "shopOpeningHours": ["Mon-Fri: 06:00-22:00"],
  "shopGalleryUrls": ["https://..."],
  "createdAt": "2026-01-01T08:00:00",
  "updatedAt": "2026-04-07T10:00:00"
}
```

### 4.4 Status Enum của POI

| Trạng thái | Ý nghĩa |
|------------|---------|
| `pending` | Chờ admin duyệt |
| `active` | Đang hoạt động công khai |
| `inactive` | Tạm ẩn |
| `rejected` | Bị từ chối bởi admin |
| `deleted` | Đã xóa mềm |

---

## 5. Module Content (Shop) — `/api/shop`

**Giả định chung:**
- Mỗi Shop được liên kết với một POI tương ứng.
- Khi vendor cập nhật thông tin shop, trạng thái shop sẽ reset về `pending` để chờ admin duyệt lại.
- Phê duyệt hoặc từ chối shop **không** tự động thay đổi trạng thái của POI liên kết.
- Trường `notes` trong approve/reject là tùy chọn, dùng để ghi chú lý do.

### 5.1 Endpoints — Shop CRUD

| Method | Path | Request | Response | Access |
|--------|------|---------|----------|--------|
| `POST` | `/api/shop` | `ShopCreateRequest` (body) | `ApiResponse<ShopCreateResponse>` (201) | Vendor |
| `GET` | `/api/shop/my` | _(none)_ | `ApiResponse<List<ShopResponse>>` | Vendor |
| `GET` | `/api/shop/my/{shopId}` | path var | `ApiResponse<AdminShopResponse>` | Vendor (owns) |
| `PUT` | `/api/shop/my/{shopId}` | `ShopUpdateRequest` (body) | `ApiResponse<Void>` | Vendor (owns) |

### 5.2 Endpoints — Admin Review

| Method | Path | Request | Response | Access |
|--------|------|---------|----------|--------|
| `GET` | `/api/shop/admin/pending` | _(none)_ | `ApiResponse<List<AdminShopResponse>>` | Admin |
| `GET` | `/api/shop/admin/{shopId}` | path var | `ApiResponse<AdminShopResponse>` | Admin |
| `PATCH` | `/api/shop/admin/{shopId}/approve` | `{ "notes": "OK" }` (optional) | `ApiResponse<Void>` | Admin |
| `PATCH` | `/api/shop/admin/{shopId}/reject` | `{ "notes": "Lý do từ chối" }` (optional) | `ApiResponse<Void>` | Admin |

### 5.3 Endpoints — Translation

| Method | Path | Request | Response | Access |
|--------|------|---------|----------|--------|
| `POST` | `/api/shop/{shopId}/translate` | _(none)_ | `ApiResponse<List<ShopLanguageResult>>` | Authenticated |
| `GET` | `/api/shop/{shopId}/translation/{lang}` | path var `lang` | `ApiResponse<ShopTranslationResponse>` | Authenticated |

### 5.4 Status Enum của Shop / Menu / Audio

| Trạng thái | Ý nghĩa |
|------------|---------|
| `pending` | Chờ admin duyệt |
| `active` | Đã được duyệt, hiển thị công khai |
| `rejected` | Bị từ chối |
| `disabled` | Bị vô hiệu hóa |

---

## 6. Module File — `/api/file`

**Giả định chung:**
- File được upload lên Cloudflare R2 (S3-compatible storage).
- Chỉ chấp nhận ảnh định dạng JPEG hoặc PNG, dung lượng tối đa 5 MB.
- URL trả về là public URL từ R2, có thể dùng trực tiếp để hiển thị ảnh.
- `fileId` được dùng làm tham chiếu khi tạo POI hoặc Shop (trường `avatarFileId`, `additionalImageIds`).

### 6.1 Endpoints

| Method | Path | Request | Response | Access |
|--------|------|---------|----------|--------|
| `POST` | `/api/file/upload` | `multipart/form-data` — field: `file` | `ApiResponse<FileUploadResponse>` | Vendor |

### 6.2 DTOs

**Request:** `multipart/form-data` với field `file` chứa binary data của ảnh.

**`FileUploadResponse`**

```json
{
  "fileId": "uuid-abc-123",
  "url": "https://pub-xxxx.r2.dev/flavortales/uuid-abc-123.jpg"
}
```

---

## 7. Module Audio — `/api/audio`

**Giả định chung:**
- Hỗ trợ hai luồng tạo audio:
  1. **TTS (Text-to-Speech)**: Server tự động tổng hợp giọng đọc từ văn bản đầu vào.
  2. **Upload thủ công**: Vendor upload file audio MP3 trực tiếp.
- Văn bản đầu vào cho TTS là tiếng Việt; hệ thống có thể generate audio cho nhiều ngôn ngữ (vi, en, zh...).
- Preview TTS trả về raw bytes `audio/mpeg` (streaming), không lưu file.
- Audio được liên kết với Shop hoặc POI qua `shopId`/`poiId`.
- Trạng thái audio: `pending → active | rejected | disabled`.

### 7.1 Endpoints

| Method | Path | Request | Response | Access |
|--------|------|---------|----------|--------|
| `POST` | `/api/audio/tts` | `TtsRequest` (body) | `ApiResponse<TtsResponse>` | Vendor |
| `POST` | `/api/audio/tts/preview` | `TtsRequest` (body) | Raw MP3 bytes (`audio/mpeg`) | Vendor |
| `POST` | `/api/audio/tts/preview-all` | `AllLanguagesTtsRequest` (body) | `ApiResponse<AllLanguagesTtsResponse>` | Vendor |
| `POST` | `/api/audio/upload` | `multipart/form-data` — `file`, `language` | `ApiResponse<TtsResponse>` | Vendor |
| `POST` | `/api/audio/shop/{shopId}/tts` | `TtsRequest` (body) | `ApiResponse<TtsResponse>` | Vendor |
| `POST` | `/api/audio/shop/{shopId}/upload` | `multipart/form-data` — `file`, `language` | `ApiResponse<TtsResponse>` | Vendor |
| `GET` | `/api/audio/shop/{shopId}` | path var | `ApiResponse<List<AudioResponse>>` | Authenticated |
| `GET` | `/api/audio/poi/{poiId}` | path var | `ApiResponse<List<AudioResponse>>` | Authenticated |

### 7.2 DTOs

**`TtsRequest`**

```json
{
  "text": "Bún bò Huế - đặc sản nổi tiếng của cố đô Huế...",
  "language": "en"
}
```

| Trường | Giá trị hợp lệ |
|--------|---------------|
| `text` | Văn bản tiếng Việt, không rỗng |
| `language` | `"vi"`, `"en"`, `"zh"`, v.v. |

**`TtsResponse`**

```json
{
  "fileId": "uuid-audio-001",
  "url": "https://pub-xxxx.r2.dev/audio/uuid-audio-001.mp3",
  "language": "en"
}
```

**`AllLanguagesTtsRequest`**

```json
{
  "text": "Văn bản tiếng Việt nguồn"
}
```

**`AllLanguagesTtsResponse`**

```json
{
  "audioBase64": {
    "vi": "<base64-encoded-mp3>",
    "en": "<base64-encoded-mp3>",
    "zh": "<base64-encoded-mp3>"
  },
  "errors": [
    { "language": "ja", "reason": "Unsupported language" }
  ]
}
```

---

## 8. Module Location — `/api/tourist/sessions`

**Giả định chung:**
- Tourist session là phiên làm việc ẩn danh của khách du lịch, không yêu cầu đăng nhập.
- Session lưu trạng thái: ngôn ngữ ưa thích, danh sách POI đã xem, danh sách audio đã nghe.
- Session có thời hạn tự động hết hạn.
- `sessionId` được sử dụng làm `X-Session-Id` header trong các request liên quan đến like POI và geofencing.
- Tất cả endpoint trong module này đều **Public**.

### 8.1 Endpoints

| Method | Path | Request | Response | HTTP Status |
|--------|------|---------|----------|-------------|
| `POST` | `/api/tourist/sessions` | _(none)_ | `ApiResponse<CreateTouristSessionResponse>` | `201 Created` |
| `GET` | `/api/tourist/sessions/{sessionId}` | path var | `ApiResponse<TouristSessionResponse>` | `200 OK` / `404` |
| `GET` | `/api/tourist/sessions/active/count` | _(none)_ | `ApiResponse<Long>` | `200 OK` |
| `PATCH` | `/api/tourist/sessions/{sessionId}` | `UpdateSessionRequest` (body) | `ApiResponse<TouristSessionResponse>` | `200 OK` |
| `DELETE` | `/api/tourist/sessions/{sessionId}` | path var | _(none)_ | `204 No Content` |

### 8.2 DTOs

**`CreateTouristSessionResponse`**

```json
{
  "sessionId": "sess-uuid-001",
  "expiresAt": "2026-04-07T22:00:00"
}
```

**`TouristSessionResponse`**

```json
{
  "sessionId": "sess-uuid-001",
  "language": "en",
  "viewedPoiIds": [1, 5, 12],
  "playedAudioIds": ["uuid-audio-001"]
}
```

**`UpdateSessionRequest`**

```json
{
  "language": "en",
  "viewedPoiIds": [1, 5, 12],
  "playedAudioIds": ["uuid-audio-001"]
}
```

> Tất cả trường đều là tùy chọn (partial update).

---

## 9. Module Analytics — `/api/analytics/admin`

**Giả định chung:**
- Chỉ admin mới có thể truy cập các endpoint analytics.
- Dữ liệu được nhóm theo period (ngày/tuần/tháng/năm).
- Đây là số liệu về lượng khách du lịch truy cập hệ thống.

### 9.1 Endpoints

| Method | Path | Query Params | Response | Access |
|--------|------|-------------|----------|--------|
| `GET` | `/api/analytics/admin/visitors/stats` | `period=day\|week\|month\|year` (default: `day`) | `ApiResponse<List<VisitorStatPoint>>` | Admin |

### 9.2 DTOs

**`VisitorStatPoint`**

```json
{
  "label": "2026-04-07",
  "count": 312
}
```

| `period` | Ý nghĩa `label` |
|----------|----------------|
| `day` | Từng giờ trong ngày (`"HH:00"`) |
| `week` | Từng ngày trong tuần (`"YYYY-MM-DD"`) |
| `month` | Từng ngày trong tháng |
| `year` | Từng tháng trong năm (`"YYYY-MM"`) |

---

## 10. Module Search

**Giả định chung:**
- Module `flavortales-search` hiện là **stub chưa được implement** — không có source Java file nào.
- Theo thiết kế, module này chịu trách nhiệm full-text search và indexing nội dung POI/Shop.
- Các endpoint search (nếu có) dự kiến sẽ nằm dưới prefix `/api/search`.

> **Trạng thái:** Chưa triển khai. Không có endpoint nào khả dụng.

---

## 11. Module Notification

**Giả định chung:**
- Module `flavortales-notification` **không expose REST endpoint** ra ngoài.
- Toàn bộ logic là event-driven nội bộ: các module khác (auth, content...) kích hoạt event, module notification lắng nghe và gửi email tương ứng.
- `EmailService` là service duy nhất trong module này.

> **Trạng thái:** Chỉ có internal email service, không có REST API công khai.

**Các loại email được gửi (theo trigger từ các module khác):**

| Trigger | Loại email |
|---------|-----------|
| Đăng ký tài khoản | OTP xác thực email |
| Quên mật khẩu | OTP reset mật khẩu |
| Shop được duyệt | Thông báo phê duyệt |
| Shop bị từ chối | Thông báo từ chối kèm lý do |

---

## 12. Module Moderation

**Giả định chung:**
- Module `flavortales-moderation` hiện là **stub rỗng** — chưa có source Java file nào.
- Theo thiết kế, module này xử lý kiểm duyệt nội dung (content moderation) mở rộng từ luồng admin approve/reject hiện tại.

> **Trạng thái:** Stub chưa triển khai. Không có endpoint nào khả dụng.

---

## 13. Bảng phân quyền tổng hợp

| Endpoint | Public | Tourist (`X-Session-Id`) | Vendor (JWT) | Admin (JWT) |
|----------|:------:|:-----------------------:|:------------:|:-----------:|
| `POST /api/auth/vendor/*` | ✓ | | | |
| `GET /api/poi` (active list) | ✓ | | | |
| `POST /api/poi/{id}/like` | | ✓ | | |
| `DELETE /api/poi/{id}/like` | | ✓ | | |
| `POST /api/tourist/sessions` | ✓ | | | |
| `GET /api/tourist/sessions/*` | ✓ | | | |
| `PATCH /api/tourist/sessions/*` | ✓ | | | |
| `DELETE /api/tourist/sessions/*` | ✓ | | | |
| `POST /api/poi` | | | ✓ | |
| `GET /api/poi/my` | | | ✓ | |
| `GET /api/poi/{id}` | | | ✓ | |
| `PUT /api/poi/{id}` | | | ✓ | |
| `DELETE /api/poi/{id}` | | | ✓ | |
| `POST /api/shop` | | | ✓ | |
| `GET /api/shop/my` | | | ✓ | |
| `PUT /api/shop/my/{id}` | | | ✓ | |
| `POST /api/file/upload` | | | ✓ | |
| `POST /api/audio/**` | | | ✓ | |
| `GET /api/audio/shop/{id}` | | | ✓ | ✓ |
| `GET /api/audio/poi/{id}` | | | ✓ | ✓ |
| `POST /api/poi/{id}/translate` | | | ✓ | ✓ |
| `GET /api/poi/{id}/translation/{lang}` | | | ✓ | ✓ |
| `POST /api/shop/{id}/translate` | | | ✓ | ✓ |
| `GET /api/shop/{id}/translation/{lang}` | | | ✓ | ✓ |
| `GET /api/user/admin/stats` | | | | ✓ |
| `GET /api/poi/admin/stats` | | | | ✓ |
| `GET /api/shop/admin/pending` | | | | ✓ |
| `GET /api/shop/admin/{id}` | | | | ✓ |
| `PATCH /api/shop/admin/{id}/approve` | | | | ✓ |
| `PATCH /api/shop/admin/{id}/reject` | | | | ✓ |
| `GET /api/analytics/admin/visitors/stats` | | | | ✓ |
| `GET /api/tourist/sessions/active/count` | | | | ✓ |

---

*Tài liệu này được tổng hợp từ source code thực tế của dự án FlavorTales tính đến ngày 07/04/2026. Các module Search và Moderation sẽ được cập nhật khi có triển khai.*
