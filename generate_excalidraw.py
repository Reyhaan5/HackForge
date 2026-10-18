import json
import uuid

def make_id():
    return str(uuid.uuid4())[:10]

elements = []

def add_rect(x, y, w, h, stroke="#1e1e1e", bg="transparent", fill="solid", stroke_width=2, stroke_style="solid", roughness=1, roundness={"type": 3}):
    elem_id = make_id()
    elem = {
        "id": elem_id,
        "type": "rectangle",
        "x": x,
        "y": y,
        "width": w,
        "height": h,
        "angle": 0,
        "strokeColor": stroke,
        "backgroundColor": bg,
        "fillStyle": fill,
        "strokeWidth": stroke_width,
        "strokeStyle": stroke_style,
        "roughness": roughness,
        "opacity": 100,
        "groupIds": [],
        "frameId": None,
        "roundness": roundness,
        "seed": 1000 + len(elements),
        "version": 1,
        "versionNonce": 1,
        "isDeleted": False,
        "boundElements": [],
        "updated": 1
    }
    elements.append(elem)
    return elem_id

def add_ellipse(x, y, w, h, stroke="#e67700", bg="transparent", fill="solid", stroke_width=2, roughness=1):
    elem_id = make_id()
    elem = {
        "id": elem_id,
        "type": "ellipse",
        "x": x,
        "y": y,
        "width": w,
        "height": h,
        "angle": 0,
        "strokeColor": stroke,
        "backgroundColor": bg,
        "fillStyle": fill,
        "strokeWidth": stroke_width,
        "strokeStyle": "solid",
        "roughness": roughness,
        "opacity": 100,
        "groupIds": [],
        "frameId": None,
        "roundness": {"type": 2},
        "seed": 2000 + len(elements),
        "version": 1,
        "versionNonce": 1,
        "isDeleted": False,
        "boundElements": [],
        "updated": 1
    }
    elements.append(elem)
    return elem_id

def add_diamond(x, y, w, h, stroke="#1971c2", bg="transparent", fill="solid", stroke_width=2, roughness=1):
    elem_id = make_id()
    elem = {
        "id": elem_id,
        "type": "diamond",
        "x": x,
        "y": y,
        "width": w,
        "height": h,
        "angle": 0,
        "strokeColor": stroke,
        "backgroundColor": bg,
        "fillStyle": fill,
        "strokeWidth": stroke_width,
        "strokeStyle": "solid",
        "roughness": roughness,
        "opacity": 100,
        "groupIds": [],
        "frameId": None,
        "roundness": {"type": 2},
        "seed": 3000 + len(elements),
        "version": 1,
        "versionNonce": 1,
        "isDeleted": False,
        "boundElements": [],
        "updated": 1
    }
    elements.append(elem)
    return elem_id

def add_text(x, y, text, font_size=16, stroke="#1e1e1e", align="center", bold=False):
    elem_id = make_id()
    lines = text.split("\n")
    line_height = 1.25
    approx_w = max(len(l) for l in lines) * (font_size * 0.6)
    approx_h = len(lines) * font_size * line_height

    elem = {
        "id": elem_id,
        "type": "text",
        "x": x,
        "y": y,
        "width": approx_w,
        "height": approx_h,
        "angle": 0,
        "strokeColor": stroke,
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": 1,
        "strokeStyle": "solid",
        "roughness": 1,
        "opacity": 100,
        "groupIds": [],
        "frameId": None,
        "roundness": None,
        "seed": 4000 + len(elements),
        "version": 1,
        "versionNonce": 1,
        "isDeleted": False,
        "boundElements": [],
        "updated": 1,
        "text": text,
        "fontSize": font_size,
        "fontFamily": 1,
        "textAlign": align,
        "verticalAlign": "top",
        "baseline": font_size,
        "containerId": None,
        "originalText": text,
        "lineHeight": line_height
    }
    elements.append(elem)
    return elem_id

