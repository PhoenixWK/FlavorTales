"""
Script to generate FlavorTales PRD as a .docx file.
Run: python generate_prd.py
Requires: pip install python-docx
"""

from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import os

OUTPUT_FILE = os.path.join(os.path.dirname(__file__), "prd.docx")

doc = Document()

# ── Page margins ──────────────────────────────────────────────────────────────
for section in doc.sections:
    section.top_margin    = Inches(1)
    section.bottom_margin = Inches(1)
    section.left_margin   = Inches(1.25)
    section.right_margin  = Inches(1.25)


# ── Helper: add a styled heading ─────────────────────────────────────────────
def add_heading(text, level):
    """Add a heading and return the paragraph."""
    h = doc.add_heading(text, level=level)
    h.alignment = WD_ALIGN_PARAGRAPH.LEFT
    return h


# ── Helper: add body paragraph with optional bold prefix ─────────────────────
def add_body(text, bold_prefix=None):
    p = doc.add_paragraph()
    if bold_prefix:
        run = p.add_run(bold_prefix)
        run.bold = True
    p.add_run(text)
    p.paragraph_format.space_after = Pt(6)
    return p


# ── Helper: add bullet item ───────────────────────────────────────────────────
def add_bullet(text, bold_prefix=None, level=0):
    style = "List Bullet" if level == 0 else "List Bullet 2"
    p = doc.add_paragraph(style=style)
    if bold_prefix:
        run = p.add_run(bold_prefix)
        run.bold = True
    p.add_run(text)
    return p


# ══════════════════════════════════════════════════════════════════════════════
# TITLE
# ══════════════════════════════════════════════════════════════════════════════
title = doc.add_heading("FlavorTales – Product Requirements Document", level=0)
title.alignment = WD_ALIGN_PARAGRAPH.CENTER
title.runs[0].font.size = Pt(24)

sub = doc.add_paragraph("Version 1.0  ·  April 2026")
sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
sub.paragraph_format.space_after = Pt(18)

doc.add_paragraph()  # spacer


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 1 – EXECUTIVE SUMMARY
# ══════════════════════════════════════════════════════════════════════════════
add_heading("1. Executive Summary", level=1)

# ── 1.1 Overview ─────────────────────────────────────────────────────────────
add_heading("1.1 Overview", level=2)

doc.add_paragraph(
    "FlavorTales là nền tảng du lịch ẩm thực thế hệ mới, kết hợp công nghệ "
    "định vị địa lý (geofencing) với hệ thống thuyết minh âm thanh đa ngôn ngữ "
    "được kích hoạt tự động theo vị trí thực tế. Nền tảng phục vụ ba nhóm người "
    "dùng cốt lõi — du khách, vendor (chủ hàng quán) và admin — mỗi nhóm với bộ "
    "công cụ và luồng trải nghiệm riêng biệt, được thiết kế để tối đa hóa giá trị "
    "cho từng vai trò."
)

doc.add_paragraph()

# Tourist
add_body(
    " Khi du khách di chuyển vào vùng geofence của một điểm ẩm thực (Point of "
    "Interest – POI), hệ thống tự động nhận diện vị trí và đề xuất phát audio "
    "thuyết minh bằng ngôn ngữ ưa thích của họ (Tiếng Việt, Anh, Trung, Hàn, "
    "Nhật). Nội dung thuyết minh giới thiệu câu chuyện của quán, món ăn đặc "
    "trưng, lịch sử và nét văn hóa ẩm thực địa phương – đem lại trải nghiệm "
    "khám phá sâu sắc, sống động và cá nhân hóa thay vì chỉ nhìn thấy tên quán "
    "trên bản đồ. Tính năng này giúp nâng cao đáng kể trải nghiệm du lịch ẩm "
    "thực, kết nối cảm xúc giữa du khách với điểm đến và thúc đẩy khám phá "
    "những hàng quán đặc sắc mà họ có thể bỏ qua.",
    bold_prefix="Đối với du khách:",
)

doc.add_paragraph()

# Vendor
add_body(
    " FlavorTales cung cấp bộ công cụ quản lý toàn diện giúp chủ hàng quán "
    "đăng ký điểm POI (xác định vùng geofence), xây dựng hồ sơ cửa hàng chuyên "
    "nghiệp (tên, mô tả, phong cách ẩm thực, ảnh đại diện, thư viện ảnh, thực "
    "đơn), và tạo nội dung thuyết minh âm thanh theo nhiều phương thức: tải lên "
    "file âm thanh trực tiếp hoặc sử dụng hệ thống chuyển văn bản thành giọng "
    "nói (TTS – FPT AI, Google TTS) đa ngôn ngữ. Những công cụ này giúp các "
    "chủ hàng – kể cả những người không có kiến thức kỹ thuật – có thể tự mình "
    "truyền tải câu chuyện thương hiệu, văn hóa và sản phẩm một cách chuyên "
    "nghiệp, đến đúng du khách đang có mặt tại địa điểm, vào đúng thời điểm.",
    bold_prefix="Đối với vendor:",
)

doc.add_paragraph()

# Admin
add_body(
    " Hệ thống cung cấp bảng điều khiển quản trị tập trung để admin có thể "
    "theo dõi, duyệt hoặc từ chối toàn bộ POI, thông tin cửa hàng, thực đơn và "
    "nội dung thuyết minh âm thanh do vendor đăng tải. Quy trình kiểm duyệt "
    "nhiều lớp (pending → active/rejected) đảm bảo rằng mọi nội dung hiển thị "
    "với du khách đều được xác minh về tính chính xác, phù hợp văn hóa và nhất "
    "quán với tiêu chuẩn chất lượng của nền tảng – xây dựng niềm tin và uy tín "
    "cho cả hệ sinh thái FlavorTales.",
    bold_prefix="Đối với admin:",
)

doc.add_paragraph()


# ── 1.2 Goals ────────────────────────────────────────────────────────────────
add_heading("1.2 Goals", level=2)

doc.add_paragraph(
    "Phần này trình bày các mục tiêu định hướng phát triển sản phẩm FlavorTales, "
    "được phân thành mục tiêu chính (Primary Goals) và mục tiêu phụ (Secondary Goals)."
)

