"""
Generate geofence-algorithms.docx from structured content.
Run: python generate_docx.py
"""
from docx import Document
from docx.shared import Pt, RGBColor, Cm, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import copy

doc = Document()

# ── Page margins ──────────────────────────────────────────────
section = doc.sections[0]
section.top_margin    = Cm(2.5)
section.bottom_margin = Cm(2.5)
section.left_margin   = Cm(3)
section.right_margin  = Cm(2)

# ── Helper colours ────────────────────────────────────────────
ORANGE   = RGBColor(0xE8, 0x5D, 0x2F)
DARK     = RGBColor(0x1E, 0x1E, 0x2E)
GREY     = RGBColor(0x55, 0x55, 0x55)

# ─────────────────────────────────────────────────────────────
def heading1(text):
    p = doc.add_heading(text, level=1)
    run = p.runs[0]
    run.font.color.rgb = ORANGE
    run.font.size = Pt(16)
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after  = Pt(6)
    return p

def heading2(text):
    p = doc.add_heading(text, level=2)
    run = p.runs[0]
    run.font.color.rgb = ORANGE
    run.font.size = Pt(13)
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after  = Pt(4)
    return p

def heading3(text):
    p = doc.add_heading(text, level=3)
    run = p.runs[0]
    run.font.color.rgb = DARK
    run.font.size = Pt(11.5)
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after  = Pt(2)
    return p

def body(text, bold=False, italic=False):
    p = doc.add_paragraph()
    run = p.add_run(text)
    run.font.size  = Pt(11)
    run.bold       = bold
    run.italic     = italic
    p.paragraph_format.space_after = Pt(4)
    return p

def body_mixed(parts):
    """parts = list of (text, bold, italic, is_code)"""
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(4)
    for text, bold, italic, is_code in parts:
        run = p.add_run(text)
        run.bold   = bold
        run.italic = italic
        if is_code:
            run.font.name = "Courier New"
            run.font.size = Pt(10)
        else:
            run.font.size = Pt(11)
    return p

def formula_block(text):
    """Render a formula as indented monospace paragraph."""
    p = doc.add_paragraph()
    p.paragraph_format.left_indent  = Cm(1.5)
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after  = Pt(6)
    run = p.add_run(text)
    run.font.name = "Courier New"
    run.font.size = Pt(10.5)
    run.font.color.rgb = RGBColor(0x22, 0x22, 0x44)
    # shading
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), 'FEF6F0')
    p._p.get_or_add_pPr().append(shd)
    return p

def code_block(text):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent  = Cm(1)
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after  = Pt(4)
    run = p.add_run(text)
    run.font.name = "Courier New"
    run.font.size = Pt(9.5)
    run.font.color.rgb = RGBColor(0x10, 0x10, 0x30)
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), 'F0F0F8')
    p._p.get_or_add_pPr().append(shd)
    return p

def callout(text, kind='info'):
    fills = {'info': 'EFF6FF', 'warn': 'FFFBEB', 'green': 'F0FDF4'}
    p = doc.add_paragraph()
    p.paragraph_format.left_indent  = Cm(1)
    p.paragraph_format.right_indent = Cm(1)
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after  = Pt(6)
    run = p.add_run(text)
    run.font.size = Pt(10.5)
    run.italic = True
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fills.get(kind, 'EFF6FF'))
    p._p.get_or_add_pPr().append(shd)
    return p

def bullet(text, level=0):
    p = doc.add_paragraph(style='List Bullet')
    run = p.add_run(text)
    run.font.size = Pt(11)
    p.paragraph_format.left_indent = Cm(0.5 + level * 0.5)
    return p

def numbered(text, num):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent   = Cm(1)
    p.paragraph_format.space_after   = Pt(3)
    run_num = p.add_run(f"{num}. ")
    run_num.bold = True
    run_num.font.size = Pt(11)
    run_num.font.color.rgb = ORANGE
    run = p.add_run(text)
    run.font.size = Pt(11)
    return p

