"""
Generate project-evaluation.docx – Đánh giá theo PRD
Kết quả đạt được · Hạn chế tồn tại · Hướng phát triển
"""

from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

def set_cell_bg(cell, hex_color):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)

def add_heading(doc, text, level=1, color="C0392B"):
    p = doc.add_heading(text, level=level)
    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
    for run in p.runs:
        run.font.color.rgb = RGBColor.from_string(color)
        run.font.bold = True
    return p

def add_sub(doc, text, color="E67E22"):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.bold = True
    run.font.size = Pt(12)
    run.font.color.rgb = RGBColor.from_string(color)
    p.paragraph_format.space_before = Pt(8)
    p.paragraph_format.space_after = Pt(2)

def add_body(doc, text):
    p = doc.add_paragraph(text)
    p.paragraph_format.space_after = Pt(4)
    for run in p.runs:
        run.font.size = Pt(11)

def add_bullet(doc, text, indent=0.5, bold_prefix=None):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.left_indent = Cm(indent)
    if bold_prefix:
        r1 = p.add_run(bold_prefix + ": ")
        r1.bold = True
        r1.font.size = Pt(11)
    r2 = p.add_run(text)
    r2.font.size = Pt(11)

def section_divider(doc):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    pPr = p._p.get_or_add_pPr()
    pBdr = OxmlElement("w:pBdr")
    bottom = OxmlElement("w:bottom")
    bottom.set(qn("w:val"), "single")
    bottom.set(qn("w:sz"), "6")
    bottom.set(qn("w:space"), "1")
    bottom.set(qn("w:color"), "E67E22")
    pBdr.append(bottom)
    pPr.append(pBdr)

STATUS_DONE = "✔ Đạt"
STATUS_PART = "⚠ Một phần"
STATUS_NO   = "✘ Chưa"
STATUS_PLAN = "— Kế hoạch"

GREEN  = "D5F5E3"
YELLOW = "FEF9E7"
RED    = "FADBD8"
GRAY   = "F2F3F4"
HEADER = "FDF2E9"

STATUS_COLOR = {
    STATUS_DONE: GREEN,
    STATUS_PART: YELLOW,
    STATUS_NO:   RED,
    STATUS_PLAN: GRAY,
}

def add_status_table(doc, headers, rows):
    col_count = len(headers)
    tbl = doc.add_table(rows=1 + len(rows), cols=col_count)
    tbl.style = "Table Grid"
    hr = tbl.rows[0]
    for i, h in enumerate(headers):
        set_cell_bg(hr.cells[i], HEADER)
        p = hr.cells[i].paragraphs[0]
        run = p.add_run(h)
        run.bold = True
        run.font.size = Pt(10)
    for ri, row in enumerate(rows):
        tr = tbl.rows[ri + 1]
        status = row[-1]
        bg = STATUS_COLOR.get(status, "FFFFFF")
        for ci, val in enumerate(row):
            cell = tr.cells[ci]
            if ci == col_count - 1:
                set_cell_bg(cell, bg)
            p = cell.paragraphs[0]
            run = p.add_run(val)
            run.font.size = Pt(10)
            if ci == col_count - 1:
                run.bold = True
    doc.add_paragraph()

def add_numbered(doc, items):
    for title, desc in items:
        p = doc.add_paragraph(style="List Number")
        r1 = p.add_run(title + ": ")
        r1.bold = True
        r1.font.size = Pt(11)
        r2 = p.add_run(desc)
        r2.font.size = Pt(11)

# ══ BUILD DOCUMENT ══════════════════════════════════════════════════════════
doc = Document()
for section in doc.sections:
    section.left_margin = Cm(2.5)
    section.right_margin = Cm(2.5)
    section.top_margin = Cm(2.0)
    section.bottom_margin = Cm(2.0)

# Cover
title_p = doc.add_heading("ĐÁNH GIÁ DỰ ÁN FLAVORTALES", 0)
title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
for run in title_p.runs:
    run.font.color.rgb = RGBColor(0xC0, 0x39, 0x2B)
    run.font.size = Pt(22)
    run.font.bold = True