doc.add_paragraph()

# Primary Goals
p = doc.add_paragraph()
r = p.add_run("Mục tiêu chính (Primary Goals)")
r.bold = True
r.font.size = Pt(11)

add_bullet(
    " Xây dựng hệ thống thuyết minh ẩm thực tự động theo vị trí: khi du khách "
    "bước vào vùng geofence của một POI đang hoạt động, nền tảng tự động kích "
    "hoạt và phát audio thuyết minh đa ngôn ngữ, mang lại trải nghiệm khám phá "
    "ẩm thực phong phú mà không cần du khách tìm kiếm thủ công.",
    bold_prefix="G1 – Trải nghiệm thuyết minh tự động cho du khách:",
)

add_bullet(
    " Cung cấp nền tảng tự phục vụ (self-service) giúp vendor đăng ký POI, "
    "quản lý hồ sơ cửa hàng, thực đơn và nội dung thuyết minh mà không cần hỗ "
    "trợ kỹ thuật, từ đó mở rộng quy mô nền tảng nhanh chóng và trao quyền cho "
    "cộng đồng vendor địa phương.",
    bold_prefix="G2 – Trao quyền cho vendor tự quản lý nội dung:",
)

add_bullet(
    " Duy trì chất lượng và tính tin cậy của toàn bộ dữ liệu trên hệ thống "
    "thông qua quy trình kiểm duyệt bắt buộc do admin thực hiện trước khi bất "
    "kỳ POI hoặc nội dung nào được công khai với du khách.",
    bold_prefix="G3 – Đảm bảo chất lượng nội dung qua kiểm duyệt admin:",
)

doc.add_paragraph()

# Secondary Goals
p = doc.add_paragraph()
r = p.add_run("Mục tiêu phụ (Secondary Goals)")
r.bold = True
r.font.size = Pt(11)

add_bullet(
    " Hỗ trợ thuyết minh và giao diện bằng 5 ngôn ngữ: Tiếng Việt, Tiếng Anh, "
    "Tiếng Trung, Tiếng Hàn và Tiếng Nhật – phục vụ phân khúc du khách quốc tế "
    "đa dạng tại các điểm du lịch ẩm thực.",
    bold_prefix="G4 – Hỗ trợ đa ngôn ngữ:",
)

add_bullet(
    " Đạt hiệu năng geofencing cao: độ chính xác định vị ≤ 15m, thời gian kiểm "
    "tra vùng zone ≤ 50ms, thời gian giải quyết xung đột vùng chồng lặp ≤ 6 "
    "giây – đảm bảo tính kịp thời và mượt mà của trải nghiệm thuyết minh.",
    bold_prefix="G5 – Hiệu năng geofencing cao:",
)

add_bullet(
    " Xây dựng hệ thống analytics theo dõi hành vi du khách (lượt vào POI, "
    "lượt nghe audio, lượt thích) và cung cấp báo cáo cho vendor và admin nhằm "
    "liên tục cải thiện chất lượng nội dung và chiến lược vận hành.",
    bold_prefix="G6 – Tăng cường tương tác và phân tích dữ liệu:",
)

add_bullet(
    " Thiết kế kiến trúc module hóa (Spring Boot multi-module + Next.js App "
    "Router) cho phép mở rộng sang các khu du lịch ẩm thực và thành phố khác "
    "mà không cần tái cấu trúc hệ thống.",
    bold_prefix="G7 – Khả năng mở rộng quy mô:",
)

add_bullet(
    " Tích hợp Google Cloud TTS cho phép vendor tạo audio thuyết minh chuyên "
    "nghiệp từ văn bản mà không cần thiết bị thu âm hay kiến thức sản xuất âm thanh.",
    bold_prefix="G8 – Hạ thấp rào cản tạo nội dung:",
)

doc.add_paragraph()


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 2 – SCOPE DEFINITION
# ══════════════════════════════════════════════════════════════════════════════
add_heading("2. Scope Definition", level=1)

doc.add_paragraph(
    "Phần này xác định rõ phạm vi phát triển của FlavorTales POC v1.0, bao gồm "
    "các tính năng bắt buộc phải hoàn thành trong đồ án (In-Scope) và các tính "
    "năng được loại trừ có chủ đích để kiểm soát phạm vi và rủi ro (Out of Scope). "
    "Mọi quyết định mở rộng phạm vi đều cần được Product Owner và Development "
    "Lead đồng thuận trước khi triển khai."
)

doc.add_paragraph()

# ── 2.1 In-Scope ─────────────────────────────────────────────────────────────
add_heading("2.1 In-Scope (POC v1.0)", level=2)

doc.add_paragraph(
    "Các tính năng sau đây nằm trong phạm vi bắt buộc của POC v1.0, được phân "
    "loại theo module hệ thống. Mỗi tính năng đã có nền tảng kỹ thuật được triển "
    "khai trong source code tại thời điểm tài liệu này được viết."
)

doc.add_paragraph()