def add_arrow(points, stroke="#1e1e1e", stroke_width=2, stroke_style="solid"):
    elem_id = make_id()
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    min_x = min(xs)
    min_y = min(ys)
    rel_points = [[p[0] - min_x, p[1] - min_y] for p in points]
    w = max(xs) - min_x
    h = max(ys) - min_y

    elem = {
        "id": elem_id,
        "type": "arrow",
        "x": min_x,
        "y": min_y,
        "width": max(w, 1),
        "height": max(h, 1),
        "angle": 0,
        "strokeColor": stroke,
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": stroke_width,
        "strokeStyle": stroke_style,
        "roughness": 1,
        "opacity": 100,
        "groupIds": [],
        "frameId": None,
        "roundness": {"type": 2},
        "seed": 5000 + len(elements),
        "version": 1,
        "versionNonce": 1,
        "isDeleted": False,
        "boundElements": [],
        "updated": 1,
        "points": rel_points,
        "lastCommittedPoint": None,
        "startBinding": None,
        "endBinding": None,
        "startArrowhead": None,
        "endArrowhead": "arrow"
    }
    elements.append(elem)
    return elem_id

def add_line(points, stroke="#1e1e1e", stroke_width=2, stroke_style="solid"):
    elem_id = make_id()
    xs = [p[0] for p in points]
    ys = [p[1] for p in points]
    min_x = min(xs)
    min_y = min(ys)
    rel_points = [[p[0] - min_x, p[1] - min_y] for p in points]
    w = max(xs) - min_x
    h = max(ys) - min_y

    elem = {
        "id": elem_id,
        "type": "line",
        "x": min_x,
        "y": min_y,
        "width": max(w, 1),
        "height": max(h, 1),
        "angle": 0,
        "strokeColor": stroke,
        "backgroundColor": "transparent",
        "fillStyle": "solid",
        "strokeWidth": stroke_width,
        "strokeStyle": stroke_style,
        "roughness": 1,
        "opacity": 100,
        "groupIds": [],
        "frameId": None,
        "roundness": None,
        "seed": 6000 + len(elements),
        "version": 1,
        "versionNonce": 1,
        "isDeleted": False,
        "boundElements": [],
        "updated": 1,
        "points": rel_points,
        "lastCommittedPoint": None,
        "startBinding": None,
        "endBinding": None,
        "startArrowhead": None,
        "endArrowhead": None
    }
    elements.append(elem)
    return elem_id

# ==================== 1600 x 900 LAYOUT ====================
# TOP HEADER ROW
# Team Oval (Top Left)
add_ellipse(50, 25, 140, 65, stroke="#7048e8", bg="#f3f0ff", stroke_width=2)
add_text(65, 45, "Receipt\nGraveyard", font_size=16, stroke="#5f3dc4")

# Main Title (Center)
add_text(520, 30, "THE EXPENSE GRAVEYARD BOTTLENECK", font_size=28, stroke="#1e1e1e", bold=True)
add_line([[500, 72], [1120, 72]], stroke="#1e1e1e", stroke_width=2.5)

# Hackathon Badge (Top Right)
add_rect(1340, 25, 210, 65, stroke="#087f5b", bg="#ebfbee", stroke_width=2)
add_text(1360, 35, "HF'26 HACKATHON\nNMIMS MPSTME", font_size=14, stroke="#2b8a3e")


# ==================== MIDDLE ROW (Y ~ 360-640) ====================

# 1. INPUT CIRCLE (Left)
add_ellipse(50, 360, 250, 250, stroke="#e67700", bg="#fff4e6", stroke_width=2.5)
add_text(145, 325, "INPUT", font_size=18, stroke="#d9480f")

add_rect(75, 385, 200, 48, stroke="#ced4da", bg="#ffffff", stroke_width=1.5)
add_text(85, 400, "📱 Mobile Camera Chits", font_size=13, stroke="#343a40")

add_rect(75, 455, 200, 48, stroke="#ced4da", bg="#ffffff", stroke_width=1.5)
add_text(85, 470, "🧾 Wrinkled Thermal Slips", font_size=13, stroke="#343a40")

add_rect(75, 525, 200, 56, stroke="#ced4da", bg="#ffffff", stroke_width=1.5)
add_text(82, 535, "📧 Email PDFs & Desktop\n    Sync Folders", font_size=12, stroke="#343a40")

add_text(115, 620, "Input Channels", font_size=14, stroke="#d9480f")