def add_table(headers, rows):
    t = doc.add_table(rows=1 + len(rows), cols=len(headers))
    t.style = 'Table Grid'
    # header row
    hrow = t.rows[0]
    for i, h in enumerate(headers):
        cell = hrow.cells[i]
        cell.text = h
        run = cell.paragraphs[0].runs[0]
        run.bold = True
        run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        run.font.size = Pt(10.5)
        # orange background
        shd = OxmlElement('w:shd')
        shd.set(qn('w:val'), 'clear')
        shd.set(qn('w:color'), 'auto')
        shd.set(qn('w:fill'), 'E85D2F')
        cell._tc.get_or_add_tcPr().append(shd)
    # data rows
    for ri, row in enumerate(rows):
        trow = t.rows[ri + 1]
        fill = 'FAFAFA' if ri % 2 == 1 else 'FFFFFF'
        for ci, val in enumerate(row):
            cell = trow.cells[ci]
            cell.text = val
            cell.paragraphs[0].runs[0].font.size = Pt(10)
            shd = OxmlElement('w:shd')
            shd.set(qn('w:val'), 'clear')
            shd.set(qn('w:color'), 'auto')
            shd.set(qn('w:fill'), fill)
            cell._tc.get_or_add_tcPr().append(shd)
    doc.add_paragraph()  # spacing after table

def page_break():
    doc.add_page_break()

# ═══════════════════════════════════════════════════════════════
#  COVER / TITLE
# ═══════════════════════════════════════════════════════════════
title_p = doc.add_paragraph()
title_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
title_p.paragraph_format.space_before = Pt(60)
run = title_p.add_run("FLAVORTALES")
run.bold = True
run.font.size = Pt(28)
run.font.color.rgb = ORANGE

sub_p = doc.add_paragraph()
sub_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run2 = sub_p.add_run("Tài liệu Thuật toán Geofencing")
run2.font.size = Pt(18)
run2.font.color.rgb = DARK

sep_p = doc.add_paragraph()
sep_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run3 = sep_p.add_run("─" * 40)
run3.font.color.rgb = ORANGE

desc_p = doc.add_paragraph()
desc_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run4 = desc_p.add_run(
    "Mô tả thuật toán Haversine và giải quyết xung đột POI chồng lấp\n"
    "Phiên bản: 1.0  ·  Ngày: 10/05/2026"
)
run4.font.size = Pt(12)
run4.font.color.rgb = GREY

page_break()

# ═══════════════════════════════════════════════════════════════
#  MỤC LỤC (thủ công)
# ═══════════════════════════════════════════════════════════════
heading1("Mục lục")
items = [
    "1. Giới thiệu chung",
    "2. Thuật toán Haversine",
    "   2.1. Công thức toán học",
    "   2.2. Giải thích chi tiết từng bước",
    "   2.3. Tại sao dùng atan2 thay vì asin?",
    "   2.4. Sai số và giới hạn",
    "   2.5. Ví dụ tính tay",
    "3. Thuật toán giải quyết POI chồng lấp",
    "   3.1. Bối cảnh vấn đề",
    "   3.2. Luồng xử lý tổng thể",
    "   3.3. Công thức chấm điểm",
    "   3.4. Trọng số theo chế độ chuyển động",
    "   3.5. Tie-break",
    "4. Ví dụ minh họa",
    "   4.1. Tourist đang di chuyển (hướng về POI A)",
    "   4.2. Tourist đứng yên",
    "   4.3. Hai POI bằng điểm hoàn toàn",
    "5. Luồng hệ thống đầy đủ (Phase 3)",
    "6. Tóm tắt",
]
for item in items:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(2)
    run = p.add_run(item)
    run.font.size = Pt(11)

page_break()

# ═══════════════════════════════════════════════════════════════
#  1. GIỚI THIỆU CHUNG
# ═══════════════════════════════════════════════════════════════
heading1("1. Giới thiệu chung")

body(
    "FlavorTales là nền tảng du lịch ẩm thực cho phép du khách (tourist) khám phá các điểm tham quan "
    "(Points of Interest – POI) trong khi di chuyển. Một trong những tính năng cốt lõi là "
    "Geofencing – tự động phát hiện khi du khách bước vào hoặc rời khỏi vùng bán kính của một POI "
    "để kích hoạt nội dung âm thanh hướng dẫn."
)

