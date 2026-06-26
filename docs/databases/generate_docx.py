"""Generate database-design.docx from HTML content."""
from docx import Document
from docx.shared import Pt, RGBColor, Cm
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

doc = Document()

# ── Page margins ──────────────────────────────────────────────
sec = doc.sections[0]
sec.top_margin    = Cm(2.5)
sec.bottom_margin = Cm(2.5)
sec.left_margin   = Cm(3)
sec.right_margin  = Cm(2)

# ── Colours ───────────────────────────────────────────────────
MYSQL  = RGBColor(0x00, 0x5C, 0x83)
MONGO  = RGBColor(0x00, 0x68, 0x4A)
REDIS  = RGBColor(0xC0, 0x39, 0x2B)
BLUE   = RGBColor(0x3B, 0x82, 0xF6)
DARK   = RGBColor(0x1A, 0x20, 0x2C)
GREY   = RGBColor(0x64, 0x74, 0x8B)
ORANGE = RGBColor(0xE8, 0x5D, 0x2F)

def shd(cell, fill_hex):
    s = OxmlElement('w:shd')
    s.set(qn('w:val'), 'clear')
    s.set(qn('w:color'), 'auto')
    s.set(qn('w:fill'), fill_hex)
    cell._tc.get_or_add_tcPr().append(s)

def p_shd(p, fill_hex):
    s = OxmlElement('w:shd')
    s.set(qn('w:val'), 'clear')
    s.set(qn('w:color'), 'auto')
    s.set(qn('w:fill'), fill_hex)
    p._p.get_or_add_pPr().append(s)

def h1(text, color=DARK):
    p = doc.add_heading(text, level=1)
    r = p.runs[0]; r.font.color.rgb = color; r.font.size = Pt(17)
    p.paragraph_format.space_before = Pt(20); p.paragraph_format.space_after = Pt(6)

def h2(text, color=DARK):
    p = doc.add_heading(text, level=2)
    r = p.runs[0]; r.font.color.rgb = color; r.font.size = Pt(13.5)
    p.paragraph_format.space_before = Pt(14); p.paragraph_format.space_after = Pt(4)

def h3(text, color=DARK):
    p = doc.add_heading(text, level=3)
    r = p.runs[0]; r.font.color.rgb = color; r.font.size = Pt(11.5)
    p.paragraph_format.space_before = Pt(10); p.paragraph_format.space_after = Pt(3)

def body(text, bold=False, size=11):
    p = doc.add_paragraph()
    r = p.add_run(text); r.bold = bold; r.font.size = Pt(size)
    p.paragraph_format.space_after = Pt(4)
    return p

def bullet(text, size=10.5):
    p = doc.add_paragraph(style='List Bullet')
    r = p.add_run(text); r.font.size = Pt(size)
    p.paragraph_format.space_after = Pt(2)
    return p

def callout(text, fill='EFF6FF', size=10.5):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent  = Cm(1)
    p.paragraph_format.right_indent = Cm(1)
    p.paragraph_format.space_before = Pt(5)
    p.paragraph_format.space_after  = Pt(5)
    r = p.add_run(text); r.font.size = Pt(size); r.italic = True
    p_shd(p, fill)
    return p

def code_inline(p, text, size=10):
    r = p.add_run(text)
    r.font.name = 'Courier New'
    r.font.size = Pt(size)
    r.font.color.rgb = RGBColor(0x33, 0x41, 0x55)
    return r

def add_table(headers, rows, col_widths=None):
    t = doc.add_table(rows=1+len(rows), cols=len(headers))
    t.style = 'Table Grid'
    # header
    hrow = t.rows[0]
    for i, h in enumerate(headers):
        c = hrow.cells[i]; c.text = h
        c.paragraphs[0].runs[0].bold = True
        c.paragraphs[0].runs[0].font.size = Pt(10)
        c.paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF,0xFF,0xFF)
        shd(c, '1A4A7A')
    # data
    for ri, row in enumerate(rows):
        trow = t.rows[ri+1]
        fill = 'F8FAFC' if ri%2==1 else 'FFFFFF'
        for ci, val in enumerate(row):
            c = trow.cells[ci]
            c.text = val
            c.paragraphs[0].runs[0].font.size = Pt(9.5)
            shd(c, fill)
    doc.add_paragraph()