sub_p = doc.add_paragraph(
    "Đánh giá mức độ đáp ứng Product Requirements Document (PRD)\n"
    "Kết quả đạt được · Hạn chế tồn tại · Hướng phát triển tiếp theo"
)
sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
for run in sub_p.runs:
    run.font.size = Pt(12)
    run.font.color.rgb = RGBColor(0x7F, 0x8C, 0x8D)
    run.font.italic = True
doc.add_paragraph()

# ══ I. TỔNG QUAN ════════════════════════════════════════════════════════════
add_heading(doc, "I. TỔNG QUAN DỰ ÁN", level=1, color="1A5276")
add_body(doc, (
    "FlavorTales là nền tảng du lịch ẩm thực kết nối vendor (chủ quán ăn) và khách du lịch "
    "thông qua bản đồ số tương tác, audio giới thiệu đa ngôn ngữ và hệ thống geofencing. "
    "Tài liệu này đánh giá mức độ đáp ứng các yêu cầu nghiệp vụ đã được định nghĩa trong "
    "PRD (Business Requirements v1.0 – 07/04/2026) so với triển khai thực tế trên source code."
))

add_sub(doc, "Nhóm người dùng mục tiêu", color="1A5276")
user_tbl = doc.add_table(rows=4, cols=2)
user_tbl.style = "Table Grid"
for cell, h in zip(user_tbl.rows[0].cells, ["Nhóm", "Vai trò"]):
    set_cell_bg(cell, HEADER)
    r = cell.paragraphs[0].add_run(h); r.bold = True; r.font.size = Pt(10)
for i, (g, d) in enumerate([
    ("Vendor", "Chủ quán ăn – đăng ký, quản lý POI, gian hàng, audio"),
    ("Admin", "Quản trị viên – duyệt nội dung, theo dõi thống kê"),
    ("Khách du lịch", "Người dùng ẩn danh – khám phá bản đồ, nghe audio"),
], 1):
    r0 = user_tbl.rows[i].cells[0].paragraphs[0].add_run(g); r0.bold=True; r0.font.size=Pt(10)
    r1 = user_tbl.rows[i].cells[1].paragraphs[0].add_run(d); r1.font.size=Pt(10)
doc.add_paragraph()

add_sub(doc, "Chú thích trạng thái đánh giá", color="1A5276")
leg = doc.add_table(rows=1, cols=4)
leg.style = "Table Grid"
for cell, (st, desc) in zip(leg.rows[0].cells, [
    (STATUS_DONE,"Hoàn thành đầy đủ"),
    (STATUS_PART,"Đáp ứng một phần"),
    (STATUS_NO,  "Chưa triển khai"),
    (STATUS_PLAN,"Kế hoạch / Ngoài phạm vi"),
]):
    set_cell_bg(cell, STATUS_COLOR[st])
    r1 = cell.paragraphs[0].add_run(st+" – "); r1.bold=True; r1.font.size=Pt(10)
    r2 = cell.paragraphs[0].add_run(desc); r2.font.size=Pt(10)
doc.add_paragraph()

# ══ II. KẾT QUẢ ĐẠT ĐƯỢC ════════════════════════════════════════════════════
section_divider(doc)
add_heading(doc, "II. KẾT QUẢ ĐẠT ĐƯỢC", level=1, color="1E8449")
add_body(doc, (
    "Bảng tổng hợp dưới đây so sánh từng module trong PRD với mức độ đáp ứng thực tế. "
    "Chi tiết đánh giá từng yêu cầu nghiệp vụ được trình bày trong các mục tiếp theo."
))