body(
    "Tài liệu này mô tả hai thành phần thuật toán chính trong hệ thống geofencing:"
)
bullet("Thuật toán Haversine – tính khoảng cách chính xác giữa du khách và từng POI.")
bullet("Thuật toán giải quyết POI chồng lấp – xác định POI ưu tiên khi du khách đứng trong vùng giao của hai hoặc nhiều POI.")

body("")
body(
    "Kiến trúc xử lý: Toàn bộ hai thuật toán được thực thi hoàn toàn trên phía "
    "client (frontend – trình duyệt), không gửi tọa độ thực của du khách lên server. "
    "Server chỉ cung cấp danh sách POI kèm tọa độ trung tâm và bán kính. "
    "Điều này đảm bảo quyền riêng tư của người dùng và giảm tải cho hệ thống.",
    bold=False
)

callout(
    "Lý do xử lý phía client: (1) Bảo vệ quyền riêng tư – tọa độ GPS không bao giờ rời khỏi thiết bị. "
    "(2) Giảm độ trễ – không có round-trip mạng cho mỗi lần cập nhật vị trí. "
    "(3) Hoạt động offline khi tín hiệu mạng yếu.",
    kind='info'
)

page_break()

# ═══════════════════════════════════════════════════════════════
#  2. THUẬT TOÁN HAVERSINE
# ═══════════════════════════════════════════════════════════════
heading1("2. Thuật toán Haversine")

body(
    "Haversine là công thức tính khoảng cách đường chim bay (great-circle distance) giữa hai điểm "
    "trên bề mặt hình cầu dựa vào vĩ độ và kinh độ. Đây là lựa chọn tiêu chuẩn cho bài toán "
    "geofencing quy mô nhỏ đến trung bình (bán kính vài chục đến vài trăm mét)."
)

# 2.1
heading2("2.1. Công thức toán học")

body("Cho hai điểm trên Trái Đất:")
bullet("Điểm 1 (du khách): vĩ độ φ₁, kinh độ λ₁")
bullet("Điểm 2 (POI): vĩ độ φ₂, kinh độ λ₂")

body("Các bước tính:")

formula_block("Δφ = φ₂ − φ₁   (hiệu vĩ độ, đơn vị radian)")
formula_block("Δλ = λ₂ − λ₁   (hiệu kinh độ, đơn vị radian)")
formula_block("a  = sin²(Δφ/2) + cos(φ₁) · cos(φ₂) · sin²(Δλ/2)")
formula_block("d  = 2R · atan2(√a, √(1−a))")

add_table(
    ["Ký hiệu", "Trong code", "Ý nghĩa"],
    [
        ["φ₁, φ₂", "lat1, lat2", "Vĩ độ hai điểm (radian)"],
        ["λ₁, λ₂", "lng1, lng2", "Kinh độ hai điểm (radian)"],
        ["Δφ",     "dLat",       "Hiệu vĩ độ"],
        ["Δλ",     "dLng",       "Hiệu kinh độ"],
        ["R",      "6 371 000",  "Bán kính Trái Đất (mét)"],
        ["d",      "return value","Khoảng cách kết quả (mét)"],
    ]
)

# 2.2
heading2("2.2. Giải thích chi tiết từng bước")

numbered("Chuyển đổi đơn vị: Vĩ độ và kinh độ đầu vào ở dạng độ thập phân (decimal degrees). "
         "Trước khi tính toán, chuyển sang radian bằng toRad(x) = x × π / 180.", 1)
numbered("Tính Δφ và Δλ: Lấy hiệu vĩ độ và hiệu kinh độ (đã qua radian).", 2)
numbered("Tính a: Đây là bình phương sin nửa góc trung tâm, bao gồm cả thành phần kinh độ có trọng số "
         "theo cos của vĩ độ (để bù sự co lại của meridian về phía hai cực).", 3)
numbered("Tính d: Áp dụng hàm atan2 để ra góc trung tâm, nhân với 2R để được khoảng cách thực.", 4)

body("")
body("Pseudo-code triển khai:")
code_block(
    "function haversineMetres(lat1, lng1, lat2, lng2):\n"
    "    R      = 6_371_000                       // bán kính Trái Đất (m)\n"
    "    toRad  = (deg) => deg * Math.PI / 180\n\n"
    "    dLat   = toRad(lat2 - lat1)              // Δφ\n"
    "    dLng   = toRad(lng2 - lng1)              // Δλ\n\n"
    "    a = sin(dLat/2)²\n"
    "      + cos(toRad(lat1)) * cos(toRad(lat2)) * sin(dLng/2)²\n\n"
    "    return R * 2 * atan2(sqrt(a), sqrt(1 - a))"
)