def page_break():
    doc.add_page_break()

# ══════════════════════════════════════════════════════════════
# COVER
# ══════════════════════════════════════════════════════════════
tp = doc.add_paragraph()
tp.alignment = WD_ALIGN_PARAGRAPH.CENTER
tp.paragraph_format.space_before = Pt(60)
r = tp.add_run("FLAVORTALES"); r.bold=True; r.font.size=Pt(30); r.font.color.rgb=MYSQL

sp = doc.add_paragraph()
sp.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = sp.add_run("Tài liệu Thiết kế Cơ sở Dữ liệu"); r.font.size=Pt(18); r.font.color.rgb=DARK

lp = doc.add_paragraph()
lp.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = lp.add_run("─"*45); r.font.color.rgb=MYSQL

mp = doc.add_paragraph()
mp.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = mp.add_run("MySQL 8.0  ·  MongoDB 7  ·  Redis 7.2\nPhiên bản 1.0  ·  Ngày: 10/05/2026")
r.font.size=Pt(12); r.font.color.rgb=GREY

page_break()

# ══════════════════════════════════════════════════════════════
# MỤC LỤC
# ══════════════════════════════════════════════════════════════
h1("Mục lục", MYSQL)
toc = [
    "1. Tổng quan kiến trúc",
    "   1.1. MySQL 8.0 – Relational Database",
    "   1.2. MongoDB 7 – Document Store",
    "   1.3. Redis 7.2 – Cache Layer",
    "   1.4. Luồng dữ liệu giữa các database",
    "2. MySQL – Chi tiết các bảng",
    "   2.1. Module: Users & Authentication",
    "        user, email_verification, login_attempt, password_reset_token",
    "   2.2. Module: POI Management",
    "        poi, poi_*language*, poi_likes",
    "   2.3. Module: Content (Shop & Menu)",
    "        shop, shop_*language*, menu_item, shop_image",
    "   2.4. Module: Audio Guide",
    "        audio",
    "   2.5. Module: File Asset",
    "        file_asset",
    "3. MongoDB – Collections",
    "   3.1. tourist_sessions (24h TTL)",
    "   3.2. visitor_events (Permanent)",
    "4. Redis – Cache Layer",
    "   4.1. POI Cache Module",
    "   4.2. Audio Cache Module",
    "   4.3. Tổng hợp TTL & Key Patterns",
    "5. Tóm tắt",
]
for item in toc:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(2)
    p.add_run(item).font.size = Pt(11)

page_break()

# ══════════════════════════════════════════════════════════════
# 1. TỔNG QUAN KIẾN TRÚC
# ══════════════════════════════════════════════════════════════
h1("1. Tổng quan kiến trúc", BLUE)
body(
    "FlavorTales sử dụng mô hình đa cơ sở dữ liệu (polyglot persistence), mỗi loại được chọn lựa "
    "dựa trên đặc điểm dữ liệu và yêu cầu truy xuất riêng biệt của từng nghiệp vụ."
)

h2("1.1. MySQL 8.0 – Relational Database", MYSQL)
body("Vai trò: Primary source of truth cho toàn bộ dữ liệu nghiệp vụ.", bold=True)
bullet("Dữ liệu nghiệp vụ cốt lõi: user, POI, shop, menu item, audio metadata")
bullet("Giao dịch ACID, quan hệ khóa ngoại chặt chẽ")
bullet("Đa ngôn ngữ qua bảng dịch riêng biệt (EN / KO / ZH / RU / JA)")
bullet("File asset metadata (binary object lưu tại Cloudflare R2)")
bullet("Audit trail: login attempts, email verification, password reset token")
body("")
add_table(
    ["Thống kê", "Giá trị"],
    [["Tổng số bảng", "24"], ["Số module", "6"], ["Ngôn ngữ hỗ trợ", "5 (vi, en, ko, zh, ru, ja)"],
     ["Replication", "Primary + Read Replica (GTID)"], ["Phiên bản", "MySQL 8.0"]]
)

