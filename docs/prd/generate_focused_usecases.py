# -*- coding: utf-8 -*-
"""
Generate FocusedUseCases.docx for FlavorTales
Format follows CourseCast FocusedUseCases.doc template
4 Use Cases: UC1 (Tourist), UC2 (Vendor), UC3 (Admin)
Each UC has: Use Case Diagram + Activity Diagram (drawn via matplotlib)
"""
import os
import io
import math
import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import matplotlib.patches as mpatches
from matplotlib.patches import FancyArrowPatch, FancyBboxPatch, Ellipse
import matplotlib.lines as mlines
from docx import Document
from docx.shared import Pt, RGBColor, Cm, Inches
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

OUTPUT_DIR = os.path.dirname(__file__)
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "FocusedUseCases.docx")

# ─────────────────────────────────────────────────────────────────────────────
# HELPERS – Document formatting
# ─────────────────────────────────────────────────────────────────────────────

def add_page_break(doc):
    doc.add_page_break()

def set_heading(doc, text, level=1, size=14, bold=True, color=None):
    p = doc.add_paragraph()
    p.style = f"Heading {level}"
    run = p.add_run(text)
    run.font.size = Pt(size)
    run.font.bold = bold
    if color:
        run.font.color.rgb = color
    return p

def add_label_value(doc, label, value, label_pt=11, value_pt=11):
    """Add a line with bold label and normal value."""
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(3)
    p.paragraph_format.space_after = Pt(3)
    r1 = p.add_run(label)
    r1.font.bold = True
    r1.font.size = Pt(label_pt)
    r2 = p.add_run(value)
    r2.font.bold = False
    r2.font.size = Pt(value_pt)
    return p

def add_body_text(doc, text, size=11, bold=False, italic=False, indent=False):
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    if indent:
        p.paragraph_format.left_indent = Cm(1)
    run = p.add_run(text)
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    return p

def add_two_col_table(doc, rows_data):
    """
    rows_data: list of (actor_action, system_response)
    Renders a 2-column table with headers Actor Action | System Response
    """
    table = doc.add_table(rows=1 + len(rows_data), cols=2)
    table.style = "Table Grid"
    # Header
    hdr = table.rows[0]
    for idx, hdr_text in enumerate(["Actor Action", "System Response"]):
        cell = hdr.cells[idx]
        cell.paragraphs[0].clear()
        run = cell.paragraphs[0].add_run(hdr_text)
        run.font.bold = True
        run.font.size = Pt(10)
        # shade header
        shd = OxmlElement("w:shd")
        shd.set(qn("w:val"), "clear")
        shd.set(qn("w:color"), "auto")
        shd.set(qn("w:fill"), "D9E1F2")
        cell._tc.get_or_add_tcPr().append(shd)
    # Data rows
    for r_idx, (actor, system) in enumerate(rows_data):
        row = table.rows[r_idx + 1]
        for c_idx, txt in enumerate([actor, system]):
            cell = row.cells[c_idx]
            cell.paragraphs[0].clear()
            run = cell.paragraphs[0].add_run(txt)
            run.font.size = Pt(10)
    doc.add_paragraph()

def add_image_centered(doc, img_bytes, width_cm=15):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run = p.add_run()
    run.add_picture(img_bytes, width=Cm(width_cm))
    doc.add_paragraph()

# ─────────────────────────────────────────────────────────────────────────────
# DIAGRAM HELPERS
# ─────────────────────────────────────────────────────────────────────────────

def fig_to_bytes(fig):
    buf = io.BytesIO()
    fig.savefig(buf, format="png", dpi=130, bbox_inches="tight")
    buf.seek(0)
    plt.close(fig)
    return buf


# ── Use Case Diagram ──────────────────────────────────────────────────────────

def draw_actor(ax, x, y, label, fontsize=8):
    """Draw stick figure actor."""
    # head
    head = plt.Circle((x, y + 0.55), 0.13, color="black", fill=False, linewidth=1.5)
    ax.add_patch(head)
    # body
    ax.plot([x, x], [y + 0.42, y + 0.10], color="black", lw=1.5)
    # arms
    ax.plot([x - 0.22, x + 0.22], [y + 0.30, y + 0.30], color="black", lw=1.5)
    # legs
    ax.plot([x, x - 0.18], [y + 0.10, y - 0.15], color="black", lw=1.5)
    ax.plot([x, x + 0.18], [y + 0.10, y - 0.15], color="black", lw=1.5)
    ax.text(x, y - 0.30, label, ha="center", va="top", fontsize=fontsize, fontweight="bold")


def draw_usecase(ax, cx, cy, text, width=1.8, height=0.55, fontsize=7.5):
    el = Ellipse((cx, cy), width=width, height=height,
                 edgecolor="#2F5496", facecolor="#D6E4F7", linewidth=1.5, zorder=3)
    ax.add_patch(el)
    # wrap text
    words = text.split()
    lines, cur = [], ""
    for w in words:
        test = (cur + " " + w).strip()
        if len(test) <= 22:
            cur = test
        else:
            lines.append(cur)
            cur = w
    if cur:
        lines.append(cur)
    label = "\n".join(lines)
    ax.text(cx, cy, label, ha="center", va="center", fontsize=fontsize,
            zorder=4, multialignment="center")


def draw_system_box(ax, x0, y0, x1, y1, label):
    rect = mpatches.FancyBboxPatch((x0, y0), x1 - x0, y1 - y0,
                                   boxstyle="square,pad=0", linewidth=2,
                                   edgecolor="#2F5496", facecolor="white", zorder=1)
    ax.add_patch(rect)
    ax.text((x0 + x1) / 2, y1 - 0.12, label, ha="center", va="top",
            fontsize=9, fontweight="bold", color="#2F5496", zorder=2)


def arrow_to_ellipse(ax, ax_x, ax_y, el_cx, el_cy, el_w, el_h):
    """Draw arrow from actor center to nearest point on ellipse edge."""
    dx = el_cx - ax_x
    dy = el_cy - ax_y
    dist = math.sqrt(dx*dx + dy*dy)
    # point on ellipse rim
    a, b = el_w/2, el_h/2
    t = math.atan2(dy * a, dx * b)
    ex = el_cx - a * math.cos(t)
    ey = el_cy - b * math.sin(t)
    ax.annotate("", xy=(ex, ey), xytext=(ax_x, ax_y + 0.25),
                 arrowprops=dict(arrowstyle="-", color="black", lw=1.2))


# ── Activity Diagram ─────────────────────────────────────────────────────────

ACT_W, ACT_H = 2.8, 0.45   # activity box size (default)
SWIM_COLORS = {"Tourist": "#E8F4FD", "Vendor": "#FFF3CD",
               "Admin": "#E8F5E9", "System": "#F3E5F5"}

def draw_rounded_box(ax, cx, cy, text, color="#D6E4F7", w=ACT_W, h=ACT_H, fontsize=7.5):
    rect = FancyBboxPatch((cx - w/2, cy - h/2), w, h,
                          boxstyle="round,pad=0.05", linewidth=1.2,
                          edgecolor="#333333", facecolor=color, zorder=3)
    ax.add_patch(rect)
    # wrap text
    words = text.split()
    lines, cur = [], ""
    for wd in words:
        test = (cur + " " + wd).strip()
        chars_per_line = int(w / 0.085)
        if len(test) <= chars_per_line:
            cur = test
        else:
            lines.append(cur)
            cur = wd
    if cur:
        lines.append(cur)
    ax.text(cx, cy, "\n".join(lines), ha="center", va="center",
            fontsize=fontsize, zorder=4, multialignment="center")

def draw_diamond(ax, cx, cy, text, fontsize=7.5):
    d = 0.35
    diamond = plt.Polygon([[cx, cy+d], [cx+d*1.6, cy], [cx, cy-d], [cx-d*1.6, cy]],
                           closed=True, edgecolor="#333", facecolor="#FFF9C4",
                           linewidth=1.2, zorder=3)
    ax.add_patch(diamond)
    ax.text(cx, cy, text, ha="center", va="center", fontsize=fontsize-0.5, zorder=4)