MODULES_IN_SCOPE = [
    {
        "title": "Module 1: Xác thực & Phân quyền (Authentication & Authorization)",
        "features": [
            (
                "Đăng ký tài khoản vendor",
                "Vendor tự đăng ký tài khoản qua email; hệ thống gửi mã OTP 6 chữ số "
                "để xác minh địa chỉ email. Tài khoản chỉ chuyển sang trạng thái ACTIVE "
                "sau khi xác minh thành công.",
            ),
            (
                "Xác minh email & gửi lại mã",
                "Vendor nhập mã OTP trong giới hạn thời gian cho phép; hỗ trợ gửi lại "
                "mã xác minh tối đa 3 lần để tránh lạm dụng.",
            ),
            (
                "Đăng nhập với JWT & HTTP-only cookie",
                "Xác thực stateless bằng JWT lưu trong HTTP-only cookie, chống tấn công "
                "XSS. Hệ thống áp dụng rate-limiting: khóa tài khoản 15 phút sau 3 lần "
                "đăng nhập sai liên tiếp.",
            ),
            (
                "Đăng xuất & hủy token",
                "JWT bị vô hiệu hóa ngay khi vendor đăng xuất; token tự động hết hạn "
                "sau 30 phút không hoạt động để bảo vệ tài khoản.",
            ),
            (
                "Quên mật khẩu & đặt lại mật khẩu",
                "Quy trình hai bước: (1) gửi OTP 6 chữ số qua email, (2) vendor xác nhận "
                "OTP và đặt mật khẩu mới. Token OTP hết hạn sau 30 phút.",
            ),
            (
                "Đăng nhập admin",
                "Admin đăng nhập qua endpoint riêng biệt, được gán quyền ROLE_admin. "
                "Toàn bộ API admin được bảo vệ, từ chối truy cập từ tài khoản vendor.",
            ),
        ],
    },
    {
        "title": "Module 2: Quản lý Điểm Ẩm Thực (POI Management)",
        "features": [
            (
                "Tạo POI gắn với cửa hàng",
                "Vendor tạo POI đồng thời với thông tin cửa hàng trong một thao tác nguyên tử; "
                "hệ thống lưu tọa độ (latitude, longitude) và bán kính geofence (radius, đơn vị "
                "mét). POI có trạng thái pending cho đến khi được admin phê duyệt.",
            ),
            (
                "Quản lý danh sách POI của vendor",
                "Vendor xem danh sách POI của mình, chỉnh sửa thông tin và thực hiện xóa mềm "
                "(soft-delete) với cửa sổ khôi phục 30 ngày trước khi dữ liệu bị xóa vĩnh viễn.",
            ),
            (
                "Duyệt / Từ chối POI (Admin)",
                "Admin xem danh sách POI đang chờ duyệt, xem chi tiết và phê duyệt (active) "
                "hoặc từ chối (rejected) kèm lý do. POI chỉ hiển thị trên bản đồ sau khi được "
                "admin phê duyệt.",
            ),
            (
                "Xem bản đồ POI đang hoạt động",
                "Du khách xem tất cả POI đang active trên bản đồ tương tác (Leaflet); danh "
                "sách POI được cache Redis để tối thiểu hóa tải truy vấn database và đảm bảo "
                "thời gian phản hồi nhanh.",
            ),
            (
                "Yêu thích POI (Like / Unlike)",
                "Du khách like hoặc unlike POI thông qua session ID ẩn danh, không cần tạo "
                "tài khoản. Số lượt like được tổng hợp và hiển thị làm chỉ số phổ biến của POI.",
            ),
            (
                "Dịch tự động nội dung POI đa ngôn ngữ",
                "Tên, địa chỉ và mô tả POI được tự động dịch sang 5 ngôn ngữ (Anh, Trung, Hàn, "
                "Nhật, Nga) thông qua Google Translate API; kết quả lưu tách biệt để truy vấn "
                "nhanh theo ngôn ngữ của du khách.",
            ),
        ],
    },
    {
        "title": "Module 3: Quản lý Cửa Hàng & Thực Đơn (Shop & Menu Management)",
        "features": [
            (
                "Xây dựng hồ sơ cửa hàng đầy đủ",
                "Vendor xây dựng hồ sơ cửa hàng gồm: tên thương hiệu, mô tả câu chuyện, "
                "phong cách ẩm thực, món đặc trưng, ảnh đại diện, thư viện ảnh (có thứ tự "
                "sắp xếp), tags phân loại và giờ mở cửa theo từng ngày trong tuần (JSON). "
                "Chỉnh sửa hồ sơ sẽ đưa cửa hàng về pending để admin re-review.",
            ),
            (
                "Quản lý thực đơn (Menu Items)",
                "Vendor thêm, chỉnh sửa và xóa các món ăn trong thực đơn; mỗi món bao gồm "
                "tên, mô tả, hình ảnh minh họa và giá bán.",
            ),
            (
                "Luồng duyệt cửa hàng của admin",
                "Admin xem danh sách cửa hàng đang chờ duyệt, xem chi tiết đầy đủ (gallery, "
                "audio, menu), phê duyệt hoặc từ chối kèm lý do. Lưu ý quan trọng: quyết định "
                "duyệt cửa hàng KHÔNG tự động thay đổi trạng thái POI liên kết.",
            ),
            (
                "Dịch tự động nội dung cửa hàng",
                "Tên và mô tả cửa hàng được dịch sang 5 ngôn ngữ và lưu trong bảng "
                "translation riêng, cho phép phục vụ nội dung đúng ngôn ngữ ưa thích "
                "của du khách.",
            ),
            (
                "Auto-save bản nháp",
                "Form tạo và chỉnh sửa cửa hàng tự động lưu bản nháp cục bộ (client-side), "
                "bảo vệ dữ liệu đã nhập khi xảy ra sự cố mạng hoặc người dùng vô tình reload trang.",
            ),
        ],
    },
    {
        "title": "Module 4: Hệ Thống Thuyết Minh Âm Thanh (Audio Commentary)",
        "features": [
            (
                "Upload file audio thuyết minh",
                "Vendor upload file âm thanh (MP3/WAV) cho từng ngôn ngữ; hệ thống giới hạn "
                "tối đa 1 audio mỗi ngôn ngữ trên mỗi cửa hàng để đảm bảo tính nhất quán.",
            ),
            (
                "Tạo audio TTS từ văn bản (Text-to-Speech)",
                "Vendor nhập kịch bản thuyết minh bằng văn bản; hệ thống gọi Google Cloud TTS "
                "để tổng hợp giọng đọc tự nhiên và tải file audio lên Cloudflare R2. "
                "Hỗ trợ đồng thời các ngôn ngữ: Tiếng Việt, Tiếng Anh, Tiếng Trung.",
            ),
            (
                "Preview TTS trước khi lưu",
                "Vendor nghe thử audio TTS trực tiếp (streaming) trước khi xác nhận lưu "
                "chính thức, tránh lưu nội dung âm thanh không đạt yêu cầu.",
            ),
            (
                "Tạo TTS toàn bộ ngôn ngữ cùng lúc",
                "Từ kịch bản tiếng Việt, hệ thống tự động dịch sang các ngôn ngữ còn lại, "
                "gọi TTS song song và lưu toàn bộ audio trong một lần thao tác duy nhất.",
            ),
            (
                "Xem danh sách audio theo cửa hàng",
                "Vendor và admin xem toàn bộ audio đã tải lên của một cửa hàng hoặc POI, "
                "kèm thông tin ngôn ngữ, thời lượng và trạng thái xử lý hiện tại.",
            ),
            (
                "Tracking trạng thái xử lý audio",
                "Audio TTS trải qua vòng đời: pending → processing → active / rejected. "
                "Giao diện hiển thị trạng thái real-time để vendor theo dõi tiến trình "
                "tổng hợp giọng đọc.",
            ),
        ],
    },
    {
        "title": "Module 5: Quản lý File & Tài Nguyên (File Asset Management)",
        "features": [
            (
                "Upload ảnh lên Cloudflare R2",
                "Hệ thống nhận file ảnh (JPEG/PNG, tối đa 5MB), kiểm tra định dạng và kích "
                "thước, tính SHA-256 checksum để đảm bảo toàn vẹn dữ liệu, sau đó lưu lên "
                "Cloudflare R2. URL công khai được trả về để frontend nhúng vào giao diện.",
            ),
            (
                "Quản lý metadata file",
                "Mỗi file asset được theo dõi qua: chủ sở hữu, bucket, object key, MIME type, "
                "kích thước byte, SHA-256 checksum và số phiên bản (versioning khi thay thế file).",
            ),
            (
                "Xóa mềm tài nguyên",
                "File được đánh dấu deleted_at thay vì xóa vật lý, hỗ trợ khôi phục trong "
                "cửa sổ 30 ngày trước khi dọn dẹp định kỳ.",
            ),
        ],
    },
    {
        "title": "Module 6: Theo Dõi Vị Trí Du Khách (Tourist Location & Session)",
        "features": [
            (
                "Tạo phiên du khách ẩn danh",
                "Khi du khách mở ứng dụng lần đầu, hệ thống tạo một phiên ẩn danh (UUID) "
                "lưu trong MongoDB với TTL 24 giờ. Không yêu cầu đăng nhập hay cung cấp "
                "bất kỳ thông tin cá nhân nào.",
            ),
            (
                "Cập nhật ngôn ngữ & bộ nhớ đệm offline",
                "Phiên du khách lưu ngôn ngữ ưa thích và danh sách POI/audio đã cache offline, "
                "hỗ trợ trải nghiệm trong điều kiện kết nối mạng yếu hoặc gián đoạn.",
            ),
            (
                "Đếm phiên đang hoạt động (Admin)",
                "Admin xem số lượng du khách đang online trong thời gian thực thông qua "
                "endpoint đếm active session từ MongoDB.",
            ),
            (
                "Kích hoạt audio theo geofence (Client-side)",
                "Frontend tính toán khoảng cách từ vị trí GPS của du khách đến tâm các POI "
                "đang active. Khi du khách bước vào bán kính geofence, giao diện tự động "
                "hiển thị gợi ý phát audio thuyết minh. Logic geofencing chạy hoàn toàn "
                "phía client để đảm bảo độ trễ thấp nhất.",
            ),
        ],
    },
    {
        "title": "Module 7: Analytics & Báo Cáo (Analytics & Reporting)",
        "features": [
            (
                "Thống kê lượt truy cập hệ thống (Admin)",
                "Admin xem báo cáo số lượng phiên du khách theo các khoảng thời gian: "
                "ngày, tuần, tháng, năm. Dữ liệu được tổng hợp và cache Redis để phản hồi nhanh.",
            ),
            (
                "Dashboard hiệu suất cho vendor",
                "Vendor xem tổng quan hiệu suất điểm ẩm thực: số lượt xem POI, lượt nghe "
                "audio, lượt like – thể hiện qua biểu đồ trực quan trên dashboard.",
            ),
        ],
    },
    {
        "title": "Module 8: Giao Diện Người Dùng (Frontend)",
        "features": [
            (
                "Bản đồ tương tác cho du khách",
                "Trang /map hiển thị bản đồ Leaflet với marker và vòng tròn geofence các POI "
                "đang active. Du khách click vào marker để xem thông tin cửa hàng và bắt đầu "
                "phát audio thuyết minh theo ngôn ngữ đã chọn.",
            ),
            (
                "Cổng thông tin vendor (Vendor Portal)",
                "Giao diện dashboard đầy đủ tại /vendor/*: tổng quan, tạo/chỉnh sửa POI, "
                "quản lý cửa hàng & thực đơn (bao gồm gallery và audio), xem analytics.",
            ),
            (
                "Bảng điều khiển admin (Admin Panel)",
                "Giao diện /admin/* cho phép admin duyệt nội dung pending (POI, cửa hàng), "
                "xem thống kê hệ thống (số vendor, du khách online) và xem danh sách toàn "
                "bộ điểm ẩm thực.",
            ),
            (
                "Luồng xác thực hoàn chỉnh",
                "Giao diện đăng ký → xác minh email → đăng nhập → quên mật khẩu → đặt lại "
                "mật khẩu cho cả vendor và admin; xây dựng bằng Next.js App Router, không "
                "dùng localStorage cho token (HTTP-only cookie).",
            ),
            (
                "Hỗ trợ đa ngôn ngữ giao diện (i18n)",
                "Toàn bộ chuỗi ký tự giao diện được externalize qua shared/i18n/ để hỗ trợ "
                "chuyển đổi ngôn ngữ hiển thị và dễ dàng bổ sung ngôn ngữ mới.",
            ),
            (
                "Progressive Web App (PWA)",
                "Ứng dụng cài đặt được lên màn hình chính thiết bị nhờ manifest.json và "
                "service worker (sw.js), hỗ trợ hoạt động cơ bản khi không có kết nối mạng.",
            ),
        ],
    },
]

