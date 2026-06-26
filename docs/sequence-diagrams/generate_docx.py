"""Generate sequence-diagrams.docx for FlavorTales – all 8 diagrams."""
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
ORANGE = RGBColor(0xF9, 0x73, 0x16)
DARK   = RGBColor(0x1E, 0x29, 0x3B)
GREY   = RGBColor(0x64, 0x74, 0x8B)
BLUE   = RGBColor(0x1D, 0x4E, 0xD8)
GREEN  = RGBColor(0x05, 0x96, 0x69)
RED    = RGBColor(0xDC, 0x26, 0x26)
PURPLE = RGBColor(0x7C, 0x3A, 0xED)

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
    p.paragraph_format.space_before = Pt(22); p.paragraph_format.space_after = Pt(6)

def h2(text, color=DARK):
    p = doc.add_heading(text, level=2)
    r = p.runs[0]; r.font.color.rgb = color; r.font.size = Pt(13)
    p.paragraph_format.space_before = Pt(14); p.paragraph_format.space_after = Pt(4)

def h3(text, color=DARK):
    p = doc.add_heading(text, level=3)
    r = p.runs[0]; r.font.color.rgb = color; r.font.size = Pt(11)
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

def note(text, fill='FFFBEB', size=10.5):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent  = Cm(0.8)
    p.paragraph_format.right_indent = Cm(0.8)
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after  = Pt(6)
    r = p.add_run(text); r.font.size = Pt(size); r.italic = True
    p_shd(p, fill)

def code_block(text, size=9):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.8)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run(text); r.font.name = 'Courier New'; r.font.size = Pt(size)
    r.font.color.rgb = RGBColor(0x1E, 0x29, 0x3B)
    p_shd(p, 'F1F5F9')

def add_table(headers, rows):
    t = doc.add_table(rows=1+len(rows), cols=len(headers))
    t.style = 'Table Grid'
    hrow = t.rows[0]
    for i, h in enumerate(headers):
        c = hrow.cells[i]; c.text = h
        c.paragraphs[0].runs[0].bold = True
        c.paragraphs[0].runs[0].font.size = Pt(10)
        c.paragraphs[0].runs[0].font.color.rgb = RGBColor(0xFF,0xFF,0xFF)
        shd(c, '1E3A5F')
    for ri, row in enumerate(rows):
        trow = t.rows[ri+1]
        fill = 'F8FAFC' if ri%2==1 else 'FFFFFF'
        for ci, val in enumerate(row):
            c = trow.cells[ci]; c.text = val
            c.paragraphs[0].runs[0].font.size = Pt(9.5)
            shd(c, fill)
    doc.add_paragraph()

def page_break():
    doc.add_page_break()