h2("1.2. MongoDB 7 – Document Store", MONGO)
body("Vai trò: Lưu trữ dữ liệu không cấu trúc, schema linh hoạt.", bold=True)
bullet("Tourist session tracking – ẩn danh (UUID), không lưu PII, TTL 24h")
bullet("Visitor analytics events – lưu vĩnh viễn cho dashboard analytics")
bullet("Auto-cleanup qua MongoDB TTL index (background job ~60s)")
bullet("Driven bởi Spring ApplicationEvent (event-driven architecture)")
body("")
add_table(
    ["Collection", "Mục đích", "TTL"],
    [["tourist_sessions", "Tracking ẩn danh session du khách", "24 giờ (tự xóa)"],
     ["visitor_events",  "Analytics event mỗi session",       "Không có TTL (lưu vĩnh viễn)"]]
)

h2("1.3. Redis 7.2 – Cache Layer", REDIS)
body("Vai trò: Read-through cache, giảm tải cho MySQL.", bold=True)
bullet("POI list & detail cache (1h TTL)")
bullet("Audio list theo shop/POI (15 phút TTL)")
bullet("CDN URL cache cho Cloudflare R2 objects (7 ngày TTL)")
bullet("TTS processing status polling (30 giây TTL khi đang xử lý)")
bullet("Graceful Degradation – Redis failure không ảnh hưởng tới service (fallback về DB)")
body("")
add_table(
    ["Cấu hình", "Giá trị"],
    [["Host/Port", "localhost:6379 (env: REDIS_HOST / REDIS_PORT)"],
     ["Connection Pool (Jedis)", "max-active: 8 / max-idle: 8 / max-wait: 1000ms"],
     ["Serialization", "Jackson JSON + JavaTimeModule"],
     ["Redis Beans", "poiRedisTemplate (@Primary) + audioRedisTemplate"],
     ["Số key patterns", "7 patterns / 2 modules"]]
)

h2("1.4. Luồng dữ liệu giữa các database", BLUE)
add_table(
    ["Nguồn", "Luồng", "Đích"],
    [
        ["user (MySQL)",       "Tạo tourist session",          "tourist_sessions (MongoDB)"],
        ["tourist_sessions",   "Spring ApplicationEvent",      "visitor_events (MongoDB)"],
        ["poi (MySQL)",        "Read-through cache",           "poi:{id} (Redis)"],
        ["audio (MySQL)",      "Cache list + CDN URL",         "audio:shop:{id} / audio:url:{id} (Redis)"],
        ["file_asset (MySQL)", "Metadata; binary object lưu tại","Cloudflare R2"],
    ]
)

page_break()

# ══════════════════════════════════════════════════════════════
# 2. MYSQL
# ══════════════════════════════════════════════════════════════
h1("2. MySQL – Chi tiết các bảng", MYSQL)

# 2.1 Users & Auth
h2("2.1. Module: Users & Authentication", MYSQL)

h3("Bảng: user")
body("Bảng trung tâm lưu thông tin tài khoản vendor và admin.")
add_table(
    ["Column", "Type", "Key", "Default", "Mô tả"],
    [
        ["user_id",             "INT AUTO_INCREMENT",   "PK",      "—",                    "Primary key"],
        ["email",               "VARCHAR(255)",         "UNIQUE",  "—",                    "Email đăng nhập, dùng làm định danh"],
        ["password_hash",       "VARCHAR(255)",         "—",       "—",                    "BCrypt hash – không lưu plain text"],
        ["role",                "ENUM('vendor','admin')","—",      "—",                    "Phân quyền hệ thống"],
        ["full_name",           "VARCHAR(100)",         "—",       "—",                    "Tên hiển thị"],
        ["phone",               "VARCHAR(20)",          "—",       "NULL",                 "Số điện thoại (tùy chọn)"],
        ["status",              "ENUM(active|inactive|pending|rejected|suspended|disabled)", "—", "'inactive'",
         "Trạng thái tài khoản; chuyển sang active sau xác thực email"],
        ["password_changed_at", "TIMESTAMP NULL",       "—",       "NULL",                 "Set khi đổi mật khẩu; dùng để invalidate JWT cũ"],
        ["created_at",          "TIMESTAMP",            "IDX",     "CURRENT_TIMESTAMP",    ""],
        ["updated_at",          "TIMESTAMP",            "—",       "ON UPDATE",            ""],
    ]
)
callout("Indexes: idx_email, idx_role_status, idx_created_at", 'E8F4FB')

