# Business Requirements — FlavorTales

> **Ngày tạo:** 07/04/2026
> **Phiên bản:** 1.0
> **Phạm vi:** Mô tả yêu cầu nghiệp vụ cho tất cả các module trong hệ thống FlavorTales

---

## Mục lục

1. [Tổng quan hệ thống](#1-tổng-quan-hệ-thống)
2. [Module Auth — Xác thực & Phân quyền](#2-module-auth--xác-thực--phân-quyền)
3. [Module User — Quản lý người dùng](#3-module-user--quản-lý-người-dùng)
4. [Module POI — Điểm địa lý ẩm thực](#4-module-poi--điểm-địa-lý-ẩm-thực)
5. [Module Content (Shop) — Quản lý quán ăn](#5-module-content-shop--quản-lý-quán-ăn)
6. [Module File — Quản lý tệp đa phương tiện](#6-module-file--quản-lý-tệp-đa-phương-tiện)
7. [Module Audio — Nội dung âm thanh](#7-module-audio--nội-dung-âm-thanh)
8. [Module Location — Phiên du lịch & Vị trí](#8-module-location--phiên-du-lịch--vị-trí)
9. [Module Analytics — Phân tích lượt truy cập](#9-module-analytics--phân-tích-lượt-truy-cập)
10. [Module Notification — Thông báo](#10-module-notification--thông-báo)
11. [Module Search — Tìm kiếm](#11-module-search--tìm-kiếm)
12. [Module Moderation — Kiểm duyệt nội dung](#12-module-moderation--kiểm-duyệt-nội-dung)

---

## 1. Tổng quan hệ thống

FlavorTales là nền tảng du lịch ẩm thực kết nối **vendor** (chủ quán ăn) và **khách du lịch**. Mục tiêu của nền tảng:

- Giúp các chủ quán ăn quảng bá thương hiệu và thu hút khách du lịch thông qua bản đồ số tương tác.
- Cung cấp trải nghiệm khám phá ẩm thực cho khách du lịch: xem thông tin quán, nhận thông báo khi đến gần, nghe giới thiệu bằng tiếng bản địa.
- Đảm bảo chất lượng nội dung thông qua quy trình phê duyệt của Admin.

**Các nhóm người dùng:**

| Nhóm | Mô tả | Quyền truy cập |
|------|-------|---------------|
| Vendor | Chủ quán ăn đăng ký và quản lý nội dung của mình | Sau khi đăng nhập |
| Admin | Quản trị viên nền tảng, phê duyệt và kiểm soát toàn bộ nội dung | Sau khi đăng nhập |
| Khách du lịch | Người dùng tự do, không cần đăng ký | Ẩn danh, không giới hạn |

**Quy trình tổng thể:**

Vendor đăng ký → Admin phê duyệt nội dung → Khách du lịch khám phá

---

## 2. Module Auth — Xác thực & Phân quyền

### 2.1 Yêu cầu nghiệp vụ tổng quát

Hệ thống xác thực đảm bảo:
- Chỉ Vendor đã được xác thực email mới có thể đăng nhập và sử dụng nền tảng.
- Thông tin đăng nhập luôn được bảo mật; lỗi đăng nhập không tiết lộ trường nào sai.
- Tài khoản được bảo vệ khỏi các hành vi đăng nhập trái phép lặp lại.

### 2.2 Đăng ký tài khoản Vendor

**Điều kiện tiên quyết:** Vendor chưa có tài khoản trên hệ thống.

**Luồng nghiệp vụ:**

1. Vendor cung cấp: họ tên đầy đủ, email, số điện thoại, mật khẩu.
2. Hệ thống kiểm tra tính duy nhất của email và họ tên; thông báo lỗi cụ thể nếu đã tồn tại.
3. Tài khoản được tạo ở trạng thái **Chưa kích hoạt**.
4. Hệ thống gửi mã xác thực 6 chữ số đến email của Vendor.

**Ràng buộc nghiệp vụ:**
- Email mỗi tài khoản là duy nhất trên toàn hệ thống.
- Họ tên đầy đủ là duy nhất trên toàn hệ thống.
- Mật khẩu phải đủ mạnh (tối thiểu 8 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt).

### 2.3 Xác thực Email

**Luồng nghiệp vụ:**

1. Vendor nhập mã xác thực 6 chữ số nhận được qua email.
2. Hệ thống kiểm tra tính hợp lệ và thời hạn của mã.
3. Nếu mã đúng và còn hiệu lực: tài khoản chuyển sang trạng thái **Hoạt động**.
4. Vendor có thể yêu cầu gửi lại mã tối đa **3 lần** (tổng cộng 4 lần kể cả lần đầu).

**Ràng buộc nghiệp vụ:**
- Mã xác thực có thời hạn; mã hết hạn không còn giá trị.
- Vượt quá số lần gửi lại cho phép: hệ thống từ chối yêu cầu.

### 2.4 Đăng nhập

**Luồng nghiệp vụ:**

1. Vendor nhập email và mật khẩu. Tuỳ chọn chọn "Ghi nhớ đăng nhập".
2. Hệ thống xác thực thông tin; thông báo lỗi chung nếu sai (không chỉ rõ trường nào sai).
3. Hệ thống kiểm tra trạng thái tài khoản trước khi cho phép truy cập:

| Trạng thái tài khoản | Kết quả |
|----------------------|---------|
| Hoạt động | Đăng nhập thành công |
| Chưa kích hoạt / Vô hiệu hoá | Bị từ chối, thông báo tài khoản chưa kích hoạt |
| Chờ duyệt | Bị từ chối, thông báo tài khoản đang chờ duyệt |
| Bị từ chối | Bị từ chối, thông báo tài khoản bị từ chối |
| Tạm đình chỉ | Bị từ chối, thông báo tài khoản bị đình chỉ |

4. Phiên đăng nhập có hiệu lực **24 giờ** (hoặc **7 ngày** nếu chọn "Ghi nhớ đăng nhập").

**Bảo vệ đăng nhập:**

| Quy tắc | Giá trị |
|---------|---------|
| Số lần thử tối đa trong 15 phút | 5 lần |
| Số lần thất bại liên tiếp tối đa | 10 lần |
| Thời gian tạm khoá tài khoản | 30 phút |

- Đăng nhập thành công: lịch sử lần thất bại được xoá.

### 2.5 Quên mật khẩu & Đặt lại mật khẩu

**Luồng nghiệp vụ:**

1. Vendor yêu cầu đặt lại mật khẩu bằng email đã đăng ký.
2. Nếu email tồn tại, hệ thống gửi mã xác thực 6 chữ số đến email đó.
3. Vendor nhập mã và mật khẩu mới.
4. Mã có hiệu lực **30 phút** kể từ khi gửi; mỗi mã chỉ dùng được một lần.
5. Sau khi đặt lại mật khẩu thành công: tất cả phiên đăng nhập cũ đều bị vô hiệu hoá.

**Ràng buộc nghiệp vụ:**
- Mỗi địa chỉ IP chỉ được gửi tối đa **3 yêu cầu/giờ** để ngăn lạm dụng.
- Hệ thống không tiết lộ email có tồn tại hay không (trả về thành công trong mọi trường hợp).

### 2.6 Đăng xuất

- Phiên đăng nhập hiện tại bị huỷ ngay lập tức khi Vendor đăng xuất.
- Tất cả phiên cũ cũng không còn hiệu lực sau khi đổi mật khẩu.

---

## 3. Module User — Quản lý người dùng

### 3.1 Vai trò trong hệ thống

| Vai trò | Mô tả | Cách cấp |
|---------|-------|----------|
| Vendor | Chủ quán ăn, tạo và quản lý nội dung | Tự đăng ký |
| Admin | Quản trị viên nền tảng | Cấp thủ công, không có luồng tự đăng ký |

### 3.2 Vòng đời tài khoản

| Trạng thái | Ý nghĩa | Hành động tiếp theo |
|------------|---------|---------------------|
| Chưa kích hoạt | Đăng ký xong, chưa xác thực email | Xác thực email để kích hoạt |
| Hoạt động | Có thể đăng nhập và sử dụng đầy đủ | — |
| Chờ duyệt | Email xác thực, chờ Admin phê duyệt thủ công | Admin phê duyệt hoặc từ chối |
| Bị từ chối | Không được phép truy cập | Admin can thiệp |
| Tạm đình chỉ | Tạm thời bị hạn chế bởi Admin | Admin gỡ đình chỉ |
| Vô hiệu hoá | Bị khoá vĩnh viễn | Admin can thiệp |

### 3.3 Thông tin hồ sơ Vendor

Hệ thống lưu trữ các thông tin cơ bản: họ tên đầy đủ, email, số điện thoại, ngày tạo tài khoản. Vendor có thể cập nhật thông tin cá nhân sau khi đăng nhập. Mọi thao tác quản lý tài khoản (kích hoạt, đình chỉ, vô hiệu hoá) thuộc thẩm quyền của Admin.

---

## 4. Module POI — Điểm địa lý ẩm thực

### 4.1 POI là gì?

**POI (Point of Interest)** là một điểm địa lý trên bản đồ đại diện cho vị trí thực tế của một quán ăn. Mỗi POI bao gồm:
- Tọa độ GPS và bán kính vùng phủ sóng (vùng mà khách du lịch được coi là đang ở gần quán).
- Thông tin địa chỉ và tên địa điểm.
- Liên kết với thông tin quán ăn (Shop).

### 4.2 Tạo POI

**Điều kiện tiên quyết:** Vendor đã đăng nhập và tài khoản đang hoạt động.

**Luồng nghiệp vụ (4 bước):**

**Bước 1 — Vị trí POI**
1. Vendor nhập tên POI và chọn tọa độ địa lý trên bản đồ (bán kính, địa chỉ).
2. Hệ thống kiểm tra tính hợp lệ của vị trí:
   - Vị trí phải nằm **trong phạm vi khu vực ẩm thực** được quản lý bởi nền tảng.
   - Không có POI đang hoạt động nào trong phạm vi **5 mét** xung quanh vị trí đó (tránh trùng lặp vật lý).
3. Vendor có thể quay lại bước này từ các bước sau để chỉnh sửa mà không mất dữ liệu đã nhập.

**Bước 2 — Thông tin gian hàng & Audio**
1. Vendor nhập thông tin quán ăn: tên quán, mô tả, ảnh đại diện, ảnh phụ, giờ mở cửa, thể loại ẩm thực, món đặc trưng.
2. Hệ thống kiểm tra tên quán phải **chưa được sử dụng** bởi bất kỳ quán nào đang hoạt động.
3. Vendor **bắt buộc** phải tạo hoặc tải lên ít nhất một audio giới thiệu trước khi chuyển sang bước tiếp theo. Audio có thể được tạo từ văn bản (TTS) hoặc tải lên file MP3/M4A/WAV.
4. Vendor có thể quay lại Bước 1 để điều chỉnh vị trí.

**Bước 3 — Xem lại bản dịch**
1. Hệ thống tự động dịch thông tin POI và gian hàng sang **5 ngôn ngữ** (Anh, Hàn, Trung, Nga, Nhật) và hiển thị kết quả có animation theo từng ngôn ngữ.
2. Bản dịch tạm thời được lưu trong Redis (TTL 30 phút) — **chưa ghi vào cơ sở dữ liệu**.
3. Vendor xem lại và kiểm tra bản dịch. Nếu cần chỉnh sửa nội dung gốc, Vendor có thể quay lại Bước 1 hoặc Bước 2 qua nút "Chỉnh sửa".
4. Nếu một ngôn ngữ dịch thất bại, hệ thống hiển thị lỗi ngay trong card ngôn ngữ đó và tiếp tục hiển thị các ngôn ngữ còn lại.

**Bước 4 — Xem lại & Gửi duyệt**
1. Vendor xem lại toàn bộ thông tin: vị trí POI, thông tin gian hàng, audio và bản dịch.
2. Mỗi phần có nút "Chỉnh sửa" riêng để quay lại bước tương ứng (Bước 1 hoặc Bước 2) mà không mất dữ liệu.
3. Vendor nhấn "Hoàn tất" để gửi duyệt.
4. Hệ thống ghi nhận POI và gian hàng vào cơ sở dữ liệu ở trạng thái **Chờ duyệt**, đồng thời tiêu thụ bản dịch từ Redis và lưu vào các bảng ngôn ngữ. Nếu cache đã hết hạn, hệ thống gọi lại Google Translate để dịch.
5. Admin nhận thông báo có nội dung mới cần phê duyệt.

**Ràng buộc nghiệp vụ:**
- Một vị trí địa lý không thể có hai quán ăn trùng nhau trong bán kính 5 mét.
- Tên quán ăn là duy nhất trên toàn nền tảng (với các quán đang hoạt động).
- Bước 2 yêu cầu ít nhất 1 audio trước khi chuyển bước.
- Vendor có thể quay lại bất kỳ bước trước đó và không mất dữ liệu đã nhập (draft tự động lưu localStorage).

### 4.3 Vòng đời trạng thái POI

| Trạng thái | Ý nghĩa | Hiển thị công khai |
|------------|---------|-------------------|
| Chờ duyệt | Đang chờ Admin kiểm duyệt | Không |
| Hoạt động | Đã được duyệt, hiển thị trên bản đồ | Có |
| Tạm ẩn | Vendor hoặc Admin ẩn tạm thời | Không |
| Bị từ chối | Không đạt yêu cầu kiểm duyệt | Không |
| Đã xoá | Đã xoá khỏi nền tảng | Không |

> **Lưu ý quan trọng**: Khi Admin **phê duyệt** thông tin quán (Shop), POI tương ứng tự động chuyển sang trạng thái **Hoạt động**. Khi Admin **từ chối** thông tin quán, trạng thái POI **không thay đổi**.

### 4.4 Cập nhật POI

- Vendor có thể cập nhật thông tin địa điểm (tên, địa chỉ, bán kính, tọa độ).
- Thay đổi tọa độ phải vượt qua lại các kiểm tra vị trí (phạm vi khu vực, trùng lặp).
- Hệ thống thông báo cho Vendor khi vị trí được cập nhật thành công.

### 4.5 Xoá POI

- **Xoá mềm** (mặc định): POI bị ẩn khỏi bản đồ nhưng dữ liệu vẫn được lưu.
- **Xoá vĩnh viễn**: Xoá toàn bộ dữ liệu khỏi hệ thống (chỉ trong trường hợp đặc biệt).

### 4.6 Geofencing — Vùng phủ sóng địa lý

Mỗi POI có một **vùng phủ sóng** (bán kính tính bằng mét). Khi khách du lịch đến gần quán ăn trong phạm vi vùng phủ sóng này, hệ thống sẽ:
- Hiển thị thông tin chi tiết về quán.
- Cho phép nghe audio giới thiệu bằng ngôn ngữ ưa thích.

### 4.7 Hệ thống Yêu thích (Like)

- Khách du lịch (ẩn danh) có thể **yêu thích** hoặc **bỏ yêu thích** POI đang hoạt động.
- Mỗi khách chỉ được yêu thích một POI **một lần** trong phiên du lịch.
- Số lượt yêu thích không bao giờ giảm xuống dưới 0.

### 4.8 Hỗ trợ đa ngôn ngữ

Khi POI được tạo hoặc cập nhật vị trí, hệ thống tự động dịch tên và địa chỉ sang **5 ngôn ngữ**: Anh, Hàn, Trung, Nhật, Nga. Nội dung dịch thuật phục vụ khách du lịch quốc tế khi duyệt bản đồ.

---

## 5. Module Content (Shop) — Quản lý quán ăn

### 5.1 Thông tin quán ăn (Shop)

Mỗi quán ăn trên nền tảng bao gồm:
- Tên quán, mô tả, phong cách ẩm thực, món đặc trưng.
- Thể loại/tag (ví dụ: cơm, phở, hải sản…).
- Giờ mở cửa theo ngày trong tuần.
- Ảnh đại diện và bộ ảnh giới thiệu.

### 5.2 Quy trình Phê duyệt / Từ chối (Admin)

**Đây là quy trình nghiệp vụ trọng tâm của module:**

| Hành động | Kết quả với Shop | Kết quả với POI | Thông báo gửi đi |
|-----------|-----------------|-----------------|-----------------|
| Phê duyệt | Chuyển sang Hoạt động | Chuyển sang Hoạt động | Email xác nhận đến Vendor |
| Từ chối | Chuyển sang Bị từ chối | Không thay đổi | Email kèm lý do đến Vendor |

### 5.3 Cập nhật thông tin quán

Khi Vendor cập nhật thông tin quán:
- Trạng thái quán tự động chuyển lại **Chờ duyệt**.
- Admin cần phê duyệt lại trước khi thay đổi hiển thị công khai.

### 5.4 Vòng đời trạng thái Shop

| Trạng thái | Ý nghĩa |
|------------|---------|
| Chờ duyệt | Đang chờ Admin kiểm duyệt |
| Hoạt động | Đã được duyệt, hiển thị công khai |
| Bị từ chối | Không đạt yêu cầu kiểm duyệt |
| Vô hiệu hoá | Bị Admin vô hiệu hoá |

### 5.5 Hỗ trợ đa ngôn ngữ

Tên và mô tả quán được tự động dịch sang 5 ngôn ngữ (Anh, Hàn, Trung, Nhật, Nga) phục vụ khách quốc tế.

---

## 6. Module File — Quản lý tệp đa phương tiện

### 6.1 Mục đích

Module File quản lý việc tải lên và lưu trữ ảnh và tệp âm thanh được sử dụng trong hệ thống (ảnh quán ăn, ảnh POI, file audio giới thiệu).

### 6.2 Quy tắc Upload ảnh

| Quy tắc | Giá trị |
|---------|---------|
| Định dạng chấp nhận | JPEG, PNG |
| Dung lượng tối đa mỗi ảnh | 20 MB |
| Tổng dung lượng tối đa mỗi lần tải | 25 MB |

### 6.3 Quản lý tệp

- Mỗi tệp được lưu trữ an toàn và gắn với URL công khai để hiển thị.
- Tệp được phân loại theo từng Vendor, tránh nhầm lẫn giữa các chủ quán.
- Hình ảnh sau khi tải lên được tối ưu để tải nhanh trên thiết bị di động.

---

## 7. Module Audio — Nội dung âm thanh

### 7.1 Mục đích

Module Audio cho phép mỗi quán ăn có nội dung giới thiệu bằng **giọng đọc tự động** hỗ trợ nhiều ngôn ngữ, giúp khách du lịch quốc tế có trải nghiệm cá nhân hoá.

### 7.2 Các hình thức tạo Audio

| Hình thức | Mô tả |
|-----------|-------|
| Tự động (TTS) | Vendor nhập văn bản tiếng Việt; hệ thống tự tạo giọng đọc |
| Thủ công | Vendor tự tải lên file âm thanh đã chuẩn bị sẵn |

### 7.3 Tạo Audio tự động (TTS)

**Luồng nghiệp vụ:**

1. Vendor nhập nội dung giới thiệu bằng tiếng Việt.
2. Vendor chọn ngôn ngữ muốn tổng hợp (hoặc tổng hợp tất cả cùng lúc).
3. Hệ thống tự dịch và tổng hợp giọng đọc cho các ngôn ngữ được chọn.
4. Audio được lưu và liên kết với quán ăn tương ứng.

**Ngôn ngữ hỗ trợ:** Tiếng Việt, Anh, Trung, Hàn, Nga, Nhật.

### 7.4 Nghe thử trước khi lưu

Vendor có thể **nghe thử** nội dung âm thanh trước khi quyết định lưu lại. Chức năng này không lưu dữ liệu vào hệ thống.

### 7.5 Quy tắc quản lý Audio

- Mỗi quán ăn có tối đa **một file audio trên mỗi ngôn ngữ**.
- Audio mới sẽ ghi đè audio cũ cùng ngôn ngữ của quán đó.
- Audio được kích hoạt ngay sau khi tạo thành công, không qua bước phê duyệt.

---

## 8. Module Location — Phiên du lịch & Vị trí

### 8.1 Khái niệm Phiên du lịch

**Phiên du lịch** là một phiên làm việc ẩn danh, tạm thời dành cho khách du lịch không cần đăng nhập. Phiên này ghi nhận hành trình khám phá của khách trong một lần ghé thăm khu phố ẩm thực.

**Nguyên tắc:**
- Không thu thập thông tin cá nhân nhận dạng của khách.
- Phiên tự động hết hạn sau **1 giờ** không hoạt động.

### 8.2 Thông tin được ghi nhận trong phiên

| Thông tin | Mô tả |
|-----------|-------|
| Các POI đã xem | Danh sách điểm ăn uống khách đã ghé thăm |
| Audio đã nghe | Danh sách bài giới thiệu đã phát |
| Ngôn ngữ ưa thích | Ngôn ngữ khách muốn sử dụng |

### 8.3 Liên kết với các hoạt động khác

- **Yêu thích**: Khách dùng phiên du lịch để like/unlike quán ăn.
- **Thống kê**: Mỗi phiên mới được ghi nhận như một lượt ghé thăm trong hệ thống phân tích.
- **Đếm trực tiếp**: Hệ thống theo dõi số lượng khách đang trực tuyến tại khu vực (xem mục 8.4).

### 8.4 Duy trì trạng thái bản đồ & đếm khách trực tuyến

**Duy trì trạng thái bản đồ (Tourist):**
- Khi khách đã cấp quyền GPS, quyết định đó được lưu lại trong phiên làm việc của thiết bị. Khi khách chuyển sang tab khác rồi quay lại, hoặc tạm thoát app rồi mở lại mà chưa giải phóng hoàn toàn, bản đồ hiện thị trực tiếp mà không hiển thị lại màn hình yêu cầu quyền truy cập vị trí.
- Ngoại lệ: nếu quyền truy cập vị trí bị thu hồi từ cài đặt trình duyệt/hệ điều hành, màn hình yêu cầu quyền sẽ hiển thị lại ngay lập tức.

**Đếm khách trực tuyến dựa trên heartbeat (Admin):**

| Hành vi của khách | Kết quả với số đếm |
|-------------------|--------------------|
| Chuyển tab / app vào nền | Số đếm **không thay đổi** trong vòng 90 giây |
| Kết nối mạng gián đoạn rồi phục hồi | Số đếm **không thay đổi** nếu kết nối lại trong 90 giây |
| Đóng hoàn toàn tab trình duyệt | Số đếm **giảm** sau tối đa 90 giây |
| Giải phóng hoàn toàn app di động | Số đếm **giảm** sau tối đa 90 giây |

- Client gửi heartbeat đến server mỗi 30 giây trong khi còn kết nối.
- Server loại bỏ session khỏi bộ đếm nếu không nhận được heartbeat trong 90 giây liên tiếp.

---

## 9. Module Analytics — Phân tích lượt truy cập

### 9.1 Mục đích

Cung cấp cho Admin cái nhìn tổng quan về lưu lượng khách ghé thăm khu phố ẩm thực theo thời gian.

### 9.2 Dữ liệu thu thập

- Mỗi khi khách du lịch bắt đầu một phiên mới, hệ thống ghi nhận một **lượt ghé thăm**.
- Không thu thập thông tin cá nhân — chỉ đếm lượt.

### 9.3 Số khách trực tuyến theo thời gian thực

Admin xem được số lượng khách đang trực tuyến tại khu vực tại bất kỳ thời điểm nào. Con số này phản ánh các tab/app **chưa bị đóng hoàn toàn** và có thể chênh lệch tối đa 90 giây so với thực tế (grace period của heartbeat).

### 9.4 Báo cáo thống kê

Admin xem được báo cáo lượt ghé thăm theo các khung thời gian:

| Kỳ báo cáo | Độ chi tiết |
|------------|-------------|
| Hôm nay | Theo từng giờ |
| 7 ngày qua | Theo từng ngày |
| 30 ngày qua | Theo từng ngày |
| 365 ngày qua | Theo từng tháng |

**Quyền truy cập:** Chỉ Admin mới có quyền xem báo cáo analytics.

---

## 10. Module Notification — Thông báo

### 10.1 Mục đích

Đảm bảo tất cả các bên liên quan được thông báo kịp thời về các sự kiện quan trọng trong vòng đời nội dung trên nền tảng.

### 10.2 Danh sách sự kiện thông báo

| Sự kiện | Người nhận | Nội dung thông báo |
|---------|-----------|-------------------|
| Vendor đăng ký tài khoản | Vendor | Mã xác thực email (6 chữ số) và thời hạn hiệu lực |
| Vendor quên mật khẩu | Vendor | Mã đặt lại mật khẩu (6 chữ số) và thời hạn hiệu lực |
| Vendor đăng ký mới | Admin | Thông tin Vendor mới cần kiểm tra |
| Vendor nộp thông tin quán | Admin | Tên quán và thông tin Vendor, nhắc kiểm duyệt |
| Quán được phê duyệt | Vendor | Xác nhận quán đã được duyệt và đang hiển thị |
| Quán bị từ chối | Vendor | Lý do từ chối từ Admin |
| POI được tạo thành công | Vendor | Xác nhận điểm địa lý đã được ghi nhận |
| Vị trí POI được cập nhật | Vendor | Xác nhận thay đổi vị trí |

### 10.3 Nguyên tắc thông báo

- Tất cả thông báo được gửi qua **email**.
- Email được thiết kế theo mẫu chuyên nghiệp, có thương hiệu FlavorTales.
- Thông báo được gửi ngay sau khi sự kiện xảy ra, không bị trì hoãn.

---

## 11. Module Search — Tìm kiếm

### 11.1 Mục đích nghiệp vụ

Cho phép khách du lịch và Vendor tìm kiếm quán ăn và điểm địa lý trên nền tảng theo từ khoá.

### 11.2 Yêu cầu nghiệp vụ

- Tìm kiếm theo: tên quán, mô tả, thể loại/tag.
- Kết quả chỉ hiển thị nội dung đã được phê duyệt và đang hoạt động.
- Hỗ trợ tìm kiếm bằng nhiều ngôn ngữ (nhờ tích hợp với dữ liệu dịch thuật đa ngôn ngữ).

> **Trạng thái hiện tại:** Module đang trong giai đoạn lên kế hoạch, chưa được triển khai.

---

## 12. Module Moderation — Kiểm duyệt nội dung

### 12.1 Mục đích nghiệp vụ

Hỗ trợ Admin kiểm soát chất lượng toàn bộ nội dung trên nền tảng một cách có hệ thống.

### 12.2 Yêu cầu nghiệp vụ

- Phát hiện tự động nội dung không phù hợp (hình ảnh, văn bản).
- Lưu lịch sử đầy đủ mọi hành động kiểm duyệt của Admin.
- Cho phép khách du lịch và Vendor báo cáo nội dung vi phạm.
- Admin nhận thông báo khi có báo cáo vi phạm mới.

> **Trạng thái hiện tại:** Module đang trong giai đoạn lên kế hoạch, chưa được triển khai.

---

*Tài liệu này mô tả các yêu cầu nghiệp vụ của hệ thống FlavorTales, phiên bản 1.0, ngày 07/04/2026.*
