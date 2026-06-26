"""
Generate API-Assumptions.docx from API-Assumptions.md
"""

import re
from pathlib import Path
from docx import Document
from docx.shared import Pt, RGBColor, Inches, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

BASE_DIR = Path(__file__).parent
MD_FILE = BASE_DIR / "API-Assumptions.md"
OUTPUT = BASE_DIR / "API-Assumptions.docx"


# ── Helpers ──────────────────────────────────────────────────────────────────

def set_cell_bg(cell, hex_color: str):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    shd = OxmlElement("w:shd")
    shd.set(qn("w:val"), "clear")
    shd.set(qn("w:color"), "auto")
    shd.set(qn("w:fill"), hex_color)
    tcPr.append(shd)


def set_cell_border(cell, **kwargs):
    tc = cell._tc
    tcPr = tc.get_or_add_tcPr()
    tcBorders = OxmlElement("w:tcBorders")
    for side in ("top", "left", "bottom", "right", "insideH", "insideV"):
        if side in kwargs:
            border = OxmlElement(f"w:{side}")
            for k, v in kwargs[side].items():
                border.set(qn(f"w:{k}"), v)
            tcBorders.append(border)
    tcPr.append(tcBorders)


def add_run_with_inline_code(paragraph, text: str):
    """Add a paragraph run, rendering `code` spans with monospace font."""
    parts = re.split(r"(`[^`]+`)", text)
    for part in parts:
        if part.startswith("`") and part.endswith("`"):
            run = paragraph.add_run(part[1:-1])
            run.font.name = "Courier New"
            run.font.size = Pt(9)
            run.font.color.rgb = RGBColor(0xC7, 0x25, 0x4A)
        else:
            # handle **bold**
            bold_parts = re.split(r"(\*\*[^*]+\*\*)", part)
            for bp in bold_parts:
                if bp.startswith("**") and bp.endswith("**"):
                    run = paragraph.add_run(bp[2:-2])
                    run.bold = True
                else:
                    paragraph.add_run(bp)


def style_header_row(table, bg="2E4057"):
    for cell in table.rows[0].cells:
        set_cell_bg(cell, bg)
        for para in cell.paragraphs:
            para.alignment = WD_ALIGN_PARAGRAPH.CENTER
            for run in para.runs:
                run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                run.bold = True
                run.font.size = Pt(9)


def style_data_rows(table):
    for i, row in enumerate(table.rows[1:], start=1):
        bg = "F7F9FC" if i % 2 == 0 else "FFFFFF"
        for cell in row.cells:
            set_cell_bg(cell, bg)
            cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
            for para in cell.paragraphs:
                for run in para.runs:
                    run.font.size = Pt(9)


# ── Parser ────────────────────────────────────────────────────────────────────

def parse_md(md_text: str):
    """
    Yields tuples of (type, content):
      ('h1', str), ('h2', str), ('h3', str), ('h4', str),
      ('blockquote', str), ('code_block', str, lang),
      ('table', [[str, ...]]),
      ('hr', None),
      ('paragraph', str),
      ('blank', None)
    """
    lines = md_text.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]

        # Headings
        m = re.match(r"^(#{1,4})\s+(.*)", line)
        if m:
            level = len(m.group(1))
            yield (f"h{level}", m.group(2).strip())
            i += 1
            continue

        # HR
        if re.match(r"^---+$", line.strip()):
            yield ("hr", None)
            i += 1
            continue

        # Code block
        if line.startswith("```"):
            lang = line[3:].strip()
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                code_lines.append(lines[i])
                i += 1
            i += 1  # closing ```
            yield ("code_block", "\n".join(code_lines), lang)
            continue

        # Blockquote
        if line.startswith(">"):
            text = re.sub(r"^>\s?", "", line)
            yield ("blockquote", text)
            i += 1
            continue

        # Table
        if "|" in line and i + 1 < len(lines) and re.match(r"^\|[-| :]+\|", lines[i + 1]):
            rows = []
            while i < len(lines) and "|" in lines[i]:
                if re.match(r"^\|[-| :]+\|", lines[i]):
                    i += 1
                    continue
                cells = [c.strip() for c in lines[i].strip().strip("|").split("|")]
                rows.append(cells)
                i += 1
            yield ("table", rows)
            continue

        # Blank
        if line.strip() == "":
            yield ("blank", None)
            i += 1
            continue

        # Paragraph / list item
        yield ("paragraph", line)
        i += 1


# ── Document builder ──────────────────────────────────────────────────────────