add_sub(doc, "Bảng tổng hợp hoàn thành theo module PRD")
add_status_table(doc, ["Module (PRD)", "Phạm vi yêu cầu", "Trạng thái"], [
    ("Auth – Xác thực & Phân quyền",      "Đăng ký, xác thực email, đăng nhập, quên MK, đăng xuất", STATUS_DONE),
    ("User – Quản lý người dùng",          "Vòng đời tài khoản, phân quyền vendor/admin",             STATUS_DONE),
    ("POI – Điểm địa lý ẩm thực",         "Tạo 4 bước, duyệt, cập nhật, xoá, geofencing, like",     STATUS_PART),
    ("Content – Quản lý quán ăn",         "CRUD gian hàng, quy trình duyệt, đa ngôn ngữ",            STATUS_PART),
    ("File – Quản lý tệp đa phương tiện", "Upload ảnh R2, phân loại theo vendor",                    STATUS_PART),
    ("Audio – Nội dung âm thanh TTS",     "TTS 6 ngôn ngữ, upload thủ công, nghe thử, lifecycle",    STATUS_DONE),
    ("Location – Phiên du lịch & Vị trí", "Phiên ẩn danh MongoDB, WebSocket visitor",               STATUS_PART),
    ("Analytics – Phân tích lượt truy cập","Thống kê day/week/month/year, online count real-time",   STATUS_DONE),
    ("Notification – Thông báo",           "Email async đầy đủ 8 sự kiện nghiệp vụ trong PRD",       STATUS_DONE),
    ("Search – Tìm kiếm",                  "PRD §11 ghi nhận chưa triển khai",                        STATUS_PLAN),
    ("Moderation – Kiểm duyệt nội dung",  "PRD §12 ghi nhận chưa triển khai",                        STATUS_PLAN),
])

# Module chi tiết
add_sub(doc, "2.1  Module Auth – Xác thực & Phân quyền")
add_status_table(doc, ["Yêu cầu nghiệp vụ (PRD §2)", "Trạng thái"], [
    ("Đăng ký vendor với email, họ tên, SĐT, mật khẩu",               STATUS_DONE),
    ("Kiểm tra tính duy nhất của email & họ tên",                      STATUS_DONE),
    ("Gửi mã xác thực 6 chữ số qua email",                            STATUS_DONE),
    ("Xác thực email → tài khoản chuyển sang Hoạt động",              STATUS_DONE),
    ("Gửi lại mã xác thực tối đa 3 lần",                              STATUS_DONE),
    ("Đăng nhập vendor & admin; xử lý từng trạng thái tài khoản",     STATUS_DONE),
    ("Phiên 24h / 7 ngày khi chọn Remember Me",                        STATUS_DONE),
    ("Rate limiting: 5 lần/15 phút; khoá tài khoản 30 phút",          STATUS_DONE),
    ("Quên mật khẩu – mã reset 30 phút, chỉ dùng 1 lần",             STATUS_DONE),
    ("Giới hạn 3 yêu cầu/giờ per IP cho forgot-password",             STATUS_PART),
    ("Vô hiệu hoá tất cả phiên cũ sau khi đổi mật khẩu",             STATUS_DONE),
    ("Đăng xuất – huỷ token ngay lập tức (Redis blacklist)",          STATUS_DONE),
])
add_bullet(doc,
    "Giới hạn per IP cho forgot-password hiện dùng LoginAttemptService theo account, "
    "chưa phân biệt theo địa chỉ IP riêng biệt như PRD §2.5 yêu cầu.",
    bold_prefix="Lưu ý")

add_sub(doc, "2.2  Module User – Quản lý người dùng")
add_status_table(doc, ["Yêu cầu nghiệp vụ (PRD §3)", "Trạng thái"], [
    ("Phân quyền vendor / admin",                                       STATUS_DONE),
    ("Vòng đời: inactive → active → suspended / rejected / disabled",  STATUS_DONE),
    ("Admin quản lý trạng thái tài khoản vendor",                      STATUS_DONE),
    ("Không có luồng tự đăng ký admin",                                STATUS_DONE),
    ("Vendor cập nhật thông tin cá nhân (edit profile)",               STATUS_PART),
])
add_bullet(doc,
    "Dữ liệu hồ sơ vendor được lưu đầy đủ. Giao diện tự cập nhật thông tin "
    "(edit profile page) chưa hoàn thiện trên frontend.",
    bold_prefix="Lưu ý")