# Arrow from Input Circle to Router Diamond
add_arrow([[305, 485], [390, 485]], stroke="#1e1e1e", stroke_width=2.5)


# 2. ROUTER DIAMOND (Dual-Branch Router)
add_diamond(390, 405, 160, 160, stroke="#1971c2", bg="#e7f5ff", stroke_width=2.5)
add_text(420, 455, "Multi-Channel\nExpense\nIntake", font_size=15, stroke="#1864ab")


# ==================== TOP BRANCH (Y: 140 - 280) ====================
# Upward Arrow from Diamond
add_arrow([[470, 405], [470, 285]], stroke="#c2255c", stroke_width=2)
add_text(480, 335, "Policy Branch", font_size=12, stroke="#c2255c")

# Top Branch Box (Policy Blindness)
add_rect(380, 140, 180, 135, stroke="#9c36b5", bg="#f8f0fc", stroke_width=2)
add_line([[380, 215], [560, 215]], stroke="#9c36b5", stroke_width=1.5)
add_text(400, 155, "Strict Policy\nBlindness\n(No Item Nuance)", font_size=13, stroke="#862e9c")
add_text(405, 225, "Auto-Reject\nEntire Bill", font_size=14, stroke="#e03131")
add_text(400, 115, "All-or-Nothing Rule", font_size=12, stroke="#862e9c")

# Curve from Top Box to Feature Fusion (Expense Graveyard)
add_arrow([[560, 205], [640, 205], [640, 440], [690, 440]], stroke="#718096", stroke_width=2)
add_text(575, 185, "Legitimate claims rejected", font_size=11, stroke="#495057")


# ==================== BOTTOM BRANCH (Y: 690 - 830) ====================
# Downward Arrow from Diamond
add_arrow([[470, 565], [470, 685]], stroke="#0c8599", stroke_width=2)
add_text(480, 620, "Fraud Branch", font_size=12, stroke="#0c8599")

# Bottom Branch Box (Fraud Blindspot)
add_rect(380, 690, 180, 135, stroke="#9c36b5", bg="#f8f0fc", stroke_width=2)
add_line([[380, 765], [560, 765]], stroke="#9c36b5", stroke_width=1.5)
add_text(395, 705, "Cross-Claim &\nStructuring\nBlindspot", font_size=13, stroke="#862e9c")
add_text(405, 775, "Invisible\nCollusion", font_size=14, stroke="#e03131")
add_text(410, 835, "Zero Cross-Audit", font_size=12, stroke="#862e9c")

# Curve from Bottom Box to Feature Fusion (Expense Graveyard)
add_arrow([[560, 755], [640, 755], [640, 530], [690, 530]], stroke="#718096", stroke_width=2)
add_text(575, 765, "Duplicates slip by", font_size=11, stroke="#495057")


# ==================== CENTER: FEATURE FUSION ====================
# 3. THE EXPENSE GRAVEYARD (Fusion Capsule)
add_rect(695, 385, 160, 200, stroke="#0c8599", bg="#e3fafc", fill="cross-hatch", stroke_width=2.5)
add_text(710, 405, "The Expense\nGraveyard", font_size=17, stroke="#0b7285")
add_line([[715, 455], [835, 455]], stroke="#0c8599", stroke_width=1)
add_text(765, 470, "↓", font_size=24, stroke="#c92a2a")
add_text(720, 505, "Backlog Pile\n+\nOrphaned Chits", font_size=13, stroke="#d9480f")

# Arrow from Graveyard to Human Chokepoint
add_arrow([[855, 485], [935, 485]], stroke="#1e1e1e", stroke_width=2.5)
add_text(860, 465, "Unresolved", font_size=12, stroke="#495057")


# ==================== HUMAN CHOKEPOINT (DECODER) ====================
# 4. MANUAL AUDITOR
add_rect(935, 415, 175, 140, stroke="#9c36b5", bg="#f8f0fc", stroke_width=2.5)
add_line([[935, 480], [1110, 480]], stroke="#9c36b5", stroke_width=1.5)
add_text(950, 428, "Manual Auditor\n(Human Chokepoint)", font_size=14, stroke="#5f3dc4")
add_text(945, 492, "Line-by-line checks\n& currency conversion", font_size=12, stroke="#495057")
add_text(955, 565, "Reviewer Burnout", font_size=12, stroke="#9c36b5")