def build_doc(md_text: str, output_path: Path):
    doc = Document()

    # Page margins
    for section in doc.sections:
        section.top_margin = Cm(2)
        section.bottom_margin = Cm(2)
        section.left_margin = Cm(2.5)
        section.right_margin = Cm(2.5)

    # Default font
    doc.styles["Normal"].font.name = "Calibri"
    doc.styles["Normal"].font.size = Pt(10)

    # Heading styles
    HEADING_COLORS = {
        1: ("1F3864", 18),
        2: ("2E75B6", 14),
        3: ("2E4057", 12),
        4: ("404040", 11),
    }

    def add_heading(level: int, text: str):
        para = doc.add_paragraph()
        run = para.add_run(text)
        run.bold = True
        color_hex, size = HEADING_COLORS.get(level, ("000000", 10))
        r, g, b = int(color_hex[0:2], 16), int(color_hex[2:4], 16), int(color_hex[4:6], 16)
        run.font.color.rgb = RGBColor(r, g, b)
        run.font.size = Pt(size)
        run.font.name = "Calibri"
        if level == 1:
            para.paragraph_format.space_before = Pt(18)
            para.paragraph_format.space_after = Pt(6)
            # underline
            run.underline = True
        elif level == 2:
            para.paragraph_format.space_before = Pt(14)
            para.paragraph_format.space_after = Pt(4)
        elif level == 3:
            para.paragraph_format.space_before = Pt(10)
            para.paragraph_format.space_after = Pt(3)
        else:
            para.paragraph_format.space_before = Pt(6)
            para.paragraph_format.space_after = Pt(2)

    def add_table(rows):
        if not rows:
            return
        col_count = max(len(r) for r in rows)
        table = doc.add_table(rows=len(rows), cols=col_count)
        table.style = "Table Grid"
        table.alignment = WD_TABLE_ALIGNMENT.CENTER

        for ri, row in enumerate(rows):
            for ci, cell_text in enumerate(row):
                if ci >= col_count:
                    break
                cell = table.cell(ri, ci)
                cell.text = ""
                para = cell.paragraphs[0]
                add_run_with_inline_code(para, cell_text)
                para.paragraph_format.space_before = Pt(2)
                para.paragraph_format.space_after = Pt(2)
                for run in para.runs:
                    run.font.size = Pt(9)

        style_header_row(table)
        style_data_rows(table)
        doc.add_paragraph()  # spacing after table

    def add_code(code_text: str):
        para = doc.add_paragraph()
        para.paragraph_format.left_indent = Inches(0.3)
        para.paragraph_format.space_before = Pt(4)
        para.paragraph_format.space_after = Pt(4)
        run = para.add_run(code_text)
        run.font.name = "Courier New"
        run.font.size = Pt(8)
        # Light gray shading
        pPr = para._p.get_or_add_pPr()
        shd = OxmlElement("w:shd")
        shd.set(qn("w:val"), "clear")
        shd.set(qn("w:color"), "auto")
        shd.set(qn("w:fill"), "F4F4F4")
        pPr.append(shd)

    def add_blockquote(text: str):
        para = doc.add_paragraph()
        para.paragraph_format.left_indent = Inches(0.4)
        para.paragraph_format.space_before = Pt(2)
        para.paragraph_format.space_after = Pt(2)
        run = para.add_run(text)
        run.italic = True
        run.font.color.rgb = RGBColor(0x55, 0x55, 0x55)
        run.font.size = Pt(9.5)

    # Cover page
    cover = doc.add_paragraph()
    cover.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cover.paragraph_format.space_before = Pt(72)
    r = cover.add_run("FlavorTales")
    r.font.size = Pt(28)
    r.bold = True
    r.font.color.rgb = RGBColor(0x2E, 0x75, 0xB6)

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r2 = sub.add_run("API Assumptions Document")
    r2.font.size = Pt(18)
    r2.font.color.rgb = RGBColor(0x40, 0x40, 0x40)

    meta = doc.add_paragraph()
    meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    meta.paragraph_format.space_before = Pt(12)
    r3 = meta.add_run("Ngày tạo: 07/04/2026   |   Phiên bản: 1.0")
    r3.font.size = Pt(11)
    r3.font.color.rgb = RGBColor(0x70, 0x70, 0x70)

    doc.add_page_break()

    # Parse and render
    for token in parse_md(md_text):
        kind = token[0]

        if kind in ("h1", "h2", "h3", "h4"):
            level = int(kind[1])
            text = token[1]
            # Strip markdown link syntax [text](url) → text
            text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
            add_heading(level, text)

        elif kind == "hr":
            para = doc.add_paragraph()
            para.paragraph_format.space_before = Pt(4)
            para.paragraph_format.space_after = Pt(4)
            pPr = para._p.get_or_add_pPr()
            pBdr = OxmlElement("w:pBdr")
            bottom = OxmlElement("w:bottom")
            bottom.set(qn("w:val"), "single")
            bottom.set(qn("w:sz"), "6")
            bottom.set(qn("w:space"), "1")
            bottom.set(qn("w:color"), "CCCCCC")
            pBdr.append(bottom)
            pPr.append(pBdr)

        elif kind == "code_block":
            add_code(token[1])

        elif kind == "blockquote":
            add_blockquote(token[1])

        elif kind == "table":
            add_table(token[1])

        elif kind == "paragraph":
            text = token[1]
            if not text.strip():
                continue
            # List items
            is_list = text.strip().startswith(("-", "*", "+")) or re.match(r"^\d+\.", text.strip())
            para = doc.add_paragraph()
            if is_list:
                para.paragraph_format.left_indent = Inches(0.3)
                text = re.sub(r"^[-*+]\s+", "", text.strip())
                text = re.sub(r"^\d+\.\s+", "", text)
            para.paragraph_format.space_before = Pt(1)
            para.paragraph_format.space_after = Pt(1)
            add_run_with_inline_code(para, text)

        elif kind == "blank":
            pass  # skip blanks to keep compact

    doc.save(str(output_path))
    print(f"Saved: {output_path}")