add_sub(doc, "2.3  Module POI – Điểm địa lý ẩm thực")
add_status_table(doc, ["Yêu cầu nghiệp vụ (PRD §4)", "Trạng thái"], [
    ("Luồng tạo POI 4 bước với khả năng quay lại bước trước",         STATUS_PART),
    ("Kiểm tra vị trí trong vùng khu vực ẩm thực (boundary circle)",  STATUS_DONE),
    ("Không cho POI mới cách POI hiện tại dưới 5 m",                  STATUS_DONE),
    ("Tên quán là duy nhất trên toàn nền tảng",                       STATUS_DONE),
    ("Bước 2 bắt buộc ít nhất 1 audio trước khi gửi duyệt",          STATUS_PART),
    ("Draft tự lưu – không mất dữ liệu khi quay bước (localStorage)", STATUS_PART),
    ("Bản dịch tạm Redis 30 phút → ghi DB khi submit",                STATUS_PART),
    ("Vòng đời: pending → active / rejected / deleted",               STATUS_DONE),
    ("Admin duyệt Shop → POI tự động chuyển active",                  STATUS_DONE),
    ("Admin từ chối Shop → POI giữ nguyên trạng thái",               STATUS_DONE),
    ("Cập nhật POI: kiểm tra lại boundary + conflict khi đổi tọa độ", STATUS_DONE),
    ("Soft-delete và hard-delete POI",                                 STATUS_DONE),
    ("Geofencing: hiển thị thông tin + audio khi vào vùng phủ sóng", STATUS_DONE),
    ("Xử lý overlap geofence (ưu tiên POI gần nhất)",                 STATUS_DONE),
    ("Like / Unlike POI ẩn danh, idempotent theo session",            STATUS_DONE),
    ("Dịch thuật POI sang 5 ngôn ngữ tự động",                       STATUS_DONE),
])
add_bullet(doc,
    "Luồng 4 bước đã triển khai nhưng: (1) validation bắt buộc audio ở Bước 2 chưa đủ chặt; "
    "(2) draft localStorage chưa hoàn toàn đầy đủ khi quay nhiều bước; "
    "(3) luồng 'tiêu thụ cache Redis → ghi DB nguyên tử' chưa đúng như mô tả PRD.",
    bold_prefix="Lưu ý")

add_sub(doc, "2.4  Module Content – Quản lý quán ăn (Shop)")
add_status_table(doc, ["Yêu cầu nghiệp vụ (PRD §5)", "Trạng thái"], [
    ("Tạo shop: tên, mô tả, ảnh, gallery, giờ mở cửa, tags, ẩm thực", STATUS_DONE),
    ("Tên quán là duy nhất (shop đang hoạt động)",                     STATUS_DONE),
    ("Duyệt Shop → Shop + POI active; email xác nhận cho vendor",     STATUS_DONE),
    ("Từ chối Shop → Shop rejected, POI không đổi; email kèm lý do", STATUS_DONE),
    ("Cập nhật shop → tự động chuyển về Chờ duyệt",                  STATUS_PART),
    ("Admin xem danh sách pending, chi tiết, phê duyệt / từ chối",   STATUS_DONE),
    ("Dịch thuật shop sang 5 ngôn ngữ",                               STATUS_DONE),
])
add_bullet(doc,
    "Endpoint PUT /api/shop/{shopId} chưa tự động chuyển trạng thái về pending trong tất cả "
    "trường hợp. Nội dung có thể được sửa mà không qua kiểm duyệt lại.",
    bold_prefix="Lưu ý")

add_sub(doc, "2.5  Module File – Quản lý tệp đa phương tiện")
add_status_table(doc, ["Yêu cầu nghiệp vụ (PRD §6)", "Trạng thái"], [
    ("Upload ảnh JPEG/PNG lên Cloudflare R2",                         STATUS_DONE),
    ("Phân loại file theo vendor (object key prefix)",                STATUS_DONE),
    ("URL công khai, Cache-Control 1 năm",                            STATUS_DONE),
    ("Kiểm tra MIME type và định dạng chấp nhận",                    STATUS_DONE),
    ("Giới hạn dung lượng tối đa 20 MB/ảnh (PRD §6.2)",             STATUS_PART),
    ("Tối ưu hoá ảnh cho thiết bị di động (nén, WebP)",              STATUS_NO),
])
add_bullet(doc,
    "Giới hạn 20 MB được cấu hình qua Spring multipart nhưng chưa có thông báo lỗi "
    "rõ ràng cho người dùng. Tối ưu hoá ảnh (nén / WebP) chưa triển khai.",
    bold_prefix="Lưu ý")