# 2.3
heading2("2.3. Tại sao dùng atan2 thay vì asin?")

body(
    "Về mặt toán học, atan2(√a, √(1−a)) tương đương với arcsin(√a). "
    "Tuy nhiên, atan2 được ưu tiên vì:"
)
bullet("Ổn định số học (numerically stable) khi a → 0 (hai điểm rất gần nhau): "
       "arcsin có thể bị lỗi floating-point precision trong vùng này.")
bullet("Ổn định số học khi a → 1 (hai điểm gần đối cực – antipodal points): "
       "tránh kết quả NaN hoặc giá trị âm do lỗi làm tròn.")
bullet("Tốt hơn trong mọi trường hợp biên, không có chi phí hiệu năng đáng kể.")

# 2.4
heading2("2.4. Sai số và giới hạn")

body(
    "Haversine giả định Trái Đất là hình cầu hoàn hảo. Thực tế, Trái Đất là một ellipsoid "
    "hơi dẹt ở hai cực (WGS-84). Điều này dẫn đến sai số tối đa khoảng 0.5%."
)
callout(
    "Đánh giá tác động: Với POI có bán kính 100 m, sai số tối đa là 0.5 m – "
    "hoàn toàn không đáng kể so với độ chính xác GPS của thiết bị di động (~3–10 m). "
    "Haversine là lựa chọn phù hợp cho FlavorTales.",
    kind='green'
)

# 2.5
heading2("2.5. Ví dụ tính tay")

body("Dữ liệu đầu vào:")
bullet("Du khách ở: (10.7769, 106.7009)")
bullet("POI tại: (10.7775, 106.7015), bán kính = 80 m")

body("Tính toán:")
formula_block("Δφ = toRad(10.7775 − 10.7769) = toRad(0.0006) ≈ 1.047 × 10⁻⁵ rad")
formula_block("Δλ = toRad(106.7015 − 106.7009) = toRad(0.0006) ≈ 1.047 × 10⁻⁵ rad")
formula_block("a  ≈ 1.09 × 10⁻¹⁰ + 0.863 × 1.09 × 10⁻¹⁰ ≈ 2.03 × 10⁻¹⁰")
formula_block("d  = 2 × 6,371,000 × atan2(√a, √(1−a)) ≈ 78.5 m")

callout(
    "Kết quả: 78.5 m ≤ 80 m → Du khách ĐANG TRONG vùng geofence của POI này. "
    "Hệ thống sẽ kích hoạt nội dung âm thanh tương ứng.",
    kind='green'
)

page_break()

# ═══════════════════════════════════════════════════════════════
#  3. THUẬT TOÁN GIẢI QUYẾT POI CHỒNG LẤP
# ═══════════════════════════════════════════════════════════════
heading1("3. Thuật toán giải quyết POI chồng lấp")

# 3.1
heading2("3.1. Bối cảnh vấn đề")

body(
    "Trong thực tế triển khai, bán kính của nhiều POI lân cận có thể chồng lên nhau. "
    "Khi đó, cùng một vị trí GPS của du khách có thể thỏa mãn điều kiện \"đang trong\" "
    "của hai hoặc nhiều POI đồng thời. Hệ thống cần một cơ chế tự động chọn ra "
    "đúng một POI ưu tiên để phát nội dung, tránh xung đột âm thanh."
)
body(
    "Thuật toán này được triển khai trong hook useOverlapResolver.ts trên frontend. "
    "Nó được kích hoạt khi useGeofenceDetector trả về insidePois.length ≥ 2."
)

callout(
    "Kiến trúc: Toàn bộ logic resolve chạy phía client. "
    "Server không tham gia vào quá trình này.",
    kind='info'
)

# 3.2
heading2("3.2. Luồng xử lý tổng thể")