# ==================== LOSS FUNCTIONS / FAILURE MODES ====================
# Arrow up from Auditor to Failure Modes
add_arrow([[1050, 415], [1050, 310], [1135, 310]], stroke="#1e1e1e", stroke_width=2)

# Red Box: Audit Failure Modes (Top Right of Auditor)
add_rect(1140, 200, 225, 150, stroke="#c92a2a", bg="#fff5f5", stroke_width=2.5)
add_line([[1140, 240], [1365, 240]], stroke="#c92a2a", stroke_width=1.5)
add_text(1160, 210, "Audit Failure Modes", font_size=15, stroke="#c92a2a")
add_text(1150, 250, "• False Rejection (beer kills ₹5k bill)\n• Double Claims slip by unnoticed\n• Structuring below ₹16.7k cap\n• 3-5 days reimbursement delay", font_size=11, stroke="#495057", align="left")

# Intermediate Fatigue Box (like GAN Box)
add_rect(1140, 440, 225, 80, stroke="#c92a2a", bg="#ffffff", stroke_width=2)
add_text(1165, 455, "Reviewer Fatigue\n(Rubber-Stamping Bad Claims)", font_size=13, stroke="#c92a2a")

# Arrow from Failure Modes down to Fatigue Box
add_arrow([[1250, 350], [1250, 435]], stroke="#c92a2a", stroke_width=2)

# Loop back to Auditor
add_arrow([[1140, 495], [1115, 495]], stroke="#c92a2a", stroke_width=2)


# ==================== OUTPUT CIRCLE (Right) ====================
# Arrow from Fatigue to Output
add_arrow([[1365, 485], [1400, 485]], stroke="#1e1e1e", stroke_width=2.5)

add_ellipse(1405, 360, 250, 250, stroke="#e67700", bg="#fff4e6", stroke_width=2.5)
add_text(1500, 325, "OUTPUT", font_size=18, stroke="#d9480f")

add_text(1435, 430, "5 - 8% Spend\nLeakage", font_size=18, stroke="#c92a2a")
add_line([[1440, 490], [1620, 490]], stroke="#e67700", stroke_width=1.5)
add_text(1440, 505, "3 - 5 Day Delay\nHigh Compliance Risk", font_size=14, stroke="#495057")

add_text(1445, 620, "BUSINESS IMPACT", font_size=18, stroke="#d9480f")


# ==================== BOTTOM PROCESS BANNER & EVALUATION ====================
# Bottom center Process title with double lines
add_line([[720, 680], [1160, 680]], stroke="#868e96", stroke_width=1.5)
add_text(740, 695, "❖  The Traditional Expense Breakdown Cycle", font_size=16, stroke="#343a40")
add_line([[720, 730], [1160, 730]], stroke="#868e96", stroke_width=1.5)

# Bottom Right Evaluation Box
add_rect(1390, 690, 240, 80, stroke="#1971c2", bg="#e7f5ff", stroke_width=2)
add_text(1405, 705, "Hidden Business Exposure\n(Tax Penalties, GST Audit, Morale)", font_size=12, stroke="#1864ab")
add_text(1450, 780, "Testing & Audit Phase", font_size=12, stroke="#868e96")

# Arrow from Output down to Evaluation Box
add_arrow([[1530, 610], [1530, 685]], stroke="#1e1e1e", stroke_width=2)


excalidraw_data = {
    "type": "excalidraw",
    "version": 2,
    "source": "https://excalidraw.com",
    "elements": elements,
    "appState": {
        "viewBackgroundColor": "#ffffff",
        "gridSize": None
    },
    "files": {}
}

output_path = r"c:\Users\Admin\Downloads\Diploma (I.T.)\HackForge\slide2_problem_diagram.excalidraw"
with open(output_path, "w", encoding="utf-8") as f:
    json.dump(excalidraw_data, f, indent=2)

print(f"Generated clean un-overlapping Excalidraw diagram with {len(elements)} elements!")