# ── Business Requirements generator ──────────────────────────────────────────

BR_MD = BASE_DIR / "md" / "Business-Requirements.md"
BR_OUT = BASE_DIR / "Business-Requirements.docx"

BR_CONTENT = """\
# Business Requirements — FlavorTales

> **Ngày tạo:** 07/04/2026
> **Phiên bản:** 1.0
> **Phạm vi:** Mô tả nghiệp vụ (Business Logic) cho tất cả các module trong hệ thống FlavorTales

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

FlavorTales là nền tảng du lịch ẩm thực kết nối **vendor** (chủ quán ăn) và **khách du lịch**. Hệ thống cho phép:

- Vendor đăng ký, tạo điểm địa lý (POI) đại diện cho quán ăn của mình.
- Khách du lịch duyệt bản đồ, tiếp cận thông tin quán ăn khi đến gần (geofencing), nghe audio giới thiệu đa ngôn ngữ.
- Admin duyệt, quản lý toàn bộ nội dung trên nền tảng.

**Các nhóm người dùng:**

| Nhóm | Mô tả |
|------|-------|
| Vendor | Chủ quán ăn, đăng ký và quản lý nội dung của mình |
| Admin | Quản trị viên nền tảng, phê duyệt/kiểm soát toàn bộ nội dung |
| Khách du lịch | Người dùng ẩn danh, không cần đăng nhập |

---

## 2. Module Auth — Xác thực & Phân quyền

### 2.1 Đăng ký tài khoản Vendor

**Luồng nghiệp vụ:**

1. Vendor gửi thông tin: email, tên đầy đủ (username), số điện thoại, mật khẩu.
2. Hệ thống kiểm tra trùng lặp email và tên đầy đủ; báo lỗi cụ thể nếu đã tồn tại.
3. Mật khẩu được mã hóa bằng **BCrypt với cost factor 12**.
4. Tài khoản được lưu với trạng thái `inactive`.
5. Mã OTP 6 chữ số được sinh ngẫu nhiên bằng `SecureRandom`, lưu vào bảng `email_verification` kèm thời hạn hết hạn, và gửi email bất đồng bộ bằng template HTML Thymeleaf.

**Ràng buộc:**
- Email phải chưa tồn tại trong hệ thống.
- Tên đầy đủ phải là duy nhất.
- Mật khẩu tối thiểu 8 ký tự, phức tạp (hoa, thường, số, ký tự đặc biệt).

### 2.2 Xác thực Email

**Luồng nghiệp vụ:**

1. Vendor nhập email và mã OTP 6 chữ số nhận được qua email.
2. Hệ thống truy vấn bản ghi xác thực mới nhất; so sánh mã.
3. Nếu mã hết hạn → `VerificationCodeExpiredException`.
4. Nếu mã đúng và còn hạn: `email_verification.is_verified = true`, `user.status = active`.
5. Vendor có thể gửi lại OTP tối đa **3 lần** sau lần gửi đầu (tổng 4 lần). Lần thứ 4 trở đi → `ResendLimitExceededException`.

### 2.3 Đăng nhập

**Luồng nghiệp vụ:**

1. Vendor nhập email và mật khẩu (tùy chọn: `rememberMe`).
2. Hệ thống tra cứu user theo email; kiểm tra mật khẩu.
3. Sai email/mật khẩu → `InvalidCredentialsException` (không tiết lộ trường nào sai — bảo mật chống enumeration).
4. Kiểm tra trạng thái tài khoản:
   - `inactive` / `disabled` → `AccountDisabledException`
   - `pending` → `AccountPendingException`
   - `rejected` → `AccountRejectedException`
   - `suspended` → `AccountSuspendedException`
5. Cấp **Access Token** (24 giờ; 7 ngày nếu `rememberMe = true`) và **Refresh Token** (30 ngày).
6. Token được lưu trong HTTP-only cookies và trả về trong response body.

**Rate Limiting & Lockout:**

| Quy tắc | Giá trị mặc định |
|---------|----------------|
| Số lần request tối đa trong cửa sổ thời gian | 5 lần / 15 phút |
| Số lần thất bại liên tiếp tối đa trước khi khóa | 10 lần |
| Thời gian khóa | 30 phút |

- Vượt ngưỡng request → `TooManyLoginAttemptsException`
- Vượt ngưỡng thất bại liên tiếp → `AccountLockedException`
- Đăng nhập thành công: toàn bộ lịch sử thất bại bị xóa (clean slate).

### 2.4 Quên mật khẩu & Đặt lại mật khẩu

**Bước 1 — Yêu cầu reset:**
- Giới hạn theo IP: tối đa 3 yêu cầu/giờ (sliding window trong bộ nhớ).
- Nếu email không tồn tại → trả về thành công (bảo mật chống enumeration).
- Sinh mã OTP 6 chữ số, lưu vào `password_reset_token`, gửi email.

**Bước 2 — Đặt lại mật khẩu:**
- Kiểm tra token tồn tại, chưa được sử dụng, chưa hết hạn (30 phút).
- Mã hóa mật khẩu mới với BCrypt-12.
- Đánh dấu token đã dùng (`used = true`).
- Cập nhật `user.passwordChangedAt = now()` → tất cả token JWT phát hành trước thời điểm này đều bị vô hiệu hóa.

### 2.5 Đăng xuất & Vòng đời Token

- **Đăng xuất**: Token bị thêm vào danh sách đen (blacklist) trong bộ nhớ; cookie bị xóa.
- **Invalidation sau đổi mật khẩu**: JWT filter kiểm tra `passwordChangedAt` — token cũ hơn thời điểm đổi mật khẩu bị từ chối.
- Tất cả token được ký bằng HMAC-SHA-256.

---

## 3. Module User — Quản lý người dùng

### 3.1 Vai trò (Roles)

| Vai trò | Mô tả |
|---------|-------|
| `ROLE_vendor` | Chủ quán ăn; đăng ký qua luồng tự động |
| `ROLE_admin` | Quản trị viên nền tảng; không có luồng tự đăng ký |

### 3.2 Vòng đời trạng thái tài khoản

| Trạng thái | Ý nghĩa |
|------------|---------|
| `inactive` | Đăng ký xong, chưa xác thực email |
| `active` | Đã xác thực, có thể đăng nhập |
| `pending` | Email đã xác thực, chờ admin phê duyệt |
| `rejected` | Bị từ chối |
| `suspended` | Tạm thời bị đình chỉ bởi admin |
| `disabled` | Bị vô hiệu hóa vĩnh viễn |

### 3.3 Thông tin hồ sơ

Hồ sơ vendor lưu: `email`, `fullName`, `phone`, `passwordHash`, `passwordChangedAt`, `createdAt`, `updatedAt`. Quản lý tài khoản (kích hoạt, đình chỉ) do admin thực hiện qua giao diện admin.

---

## 4. Module POI — Điểm địa lý ẩm thực

### 4.1 Tạo POI

**Luồng nghiệp vụ:**

1. Vendor gửi thông tin POI: tên, tọa độ GPS (lat/lng), bán kính geofence, địa chỉ, và thông tin quán (tên, mô tả, ảnh, giờ mở cửa, tag).
2. **Kiểm tra biên giới địa lý**: khoảng cách Haversine từ tọa độ nộp đến tâm phố ẩm thực được cấu hình phải ≤ `app.poi.boundary.max-radius-m`. Vi phạm → báo lỗi.
3. **Kiểm tra trùng lặp vị trí**: không có POI *active* nào trong phạm vi **5 mét**. Vi phạm → `DuplicatePoiLocationException`.
4. **Kiểm tra tên quán**: `shopName` phải chưa tồn tại trong bất kỳ quán không bị `disabled`.
5. POI và Shop được lưu đồng thời trong cùng một transaction, cả hai ở trạng thái `pending`.
6. Admin nhận email thông báo bất đồng bộ.
7. Dịch tên và địa chỉ POI sang 5 ngôn ngữ song song (xem mục 4.7).

### 4.2 Vòng đời trạng thái POI

| Trạng thái | Ý nghĩa |
|------------|---------|
| `pending` | Chờ admin phê duyệt |
| `active` | Hiển thị công khai trên bản đồ |
| `inactive` | Tạm ẩn |
| `rejected` | Bị từ chối |
| `deleted` | Đã xóa mềm |

> **Lưu ý quan trọng**: Phê duyệt Shop **kéo theo** POI chuyển sang `active`. Từ chối Shop **không** tự động thay đổi trạng thái POI.

### 4.3 Cập nhật POI

- Vendor có thể cập nhật: tên, địa chỉ, bán kính, tọa độ.
- Thay đổi tọa độ phải vượt qua lại kiểm tra biên giới và kiểm tra trùng lặp.
- Thay đổi tọa độ → gửi email thông báo tới vendor và kích hoạt dịch thuật lại.
- Redis cache liên quan bị xóa sau mỗi lần cập nhật.

### 4.4 Xóa POI

- **Xóa mềm** (`?hard=false`, mặc định): chuyển trạng thái POI thành `deleted`.
- **Xóa cứng** (`?hard=true`): xóa vĩnh viễn khỏi cơ sở dữ liệu.

### 4.5 Geofencing

- Mỗi POI có trường `radius` (mét) lưu trong cơ sở dữ liệu.
- Tại thời điểm tạo/cập nhật: kiểm tra biên giới và khoảng cách tối thiểu với POI hàng xóm bằng công thức Haversine.
- Tại thời điểm du lịch: module Location sử dụng `radius` của POI để xác định khách đã vào vùng phủ sóng hay chưa.

### 4.6 Hệ thống Like (Yêu thích)

- Khách du lịch ẩn danh (định danh bằng `sessionId`) có thể like/unlike POI đang `active`.
- Mỗi session chỉ được like một POI một lần (idempotent — like lại trả về số lượt hiện tại, không báo lỗi).
- Unlike được bảo vệ: `likes_count = GREATEST(likes_count - 1, 0)` (không bao giờ âm).
- Cache Redis bị xóa sau mỗi thao tác like/unlike.

### 4.7 Dịch thuật đa ngôn ngữ

- Kích hoạt tự động khi: tạo POI mới, cập nhật tọa độ POI.
- Dịch tên và địa chỉ POI từ tiếng Việt sang **5 ngôn ngữ** song song: Anh (EN), Hàn (KO), Trung (ZH), Nhật (JA), Nga (RU).
- Sử dụng Google Cloud Translation API.
- Thất bại ở một ngôn ngữ không ảnh hưởng các ngôn ngữ khác.
- Kết quả lưu vào các bảng `poi_*_translation` riêng theo ngôn ngữ.

### 4.8 Caching

- `PoiCacheService` sử dụng Redis để cache danh sách toàn bộ POI active và chi tiết từng POI theo `poiId`.
- Mọi thao tác thay đổi (tạo, sửa, xóa, like) đều xóa cache liên quan.

---

## 5. Module Content (Shop) — Quản lý quán ăn

### 5.1 Tạo Shop

**Luồng nghiệp vụ:**

1. Vendor gửi: tên quán, mô tả, phong cách ẩm thực, món đặc trưng, tag (JSON array), giờ mở cửa (JSON), ảnh đại diện, và danh sách ảnh phụ.
2. Kiểm tra tên quán độc nhất trong các quán không bị `disabled`.
3. Shop được lưu với trạng thái `pending`.
4. Ảnh phụ được lưu vào bảng `shop_image` với `sort_order`.
5. Admin nhận email thông báo bất đồng bộ.

> **Luồng phổ biến nhất**: Shop được tạo trong cùng transaction khi vendor tạo POI, liên kết với POI qua `poi_id`.

### 5.2 Luồng Phê duyệt / Từ chối Shop (Admin)

- **Phê duyệt**: `shop.status = active` + `poi.status = active` (cùng transaction). Gửi email thông báo phê duyệt đến vendor.
- **Từ chối**: `shop.status = rejected`. POI không thay đổi. Gửi email thông báo từ chối kèm ghi chú admin đến vendor.

### 5.3 Cập nhật Shop

Vendor cập nhật thông tin shop → trạng thái shop tự động reset về `pending`, chờ admin duyệt lại.

### 5.4 Dịch thuật đa ngôn ngữ

Cơ chế giống POI: dịch tên và mô tả quán từ tiếng Việt sang EN, KO, ZH, RU, JA song song bằng Google Cloud Translation API.

### 5.5 Vòng đời trạng thái Shop

| Trạng thái | Ý nghĩa |
|------------|---------|
| `pending` | Chờ admin phê duyệt |
| `active` | Đã duyệt, hiển thị công khai |
| `rejected` | Bị từ chối |
| `disabled` | Bị vô hiệu hóa |

---

## 6. Module File — Quản lý tệp đa phương tiện

### 6.1 Lưu trữ

- Tất cả tệp được lưu trên **Cloudflare R2** (S3-compatible).
- Cấu trúc đường dẫn: ảnh → `{email_username}/images/{tên_tệp}`, audio → `{email_username}/videos/{tên_tệp}`.

### 6.2 Quy tắc Upload

| Quy tắc | Giá trị |
|---------|---------|
| Định dạng chấp nhận | JPEG, PNG |
| Dung lượng tối đa / file | 20 MB |
| Dung lượng tối đa / request | 25 MB |
| Cache header | `public, max-age=31536000, immutable` (1 năm) |

### 6.3 Metadata File Asset

Mỗi tệp được lưu thành công sẽ có bản ghi trong bảng `file_asset` gồm: `file_id`, `object_key`, `public_url`, `mime_type`, `file_size`.

---

## 7. Module Audio — Nội dung âm thanh

### 7.1 Tổng quan

Module Audio cho phép vendor tạo nội dung giới thiệu âm thanh đa ngôn ngữ theo hai cách:
1. **TTS (Text-to-Speech)**: nhập văn bản tiếng Việt, hệ thống tự tổng hợp giọng đọc.
2. **Upload thủ công**: vendor tự tải lên file audio MP3.

### 7.2 Tạo Audio TTS đơn ngôn ngữ

1. Vendor gửi văn bản tiếng Việt và ngôn ngữ đích.
2. Google Cloud TTS API tổng hợp audio bytes.
3. File audio được upload lên Cloudflare R2.
4. Bản ghi `audio` được upsert với `status = completed`, liên kết `shop_id`, `language`.
5. Cache audio của shop bị xóa.

### 7.3 Preview TTS

Vendor nhận bytes MP3 stream trực tiếp — không upload, không lưu dữ liệu. Dùng để nghe thử trước khi quyết định lưu.

### 7.4 Tạo Audio TTS tất cả ngôn ngữ cùng lúc

1. Vendor gửi văn bản tiếng Việt.
2. Hệ thống xử lý **6 ngôn ngữ song song** (pool 6 thread): `vi`, `en`, `zh`, `ko`, `ru`, `ja`.
3. Các ngôn ngữ không phải tiếng Việt: Google Translate (VI → đích) rồi mới TTS.
4. Thất bại ở một ngôn ngữ không ảnh hưởng các ngôn ngữ khác.
5. Kết quả trả về dạng Base64 cho từng ngôn ngữ.

### 7.5 Vòng đời Audio

Audio được tạo on-demand, không qua hàng đợi duyệt. Trạng thái mặc định: `completed` ngay sau khi tạo thành công. Cache audio được quản lý bằng `AudioCacheService` (Redis).

---

## 8. Module Location — Phiên du lịch & Vị trí

### 8.1 Tourist Session

Phiên du lịch là đơn vị định danh **ẩn danh**, không yêu cầu đăng nhập, không lưu PII (thông tin cá nhân nhận dạng).

### 8.2 Vòng đời Session

- Tạo với UUID ngẫu nhiên bằng `SecureRandom`.
- TTL: **1 giờ** — enforce ở cả tầng ứng dụng và MongoDB TTL index (tự động xóa document).
- Dữ liệu lưu: `sessionId`, `languagePreference`, `viewedPoiIds`, `playedAudioIds`, `createdAt`, `expiresAt`.
- Cập nhật là **partial update** — chỉ trường không null mới được ghi.

### 8.3 Tích hợp với các module khác

| Tích hợp | Mô tả |
|----------|-------|
| Analytics | `SessionCreatedEvent` → ghi vào `visitor_events` |
| Live visitor count | `VisitorPresenceRegistry` theo dõi WebSocket connections |
| POI Like | `sessionId` dùng làm `X-Session-Id` header |

---

## 9. Module Analytics — Phân tích lượt truy cập

### 9.1 Dữ liệu thu thập

- **Collection MongoDB**: `visitor_events`
- **Trigger**: Sự kiện `SessionCreatedEvent` khi khách tạo tourist session mới.

### 9.2 Thống kê theo khoảng thời gian

| Period | Nhóm theo | Khoảng nhìn lại |
|--------|-----------|----------------|
| `day` | Từng giờ (`HH:00`) | 24 giờ qua |
| `week` | Từng ngày (`YYYY-MM-DD`) | 7 ngày qua |
| `month` | Từng ngày | 30 ngày qua |
| `year` | Từng tháng (`YYYY-MM`) | 365 ngày qua |

Chỉ admin mới có quyền truy cập dữ liệu analytics.

---

## 10. Module Notification — Thông báo

### 10.1 Kiến trúc

- Không expose REST endpoint.
- Hoạt động theo mô hình **event-driven**: module khác phát sự kiện → Notification gửi email.
- Tất cả email được gửi **bất đồng bộ** (`@Async`) bằng Thymeleaf HTML template.

### 10.2 Danh sách email

| Trigger | Người nhận | Nội dung |
|---------|-----------|----------|
| Vendor đăng ký | Vendor | OTP xác thực email 6 chữ số, kèm thời hạn |
| Quên mật khẩu | Vendor | OTP reset mật khẩu 6 chữ số, kèm thời hạn |
| Vendor đăng ký mới | Admin | Email + tên vendor, nhắc kiểm tra |
| Shop mới được nộp | Admin | Tên quán + email vendor, nhắc duyệt |
| Shop được duyệt | Vendor | Tên quán + ghi chú admin |
| Shop bị từ chối | Vendor | Tên quán + lý do từ chối |
| POI được tạo | Vendor | Tên POI xác nhận tạo thành công |
| POI cập nhật tọa độ | Vendor | Tên POI xác nhận cập nhật vị trí |

---

## 11. Module Search — Tìm kiếm

> **Trạng thái hiện tại**: Module là **stub chưa được triển khai** — không có service, controller, hay logic nghiệp vụ nào.

**Chức năng dự kiến:**
- Full-text search trên POI và Shop (tên, mô tả, tag).
- Indexing khi POI/Shop được tạo hoặc cập nhật.
- Hỗ trợ tìm kiếm đa ngôn ngữ.

---

## 12. Module Moderation — Kiểm duyệt nội dung

> **Trạng thái hiện tại**: Module là **stub rỗng** — Maven module được khai báo nhưng không có mã nguồn Java nào.

**Chức năng dự kiến:**
- Phát hiện nội dung vi phạm tự động.
- Lịch sử kiểm duyệt toàn bộ thao tác admin.
- Hệ thống báo cáo nội dung từ người dùng.

---

*Tài liệu này được tổng hợp từ source code thực tế của dự án FlavorTales tính đến ngày 07/04/2026.*
"""