numbered(
    "Phát hiện chồng lấp: useGeofenceDetector trả về danh sách insidePois "
    "có từ 2 phần tử trở lên. overlappingPois được set.",
    1
)
numbered(
    "Bắt đầu cooldown 5 giây: Hook đặt isResolving = true. "
    "UI hiển thị trạng thái \"đang xác định\". "
    "Nếu tập hợp POI chồng lấp thay đổi trong thời gian này, bộ đếm được reset.",
    2
)
numbered(
    "Xác định chế độ chuyển động: Đọc speed từ sliding window 3 điểm GPS gần nhất. "
    "Phân loại: đứng yên (< 0.5 m/s) hoặc đang di chuyển.",
    3
)
numbered(
    "Chấm điểm: Gọi scoreAndResolve() để tính điểm cho từng POI "
    "theo 4 yếu tố có trọng số.",
    4
)
numbered(
    "Chọn winner: POI có điểm cao nhất được chọn. "
    "Tie-break: poiId nhỏ hơn (deterministic). "
    "Kết quả được set vào resolvedPoiId.",
    5
)

# 3.3
heading2("3.3. Công thức chấm điểm")

body("Với mỗi POI i trong tập chồng lấp, điểm số được tính:")

formula_block(
    "score(i) = w1 × (1/d_i) + w2 × heading_i + w3 × (likes_i / maxLikes) + w4 × context_i"
)

add_table(
    ["Yếu tố", "Công thức", "Ý nghĩa"],
    [
        ["Distance  (w1 × 1/d)", "1 / haversineMetres(tourist, POI_i)",
         "POI càng gần → 1/d càng lớn → điểm càng cao"],
        ["Heading   (w2)",       "1 nếu góc lệch < 45°, ngược lại 0",
         "Du khách đang đi về phía POI đó"],
        ["Popularity (w3)",      "likesCount_i / max(likesCount)",
         "POI được yêu thích hơn (chuẩn hóa về [0,1])"],
        ["Context   (w4)",       "1 nếu shop đang mở VÀ có audio đã duyệt",
         "POI đang \"hoạt động\" và có nội dung phát"],
    ]
)

# 3.4
heading2("3.4. Trọng số theo chế độ chuyển động")

body(
    "Trọng số được điều chỉnh động dựa trên trạng thái GPS và chuyển động của du khách:"
)

add_table(
    ["Chế độ", "w1 (khoảng cách)", "w2 (hướng)", "w3 (lượt thích)", "w4 (context)"],
    [
        ["Bình thường (đang di chuyển)", "0.40", "0.30", "0.20", "0.10"],
        ["Đứng yên (speed < 0.5 m/s)",  "0.55", "0.00", "0.25", "0.10"],
        ["Buffer GPS < 5 điểm",          "0.55", "0.30", "0.25", "0.10"],
    ]
)

callout(
    "Lý do điều chỉnh: Khi du khách đứng yên, không có hướng di chuyển đáng tin cậy "
    "nên w2 = 0. Trọng số w1 tăng từ 0.40 lên 0.55 để ưu tiên POI gần nhất. "
    "w3 cũng tăng để popularity trở thành yếu tố phụ quyết định.",
    kind='warn'
)

# 3.5
heading2("3.5. Tie-break")

body(
    "Khi hai hoặc nhiều POI có điểm số bằng nhau hoàn toàn, "
    "hệ thống áp dụng quy tắc tie-break đơn giản và deterministic:"
)
callout(
    "Tie-break Rule: Chọn POI có poiId nhỏ hơn. "
    "Ví dụ: POI #12 và POI #15 → chọn POI #12. "
    "Quy tắc này đảm bảo kết quả luôn nhất quán, không phụ thuộc vào thứ tự dữ liệu.",
    kind='info'
)

page_break()

# ═══════════════════════════════════════════════════════════════
#  4. VÍ DỤ MINH HỌA
# ═══════════════════════════════════════════════════════════════
heading1("4. Ví dụ minh họa")

body(
    "Xét tình huống: Du khách đứng trong vùng giao của POI A và POI B. "
    "Cả hai POI đều thỏa điều kiện \"inside\"."
)

add_table(
    ["Thuộc tính", "POI A", "POI B"],
    [
        ["Khoảng cách đến du khách", "30 m", "25 m"],
        ["Bán kính geofence",        "70 m", "80 m"],
        ["Số lượt thích (likes)",    "120",  "80"],
        ["Trạng thái context",       "Mở + có audio", "Đóng, không có audio"],
    ]
)