for mod in MODULES_IN_SCOPE:
    p = doc.add_paragraph()
    r = p.add_run(mod["title"])
    r.bold = True
    r.font.size = Pt(11)
    for feat_name, feat_desc in mod["features"]:
        add_bullet(f" {feat_desc}", bold_prefix=feat_name + ":", level=0)
    doc.add_paragraph()


# ── 2.2 Out of Scope ──────────────────────────────────────────────────────────
add_heading("2.2 Out of Scope", level=2)

doc.add_paragraph(
    "Các hạng mục sau đây được loại trừ có chủ đích khỏi phạm vi POC v1.0. "
    "Quyết định loại trừ dựa trên giới hạn thời gian đồ án, mức độ phức tạp kỹ "
    "thuật chưa đủ điều kiện triển khai, hoặc chưa có đủ dữ liệu nghiệp vụ để "
    "thiết kế. Development Team không nên đầu tư thời gian vào các hạng mục này "
    "trong POC v1.0 mà không có sự phê duyệt từ Product Owner."
)

doc.add_paragraph()

OUT_OF_SCOPE = [
    (
        "Kiểm duyệt nội dung tự động (AI Moderation)",
        "Module flavortales-moderation hiện là stub chưa có implementation. Tính năng tự "
        "động phát hiện nội dung vi phạm (ảnh không phù hợp, văn bản độc hại) bằng AI/ML "
        "chưa được đưa vào phạm vi. Quy trình kiểm duyệt trong POC v1.0 là thủ công 100% "
        "bởi admin.",
    ),
    (
        "Tìm kiếm full-text (Full-text Search)",
        "Module flavortales-search tồn tại trong codebase nhưng chưa có endpoint nào được "
        "triển khai. Chức năng tìm kiếm POI, cửa hàng hay món ăn theo từ khóa, tag hoặc "
        "vị trí địa lý không nằm trong phạm vi POC v1.0.",
    ),
    (
        "Hệ thống thông báo đẩy (Push Notifications)",
        "Module flavortales-notification chưa có implementation. Thông báo real-time gửi "
        "đến vendor (khi POI/shop được duyệt hoặc từ chối) và admin (khi có nội dung mới "
        "chờ duyệt) không nằm trong phạm vi POC v1.0.",
    ),
    (
        "Đánh giá & bình luận du khách (Reviews & Ratings)",
        "Mặc dù frontend có placeholder /vendor/reviews, hệ thống thu thập, lưu trữ, "
        "kiểm duyệt và hiển thị đánh giá sao & bình luận từ du khách chưa được xây dựng "
        "trong POC v1.0.",
    ),
    (
        "Thanh toán & đặt hàng trực tuyến (E-commerce)",
        "FlavorTales POC v1.0 không có tính năng thương mại điện tử: không xây dựng "
        "giỏ hàng, cổng thanh toán (VNPay, MoMo, Stripe) hay tính năng đặt món trước "
        "trực tuyến.",
    ),
    (
        "Quản lý vendor đầy đủ (User Management)",
        "Admin chưa có giao diện quản lý toàn bộ danh sách vendor: xem hồ sơ, thủ công "
        "kích hoạt/khóa/vô hiệu hóa tài khoản. Trạng thái suspended và disabled trong "
        "schema đã thiết kế nhưng chưa có UI/UX triển khai trong phạm vi POC.",
    ),
    (
        "Chia sẻ mạng xã hội & QR Code deep-link",
        "Tính năng chia sẻ POI/cửa hàng lên Facebook, Zalo, Instagram; tạo link chia sẻ "
        "rút gọn và QR code deep-link đến một POI cụ thể không nằm trong phạm vi. "
        "Trang /admin/qr-code hiện tại là placeholder UI.",
    ),
    (
        "Quản lý chuỗi nhiều chi nhánh (Multi-branch Vendor)",
        "Mô hình POI-Shop trong POC v1.0 là 1-1 (một POI gắn một cửa hàng). Chuỗi thương "
        "hiệu có nhiều chi nhánh tại các địa điểm khác nhau cần thiết kế schema và UX riêng, "
        "chưa được đưa vào phạm vi.",
    ),
    (
        "Bản đồ offline hoàn chỉnh (Full Offline Map)",
        "PWA service worker cơ bản đã tích hợp, nhưng tính năng tải toàn bộ tile bản đồ "
        "và dữ liệu POI xuống thiết bị để sử dụng hoàn toàn không có kết nối internet "
        "không nằm trong phạm vi POC v1.0.",
    ),
    (
        "Phân tích hành vi nâng cao (Advanced Analytics)",
        "Heatmap vị trí du khách trên bản đồ, phễu chuyển đổi (conversion funnel từ vào "
        "POI đến nghe audio), A/B testing nội dung thuyết minh và phân tích cohort người "
        "dùng không nằm trong phạm vi. Analytics POC v1.0 chỉ cung cấp số liệu tổng hợp "
        "cơ bản.",
    ),
    (
        "Hỗ trợ tiếng Nga (Russian Language)",
        "Mặc dù database schema có các bảng translation tiếng Nga (poi_translation_russian, "
        "shop_translation_russian), tiếng Nga không nằm trong danh sách ngôn ngữ chính thức "
        "hỗ trợ trong POC v1.0. TTS và giao diện chỉ phục vụ 5 ngôn ngữ: Việt, Anh, Trung, "
        "Hàn, Nhật.",
    ),
    (
        "Tích hợp FPT AI TTS",
        "Mặc dù được nhắc đến trong kiến trúc ban đầu, POC v1.0 chỉ sử dụng Google Cloud "
        "TTS. Tích hợp FPT AI TTS (giọng nói tiếng Việt tự nhiên hơn) là hạng mục ngoài "
        "phạm vi do giới hạn thời gian và chi phí tích hợp.",
    ),
]