add_sub(doc, "2.6  Module Audio – Nội dung âm thanh")
add_status_table(doc, ["Yêu cầu nghiệp vụ (PRD §7)", "Trạng thái"], [
    ("TTS tự động từ văn bản tiếng Việt (Google Cloud TTS)",          STATUS_DONE),
    ("Hỗ trợ 6 ngôn ngữ: vi, en, zh, ko, ru, ja",                   STATUS_DONE),
    ("Auto-translate vi → 5 ngôn ngữ qua Google Translate",          STATUS_DONE),
    ("Nghe thử preview trước khi lưu (không ghi DB)",                STATUS_DONE),
    ("Upload thủ công file MP3/M4A/WAV",                              STATUS_DONE),
    ("Mỗi shop tối đa 1 audio/ngôn ngữ (upsert ghi đè)",            STATUS_DONE),
    ("Audio kích hoạt sau khi shop được admin duyệt",                STATUS_DONE),
])
add_bullet(doc,
    "PRD §7.5 nêu 'Audio được kích hoạt ngay sau khi tạo'. Thực tế: audio ở trạng thái "
    "pending cho đến khi shop được duyệt. Đây là quyết định thiết kế hợp lý nhằm đảm bảo "
    "chất lượng nội dung tổng thể.",
    bold_prefix="Lưu ý")

add_sub(doc, "2.7  Module Location – Phiên du lịch & Vị trí")
add_status_table(doc, ["Yêu cầu nghiệp vụ (PRD §8)", "Trạng thái"], [
    ("Tạo phiên ẩn danh không lưu PII (UUID ngẫu nhiên)",             STATUS_DONE),
    ("Phiên tự hết hạn sau 1 giờ (MongoDB TTL index)",                STATUS_DONE),
    ("Lưu ngôn ngữ ưu tiên, POI đã xem, audio đã phát theo phiên",  STATUS_DONE),
    ("Phiên dùng cho like/unlike POI",                                STATUS_DONE),
    ("Ghi nhận lượt ghé thăm (visitor_events) cho analytics",        STATUS_DONE),
    ("Đếm khách trực tuyến real-time qua WebSocket",                  STATUS_DONE),
    ("Heartbeat 30s; grace period 90s không heartbeat → xoá đếm",   STATUS_PART),
    ("Duy trì trạng thái GPS khi chuyển tab / quay lại",             STATUS_PART),
])
add_bullet(doc,
    "Heartbeat 30s và grace period 90s (PRD §8.4) chưa hoàn chỉnh. Khi tab chuyển nền, "
    "kết nối WebSocket có thể đứt và bộ đếm giảm sớm hơn quy định 90s.",
    bold_prefix="Lưu ý")

add_sub(doc, "2.8  Module Analytics – Phân tích lượt truy cập")
add_status_table(doc, ["Yêu cầu nghiệp vụ (PRD §9)", "Trạng thái"], [
    ("Ghi nhận lượt ghé thăm khi tạo phiên mới",                    STATUS_DONE),
    ("Không thu thập thông tin cá nhân",                              STATUS_DONE),
    ("Thống kê hôm nay theo từng giờ",                               STATUS_DONE),
    ("Thống kê 7 ngày qua theo từng ngày",                           STATUS_DONE),
    ("Thống kê 30 ngày qua theo từng ngày",                          STATUS_DONE),
    ("Thống kê 365 ngày qua theo từng tháng",                        STATUS_DONE),
    ("Số khách trực tuyến real-time trên admin dashboard",            STATUS_DONE),
    ("Chỉ Admin mới xem được báo cáo analytics",                     STATUS_DONE),
])

add_sub(doc, "2.9  Module Notification – Thông báo email")
add_status_table(doc, ["Yêu cầu nghiệp vụ (PRD §10)", "Trạng thái"], [
    ("Gửi mã xác thực email khi vendor đăng ký",                     STATUS_DONE),
    ("Gửi mã đặt lại mật khẩu kèm thời hạn",                        STATUS_DONE),
    ("Thông báo admin khi có vendor đăng ký mới",                    STATUS_DONE),
    ("Thông báo admin khi vendor nộp thông tin quán",                STATUS_DONE),
    ("Email xác nhận quán được duyệt (kèm ghi chú admin)",          STATUS_DONE),
    ("Email từ chối quán (kèm lý do)",                               STATUS_DONE),
    ("Email xác nhận POI được tạo thành công",                       STATUS_DONE),
    ("Email xác nhận vị trí POI được cập nhật",                     STATUS_DONE),
    ("Email HTML template chuyên nghiệp (Thymeleaf, có thương hiệu)", STATUS_DONE),
    ("Gửi bất đồng bộ (@Async), không block request",               STATUS_DONE),
])