h3("Bảng: email_verification")
body("Lưu OTP 6 chữ số gửi qua email để xác thực tài khoản mới.")
add_table(
    ["Column", "Type", "Key", "Mô tả"],
    [
        ["verification_id",   "INT AUTO_INCREMENT", "PK",        "Primary key"],
        ["user_id",           "INT",                "FK → user", "ON DELETE CASCADE"],
        ["verification_code", "VARCHAR(6)",         "IDX",       "6-digit OTP gửi qua email"],
        ["expires_at",        "TIMESTAMP",          "IDX",       "Thời hạn hiệu lực OTP"],
        ["is_verified",       "BOOLEAN",            "—",         "Đánh dấu đã xác thực thành công"],
        ["created_at",        "TIMESTAMP",          "—",         ""],
    ]
)

h3("Bảng: login_attempt")
body("Ghi lại mọi lần thử đăng nhập để phát hiện và ngăn chặn brute-force (rate-limiting).")
add_table(
    ["Column", "Type", "Mô tả"],
    [
        ["id",           "BIGINT AUTO_INCREMENT", "Primary key"],
        ["identifier",   "VARCHAR(255)",          "Email dùng khi login (normalized)"],
        ["success",      "BOOLEAN",               "FALSE = thất bại"],
        ["locked_until", "TIMESTAMP NULL",        "Non-null trên lockout sentinel rows; dùng rate-limit"],
        ["attempted_at", "TIMESTAMP",             "Thời điểm thử đăng nhập"],
    ]
)

h3("Bảng: password_reset_token")
body("Lưu token reset mật khẩu (OTP 6 số, cryptographically random, hết hạn sau 30 phút).")
add_table(
    ["Column", "Type", "Key", "Mô tả"],
    [
        ["id",         "BIGINT AUTO_INCREMENT", "PK",        ""],
        ["user_id",    "INT",                   "FK → user", "ON DELETE CASCADE"],
        ["token",      "CHAR(6)",               "UNIQUE",    "Cryptographically random 6-digit numeric code"],
        ["expires_at", "TIMESTAMP",             "IDX",       "Hết hạn sau 30 phút"],
        ["is_used",    "BOOLEAN",               "—",         "TRUE sau khi đã sử dụng (single-use)"],
    ]
)

# 2.2 POI
h2("2.2. Module: POI Management", MYSQL)

h3("Bảng: poi")
body("Điểm tham quan địa lý – trung tâm của toàn bộ hệ thống geofencing.")
add_table(
    ["Column", "Type", "Key", "Default", "Mô tả"],
    [
        ["poi_id",    "INT AUTO_INCREMENT",                              "PK",       "—",         "Primary key"],
        ["vendor_id", "INT",                                             "FK → user","—",         "Vendor sở hữu POI này"],
        ["name",      "VARCHAR(255)",                                    "—",        "—",         "Tên POI (tiếng Việt gốc)"],
        ["latitude",  "DECIMAL(10,8)",                                   "IDX",      "—",         "Vĩ độ địa lý"],
        ["longitude", "DECIMAL(11,8)",                                   "IDX",      "—",         "Kinh độ địa lý"],
        ["radius",    "DECIMAL(8,2)",                                    "—",        "—",         "Bán kính geofence (mét)"],
        ["address",   "VARCHAR(500)",                                    "—",        "NULL",      "Địa chỉ dạng text"],
        ["status",    "ENUM(pending|active|inactive|rejected|deleted)",  "IDX",      "'pending'", "Workflow phê duyệt admin"],
        ["likes_count","INT UNSIGNED",                                   "—",        "0",         "Denormalized counter từ poi_likes"],
        ["deleted_at","TIMESTAMP NULL",                                  "—",        "NULL",      "Soft delete – 30 ngày recovery window"],
    ]
)
callout("Indexes: idx_status, idx_vendor, idx_location (latitude, longitude)", 'E8F4FB')

h3("Bảng: poi_english / poi_korean / poi_chinese / poi_russian / poi_japanese")
body(
    "5 bảng dịch theo mô hình 1:1 per language. "
    "Mỗi bảng có poi_id vừa là PK vừa là FK → poi(poi_id) ON DELETE CASCADE. "
    "Các trường dịch: name, address. "
    "Các trường địa lý (latitude, longitude, radius) được denormalize để truy vấn thuận tiện."
)