def draw_start(ax, cx, cy):
    c = plt.Circle((cx, cy), 0.15, color="#333333", zorder=4)
    ax.add_patch(c)

def draw_end(ax, cx, cy):
    outer = plt.Circle((cx, cy), 0.18, color="#333333", fill=False, linewidth=2, zorder=4)
    inner = plt.Circle((cx, cy), 0.12, color="#333333", zorder=4)
    ax.add_patch(outer)
    ax.add_patch(inner)

def v_arrow(ax, x, y_from, y_to, label="", label_side="right", fontsize=7):
    ax.annotate("", xy=(x, y_to), xytext=(x, y_from),
                 arrowprops=dict(arrowstyle="->", color="#333333", lw=1.2))
    if label:
        lx = x + 0.12 if label_side == "right" else x - 0.12
        ha = "left" if label_side == "right" else "right"
        ax.text(lx, (y_from + y_to)/2, label, fontsize=fontsize,
                ha=ha, va="center", color="#555")

def h_arrow(ax, x_from, x_to, y, label="", fontsize=7):
    ax.annotate("", xy=(x_to, y), xytext=(x_from, y),
                 arrowprops=dict(arrowstyle="->", color="#333333", lw=1.2))
    if label:
        ax.text((x_from+x_to)/2, y+0.08, label, fontsize=fontsize,
                ha="center", va="bottom", color="#555")

def draw_merge(ax, x, y):
    """Draw a small filled diamond for merge/join."""
    d = 0.12
    poly = plt.Polygon([[x, y+d], [x+d, y], [x, y-d], [x-d, y]],
                        closed=True, color="#555", zorder=4)
    ax.add_patch(poly)


# ─────────────────────────────────────────────────────────────────────────────
# UC1 USE CASE DIAGRAM – Tourist
# ─────────────────────────────────────────────────────────────────────────────

def uc1_usecase_diagram():
    fig, ax = plt.subplots(figsize=(11, 7))
    ax.set_xlim(0, 11)
    ax.set_ylim(0, 7)
    ax.axis("off")
    fig.patch.set_facecolor("white")

    draw_system_box(ax, 1.8, 0.3, 10.5, 6.8, "FlavorTales System")

    # Use cases inside system
    ucs = [
        (5.5, 6.1, "Tạo phiên ẩn danh\n(Anonymous Session)"),
        (5.5, 5.0, "Xem bản đồ POI"),
        (5.5, 3.9, "Xem chi tiết POI /\nShop (đa ngôn ngữ)"),
        (5.5, 2.8, "Nghe audio thuyết minh\nautomatically khi vào geofence"),
        (5.5, 1.7, "Chọn ngôn ngữ ưu tiên"),
        (5.5, 0.75, "Like / Unlike POI"),
    ]
    for cx, cy, txt in ucs:
        draw_usecase(ax, cx, cy, txt, width=3.4, height=0.6)

    # Actor
    draw_actor(ax, 0.8, 3.2, "Tourist")

    # Arrows from actor to UCs
    for _, cy, _ in ucs:
        arrow_to_ellipse(ax, 0.8, 3.2, 5.5 - 1.7, cy, 3.4, 0.6)

    ax.set_title("UC1 – Use Case Diagram: Tourist", fontsize=12, fontweight="bold", pad=10)
    return fig_to_bytes(fig)


# ─────────────────────────────────────────────────────────────────────────────
# UC1 ACTIVITY DIAGRAM – Tourist (trải nghiệm khám phá bản đồ + nghe audio)
# ─────────────────────────────────────────────────────────────────────────────