for feat_name, feat_desc in OUT_OF_SCOPE:
    add_bullet(f" {feat_desc}", bold_prefix=feat_name + ":", level=0)

doc.add_paragraph()


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 3 – USER PERSONAS AND ROLES
# ══════════════════════════════════════════════════════════════════════════════
add_heading("3. User Personas and Roles", level=1)

# 3.1 Tourist
add_heading("3.1 Tourist (Du Khách)", level=2)
add_body("Tourist là người dùng ẩn danh — không cần tài khoản để truy cập FlavorTales. "
         "Mỗi phiên được định danh bằng UUID ngẫu nhiên lưu trong MongoDB với TTL 24 giờ. "
         "Người dùng chọn ngôn ngữ nghe thuyết minh (vi/en/zh/ko/ja) và lựa chọn này được giữ xuyên suốt phiên.")
doc.add_paragraph()
add_body("Đặc điểm kỹ thuật:", bold_prefix="")
add_bullet("Thiết bị: smartphone, kết nối GPS, mạng di động có thể không ổn định.", level=0)
add_bullet("Không có tài khoản — không đăng ký, không đăng nhập.", level=0)
add_bullet("Session UUID sinh tự động, lưu MongoDB TTL 24h; hết hạn → tạo session mới.", level=0)
add_bullet("Ngôn ngữ ưu tiên (vi/en/zh/ko/ja) lưu trong session document.", level=0)
doc.add_paragraph()
add_body("Quyền hạn:", bold_prefix="")
add_bullet("Xem bản đồ các POI đang ở trạng thái active.", level=0)
add_bullet("Nghe audio thuyết minh đa ngôn ngữ tự động khi vào geofence.", level=0)
add_bullet("Like / Unlike POI (lưu theo session, không cần tài khoản).", level=0)
add_bullet("Cập nhật ngôn ngữ phiên hiện tại.", level=0)
add_bullet("Không thể tạo, sửa, xóa bất kỳ nội dung nào trong hệ thống.", level=0)