h3("Bảng: poi_likes")
body("Lưu lượt thích POI từ tourist session (ẩn danh).")
add_table(
    ["Column", "Type", "Key", "Mô tả"],
    [
        ["poi_id",     "INT",          "PK (composite)", "FK → poi"],
        ["session_id", "VARCHAR(36)",  "PK (composite)", "Anonymous tourist session UUID – không lưu PII"],
        ["created_at", "TIMESTAMP",   "—",              ""],
    ]
)

# 2.3 Content
h2("2.3. Module: Content (Shop & Menu)", MYSQL)

h3("Bảng: shop")
body("Gian hàng ẩm thực của vendor, có thể gắn với một POI.")
add_table(
    ["Column", "Type", "Key", "Default", "Mô tả"],
    [
        ["shop_id",        "INT AUTO_INCREMENT",                          "PK",            "—",        ""],
        ["vendor_id",      "INT",                                         "FK → user",     "—",        "ON DELETE RESTRICT"],
        ["poi_id",         "INT",                                         "FK → poi",      "NULL",     "ON DELETE SET NULL; shop tồn tại không cần POI"],
        ["avatar_file_id", "INT",                                         "FK → file_asset","NULL",    "ON DELETE SET NULL"],
        ["name",           "VARCHAR(255)",                                "—",             "—",        "Tên gian hàng"],
        ["description",    "TEXT",                                        "—",             "NULL",     ""],
        ["cuisine_style",  "VARCHAR(100)",                                "—",             "NULL",     "Phong cách ẩm thực"],
        ["featured_dish",  "VARCHAR(255)",                                "—",             "NULL",     "Món đặc trưng"],
        ["status",         "ENUM(pending|active|rejected|disabled)",      "IDX",           "'pending'","Workflow phê duyệt admin"],
        ["tags",           "JSON",                                        "—",             "NULL",     "Array tag strings, tối đa 5"],
        ["opening_hours",  "JSON",                                        "—",             "NULL",     "Array {day, open, close, closed}"],
        ["draft_data",     "JSON",                                        "—",             "NULL",     "Auto-save draft payload (frontend form state)"],
    ]
)
callout("Indexes: idx_vendor_id, idx_poi_id, idx_status", 'E8F4FB')

h3("Bảng: shop_english / shop_korean / shop_chinese / shop_russian / shop_japanese")
body(
    "5 bảng dịch 1:1-per-language. FK shop_id → shop(shop_id) ON DELETE CASCADE. "
    "Các trường dịch: name, description, cuisine_style, featured_dish. "
    "Bổ sung: tags (JSON), opening_hours (JSON) riêng per-language."
)

h3("Bảng: menu_item")
body("Món ăn trong thực đơn của gian hàng.")
add_table(
    ["Column", "Type", "Key", "Mô tả"],
    [
        ["item_id",       "INT AUTO_INCREMENT",                     "PK",            ""],
        ["shop_id",       "INT",                                    "FK → shop",     "ON DELETE CASCADE"],
        ["image_file_id", "INT",                                    "FK → file_asset","ON DELETE SET NULL"],
        ["name",          "VARCHAR(255)",                           "—",             "Tên món ăn"],
        ["description",   "TEXT",                                   "—",             ""],
        ["status",        "ENUM(pending|active|rejected|disabled)", "IDX",           ""],
    ]
)

h3("Bảng: shop_image")
body("Gallery ảnh của gian hàng, hỗ trợ sắp xếp thứ tự.")
add_table(
    ["Column", "Type", "Mô tả"],
    [
        ["id",         "INT AUTO_INCREMENT", "PK"],
        ["shop_id",    "INT",                "FK → shop, ON DELETE CASCADE"],
        ["file_id",    "INT",                "FK → file_asset, ON DELETE CASCADE"],
        ["sort_order", "INT",                "Thứ tự hiển thị gallery; drag-to-reorder cập nhật field này"],
    ]
)

# 2.4 Audio
h2("2.4. Module: Audio Guide", MYSQL)