add_sub(doc, "2.10  Module Search & Moderation")
add_status_table(doc, ["Yêu cầu nghiệp vụ (PRD §11-12)", "Trạng thái"], [
    ("Search – Tìm kiếm theo tên, mô tả, tag, đa ngôn ngữ",         STATUS_PLAN),
    ("Search – Chỉ hiển thị nội dung đã duyệt và đang hoạt động",   STATUS_PLAN),
    ("Moderation – Phát hiện tự động nội dung không phù hợp",        STATUS_PLAN),
    ("Moderation – Lưu lịch sử hành động kiểm duyệt",               STATUS_PLAN),
    ("Moderation – Báo cáo nội dung vi phạm từ người dùng",         STATUS_PLAN),
    ("Moderation – Thông báo admin khi có báo cáo vi phạm",          STATUS_PLAN),
])
add_bullet(doc,
    "PRD §11 và §12 đều ghi rõ trạng thái 'đang trong giai đoạn lên kế hoạch, chưa triển khai'. "
    "Hai module này nằm ngoài phạm vi MVP hiện tại.",
    bold_prefix="Lưu ý")
doc.add_paragraph()

# ══ III. HẠN CHẾ TỒN TẠI ════════════════════════════════════════════════════
section_divider(doc)
add_heading(doc, "III. HẠN CHẾ TỒN TẠI", level=1, color="8E44AD")
add_body(doc, (
    "Dưới đây là các hạn chế được xác định từ việc đối chiếu yêu cầu PRD với triển khai thực tế, "
    "phân loại theo mức độ ảnh hưởng đến nghiệp vụ."
))

add_sub(doc, "3.1  Hạn chế ảnh hưởng đến luồng nghiệp vụ chính", color="C0392B")
add_bullet(doc,
    "PRD §4.2 yêu cầu Bước 2 bắt buộc có ít nhất 1 audio trước khi chuyển bước. "
    "Hiện tại validation phía client chưa đủ chặt – vendor có thể bỏ qua audio và vẫn submit, "
    "dẫn đến shop được duyệt mà không có audio giới thiệu cho khách du lịch.",
    bold_prefix="Audio bắt buộc khi tạo POI (PRD §4.2)")
add_bullet(doc,
    "PRD §5.3 quy định khi vendor cập nhật thông tin quán, trạng thái phải tự động chuyển về "
    "'Chờ duyệt'. Endpoint cập nhật shop hiện tại chưa enforce quy tắc này, cho phép nội dung "
    "mới hiển thị công khai mà không qua kiểm duyệt lại.",
    bold_prefix="Re-review khi cập nhật shop (PRD §5.3)")
add_bullet(doc,
    "PRD §8.4 mô tả heartbeat 30s và grace period 90s để đếm visitor trực tuyến chính xác. "
    "WebSocket hiện chỉ đếm theo kết nối thực tế; khi tab nền làm đứt kết nối, số đếm giảm "
    "ngay thay vì chờ 90s, gây sai lệch thống kê trên admin dashboard.",
    bold_prefix="Heartbeat & grace period visitor (PRD §8.4)")
add_bullet(doc,
    "PRD §2.5 yêu cầu giới hạn 3 yêu cầu đặt lại mật khẩu/giờ theo địa chỉ IP. Triển khai "
    "hiện tại theo dõi theo tài khoản, không phân biệt IP, tạo nguy cơ email enumeration.",
    bold_prefix="Rate limiting forgot-password per IP (PRD §2.5)")

add_sub(doc, "3.2  Hạn chế về trải nghiệm người dùng", color="7D3C98")
add_bullet(doc,
    "Vendor chưa có trang self-service cập nhật thông tin cá nhân (tên, SĐT) sau khi đăng ký. "
    "Dữ liệu lưu đầy đủ nhưng giao diện edit profile chưa được xây dựng.",
    bold_prefix="Cập nhật hồ sơ vendor (PRD §3.3)")