# 4.1
heading2("4.1. Ví dụ 1 – Du khách đang di chuyển về hướng POI A")

body(
    "Điều kiện: tốc độ 1.2 m/s, buffer đủ 5 điểm, "
    "góc lệch hướng với POI A = 20° (match), với POI B = 110° (không match)."
)
body("Áp dụng trọng số bình thường: w1=0.40, w2=0.30, w3=0.20, w4=0.10")

add_table(
    ["Yếu tố", "POI A", "POI B"],
    [
        ["Distance: w1 × 1/d",       "0.40 × 1/30 = 0.01333", "0.40 × 1/25 = 0.01600"],
        ["Heading:  w2 × match",     "0.30 × 1   = 0.30000",  "0.30 × 0   = 0.00000"],
        ["Popularity: w3 × likes/max","0.20 × 120/120 = 0.20000","0.20 × 80/120 = 0.13333"],
        ["Context:  w4 × active",    "0.10 × 1   = 0.10000",  "0.10 × 0   = 0.00000"],
        ["TỔNG ĐIỂM",                "0.61333",               "0.14933"],
    ]
)
callout(
    "Kết quả: POI A thắng (0.613 > 0.149) dù xa hơn POI B (30 m vs 25 m). "
    "Lý do: du khách đang đi về phía POI A – heading chiếm 0.30 điểm, "
    "vượt trội hoàn toàn phần chênh lệch khoảng cách.",
    kind='green'
)

# 4.2
heading2("4.2. Ví dụ 2 – Du khách đứng yên (không có hướng di chuyển)")

body(
    "Cùng vị trí, cùng dữ liệu POI, nhưng du khách đứng yên (speed < 0.5 m/s). "
    "Trọng số heading w2 = 0; w1 tăng lên 0.55, w3 tăng lên 0.25."
)

add_table(
    ["Yếu tố", "POI A", "POI B"],
    [
        ["Distance: 0.55 × 1/d",      "0.55 × 1/30 = 0.01833", "0.55 × 1/25 = 0.02200"],
        ["Heading:  0.00 × match",    "0.00 × 1   = 0.00000",  "0.00 × 0   = 0.00000"],
        ["Popularity: 0.25 × likes/max","0.25 × 120/120 = 0.25000","0.25 × 80/120 = 0.16667"],
        ["Context:  0.10 × active",   "0.10 × 1   = 0.10000",  "0.10 × 0   = 0.00000"],
        ["TỔNG ĐIỂM",                 "0.36833",               "0.18867"],
    ]
)
callout(
    "Kết quả: POI A vẫn thắng nhờ popularity cao hơn (120 vs 80 likes) "
    "và context bonus (shop mở + có audio). "
    "Khi đứng yên, popularity và context trở thành yếu tố quyết định.",
    kind='green'
)

# 4.3
heading2("4.3. Ví dụ 3 – Hai POI hoàn toàn bằng điểm (Tie-break)")

body(
    "Giả sử POI #12 và POI #15 có cùng khoảng cách, cùng likes, "
    "cùng context, không có heading. Điểm số bằng nhau tuyệt đối."
)
callout(
    "Tie-break: Chọn POI #12 (poiId nhỏ hơn). "
    "Quy tắc này đảm bảo kết quả deterministic – luôn nhất quán.",
    kind='warn'
)

page_break()

# ═══════════════════════════════════════════════════════════════
#  5. LUỒNG HỆ THỐNG ĐẦY ĐỦ
# ═══════════════════════════════════════════════════════════════
heading1("5. Luồng hệ thống đầy đủ (Phase 3)")

body(
    "Dưới đây là luồng xử lý end-to-end, từ khi browser nhận GPS "
    "cho đến khi cập nhật session du khách lên server:"
)

