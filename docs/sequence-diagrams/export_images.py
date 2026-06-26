"""
Render Mermaid sequence diagrams từ các HTML files thành ảnh PNG
sử dụng Playwright (Chromium headless).
Output: thư mục images/ chứa các file PNG sẵn sàng upload Google Docs.
"""
import os
import time
from pathlib import Path
from playwright.sync_api import sync_playwright

BASE_DIR = Path(__file__).parent
OUT_DIR  = BASE_DIR / "images"
OUT_DIR.mkdir(exist_ok=True)

# Danh sách HTML files và tên diagram tương ứng
HTML_FILES = [
    ("01-geofence-detection.html", [
        ("d1p1", "01_phase1_create_tourist_session"),
        ("d1p2", "01_phase2_fetch_poi_redis_cache"),
        ("d1p3", "01_phase3_client_geofence_detection"),
        ("d1p4", "01_phase4_overlapping_poi_zones"),
    ]),
    ("02-poi-approval-workflow.html", [
        ("d2p1", "02_phase1_vendor_creates_poi"),
        ("d2p2", "02_phase2_admin_review_pending"),
        ("d2p3", "02_phase3a_admin_approve"),
        ("d2p4", "02_phase3b_admin_reject"),
        ("d2p5", "02_status_lifecycle"),
    ]),
    ("03-shop-creation-approval.html", [
        ("d3p1", "03_step1_upload_images_r2"),
        ("d3p2", "03_step2_create_shop"),
        ("d3p3", "03_step3_admin_approve"),
    ]),
    ("04-browse-nearby-pois.html", [
        ("d4p1", "04_phase1_redis_cache_flow"),
        ("d4p2", "04_phase2_leaflet_frontend"),
        ("d4p3", "04_phase3_cache_invalidation"),
    ]),
    ("05-file-upload-r2.html", [
        ("d5p1", "05_flow1_happy_path_upload"),
        ("d5p2", "05_flow2_error_cases"),
        ("d5p3", "05_flow3_fileid_reuse"),
    ]),
    ("06-audio-upload-tts.html", [
        ("d6p1", "06_phase1_tts_preview"),
        ("d6p2", "06_phase2_tts_generate_save"),
        ("d6p3", "06_phase3_upload_audio_file"),
        ("d6p4", "06_phase4_status_flow"),
    ]),
    ("07-audio-translation.html", [
        ("d7p1", "07_phase1_preview_all_languages"),
        ("d7p2", "07_phase2_save_all_languages"),
        ("d7p3", "07_phase3_tourist_playback"),
        ("d7p4", "07_phase4_partial_error_handling"),
    ]),
    ("08-realtime-tourist-websocket.html", [
        ("d8p1", "08_phase1_tourist_connect"),
        ("d8p2", "08_phase2_admin_subscribe"),
        ("d8p3", "08_phase3_tourist_disconnect"),
        ("d8p4", "08_phase4a_analytics_event"),
        ("d8p5", "08_phase4b_historical_stats"),
    ]),
]

MERMAID_TIMEOUT = 15000   # ms chờ mermaid render
VIEWPORT = {"width": 1400, "height": 900}

def screenshot_diagrams(page, html_file: Path, diagram_ids: list):
    """Mở HTML file, chờ Mermaid render xong, chụp từng diagram."""
    url = html_file.as_uri()
    page.goto(url, wait_until="networkidle", timeout=30000)

    # Chờ tất cả .mermaid svg xuất hiện
    try:
        page.wait_for_selector(".mermaid svg", timeout=MERMAID_TIMEOUT)
    except Exception:
        pass  # Một số file có thể không có diagram id cụ thể

    # Thêm thời gian cho JS animation hoàn tất
    page.wait_for_timeout(2000)

    saved = []
    for elem_id, out_name in diagram_ids:
        out_path = OUT_DIR / f"{out_name}.png"
        # Thử tìm element theo id trước
        el = page.query_selector(f"#{elem_id}")
        if el is None:
            # Fallback: lấy .diagram-card theo thứ tự
            idx = [d[0] for d in diagram_ids].index(elem_id)
            cards = page.query_selector_all(".diagram-card")
            el = cards[idx] if idx < len(cards) else None

        if el is None:
            print(f"  [SKIP] #{elem_id} không tìm thấy trong {html_file.name}")
            continue

        # Screenshot element với padding
        el.screenshot(path=str(out_path), type="png")
        print(f"  [OK] {out_path.name}")
        saved.append(out_path)
    return saved

def main():
    print(f"Output directory: {OUT_DIR}\n")
    all_saved = []

    with sync_playwright() as pw:
        browser = pw.chromium.launch(headless=True)
        context = browser.new_context(
            viewport=VIEWPORT,
            device_scale_factor=2,   # Retina – ảnh sắc nét hơn
        )
        page = context.new_page()

        for html_name, diagram_ids in HTML_FILES:
            html_path = BASE_DIR / html_name
            if not html_path.exists():
                print(f"[WARN] Không tìm thấy file: {html_name}")
                continue
            print(f"Processing {html_name} ...")
            saved = screenshot_diagrams(page, html_path, diagram_ids)
            all_saved.extend(saved)

        context.close()
        browser.close()

    print(f"\n✓ Đã xuất {len(all_saved)} ảnh vào: {OUT_DIR}")
    for p in all_saved:
        print(f"   {p.name}")

if __name__ == "__main__":
    main()