def diag_header(num, title, endpoint=''):
    """Orange-band section header for a diagram phase."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(10)
    p.paragraph_format.space_after  = Pt(2)
    r = p.add_run(f"  {num}  {title}")
    r.bold = True; r.font.size = Pt(12); r.font.color.rgb = RGBColor(0xFF,0xFF,0xFF)
    p_shd(p, 'F97316')
    if endpoint:
        ep = doc.add_paragraph()
        ep.paragraph_format.left_indent = Cm(0.5)
        ep.paragraph_format.space_after = Pt(4)
        rr = ep.add_run(endpoint); rr.font.size = Pt(9.5); rr.font.color.rgb = PURPLE
        rr.italic = True

def actors(lst):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.5)
    p.paragraph_format.space_after = Pt(4)
    r = p.add_run("Actors: "); r.bold=True; r.font.size=Pt(10)
    r2 = p.add_run(lst); r2.font.size=Pt(10); r2.font.color.rgb=GREY

def step(num, text, size=10.5):
    p = doc.add_paragraph()
    p.paragraph_format.left_indent = Cm(0.5)
    p.paragraph_format.space_after = Pt(2)
    r = p.add_run(f"{num}. {text}"); r.font.size=Pt(size)

def sep():
    doc.add_paragraph()

# ══════════════════════════════════════════════════════════════
# COVER
# ══════════════════════════════════════════════════════════════
tp = doc.add_paragraph()
tp.alignment = WD_ALIGN_PARAGRAPH.CENTER
tp.paragraph_format.space_before = Pt(60)
r = tp.add_run("FLAVORTALES"); r.bold=True; r.font.size=Pt(32); r.font.color.rgb=ORANGE

sp = doc.add_paragraph()
sp.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = sp.add_run("Tài liệu Sequence Diagrams"); r.font.size=Pt(20); r.font.color.rgb=DARK

lp = doc.add_paragraph()
lp.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = lp.add_run("─"*50); r.font.color.rgb=ORANGE

mp = doc.add_paragraph()
mp.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = mp.add_run("8 Luồng nghiệp vụ quan trọng · Dựa trên source code thực tế\nPhiên bản 1.0  ·  Ngày: 10/05/2026")
r.font.size=Pt(12); r.font.color.rgb=GREY

page_break()

# ══════════════════════════════════════════════════════════════
# MỤC LỤC
# ══════════════════════════════════════════════════════════════
h1("Mục lục", ORANGE)
toc = [
    "1. Tourist Check-in / Geofence Detection (4 phases)",
    "2. POI Creation & Admin Approval Workflow (4 phases + status lifecycle)",
    "3. Shop + Menu Item Creation & Admin Approval (3 steps)",
    "4. Tourist Browse Nearby POIs with Redis Cache (3 phases)",
    "5. Image Upload to Cloudflare R2 (3 flows)",
    "6. Audio Upload & TTS Generation (4 phases)",
    "7. Audio Translation – Multi-language TTS (4 phases)",
    "8. Realtime Tourist Tracking – WebSocket/STOMP (4 phases)",
    "Phụ lục: Bảng tổng hợp API Endpoints & kiến trúc tổng thể",
]
for item in toc:
    p = doc.add_paragraph()
    p.paragraph_format.space_after = Pt(2)
    p.add_run(item).font.size = Pt(11)

page_break()

# ══════════════════════════════════════════════════════════════
# GIỚI THIỆU
# ══════════════════════════════════════════════════════════════
h1("Giới thiệu", ORANGE)
body(
    "Tài liệu này mô tả chi tiết 8 sequence diagram quan trọng của nền tảng FlavorTales – "
    "hệ thống food-tourism kết nối vendor ẩm thực và du khách. "
    "Tất cả luồng được xây dựng dựa trên source code thực tế (Java 21, Spring Boot 3.5, Next.js 15)."
)
add_table(
    ["Stack", "Công nghệ"],
    [
        ["Backend", "Java 21 · Spring Boot 3.5 · Spring Security (JWT stateless)"],
        ["Frontend", "Next.js 15 · React 19 · TypeScript · react-leaflet"],
        ["Database", "MySQL 8.0 (Primary + Replica GTID) · MongoDB 7 · Redis 7.2"],
        ["File Storage", "Cloudflare R2 (S3-compatible) via AWS SDK v2"],
        ["TTS / Translation", "Google Cloud TTS API · Google Cloud Translation API"],
        ["Realtime", "WebSocket / STOMP (SockJS fallback) · Spring SimpMessagingTemplate"],
        ["Auth", "JWT (JJWT 0.12.6) · HTTP-only cookies · ROLE_vendor / ROLE_admin"],
    ]
)

page_break()

# ══════════════════════════════════════════════════════════════
# DIAGRAM 1 – GEOFENCE DETECTION
# ══════════════════════════════════════════════════════════════
h1("1. Tourist Check-in / Geofence Detection", ORANGE)
body(
    "Luồng hoàn chỉnh từ khi Tourist mở app đến khi phát hiện đang đứng trong vùng geofence của POI. "
    "FlavorTales sử dụng kiến trúc client-side geofence – server cung cấp danh sách POI, "
    "frontend tự tính khoảng cách bằng Haversine formula."
)

# Phase 1
diag_header("Phase 1", "Create Tourist Session",
            "POST /api/tourist/sessions → TouristSessionController.createSession()")
actors("Tourist App · TouristSessionController · TouristSessionService · MongoDB (tourist_sessions)")
note("Đây là anonymous endpoint – không yêu cầu JWT. Session UUID được sinh ngẫu nhiên (không sequential) để bảo mật.")
step(1, "Tourist App gọi POST /api/tourist/sessions (không cần Authorization header)")
step(2, "TouristSessionService.createSession() sinh UUID sessionId")
step(3, "Set expiresAt = now + 24h, languagePreference = \"vi\" (default)")
step(4, "MongoDB lưu TouristSession { sessionId, languagePreference, viewedPoiIds:[], playedAudioIds:[], createdAt, expiresAt }")
step(5, "TTL index trên trường expiresAt: MongoDB tự xóa session hết hạn (background ~60s)")
step(6, "publishEvent(SessionCreatedEvent) → SessionCreatedEventListener (analytics) lưu VisitorEvent vào MongoDB visitor_events")
step(7, "Trả về 201 Created: { sessionId, expiresAt }")
note("Frontend lưu sessionId vào localStorage, dùng làm X-Session-Id header cho mọi request tiếp theo.", 'EFF6FF')
sep()

# Phase 2
diag_header("Phase 2", "Fetch Active POI List (Redis Cache)",
            "GET /api/poi → PoiController.getActivePois() [@ReadOnly → MySQL Replica]")
actors("Tourist App · PoiController · DataSourceAspect [AOP] · PoiService · PoiCacheService · Redis · MySQL Replica")
note("GET /api/poi là public endpoint – không cần JWT. Method getActivePois() được annotate @ReadOnly, DataSourceAspect tự động route sang MySQL Replica.")
step(1, "Tourist App gọi GET /api/poi, header tùy chọn: X-Session-Id")
step(2, "Spring AOP (DataSourceAspect) intercept method @ReadOnly: DataSourceContextHolder.set(REPLICA)")
step(3, "PoiService → PoiCacheService.getActivePoisFromCache() → Redis GET \"poi:list:active\"")
step(4, "CACHE HIT: Redis trả về List<PoiResponse> JSON → bỏ qua database hoàn toàn")
step(5, "CACHE MISS: SELECT * FROM poi WHERE status='active' via RoutingDataSource → MySQL Replica")
step(6, "Kết quả được map qua MapStruct (poiMapper.toPoiResponseList()) → cache vào Redis (EX 3600s)")
step(7, "DataSourceContextHolder.clear() – reset về primary để các write op không bị ảnh hưởng")
step(8, "Trả về 200 OK: List<PoiResponse> { poiId, name, latitude, longitude, radius, linkedShopName, avatarUrl, openingHours, tags, likesCount }")
sep()

# Phase 3
diag_header("Phase 3", "Client-Side Geofence Detection + Session Update",
            "Frontend tính Haversine → PATCH /api/tourist/sessions/{sessionId}")
actors("Tourist App (Leaflet Map) · Browser Geolocation API · TouristSessionController · TouristSessionService · MongoDB")
note("Kiến trúc quan trọng: FlavorTales KHÔNG gửi tọa độ tourist lên server. Server chỉ cung cấp danh sách POI. Frontend tự tính khoảng cách.")
step(1, "navigator.geolocation.watchPosition() → liên tục nhận { latitude, longitude, accuracy }")
step(2, "Mỗi lần vị trí thay đổi: duyệt qua toàn bộ danh sách POI, tính Haversine distance")
note("Haversine: R=6,371,000m · a=sin²(Δlat/2)+cos(lat1)·cos(lat2)·sin²(Δlng/2) · d=2R·atan2(√a,√(1−a))", 'F0F4FF')
step(3, "Nếu distance ≤ poi.radius: hiển thị content (shop name, menu, audio guide, avatar), highlight marker")
step(4, "Thêm poiId vào viewedPoiIds set, gom thành 1 PATCH request (tránh race condition)")
step(5, "PATCH /api/tourist/sessions/{sessionId} body: { viewedPoiIds: [poiId1, poiId2, ...] }")
step(6, "TouristSessionService tìm session MongoDB, check expiresAt > now, merge viewedPoiIds, lưu lại")
step(7, "Nếu distance > poi.radius: POI marker bình thường, không hiển thị content")
sep()

# Phase 4
diag_header("Phase 4", "Tourist Vào Vùng Giao Thoa Của 2 POI",
            "Haversine check tất cả POI → nhiều POI cùng active → merge viewedPoiIds 1 request")
note("Trường hợp giao thoa: Hệ thống KHÔNG chọn ưu tiên – tất cả POI trong vùng đều được kích hoạt song song. Session update gộp tất cả poiId mới vào 1 PATCH request duy nhất để tránh race condition.")
step(1, "Geolocation cập nhật: duyệt qua toàn bộ POI list")
step(2, "POI-A: distance=18m, radius=30m → IN RANGE")
step(3, "POI-B: distance=25m, radius=40m → IN RANGE")
step(4, "Cả 2 POI đều thỏa điều kiện → newlyEnteredPoiIds = {POI-A, POI-B}")
step(5, "Highlight marker cả 2 POI trên bản đồ, hiển thị panel nội dung song song")
step(6, "1 PATCH request duy nhất: viewedPoiIds=[poiA, poiB] → MongoDB merge addAll, loại trùng lặp")
step(7, "Khi tourist ra khỏi vùng giao thoa: chỉ còn 1 POI active")

page_break()

# ══════════════════════════════════════════════════════════════
# DIAGRAM 2 – POI APPROVAL WORKFLOW
# ══════════════════════════════════════════════════════════════
h1("2. POI Creation & Admin Approval Workflow", ORANGE)
body(
    "Luồng vendor tạo POI → admin review → approve/reject. "
    "Đặc biệt: Admin duyệt POI KHÔNG qua PoiController mà qua ShopController, "
    "vì POI và Shop được submit cùng nhau."
)

diag_header("Phase 1", "Vendor Tạo POI",
            "POST /api/poi → PoiService.validateBoundary() → checkProximityConflict() → save()")
actors("Vendor Browser · JwtAuthenticationFilter · PoiController · PoiService · PoiRepository (MySQL Primary) · EmailService [@Async]")
note("Geofence validation xảy ra phía SERVER khi tạo POI: (1) validateBoundary() kiểm tra POI nằm trong vùng food-street. (2) checkProximityConflict() từ chối nếu có POI active cách ≤ 5m. Cả hai dùng Haversine formula.")
step(1, "POST /api/poi: Authorization: Bearer {token} + CreatePoiRequest { latitude, longitude, radius, address, name, shopName, avatarFileId, additionalImageIds, tags, openingHours }")
step(2, "JwtAuthenticationFilter: validate JWT → set SecurityContext (vendorEmail, ROLE_vendor)")
step(3, "PoiService.validateBoundary(): haversineMetres(lat,lng, config.centerLat, config.centerLng) ≤ config.maxRadiusM → nếu NGOÀI: throw PoiOutsideBoundaryException → 400 Bad Request")
step(4, "findByStatus(ACTIVE) → lấy toàn bộ active POI → checkProximityConflict(): nếu có POI cách < 5.0m → throw PoiProximityConflictException → 409 Conflict")
step(5, "save(Poi { vendorEmail, latitude, longitude, radius, address, name, status=PENDING, createdAt=now() }) → trả về poiId")
step(6, "EmailService.sendAdminNewShopNotification() [@Async fire-and-forget]: admin nhận email thông báo submission mới")
step(7, "Trả về 201 Created: PoiResponse { poiId, name, latitude, longitude, status='pending', createdAt }")
sep()

diag_header("Phase 2", "Admin Xem Danh Sách Pending",
            "GET /api/shop/admin/pending → ShopService → JdbcTemplate JOIN query")
actors("Admin Browser · JwtAuthenticationFilter (ROLE_admin) · ShopController · ShopService · JdbcTemplate")
note("Admin duyệt POI KHÔNG qua PoiController. Endpoint approval nằm trong ShopController vì POI và Shop được submit cùng nhau. Approve shop → ShopService set cả shop.status=active VÀ poi.status=active.")
step(1, "GET /api/shop/admin/pending – JWT phải có ROLE_admin")
step(2, "ShopService.getPendingShops() → JdbcTemplate SELECT: JOIN shop + poi + user + file_asset WHERE shop.status='pending'")
step(3, "Trả về List<AdminShopResponse> { shopId, name, description, vendorEmail, latitude, longitude, radius, avatarUrl, galleryUrls, createdAt }")
step(4, "Admin xem danh sách, click vào từng shop để review chi tiết")
sep()

diag_header("Phase 3A", "Admin Phê Duyệt – Approve",
            "PATCH /api/shop/admin/{shopId}/approve → UPDATE shop + poi (atomic) → @Async email")
actors("Admin Browser · ShopController · ShopService [@Transactional] · JdbcTemplate · EmailService [@Async]")
step(1, "PATCH /api/shop/admin/{shopId}/approve – body: { notes: \"Approved, looks great!\" }")
step(2, "ShopService.approveShop(shopId, notes) [@Transactional]: SELECT shop → lấy poiId, vendorEmail, shopName")
step(3, "BEGIN TRANSACTION: UPDATE shop SET status='active', approved_at=NOW(), admin_notes=notes WHERE id=shopId")
step(4, "UPDATE poi SET status='active', updated_at=NOW() WHERE id=poiId (shop.poi_id)")
step(5, "COMMIT TRANSACTION")
step(6, "EmailService.sendShopApprovedEmail(vendorEmail, shopName, notes) [@Async]: vendor nhận email xác nhận shop live")
step(7, "Trả về 200 OK: { success: true, message: 'Shop approved successfully' }")
sep()

diag_header("Phase 3B", "Admin Từ Chối – Reject",
            "PATCH /api/shop/admin/{shopId}/reject → UPDATE shop + poi → @Async email lý do từ chối")
step(1, "PATCH /api/shop/admin/{shopId}/reject – body: { notes: \"Missing required info...\" }")
step(2, "ShopService.rejectShop(shopId, notes) [@Transactional]: SELECT shop → lấy poiId, vendorEmail")
step(3, "BEGIN TRANSACTION: UPDATE shop SET status='rejected', admin_notes=notes, updated_at=NOW()")
step(4, "UPDATE poi SET status='rejected', updated_at=NOW() WHERE id=poiId")
step(5, "COMMIT TRANSACTION")
step(6, "EmailService.sendShopRejectedEmail() [@Async]: vendor nhận email với lý do từ chối, có thể cập nhật và submit lại")
step(7, "Trả về 200 OK: { success: true, message: 'Shop rejected' }")
sep()

diag_header("Phase 4", "POI & Shop Status Lifecycle", "State machine tổng hợp")
add_table(
    ["Trạng thái", "Mô tả", "Trigger"],
    [
        ["pending", "Vừa được vendor tạo, chờ admin review", "POST /api/poi (Vendor)"],
        ["active", "Admin đã approve, POI hiển thị cho tourist", "PATCH /api/shop/admin/{shopId}/approve"],
        ["rejected", "Admin từ chối, không hiển thị", "PATCH /api/shop/admin/{shopId}/reject"],
        ["inactive", "Admin tắt POI tạm thời", "Admin deactivation"],
        ["deleted", "Soft delete (30 ngày recovery window)", "DELETE /api/poi/{id}?hard=false"],
        ["pending (again)", "Vendor update POI active → về pending", "PUT /api/poi/{id} (Vendor update)"],
    ]
)

page_break()

# ══════════════════════════════════════════════════════════════
# DIAGRAM 3 – SHOP CREATION & APPROVAL
# ══════════════════════════════════════════════════════════════
h1("3. Shop + Menu Item Creation & Admin Approval", ORANGE)
body(
    "Luồng 3 bước: (1) Upload ảnh lên Cloudflare R2, (2) Tạo Shop dùng fileId, "
    "(3) Admin phê duyệt kèm cache invalidation."
)

diag_header("Step 1", "Vendor Upload Ảnh Shop lên Cloudflare R2",
            "POST /api/file/upload → FileService → R2FileStorageService → S3Client.putObject()")
actors("Vendor Browser · JwtAuthFilter · FileController · FileService · R2FileStorageService · AWS S3Client SDK · Cloudflare R2 · MySQL Primary (file_asset)")
note("Flow này được gọi nhiều lần: avatar (1 lần) + gallery (tối đa 5 lần) trước khi tạo Shop. Mỗi lần trả về fileId để dùng ở Step 2.")
step(1, "POST /api/file/upload – multipart/form-data, Bearer token, file=binary image data")
step(2, "FileService.uploadImage(): Validate MIME type (chỉ image/jpeg hoặc image/png) → InvalidFileTypeException → 400")
step(3, "Validate file size ≤ 5MB (5,242,880 bytes) → FileTooLargeException → 400")
step(4, "R2FileStorageService.buildImageKey(vendorEmail, originalFilename): extract username prefix → objectKey = username/images/filename")
step(5, "file.getBytes() → load toàn bộ file vào memory (tối đa 5MB)")
step(6, "R2FileStorageService.upload(): PutObjectRequest { bucket=R2_BUCKET, key=objectKey, contentLength, contentType }")
step(7, "S3Client.putObject(request, RequestBody.fromBytes(bytes)) → HTTP PUT Cloudflare R2 → 200 OK + ETag")
step(8, "publicUrl = R2_PUBLIC_URL + \"/\" + objectKey")
step(9, "INSERT INTO file_asset { object_key, file_url, original_filename, mime_type, size_bytes, uploaded_by, created_at } → trả về fileId")
step(10, "Trả về 200 OK: FileUploadResponse { fileId, fileUrl, originalFilename, mimeType, sizeBytes }")
note("Frontend lưu fileId để dùng trong ShopCreateRequest ở Step 2.", 'EFF6FF')
sep()

diag_header("Step 2", "Vendor Tạo Shop (Dùng fileId Đã Upload)",
            "POST /api/shop → ShopService.createShop() → JdbcTemplate INSERT → @Async email admin")
actors("Vendor Browser · JwtAuthFilter · ShopController · ShopService (JdbcTemplate) · MySQL Primary · EmailService [@Async]")
note("ShopService dùng JdbcTemplate trực tiếp (không qua JPA Repository) để INSERT shop và shop_image records. Shop được tạo với status='pending'.")
step(1, "POST /api/shop – Bearer vendorJwt + ShopCreateRequest: { name, description, avatarFileId=42, additionalImageIds=[43,44], openingHours, tags }")
step(2, "Tìm POI liên kết: SELECT id FROM poi WHERE vendor_email=? AND status IN ('pending','active') ORDER BY created_at DESC LIMIT 1 → poiId")
step(3, "INSERT INTO shop { poi_id, vendor_id, name, description, avatar_file_id, status='pending', opening_hours JSON, tags JSON, created_at=NOW() } → shopId")
step(4, "Loop additionalImageIds: INSERT INTO shop_image { shop_id, file_asset_id, display_order } mỗi ảnh")
step(5, "EmailService.sendAdminNewShopNotification(shopName, vendorEmail) [@Async fire-and-forget]: admin nhận email thông báo submission")
step(6, "Trả về 201 Created: ShopCreateResponse { shopId, status='pending' }")
sep()

diag_header("Step 3", "Admin Phê Duyệt Shop (Full @Transactional + Cache Invalidation)",
            "PATCH /api/shop/admin/{shopId}/approve → UPDATE shop+poi → Redis evict → @Async email")
actors("Admin Browser · JwtAuthFilter (ROLE_admin) · ShopController · ShopService [@Transactional] · JdbcTemplate · PoiCacheService · Redis · EmailService")
step(1, "PATCH /api/shop/admin/{shopId}/approve – Bearer adminJwt – body: { notes: 'All requirements met' }")
step(2, "SELECT shop.id, shop.poi_id, shop.name, user.email FROM shop JOIN user WHERE shop.id=shopId → poiId, vendorEmail, shopName")
step(3, "BEGIN TRANSACTION: UPDATE shop SET status='active', approved_at=NOW(), admin_notes=notes")
step(4, "UPDATE poi SET status='active', updated_at=NOW() WHERE id=poiId")
step(5, "COMMIT TRANSACTION")
step(6, "PoiCacheService.evict(poiId): DEL 'poi:{poiId}' → Redis OK")
step(7, "PoiCacheService.evictActivePoisList(): DEL 'poi:list:active' → Redis OK (cache invalidated)")
step(8, "EmailService.sendShopApprovedEmail(vendorEmail, shopName, notes) [@Async]: 'Your shop is now live'")
step(9, "Trả về 200 OK: { success: true, message: 'Shop approved successfully' }")

page_break()

# ══════════════════════════════════════════════════════════════
# DIAGRAM 4 – BROWSE NEARBY POIS
# ══════════════════════════════════════════════════════════════
h1("4. Tourist Browse Nearby POIs with Redis Cache", ORANGE)
body(
    "Luồng du khách xem danh sách POI trên bản đồ Leaflet, bao gồm luồng Redis cache, "
    "frontend rendering và cơ chế cache invalidation."
)

diag_header("Phase 1", "Backend API – Redis Read-Through Cache",
            "GET /api/poi → DataSourceAspect [@ReadOnly] → PoiCacheService → Redis → MySQL Replica")
actors("Tourist Browser/Mobile App · PoiController [public] · DataSourceAspect [AOP @ReadOnly] · PoiService · PoiCacheService · Redis (poi:list:active) · RoutingDataSource · MySQL Replica [read-only]")
note("GET /api/poi là public endpoint – không cần JWT. @ReadOnly AOP tự động route sang MySQL Replica.")
step(1, "GET /api/poi – Header tùy chọn: X-Session-Id")
step(2, "Spring AOP intercepts @ReadOnly method: DataSourceContextHolder.set(DataSourceType.REPLICA)")
step(3, "PoiCacheService.getActivePoisFromCache() → Redis GET 'poi:list:active'")
step(4, "CACHE HIT (TTL còn hạn): Redis trả về List<PoiResponse> JSON → bỏ qua database hoàn toàn")
step(5, "CACHE MISS (key không tồn tại / hết TTL):")
step(6, "   → RoutingDataSource.determineCurrentLookupKey() → 'replica'")
step(7, "   → SELECT p.*, s.id as linkedShopId, s.name, fa.file_url FROM poi p LEFT JOIN shop s LEFT JOIN file_asset fa WHERE p.status='active' ORDER BY created_at DESC")
step(8, "   → poiMapper.toPoiResponseList(pois) → Map entity sang DTO")
step(9, "   → PoiCacheService.putActivePois(): SET 'poi:list:active' {JSON} EX 3600 (1 giờ TTL)")
step(10, "DataSourceContextHolder.clear() – reset về primary")
step(11, "Trả về 200 OK: ApiResponse { data: [{ poiId, name, latitude, longitude, radius, linkedShopId, linkedShopName, avatarUrl, shopDescription, shopTags, openingHours, shopGalleryUrls, likesCount, status }] }")
sep()

diag_header("Phase 2", "Frontend – Render Leaflet Map & Nearby POI List",
            "React component → Leaflet markers → Haversine distances → Nearby POIs sidebar")
actors("Map Page (Next.js /map) · POI API Client · Browser Geolocation API · Leaflet Map (react-leaflet)")
step(1, "useEffect(() => fetchPois(), []) → GET /api/poi → List<PoiResponse>")
step(2, "navigator.geolocation.getCurrentPosition() → { latitude, longitude }")
step(3, "<MapContainer center={[userLat, userLng]}> + <TileLayer url='openstreetmap'> + {pois.map(poi => <Marker/>)}")
step(4, "Render mỗi POI marker: tính distance = haversine(userLat, userLng, poi.lat, poi.lng)")
step(5, "distance ≤ poi.radius → CircleMarker(orange) + Popup { shopName, openingHours, avatarUrl } + thêm vào 'Nearby POIs' list")
step(6, "distance > poi.radius → Marker(grey pin) + Popup basic info")
step(7, "Hiển thị 'Nearby POIs' sidebar, sort by distance ASC")
step(8, "User click marker → Hiển thị shop detail, menu items, audio guide")
sep()

diag_header("Phase 3", "Cache Invalidation – Khi POI/Shop Thay Đổi",
            "PoiCacheService.evict() + evictActivePoisList() → Redis DEL keys")
note("Cache eviction được trigger bởi: PoiService.updatePoi(), deletePoi(), likePoi(), unlikePoi() và ShopService.approveShop(), rejectShop().")
step(1, "Trigger: update/delete/like/approve/reject")
step(2, "PoiCacheService.evict(poiId): DEL 'poi:{poiId}' → (integer) 1")
step(3, "PoiCacheService.evictActivePoisList(): DEL 'poi:list:active' → (integer) 1")
note("Nếu Redis không khả dụng: exception được catch + log, app tiếp tục chạy bình thường (Graceful Degradation – silent fallback to DB).", 'FEF2F2')
step(4, "Next GET /api/poi request → Cache MISS → fetch from DB → Re-populate Redis cache")

page_break()

# ══════════════════════════════════════════════════════════════
# DIAGRAM 5 – FILE UPLOAD R2
# ══════════════════════════════════════════════════════════════
h1("5. Image Upload to Cloudflare R2 (S3-Compatible)", ORANGE)
body(
    "Luồng chi tiết upload ảnh lên Cloudflare R2 qua AWS S3 Client SDK v2, "
    "bao gồm validation, error cases và cách fileId được tái sử dụng."
)

diag_header("Flow 1", "Happy Path – Successful Upload",
            "POST /api/file/upload → JwtAuthFilter → FileService [@Transactional] → R2 → MySQL")
actors("Client (Browser/App) · JwtAuthenticationFilter · FileController /api/file · FileService [@Transactional] · R2FileStorageService · AWS S3Client SDK v2 · Cloudflare R2 · MySQL Primary (file_asset)")
step(1, "POST /api/file/upload – Content-Type: multipart/form-data – Authorization: Bearer eyJhbGc... – Part: name=file, filename=pho-bo.jpg, Content-Type: image/jpeg, [binary data]")
step(2, "JwtAuthFilter: Extract Bearer token → jwtService.validateToken() (HMAC-SHA256) → check exp claim → loadUserByUsername() → set SecurityContextHolder")
step(3, "FileService.uploadImage(MultipartFile, Authentication): auth.getName() → vendorEmail")
step(4, "Validate MIME type: file.getContentType() IN {image/jpeg, image/png} → else throw InvalidFileTypeException → 400")
step(5, "Validate size: file.getSize() ≤ 5,242,880 bytes → else throw FileTooLargeException → 400")
step(6, "R2FileStorageService.buildImageKey(vendorEmail, originalFilename): email.substring(0, indexOf('@')) → 'vendor' → objectKey='vendor/images/pho-bo.jpg'")
step(7, "bytes = file.getBytes() (max 5MB, đã validate)")
step(8, "R2FileStorageService.upload(): PutObjectRequest { bucket='flavortales-assets', key=objectKey, contentLength, contentType='image/jpeg' }")
step(9, "S3Client.putObject() → HTTP PUT https://ACCOUNT_ID.r2.cloudflarestorage.com/flavortales-assets/vendor/images/pho-bo.jpg – Headers: Authorization: AWS4-HMAC-SHA256")
step(10, "Cloudflare R2 lưu object → trả về HTTP 200 OK + ETag: 'abc123...'")
step(11, "publicUrl = 'https://assets.flavortales.com/vendor/images/pho-bo.jpg'")
step(12, "INSERT INTO file_asset { object_key, file_url, original_filename='pho-bo.jpg', mime_type='image/jpeg', size_bytes, uploaded_by, created_at } → fileId=42")
step(13, "Trả về 200 OK: FileUploadResponse { fileId:42, fileUrl:'https://...', originalFilename, mimeType, sizeBytes }")
sep()

diag_header("Flow 2", "Error Cases – Validation Failures",
            "InvalidFileTypeException (400) · FileTooLargeException (400) · JWT missing (401)")
add_table(
    ["Case", "Điều kiện lỗi", "Exception", "HTTP Response"],
    [
        ["A – Sai file type", "Content-Type không phải image/jpeg hoặc image/png (vd: .gif, .pdf, .exe)", "InvalidFileTypeException", "400: 'Only JPEG and PNG files are allowed'"],
        ["B – File quá lớn", "file.getSize() > 5,242,880 bytes (5MB)", "FileTooLargeException", "400: 'File size must be under 5MB'"],
        ["C – JWT thiếu/hết hạn", "Không có Authorization header hoặc token expired", "Spring Security blocks", "401 Unauthorized (trước khi vào controller)"],
    ]
)

diag_header("Flow 3", "fileId Reuse – Cách Các Module Dùng Kết Quả Upload",
            "fileId từ FileUploadResponse được embed vào POI, Shop, User module requests")
note("fileId = 42, 43, 44 được tái sử dụng bởi cả POI và Shop. Cloudflare R2 object không bị duplicate.")
step(1, "POST /api/file/upload (avatar) → { fileId: 42, fileUrl: 'https://...' }")
step(2, "POST /api/file/upload (gallery image 1) → { fileId: 43 }")
step(3, "POST /api/file/upload (gallery image 2) → { fileId: 44 }")
step(4, "POST /api/poi: CreatePoiRequest { avatarFileId: 42, additionalImageIds: [43, 44], latitude, longitude, radius, ... } → { poiId: 7, status: 'pending' }")
step(5, "POST /api/shop: ShopCreateRequest { avatarFileId: 42, additionalImageIds: [43, 44], name, description, ... } → { shopId: 5, status: 'pending' }")

page_break()

# ══════════════════════════════════════════════════════════════
# DIAGRAM 6 – AUDIO UPLOAD & TTS
# ══════════════════════════════════════════════════════════════
h1("6. Audio Upload & TTS Generation", ORANGE)
body(
    "Vendor có thể tạo audio hướng dẫn theo 2 cách: (1) TTS tự động qua Google Cloud TTS API, "
    "(2) Upload file audio có sẵn (MP3/WAV). Audio cần admin duyệt mới tourist nghe được."
)

diag_header("Phase 1", "TTS Preview – Nghe Thử Trước Khi Lưu",
            "POST /api/audio/tts/preview → GoogleCloudTtsService → trả về raw MP3 bytes")
actors("Vendor App · JwtAuthFilter (ROLE_vendor) · AudioController · AudioService · GoogleCloudTtsService")
step(1, "POST /api/audio/tts/preview – body: { text, language } – Authorization: Bearer vendorJwt")
step(2, "JwtAuthFilter xác thực, kiểm tra ROLE_vendor → 401 nếu không hợp lệ")
step(3, "AudioService.generatePreviewBytes(TtsRequest, vendorEmail)")
step(4, "GoogleCloudTtsService.synthesize(text, languageCode, voiceName): HTTP POST → Google Cloud TTS API – gửi text + languageCode + voiceName – nhận audioContent (base64)")
step(5, "AS: Base64.decode() + validate MP3 header → byte[] mp3Bytes")
step(6, "Trả về 200 OK – Content-Type: audio/mpeg – Body: raw MP3 bytes (không lưu DB, không upload R2)")
note("Browser phát audio trực tiếp. Preview là stateless – không gọi thêm bất kỳ API nào.", 'EFF6FF')
sep()

diag_header("Phase 2", "TTS Generate & Save Chính Thức",
            "POST /api/audio/shop/{shopId}/tts → Synthesize → R2 → file_asset → audio record (status=pending)")
actors("Vendor App · JwtAuthFilter · AudioController · AudioService · GoogleCloudTtsService · R2FileStorageService · MySQL (file_asset + audio) · Redis")
note("Unique constraint: bảng audio có UNIQUE KEY (shop_id, language_code). Nếu vendor upload lại cùng ngôn ngữ → upsertAudioRecord() UPDATE thay vì INSERT.")
step(1, "POST /api/audio/shop/{shopId}/tts – body: { text, language } – JWT ROLE_vendor")
step(2, "AudioService.generateSingleAudio(): resolveVendorId(vendorEmail) → SELECT user_id FROM users WHERE email=?")
step(3, "GoogleCloudTtsService.synthesize(text, languageCode, voiceName) → base64 audioContent → byte[] mp3Bytes")
step(4, "R2FileStorageService.uploadBytes(mp3Bytes, objectKey, 'audio/mpeg') – objectKey = 'audio/{vendorId}/{shopId}/{lang}/{uuid}.mp3' → fileUrl")
step(5, "INSERT INTO file_asset { file_key, file_url, file_type='audio', file_size, uploaded_by } → fileId")
step(6, "upsertAudioRecord(shopId, fileId, languageCode, ttsProvider='google_tts', processingStatus='completed'): INSERT ... ON DUPLICATE KEY UPDATE → audioId")
step(7, "AudioCacheService.evictByShop(shopId): DEL 'audio:shop:{shopId}'")
step(8, "Trả về 201 Created: TtsResponse { audioId, fileId, fileUrl, language, durationSeconds }")
note("Audio status = 'pending' sau khi tạo. Cần admin duyệt mới tourist nghe được.", 'FEF2F2')
sep()

diag_header("Phase 3", "Vendor Upload File Audio Có Sẵn",
            "POST /api/audio/shop/{shopId}/upload · Multipart: file (MP3/WAV) + language → R2 → DB")
actors("Vendor App · AudioController · AudioService · R2FileStorageService · MySQL · Redis")
step(1, "POST /api/audio/shop/{shopId}/upload – Multipart: file=audio.mp3, language=vi – JWT ROLE_vendor")
step(2, "Validate: ROLE_vendor + validate file MIME type")
step(3, "AudioService.uploadAudioFile(): resolveVendorId(vendorEmail)")
step(4, "R2FileStorageService.uploadBytes(file.getBytes(), objectKey, contentType) – objectKey = 'audio/{vendorId}/{shopId}/{lang}/{uuid}.mp3' → fileUrl")
step(5, "INSERT INTO file_asset → fileId")
step(6, "upsertAudioRecord(shopId, fileId, language, ttsProvider='upload', processingStatus='completed') → audioId")
step(7, "AudioCacheService.evictByShop(shopId)")
step(8, "Trả về 201 Created: { audioId, fileId, fileUrl, language }")
sep()

diag_header("Phase 4", "Audio Status Flow – pending → active",
            "audio.status: pending (tạo) → active (admin duyệt) | rejected | disabled")
note("Lưu ý quan trọng: audio.status và audio.processing_status là hai trường độc lập. processing_status='completed' chỉ xác nhận TTS đã xong. status='active' mới cho phép tourist nghe.")
add_table(
    ["Status", "Mô tả", "Trigger"],
    [
        ["pending", "Vừa tạo (TTS hoặc upload), chờ admin review", "POST /api/audio/shop/{shopId}/tts hoặc /upload"],
        ["active", "Admin đã approve, tourist nghe được", "Admin approval (qua shop approval flow)"],
        ["rejected", "Admin từ chối audio", "Admin rejection"],
        ["disabled", "Admin tắt tạm thời", "Admin disable action"],
    ]
)
body("GET /api/audio/shop/{shopId} và GET /api/audio/poi/{poiId} chỉ trả về audio có status='active'.")

page_break()

# ══════════════════════════════════════════════════════════════
# DIAGRAM 7 – AUDIO TRANSLATION
# ══════════════════════════════════════════════════════════════
h1("7. Audio Translation – Multi-language TTS", ORANGE)
body(
    "Vendor nhập text tiếng Việt, hệ thống tự động dịch và tổng hợp audio cho 6 ngôn ngữ "
    "song song (CompletableFuture). Partial success được hỗ trợ – lỗi 1 ngôn ngữ không ảnh hưởng các ngôn ngữ còn lại."
)
add_table(
    ["Ngôn ngữ", "Code", "API", "Voice Name"],
    [
        ["Tiếng Việt", "vi-VN", "Google Cloud TTS (trực tiếp)", "vi-VN-Standard-A"],
        ["Tiếng Anh", "en-US", "Google Translate → Google Cloud TTS", "en-US-Wavenet-D"],
        ["Tiếng Trung", "zh-CN", "Google Translate → Google Cloud TTS", "cmn-CN-Wavenet-A"],
        ["Tiếng Hàn", "ko-KR", "Google Translate → Google Cloud TTS", "synthesizeKorean()"],
        ["Tiếng Nga", "ru-RU", "Google Translate → Google Cloud TTS", "synthesizeRussian()"],
        ["Tiếng Nhật", "ja-JP", "Google Translate → Google Cloud TTS", "synthesizeJapanese()"],
    ]
)

diag_header("Phase 1", "Preview Tất Cả Ngôn Ngữ Song Song",
            "POST /api/audio/tts/preview-all · 6 CompletableFuture chạy đồng thời")
actors("Vendor App · AudioController · TtsOrchestrationService · GoogleTranslationService · GoogleCloudTtsService")
note("Kiến trúc parallel: TtsOrchestrationService.generateAllLanguages() tạo 6 CompletableFuture. Nếu một ngôn ngữ lỗi, các ngôn ngữ còn lại vẫn trả về kết quả (partial success).")
step(1, "POST /api/audio/tts/preview-all – body: { text: 'Quán ăn nổi tiếng...' } – JWT ROLE_vendor")
step(2, "AudioController → TtsOrchestrationService.generateAllLanguages(viText)")
step(3, "Tạo 6 CompletableFuture chạy song song:")
step(4, "   • vi: synthesize(viText, 'vi-VN', 'vi-VN-Standard-A') trực tiếp → mp3_vi")
step(5, "   • en: translate(viText,'vi','en') → enText → synthesize(enText,'en-US','en-US-Wavenet-D') → mp3_en")
step(6, "   • zh: translate → synthesize(zhText,'zh-CN','cmn-CN-Wavenet-A') → mp3_zh")
step(7, "   • ko/ru/ja: translate → synthesizeKorean/Russian/Japanese → mp3_ko/ru/ja")
step(8, "Collect results: success → Base64.encode(mp3Bytes) | error → TtsError { lang, message }")
step(9, "Trả về 200 OK: AllLanguagesTtsResponse { audioBase64: {vi,en,zh,ko,ru,ja}, errors: [] }")
note("Frontend decode base64, phát thử từng tab ngôn ngữ. Không upload R2, không lưu DB.", 'EFF6FF')
sep()

diag_header("Phase 2", "Lưu Tất Cả Ngôn Ngữ Vào DB (Upload Song Song)",
            "Frontend gọi 6 POST /api/audio/shop/{shopId}/tts song song")
note("Frontend orchestrates: 'uploadAudiosForShop(shopId, audioBlobs, onError)' trong audioApi.ts tạo 6 Promise chạy đồng thời bằng Promise.all().")
step(1, "Vendor nhấn 'Lưu tất cả ngôn ngữ' → uploadAudiosForShop() → 6 Promise.all()")
step(2, "6 request đồng thời: POST /api/audio/shop/{shopId}/tts { text, language:'vi'|'en'|'zh'|'ko'|'ru'|'ja' }")
step(3, "Mỗi request: synthesize → R2 upload → INSERT file_asset → upsertAudioRecord(shopId, fileId, lang, 'google_tts')")
step(4, "DB: 6 records trong bảng audio – UNIQUE (shop_id, language_code) – tất cả status='pending'")
step(5, "AudioCacheService.evictByShop(shopId) sau mỗi upsert")
step(6, "UI cập nhật badge ✓ cho từng ngôn ngữ, hiển thị lỗi inline nếu 1 ngôn ngữ thất bại")
sep()

diag_header("Phase 3", "Tourist Nghe Audio Theo Ngôn Ngữ Session",
            "GET /api/audio/poi/{poiId} → Redis cache → client chọn track theo languageCode")
actors("Tourist App · AudioController · AudioService · Redis (AudioCacheService) · MySQL (audio table) · AudioContext.tsx (Playback)")
step(1, "GeofenceDetector phát hiện tourist vào vùng POI X")
step(2, "GET /api/audio/poi/{poiId} → AudioService.getAudioByPoi(poiId)")
step(3, "Redis: GET 'audio:poi:{poiId}' – TTL 15 phút")
step(4, "CACHE HIT: List<AudioResponse> từ Redis")
step(5, "CACHE MISS: SELECT * FROM audio WHERE poi_id=? AND status='active' → cache SET EX 900")
step(6, "toAudioByLanguage(list) → { vi:..., en:..., zh:..., ko:..., ru:..., ja:... }")
step(7, "Đọc session.language từ localStorage → chọn track = audioByLanguage[sessionLanguage]")
step(8, "Track tồn tại → AudioContext.playAudioFromUrl(track.fileUrl, poi.name) → AudioPlayerBar hiện trên màn hình")
step(9, "Fallback: audioByLanguage['vi'] hoặc track đầu tiên available nếu không có ngôn ngữ phù hợp")
note("NFR-GEO-R02: Cooldown 10 phút/POI – không phát lại audio trong 10 phút sau khi đã nghe.", 'FEF9C3')
sep()

diag_header("Phase 4", "Xử Lý Lỗi – Partial Success",
            "Một số ngôn ngữ lỗi vẫn trả về kết quả các ngôn ngữ còn lại")
step(1, "TtsOrchestrationService.generateAllLanguages(viText) → 6 CompletableFuture song song")
step(2, "vi (OK): TTS synthesize → LanguageTtsResult.success('vi', mp3Bytes)")
step(3, "en (Translate lỗi): GoogleApiException (quota exceeded) → catch → LanguageTtsResult.failure('en', 'Translation failed')")
step(4, "ja (TTS lỗi): translate OK → TTS synthesize → IOException (network) → catch → LanguageTtsResult.failure('ja', 'TTS synthesis failed')")
step(5, "zh, ko, ru (OK): 3 × LanguageTtsResult.success(...)")
step(6, "Trả về AllLanguagesTtsResponse { audioBase64: {vi,zh,ko,ru}, errors: [{lang:'en',msg:'...'},{lang:'ja',msg:'...'}] }")
step(7, "UI: 4 tab ngôn ngữ có nút 'Nghe thử' ✓ – 2 tab lỗi hiển thị thông báo đỏ – vendor retry từng ngôn ngữ riêng")

page_break()

# ══════════════════════════════════════════════════════════════
# DIAGRAM 8 – REALTIME WEBSOCKET
# ══════════════════════════════════════════════════════════════
h1("8. Realtime Tourist Tracking – WebSocket/STOMP", ORANGE)
body(
    "Hệ thống theo dõi số lượng tourist online theo thời gian thực qua WebSocket/STOMP. "
    "Admin dashboard nhận count push mỗi khi tourist kết nối hoặc mất kết nối. "
    "Ngoài ra, admin truy vấn thống kê lịch sử qua REST + MongoDB aggregation."
)
note("Endpoint WebSocket: ws://<host>/ws với SockJS fallback. Topic prefix: /topic · App prefix: /app. Tourist KHÔNG cần JWT để kết nối WebSocket – presence tracking là anonymous.")

diag_header("Phase 1", "Tourist App Kết Nối WebSocket & Đăng Ký Presence",
            "SockJS handshake → STOMP CONNECT → SUBSCRIBE /topic/tourist-ping → VisitorPresenceRegistry.add()")
actors("Tourist App · SockJS Client · WebSocketConfig (Spring) · VisitorPresenceEventListener · VisitorPresenceRegistry · ActiveVisitorBroadcaster")
step(1, "Tourist App: khởi tạo SockJS + StompClient")
step(2, "SockJS → WebSocketConfig: HTTP Upgrade – WebSocket Handshake → 101 Switching Protocols → onConnect callback")
step(3, "App.subscribe('/topic/tourist-ping') → STOMP SUBSCRIBE /topic/tourist-ping")
step(4, "WebSocketConfig fire SessionSubscribeEvent → VisitorPresenceEventListener")
step(5, "VEL: kiểm tra destination == '/topic/tourist-ping' → VisitorPresenceRegistry.add(stompSessionId)")
step(6, "VEL → ActiveVisitorBroadcaster.broadcast(registry.getCount())")
step(7, "Broadcaster: messagingTemplate.convertAndSend('/topic/active-visitors', count) → Push count mới tới Admin Dashboard")
step(8, "SockJS → App: subscribed OK")
sep()

diag_header("Phase 2", "Admin Dashboard Kết Nối & Nhận Count Realtime",
            "Admin subscribe /topic/active-visitors → nhận push ngay khi count thay đổi")
actors("Admin Dashboard · SockJS Client · Spring STOMP Broker · ActiveVisitorBroadcaster · VisitorPresenceRegistry")
note("Bảo mật: Admin Dashboard phải đính kèm Authorization: Bearer <JWT> trong STOMP CONNECT headers. SecurityConfig bảo vệ /api/analytics/**. AuthChannelInterceptor có thể cấu hình thêm để xác thực STOMP session.")
step(1, "Admin: khởi tạo SockJS + connect với Bearer JWT → HTTP Upgrade → 101 Switching Protocols")
step(2, "Admin.subscribe('/topic/active-visitors') → STOMP SUBSCRIBE → ACK → subscribed OK")
step(3, "Hiển thị counter – đang chờ push từ server")
step(4, "LOOP – mỗi khi tourist connect hoặc disconnect:")
step(5, "   → ActiveVisitorBroadcaster.broadcast: registry.getCount() → N tourists")
step(6, "   → convertAndSend('/topic/active-visitors', N) → STOMP MESSAGE → Admin UI: setCount(N)")
sep()

diag_header("Phase 3", "Tourist Mất Kết Nối (Tab Đóng / Network Loss)",
            "SessionDisconnectEvent → VisitorPresenceRegistry.remove() → broadcast count mới")
actors("Tourist App (Browser) · Spring WebSocket Infra · VisitorPresenceEventListener · VisitorPresenceRegistry · ActiveVisitorBroadcaster · Admin Dashboard")
note("Spring WebSocket phát hiện mất kết nối trong vài mili-giây qua TCP close / WebSocket close frame. SessionDisconnectEvent được fire kể cả khi client đóng tab đột ngột (browser gửi TCP FIN).")
step(1, "Tourist đóng tab → WebSocket Close Frame (code 1001) | hoặc mất mạng → TCP FIN / timeout")
step(2, "Spring fire SessionDisconnectEvent → VisitorPresenceEventListener.onDisconnect()")
step(3, "VEL: registry.remove(stompSessionId) → touristStompSessions.remove() → trả về true nếu session tồn tại")
step(4, "VEL → ActiveVisitorBroadcaster.broadcast(registry.getCount()) → count N-1")
step(5, "messagingTemplate.convertAndSend('/topic/active-visitors', N-1) → Admin UI: setCount(N-1)")
note("Nếu remove() trả về false (session không phải tourist), broadcast KHÔNG được gọi.", 'FEF9C3')
sep()

diag_header("Phase 4A", "Ghi Dữ Liệu Analytics – SessionCreatedEvent → MongoDB",
            "TouristSessionService.publishEvent() → SessionCreatedEventListener → visitor_events")
step(1, "Khi tourist tạo session mới (POST /api/tourist/sessions): TouristSessionService.publishEvent(new SessionCreatedEvent(sessionId, occurredAt))")
step(2, "ApplicationEventPublisher.publishEvent() → SessionCreatedEventListener.onSessionCreated(event)")
step(3, "VisitorEvent.builder().timestamp(occurredAt).build()")
step(4, "visitorEventRepository.save(VisitorEvent) → MongoDB collection 'visitor_events' { _id, timestamp }")
note("visitor_events không có TTL – lưu vĩnh viễn làm nguồn dữ liệu analytics historical.", 'EFF6FF')
sep()

diag_header("Phase 4B", "Admin Truy Vấn Thống Kê Lịch Sử (REST + MongoDB Aggregation)",
            "GET /api/analytics/admin/visitors/stats?period=day|week|month|year → $match → $group → $sort")
actors("Admin Dashboard · AdminAnalyticsController · VisitorStatsService · MongoDB (visitor_events)")
note("Endpoint yêu cầu ROLE_admin. Aggregation pipeline: $match (date range) → $group ($dateToString, timezone +07:00) → $sort ASC.")
step(1, "GET /api/analytics/admin/visitors/stats?period=week – JWT ROLE_admin")
step(2, "VisitorStatsService.getStats(week): resolveFrom(week) → from = now - 7 days | resolveDateFormat(week) → '%Y-%m-%d'")
step(3, "MongoDB aggregation: $match { timestamp >= from } → $group { _id: $dateToString(format, timestamp, TZ '+07:00'), count: $sum:1 } → $sort { _id: 1 }")
step(4, "Map rows → List<VisitorStatPoint> { label:'2026-05-03', count:42 }")
step(5, "Trả về 200 OK: ApiResponse { success:true, data:[{label, count},...] }")
step(6, "Admin Dashboard render line chart / bar chart: x-axis=date label, y-axis=visitor count")

page_break()

# ══════════════════════════════════════════════════════════════
# PHỤ LỤC
# ══════════════════════════════════════════════════════════════
h1("Phụ lục: Bảng Tổng Hợp API Endpoints", ORANGE)
add_table(
    ["Diagram", "Method", "Endpoint", "Auth", "Mô tả"],
    [
        ["1", "POST", "/api/tourist/sessions",                   "None",       "Tạo anonymous tourist session"],
        ["1,4", "GET",  "/api/poi",                              "None",       "Lấy danh sách POI active (Redis cache → MySQL Replica)"],
        ["1", "PATCH", "/api/tourist/sessions/{sessionId}",      "None",       "Cập nhật viewedPoiIds / playedAudioIds vào session"],
        ["2", "POST",  "/api/poi",                               "ROLE_vendor","Vendor tạo POI mới (validation boundary + proximity)"],
        ["2,3", "GET", "/api/shop/admin/pending",                "ROLE_admin", "Admin xem danh sách shop/POI pending"],
        ["2,3", "PATCH","/api/shop/admin/{shopId}/approve",      "ROLE_admin", "Admin approve shop+poi, invalidate Redis cache"],
        ["2,3", "PATCH","/api/shop/admin/{shopId}/reject",       "ROLE_admin", "Admin reject shop+poi, gửi email lý do"],
        ["3,5", "POST", "/api/file/upload",                      "ROLE_vendor","Upload ảnh lên Cloudflare R2, lưu file_asset"],
        ["3",   "POST", "/api/shop",                             "ROLE_vendor","Vendor tạo shop (dùng fileId từ upload)"],
        ["6",   "POST", "/api/audio/tts/preview",                "ROLE_vendor","Preview audio TTS (raw MP3 bytes, không lưu)"],
        ["6",   "POST", "/api/audio/shop/{shopId}/tts",          "ROLE_vendor","Tạo TTS chính thức → R2 → DB (status=pending)"],
        ["6",   "POST", "/api/audio/shop/{shopId}/upload",       "ROLE_vendor","Upload file audio có sẵn → R2 → DB"],
        ["7",   "POST", "/api/audio/tts/preview-all",            "ROLE_vendor","Preview 6 ngôn ngữ song song (CompletableFuture)"],
        ["7",   "GET",  "/api/audio/poi/{poiId}",                "None",       "Lấy audio list cho POI (Redis 15min → MySQL)"],
        ["8",   "WS",   "/ws (SockJS)",                          "None/JWT",   "WebSocket endpoint tourist (anonymous) & admin (JWT)"],
        ["8",   "GET",  "/api/analytics/admin/visitors/stats",   "ROLE_admin", "Thống kê lịch sử visitor qua MongoDB aggregation"],
    ]
)

h1("Phụ lục: Kiến Trúc Tổng Thể – Data Flow", ORANGE)
add_table(
    ["Component", "Vai trò", "Công nghệ"],
    [
        ["JwtAuthenticationFilter", "Xác thực JWT mọi request có bearer token", "JJWT 0.12.6, Spring Security"],
        ["DataSourceAspect", "Route query sang MySQL Replica cho @ReadOnly methods", "Spring AOP, RoutingDataSource"],
        ["PoiCacheService", "Read-through cache cho POI list & detail (1h TTL)", "Redis 7.2, Jackson JSON"],
        ["AudioCacheService", "Read-through cache cho audio list & CDN URL (15min–7d TTL)", "Redis 7.2, adaptive TTL"],
        ["R2FileStorageService", "Upload file lên Cloudflare R2 qua AWS S3 SDK v2", "AWS SDK v2, S3-compatible API"],
        ["GoogleCloudTtsService", "Tổng hợp giọng đọc từ text (6 ngôn ngữ)", "Google Cloud TTS REST API"],
        ["TtsOrchestrationService", "Điều phối 6 CompletableFuture TTS song song, partial success", "Java CompletableFuture"],
        ["VisitorPresenceRegistry", "Lưu STOMP session IDs của tourist đang online (in-memory)", "ConcurrentHashMap.newKeySet()"],
        ["ActiveVisitorBroadcaster", "Push count tourist realtime tới admin dashboard", "SimpMessagingTemplate"],
        ["SessionCreatedEventListener", "Lắng nghe SessionCreatedEvent → lưu VisitorEvent MongoDB", "Spring ApplicationEvent"],
        ["VisitorStatsService", "MongoDB aggregation pipeline cho analytics dashboard", "MongoTemplate, $group, $dateToString"],
        ["EmailService", "Gửi email thông báo (approve/reject/verify) [@Async]", "Spring Mail, SMTP, MimeMessage"],
    ]
)

# ── Footer ────────────────────────────────────────────────────
doc.add_paragraph()
fp = doc.add_paragraph()
fp.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = fp.add_run("FlavorTales © 2026 — Tài liệu Sequence Diagrams v1.0 — Dựa trên source code thực tế — Nội bộ")
r.font.size = Pt(9); r.font.color.rgb = GREY

# ── Save ─────────────────────────────────────────────────────
out = r"d:\Codes\Seminar\Source Code\docs\sequence-diagrams\sequence-diagrams.docx"
doc.save(out)
print(f"Saved: {out}")