add_bullet(doc,
    "Vendor không nhận thông báo real-time khi shop được duyệt/từ chối. PRD §10.3 yêu cầu "
    "thông báo 'ngay sau khi sự kiện xảy ra'. Hiện chỉ có email async, không có "
    "in-app notification hay cập nhật giao diện tự động.",
    bold_prefix="Thông báo real-time cho vendor (PRD §10.3)")
add_bullet(doc,
    "Khách du lịch không có tính năng tìm kiếm (PRD §11). Toàn bộ POI hiển thị trên bản đồ "
    "mà không có lọc theo loại ẩm thực, khoảng cách hay từ khoá.",
    bold_prefix="Tìm kiếm cho khách du lịch (PRD §11)")
add_bullet(doc,
    "Ảnh upload chưa được tối ưu hoá (nén, WebP) theo PRD §6.3. Ảnh gốc kích thước lớn "
    "ảnh hưởng tốc độ tải trên thiết bị di động của du khách.",
    bold_prefix="Tối ưu hoá ảnh (PRD §6.3)")

add_sub(doc, "3.3  Tính năng trong kế hoạch (ngoài phạm vi MVP)", color="5D6D7E")
add_bullet(doc, "Module Search (PRD §11): tìm kiếm đa ngôn ngữ – chưa triển khai.")
add_bullet(doc, "Module Moderation (PRD §12): kiểm duyệt tự động, audit log, báo cáo vi phạm – chưa triển khai.")
doc.add_paragraph()

# ══ IV. HƯỚNG PHÁT TRIỂN ════════════════════════════════════════════════════
section_divider(doc)
add_heading(doc, "IV. HƯỚNG PHÁT TRIỂN TIẾP THEO", level=1, color="1A5276")
add_body(doc, (
    "Các hướng phát triển được chia thành hai nhóm: (A) hoàn thiện yêu cầu PRD còn thiếu, "
    "và (B) mở rộng nền tảng vượt ngoài phạm vi PRD hiện tại."
))

add_sub(doc, "4.1  Hoàn thiện yêu cầu PRD còn thiếu (Ưu tiên cao)")
add_numbered(doc, [
    ("Enforce audio bắt buộc khi tạo POI (PRD §4.2)",
     "Thêm validation phía client và server: không cho phép submit nếu chưa có ít nhất 1 audio. "
     "Hiển thị cảnh báo rõ ràng tại Bước 2 khi vendor cố gắng bỏ qua."),
    ("Re-review khi vendor cập nhật shop (PRD §5.3)",
     "Khi vendor PUT /api/shop/{shopId}, tự động chuyển trạng thái về pending và thông báo admin. "
     "Frontend hiển thị badge 'Đang chờ duyệt lại' cho vendor."),
    ("Heartbeat 30s & grace period 90s cho visitor (PRD §8.4)",
     "Triển khai heartbeat WebSocket 30s từ phía client; server loại khỏi bộ đếm sau 90s không "
     "nhận heartbeat. Đảm bảo số khách trực tuyến chính xác như PRD mô tả."),
    ("Rate limiting forgot-password per IP (PRD §2.5)",
     "Thêm Redis-based IP rate limiter cho endpoint forgot-password: tối đa 3 yêu cầu/giờ/IP. "
     "Trả HTTP 429 với thông báo thân thiện khi vượt giới hạn."),
    ("Tối ưu hoá ảnh khi upload (PRD §6.3)",
     "Tích hợp thư viện nén ảnh phía backend: tự động resize và chuyển sang WebP trước khi "
     "đẩy lên R2, giảm ~60-80% dung lượng so với ảnh gốc."),
    ("Hoàn thiện edit profile cho vendor (PRD §3.3)",
     "Xây dựng trang /vendor/profile để vendor tự cập nhật họ tên và số điện thoại."),
])

add_sub(doc, "4.2  Triển khai module còn trong kế hoạch (Trung hạn)")
add_numbered(doc, [
    ("Module Search – Tìm kiếm đa ngôn ngữ (PRD §11)",
     "Full-text search: index tên shop, POI, tags, mô tả (vi + 5 ngôn ngữ) vào MySQL FULLTEXT "
     "hoặc Elasticsearch. Hỗ trợ tìm kiếm mờ, lọc theo loại ẩm thực và khoảng cách."),
    ("Module Moderation – Kiểm duyệt tự động (PRD §12)",
     "Tích hợp Google Cloud Vision API cho ảnh, Content Safety API cho văn bản. "
     "Lưu đầy đủ audit log hành động admin. Cho phép người dùng báo cáo nội dung vi phạm."),
    ("Thông báo real-time cho vendor",
     "Tích hợp Firebase Cloud Messaging (FCM): vendor nhận thông báo ngay khi shop được "
     "duyệt/từ chối mà không cần reload trang."),
])