doc.add_paragraph()

# 3.2 Vendor
add_heading("3.2 Vendor (Chủ Hàng Quán)", level=2)
add_body("Vendor là chủ sở hữu quán ăn/cửa hàng đã đăng ký tài khoản, xác minh email OTP thành công "
         "và được gán vai trò ROLE_vendor. Vendor quản lý toàn bộ nội dung liên quan đến địa điểm "
         "của mình, bao gồm POI, cửa hàng, menu, ảnh và audio thuyết minh.")
doc.add_paragraph()
add_body("Đặc điểm kỹ thuật:", bold_prefix="")
add_bullet("Xác thực: JWT HTTP-only cookie, stateless, hết hạn sau 30 phút.", level=0)
add_bullet("Rate-limiting: 3 lần đăng nhập sai → khóa tài khoản 15 phút.", level=0)
add_bullet("Phải xác minh email OTP trước khi tài khoản chuyển sang trạng thái active.", level=0)
add_bullet("Truy cập qua cổng vendor tại /vendor/* trên frontend.", level=0)
doc.add_paragraph()
add_body("Quyền hạn:", bold_prefix="")
add_bullet("CRUD POI do mình tạo (tạo, chỉnh sửa, xóa mềm).", level=0)
add_bullet("CRUD cửa hàng, menu item, ảnh và audio thuyết minh của mình.", level=0)
add_bullet("Upload file ảnh và audio lên Cloudflare R2.", level=0)
add_bullet("Tạo audio TTS đa ngôn ngữ qua Google Cloud TTS.", level=0)
add_bullet("Xem dashboard analytics của riêng mình (lượt xem, lượt thích, visitor).", level=0)
add_bullet("Không truy cập dữ liệu của vendor khác.", level=0)
add_bullet("Không truy cập bất kỳ API quản trị nào.", level=0)

doc.add_paragraph()

# 3.3 Admin
add_heading("3.3 Admin (Quản Trị Viên)", level=2)
add_body("Admin là quản trị viên hệ thống với vai trò ROLE_admin được gán cứng trong cơ sở dữ liệu. "
         "Admin không tự đăng ký — tài khoản được tạo thủ công và đăng nhập qua cổng riêng /auth/admin/login.")
doc.add_paragraph()
add_body("Đặc điểm kỹ thuật:", bold_prefix="")
add_bullet("Vai trò ROLE_admin gán cứng, không tự đăng ký được.", level=0)
add_bullet("Đăng nhập qua endpoint riêng biệt /auth/admin/login.", level=0)
add_bullet("Xác thực: JWT HTTP-only cookie, stateless, cùng cơ chế với vendor.", level=0)
add_bullet("Truy cập trang quản trị tại /admin/* trên frontend.", level=0)
doc.add_paragraph()
add_body("Quyền hạn:", bold_prefix="")
add_bullet("Duyệt (approve) hoặc từ chối (reject) POI của vendor kèm lý do.", level=0)
add_bullet("Duyệt (approve) hoặc từ chối (reject) cửa hàng của vendor kèm lý do.", level=0)
add_bullet("Xem thống kê toàn hệ thống: visitor theo ngày/tuần/tháng/năm.", level=0)
add_bullet("Xem số du khách đang online (active session count).", level=0)
add_bullet("Xem tổng số vendor đã đăng ký.", level=0)
add_bullet("Không tạo hoặc chỉnh sửa nội dung thay cho vendor.", level=0)

doc.add_paragraph()

# 3.4 Permission Matrix
add_heading("3.4 Bảng Tổng Hợp Quyền Hạn", level=2)

permissions = [
    ("Chức năng", "Tourist", "Vendor", "Admin"),
    ("Xem bản đồ POI đang active", "✓", "✓", "✓"),
    ("Like / Unlike POI", "✓", "✗", "✗"),
    ("Nghe audio thuyết minh", "✓", "✓", "✗"),
    ("Tạo / chỉnh sửa POI", "✗", "✓", "✗"),
    ("Xóa POI (soft-delete)", "✗", "✓", "✗"),
    ("Duyệt / Từ chối POI", "✗", "✗", "✓"),
    ("Tạo / chỉnh sửa cửa hàng", "✗", "✓", "✗"),
    ("Duyệt / Từ chối cửa hàng", "✗", "✗", "✓"),
    ("Upload ảnh & audio", "✗", "✓", "✗"),
    ("Tạo audio TTS", "✗", "✓", "✗"),
    ("Xem dashboard analytics (của mình)", "✗", "✓", "✗"),
    ("Xem thống kê toàn hệ thống", "✗", "✗", "✓"),
    ("Xem số du khách online", "✗", "✗", "✓"),
    ("Đăng nhập (tài khoản)", "✗", "✓", "✓"),
    ("Truy cập không cần tài khoản", "✓", "✗", "✗"),
]