def _br_build_doc(md_text: str, output_path: Path):
    """Same renderer as build_doc but with different cover title."""
    doc = Document()
    for section in doc.sections:
        section.top_margin = Cm(2)
        section.bottom_margin = Cm(2)
        section.left_margin = Cm(2.5)
        section.right_margin = Cm(2.5)
    doc.styles["Normal"].font.name = "Calibri"
    doc.styles["Normal"].font.size = Pt(10)

    HEADING_COLORS = {
        1: ("1F3864", 18),
        2: ("2E75B6", 14),
        3: ("2E4057", 12),
        4: ("404040", 11),
    }

    def _add_heading(level, text):
        para = doc.add_paragraph()
        run = para.add_run(text)
        run.bold = True
        color_hex, size = HEADING_COLORS.get(level, ("000000", 10))
        r, g, b = int(color_hex[0:2], 16), int(color_hex[2:4], 16), int(color_hex[4:6], 16)
        run.font.color.rgb = RGBColor(r, g, b)
        run.font.size = Pt(size)
        run.font.name = "Calibri"
        if level == 1:
            para.paragraph_format.space_before = Pt(18)
            para.paragraph_format.space_after = Pt(6)
            run.underline = True
        elif level == 2:
            para.paragraph_format.space_before = Pt(14)
            para.paragraph_format.space_after = Pt(4)
        elif level == 3:
            para.paragraph_format.space_before = Pt(10)
            para.paragraph_format.space_after = Pt(3)
        else:
            para.paragraph_format.space_before = Pt(6)
            para.paragraph_format.space_after = Pt(2)

    def _add_table(rows):
        if not rows:
            return
        col_count = max(len(r) for r in rows)
        table = doc.add_table(rows=len(rows), cols=col_count)
        table.style = "Table Grid"
        table.alignment = WD_TABLE_ALIGNMENT.CENTER
        for ri, row in enumerate(rows):
            for ci, cell_text in enumerate(row):
                if ci >= col_count:
                    break
                cell = table.cell(ri, ci)
                cell.text = ""
                para = cell.paragraphs[0]
                add_run_with_inline_code(para, cell_text)
                para.paragraph_format.space_before = Pt(2)
                para.paragraph_format.space_after = Pt(2)
                for run in para.runs:
                    run.font.size = Pt(9)
        # header row
        for cell in table.rows[0].cells:
            set_cell_bg(cell, "1F3864")
            for para in cell.paragraphs:
                para.alignment = WD_ALIGN_PARAGRAPH.CENTER
                for run in para.runs:
                    run.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
                    run.bold = True
                    run.font.size = Pt(9)
        # data rows
        for i, row in enumerate(table.rows[1:], start=1):
            bg = "F0F4FA" if i % 2 == 0 else "FFFFFF"
            for cell in row.cells:
                set_cell_bg(cell, bg)
                cell.vertical_alignment = WD_ALIGN_VERTICAL.CENTER
                for para in cell.paragraphs:
                    for run in para.runs:
                        run.font.size = Pt(9)
        doc.add_paragraph()

    def _add_code(code_text):
        para = doc.add_paragraph()
        para.paragraph_format.left_indent = Inches(0.3)
        para.paragraph_format.space_before = Pt(4)
        para.paragraph_format.space_after = Pt(4)
        run = para.add_run(code_text)
        run.font.name = "Courier New"
        run.font.size = Pt(8)
        pPr = para._p.get_or_add_pPr()
        shd = OxmlElement("w:shd")
        shd.set(qn("w:val"), "clear")
        shd.set(qn("w:color"), "auto")
        shd.set(qn("w:fill"), "F4F4F4")
        pPr.append(shd)

    def _add_blockquote(text):
        para = doc.add_paragraph()
        para.paragraph_format.left_indent = Inches(0.4)
        para.paragraph_format.space_before = Pt(2)
        para.paragraph_format.space_after = Pt(2)
        run = para.add_run(text)
        run.italic = True
        run.font.color.rgb = RGBColor(0x55, 0x55, 0x55)
        run.font.size = Pt(9.5)

    # Cover
    cover = doc.add_paragraph()
    cover.alignment = WD_ALIGN_PARAGRAPH.CENTER
    cover.paragraph_format.space_before = Pt(72)
    r = cover.add_run("FlavorTales")
    r.font.size = Pt(28)
    r.bold = True
    r.font.color.rgb = RGBColor(0x1F, 0x38, 0x64)

    sub = doc.add_paragraph()
    sub.alignment = WD_ALIGN_PARAGRAPH.CENTER
    r2 = sub.add_run("Business Requirements Document")
    r2.font.size = Pt(18)
    r2.font.color.rgb = RGBColor(0x40, 0x40, 0x40)

    meta = doc.add_paragraph()
    meta.alignment = WD_ALIGN_PARAGRAPH.CENTER
    meta.paragraph_format.space_before = Pt(12)
    r3 = meta.add_run("Ngày tạo: 07/04/2026   |   Phiên bản: 1.0")
    r3.font.size = Pt(11)
    r3.font.color.rgb = RGBColor(0x70, 0x70, 0x70)

    doc.add_page_break()

    for token in parse_md(md_text):
        kind = token[0]
        if kind in ("h1", "h2", "h3", "h4"):
            level = int(kind[1])
            text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", token[1])
            _add_heading(level, text)
        elif kind == "hr":
            para = doc.add_paragraph()
            para.paragraph_format.space_before = Pt(4)
            para.paragraph_format.space_after = Pt(4)
            pPr = para._p.get_or_add_pPr()
            pBdr = OxmlElement("w:pBdr")
            bottom = OxmlElement("w:bottom")
            bottom.set(qn("w:val"), "single")
            bottom.set(qn("w:sz"), "6")
            bottom.set(qn("w:space"), "1")
            bottom.set(qn("w:color"), "CCCCCC")
            pBdr.append(bottom)
            pPr.append(pBdr)
        elif kind == "code_block":
            _add_code(token[1])
        elif kind == "blockquote":
            _add_blockquote(token[1])
        elif kind == "table":
            _add_table(token[1])
        elif kind == "paragraph":
            text = token[1]
            if not text.strip():
                continue
            is_list = bool(re.match(r"^\s*[-*+]\s+", text)) or bool(re.match(r"^\s*\d+\.\s+", text))
            para = doc.add_paragraph()
            if is_list:
                para.paragraph_format.left_indent = Inches(0.3)
                text = re.sub(r"^\s*[-*+]\s+", "", text)
                text = re.sub(r"^\s*\d+\.\s+", "", text)
            para.paragraph_format.space_before = Pt(1)
            para.paragraph_format.space_after = Pt(1)
            add_run_with_inline_code(para, text)

    doc.save(str(output_path))
    print(f"Saved: {output_path}")