add_sub(doc, "4.3  Mở rộng nền tảng vượt PRD hiện tại (Dài hạn)")
add_numbered(doc, [
    ("Vendor analytics dashboard",
     "Trang /vendor/analytics hiện là placeholder – triển khai: lượt xem POI, lượt phát audio "
     "theo ngôn ngữ, lượt like, biểu đồ xu hướng theo tuần/tháng."),
    ("Progressive Web App (PWA) & Audio offline",
     "Service Worker cache audio MP3 cho phép tourist nghe giới thiệu khi mất kết nối internet."),
    ("Hệ thống gợi ý (Recommendation)",
     "Dựa trên lịch sử viewedPoiIds và playedAudioIds trong phiên, gợi ý POI gần đó phù hợp "
     "sở thích ẩm thực bằng content-based filtering theo tags và cuisine_style."),
    ("Đánh giá & bình luận quán ăn",
     "Cho phép tourist để lại rating và nhận xét ngắn sau khi nghe audio; "
     "vendor và admin xem báo cáo tổng hợp."),
    ("Ứng dụng di động native",
     "React Native / Flutter để tận dụng background geofencing chính xác, "
     "GPS liên tục và push notification từ hệ điều hành."),
])
doc.add_paragraph()

# ══ V. TỔNG KẾT ═════════════════════════════════════════════════════════════
section_divider(doc)
add_heading(doc, "V. TỔNG KẾT", level=1, color="1E8449")
summary_data = [
    ("EBF5FB", "Mục tiêu sản phẩm",      "Nền tảng food-tourism kết nối vendor & khách du lịch qua audio đa ngôn ngữ, bản đồ & geofencing"),
    (GREEN,    "Hoàn thành đầy đủ ✔",    "~75% yêu cầu PRD – Auth, User, Audio TTS, Analytics, Notification, POI/Shop core workflow"),
    (YELLOW,   "Đáp ứng một phần ⚠",     "~17% – Luồng 4 bước tạo POI, heartbeat visitor, re-review shop, file optimization"),
    (RED,      "Chưa triển khai ✘",       "~8% – Tối ưu hoá ảnh, rate limit per IP, edit profile vendor"),
    (GRAY,     "Kế hoạch (ngoài MVP)",    "Module Search & Moderation (PRD §11, §12 đã ghi nhận chưa triển khai)"),
    ("FDF2E9", "Điểm mạnh nghiệp vụ",    "Quy trình duyệt nội dung hoàn chỉnh · Audio TTS 6 ngôn ngữ · Analytics real-time · Email đầy đủ"),
    ("FDF2E9", "Ưu tiên hoàn thiện ngay","Audio bắt buộc khi tạo POI · Re-review khi cập nhật shop · Heartbeat visitor · Rate limit IP"),
    ("FDF2E9", "Hướng mở rộng dài hạn",  "PWA offline · Recommendation · Mobile app · Search & Moderation · Vendor analytics"),
]
tbl_s = doc.add_table(rows=len(summary_data), cols=2)
tbl_s.style = "Table Grid"
for i, (bg, k, v) in enumerate(summary_data):
    set_cell_bg(tbl_s.rows[i].cells[0], bg)
    r0 = tbl_s.rows[i].cells[0].paragraphs[0].add_run(k); r0.bold=True; r0.font.size=Pt(11)
    r1 = tbl_s.rows[i].cells[1].paragraphs[0].add_run(v); r1.font.size=Pt(11)

doc.add_paragraph()
footer_p = doc.add_paragraph("FlavorTales – Đánh giá theo PRD v1.0 (07/04/2026)")
footer_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
for run in footer_p.runs:
    run.font.size = Pt(10)
    run.font.color.rgb = RGBColor(0xAA, 0xAA, 0xAA)
    run.font.italic = True

import os
out_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "project-evaluation.docx")
doc.save(out_path)
print(f"Saved: {out_path}")