tbl = doc.add_table(rows=len(permissions), cols=4)
tbl.style = "Table Grid"
from docx.shared import Pt, RGBColor
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

for row_idx, row_data in enumerate(permissions):
    row = tbl.rows[row_idx]
    for col_idx, cell_text in enumerate(row_data):
        cell = row.cells[col_idx]
        cell.text = cell_text
        run = cell.paragraphs[0].runs[0]
        run.font.size = Pt(10)
        if row_idx == 0:
            run.font.bold = True
            shading = OxmlElement("w:shd")
            shading.set(qn("w:val"), "clear")
            shading.set(qn("w:color"), "auto")
            shading.set(qn("w:fill"), "4472C4")
            cell._tc.get_or_add_tcPr().append(shading)
            run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        elif cell_text == "✓":
            run.font.color.rgb = RGBColor(0x00, 0x70, 0xC0)
        elif cell_text == "✗":
            run.font.color.rgb = RGBColor(0xC0, 0x00, 0x00)

doc.add_paragraph()


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 4 – USER STORIES
# ══════════════════════════════════════════════════════════════════════════════
add_heading("4. User Stories", level=1)
add_body(
    "Bảng dưới đây liệt kê các user story theo từng module. "
    "Ký hiệu ưu tiên: P0 – Must (bắt buộc để sản phẩm hoạt động), "
    "P1 – Should (nên có để đảm bảo trải nghiệm tốt), "
    "P2 – Could (có thể bổ sung trong tương lai)."
)
doc.add_paragraph()

user_stories = [
    ("ID", "Module", "User Story", "Độ ưu tiên"),
    ("US-001", "Auth", "Là Vendor, tôi muốn đăng ký tài khoản bằng email và mật khẩu để có thể truy cập cổng quản lý vendor.", "P0 (Must)"),
    ("US-002", "Auth", "Là Vendor, tôi muốn xác minh email bằng mã OTP 6 chữ số để tài khoản được kích hoạt.", "P0 (Must)"),
    ("US-003", "Auth", "Là Vendor, tôi muốn gửi lại mã xác minh để kích hoạt tài khoản khi mã cũ đã hết hạn.", "P1 (Should)"),
    ("US-004", "Auth", "Là Vendor hoặc Admin, tôi muốn đăng nhập bằng email và mật khẩu để truy cập tài khoản của mình.", "P0 (Must)"),
    ("US-005", "Auth", "Là Vendor hoặc Admin, tôi muốn đăng xuất để phiên làm việc bị hủy và cookie được xóa.", "P0 (Must)"),
    ("US-006", "Auth", "Là Vendor, tôi muốn yêu cầu liên kết đặt lại mật khẩu để lấy lại quyền truy cập tài khoản.", "P1 (Should)"),
    ("US-007", "Auth", "Là Vendor, tôi muốn đặt lại mật khẩu bằng mã OTP để tạo mật khẩu mới mà không cần biết mật khẩu cũ.", "P1 (Should)"),
    ("US-008", "POI", "Là Vendor, tôi muốn tạo POI kèm cửa hàng liên kết (tên, tọa độ, bán kính geofence, mô tả) để quán ăn của tôi xuất hiện trên bản đồ du khách.", "P0 (Must)"),
    ("US-009", "POI", "Là Vendor, tôi muốn xem danh sách tất cả POI tôi đã tạo để quản lý các địa điểm đã đăng ký.", "P0 (Must)"),
    ("US-010", "POI", "Là Vendor, tôi muốn chỉnh sửa thông tin POI để cập nhật hoặc sửa lỗi chi tiết địa điểm.", "P0 (Must)"),
    ("US-011", "POI", "Là Vendor, tôi muốn xóa mềm POI để ẩn nó khỏi bản đồ mà không mất dữ liệu.", "P1 (Should)"),
    ("US-012", "POI", "Là Tourist, tôi muốn xem tất cả POI đang active trên bản đồ tương tác để khám phá các quán ăn lân cận.", "P0 (Must)"),
    ("US-013", "POI", "Là Tourist, tôi muốn like hoặc unlike một POI để đánh dấu địa điểm thú vị trong phiên hiện tại.", "P1 (Should)"),
    ("US-014", "POI", "Là Tourist, tôi muốn xem chi tiết POI bằng ngôn ngữ ưa thích để hiểu thông tin địa điểm.", "P0 (Must)"),
    ("US-015", "POI", "Là Admin, tôi muốn xem tất cả POI đang chờ duyệt để xử lý hàng đợi kiểm duyệt.", "P0 (Must)"),
    ("US-016", "POI", "Là Admin, tôi muốn duyệt một POI để nó hiển thị với du khách trên bản đồ.", "P0 (Must)"),
    ("US-017", "POI", "Là Admin, tôi muốn từ chối một POI kèm lý do để vendor biết cần sửa gì.", "P0 (Must)"),
    ("US-018", "POI", "Là Admin, tôi muốn xem tất cả POI trên bản đồ để trực quan hóa phân bố địa lý của chúng.", "P0 (Must)"),
    ("US-019", "POI", "Là Admin, tôi muốn xem POI dưới dạng danh sách để duyệt và tìm kiếm nhanh.", "P1 (Should)"),
    ("US-020", "Shop", "Là Vendor, tôi muốn tạo hồ sơ cửa hàng (phong cách ẩm thực, giờ mở cửa, thẻ tag) để du khách có thể tìm hiểu về quán của mình.", "P0 (Must)"),
    ("US-021", "Shop", "Là Vendor, tôi muốn xem danh sách tất cả cửa hàng của mình để quản lý hồ sơ các quán ăn.", "P0 (Must)"),
    ("US-022", "Shop", "Là Vendor, tôi muốn chỉnh sửa thông tin cửa hàng để giữ thông tin quán luôn cập nhật.", "P0 (Must)"),
    ("US-023", "Shop", "Là Vendor, tôi muốn upload nhiều ảnh gallery với thứ tự sắp xếp để du khách xem hình ảnh các món ăn.", "P0 (Must)"),
    ("US-024", "Shop", "Là Tourist, tôi muốn xem chi tiết cửa hàng bằng ngôn ngữ ưa thích để hiểu menu và mô tả.", "P0 (Must)"),
    ("US-025", "Shop", "Là Admin, tôi muốn xem tất cả cửa hàng đang chờ duyệt để kiểm duyệt trước khi công khai.", "P0 (Must)"),
    ("US-026", "Shop", "Là Admin, tôi muốn duyệt một cửa hàng để nó hiển thị với du khách.", "P0 (Must)"),
    ("US-027", "Shop", "Là Admin, tôi muốn từ chối một cửa hàng kèm lý do để vendor thực hiện chỉnh sửa cần thiết.", "P0 (Must)"),
    ("US-028", "Menu", "Là Vendor, tôi muốn thêm món ăn (tên, giá, ảnh) vào cửa hàng để du khách có thể xem thực đơn.", "P0 (Must)"),
    ("US-029", "Menu", "Là Vendor, tôi muốn chỉnh sửa hoặc xóa món ăn để thực đơn luôn được cập nhật.", "P1 (Should)"),
    ("US-030", "Audio", "Là Vendor, tôi muốn tạo audio thuyết minh TTS bằng tiếng Việt từ văn bản mô tả để có lời thuyết minh cho quán.", "P0 (Must)"),
    ("US-031", "Audio", "Là Vendor, tôi muốn tự động tạo audio TTS cho tất cả ngôn ngữ hỗ trợ (vi/en/zh/ko/ja) cùng lúc để tiếp cận du khách quốc tế.", "P0 (Must)"),
    ("US-032", "Audio", "Là Vendor, tôi muốn nghe thử audio TTS trước khi lưu để kiểm tra chất lượng trước khi xuất bản.", "P1 (Should)"),
    ("US-033", "Audio", "Là Vendor, tôi muốn upload file audio tự thu âm để dùng lời thuyết minh tùy chỉnh thay vì TTS.", "P1 (Should)"),
    ("US-034", "Audio", "Là Tourist, tôi muốn audio thuyết minh tự động phát khi tôi vào vùng geofence của POI để nhận thuyết minh mà không cần thao tác thủ công.", "P0 (Must)"),
    ("US-035", "Audio", "Là Tourist, tôi muốn nghe audio thuyết minh bằng ngôn ngữ tôi đã chọn để hiểu câu chuyện về quán ăn.", "P0 (Must)"),
    ("US-036", "File", "Là Vendor, tôi muốn upload ảnh JPEG/PNG (tối đa 5 MB mỗi ảnh) lên Cloudflare R2 để cửa hàng và POI có nội dung hình ảnh.", "P0 (Must)"),
    ("US-037", "Location", "Là Tourist, tôi muốn một phiên ẩn danh được tạo tự động khi mở bản đồ để sử dụng ứng dụng mà không cần tài khoản.", "P0 (Must)"),
    ("US-038", "Location", "Là Tourist, tôi muốn chọn ngôn ngữ nghe audio ưa thích để ứng dụng ghi nhớ lựa chọn trong suốt phiên.", "P0 (Must)"),
    ("US-039", "Location", "Là Tourist, tôi muốn phiên làm việc tự động hết hạn sau 24 giờ để hệ thống dọn dẹp dữ liệu du khách không còn hoạt động.", "P1 (Should)"),
    ("US-040", "Analytics", "Là Admin, tôi muốn xem thống kê lượt truy cập theo ngày, tuần, tháng và năm để theo dõi xu hướng lưu lượng truy cập nền tảng.", "P0 (Must)"),
    ("US-041", "Analytics", "Là Admin, tôi muốn xem số lượng du khách đang online để giám sát hoạt động trực tiếp trên nền tảng.", "P0 (Must)"),
    ("US-042", "Analytics", "Là Admin, tôi muốn xem tổng số vendor đã đăng ký để theo dõi mức độ tăng trưởng của nền tảng.", "P0 (Must)"),
    ("US-043", "Analytics", "Là Vendor, tôi muốn xem analytics của POI và cửa hàng của mình (lượt xem, lượt thích) để đánh giá hiệu quả nội dung.", "P1 (Should)"),
    ("US-044", "Notification", "Là Vendor, tôi muốn nhận thông báo email khi POI hoặc cửa hàng được duyệt hoặc bị từ chối để biết kết quả kiểm duyệt mà không cần vào cổng quản lý.", "P1 (Should)"),
]

