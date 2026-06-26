"""
generate_acceptance_criteria.py
Generates AcceptanceCriteria.docx — Acceptance Criteria (Given-When-Then)
for all 44 user stories across 9 modules of FlavorTales.
"""

from docx import Document
from docx.shared import Pt, RGBColor, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import copy

OUTPUT_FILE = r"d:\Codes\Seminar\Source Code\docs\prd\AcceptanceCriteria.docx"

# ─────────────────────────────────────────────────────────────────────────────
# COLORS
# ─────────────────────────────────────────────────────────────────────────────
COLOR_MODULE_BG   = RGBColor(68,  114, 196)
COLOR_WHITE       = RGBColor(255, 255, 255)
COLOR_AC_HEADING  = RGBColor(0,   112, 192)
COLOR_GWT_LABEL   = RGBColor(0,   112, 192)
COLOR_GIVEN       = RGBColor(0,   128, 0)
COLOR_WHEN        = RGBColor(255, 140, 0)
COLOR_THEN        = RGBColor(192, 0,   0)
COLOR_AND_WHEN    = RGBColor(255, 140, 0)
COLOR_AND_THEN    = RGBColor(128, 0,   128)
COLOR_BLACK       = RGBColor(0,   0,   0)

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS — low-level
# ─────────────────────────────────────────────────────────────────────────────
def set_cell_bg(cell, rgb: RGBColor):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    hex_color = f"{rgb[0]:02X}{rgb[1]:02X}{rgb[2]:02X}"
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def colored_run(para, keyword: str, color: RGBColor, bold: bool = True):
    run = para.add_run(keyword)
    run.bold = bold
    run.font.color.rgb = color
    return run


def plain_run(para, text: str, bold: bool = False, italic: bool = False):
    run = para.add_run(text)
    run.bold = bold
    run.italic = italic
    run.font.color.rgb = COLOR_BLACK
    return run


def set_para_font(para, size_pt=11, space_after=4):
    para.paragraph_format.space_after = Pt(space_after)
    for run in para.runs:
        run.font.size = Pt(size_pt)


def add_page_break(doc):
    doc.add_page_break()


# ─────────────────────────────────────────────────────────────────────────────
# HELPERS — structural
# ─────────────────────────────────────────────────────────────────────────────
def add_section_title(doc, text="6. Acceptance Criteria (Given-When-Then)"):
    """Top-level section heading."""
    para = doc.add_paragraph()
    run = para.add_run(text)
    run.bold = True
    run.font.size = Pt(16)
    para.paragraph_format.space_before = Pt(6)
    para.paragraph_format.space_after = Pt(12)


def add_module_header(doc, text: str):
    """Blue-background module header row."""
    table = doc.add_table(rows=1, cols=1)
    table.style = "Table Grid"
    cell = table.cell(0, 0)
    set_cell_bg(cell, COLOR_MODULE_BG)
    para = cell.paragraphs[0]
    para.alignment = WD_ALIGN_PARAGRAPH.LEFT
    run = para.add_run(text)
    run.bold = True
    run.font.color.rgb = COLOR_WHITE
    run.font.size = Pt(12)
    para.paragraph_format.space_before = Pt(2)
    para.paragraph_format.space_after = Pt(2)
    doc.add_paragraph()  # spacing


def add_ac_heading(doc, ac_num: str, title: str, us_num: str):
    """Teal bold AC heading: 'AC-NNN: Title (US-NNN)'"""
    para = doc.add_paragraph()
    run = para.add_run(f"{ac_num}: {title} ({us_num})")
    run.bold = True
    run.font.color.rgb = COLOR_AC_HEADING
    run.font.size = Pt(11)
    para.paragraph_format.space_before = Pt(8)
    para.paragraph_format.space_after = Pt(2)


def add_user_story_line(doc, story_text: str):
    """Bold label + italic story text."""
    para = doc.add_paragraph()
    label = para.add_run("Câu chuyện người dùng: ")
    label.bold = True
    label.font.size = Pt(11)
    label.font.color.rgb = COLOR_BLACK
    content = para.add_run(story_text)
    content.italic = True
    content.font.size = Pt(11)
    content.font.color.rgb = COLOR_BLACK
    para.paragraph_format.space_after = Pt(4)


def add_gwt_label(doc):
    """'Acceptance Criteria (Given-When-Then):' in teal bold."""
    para = doc.add_paragraph()
    run = para.add_run("Acceptance Criteria (Given-When-Then):")
    run.bold = True
    run.font.size = Pt(11)
    run.font.color.rgb = COLOR_GWT_LABEL
    para.paragraph_format.space_after = Pt(4)


def add_scenario(doc, scenario_num: int, steps: list):
    """
    steps = list of (keyword, text)
    keyword ∈ {"GIVEN", "WHEN", "AND_WHEN", "THEN", "AND_THEN"}
    """
    # Scenario label
    scenario_para = doc.add_paragraph()
    scenario_para.paragraph_format.left_indent = Inches(0.3)
    scenario_para.paragraph_format.space_after = Pt(2)
    label_run = scenario_para.add_run(f"Scenario {scenario_num}:")
    label_run.bold = True
    label_run.font.size = Pt(11)
    label_run.font.color.rgb = COLOR_BLACK

    COLOR_MAP = {
        "GIVEN":    ("GIVEN",    COLOR_GIVEN),
        "WHEN":     ("WHEN",     COLOR_WHEN),
        "AND_WHEN": ("AND",      COLOR_AND_WHEN),
        "THEN":     ("THEN",     COLOR_THEN),
        "AND_THEN": ("AND",      COLOR_AND_THEN),
    }

    for keyword, text in steps:
        kw_label, kw_color = COLOR_MAP[keyword]
        step_para = doc.add_paragraph()
        step_para.paragraph_format.left_indent = Inches(0.7)
        step_para.paragraph_format.space_after = Pt(1)
        colored_run(step_para, kw_label, kw_color, bold=True).font.size = Pt(11)
        plain_run(step_para, f" {text}", bold=False).font.size = Pt(11)

    doc.add_paragraph().paragraph_format.space_after = Pt(2)


def build_ac(doc, ac_num, us_num, title, story, scenarios):
    """Build one complete AC block."""
    add_ac_heading(doc, ac_num, title, us_num)
    add_user_story_line(doc, story)
    add_gwt_label(doc)
    for i, steps in enumerate(scenarios, start=1):
        add_scenario(doc, i, steps)