h3("Bảng: audio")
body(
    "Metadata của file audio hướng dẫn, hỗ trợ nhiều ngôn ngữ và cả upload thủ công lẫn TTS tự động."
)
add_table(
    ["Column", "Type", "Key", "Mô tả"],
    [
        ["audio_id",          "INT AUTO_INCREMENT",                    "PK",            ""],
        ["shop_id",           "INT",                                   "FK → shop",     "ON DELETE CASCADE. Mỗi shop tối đa 1 audio/ngôn ngữ"],
        ["poi_id",            "INT NULL",                              "FK → poi",      "ON DELETE SET NULL; nullable"],
        ["file_id",           "INT",                                   "FK → file_asset","ON DELETE RESTRICT"],
        ["uploaded_by",       "INT",                                   "FK → user",     "vendor user_id"],
        ["language_code",     "VARCHAR(10)",                           "UNIQUE(shop,lang)","vi | en | zh"],
        ["duration_seconds",  "DECIMAL(8,2) NULL",                    "—",             "Thời lượng audio (giây); NULL khi chưa xác định"],
        ["tts_provider",      "VARCHAR(50) NULL",                     "—",             "fpt_ai | google_tts | upload"],
        ["processing_status", "ENUM(processing|completed|failed)",    "IDX",           "Trạng thái TTS async job"],
        ["status",            "ENUM(pending|active|rejected|disabled)","IDX",          "Admin approval workflow"],
    ]
)
callout("Unique constraint: uq_shop_language (shop_id, language_code) – mỗi shop chỉ có 1 audio per ngôn ngữ", 'E8F4FB')

# 2.5 File Asset
h2("2.5. Module: File Asset", MYSQL)

h3("Bảng: file_asset")
body(
    "Lưu metadata của mọi file được upload. Binary object được lưu tại Cloudflare R2; "
    "bảng này chỉ giữ thông tin metadata (không lưu binary data trong DB)."
)
add_table(
    ["Column", "Type", "Key", "Mô tả"],
    [
        ["file_id",    "INT AUTO_INCREMENT",                     "PK",       ""],
        ["owner_id",   "INT",                                    "FK → user","ON DELETE RESTRICT"],
        ["bucket",     "VARCHAR(100)",                           "IDX",      "Cloudflare R2 bucket name"],
        ["object_key", "VARCHAR(1000)",                          "IDX",      "R2 object key/path"],
        ["file_url",   "VARCHAR(1000)",                          "—",        "Public hoặc pre-signed URL gốc"],
        ["file_type",  "ENUM(image|audio|document|other)",       "IDX",      ""],
        ["mime_type",  "VARCHAR(100)",                           "—",        ""],
        ["size_bytes", "BIGINT UNSIGNED",                        "—",        "Kích thước file (bytes)"],
        ["checksum",   "VARCHAR(64)",                            "—",        "SHA-256 checksum để verify integrity"],
        ["version",    "INT UNSIGNED",                           "—",        "1=default; tăng khi replace file"],
        ["status",     "ENUM(active|deleted)",                   "IDX",      "Soft delete"],
        ["deleted_at", "TIMESTAMP NULL",                         "—",        ""],
    ]
)
callout("Indexes: idx_owner, idx_file_type, idx_bucket_key, idx_status", 'E8F4FB')

page_break()

# ══════════════════════════════════════════════════════════════
# 3. MONGODB
# ══════════════════════════════════════════════════════════════
h1("3. MongoDB – Collections", MONGO)
body(
    "MongoDB được sử dụng cho hai use case riêng biệt: tracking session ngắn hạn (ẩn danh) "
    "và lưu trữ analytics events dài hạn. Cả hai collection đều được driven bởi "
    "Spring ApplicationEvent, không phải gọi trực tiếp từ controller."
)