from docx.oxml.ns import qn as _qn
from docx.oxml import OxmlElement as _OxmlElement
from docx.shared import Pt as _Pt, RGBColor as _RGBColor, Cm as _Cm

def _set_cell_border(cell, top="nil", left="nil", right="nil", bottom="nil", color="000000"):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = _OxmlElement("w:tcBorders")
    for edge, val in [("top", top), ("left", left), ("bottom", bottom), ("right", right)]:
        tag = _OxmlElement(f"w:{edge}")
        tag.set(_qn("w:val"), val)
        tag.set(_qn("w:sz"), "4")
        tag.set(_qn("w:space"), "0")
        tag.set(_qn("w:color"), color)
        tcBorders.append(tag)
    tcPr.append(tcBorders)

us_tbl = doc.add_table(rows=len(user_stories), cols=4)
us_tbl.style = "Table Grid"
col_widths = [_Cm(1.8), _Cm(2.5), _Cm(10.0), _Cm(2.5)]

for row_idx, row_data in enumerate(user_stories):
    row = us_tbl.rows[row_idx]
    is_header = (row_idx == 0)
    for col_idx, cell_text in enumerate(row_data):
        cell = row.cells[col_idx]
        cell.width = col_widths[col_idx]
        para = cell.paragraphs[0]
        para.clear()
        run = para.add_run(cell_text)
        run.font.size = _Pt(10)
        run.font.bold = is_header or (col_idx == 0 and not is_header)
        if is_header:
            _set_cell_border(cell, top="single", bottom="single", color="000000")
        else:
            _set_cell_border(cell, top="nil", bottom="single", color="999999")

doc.add_paragraph()


# ══════════════════════════════════════════════════════════════════════════════
# SAVE
# ══════════════════════════════════════════════════════════════════════════════
doc.save(OUTPUT_FILE)
print(f"✓ Saved: {OUTPUT_FILE}")