code_block(
    "Browser GPS (watchPosition)\n"
    "  │  coordinates {lat, lng, accuracy, speed, heading}\n"
    "  ▼\n"
    "useUserLocation          ← throttle 3 s, tạm dừng khi tab ẩn\n"
    "  │\n"
    "  ▼\n"
    "LocationContext          ← single source of truth cho GPS\n"
    "  │\n"
    "  ▼\n"
    "GeofenceProvider\n"
    "  ├─ usePositionBuffer   ← sliding window lịch sử GPS (5 điểm)\n"
    "  │\n"
    "  ├─ useGeofenceDetector ← haversineMetres(tourist, poi) cho mỗi POI\n"
    "  │    • dist ≤ radius  → \"inside\"\n"
    "  │    • thoát + chậm   → \"grace_period\" (10 s)\n"
    "  │    • thoát + nhanh  → \"outside\" ngay\n"
    "  │    • mất GPS        → gpsLost = true (10 s)\n"
    "  │\n"
    "  └─ useOverlapResolver  ← khi insidePois.length ≥ 2\n"
    "       • Chờ 5 s (cooldown)\n"
    "       • scoreAndResolve():\n"
    "           score = w1/dist + w2·heading + w3·likes + w4·context\n"
    "       • resolvedPoiId = winner\n"
    "  │\n"
    "  ▼\n"
    "Consumer component\n"
    "  └─ updateTouristSession(sessionId, { viewedPoiIds })\n"
    "       → PATCH /api/tourist/sessions/{sessionId}\n"
    "       → MongoDB lưu danh sách POI đã vào"
)

body("")
body("Giải thích các trạng thái grace_period:")
bullet(
    "grace_period (10 s): Du khách vừa rời khỏi geofence nhưng di chuyển chậm "
    "(có thể do GPS drift). Hệ thống chờ 10 giây trước khi chuyển sang outside, "
    "tránh kích hoạt/hủy nội dung liên tục."
)
bullet(
    "outside ngay: Du khách rời khỏi geofence với tốc độ cao (chắc chắn đã ra ngoài). "
    "Không cần grace_period."
)
bullet(
    "gpsLost (10 s): Không nhận được cập nhật GPS trong 10 giây. "
    "Hệ thống giữ trạng thái hiện tại thêm 10 giây rồi mới reset."
)

page_break()

# ═══════════════════════════════════════════════════════════════
#  6. TÓM TẮT
# ═══════════════════════════════════════════════════════════════
heading1("6. Tóm tắt")

body(
    "Hệ thống geofencing của FlavorTales sử dụng hai thuật toán phối hợp:"
)

add_table(
    ["Thuật toán", "Mục đích", "Vị trí thực thi", "Độ phức tạp"],
    [
        ["Haversine",
         "Tính khoảng cách tourist ↔ POI, so sánh với radius",
         "Frontend (client-side)",
         "O(n) với n = số POI active"],
        ["Overlap Resolver (scoreAndResolve)",
         "Chọn POI ưu tiên khi nhiều POI chồng lấp",
         "Frontend (client-side)",
         "O(k) với k = số POI chồng lấp"],
    ]
)

body("Ưu điểm của thiết kế:")
bullet("Bảo vệ quyền riêng tư: tọa độ GPS không bao giờ rời khỏi thiết bị người dùng.")
bullet("Hiệu năng cao: không có network round-trip cho mỗi lần cập nhật GPS (3 giây/lần).")
bullet("Tính deterministic: cùng một tập dữ liệu đầu vào luôn cho cùng một kết quả.")
bullet("Khả năng mở rộng: có thể điều chỉnh trọng số w1–w4 mà không cần thay đổi kiến trúc.")
bullet("Hoạt động offline: vẫn hoạt động khi kết nối mạng yếu hoặc gián đoạn.")

body("")
callout(
    "Kết luận: Sự kết hợp giữa Haversine (chính xác, nhẹ) và Overlap Resolver "
    "(đa yếu tố, có trọng số động) tạo ra trải nghiệm geofencing mượt mà và thông minh "
    "cho du khách sử dụng FlavorTales.",
    kind='green'
)

# footer
doc.add_paragraph()
footer_p = doc.add_paragraph()
footer_p.alignment = WD_ALIGN_PARAGRAPH.CENTER
run_f = footer_p.add_run("FlavorTales © 2026 — Tài liệu nội bộ")
run_f.font.size = Pt(9)
run_f.font.color.rgb = GREY

# ── Save ──────────────────────────────────────────────────────
out = r"d:\Codes\Seminar\Source Code\docs\algorithms\geofence-algorithms.docx"
doc.save(out)
print(f"Saved: {out}")