h2("3.1. Collection: tourist_sessions (24h TTL)", MONGO)
body(
    "Lưu session ẩn danh của tourist. Tự động xóa sau 24 giờ qua MongoDB TTL index. "
    "Không lưu bất kỳ thông tin cá nhân (PII) nào."
)
add_table(
    ["Field", "BSON Type", "Index", "Mô tả"],
    [
        ["_id (sessionId)",     "String",       "PK",                       "Random UUID – unpredictable, non-sequential (bảo mật)"],
        ["language_preference", "String",       "—",                        "BCP-47 tag (vi, en, zh). Default: vi"],
        ["viewed_poi_ids",      "Array<Int32>", "—",                        "Danh sách poi_id đã xem – ref tới MySQL poi.poi_id"],
        ["played_audio_ids",    "Array<Int32>", "—",                        "Danh sách audio_id đã phát – ref tới MySQL audio.audio_id"],
        ["created_at",          "Date",         "—",                        "Thời điểm tạo session"],
        ["expires_at",          "Date",         "TTL (expireAfterSeconds=0)","Hết hạn sau 24h; MongoDB tự xóa khi expires_at < now"],
    ]
)
callout(
    "TTL Index: MongoDB background job chạy mỗi ~60 giây để xóa các document hết hạn. "
    "expireAfterSeconds=0 nghĩa là xóa ngay khi expires_at đạt đến thời điểm hiện tại.",
    'E6F4F1'
)

body("Sample document:")
p = doc.add_paragraph()
p.paragraph_format.left_indent = Cm(1)
p_shd(p, 'F0F0F8')
code_inline(p,
    '{\n'
    '  "_id": "f47ac10b-58cc-4372-a567-0e02b2c3d479",\n'
    '  "language_preference": "en",\n'
    '  "viewed_poi_ids": [12, 34, 56],\n'
    '  "played_audio_ids": [7, 22],\n'
    '  "created_at": ISODate("2026-04-08T09:00:00Z"),\n'
    '  "expires_at": ISODate("2026-04-09T09:00:00Z")  // auto-deleted by TTL\n'
    '}'
, size=9.5)
doc.add_paragraph()

h2("3.2. Collection: visitor_events (Permanent)", MONGO)
body(
    "Lưu analytics event record cho mỗi tourist session. Không có TTL – giữ lại vĩnh viễn "
    "để phân tích lịch sử lượng khách. Sử dụng MongoTemplate aggregation cho dashboard."
)
add_table(
    ["Field", "BSON Type", "Index", "Mô tả"],
    [
        ["_id (id)",  "String", "PK",          "UUID auto-generated"],
        ["timestamp", "Date",   "@Indexed",     "Thời điểm visit; dùng cho time-range aggregation (daily/weekly/monthly)"],
    ]
)
callout(
    "Aggregation: group by date → count visitors per day/week/month cho analytics dashboard admin. "
    "Không có TTL – retained indefinitely.",
    'E6F4F1'
)

body("Sample document:")
p = doc.add_paragraph()
p.paragraph_format.left_indent = Cm(1)
p_shd(p, 'F0F0F8')
code_inline(p,
    '{\n'
    '  "_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",\n'
    '  "timestamp": ISODate("2026-04-08T09:00:05Z")  // indexed for analytics\n'
    '}'
, size=9.5)
doc.add_paragraph()

page_break()

# ══════════════════════════════════════════════════════════════
# 4. REDIS
# ══════════════════════════════════════════════════════════════
h1("4. Redis – Cache Layer", REDIS)
body(
    "Redis đóng vai trò cache layer read-through cho hai module chính: POI và Audio. "
    "Chiến lược Graceful Degradation đảm bảo mọi Redis exception đều được catch và fallback "
    "về MySQL query – lỗi Redis không bao giờ propagate lên caller hoặc ảnh hưởng UX."
)

h2("4.1. POI Cache Module (PoiCacheService)", REDIS)
add_table(
    ["Key Pattern", "Value Type", "TTL", "Mục đích", "Invalidate khi"],
    [
        ["poi:{poiId}",    "JSON Object (PoiResponse)",        "1 giờ", "Cache chi tiết 1 POI",              "POI được update hoặc đổi status"],
        ["poi:list:active","JSON Array (List<PoiResponse>)",   "1 giờ", "Danh sách tất cả active POI",        "POI mới được approve hoặc deactivated"],
    ]
)
callout(
    "RedisTemplate: poiRedisTemplate (@Primary). "
    "Serialization: Jackson JSON với JavaTimeModule và PROPERTY polymorphic type info.",
    'FDF2F1'
)