# ─────────────────────────────────────────────────────────────────────────────
# CONTENT DATA — 44 ACs
# ─────────────────────────────────────────────────────────────────────────────
def main():
    doc = Document()

    # Page margins
    for section in doc.sections:
        section.top_margin    = Inches(1)
        section.bottom_margin = Inches(1)
        section.left_margin   = Inches(1.2)
        section.right_margin  = Inches(1.2)

    add_section_title(doc)

    # ═══════════════════════════════════════════════════════════════════════
    # MODULE 1: Xác Thực & Phân Quyền — US-001 → US-007
    # ═══════════════════════════════════════════════════════════════════════
    add_module_header(doc, "Module 1: Xác Thực & Phân Quyền")

    build_ac(doc,
        ac_num="AC-001", us_num="US-001",
        title="Đăng Ký Tài Khoản Vendor",
        story="Là Vendor, tôi muốn đăng ký tài khoản bằng email và mật khẩu để có thể truy cập cổng quản lý vendor.",
        scenarios=[
            [   # Scenario 1 — happy path
                ("GIVEN",    "Tôi ở trang đăng ký vendor"),
                ("WHEN",     'Tôi nhập email hợp lệ chưa được đăng ký, mật khẩu đủ mạnh (≥8 ký tự, có chữ hoa, số)'),
                ("AND_WHEN", 'Tôi nhấn "Đăng Ký"'),
                ("THEN",     "Hệ thống tạo tài khoản mới với trạng thái chờ xác minh"),
                ("AND_THEN", "Hệ thống gửi email chứa mã OTP 6 chữ số đến địa chỉ email đã nhập"),
                ("AND_THEN", "Tôi được chuyển đến trang nhập mã xác minh"),
            ],
            [   # Scenario 2 — email đã tồn tại
                ("GIVEN",    "Tôi ở trang đăng ký vendor"),
                ("WHEN",     "Tôi nhập email đã được đăng ký trước đó"),
                ("AND_WHEN", 'Tôi nhấn "Đăng Ký"'),
                ("THEN",     "Hệ thống hiển thị thông báo lỗi rõ ràng: email đã được sử dụng"),
                ("AND_THEN", "Tài khoản mới không được tạo"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-002", us_num="US-002",
        title="Xác Minh Email Bằng OTP",
        story="Là Vendor, tôi muốn xác minh email bằng mã OTP 6 chữ số để tài khoản được kích hoạt.",
        scenarios=[
            [
                ("GIVEN",    "Tôi vừa đăng ký và đang ở trang nhập mã xác minh"),
                ("WHEN",     "Tôi nhập đúng mã OTP 6 chữ số được gửi đến email"),
                ("AND_WHEN", 'Tôi nhấn "Xác Minh"'),
                ("THEN",     "Hệ thống kích hoạt tài khoản và chuyển sang trạng thái active"),
                ("AND_THEN", "Tôi được chuyển đến trang đăng nhập với thông báo xác minh thành công"),
            ],
            [
                ("GIVEN",    "Tôi ở trang nhập mã xác minh"),
                ("WHEN",     "Tôi nhập sai mã OTP hoặc mã đã hết hạn"),
                ("THEN",     "Hệ thống hiển thị thông báo lỗi: mã không hợp lệ hoặc đã hết hạn"),
                ("AND_THEN", "Tài khoản không được kích hoạt, mã OTP cũ bị vô hiệu hóa"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-003", us_num="US-003",
        title="Gửi Lại Mã Xác Minh",
        story="Là Vendor, tôi muốn gửi lại mã xác minh để kích hoạt tài khoản khi mã cũ đã hết hạn.",
        scenarios=[
            [
                ("GIVEN",    "Tôi ở trang nhập mã xác minh và mã OTP của tôi đã hết hạn"),
                ("WHEN",     'Tôi nhấn "Gửi lại mã"'),
                ("THEN",     "Hệ thống tạo mã OTP mới và gửi đến email của tôi"),
                ("AND_THEN", "Thông báo xác nhận hiển thị: mã mới đã được gửi"),
                ("AND_THEN", "Mã OTP cũ bị vô hiệu hóa"),
            ],
            [
                ("GIVEN",    "Tôi ở trang nhập mã xác minh"),
                ("WHEN",     "Tôi nhấn 'Gửi lại mã' nhiều lần liên tiếp trong thời gian ngắn"),
                ("THEN",     "Hệ thống giới hạn số lần gửi lại và hiển thị thông báo yêu cầu chờ"),
                ("AND_THEN", "Mã OTP không được gửi thêm cho đến khi hết thời gian chờ"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-004", us_num="US-004",
        title="Đăng Nhập Tài Khoản",
        story="Là Vendor hoặc Admin, tôi muốn đăng nhập bằng email và mật khẩu để truy cập tài khoản của mình.",
        scenarios=[
            [
                ("GIVEN",    "Tôi ở trang đăng nhập"),
                ("WHEN",     'Tôi nhập email và mật khẩu hợp lệ của tài khoản đã được kích hoạt'),
                ("AND_WHEN", 'Tôi nhấn "Đăng Nhập"'),
                ("THEN",     "Hệ thống xác thực thông tin và tạo JWT token hợp lệ"),
                ("AND_THEN", "Tôi được chuyển hướng đến trang Dashboard tương ứng với vai trò"),
            ],
            [
                ("GIVEN",    "Tôi ở trang đăng nhập"),
                ("WHEN",     "Tôi nhập sai mật khẩu nhiều lần liên tiếp"),
                ("THEN",     "Hệ thống hiển thị thông báo lỗi và không tiết lộ trường nào sai"),
                ("AND_THEN", "Sau số lần thất bại nhất định, tài khoản bị tạm khóa và hiển thị thông báo"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-005", us_num="US-005",
        title="Đăng Xuất",
        story="Là Vendor hoặc Admin, tôi muốn đăng xuất để phiên làm việc bị hủy và cookie được xóa.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang đăng nhập vào hệ thống"),
                ("WHEN",     'Tôi nhấn nút "Đăng Xuất"'),
                ("THEN",     "Hệ thống hủy phiên làm việc và xóa cookie xác thực"),
                ("AND_THEN", "Tôi được chuyển đến trang đăng nhập"),
                ("AND_THEN", "Nếu tôi nhấn nút Back trên trình duyệt, tôi không thể truy cập lại trang yêu cầu đăng nhập"),
            ],
            [
                ("GIVEN",    "Tôi đã đăng xuất"),
                ("WHEN",     "Tôi cố truy cập trực tiếp một URL yêu cầu xác thực"),
                ("THEN",     "Hệ thống phát hiện cookie đã hết hạn và chuyển hướng tôi về trang đăng nhập"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-006", us_num="US-006",
        title="Yêu Cầu Đặt Lại Mật Khẩu",
        story="Là Vendor, tôi muốn yêu cầu liên kết đặt lại mật khẩu để lấy lại quyền truy cập tài khoản.",
        scenarios=[
            [
                ("GIVEN",    "Tôi ở trang quên mật khẩu"),
                ("WHEN",     "Tôi nhập địa chỉ email của tài khoản đã đăng ký"),
                ("AND_WHEN", 'Tôi nhấn "Gửi yêu cầu"'),
                ("THEN",     "Hệ thống gửi email chứa mã OTP đặt lại mật khẩu"),
                ("AND_THEN", "Thông báo xác nhận hiển thị: yêu cầu đã được gửi"),
            ],
            [
                ("GIVEN",    "Tôi ở trang quên mật khẩu"),
                ("WHEN",     "Tôi nhập địa chỉ email không tồn tại trong hệ thống"),
                ("THEN",     "Hệ thống vẫn hiển thị thông báo thành công để không tiết lộ email nào tồn tại"),
                ("AND_THEN", "Không có email nào được gửi đi"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-007", us_num="US-007",
        title="Đặt Lại Mật Khẩu Bằng OTP",
        story="Là Vendor, tôi muốn đặt lại mật khẩu bằng mã OTP để tạo mật khẩu mới mà không cần biết mật khẩu cũ.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đã nhận mã OTP đặt lại mật khẩu qua email"),
                ("WHEN",     "Tôi nhập đúng mã OTP và mật khẩu mới hợp lệ"),
                ("AND_WHEN", 'Tôi nhấn "Xác nhận"'),
                ("THEN",     "Hệ thống cập nhật mật khẩu thành công"),
                ("AND_THEN", "Tôi được chuyển đến trang đăng nhập với thông báo đặt lại thành công"),
                ("AND_THEN", "Mã OTP đã dùng bị vô hiệu hóa, không thể dùng lại"),
            ],
            [
                ("GIVEN",    "Tôi đang nhập mã OTP đặt lại mật khẩu"),
                ("WHEN",     "Tôi nhập mật khẩu mới không đủ điều kiện (quá ngắn, không có ký tự đặc biệt)"),
                ("THEN",     "Hệ thống hiển thị danh sách yêu cầu mật khẩu chưa đạt"),
                ("AND_THEN", "Mật khẩu không được cập nhật cho đến khi đáp ứng đủ điều kiện"),
            ],
        ],
    )

    add_page_break(doc)

    # ═══════════════════════════════════════════════════════════════════════
    # MODULE 2: Quản Lý Điểm Tham Quan (POI) — US-008 → US-019
    # ═══════════════════════════════════════════════════════════════════════
    add_module_header(doc, "Module 2: Quản Lý Điểm Tham Quan (POI)")

    build_ac(doc,
        ac_num="AC-008", us_num="US-008",
        title="Tạo POI Mới",
        story="Là Vendor, tôi muốn tạo POI kèm cửa hàng liên kết (tên, tọa độ, bán kính geofence, mô tả) để quán ăn của tôi xuất hiện trên bản đồ du khách.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang đăng nhập với vai trò Vendor và ở trang tạo POI"),
                ("WHEN",     "Tôi điền đầy đủ thông tin: tên POI, tọa độ (lat/lng hợp lệ), bán kính geofence, mô tả"),
                ("AND_WHEN", 'Tôi nhấn "Tạo POI"'),
                ("THEN",     "Hệ thống lưu POI mới với trạng thái 'pending' (chờ duyệt)"),
                ("AND_THEN", "POI mới xuất hiện trong danh sách POI của tôi với nhãn 'Đang chờ duyệt'"),
                ("AND_THEN", "POI chưa hiển thị trên bản đồ công khai"),
            ],
            [
                ("GIVEN",    "Tôi đang ở trang tạo POI"),
                ("WHEN",     "Tôi để trống tên POI hoặc nhập tọa độ ngoài phạm vi hợp lệ"),
                ("AND_WHEN", 'Tôi nhấn "Tạo POI"'),
                ("THEN",     "Hệ thống hiển thị thông báo lỗi cho từng trường không hợp lệ"),
                ("AND_THEN", "POI không được tạo"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-009", us_num="US-009",
        title="Xem Danh Sách POI Của Vendor",
        story="Là Vendor, tôi muốn xem danh sách tất cả POI tôi đã tạo để quản lý các địa điểm đã đăng ký.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang đăng nhập với vai trò Vendor và đã tạo ít nhất một POI"),
                ("WHEN",     "Tôi truy cập trang quản lý POI"),
                ("THEN",     "Hệ thống hiển thị danh sách tất cả POI thuộc tài khoản của tôi"),
                ("AND_THEN", "Mỗi POI hiển thị: tên, trạng thái (pending/active/rejected) và ngày tạo"),
            ],
            [
                ("GIVEN",    "Tôi đang đăng nhập với vai trò Vendor và chưa tạo POI nào"),
                ("WHEN",     "Tôi truy cập trang quản lý POI"),
                ("THEN",     "Hệ thống hiển thị màn hình trống với hướng dẫn tạo POI đầu tiên"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-010", us_num="US-010",
        title="Chỉnh Sửa Thông Tin POI",
        story="Là Vendor, tôi muốn chỉnh sửa thông tin POI để cập nhật hoặc sửa lỗi chi tiết địa điểm.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang xem POI của mình trong danh sách"),
                ("WHEN",     "Tôi mở trang chỉnh sửa, cập nhật tên và nhấn Lưu"),
                ("THEN",     "Hệ thống cập nhật thông tin POI thành công"),
                ("AND_THEN", "Nếu POI đang ở trạng thái active, trạng thái được đặt lại về pending để chờ duyệt lại"),
            ],
            [
                ("GIVEN",    "Tôi đang chỉnh sửa POI"),
                ("WHEN",     "Tôi xóa trắng trường bắt buộc (ví dụ: tên POI) và nhấn Lưu"),
                ("THEN",     "Hệ thống hiển thị lỗi validation và không lưu thay đổi"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-011", us_num="US-011",
        title="Xóa Mềm POI",
        story="Là Vendor, tôi muốn xóa mềm POI để ẩn nó khỏi bản đồ mà không mất dữ liệu.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang xem danh sách POI của mình"),
                ("WHEN",     "Tôi chọn POI và xác nhận hành động xóa"),
                ("THEN",     "Hệ thống đặt trạng thái POI thành 'deleted'"),
                ("AND_THEN", "POI biến mất khỏi bản đồ công khai"),
                ("AND_THEN", "Dữ liệu POI vẫn được lưu trong cơ sở dữ liệu, không bị xóa vĩnh viễn"),
            ],
            [
                ("GIVEN",    "Tôi vừa nhấn xóa POI"),
                ("WHEN",     "Hộp thoại xác nhận xuất hiện và tôi nhấn Hủy"),
                ("THEN",     "Hệ thống không thực hiện thay đổi nào"),
                ("AND_THEN", "POI vẫn giữ nguyên trạng thái ban đầu"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-012", us_num="US-012",
        title="Tourist Xem POI Trên Bản Đồ",
        story="Là Tourist, tôi muốn xem tất cả POI đang active trên bản đồ tương tác để khám phá các quán ăn lân cận.",
        scenarios=[
            [
                ("GIVEN",    "Tôi là tourist và đang mở trang bản đồ FlavorTales"),
                ("WHEN",     "Trang bản đồ tải xong"),
                ("THEN",     "Tất cả POI có trạng thái active được hiển thị dưới dạng marker trên bản đồ"),
                ("AND_THEN", "Tôi có thể phóng to, thu nhỏ và di chuyển bản đồ để khám phá"),
            ],
            [
                ("GIVEN",    "Tôi đang xem bản đồ FlavorTales"),
                ("WHEN",     "Không có POI nào ở khu vực hiện tại của bản đồ"),
                ("THEN",     "Bản đồ hiển thị trống với hướng dẫn di chuyển hoặc thu nhỏ để tìm POI"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-013", us_num="US-013",
        title="Tourist Like / Unlike POI",
        story="Là Tourist, tôi muốn like hoặc unlike một POI để đánh dấu địa điểm thú vị trong phiên hiện tại.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang xem chi tiết một POI chưa được like"),
                ("WHEN",     "Tôi nhấn nút Like"),
                ("THEN",     "Hệ thống ghi nhận lượt like, icon Like đổi sang trạng thái active"),
                ("AND_THEN", "Số lượt like của POI tăng lên 1"),
            ],
            [
                ("GIVEN",    "Tôi đã like một POI"),
                ("WHEN",     "Tôi nhấn nút Like lần nữa (unlike)"),
                ("THEN",     "Hệ thống hủy lượt like, icon Like trở về trạng thái bình thường"),
                ("AND_THEN", "Số lượt like của POI giảm xuống 1"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-014", us_num="US-014",
        title="Tourist Xem Chi Tiết POI Theo Ngôn Ngữ",
        story="Là Tourist, tôi muốn xem chi tiết POI bằng ngôn ngữ ưa thích để hiểu thông tin địa điểm.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang xem bản đồ và đã chọn ngôn ngữ tiếng Anh"),
                ("WHEN",     "Tôi nhấn vào một POI trên bản đồ"),
                ("THEN",     "Hệ thống hiển thị thông tin chi tiết POI bằng tiếng Anh"),
                ("AND_THEN", "Các thông tin bao gồm: tên, mô tả và tên cửa hàng liên kết"),
            ],
            [
                ("GIVEN",    "Tôi đang xem chi tiết một POI"),
                ("WHEN",     "Nội dung POI chưa có bản dịch sang ngôn ngữ tôi đã chọn"),
                ("THEN",     "Hệ thống hiển thị nội dung bằng ngôn ngữ mặc định (tiếng Việt) kèm thông báo chưa có bản dịch"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-015", us_num="US-015",
        title="Admin Xem Danh Sách POI Chờ Duyệt",
        story="Là Admin, tôi muốn xem tất cả POI đang chờ duyệt để xử lý hàng đợi kiểm duyệt.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang đăng nhập với vai trò Admin"),
                ("WHEN",     "Tôi truy cập trang quản lý POI và chọn bộ lọc 'Chờ duyệt'"),
                ("THEN",     "Hệ thống hiển thị danh sách tất cả POI có trạng thái pending"),
                ("AND_THEN", "Mỗi POI hiển thị: tên, tên vendor, ngày tạo và nút Duyệt / Từ chối"),
            ],
            [
                ("GIVEN",    "Tôi đang đăng nhập với vai trò Admin"),
                ("WHEN",     "Không có POI nào đang chờ duyệt"),
                ("THEN",     "Hệ thống hiển thị thông báo: hàng đợi trống, không có POI cần duyệt"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-016", us_num="US-016",
        title="Admin Duyệt POI",
        story="Là Admin, tôi muốn duyệt một POI để nó hiển thị với du khách trên bản đồ.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang xem danh sách POI chờ duyệt"),
                ("WHEN",     "Tôi nhấn nút Duyệt trên một POI"),
                ("THEN",     "Hệ thống cập nhật trạng thái POI thành 'active'"),
                ("AND_THEN", "POI xuất hiện trên bản đồ công khai ngay lập tức"),
                ("AND_THEN", "Vendor nhận thông báo: POI đã được duyệt"),
            ],
            [
                ("GIVEN",    "Tôi đang duyệt một POI"),
                ("WHEN",     "Hệ thống gặp lỗi khi cập nhật trạng thái"),
                ("THEN",     "Hệ thống hiển thị thông báo lỗi và giữ nguyên trạng thái pending của POI"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-017", us_num="US-017",
        title="Admin Từ Chối POI",
        story="Là Admin, tôi muốn từ chối một POI kèm lý do để vendor biết cần sửa gì.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang xem danh sách POI chờ duyệt"),
                ("WHEN",     "Tôi nhấn Từ chối, nhập lý do từ chối và xác nhận"),
                ("THEN",     "Hệ thống cập nhật trạng thái POI thành 'rejected'"),
                ("AND_THEN", "Vendor nhận thông báo từ chối kèm lý do đã nhập"),
                ("AND_THEN", "POI không hiển thị trên bản đồ công khai"),
            ],
            [
                ("GIVEN",    "Tôi đang từ chối một POI"),
                ("WHEN",     "Tôi nhấn Từ chối nhưng bỏ trống trường lý do"),
                ("THEN",     "Hệ thống yêu cầu nhập lý do trước khi xác nhận từ chối"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-018", us_num="US-018",
        title="Admin Xem POI Trên Bản Đồ",
        story="Là Admin, tôi muốn xem tất cả POI trên bản đồ để trực quan hóa phân bố địa lý của chúng.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang đăng nhập với vai trò Admin và truy cập trang bản đồ quản trị"),
                ("WHEN",     "Bản đồ tải xong"),
                ("THEN",     "Tất cả POI (bao gồm pending, active, rejected) hiển thị trên bản đồ với màu sắc phân biệt trạng thái"),
                ("AND_THEN", "Tôi có thể nhấn vào marker để xem chi tiết và thực hiện hành động duyệt/từ chối"),
            ],
            [
                ("GIVEN",    "Tôi đang xem bản đồ quản trị"),
                ("WHEN",     "Tôi áp dụng bộ lọc chỉ xem POI pending"),
                ("THEN",     "Chỉ các POI pending hiển thị trên bản đồ, các loại khác bị ẩn"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-019", us_num="US-019",
        title="Admin Xem POI Dạng Danh Sách",
        story="Là Admin, tôi muốn xem POI dưới dạng danh sách để duyệt và tìm kiếm nhanh.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang ở trang quản lý POI dạng danh sách"),
                ("WHEN",     "Tôi nhập từ khóa vào ô tìm kiếm"),
                ("THEN",     "Hệ thống lọc và hiển thị các POI có tên khớp với từ khóa"),
                ("AND_THEN", "Kết quả cập nhật theo thời gian thực khi tôi gõ"),
            ],
            [
                ("GIVEN",    "Tôi đang xem danh sách POI"),
                ("WHEN",     "Tôi tìm kiếm từ khóa không khớp với POI nào"),
                ("THEN",     "Hệ thống hiển thị thông báo: không tìm thấy kết quả phù hợp"),
            ],
        ],
    )

    add_page_break(doc)

    # ═══════════════════════════════════════════════════════════════════════
    # MODULE 3: Quản Lý Cửa Hàng — US-020 → US-027
    # ═══════════════════════════════════════════════════════════════════════
    add_module_header(doc, "Module 3: Quản Lý Cửa Hàng")

    build_ac(doc,
        ac_num="AC-020", us_num="US-020",
        title="Tạo Hồ Sơ Cửa Hàng",
        story="Là Vendor, tôi muốn tạo hồ sơ cửa hàng (phong cách ẩm thực, giờ mở cửa, thẻ tag) để du khách có thể tìm hiểu về quán của mình.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang đăng nhập với vai trò Vendor và đã có POI được duyệt"),
                ("WHEN",     "Tôi điền đầy đủ thông tin cửa hàng và nhấn Tạo"),
                ("THEN",     "Hệ thống tạo hồ sơ cửa hàng với trạng thái 'pending'"),
                ("AND_THEN", "Cửa hàng xuất hiện trong danh sách quản lý với nhãn 'Đang chờ duyệt'"),
            ],
            [
                ("GIVEN",    "Tôi đang tạo hồ sơ cửa hàng"),
                ("WHEN",     "Tôi bỏ trống tên cửa hàng và nhấn Tạo"),
                ("THEN",     "Hệ thống hiển thị lỗi validation: tên cửa hàng là bắt buộc"),
                ("AND_THEN", "Hồ sơ không được tạo"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-021", us_num="US-021",
        title="Xem Danh Sách Cửa Hàng Của Vendor",
        story="Là Vendor, tôi muốn xem danh sách tất cả cửa hàng của mình để quản lý hồ sơ các quán ăn.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang đăng nhập với vai trò Vendor và đã tạo ít nhất một cửa hàng"),
                ("WHEN",     "Tôi truy cập trang quản lý cửa hàng"),
                ("THEN",     "Hệ thống hiển thị danh sách tất cả cửa hàng của tôi kèm trạng thái"),
            ],
            [
                ("GIVEN",    "Tôi đang đăng nhập với vai trò Vendor và chưa tạo cửa hàng nào"),
                ("WHEN",     "Tôi truy cập trang quản lý cửa hàng"),
                ("THEN",     "Hệ thống hiển thị màn hình trống với hướng dẫn tạo cửa hàng đầu tiên"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-022", us_num="US-022",
        title="Chỉnh Sửa Thông Tin Cửa Hàng",
        story="Là Vendor, tôi muốn chỉnh sửa thông tin cửa hàng để giữ thông tin quán luôn cập nhật.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang xem trang chỉnh sửa cửa hàng active của mình"),
                ("WHEN",     "Tôi cập nhật giờ mở cửa và nhấn Lưu"),
                ("THEN",     "Hệ thống lưu thay đổi thành công"),
                ("AND_THEN", "Trạng thái cửa hàng trở về 'pending' để chờ Admin duyệt lại"),
            ],
            [
                ("GIVEN",    "Tôi đang chỉnh sửa thông tin cửa hàng"),
                ("WHEN",     "Tôi nhập giờ mở cửa sai định dạng và nhấn Lưu"),
                ("THEN",     "Hệ thống hiển thị lỗi định dạng và không lưu thay đổi"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-023", us_num="US-023",
        title="Upload Ảnh Gallery Cửa Hàng",
        story="Là Vendor, tôi muốn upload nhiều ảnh gallery với thứ tự sắp xếp để du khách xem hình ảnh các món ăn.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang chỉnh sửa cửa hàng và ở phần gallery"),
                ("WHEN",     "Tôi chọn các file ảnh JPEG/PNG ≤5MB và nhấn Upload"),
                ("THEN",     "Hệ thống upload ảnh lên Cloudflare R2 thành công"),
                ("AND_THEN", "Ảnh xuất hiện trong gallery với thứ tự tôi đã sắp xếp"),
            ],
            [
                ("GIVEN",    "Tôi đang upload ảnh gallery"),
                ("WHEN",     "Tôi chọn file ảnh có kích thước vượt quá 5MB"),
                ("THEN",     "Hệ thống từ chối upload và hiển thị thông báo: kích thước ảnh vượt giới hạn 5MB"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-024", us_num="US-024",
        title="Tourist Xem Chi Tiết Cửa Hàng Theo Ngôn Ngữ",
        story="Là Tourist, tôi muốn xem chi tiết cửa hàng bằng ngôn ngữ ưa thích để hiểu menu và mô tả.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang xem bản đồ và đã chọn ngôn ngữ tiếng Hàn"),
                ("WHEN",     "Tôi nhấn vào POI và chọn xem chi tiết cửa hàng"),
                ("THEN",     "Hệ thống hiển thị thông tin cửa hàng: tên, mô tả, giờ mở cửa bằng tiếng Hàn"),
            ],
            [
                ("GIVEN",    "Tôi đang xem chi tiết cửa hàng"),
                ("WHEN",     "Cửa hàng chưa có bản dịch tiếng Hàn"),
                ("THEN",     "Hệ thống hiển thị nội dung tiếng Việt kèm thông báo: chưa có bản dịch sang ngôn ngữ này"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-025", us_num="US-025",
        title="Admin Xem Cửa Hàng Chờ Duyệt",
        story="Là Admin, tôi muốn xem tất cả cửa hàng đang chờ duyệt để kiểm duyệt trước khi công khai.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang đăng nhập với vai trò Admin"),
                ("WHEN",     "Tôi truy cập trang quản lý cửa hàng và chọn bộ lọc 'Chờ duyệt'"),
                ("THEN",     "Hệ thống hiển thị danh sách tất cả cửa hàng pending"),
                ("AND_THEN", "Mỗi cửa hàng hiển thị: tên, tên vendor, ngày tạo và các nút thao tác"),
            ],
            [
                ("GIVEN",    "Tôi đang ở trang quản lý cửa hàng"),
                ("WHEN",     "Không có cửa hàng nào chờ duyệt"),
                ("THEN",     "Hệ thống hiển thị thông báo: hàng đợi trống"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-026", us_num="US-026",
        title="Admin Duyệt Cửa Hàng",
        story="Là Admin, tôi muốn duyệt một cửa hàng để nó hiển thị với du khách.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang xem danh sách cửa hàng chờ duyệt"),
                ("WHEN",     "Tôi nhấn nút Duyệt trên một cửa hàng"),
                ("THEN",     "Hệ thống cập nhật trạng thái cửa hàng thành 'active'"),
                ("AND_THEN", "Cửa hàng hiển thị công khai cho du khách"),
                ("AND_THEN", "Vendor nhận thông báo: cửa hàng đã được duyệt"),
            ],
            [
                ("GIVEN",    "Tôi đang duyệt cửa hàng"),
                ("WHEN",     "Hệ thống gặp lỗi khi cập nhật"),
                ("THEN",     "Hệ thống hiển thị thông báo lỗi, trạng thái cửa hàng không thay đổi"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-027", us_num="US-027",
        title="Admin Từ Chối Cửa Hàng",
        story="Là Admin, tôi muốn từ chối một cửa hàng kèm lý do để vendor thực hiện chỉnh sửa cần thiết.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang xem danh sách cửa hàng chờ duyệt"),
                ("WHEN",     "Tôi nhấn Từ chối, nhập lý do và xác nhận"),
                ("THEN",     "Hệ thống cập nhật trạng thái cửa hàng thành 'rejected'"),
                ("AND_THEN", "Vendor nhận thông báo kèm lý do từ chối"),
            ],
            [
                ("GIVEN",    "Tôi đang từ chối cửa hàng"),
                ("WHEN",     "Tôi để trống trường lý do từ chối"),
                ("THEN",     "Hệ thống yêu cầu nhập lý do, không cho phép xác nhận từ chối"),
            ],
        ],
    )

    add_page_break(doc)

    # ═══════════════════════════════════════════════════════════════════════
    # MODULE 4: Quản Lý Thực Đơn — US-028 → US-029
    # ═══════════════════════════════════════════════════════════════════════
    add_module_header(doc, "Module 4: Quản Lý Thực Đơn")

    build_ac(doc,
        ac_num="AC-028", us_num="US-028",
        title="Thêm Món Ăn Vào Thực Đơn",
        story="Là Vendor, tôi muốn thêm món ăn (tên, giá, ảnh) vào cửa hàng để du khách có thể xem thực đơn.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang quản lý cửa hàng đã active của mình"),
                ("WHEN",     "Tôi nhập tên món, giá hợp lệ, tải ảnh và nhấn Thêm"),
                ("THEN",     "Hệ thống lưu món ăn mới vào thực đơn của cửa hàng"),
                ("AND_THEN", "Món ăn xuất hiện trong danh sách thực đơn và hiển thị với du khách"),
            ],
            [
                ("GIVEN",    "Tôi đang thêm món ăn"),
                ("WHEN",     "Tôi bỏ trống tên món hoặc nhập giá âm"),
                ("THEN",     "Hệ thống hiển thị thông báo lỗi cho từng trường không hợp lệ"),
                ("AND_THEN", "Món ăn không được thêm vào thực đơn"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-029", us_num="US-029",
        title="Chỉnh Sửa / Xóa Món Ăn",
        story="Là Vendor, tôi muốn chỉnh sửa hoặc xóa món ăn để thực đơn luôn được cập nhật.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang xem thực đơn và có ít nhất một món ăn"),
                ("WHEN",     "Tôi cập nhật giá món ăn và nhấn Lưu"),
                ("THEN",     "Hệ thống cập nhật giá mới thành công"),
                ("AND_THEN", "Du khách thấy giá mới ngay lập tức"),
            ],
            [
                ("GIVEN",    "Tôi đang xem thực đơn"),
                ("WHEN",     "Tôi xác nhận xóa một món ăn"),
                ("THEN",     "Hệ thống xóa món ăn khỏi thực đơn"),
                ("AND_THEN", "Món ăn không còn hiển thị với du khách"),
            ],
        ],
    )

    add_page_break(doc)

    # ═══════════════════════════════════════════════════════════════════════
    # MODULE 5: Thuyết Minh Âm Thanh — US-030 → US-035
    # ═══════════════════════════════════════════════════════════════════════
    add_module_header(doc, "Module 5: Thuyết Minh Âm Thanh")

    build_ac(doc,
        ac_num="AC-030", us_num="US-030",
        title="Tạo Audio TTS Tiếng Việt",
        story="Là Vendor, tôi muốn tạo audio thuyết minh TTS bằng tiếng Việt từ văn bản mô tả để có lời thuyết minh cho quán.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang quản lý POI của mình và ở trang tạo audio"),
                ("WHEN",     "Tôi nhập văn bản mô tả bằng tiếng Việt và chọn tạo TTS"),
                ("THEN",     "Hệ thống chuyển đổi văn bản thành file audio tiếng Việt"),
                ("AND_THEN", "File audio được lưu và liên kết với POI"),
            ],
            [
                ("GIVEN",    "Tôi đang tạo audio TTS"),
                ("WHEN",     "Tôi nhập văn bản rỗng"),
                ("THEN",     "Hệ thống hiển thị lỗi: văn bản là bắt buộc, không tạo audio"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-031", us_num="US-031",
        title="Tạo Audio TTS Đa Ngôn Ngữ",
        story="Là Vendor, tôi muốn tự động tạo audio TTS cho tất cả ngôn ngữ hỗ trợ (vi/en/zh/ko/ja) cùng lúc để tiếp cận du khách quốc tế.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đã nhập văn bản mô tả cho POI"),
                ("WHEN",     "Tôi chọn tạo TTS cho tất cả ngôn ngữ và xác nhận"),
                ("THEN",     "Hệ thống tạo đồng thời 5 file audio: vi, en, zh, ko, ja"),
                ("AND_THEN", "Tất cả file được lưu và liên kết với POI"),
                ("AND_THEN", "Trạng thái tạo audio hiển thị hoàn thành cho từng ngôn ngữ"),
            ],
            [
                ("GIVEN",    "Hệ thống đang tạo audio đa ngôn ngữ"),
                ("WHEN",     "Một ngôn ngữ (ví dụ: jaJ Nhật Bản) gặp lỗi TTS"),
                ("THEN",     "Các ngôn ngữ còn lại vẫn được tạo thành công"),
                ("AND_THEN", "Hệ thống hiển thị cảnh báo riêng cho ngôn ngữ bị lỗi"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-032", us_num="US-032",
        title="Nghe Thử Audio TTS",
        story="Là Vendor, tôi muốn nghe thử audio TTS trước khi lưu để kiểm tra chất lượng trước khi xuất bản.",
        scenarios=[
            [
                ("GIVEN",    "Hệ thống vừa tạo xong audio TTS từ văn bản của tôi"),
                ("WHEN",     "Tôi nhấn nút Nghe thử"),
                ("THEN",     "File audio phát trực tiếp trên trình duyệt mà không cần tải xuống"),
                ("AND_THEN", "Tôi có thể dừng, phát lại hoặc quyết định Lưu / Tạo lại"),
            ],
            [
                ("GIVEN",    "Tôi đang nghe thử audio"),
                ("WHEN",     "Tôi nhận thấy chất lượng chưa đạt và nhấn 'Tạo lại' với văn bản chỉnh sửa"),
                ("THEN",     "Hệ thống tạo file audio mới từ văn bản đã chỉnh sửa"),
                ("AND_THEN", "File audio cũ bị thay thế bởi file mới"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-033", us_num="US-033",
        title="Upload File Audio Tùy Chỉnh",
        story="Là Vendor, tôi muốn upload file audio tự thu âm để dùng lời thuyết minh tùy chỉnh thay vì TTS.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang quản lý audio cho POI của mình"),
                ("WHEN",     "Tôi chọn tab Upload audio và tải lên file MP3/WAV hợp lệ"),
                ("THEN",     "Hệ thống upload file audio lên Cloudflare R2"),
                ("AND_THEN", "File audio tùy chỉnh được liên kết với POI và ưu tiên hơn TTS"),
            ],
            [
                ("GIVEN",    "Tôi đang upload audio tùy chỉnh"),
                ("WHEN",     "Tôi chọn file không phải định dạng âm thanh (ví dụ: PDF)"),
                ("THEN",     "Hệ thống từ chối và hiển thị thông báo: chỉ chấp nhận file MP3, WAV, OGG"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-034", us_num="US-034",
        title="Audio Tự Phát Khi Vào Geofence",
        story="Là Tourist, tôi muốn audio thuyết minh tự động phát khi tôi vào vùng geofence của POI để nhận thuyết minh mà không cần thao tác thủ công.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang dùng bản đồ FlavorTales với quyền định vị đã được cấp"),
                ("WHEN",     "Vị trí của tôi nằm trong vùng geofence của một POI active có audio"),
                ("THEN",     "Hệ thống tự động phát audio thuyết minh bằng ngôn ngữ tôi đã chọn"),
                ("AND_THEN", "Thông báo nổi xuất hiện cho biết tôi đang nghe thuyết minh của POI nào"),
            ],
            [
                ("GIVEN",    "Tôi đang trong vùng geofence của một POI"),
                ("WHEN",     "POI đó không có audio thuyết minh"),
                ("THEN",     "Hệ thống không phát âm thanh nào"),
                ("AND_THEN", "Thông tin văn bản của POI vẫn hiển thị như bình thường"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-035", us_num="US-035",
        title="Nghe Audio Theo Ngôn Ngữ Đã Chọn",
        story="Là Tourist, tôi muốn nghe audio thuyết minh bằng ngôn ngữ tôi đã chọn để hiểu câu chuyện về quán ăn.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đã chọn ngôn ngữ tiếng Nhật trong cài đặt"),
                ("WHEN",     "Tôi vào vùng geofence của POI có audio tiếng Nhật"),
                ("THEN",     "Audio thuyết minh tiếng Nhật tự động phát"),
            ],
            [
                ("GIVEN",    "Tôi đã chọn ngôn ngữ tiếng Nhật"),
                ("WHEN",     "POI chỉ có audio tiếng Việt, không có tiếng Nhật"),
                ("THEN",     "Hệ thống phát audio tiếng Việt (ngôn ngữ mặc định) như phương án dự phòng"),
                ("AND_THEN", "Thông báo nhỏ hiển thị: đang phát bằng ngôn ngữ mặc định"),
            ],
        ],
    )

    add_page_break(doc)

    # ═══════════════════════════════════════════════════════════════════════
    # MODULE 6: Quản Lý Tệp & Hình Ảnh — US-036
    # ═══════════════════════════════════════════════════════════════════════
    add_module_header(doc, "Module 6: Quản Lý Tệp & Hình Ảnh")

    build_ac(doc,
        ac_num="AC-036", us_num="US-036",
        title="Upload Ảnh Lên Hệ Thống",
        story="Là Vendor, tôi muốn upload ảnh JPEG/PNG (tối đa 5 MB mỗi ảnh) lên Cloudflare R2 để cửa hàng và POI có nội dung hình ảnh.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang chỉnh sửa POI hoặc cửa hàng"),
                ("WHEN",     "Tôi chọn file ảnh JPEG/PNG ≤5MB và nhấn Upload"),
                ("THEN",     "Hệ thống upload ảnh lên Cloudflare R2 thành công"),
                ("AND_THEN", "URL ảnh được trả về và hiển thị preview ngay trong trang chỉnh sửa"),
            ],
            [
                ("GIVEN",    "Tôi đang upload ảnh"),
                ("WHEN",     "Tôi chọn file ảnh có kích thước 6MB hoặc định dạng không hợp lệ (GIF, BMP)"),
                ("THEN",     "Hệ thống từ chối upload và hiển thị lỗi: chỉ chấp nhận JPEG/PNG ≤5MB"),
            ],
        ],
    )

    add_page_break(doc)

    # ═══════════════════════════════════════════════════════════════════════
    # MODULE 7: Vị Trí & Phiên Du Khách — US-037 → US-039
    # ═══════════════════════════════════════════════════════════════════════
    add_module_header(doc, "Module 7: Vị Trí & Phiên Du Khách")

    build_ac(doc,
        ac_num="AC-037", us_num="US-037",
        title="Tạo Phiên Ẩn Danh Tự Động",
        story="Là Tourist, tôi muốn một phiên ẩn danh được tạo tự động khi mở bản đồ để sử dụng ứng dụng mà không cần tài khoản.",
        scenarios=[
            [
                ("GIVEN",    "Tôi là khách chưa đăng nhập và truy cập bản đồ FlavorTales lần đầu"),
                ("WHEN",     "Trang bản đồ tải xong"),
                ("THEN",     "Hệ thống tự động tạo phiên ẩn danh cho tôi"),
                ("AND_THEN", "Tôi có thể xem bản đồ, POI và sử dụng các tính năng du khách mà không cần đăng ký"),
            ],
            [
                ("GIVEN",    "Tôi đã có phiên ẩn danh từ lần truy cập trước"),
                ("WHEN",     "Tôi mở lại bản đồ trong cùng trình duyệt trong cùng phiên"),
                ("THEN",     "Hệ thống nhận ra phiên cũ còn hiệu lực và không tạo phiên mới"),
                ("AND_THEN", "Cài đặt ngôn ngữ từ phiên cũ được giữ nguyên"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-038", us_num="US-038",
        title="Chọn Ngôn Ngữ Ưa Thích",
        story="Là Tourist, tôi muốn chọn ngôn ngữ nghe audio ưa thích để ứng dụng ghi nhớ lựa chọn trong suốt phiên.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang xem bản đồ FlavorTales"),
                ("WHEN",     "Tôi mở cài đặt ngôn ngữ và chọn tiếng Hàn (ko)"),
                ("THEN",     "Hệ thống lưu lựa chọn ngôn ngữ vào phiên của tôi"),
                ("AND_THEN", "Tất cả nội dung văn bản và audio tiếp theo được phục vụ bằng tiếng Hàn"),
            ],
            [
                ("GIVEN",    "Tôi đã chọn tiếng Hàn trong phiên hiện tại"),
                ("WHEN",     "Tôi tải lại trang (F5) trong cùng phiên"),
                ("THEN",     "Hệ thống ghi nhớ lựa chọn tiếng Hàn, không yêu cầu chọn lại"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-039", us_num="US-039",
        title="Phiên Tự Động Hết Hạn Sau 24 Giờ",
        story="Là Tourist, tôi muốn phiên làm việc tự động hết hạn sau 24 giờ để hệ thống dọn dẹp dữ liệu du khách không còn hoạt động.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đã tạo phiên ẩn danh và không truy cập ứng dụng trong 24 giờ"),
                ("WHEN",     "Hệ thống chạy tiến trình dọn dẹp định kỳ"),
                ("THEN",     "Phiên của tôi bị đóng và xóa khỏi hệ thống"),
                ("AND_THEN", "Khi tôi quay lại, hệ thống tạo phiên mới và yêu cầu chọn ngôn ngữ lại"),
            ],
            [
                ("GIVEN",    "Tôi đang sử dụng ứng dụng liên tục"),
                ("WHEN",     "Phiên của tôi sắp đến 24 giờ nhưng tôi vẫn đang hoạt động"),
                ("THEN",     "Phiên được gia hạn tự động, tôi không bị gián đoạn"),
            ],
        ],
    )

    add_page_break(doc)

    # ═══════════════════════════════════════════════════════════════════════
    # MODULE 8: Phân Tích & Báo Cáo — US-040 → US-043
    # ═══════════════════════════════════════════════════════════════════════
    add_module_header(doc, "Module 8: Phân Tích & Báo Cáo")

    build_ac(doc,
        ac_num="AC-040", us_num="US-040",
        title="Xem Thống Kê Lượt Truy Cập",
        story="Là Admin, tôi muốn xem thống kê lượt truy cập theo ngày, tuần, tháng và năm để theo dõi xu hướng lưu lượng truy cập nền tảng.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang đăng nhập với vai trò Admin và truy cập Dashboard"),
                ("WHEN",     "Tôi chọn bộ lọc 'Tuần này' trên biểu đồ thống kê"),
                ("THEN",     "Hệ thống hiển thị biểu đồ lượt truy cập theo từng ngày trong tuần hiện tại"),
                ("AND_THEN", "Tổng lượt truy cập tuần được hiển thị nổi bật phía trên biểu đồ"),
            ],
            [
                ("GIVEN",    "Tôi đang xem thống kê trên Dashboard"),
                ("WHEN",     "Tôi chuyển bộ lọc sang 'Năm nay'"),
                ("THEN",     "Biểu đồ cập nhật hiển thị lượt truy cập theo từng tháng trong năm"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-041", us_num="US-041",
        title="Xem Số Du Khách Đang Online",
        story="Là Admin, tôi muốn xem số lượng du khách đang online để giám sát hoạt động trực tiếp trên nền tảng.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang xem Dashboard quản trị"),
                ("WHEN",     "Tôi xem widget 'Du khách đang online'"),
                ("THEN",     "Hệ thống hiển thị số lượng du khách đang sử dụng nền tảng ngay lúc này"),
                ("AND_THEN", "Số liệu được cập nhật tự động mà không cần tải lại trang"),
            ],
            [
                ("GIVEN",    "Tôi đang xem số du khách online"),
                ("WHEN",     "Một du khách mới mở bản đồ FlavorTales"),
                ("THEN",     "Số lượng du khách online tăng lên và cập nhật trên Dashboard của tôi trong vài giây"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-042", us_num="US-042",
        title="Xem Tổng Số Vendor Đã Đăng Ký",
        story="Là Admin, tôi muốn xem tổng số vendor đã đăng ký để theo dõi mức độ tăng trưởng của nền tảng.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang xem Dashboard quản trị"),
                ("WHEN",     "Tôi xem thẻ thống kê 'Tổng Vendor'"),
                ("THEN",     "Hệ thống hiển thị tổng số tài khoản vendor đã đăng ký"),
                ("AND_THEN", "Con số bao gồm cả vendor active, inactive và pending xác minh"),
            ],
            [
                ("GIVEN",    "Tôi đang xem Dashboard"),
                ("WHEN",     "Một vendor mới vừa hoàn tất đăng ký"),
                ("THEN",     "Tổng số vendor trên Dashboard tăng lên 1 sau lần tải lại tiếp theo"),
            ],
        ],
    )

    build_ac(doc,
        ac_num="AC-043", us_num="US-043",
        title="Vendor Xem Analytics POI & Cửa Hàng",
        story="Là Vendor, tôi muốn xem analytics của POI và cửa hàng của mình (lượt xem, lượt thích) để đánh giá hiệu quả nội dung.",
        scenarios=[
            [
                ("GIVEN",    "Tôi đang đăng nhập với vai trò Vendor và có POI active"),
                ("WHEN",     "Tôi xem trang analytics của POI"),
                ("THEN",     "Hệ thống hiển thị: tổng lượt xem, tổng lượt thích và biểu đồ theo thời gian"),
            ],
            [
                ("GIVEN",    "Tôi đang xem analytics POI"),
                ("WHEN",     "POI của tôi chưa có lượt xem nào"),
                ("THEN",     "Hệ thống hiển thị tất cả chỉ số bằng 0 với hướng dẫn cải thiện nội dung"),
            ],
        ],
    )

    add_page_break(doc)

    # ═══════════════════════════════════════════════════════════════════════
    # MODULE 9: Thông Báo — US-044
    # ═══════════════════════════════════════════════════════════════════════
    add_module_header(doc, "Module 9: Thông Báo")

    build_ac(doc,
        ac_num="AC-044", us_num="US-044",
        title="Nhận Thông Báo Email Kết Quả Kiểm Duyệt",
        story="Là Vendor, tôi muốn nhận thông báo email khi POI hoặc cửa hàng được duyệt hoặc bị từ chối để biết kết quả kiểm duyệt mà không cần vào cổng quản lý.",
        scenarios=[
            [
                ("GIVEN",    "Tôi là Vendor và vừa gửi POI mới chờ duyệt"),
                ("WHEN",     "Admin duyệt hoặc từ chối POI của tôi"),
                ("THEN",     "Hệ thống gửi email thông báo đến địa chỉ email tôi đã đăng ký"),
                ("AND_THEN", "Email nêu rõ: tên POI, kết quả (duyệt/từ chối), và lý do nếu bị từ chối"),
            ],
            [
                ("GIVEN",    "Hệ thống cần gửi email thông báo cho Vendor"),
                ("WHEN",     "Dịch vụ email gặp sự cố tạm thời"),
                ("THEN",     "Hệ thống thử gửi lại tự động sau một khoảng thời gian"),
                ("AND_THEN", "Nếu gửi thất bại sau nhiều lần thử, sự kiện được ghi lại để xử lý thủ công"),
            ],
        ],
    )

    doc.save(OUTPUT_FILE)
    print(f"✓ Saved: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