def uc1_activity_diagram():
    fig, ax = plt.subplots(figsize=(9, 18))
    ax.set_xlim(0, 9)
    ax.set_ylim(0, 18)
    ax.axis("off")
    fig.patch.set_facecolor("white")

    cx = 4.5
    Y = {}  # named y positions
    y = 17.4

    # Start
    draw_start(ax, cx, y); Y["start"] = y; y -= 0.5

    v_arrow(ax, cx, y+0.5, y+0.18)

    # 1
    y -= 0.25
    draw_rounded_box(ax, cx, y, "Mở ứng dụng FlavorTales", color="#E3F2FD"); Y["open"] = y; y -= 0.5
    v_arrow(ax, cx, y+0.28, y+0.05)

    # 2
    y -= 0.22
    draw_rounded_box(ax, cx, y, "Hệ thống tạo Session UUID (MongoDB TTL 24h)", color="#F3E5F5"); Y["session"] = y; y -= 0.5
    v_arrow(ax, cx, y+0.28, y+0.05)

    # 3
    y -= 0.22
    draw_rounded_box(ax, cx, y, "Chọn ngôn ngữ ưu tiên (vi/en/zh/ko/ja)", color="#E8F4FD"); Y["lang"] = y; y -= 0.5
    v_arrow(ax, cx, y+0.28, y+0.05)

    # 4
    y -= 0.22
    draw_rounded_box(ax, cx, y, "Hệ thống hiển thị bản đồ với \ncác POI active (load từ Redis cache)", color="#F3E5F5"); Y["map"] = y; y -= 0.5
    v_arrow(ax, cx, y+0.28, y+0.05)

    # 5 – diamond
    y -= 0.35
    draw_diamond(ax, cx, y, "Tourist di chuyển\nvào geofence POI?"); Y["geo_q"] = y
    geo_y = y

    # Yes branch – right
    ax.annotate("", xy=(cx+2.2, geo_y - 0.5), xytext=(cx+0.56, geo_y),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.text(cx+0.65, geo_y+0.08, "Có", fontsize=7.5, color="#555")

    y2 = geo_y - 0.5
    draw_rounded_box(ax, cx+2.2, y2, "Tự động phát audio\nthuyết minh (ngôn ngữ đã chọn)", color="#E8F5E9", w=3.0)
    v_arrow(ax, cx+2.2, y2-0.28, y2-0.7)
    draw_rounded_box(ax, cx+2.2, y2-0.95, "Tourist nghe audio\nthuyết minh tại chỗ", color="#E8F4FD", w=3.0)

    # merge arrow back to center
    ax.annotate("", xy=(cx, geo_y - 1.7), xytext=(cx+2.2, y2-1.18),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))

    # No branch – down
    ax.annotate("", xy=(cx, geo_y - 0.5), xytext=(cx, geo_y - 0.35),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.text(cx+0.08, geo_y - 0.42, "Không", fontsize=7.5, color="#555")

    y = geo_y - 1.7
    # 6 – another diamond
    draw_diamond(ax, cx, y, "Tourist chọn\nxem chi tiết POI?"); Y["detail_q"] = y
    detail_y = y

    # Yes – view detail
    ax.annotate("", xy=(cx-2.2, detail_y - 0.5), xytext=(cx-0.56, detail_y),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.text(cx-0.9, detail_y+0.08, "Có", fontsize=7.5, color="#555")
    y3 = detail_y - 0.5
    draw_rounded_box(ax, cx-2.2, y3, "Hệ thống hiển thị\nchi tiết POI / Shop\n(đa ngôn ngữ)", color="#F3E5F5", w=2.9)

    # diamond – like?
    y3b = y3 - 0.85
    v_arrow(ax, cx-2.2, y3-0.33, y3b+0.35)
    draw_diamond(ax, cx-2.2, y3b, "Like POI?")
    ax.text(cx-2.8, y3b-0.1, "Có", fontsize=7.5, color="#555")
    ax.annotate("", xy=(cx-2.2, y3b-0.45), xytext=(cx-2.2, y3b-0.35),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    draw_rounded_box(ax, cx-2.2, y3b-0.68, "Hệ thống ghi nhận\nLike (session-based)", color="#E8F5E9", w=2.9)

    # merge back
    ax.annotate("", xy=(cx, detail_y - 1.7), xytext=(cx-2.2, y3b-0.92),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.text(cx-2.45, y3b+0.1, "Không", fontsize=7.5, color="#555", rotation=90)

    # No – straight down
    ax.annotate("", xy=(cx, detail_y - 0.5), xytext=(cx, detail_y - 0.35),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.text(cx+0.08, detail_y-0.42, "Không", fontsize=7.5, color="#555")

    y = detail_y - 1.7

    # 7 diamond – session expired?
    draw_diamond(ax, cx, y, "Phiên hết hạn\n(24h)?"); Y["expire_q"] = y
    exp_y = y

    # Yes – renew
    ax.annotate("", xy=(cx+2.2, exp_y), xytext=(cx+0.56, exp_y),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.text(cx+0.62, exp_y+0.1, "Có", fontsize=7.5, color="#555")
    draw_rounded_box(ax, cx+2.2, exp_y, "Hệ thống tạo\nSession UUID mới", color="#F3E5F5", w=2.8)
    ax.annotate("", xy=(cx+2.2, exp_y-0.55), xytext=(cx+2.2, exp_y-0.28),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.text(cx+2.5, exp_y-0.42, "→ tiếp tục", fontsize=6.5, color="#555")
    ax.annotate("", xy=(cx, exp_y-0.9), xytext=(cx+2.2, exp_y-0.55),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))

    # No
    ax.annotate("", xy=(cx, exp_y-0.5), xytext=(cx, exp_y-0.35),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.text(cx+0.08, exp_y-0.42, "Không", fontsize=7.5, color="#555")

    y = exp_y - 0.9
    draw_rounded_box(ax, cx, y, "Tourist tiếp tục\nkhám phá bản đồ", color="#E8F4FD"); y -= 0.55
    v_arrow(ax, cx, y+0.33, y+0.1)

    # End
    y -= 0.22
    draw_end(ax, cx, y)

    ax.set_title("UC1 – Activity Diagram: Tourist Khám Phá Bản Đồ & Nghe Audio", fontsize=11, fontweight="bold", pad=8)
    return fig_to_bytes(fig)


# ─────────────────────────────────────────────────────────────────────────────
# UC2 USE CASE DIAGRAM – Vendor
# ─────────────────────────────────────────────────────────────────────────────

def uc2_usecase_diagram():
    fig, ax = plt.subplots(figsize=(12, 8))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 8)
    ax.axis("off")
    fig.patch.set_facecolor("white")

    draw_system_box(ax, 1.8, 0.3, 11.5, 7.8, "FlavorTales System")

    ucs = [
        (6.0, 7.1, "Đăng ký / Đăng nhập tài khoản"),
        (6.0, 6.0, "Tạo POI & liên kết cửa hàng"),
        (6.0, 4.9, "Chỉnh sửa / Xóa mềm POI"),
        (6.0, 3.8, "Quản lý thông tin cửa hàng\n(ảnh, menu, giờ mở cửa)"),
        (6.0, 2.7, "Tạo / Upload audio TTS\n(Google TTS đa ngôn ngữ)"),
        (6.0, 1.6, "Xem dashboard analytics\n(lượt xem, lượt thích)"),
        (6.0, 0.75, "Xem trạng thái duyệt POI / Shop"),
    ]
    for cx, cy, txt in ucs:
        draw_usecase(ax, cx, cy, txt, width=3.8, height=0.62)

    draw_actor(ax, 0.8, 4.0, "Vendor", fontsize=8)

    for _, cy, _ in ucs:
        arrow_to_ellipse(ax, 0.8, 4.0, 6.0 - 1.9, cy, 3.8, 0.62)

    ax.set_title("UC2 – Use Case Diagram: Vendor", fontsize=12, fontweight="bold", pad=10)
    return fig_to_bytes(fig)


# ─────────────────────────────────────────────────────────────────────────────
# UC2 ACTIVITY DIAGRAM – Vendor tạo POI + upload audio TTS
# ─────────────────────────────────────────────────────────────────────────────

def uc2_activity_diagram():
    fig, ax = plt.subplots(figsize=(10, 20))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 20)
    ax.axis("off")
    fig.patch.set_facecolor("white")

    cx = 5.0
    y = 19.5

    draw_start(ax, cx, y); y -= 0.5
    v_arrow(ax, cx, y+0.35, y+0.08)

    y -= 0.25
    draw_rounded_box(ax, cx, y, "Vendor đăng nhập vào cổng Vendor", color="#FFF3CD"); y -= 0.55
    v_arrow(ax, cx, y+0.33, y+0.08)

    # diamond – login ok?
    y -= 0.38
    draw_diamond(ax, cx, y, "Xác thực thành công?")
    login_y = y

    # No – lockout
    ax.annotate("", xy=(cx+2.5, login_y), xytext=(cx+0.56, login_y),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.text(cx+0.62, login_y+0.1, "Không (≥3 lần)", fontsize=7, color="#555")
    draw_rounded_box(ax, cx+2.5, login_y, "Hệ thống khóa TK\n15 phút (rate-limit)", color="#FFCCCC", w=2.8)
    ax.annotate("", xy=(cx+2.5, login_y-0.55), xytext=(cx+2.5, login_y-0.28),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    draw_end(ax, cx+2.5, login_y-0.65)

    # Yes – continue
    ax.annotate("", xy=(cx, login_y-0.5), xytext=(cx, login_y-0.35),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.text(cx+0.08, login_y-0.42, "Có", fontsize=7.5, color="#555")

    y = login_y - 0.72
    draw_rounded_box(ax, cx, y, "Vendor chọn \"Tạo POI mới\"", color="#FFF9C4"); y -= 0.55
    v_arrow(ax, cx, y+0.33, y+0.08)

    y -= 0.25
    draw_rounded_box(ax, cx, y, "Nhập thông tin POI\n(tên, tọa độ, bán kính geofence, mô tả)", color="#FFF3CD"); y -= 0.55
    v_arrow(ax, cx, y+0.33, y+0.08)

    # validate
    y -= 0.38
    draw_diamond(ax, cx, y, "Dữ liệu hợp lệ?")
    val_y = y

    # No – error
    ax.annotate("", xy=(cx-2.5, val_y), xytext=(cx-0.56, val_y),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.text(cx-0.9, val_y+0.1, "Không", fontsize=7.5, color="#555")
    draw_rounded_box(ax, cx-2.5, val_y, "Hiển thị lỗi\nvalidation", color="#FFCCCC", w=2.4)
    ax.annotate("", xy=(cx-2.5, val_y+0.55), xytext=(cx-2.5, val_y+0.28),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.text(cx-2.0, val_y+0.65, "→ nhập lại", fontsize=6.5, color="#555")

    # Yes
    ax.annotate("", xy=(cx, val_y-0.5), xytext=(cx, val_y-0.35),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.text(cx+0.08, val_y-0.42, "Có", fontsize=7.5, color="#555")

    y = val_y - 0.72
    draw_rounded_box(ax, cx, y, "Hệ thống tạo POI + Shop\n(status = pending)", color="#F3E5F5"); y -= 0.55
    v_arrow(ax, cx, y+0.33, y+0.08)

    y -= 0.25
    draw_rounded_box(ax, cx, y, "Vendor upload ảnh gallery\n(JPEG/PNG ≤ 5MB lên R2)", color="#FFF3CD"); y -= 0.55
    v_arrow(ax, cx, y+0.33, y+0.08)

    y -= 0.25
    draw_rounded_box(ax, cx, y, "Vendor nhập văn bản mô tả\ncho audio TTS", color="#FFF9C4"); y -= 0.55
    v_arrow(ax, cx, y+0.33, y+0.08)

    # diamond – preview?
    y -= 0.38
    draw_diamond(ax, cx, y, "Nghe thử TTS?")
    prev_y = y

    # Yes – preview
    ax.annotate("", xy=(cx+2.5, prev_y), xytext=(cx+0.56, prev_y),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.text(cx+0.62, prev_y+0.1, "Có", fontsize=7.5, color="#555")
    draw_rounded_box(ax, cx+2.5, prev_y, "Hệ thống stream\nTTS preview\n(không lưu R2)", color="#E8F5E9", w=2.8)
    ax.annotate("", xy=(cx+2.5, prev_y-0.58), xytext=(cx+2.5, prev_y-0.3),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.text(cx+2.7, prev_y-0.45, "→ xác nhận", fontsize=6.5, color="#555")
    ax.annotate("", xy=(cx, prev_y-0.8), xytext=(cx+2.5, prev_y-0.58),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))

    # No
    ax.annotate("", xy=(cx, prev_y-0.5), xytext=(cx, prev_y-0.35),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.text(cx+0.1, prev_y-0.42, "Không", fontsize=7.5, color="#555")

    y = prev_y - 0.82
    draw_rounded_box(ax, cx, y, "Vendor xác nhận tạo TTS\ncho tất cả ngôn ngữ (vi/en/zh/ko/ja)", color="#FFF3CD"); y -= 0.55
    v_arrow(ax, cx, y+0.33, y+0.08)

    y -= 0.25
    draw_rounded_box(ax, cx, y, "Hệ thống gọi Google TTS,\nauto-translate vi→en/zh/ko/ja,\nlưu audio lên Cloudflare R2", color="#F3E5F5"); y -= 0.6
    v_arrow(ax, cx, y+0.38, y+0.08)

    y -= 0.25
    draw_rounded_box(ax, cx, y, "Hệ thống cập nhật trạng thái POI/Shop\n= pending, thông báo gửi Admin", color="#E8F5E9"); y -= 0.55
    v_arrow(ax, cx, y+0.33, y+0.08)

    y -= 0.25
    draw_rounded_box(ax, cx, y, "Vendor xem trạng thái\ntrên dashboard (pending / active / rejected)", color="#FFF9C4"); y -= 0.55
    v_arrow(ax, cx, y+0.33, y+0.08)

    y -= 0.22
    draw_end(ax, cx, y)

    ax.set_title("UC2 – Activity Diagram: Vendor Tạo POI & Upload Audio TTS", fontsize=11, fontweight="bold", pad=8)
    return fig_to_bytes(fig)


# ─────────────────────────────────────────────────────────────────────────────
# UC3 USE CASE DIAGRAM – Admin
# ─────────────────────────────────────────────────────────────────────────────

def uc3_usecase_diagram():
    fig, ax = plt.subplots(figsize=(12, 8))
    ax.set_xlim(0, 12)
    ax.set_ylim(0, 8)
    ax.axis("off")
    fig.patch.set_facecolor("white")

    draw_system_box(ax, 1.8, 0.3, 11.5, 7.8, "FlavorTales System")

    ucs = [
        (6.0, 7.1, "Đăng nhập Admin\n(/auth/admin/login)"),
        (6.0, 6.0, "Xem danh sách POI/Shop\nđang chờ duyệt"),
        (6.0, 4.9, "Duyệt (Approve) POI / Shop"),
        (6.0, 3.8, "Từ chối (Reject) POI / Shop\nkèm lý do"),
        (6.0, 2.7, "Xem bản đồ toàn bộ POI"),
        (6.0, 1.6, "Xem thống kê visitor\n(ngày/tuần/tháng/năm)"),
        (6.0, 0.75, "Xem số du khách online\n& tổng vendor"),
    ]
    for cx, cy, txt in ucs:
        draw_usecase(ax, cx, cy, txt, width=3.8, height=0.65)

    draw_actor(ax, 0.8, 4.0, "Admin", fontsize=8)
    for _, cy, _ in ucs:
        arrow_to_ellipse(ax, 0.8, 4.0, 6.0 - 1.9, cy, 3.8, 0.65)

    ax.set_title("UC3 – Use Case Diagram: Admin", fontsize=12, fontweight="bold", pad=10)
    return fig_to_bytes(fig)


# ─────────────────────────────────────────────────────────────────────────────
# UC3 ACTIVITY DIAGRAM – Admin duyệt POI / Shop
# ─────────────────────────────────────────────────────────────────────────────

def uc3_activity_diagram():
    fig, ax = plt.subplots(figsize=(10, 18))
    ax.set_xlim(0, 10)
    ax.set_ylim(0, 18)
    ax.axis("off")
    fig.patch.set_facecolor("white")

    cx = 5.0
    y = 17.5

    draw_start(ax, cx, y); y -= 0.5
    v_arrow(ax, cx, y+0.35, y+0.08)

    y -= 0.25
    draw_rounded_box(ax, cx, y, "Admin đăng nhập qua\n/auth/admin/login", color="#E8F5E9"); y -= 0.55
    v_arrow(ax, cx, y+0.33, y+0.08)

    y -= 0.25
    draw_rounded_box(ax, cx, y, "Hệ thống xác thực JWT,\nhiển thị Admin Dashboard", color="#F3E5F5"); y -= 0.55
    v_arrow(ax, cx, y+0.33, y+0.08)

    y -= 0.25
    draw_rounded_box(ax, cx, y, "Admin chọn \"Pending Reviews\"", color="#E8F5E9"); y -= 0.55
    v_arrow(ax, cx, y+0.33, y+0.08)

    y -= 0.25
    draw_rounded_box(ax, cx, y, "Hệ thống trả danh sách\nPOI / Shop đang pending", color="#F3E5F5"); y -= 0.55
    v_arrow(ax, cx, y+0.33, y+0.08)

    # diamond – có pending item
    y -= 0.38
    draw_diamond(ax, cx, y, "Còn mục cần\nduyệt không?")
    pend_y = y

    # No – end
    ax.annotate("", xy=(cx+2.5, pend_y), xytext=(cx+0.56, pend_y),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.text(cx+0.62, pend_y+0.1, "Không", fontsize=7.5, color="#555")
    draw_rounded_box(ax, cx+2.5, pend_y, "Hiển thị \"Không có\nmục cần duyệt\"", color="#E8F5E9", w=2.8)
    ax.annotate("", xy=(cx+2.5, pend_y-0.55), xytext=(cx+2.5, pend_y-0.28),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    draw_end(ax, cx+2.5, pend_y-0.65)

    # Yes
    ax.annotate("", xy=(cx, pend_y-0.5), xytext=(cx, pend_y-0.35),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.text(cx+0.1, pend_y-0.42, "Có", fontsize=7.5, color="#555")

    y = pend_y - 0.72
    draw_rounded_box(ax, cx, y, "Admin chọn một mục\nđể xem chi tiết", color="#E8F5E9"); y -= 0.55
    v_arrow(ax, cx, y+0.33, y+0.08)

    y -= 0.25
    draw_rounded_box(ax, cx, y, "Hệ thống hiển thị đầy đủ thông tin\n(POI/Shop, ảnh, audio, menu)", color="#F3E5F5"); y -= 0.55
    v_arrow(ax, cx, y+0.33, y+0.08)

    # diamond – approve or reject
    y -= 0.38
    draw_diamond(ax, cx, y, "Admin quyết định?")
    dec_y = y

    # Approve – right
    ax.annotate("", xy=(cx+2.5, dec_y - 0.5), xytext=(cx+0.56, dec_y),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.text(cx+0.62, dec_y+0.1, "Approve", fontsize=7.5, color="#555")
    y_ap = dec_y - 0.5
    draw_rounded_box(ax, cx+2.5, y_ap, "Admin nhấn Approve\n(ghi chú tùy chọn)", color="#E8F5E9", w=2.8)
    v_arrow(ax, cx+2.5, y_ap-0.28, y_ap-0.65)
    draw_rounded_box(ax, cx+2.5, y_ap-0.88, "Hệ thống đổi status\nPOI/Shop = active\nGửi email thông báo Vendor", color="#E8F5E9", w=2.8)
    ax.annotate("", xy=(cx, dec_y - 2.0), xytext=(cx+2.5, y_ap-1.12),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))

    # Reject – left
    ax.annotate("", xy=(cx-2.5, dec_y - 0.5), xytext=(cx-0.56, dec_y),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.text(cx-1.2, dec_y+0.1, "Reject", fontsize=7.5, color="#555")
    y_rj = dec_y - 0.5
    draw_rounded_box(ax, cx-2.5, y_rj, "Admin nhập lý do\ntừ chối (rejection reason)", color="#FFCCCC", w=2.8)
    v_arrow(ax, cx-2.5, y_rj-0.28, y_rj-0.65)
    draw_rounded_box(ax, cx-2.5, y_rj-0.88, "Hệ thống đổi status\nPOI/Shop = rejected\nGửi email thông báo Vendor", color="#FFCCCC", w=2.8)
    ax.annotate("", xy=(cx, dec_y - 2.0), xytext=(cx-2.5, y_rj-1.12),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))

    # No decision – need more info (straight down)
    ax.annotate("", xy=(cx, dec_y-0.5), xytext=(cx, dec_y-0.35),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))

    y = dec_y - 2.0
    draw_rounded_box(ax, cx, y, "Hệ thống cập nhật\ndanh sách pending", color="#F3E5F5"); y -= 0.55
    v_arrow(ax, cx, y+0.33, y+0.08)

    # loop arrow – back to "còn mục"
    y -= 0.35
    draw_diamond(ax, cx, y, "Còn mục pending\nkhác?")
    loop_y = y

    # Yes – loop back
    ax.annotate("", xy=(cx-2.5, loop_y), xytext=(cx-0.56, loop_y),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.text(cx-1.0, loop_y+0.1, "Có", fontsize=7.5, color="#555")
    draw_rounded_box(ax, cx-2.5, loop_y, "→ quay lại\ndanh sách", color="#E8F5E9", w=2.4)
    # loop arrow up
    ax.annotate("", xy=(cx-3.6, pend_y-0.2), xytext=(cx-3.6, loop_y),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.plot([cx-2.5-1.1, cx-3.6], [loop_y, loop_y], color="#333", lw=1.2)
    ax.plot([cx-3.6, cx-0.56], [pend_y-0.2, pend_y-0.2], color="#333", lw=1.2)

    # No – end
    ax.annotate("", xy=(cx, loop_y-0.5), xytext=(cx, loop_y-0.35),
                 arrowprops=dict(arrowstyle="->", color="#333", lw=1.2))
    ax.text(cx+0.1, loop_y-0.42, "Không", fontsize=7.5, color="#555")
    y = loop_y - 0.72
    draw_rounded_box(ax, cx, y, "Admin xem thống kê\nvisitor / vendor count", color="#E8F5E9"); y -= 0.55
    v_arrow(ax, cx, y+0.33, y+0.08)
    y -= 0.22
    draw_end(ax, cx, y)

    ax.set_title("UC3 – Activity Diagram: Admin Duyệt POI / Shop", fontsize=11, fontweight="bold", pad=8)
    return fig_to_bytes(fig)


# ─────────────────────────────────────────────────────────────────────────────
# DOCUMENT BUILDER
# ─────────────────────────────────────────────────────────────────────────────

def build_uc_section(doc, uc_num, uc_name, actors, summary,
                     basic_events, alt_paths, exception_paths,
                     extension_points, triggers, assumptions,
                     preconditions, postconditions, references,
                     usecase_diagram_bytes=None, activity_diagram_bytes=None):

    # Title line
    p = doc.add_paragraph()
    p.paragraph_format.space_before = Pt(0)
    r = p.add_run("Use Case Number:  ")
    r.font.bold = True; r.font.size = Pt(11)

    h = doc.add_heading(uc_num, level=1)
    h.runs[0].font.size = Pt(16)
    h.runs[0].font.bold = True

    add_label_value(doc, "Use Case Name:\n", "")
    add_body_text(doc, uc_name, size=11)
    add_label_value(doc, "Actor(s):\n", "")
    add_body_text(doc, actors, size=11)
    add_label_value(doc, "Maturity:\n", "")
    add_body_text(doc, "Focused", size=11)
    add_label_value(doc, "Summary:\n", "")
    add_body_text(doc, summary, size=11)
    doc.add_paragraph()

    # Basic Course of Events
    p = doc.add_paragraph()
    r = p.add_run("Basic Course of Events:")
    r.font.bold = True; r.font.size = Pt(11)

    add_two_col_table(doc, basic_events)

    # Alternative Paths
    p = doc.add_paragraph()
    r = p.add_run("Alternative Paths:")
    r.font.bold = True; r.font.size = Pt(11)

    for alt in alt_paths:
        add_body_text(doc, alt, size=11, indent=True)

    doc.add_paragraph()

    # Exception Paths
    p = doc.add_paragraph()
    r = p.add_run("Exception Paths:")
    r.font.bold = True; r.font.size = Pt(11)

    for exc in exception_paths:
        add_body_text(doc, exc, size=11, indent=True)

    doc.add_paragraph()

    # Extension Points
    p = doc.add_paragraph()
    r = p.add_run("Extension Points:")
    r.font.bold = True; r.font.size = Pt(11)
    add_body_text(doc, extension_points, size=11, indent=True)

    # Triggers
    p = doc.add_paragraph()
    r = p.add_run("Triggers:")
    r.font.bold = True; r.font.size = Pt(11)
    add_body_text(doc, triggers, size=11, indent=True)

    # Assumptions
    p = doc.add_paragraph()
    r = p.add_run("Assumptions:")
    r.font.bold = True; r.font.size = Pt(11)
    add_body_text(doc, assumptions, size=11, indent=True)

    # Preconditions
    p = doc.add_paragraph()
    r = p.add_run("Preconditions:")
    r.font.bold = True; r.font.size = Pt(11)
    add_body_text(doc, preconditions, size=11, indent=True)

    # Post Conditions
    p = doc.add_paragraph()
    r = p.add_run("Post Conditions:")
    r.font.bold = True; r.font.size = Pt(11)
    add_body_text(doc, postconditions, size=11, indent=True)

    # Reference
    p = doc.add_paragraph()
    r = p.add_run("Reference:")
    r.font.bold = True; r.font.size = Pt(11)
    add_body_text(doc, references, size=11, indent=True)

    # Author / Date
    add_label_value(doc, "Author(s): ", "FlavorTales Dev Team")
    add_label_value(doc, "Date: ", "April 2026")

    doc.add_paragraph()

    # Use Case Diagram
    if usecase_diagram_bytes is not None:
        p = doc.add_paragraph()
        r = p.add_run(f"Use Case Diagram – {uc_num}:")
        r.font.bold = True; r.font.size = Pt(11)
        add_image_centered(doc, usecase_diagram_bytes, width_cm=14)

        add_page_break(doc)

    # Activity Diagram
    if activity_diagram_bytes is not None:
        p = doc.add_paragraph()
        r = p.add_run(f"Activity Diagram – {uc_num}:")
        r.font.bold = True; r.font.size = Pt(11)
        add_image_centered(doc, activity_diagram_bytes, width_cm=13)

    add_page_break(doc)


# ─────────────────────────────────────────────────────────────────────────────
# MAIN
# ─────────────────────────────────────────────────────────────────────────────

def main():
    print("Generating diagrams...")
    uc1_uc = uc1_usecase_diagram()
    uc1_act = uc1_activity_diagram()
    uc2_uc = uc2_usecase_diagram()
    uc2_act = uc2_activity_diagram()
    uc3_uc = uc3_usecase_diagram()
    uc3_act = uc3_activity_diagram()
    print("  ✓ All diagrams generated")

    doc = Document()

    # ── Page margins ──
    for section in doc.sections:
        section.top_margin = Cm(2.5)
        section.bottom_margin = Cm(2.5)
        section.left_margin = Cm(3.0)
        section.right_margin = Cm(2.5)

    # ── Cover ──
    for line in ["FlavorTales", "Focused Use Cases", "Version 1.0  ·  April 2026"]:
        p = doc.add_paragraph(line)
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        run = p.runs[0]
        run.font.size = Pt(20 if "FlavorTales" in line else 16 if "Focused" in line else 12)
        run.font.bold = True
        p.paragraph_format.space_after = Pt(12)
    add_page_break(doc)

    # ── Revision History table ──
    p = doc.add_paragraph("Revision History")
    p.runs[0].font.bold = True; p.runs[0].font.size = Pt(13)
    rev_tbl = doc.add_table(rows=3, cols=4)
    rev_tbl.style = "Table Grid"
    headers = ["Date", "Version", "Description", "Author"]
    data = [
        ("April 2026", "1.0", "Focused Use Cases – UC1 Tourist, UC2 Vendor, UC3 Admin", "FlavorTales Dev Team"),
        ("", "", "", ""),
    ]
    for i, h in enumerate(headers):
        c = rev_tbl.rows[0].cells[i]
        c.paragraphs[0].clear()
        r = c.paragraphs[0].add_run(h)
        r.font.bold = True; r.font.size = Pt(10)
    for r_idx, row_data in enumerate(data):
        for c_idx, txt in enumerate(row_data):
            cell = rev_tbl.rows[r_idx+1].cells[c_idx]
            cell.paragraphs[0].clear()
            cell.paragraphs[0].add_run(txt).font.size = Pt(10)
    add_page_break(doc)

    # ── Table of Contents (manual) ──
    p = doc.add_paragraph("Table of Contents")
    p.runs[0].font.bold = True; p.runs[0].font.size = Pt(13)
    for uc, pg in [("UC1 – Tourist: Khám Phá Bản Đồ & Nghe Audio", 4),
                   ("UC2 – Vendor: Tạo POI & Upload Audio TTS", 8),
                   ("UC3 – Admin: Duyệt POI / Shop & Xem Thống Kê", 12),
                   ("UC4 – Admin/System: Theo Dõi Số Lượng Tourist Thời Gian Thực", 16)]:
        p = doc.add_paragraph()
        p.paragraph_format.tab_stops.add_tab_stop(Cm(13))
        run = p.add_run(f"{uc}\t{pg}")
        run.font.size = Pt(11)
    add_page_break(doc)

    # ─────────────────────────────────────────────────────────────────────
    # UC1 – TOURIST
    # ─────────────────────────────────────────────────────────────────────
    build_uc_section(
        doc,
        uc_num="UC1",
        uc_name="Tourist Khám Phá Bản Đồ & Nghe Audio Thuyết Minh",
        actors="Tourist (Du khách ẩn danh)",
        summary=(
            "Tourist mở ứng dụng FlavorTales, hệ thống tự động tạo phiên ẩn danh (UUID, TTL 24h "
            "trên MongoDB). Du khách chọn ngôn ngữ ưa thích, xem bản đồ các điểm POI đang active, "
            "khi di chuyển vào vùng geofence của một POI thì audio thuyết minh tự động phát "
            "bằng ngôn ngữ đã chọn. Du khách có thể xem chi tiết POI/Shop và like/unlike POI "
            "trong phiên hiện tại mà không cần tài khoản."
        ),
        basic_events=[
            ("1. Tourist mở ứng dụng FlavorTales trên trình duyệt/mobile.", ""),
            ("", "2. Hệ thống kiểm tra localStorage; nếu chưa có session hợp lệ → tạo Session UUID mới lưu MongoDB TTL 24h."),
            ("3. Tourist chọn ngôn ngữ ưa thích (vi/en/zh/ko/ja).", ""),
            ("", "4. Hệ thống lưu ngôn ngữ vào session document; trả về danh sách POI active (lấy từ Redis cache)."),
            ("", "5. Hệ thống hiển thị bản đồ tương tác (Leaflet) với các marker tại vị trí POI active."),
            ("6. Tourist di chuyển đến gần một POI (vào vùng geofence). A1", ""),
            ("", "7. Hệ thống phát hiện tourist vào geofence → tự động phát audio thuyết minh bằng ngôn ngữ đã chọn."),
            ("8. Tourist nghe audio. Có thể nhấn xem chi tiết POI. A2", ""),
            ("9. Tourist nhấn Like POI. A3", ""),
            ("", "10. Hệ thống ghi nhận like theo session (idempotent), tăng bộ đếm likes trên POI. Use case kết thúc."),
        ],
        alt_paths=[
            "A1. Nếu tourist không di chuyển vào geofence, tourist có thể chủ động nhấn vào marker POI trên bản đồ để xem chi tiết. Quay lại bước 8.",
            "A2. Khi xem chi tiết POI/Shop, hệ thống hiển thị thông tin đa ngôn ngữ (tên, mô tả, menu, ảnh). Tourist có thể tắt chi tiết và tiếp tục khám phá bản đồ.",
            "A3. Nếu tourist đã like POI đó trong phiên hiện tại, hành động trở thành Unlike và hệ thống giảm bộ đếm likes.",
        ],
        exception_paths=[
            "E1. Nếu session UUID hết hạn (24h), hệ thống tự động tạo session mới. Lựa chọn ngôn ngữ bị reset về mặc định. Quay lại bước 3.",
            "E2. Nếu không tải được danh sách POI (lỗi mạng / Redis unavailable), hệ thống hiển thị thông báo lỗi và cho phép thử lại.",
            "E3. Nếu không tải được audio (lỗi Cloudflare R2), hệ thống bỏ qua việc phát audio và tiếp tục hiển thị bản đồ.",
        ],
        extension_points=(
            "Tạo Session Ẩn Danh: Khi không tìm thấy session hợp lệ trong localStorage, hệ thống gọi POST /api/location/session "
            "để tạo UUID mới lưu MongoDB với TTL 24h và trả về cho client."
        ),
        triggers="Tourist truy cập trang bản đồ FlavorTales (/map).",
        assumptions=(
            "Tourist sử dụng thiết bị có GPS và kết nối internet (có thể không ổn định). "
            "Tất cả POI hiển thị đã được Admin duyệt (status = active)."
        ),
        preconditions="Không yêu cầu tài khoản. Tourist chỉ cần truy cập trang web.",
        postconditions=(
            "Session tourist được lưu trong MongoDB. Lựa chọn ngôn ngữ và danh sách POI đã xem/nghe "
            "được cập nhật vào session document."
        ),
        references="Business Rules: Geofence radius do Vendor thiết lập (đơn vị: mét). Audio: 1 file/ngôn ngữ/shop. Session TTL: 24 giờ.",
        usecase_diagram_bytes=uc1_uc,
        activity_diagram_bytes=uc1_act,
    )

    # ─────────────────────────────────────────────────────────────────────
    # UC2 – VENDOR
    # ─────────────────────────────────────────────────────────────────────
    build_uc_section(
        doc,
        uc_num="UC2",
        uc_name="Vendor Tạo POI & Upload Audio Thuyết Minh TTS",
        actors="Vendor (Chủ hàng quán đã xác minh email)",
        summary=(
            "Vendor đăng nhập vào cổng quản lý, tạo POI mới kèm thông tin cửa hàng liên kết "
            "(tọa độ, bán kính geofence, mô tả), upload ảnh gallery lên Cloudflare R2, sau đó "
            "nhập văn bản mô tả và tạo audio TTS đa ngôn ngữ (vi/en/zh/ko/ja) thông qua "
            "Google Cloud TTS. POI và Shop được lưu ở trạng thái pending, chờ Admin phê duyệt."
        ),
        basic_events=[
            ("1. Vendor truy cập /auth/vendor/login và nhập thông tin đăng nhập.", ""),
            ("", "2. Hệ thống kiểm tra thông tin đăng nhập; nếu đúng → tạo JWT HTTP-only cookie (30 phút). A1, E1"),
            ("3. Vendor chọn \"Tạo POI mới\" từ menu /vendor/poi/create.", ""),
            ("", "4. Hệ thống hiển thị form tạo POI nhiều bước (tên, tọa độ, bán kính geofence, mô tả)."),
            ("5. Vendor nhập đầy đủ thông tin POI và thông tin cửa hàng liên kết.", ""),
            ("", "6. Hệ thống validate dữ liệu (tọa độ hợp lệ, bán kính > 0, tên không rỗng). E2"),
            ("", "7. Hệ thống tạo POI + Shop liên kết (status = pending), trả về POI ID."),
            ("8. Vendor upload ảnh gallery (JPEG/PNG ≤ 5MB) cho cửa hàng. A2", ""),
            ("", "9. Hệ thống tính SHA-256 checksum, upload lên Cloudflare R2, lưu metadata vào DB."),
            ("10. Vendor nhập văn bản mô tả tiếng Việt cho audio TTS. A3", ""),
            ("11. Vendor xác nhận tạo audio TTS cho tất cả ngôn ngữ.", ""),
            ("", "12. Hệ thống auto-translate vi→en/zh/ko/ja, gọi Google Cloud TTS, lưu audio lên R2. E3"),
            ("", "13. Hệ thống cập nhật trạng thái POI/Shop = pending, gửi thông báo cho Admin. Use case kết thúc."),
        ],
        alt_paths=[
            "A1. Nếu Vendor nhập sai mật khẩu 3 lần liên tiếp, hệ thống khóa tài khoản 15 phút (rate-limiting). Vendor phải chờ hoặc dùng tính năng quên mật khẩu.",
            "A2. Vendor có thể bỏ qua bước upload ảnh và thực hiện sau trên trang chỉnh sửa cửa hàng. Quay lại bước 10.",
            "A3. Vendor có thể nghe thử (preview) TTS trước khi lưu chính thức. Hệ thống stream audio tạm thời mà không lưu lên R2. Sau khi nghe thử, Vendor xác nhận hoặc chỉnh sửa văn bản.",
        ],
        exception_paths=[
            "E1. Nếu tài khoản chưa xác minh email, hệ thống từ chối đăng nhập và hiển thị thông báo yêu cầu xác minh. Vendor được chuyển đến trang /auth/vendor/verify.",
            "E2. Nếu dữ liệu không hợp lệ (tọa độ sai định dạng, bán kính ≤ 0), hệ thống trả về lỗi validation chi tiết. Vendor phải sửa và gửi lại.",
            "E3. Nếu Google TTS không phản hồi (timeout/quota exceeded), hệ thống ghi nhận lỗi và thông báo cho Vendor. POI/Shop vẫn được tạo nhưng không có audio.",
        ],
        extension_points=(
            "Validate Tọa Độ: Hệ thống kiểm tra latitude trong [-90, 90] và longitude trong [-180, 180]. "
            "Upload File: Hệ thống kiểm tra MIME type (image/jpeg, image/png) và kích thước (≤ 5MB) trước khi upload R2."
        ),
        triggers="Vendor muốn đăng ký địa điểm quán ăn và tạo nội dung audio thuyết minh.",
        assumptions=(
            "Vendor đã đăng ký tài khoản và xác minh email thành công. "
            "Vendor đã có tọa độ GPS của địa điểm kinh doanh."
        ),
        preconditions="Vendor có tài khoản với status = active và ROLE_vendor.",
        postconditions=(
            "POI và Shop được lưu với status = pending. Audio TTS đa ngôn ngữ được lưu trên Cloudflare R2. "
            "Admin nhận thông báo về mục cần duyệt mới."
        ),
        references="Business Rules: POI status workflow: pending → active/rejected. 1 audio/ngôn ngữ/shop (unique constraint). Ảnh: SHA-256 checksum.",
        usecase_diagram_bytes=uc2_uc,
        activity_diagram_bytes=uc2_act,
    )

    # ─────────────────────────────────────────────────────────────────────
    # UC3 – ADMIN
    # ─────────────────────────────────────────────────────────────────────
    build_uc_section(
        doc,
        uc_num="UC3",
        uc_name="Admin Duyệt POI / Shop & Xem Thống Kê Hệ Thống",
        actors="Admin (Quản trị viên hệ thống – ROLE_admin)",
        summary=(
            "Admin đăng nhập qua cổng riêng /auth/admin/login, xem danh sách POI và Shop đang "
            "ở trạng thái pending, xem xét chi tiết từng mục và đưa ra quyết định approve hoặc "
            "reject kèm lý do. Hệ thống gửi email thông báo cho Vendor. Admin cũng xem các "
            "thống kê tổng quan: lượt truy cập theo thời gian, số du khách online, số vendor đăng ký."
        ),
        basic_events=[
            ("1. Admin truy cập /auth/admin/login và nhập thông tin đăng nhập.", ""),
            ("", "2. Hệ thống xác thực JWT, kiểm tra ROLE_admin → cấp quyền truy cập Dashboard. E1"),
            ("3. Admin chọn mục \"Pending Reviews\" từ sidebar.", ""),
            ("", "4. Hệ thống trả danh sách POI và Shop đang pending (sắp xếp theo ngày tạo cũ nhất lên trước)."),
            ("5. Admin chọn một mục để xem chi tiết.", ""),
            ("", "6. Hệ thống hiển thị đầy đủ thông tin: tên, mô tả, tọa độ, ảnh gallery, audio, menu items, thông tin Vendor."),
            ("7. Admin quyết định Approve hoặc Reject. A1, A2", ""),
            ("", "8. Hệ thống cập nhật status POI/Shop = active hoặc rejected; gửi email thông báo cho Vendor kèm lý do (nếu reject)."),
            ("9. Admin lặp lại bước 5–8 cho các mục còn lại. A3", ""),
            ("10. Admin chọn mục \"Dashboard\" để xem thống kê.", ""),
            ("", "11. Hệ thống hiển thị: biểu đồ visitor theo ngày/tuần/tháng/năm, số tourist online hiện tại, tổng số vendor. Use case kết thúc."),
        ],
        alt_paths=[
            "A1. Approve: Admin có thể ghi chú thêm (tùy chọn) trước khi nhấn Approve. Hệ thống cập nhật status = active. Nếu POI được approve, Shop liên kết không tự động thay đổi status (phải duyệt riêng).",
            "A2. Reject: Admin bắt buộc nhập lý do từ chối. Hệ thống không cho phép submit nếu trường lý do trống. Status POI/Shop = rejected.",
            "A3. Nếu không còn mục pending, hệ thống hiển thị thông báo \"Không có mục cần duyệt\". Admin được chuyển về Dashboard.",
        ],
        exception_paths=[
            "E1. Nếu tài khoản không có ROLE_admin, hệ thống trả HTTP 403 Forbidden và redirect về trang đăng nhập.",
            "E2. Nếu Admin reject mà không nhập lý do, hệ thống hiển thị lỗi validation yêu cầu nhập lý do từ chối.",
            "E3. Nếu gửi email thông báo cho Vendor thất bại, hệ thống vẫn cập nhật status thành công và ghi log lỗi email để xử lý sau.",
        ],
        extension_points=(
            "Kiểm Tra Quyền Admin: Mỗi request đến /api/admin/* đều được JwtAuthenticationFilter xác thực JWT "
            "và SecurityConfig kiểm tra ROLE_admin. Nếu thiếu quyền → HTTP 403."
        ),
        triggers="Admin nhận thông báo có POI/Shop mới cần duyệt, hoặc Admin muốn xem thống kê hệ thống.",
        assumptions=(
            "Tài khoản Admin được tạo thủ công trong DB với ROLE_admin. "
            "Admin không tự đăng ký được qua giao diện."
        ),
        preconditions="Admin có tài khoản trong DB với ROLE_admin và status = active.",
        postconditions=(
            "POI/Shop được cập nhật status (active hoặc rejected). "
            "Email thông báo kết quả được gửi cho Vendor. "
            "Danh sách pending được làm mới."
        ),
        references="Business Rules: Admin approve/reject POI và Shop độc lập nhau. Reject bắt buộc có lý do. Email notification qua flavortales-notification module.",
        usecase_diagram_bytes=uc3_uc,
        activity_diagram_bytes=uc3_act,
    )

    # ─────────────────────────────────────────────────────────────────────
    # UC4 – REAL-TIME TOURIST TRACKING (no diagrams)
    # ─────────────────────────────────────────────────────────────────────
    add_page_break(doc)
    build_uc_section(
        doc,
        uc_num="UC4",
        uc_name="Theo Dõi Số Lượng Tourist Sử Dụng Theo Thời Gian Thực",
        actors="Admin (Quản trị viên hệ thống), Tourist (Du khách ẩn danh)",
        summary=(
            "Mỗi khi một du khách bắt đầu khám phá bản đồ FlavorTales, hệ thống tự động ghi nhận "
            "sự hiện diện của họ mà không yêu cầu đăng ký tài khoản. Khi du khách rời khỏi, "
            "hệ thống cập nhật lại số liệu. Admin có thể xem tại bất kỳ thời điểm nào số lượng "
            "du khách đang sử dụng nền tảng theo thời gian thực, cũng như tra cứu lịch sử "
            "lượt truy cập theo ngày, tuần, tháng hoặc năm để đánh giá xu hướng tăng trưởng."
        ),
        basic_events=[
            ("1. Tourist truy cập vào FlavorTales và bắt đầu xem bản đồ.", ""),
            ("", "2. Hệ thống tự động nhận diện đây là một lượt truy cập mới và ghi nhận "
               "sự hiện diện của tourist. Số lượng du khách đang online tăng lên 1."),
            ("3. Tourist tiếp tục sử dụng nền tảng (xem địa điểm, nghe thuyết minh, ...).", ""),
            ("", "4. Hệ thống ghi nhận lượt truy cập này vào lịch sử thống kê để phục vụ "
               "báo cáo sau này."),
            ("5. Tourist kết thúc phiên sử dụng và rời khỏi trang.", ""),
            ("", "6. Hệ thống nhận biết tourist đã rời đi và giảm số lượng du khách đang "
               "online xuống 1. Phiên của tourist được đóng lại."),
            ("7. Admin đăng nhập và truy cập trang Dashboard quản trị.", ""),
            ("", "8. Hệ thống hiển thị trên Dashboard: "
               "(a) Số lượng du khách đang sử dụng nền tảng ngay lúc này. "
               "(b) Biểu đồ lịch sử lượt truy cập theo khoảng thời gian Admin chọn. "
               "(c) Tổng số vendor đã đăng ký trên hệ thống."),
            ("9. Admin đọc các số liệu để nắm bắt tình hình hoạt động của nền tảng. "
             "Use case kết thúc.", ""),
        ],
        alt_paths=[
            "A1. Nếu tourist rời trang đột ngột (mất kết nối, trình duyệt bị đóng bất ngờ) "
            "mà không kịp gửi tín hiệu kết thúc phiên, hệ thống sẽ tự động đóng phiên đó "
            "sau một khoảng thời gian không hoạt động nhất định (24 giờ). "
            "Số liệu du khách online sẽ được điều chỉnh lại theo định kỳ.",

            "A2. Nếu tourist quay lại sau khi phiên cũ đã hết hạn, hệ thống coi đây là "
            "một lượt truy cập hoàn toàn mới và ghi nhận thêm một đầu vào vào thống kê. "
            "Không có sự phân biệt giữa tourist lần đầu và tourist quay lại.",

            "A3. Admin có thể chủ động lọc báo cáo lịch sử theo các mốc thời gian khác nhau "
            "(xem theo ngày hôm nay, tuần này, tháng này, hoặc cả năm). "
            "Mỗi lần lọc, hệ thống tổng hợp lại số liệu và cập nhật biểu đồ tương ứng.",
        ],
        exception_paths=[
            "E1. Nếu hệ thống gặp sự cố và không thể ghi nhận sự hiện diện của tourist khi họ "
            "bắt đầu vào trang, tourist vẫn có thể xem bản đồ và sử dụng các tính năng bình thường. "
            "Tuy nhiên, lượt truy cập đó sẽ không được tính vào thống kê. "
            "Admin sẽ thấy số liệu thấp hơn thực tế trong khoảng thời gian xảy ra sự cố.",

            "E2. Nếu tín hiệu kết thúc phiên của tourist không đến được hệ thống (do mạng yếu), "
            "số liệu du khách online có thể bị cao hơn thực tế trong một khoảng thời gian ngắn. "
            "Hệ thống sẽ tự hiệu chỉnh lại sau khi phát hiện các phiên không còn hoạt động.",

            "E3. Nếu số liệu thống kê lịch sử không thể tải được trên Dashboard (do quá tải), "
            "Admin thấy thông báo lỗi và có thể thử tải lại. "
            "Số liệu du khách online hiện tại vẫn được hiển thị bình thường.",
        ],
        extension_points=(
            "Theo Dõi Hiện Diện Tourist: Mỗi khi tourist mở trang bản đồ, hệ thống tự động "
            "nhận biết và ghi nhận phiên hoạt động. Khi tourist rời đi, hệ thống đóng phiên đó. "
            "Tra Cứu Lịch Sử: Admin chọn khoảng thời gian (ngày/tuần/tháng/năm) trên Dashboard, "
            "hệ thống tổng hợp và trả về số lượt truy cập tương ứng với khoảng thời gian đó."
        ),
        triggers=(
            "(a) Tourist mở trang bản đồ → hệ thống tự động ghi nhận và tăng số lượng đang online. "
            "(b) Tourist rời khỏi trang → hệ thống tự động giảm số lượng đang online. "
            "(c) Admin xem Dashboard → hệ thống hiển thị số liệu mới nhất theo thời gian thực."
        ),
        assumptions=(
            "Mỗi lần tourist mở trang bản đồ được tính là một phiên sử dụng độc lập, "
            "không phân biệt tourist đã từng dùng trước đó hay chưa. "
            "Phiên tự động hết hiệu lực sau 24 giờ nếu tourist không sử dụng. "
            "Số liệu hiển thị cho Admin phản ánh tình trạng gần thực tế, "
            "có thể có độ trễ vài giây trong điều kiện tải cao."
        ),
        preconditions=(
            "Hệ thống theo dõi phiên đang hoạt động bình thường. "
            "Admin đã đăng nhập thành công vào trang quản trị."
        ),
        postconditions=(
            "Mỗi lượt truy cập của tourist được lưu vào lịch sử thống kê để Admin "
            "có thể tra cứu và phân tích xu hướng trong tương lai. "
            "Số lượng du khách đang online trên Dashboard phản ánh đúng số phiên "
            "đang hoạt động tại thời điểm Admin xem."
        ),
        references=(
            "Business Rules: Mỗi phiên tourist có hiệu lực tối đa 24 giờ kể từ lúc bắt đầu. "
            "Phiên kết thúc khi tourist rời trang hoặc khi hết thời gian hiệu lực. "
            "Lịch sử thống kê được tổng hợp theo đơn vị: ngày, tuần, tháng, năm. "
            "Modules liên quan: flavortales-location (quản lý phiên tourist), "
            "flavortales-analytics (thống kê lượt truy cập)."
        ),
    )

    doc.save(OUTPUT_FILE)
    print(f"✓ Saved: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