h2("4.2. Audio Cache Module (AudioCacheService)", REDIS)
add_table(
    ["Key Pattern", "Value Type", "TTL", "Mục đích", "Invalidate khi"],
    [
        ["audio:shop:{shopId}",   "JSON Array (List<AudioResponse>)", "15 phút",   "Vendor-facing: danh sách audio của shop",              "Upload, update, delete audio của shop"],
        ["audio:poi:{poiId}",     "JSON Array (List<AudioResponse>)", "15 phút",   "Tourist-facing: audio guide cho shops trong 1 POI",    "Audio liên kết với POI thay đổi"],
        ["audio:url:{audioId}",   "String (CDN URL)",                 "7 ngày",    "Cloudflare R2 pre-signed/public URL (immutable)",      "Audio bị delete/replace"],
        ["audio:duration:{audioId}","String (Double seconds)",        "24 giờ",    "Thời lượng audio – không đổi sau upload hoàn tất",    "Audio bị delete"],
        ["audio:status:{audioId}","String (enum status)",             "30s / 24h", "Polling TTS async job status (adaptive TTL)",          "Auto-expire hoặc khi audio bị delete"],
    ]
)
callout(
    "TTL adaptive cho audio:status: 30 giây khi processing (client poll thường xuyên), "
    "24 giờ khi completed hoặc failed. "
    "RedisTemplate: audioRedisTemplate (bean riêng biệt với poiRedisTemplate).",
    'FDF2F1'
)

h2("4.3. Tổng hợp TTL & Key Patterns", REDIS)
add_table(
    ["Key Pattern", "Redis Type", "TTL", "Module", "Ghi chú"],
    [
        ["poi:{poiId}",             "String (JSON)", "1 giờ",    "POI",   "Single POI detail"],
        ["poi:list:active",         "String (JSON)", "1 giờ",    "POI",   "All active POIs list"],
        ["audio:shop:{shopId}",     "String (JSON)", "15 phút",  "Audio", "Audio list per shop"],
        ["audio:poi:{poiId}",       "String (JSON)", "15 phút",  "Audio", "Audio list per POI"],
        ["audio:url:{audioId}",     "String",        "7 ngày",   "Audio", "R2 CDN URL (immutable)"],
        ["audio:duration:{audioId}","String",        "24 giờ",   "Audio", "Duration seconds"],
        ["audio:status:{audioId}",  "String",        "30s / 24h","Audio", "TTS job status (adaptive TTL)"],
    ]
)

page_break()

# ══════════════════════════════════════════════════════════════
# 5. TÓM TẮT
# ══════════════════════════════════════════════════════════════
h1("5. Tóm tắt", BLUE)

add_table(
    ["Database", "Vai trò", "Số thực thể", "Đặc điểm nổi bật"],
    [
        ["MySQL 8.0",  "Primary source of truth – dữ liệu nghiệp vụ", "24 bảng / 6 module",
         "ACID, FK, GTID replication, i18n 5 ngôn ngữ, soft delete"],
        ["MongoDB 7",  "Document store – session & analytics",          "2 collections",
         "TTL auto-cleanup, schema linh hoạt, event-driven, không PII"],
        ["Redis 7.2",  "Cache layer – giảm tải DB",                    "7 key patterns",
         "Graceful degradation, adaptive TTL, read-through"],
        ["Cloudflare R2","Object storage – binary assets",             "N/A",
         "Binary object; metadata trong MySQL file_asset"],
    ]
)

body("Nguyên tắc thiết kế:", bold=True)
bullet("Privacy by design: tọa độ GPS và session tourist không lưu PII – chỉ dùng UUID ẩn danh.")
bullet("Separation of concerns: mỗi database phục vụ đúng use case của mình.")
bullet("Resilience: Redis failure không làm sập service; TTL index tự động dọn dẹp MongoDB.")
bullet("Scalability: MySQL read replica nhận toàn bộ read traffic; Redis giảm >90% DB query cho POI/Audio.")
bullet("Traceability: Audit trail đầy đủ qua login_attempt, email_verification, password_reset_token.")
bullet("Đa ngôn ngữ: mô hình 1:1 per language table cho phép query đơn giản, không JOIN phức tạp.")

doc.add_paragraph()
fp = doc.add_paragraph()
fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = fp.add_run("FlavorTales © 2026 — Tài liệu Database Design v1.0 — Nội bộ")
r.font.size = Pt(9); r.font.color.rgb = GREY

# ── Save ─────────────────────────────────────────────────────
out = r"d:\Codes\Seminar\Source Code\docs\databases\database-design.docx"
doc.save(out)
print(f"Saved: {out}")