def generate_business_requirements():
    BR_MD.parent.mkdir(parents=True, exist_ok=True)
    content = BR_MD.read_text(encoding="utf-8") if BR_MD.exists() else BR_CONTENT
    if not BR_MD.exists():
        BR_MD.write_text(BR_CONTENT, encoding="utf-8")
        print(f"Saved: {BR_MD}")
    _br_build_doc(content, BR_OUT)


WS_MD = BASE_DIR / "md" / "WebSocket-Requirements.md"
WS_OUT = BASE_DIR / "WebSocket-Requirements.docx"
SA_MD = BASE_DIR / "md" / "System-Architecture.md"
SA_OUT = BASE_DIR / "System-Architecture.docx"


def generate_websocket_requirements():
    if not WS_MD.exists():
        print(f"ERROR: {WS_MD} not found")
        return
    content = WS_MD.read_text(encoding="utf-8")
    _br_build_doc(content, WS_OUT)


def generate_system_architecture():
    if not SA_MD.exists():
        print(f"ERROR: {SA_MD} not found")
        return
    content = SA_MD.read_text(encoding="utf-8")
    _br_build_doc(content, SA_OUT)


DB_MD = BASE_DIR / "md" / "Database-Design.md"
DB_OUT = BASE_DIR / "Database-Design.docx"


def generate_database_design():
    if not DB_MD.exists():
        print(f"ERROR: {DB_MD} not found")
        return
    content = DB_MD.read_text(encoding="utf-8")
    _br_build_doc(content, DB_OUT)


if __name__ == "__main__":
    generate_business_requirements()
    generate_websocket_requirements()
    generate_system_architecture()
    generate_database_design()
