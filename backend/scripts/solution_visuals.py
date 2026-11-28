"""Product interface previews for the solutions portfolio, drawn as SVG and rendered to WebP by build_solutions.py / render_solution_images.py.

Each solution gets its OWN preview: its own colour palette (a distinct hue per solution), type style, layout, and industry-specific labels, tables, charts and sample data, taken from the solution's
own modules and from the domain tables below. They are concept designs of how such software could look; they are labelled as previews (never as screenshots of a deployed product), and all names
and figures in them are sample data."""

from __future__ import annotations

import colorsys
import hashlib
from xml.sax.saxutils import escape

W, H = 1200, 800
FONTS = ["Segoe UI, Arial, sans-serif", "Trebuchet MS, Arial, sans-serif", "Verdana, Arial, sans-serif", "Calibri, Segoe UI, Arial, sans-serif", "Tahoma, Arial, sans-serif"]


def hsl(h, s, l):
    r, g, b = colorsys.hls_to_rgb((h % 360) / 360, l, s)
    return "#%02x%02x%02x" % (round(r * 255), round(g * 255), round(b * 255))


class Pal:
    def __init__(self, index: int, slug: str):
        hue = (index * 137.508 + 18) % 360
        self.h = hue
        self.p = hsl(hue, .68, .40)        # primary
        self.p2 = hsl(hue, .70, .52)       # lighter primary
        self.soft = hsl(hue, .75, .95)     # tint
        self.soft2 = hsl(hue, .45, .90)
        self.dark = hsl(hue, .45, .13)     # sidebar / text
        self.acc = hsl(hue + 38, .78, .50) # accent
        self.acc2 = hsl(hue - 40, .65, .48)
        d = hashlib.sha256(slug.encode()).digest()
        self.font = FONTS[d[0] % len(FONTS)]
        self.r = [4, 8, 12, 16][d[1] % 4]
        self.d = d


def esc(s):
    return escape(str(s))


def R(x, y, w, h, fill="#fff", rx=8, stroke="none", sw=1, op=1, extra=""):
    if "stroke=" in extra:
        return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" fill="{fill}" fill-opacity="{op}" {extra}/>'
    return f'<rect x="{x:.1f}" y="{y:.1f}" width="{w:.1f}" height="{h:.1f}" rx="{rx}" fill="{fill}" stroke="{stroke}" stroke-width="{sw}" fill-opacity="{op}" {extra}/>'


def T(x, y, s, size=14, fill="#1e293b", weight=500, anchor="start", op=1, ls=0):
    return f'<text x="{x:.1f}" y="{y:.1f}" font-size="{size}" font-weight="{weight}" fill="{fill}" text-anchor="{anchor}" fill-opacity="{op}" letter-spacing="{ls}">{esc(s)}</text>'


def clip(s, n):
    s = str(s)
    return s if len(s) <= n else s[: n - 1].rstrip() + "…"


def L(x1, y1, x2, y2, c="#e2e8f0", w=1, extra=""):
    return f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{c}" stroke-width="{w}" {extra}/>'


def C(cx, cy, r, fill, op=1, stroke="none", sw=1):
    return f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{fill}" fill-opacity="{op}" stroke="{stroke}" stroke-width="{sw}"/>'


# ------------------------------------------------------------------------------------------------------------------------------------------------ domains
# key words in the solution name -> (table columns, 4 sample rows, 3 KPI labels, chart)
DOM = [
    ("inventory", ("Item", "SKU", "In stock", "Price"), [("Basmati rice 5 kg", "RC-1042", "128", "₹ 420"), ("Sunflower oil 1 L", "OL-2210", "64", "₹ 155"), ("Tea powder 250 g", "TP-0871", "212", "₹ 118"), ("Detergent 2 kg", "DT-3305", "37", "₹ 289")], ("Today's sales", "Low-stock items", "Bills today"), "bar"),
    ("clinic", ("Patient", "Doctor", "Time", "Status"), [("S. Raman", "Dr. Meera", "10:30", "Waiting"), ("A. Fathima", "Dr. Karthik", "10:45", "In consult"), ("P. Nair", "Dr. Meera", "11:00", "Booked"), ("R. Das", "Dr. Joseph", "11:15", "Booked")], ("Appointments today", "Patients waiting", "Collection today"), "bar"),
    ("hospital", ("Patient", "Ward / bed", "Admitted", "Status"), [("M. Iyer", "General 12", "24 Nov", "Stable"), ("K. Bose", "ICU 03", "26 Nov", "Observation"), ("T. Singh", "Private 07", "27 Nov", "Discharge due"), ("L. George", "General 08", "27 Nov", "Stable")], ("Occupied beds", "Admissions today", "Pending bills"), "donut"),
    ("accounting", ("Voucher", "Ledger", "Date", "Amount"), [("PV-0418", "Office rent", "24 Nov", "₹ 45,000"), ("RV-0731", "Customer receipt", "25 Nov", "₹ 1,28,400"), ("JV-0122", "Depreciation", "26 Nov", "₹ 9,800"), ("PV-0419", "Stationery", "27 Nov", "₹ 3,260")], ("Receivables", "Payables", "Cash & bank"), "line"),
    ("manufacturing", ("Order", "Stage", "Due", "Progress"), [("PO-2201", "Cutting", "02 Dec", "35%"), ("PO-2202", "Assembly", "04 Dec", "62%"), ("PO-2203", "Finishing", "06 Dec", "88%"), ("PO-2204", "Dispatch", "07 Dec", "100%")], ("Orders in production", "Material shortages", "On-time rate"), "bar"),
    ("restaurant", ("Table", "Order", "Items", "Amount"), [("T-04", "#1182", "4", "₹ 1,240"), ("T-07", "#1183", "2", "₹ 560"), ("Takeaway", "#1184", "3", "₹ 810"), ("T-11", "#1185", "6", "₹ 2,090")], ("Open tables", "Orders today", "Sales today"), "bar"),
    ("school", ("Student", "Class", "Attendance", "Fee status"), [("Aarav K.", "8-A", "96%", "Paid"), ("Diya R.", "8-B", "91%", "Due ₹ 4,500"), ("Imran S.", "9-A", "88%", "Paid"), ("Nila P.", "7-C", "99%", "Paid")], ("Students present", "Fees due", "Exams this month"), "bar"),
    ("pharmacy", ("Medicine", "Batch", "Expiry", "Stock"), [("Paracetamol 500", "B-2231", "03/27", "420"), ("Amoxicillin 250", "B-1180", "01/27", "96"), ("Cetirizine 10", "B-0907", "12/26", "58"), ("ORS sachet", "B-3320", "08/27", "310")], ("Expiring in 90 days", "Bills today", "Low stock"), "bar"),
    ("hotel", ("Room", "Guest", "Check-out", "Status"), [("101", "Sample guest A", "28 Nov", "Occupied"), ("102", "—", "—", "Vacant clean"), ("203", "Sample guest B", "29 Nov", "Occupied"), ("204", "—", "—", "Cleaning")], ("Occupancy", "Arrivals today", "Revenue today"), "donut"),
    ("warehouse", ("Goods receipt", "Location", "Items", "Status"), [("GR-5521", "Rack A-04", "120", "Stored"), ("GR-5522", "Rack C-11", "48", "Putaway"), ("DN-3310", "Dock 2", "75", "Dispatched"), ("TR-0912", "WH-1 → WH-2", "30", "In transit")], ("Pallets stored", "Receipts today", "Dispatches today"), "bar"),
    ("textile", ("Style", "Fabric", "Sizes", "Stage"), [("ST-114 kurta", "Cotton 40s", "S–XXL", "Stitching"), ("ST-121 shirt", "Poplin", "M–XL", "Cutting"), ("ST-130 saree", "Silk blend", "Free", "Packing"), ("ST-142 tee", "Jersey", "S–XL", "Dispatch")], ("Rolls in stock", "Orders in production", "Dispatch due"), "bar"),
    ("crm", ("Lead", "Company", "Stage", "Next follow-up"), [("R. Menon", "Sunrise Traders", "Proposal", "Tomorrow"), ("A. Khan", "Nila Interiors", "New", "Today"), ("S. Pillai", "Greenfield Edu", "Qualified", "29 Nov"), ("J. Thomas", "Metro Clinic", "Negotiation", "30 Nov")], ("Open leads", "Follow-ups due", "Won this month"), "funnel"),
    ("hr", ("Employee", "Department", "Today", "Leave balance"), [("N. Arun", "Sales", "Present", "8 days"), ("K. Devi", "Accounts", "Present", "12 days"), ("V. Raj", "Support", "On leave", "5 days"), ("P. Anand", "IT", "Present", "10 days")], ("Present today", "On leave", "Pending requests"), "donut"),
    ("erp", ("Document", "Module", "Owner", "Status"), [("SO-3301", "Sales", "R. Menon", "Approved"), ("PO-1190", "Purchase", "K. Devi", "Pending"), ("INV-8812", "Finance", "A. Khan", "Posted"), ("GRN-0451", "Stores", "V. Raj", "Received")], ("Open orders", "Pending approvals", "Month revenue"), "line"),
    ("learning", ("Course", "Learners", "Completion", "Next live class"), [("Python basics", "128", "72%", "Mon 6 pm"), ("Digital marketing", "94", "65%", "Wed 7 pm"), ("Web design", "76", "81%", "Fri 6 pm"), ("Excel for work", "152", "58%", "Sat 10 am")], ("Active learners", "Courses live", "Avg. completion"), "bar"),
    ("franchise", ("Brand", "Industry", "Investment", "Cities"), [("Sample Foods", "Food & beverage", "₹ 15–25 L", "12"), ("Sample Learn", "Education", "₹ 8–12 L", "30"), ("Sample Fit", "Fitness", "₹ 20–30 L", "9"), ("Sample Care", "Healthcare", "₹ 25–40 L", "6")], ("Listed brands", "Enquiries this week", "Cities covered"), "bar"),
    ("appointment", ("Customer", "Service", "Staff", "Slot"), [("D. Rao", "Consultation", "Priya", "10:00"), ("M. Alam", "Follow-up", "Karan", "10:30"), ("S. Joy", "Consultation", "Priya", "11:00"), ("T. Lal", "Check-up", "Anita", "11:30")], ("Bookings today", "No-shows", "Slots free"), "calendar"),
    ("analytics", ("Branch", "Revenue", "Orders", "Growth"), [("Salem", "₹ 18.4 L", "1,204", "+8%"), ("Bangalore", "₹ 22.9 L", "1,611", "+12%"), ("Mumbai", "₹ 15.1 L", "980", "−2%"), ("Chennai", "₹ 9.7 L", "702", "+5%")], ("Revenue", "Orders", "Avg. basket"), "line"),
    ("attendance", ("Employee", "Check-in", "Check-out", "Status"), [("N. Arun", "09:02", "—", "Present"), ("K. Devi", "09:15", "—", "Late"), ("V. Raj", "—", "—", "Leave"), ("P. Anand", "08:58", "—", "Present")], ("Present", "Late arrivals", "On leave"), "donut"),
    ("freelanc", ("Project", "Budget", "Proposals", "Deadline"), [("Logo redesign", "₹ 8,000", "14", "5 days"), ("Product video edit", "₹ 15,000", "9", "7 days"), ("Android bug fixes", "₹ 20,000", "11", "10 days"), ("Blog writing", "₹ 4,000", "21", "3 days")], ("Open projects", "Freelancers online", "Paid out"), "bar"),
    ("field", ("Staff", "Task", "Location", "Status"), [("Anil", "Site survey", "Salem", "On site"), ("Bala", "Delivery 14", "Omalur", "In transit"), ("Chitra", "Client visit", "Attur", "Completed"), ("Dev", "Installation", "Namakkal", "Assigned")], ("Staff in field", "Visits completed", "Tasks pending"), "map"),
    ("parent", ("Notice", "Class", "Sent", "Read"), [("Parent meeting", "All", "Today", "82%"), ("Homework – Maths", "7-B", "Today", "71%"), ("Fee reminder", "9-A", "Yesterday", "64%"), ("Sports day", "All", "2 days ago", "90%")], ("Notices sent", "Read rate", "Absent alerts"), "bar"),
    ("e-commerce", ("Order", "Customer", "Items", "Status"), [("#20418", "A. Kumar", "3", "Packed"), ("#20419", "S. Banu", "1", "Shipped"), ("#20420", "R. Pillai", "5", "Placed"), ("#20421", "D. Shah", "2", "Delivered")], ("Orders today", "Cart value", "Returns"), "bar"),
    ("social", ("Member", "Interests", "Joined", "Status"), [("Sample user 1", "Cricket, Music", "Today", "Active"), ("Sample user 2", "Cooking", "Today", "Active"), ("Sample user 3", "Trekking", "Yesterday", "Reported"), ("Sample user 4", "Books", "2 days ago", "Active")], ("New members", "Chats started", "Reports to review"), "bar"),
    ("exam", ("Test", "Attempts", "Avg. score", "Topic"), [("Mock test 14", "1,204", "62%", "Quant"), ("Mock test 15", "980", "58%", "Reasoning"), ("Sectional 7", "1,512", "71%", "English"), ("Mock test 16", "845", "55%", "GK")], ("Learners today", "Tests taken", "Avg. score"), "bar"),
    ("skill", ("Skill offered", "Skill wanted", "Area", "Match"), [("Guitar", "Spoken English", "Salem", "92%"), ("Photography", "Excel", "Omalur", "88%"), ("Tamil writing", "Yoga", "Attur", "81%"), ("Coding", "Cooking", "Salem", "76%")], ("Active swaps", "New listings", "Sessions this week"), "bar"),
    ("rooms", ("Listing", "Area", "Rent / month", "Enquiries"), [("Single room, attached bath", "Hasthampatti", "₹ 6,500", "12"), ("PG – 2 sharing", "Fairlands", "₹ 4,200", "9"), ("1 BHK flat", "Alagapuram", "₹ 9,000", "5"), ("Hostel bed", "Four Roads", "₹ 3,500", "17")], ("Listings", "Enquiries today", "Visits booked"), "bar"),
    ("learning app", ("Lesson", "Course", "Length", "Progress"), [("Intro to algebra", "Maths 9", "12 min", "100%"), ("Photosynthesis", "Science 8", "18 min", "60%"), ("Tenses", "English 7", "15 min", "0%"), ("Fractions", "Maths 6", "10 min", "35%")], ("Learners", "Lessons today", "Avg. time"), "bar"),
    ("finance", ("Date", "Category", "Note", "Amount"), [("24 Nov", "Groceries", "Weekly shop", "−₹ 2,340"), ("25 Nov", "Salary", "Credited", "+₹ 52,000"), ("26 Nov", "Fuel", "Petrol", "−₹ 1,200"), ("27 Nov", "Rent", "Month", "−₹ 14,000")], ("Spent this month", "Saved", "Budget left"), "donut"),
    ("home service", ("Job", "Service", "Provider", "Status"), [("#J-881", "AC service", "Selvam", "On the way"), ("#J-882", "Plumbing", "Murugan", "Scheduled"), ("#J-883", "Deep cleaning", "Team B", "In progress"), ("#J-884", "Electrician", "Karthi", "Completed")], ("Jobs today", "Providers online", "Rating"), "map"),
    ("default", ("Item", "Owner", "Date", "Status"), [("Record 001", "Team A", "24 Nov", "Active"), ("Record 002", "Team B", "25 Nov", "Pending"), ("Record 003", "Team A", "26 Nov", "Active"), ("Record 004", "Team C", "27 Nov", "Done")], ("Total", "Pending", "Completed"), "bar"),
]


def domain_of(name: str):
    n = name.lower()
    for key, *rest in DOM:
        if key in n:
            return rest
    # a few aliases
    for alias, key in (("billing", "inventory"), ("pos", "restaurant"), ("college", "school"), ("lms", "learning"), ("booking", "appointment"), ("reporting", "analytics"), ("employee management app", "hr"), ("education & learning", "learning app"), ("exam", "exam"), ("shopping", "e-commerce"), ("personal finance", "finance")):
        if alias in n:
            for key, *rest in DOM:
                if key == alias or key == {"billing": "inventory", "pos": "restaurant", "college": "school", "lms": "learning", "booking": "appointment", "reporting": "analytics", "employee management app": "hr", "education & learning": "learning app", "shopping": "e-commerce", "personal finance": "finance"}.get(alias):
                    return rest
    return DOM[-1][1:]


def kv(slug: str, i: int, lo=20, hi=980) -> int:
    d = hashlib.sha256(f"{slug}{i}".encode()).digest()
    return lo + (d[0] * 256 + d[1]) % (hi - lo)


# ------------------------------------------------------------------------------------------------------------------------------------------------ charts
def chart(kind, x, y, w, h, p: Pal, slug):
    o = [R(x, y, w, h, "#fff", p.r + 4, "#e5e7eb")]
    vals = [30 + kv(slug, i, 0, 60) for i in range(8)]
    if kind in ("bar", "calendar", "map", "funnel"):
        bw = (w - 60) / 8
        for i, v in enumerate(vals):
            bh = (h - 70) * v / 90
            o.append(R(x + 30 + i * bw, y + h - 30 - bh, bw * .6, bh, p.p if i % 3 else p.acc, 4))
        o.append(L(x + 24, y + h - 30, x + w - 24, y + h - 30))
    elif kind in ("line", "area"):
        pts = [(x + 30 + i * (w - 60) / 7, y + h - 34 - (h - 80) * v / 90) for i, v in enumerate(vals)]
        d = "M" + " L".join(f"{a:.1f} {b:.1f}" for a, b in pts)
        o.append(f'<path d="{d} L{pts[-1][0]:.1f} {y + h - 34} L{pts[0][0]:.1f} {y + h - 34} Z" fill="{p.p}" fill-opacity=".10"/>')
        o.append(f'<path d="{d}" fill="none" stroke="{p.p}" stroke-width="3"/>')
        for a, b in pts:
            o.append(C(a, b, 4.5, "#fff", 1, p.p, 2.5))
    else:  # donut
        cx, cy, r = x + w * .36, y + h / 2 + 8, min(w, h) * .30
        o.append(C(cx, cy, r, "none", 1, p.soft2, 26))
        import math
        tot, start = 100, -90
        for j, frac in enumerate((46, 28, 16)):
            ang = frac * 3.6
            a1, a2 = math.radians(start), math.radians(start + ang)
            large = 1 if ang > 180 else 0
            o.append(f'<path d="M{cx + r * math.cos(a1):.1f} {cy + r * math.sin(a1):.1f} A{r} {r} 0 {large} 1 {cx + r * math.cos(a2):.1f} {cy + r * math.sin(a2):.1f}" fill="none" stroke="{[p.p, p.acc, p.acc2][j]}" stroke-width="26"/>')
            start += ang
        for j, lab in enumerate(("Primary", "Secondary", "Other")):
            o.append(R(x + w * .66, y + h / 2 - 30 + j * 30, 12, 12, [p.p, p.acc, p.acc2][j], 3) + T(x + w * .66 + 22, y + h / 2 - 20 + j * 30, lab, 13, "#475569"))
    return "".join(o)


def table(x, y, w, cols, rows, p: Pal, rowh=40):
    o = [R(x, y, w, 44 + rowh * len(rows) + 8, "#fff", p.r + 4, "#e5e7eb")]
    cw = [w * f for f in (.34, .22, .22, .22)]
    cx = x + 20
    for j, c in enumerate(cols):
        o.append(T(cx, y + 28, c.upper(), 11, "#64748b", 700, ls=.6))
        cx += cw[j]
    o.append(L(x + 14, y + 40, x + w - 14, y + 40, "#e2e8f0"))
    for i, row in enumerate(rows):
        cx = x + 20
        ty = y + 40 + rowh * (i + 1) - 14
        for j, v in enumerate(row):
            if j == len(row) - 1:
                col = {"Paid": "#16a34a", "Present": "#16a34a", "Completed": "#16a34a", "Delivered": "#16a34a", "Received": "#16a34a"}.get(v, p.p)
                o.append(R(cx - 8, ty - 15, min(cw[j] - 8, 12 + len(v) * 7.4), 24, col, 12, op=.12) + T(cx, ty, clip(v, 16), 12, col, 700))
            else:
                o.append(T(cx, ty, clip(v, 22), 13, "#1e293b", 600 if j == 0 else 500))
            cx += cw[j]
        if i < len(rows) - 1:
            o.append(L(x + 14, ty + 12, x + w - 14, ty + 12, "#f1f5f9"))
    return "".join(o)


def shell(p: Pal, title, tag, body, bg="#eef2f7"):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" width="{W}" height="{H}" font-family="{p.font}" role="img" aria-label="{esc(tag)}: {esc(title)}">'
            f'<rect width="{W}" height="{H}" fill="{bg}"/>{body}'
            f'<rect x="{W - 262}" y="{H - 46}" width="244" height="30" rx="15" fill="#0f172a" fill-opacity=".82"/>{T(W - 140, H - 26, tag, 13, "#fff", 700, "middle")}</svg>')


def window(p: Pal, title, inner, x=40, y=40, w=1120, h=700, url=None):
    o = [R(x, y, w, h, "#fff", 14, "#cbd5e1", 1.5), R(x, y, w, 40, "#f1f5f9", 14), R(x, y + 26, w, 14, "#f1f5f9")]
    for i, c in enumerate(("#f87171", "#fbbf24", "#34d399")):
        o.append(C(x + 24 + i * 22, y + 20, 6, c))
    if url:
        o.append(R(x + 120, y + 9, 420, 22, "#fff", 11, "#e2e8f0") + T(x + 136, y + 25, url, 12, "#64748b", 500))
    return "".join(o) + inner


# ------------------------------------------------------------------------------------------------------------------------------------------------ desktop / web layouts
def lay_dashboard(p, name, nav, dom, slug):  # A: sidebar + KPIs + chart + table
    cols, rows, kpis, ck = dom
    X, Y = 40, 80
    o = [R(X, Y, 220, 660, p.dark, 0), T(X + 22, Y + 40, clip(name, 20), 17, "#fff", 800), R(X + 22, Y + 56, 40, 4, p.acc, 2)]
    for i, m in enumerate(nav[:6]):
        yy = Y + 100 + i * 46
        if i == 0:
            o.append(R(X + 10, yy - 22, 200, 36, p.p, p.r))
        o.append(C(X + 30, yy - 4, 5, "#fff", 1 if i == 0 else .4) + T(X + 46, yy, clip(m, 20), 14, "#fff", 600 if i == 0 else 500, op=1 if i == 0 else .75))
    o.append(R(X + 220, Y, 860, 56, "#fff", 0, extra='stroke="#e5e7eb"') + T(X + 246, Y + 35, clip(nav[0], 28), 20, "#0f172a", 800) + R(X + 640, Y + 14, 240, 30, "#f1f5f9", 15) + T(X + 660, Y + 34, "Search…", 13, "#94a3b8") + C(X + 1030, Y + 28, 16, p.p2) + T(X + 1030, Y + 33, "A", 14, "#fff", 800, "middle"))
    for i in range(3):
        cx = X + 246 + i * 282
        o.append(R(cx, Y + 76, 262, 96, "#fff", p.r + 4, "#e5e7eb") + R(cx, Y + 76, 6, 96, [p.p, p.acc, p.acc2][i], 3) + T(cx + 24, Y + 108, kpis[i], 13, "#64748b", 600) + T(cx + 24, Y + 150, f"{kv(slug, i, 12, 999):,}" if i != 2 else f"{kv(slug, 5, 55, 99)}%", 32, "#0f172a", 800))
    o.append(chart(ck if ck not in ("calendar", "map", "funnel") else "bar", X + 246, Y + 192, 400, 230, p, slug) + T(X + 266, Y + 222, "Overview", 14, "#0f172a", 800))
    o.append(R(X + 666, Y + 192, 394, 230, "#fff", p.r + 4, "#e5e7eb") + T(X + 686, Y + 222, "Quick actions", 14, "#0f172a", 800))
    for i, m in enumerate(nav[1:5]):
        o.append(R(X + 686, Y + 238 + i * 44, 354, 34, p.soft, p.r) + T(X + 702, Y + 260 + i * 44, clip(m, 36), 13, p.p, 700))
    o.append(table(X + 246, Y + 442, 814, cols, rows[:3], p, 36))
    return o


def lay_pos(p, name, nav, dom, slug):  # B: item grid + order panel
    cols, rows, kpis, ck = dom
    X, Y = 40, 80
    o = [R(X, Y, 1120, 56, p.dark, 0) + T(X + 24, Y + 36, clip(name, 30), 19, "#fff", 800)]
    for i, m in enumerate(nav[:4]):
        o.append(R(X + 420 + i * 160, Y + 12, 148, 32, p.p if i == 0 else "#ffffff", 16, op=1 if i == 0 else .12) + T(X + 494 + i * 160, Y + 33, clip(m, 16), 13, "#fff", 700, "middle"))
    for i, r in enumerate(rows):
        for j in range(2):
            idx = i * 2 + j
            gx, gy = X + 24 + (idx % 4) * 170, Y + 84 + (idx // 4) * 150
            o.append(R(gx, gy, 156, 136, "#fff", p.r + 4, "#e5e7eb") + R(gx + 12, gy + 12, 132, 58, [p.soft, p.soft2][idx % 2], p.r) + C(gx + 78, gy + 41, 18, p.p2, .55) + T(gx + 12, gy + 94, clip(r[0] if j == 0 else r[0] + " (pack)", 17), 13, "#0f172a", 700) + T(gx + 12, gy + 118, str(r[-1]) if j == 0 else "Bulk rate", 13, p.p, 800))
    o.append(R(X + 730, Y + 70, 366, 560, "#fff", p.r + 4, "#e5e7eb") + T(X + 752, Y + 104, "Current order", 16, "#0f172a", 800))
    tot = 0
    for i, r in enumerate(rows):
        yy = Y + 140 + i * 56
        o.append(T(X + 752, yy, clip(r[0], 20), 14, "#0f172a", 600) + T(X + 752, yy + 20, f"Qty {1 + i}", 12, "#64748b") + T(X + 1076, yy, str(r[-1]), 14, "#0f172a", 700, "end") + L(X + 752, yy + 32, X + 1076, yy + 32, "#f1f5f9"))
    o.append(T(X + 752, Y + 420, "Sub-total", 14, "#64748b") + T(X + 1076, Y + 420, "₹ " + f"{kv(slug, 9, 900, 4800):,}", 14, "#0f172a", 700, "end") + T(X + 752, Y + 450, "Tax", 14, "#64748b") + T(X + 1076, Y + 450, "₹ " + f"{kv(slug, 8, 40, 400):,}", 14, "#0f172a", 700, "end"))
    o.append(R(X + 752, Y + 500, 322, 54, p.p, p.r + 2) + T(X + 913, Y + 534, "Pay & print bill", 17, "#fff", 800, "middle"))
    o.append(R(X + 24, Y + 400, 690, 230, "#fff", p.r + 4, "#e5e7eb") + T(X + 44, Y + 432, "Today", 15, "#0f172a", 800))
    for i in range(3):
        o.append(T(X + 44 + i * 220, Y + 480, kpis[i], 12, "#64748b", 600) + T(X + 44 + i * 220, Y + 520, f"{kv(slug, i + 3, 20, 999):,}", 28, p.p, 800))
    return o


def lay_split(p, name, nav, dom, slug):  # C: list + detail
    cols, rows, kpis, ck = dom
    X, Y = 40, 80
    o = [R(X, Y, 1120, 56, "#fff", 0, extra='stroke="#e5e7eb"') + R(X + 24, Y + 14, 30, 28, p.p, p.r) + T(X + 66, Y + 36, clip(name, 28), 19, "#0f172a", 800)]
    for i, m in enumerate(nav[:5]):
        o.append(T(X + 460 + i * 130, Y + 36, clip(m, 14), 13, p.p if i == 0 else "#64748b", 700 if i == 0 else 500))
    o.append(R(X, Y + 56, 380, 604, "#f8fafc", 0) + R(X + 20, Y + 76, 340, 36, "#fff", 18, "#e2e8f0") + T(X + 42, Y + 100, "Search records…", 13, "#94a3b8"))
    for i, r in enumerate(rows * 2):
        yy = Y + 130 + i * 62
        sel = i == 1
        o.append(R(X + 16, yy, 348, 54, "#fff" if not sel else p.soft, p.r, p.p if sel else "#e5e7eb", 1.5) + C(X + 44, yy + 27, 15, [p.p2, p.acc, p.acc2][i % 3], .85) + T(X + 70, yy + 24, clip(r[0], 24), 14, "#0f172a", 700) + T(X + 70, yy + 42, clip(f"{r[1]} · {r[2]}", 30), 12, "#64748b") + T(X + 346, yy + 24, clip(r[-1], 12), 11, p.p, 700, "end"))
    o.append(T(X + 410, Y + 100, clip(rows[1][0], 26), 26, "#0f172a", 800) + T(X + 410, Y + 126, f"{cols[1]}: {rows[1][1]}   ·   {cols[2]}: {rows[1][2]}", 14, "#64748b"))
    for i, t in enumerate(nav[1:5]):
        o.append(T(X + 410 + i * 150, Y + 168, clip(t, 15), 13, p.p if i == 0 else "#64748b", 700 if i == 0 else 500))
    o.append(L(X + 410, Y + 180, X + 1090, Y + 180, "#e2e8f0") + R(X + 410, Y + 178, 110, 3, p.p, 1))
    for i, c in enumerate(cols):
        fx, fy = X + 410 + (i % 2) * 345, Y + 210 + (i // 2) * 84
        o.append(T(fx, fy, c, 12, "#64748b", 700) + R(fx, fy + 10, 320, 40, "#fff", p.r, "#cbd5e1") + T(fx + 14, fy + 36, clip(rows[1][i], 28), 14, "#0f172a", 600))
    o.append(table(X + 410, Y + 400, 680, cols, rows[:3], p, 34))
    o.append(R(X + 410, Y + 580, 130, 42, p.p, p.r) + T(X + 475, Y + 607, "Save", 15, "#fff", 800, "middle") + R(X + 552, Y + 580, 130, 42, "#fff", p.r, "#cbd5e1") + T(X + 617, Y + 607, "Print", 15, "#334155", 700, "middle"))
    return o


def lay_calendar(p, name, nav, dom, slug):  # D: schedule grid
    cols, rows, kpis, ck = dom
    X, Y = 40, 80
    o = [R(X, Y, 1120, 56, p.p, 0) + T(X + 24, Y + 36, clip(name, 30), 19, "#fff", 800)]
    for i, m in enumerate(nav[:4]):
        o.append(T(X + 520 + i * 140, Y + 36, clip(m, 14), 13, "#fff", 700, op=1 if i == 0 else .75))
    o.append(R(X, Y + 56, 250, 604, "#f8fafc", 0) + T(X + 20, Y + 96, "November 2026", 15, "#0f172a", 800))
    for d in range(30):
        cx, cy = X + 26 + (d % 7) * 31, Y + 130 + (d // 7) * 30
        o.append((C(cx, cy - 4, 13, p.p) if d == 26 else "") + T(cx, cy, str(d + 1), 12, "#fff" if d == 26 else "#475569", 600, "middle"))
    for i, k in enumerate(kpis):
        o.append(R(X + 16, Y + 330 + i * 76, 218, 64, "#fff", p.r, "#e5e7eb") + T(X + 32, Y + 356 + i * 76, k, 12, "#64748b", 600) + T(X + 32, Y + 384 + i * 76, str(kv(slug, i, 5, 99)), 24, p.p, 800))
    days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
    gx = X + 270
    for i, dname in enumerate(days):
        o.append(T(gx + 60 + i * 140, Y + 92, f"{dname} {23 + i}", 14, "#0f172a", 800, "middle"))
    for hr in range(8):
        yy = Y + 110 + hr * 68
        o.append(L(gx, yy, X + 1104, yy) + T(gx - 6, yy + 14, f"{9 + hr}:00", 11, "#94a3b8", 600, "end"))
    names = [r[0] for r in rows] + [r[1] for r in rows]
    for i in range(14):
        d, h, ln = kv(slug, i, 0, 6), kv(slug, i + 20, 0, 6), 1 + kv(slug, i + 40, 0, 2)
        o.append(R(gx + 8 + d * 140, Y + 114 + h * 68, 124, 60 * ln, [p.soft, p.soft2, p.p][i % 3], p.r, [p.p, p.p, p.p][i % 3], 1) + T(gx + 18 + d * 140, Y + 140 + h * 68, clip(names[i % len(names)], 14), 12, p.p if i % 3 != 2 else "#fff", 700) + T(gx + 18 + d * 140, Y + 158 + h * 68, clip(rows[i % 4][2], 14), 11, p.dark if i % 3 != 2 else "#fff", 500, op=.8))
    return o


def lay_kanban(p, name, nav, dom, slug):  # E: pipeline board
    cols, rows, kpis, ck = dom
    X, Y = 40, 80
    o = [R(X, Y, 1120, 56, p.dark, 0) + T(X + 24, Y + 36, clip(name, 30), 19, "#fff", 800)]
    for i, m in enumerate(nav[:4]):
        o.append(T(X + 520 + i * 140, Y + 36, clip(m, 14), 13, "#fff", 700, op=1 if i == 0 else .65))
    stages = ["New", "Contacted", "Proposal", "Won"] if "Lead" in cols[0] or "Brand" in cols[0] else [nav[min(i, len(nav) - 1)] for i in range(4)]
    for s in range(4):
        cx = X + 20 + s * 272
        o.append(R(cx, Y + 76, 256, 580, "#f1f5f9", p.r + 2) + T(cx + 16, Y + 106, clip(stages[s], 18), 15, "#0f172a", 800) + R(cx + 200, Y + 90, 40, 22, [p.p, p.acc, p.acc2, "#16a34a"][s], 11, op=.15) + T(cx + 220, Y + 106, str(kv(slug, s, 3, 40)), 12, [p.p, p.acc, p.acc2, "#16a34a"][s], 800, "middle"))
        for i in range(3 + (s % 2)):
            r = rows[(i + s) % 4]
            yy = Y + 128 + i * 126
            o.append(R(cx + 12, yy, 232, 112, "#fff", p.r, "#e5e7eb") + R(cx + 12, yy, 5, 112, [p.p, p.acc, p.acc2, "#16a34a"][s], 2) + T(cx + 30, yy + 28, clip(r[0], 20), 14, "#0f172a", 700) + T(cx + 30, yy + 50, clip(r[1], 24), 12, "#64748b") + R(cx + 30, yy + 66, 70 + (i * 17) % 50, 8, p.soft2, 4) + C(cx + 40, yy + 92, 11, [p.p2, p.acc, p.acc2][i % 3]) + T(cx + 58, yy + 96, clip(r[2], 14), 12, "#475569", 600))
    return o


def lay_wall(p, name, nav, dom, slug):  # F: analytics wall
    cols, rows, kpis, ck = dom
    X, Y = 40, 80
    o = [R(X, Y, 1120, 56, "#fff", 0, extra='stroke="#e5e7eb"') + T(X + 24, Y + 36, clip(name, 30), 19, p.dark, 800)]
    for i, f in enumerate(("Last 30 days", "All branches", "All teams")):
        o.append(R(X + 640 + i * 150, Y + 13, 138, 30, p.soft, 15) + T(X + 709 + i * 150, Y + 33, f, 12, p.p, 700, "middle"))
    for i in range(4):
        cx = X + 20 + i * 274
        o.append(R(cx, Y + 76, 258, 90, "#fff", p.r + 4, "#e5e7eb") + T(cx + 20, Y + 106, kpis[i % 3] if i < 3 else "Growth", 12, "#64748b", 600) + T(cx + 20, Y + 148, f"{kv(slug, i, 10, 990):,}" if i < 3 else f"+{kv(slug, 7, 2, 18)}%", 30, "#0f172a", 800))
    o.append(chart("line", X + 20, Y + 186, 540, 230, p, slug + "a") + T(X + 40, Y + 214, "Trend", 14, "#0f172a", 800))
    o.append(chart("bar", X + 580, Y + 186, 520, 230, p, slug + "b") + T(X + 600, Y + 214, "By branch", 14, "#0f172a", 800))
    o.append(chart("donut", X + 20, Y + 436, 380, 220, p, slug + "c") + T(X + 40, Y + 464, "Share", 14, "#0f172a", 800))
    o.append(table(X + 420, Y + 436, 680, cols, rows[:3], p, 36))
    return o


LAYOUTS = {"A": lay_dashboard, "B": lay_pos, "C": lay_split, "D": lay_calendar, "E": lay_kanban, "F": lay_wall}


def desktop(slug, name, modules, index, layout, web=False):
    p = Pal(index, slug)
    dom = domain_of(name)
    nav = modules
    body = "".join(LAYOUTS[layout](p, name, nav, dom, slug))
    inner = window(p, name, body, url=("app.yourcompany.com/" + slug.split("-")[0]) if web else None)
    return shell(p, name, "Product Interface Preview", inner)


# ------------------------------------------------------------------------------------------------------------------------------------------------ mobile
def phone(p, x, y, kind, title, nav, dom, slug, scale=1.0):
    cols, rows, kpis, ck = dom
    w, h = 300 * scale, 620 * scale
    o = [R(x, y, w, h, "#0f172a", 38 * scale), R(x + 9, y + 9, w - 18, h - 18, "#f8fafc", 30 * scale), R(x + w / 2 - 40, y + 14, 80, 18, "#0f172a", 9)]
    sx, sy, sw_ = x + 9, y + 40, w - 18
    o.append(R(sx, sy, sw_, 60 * scale, p.p, 0) + T(sx + 20, sy + 38 * scale, clip(title, 20), 18 * scale, "#fff", 800))
    yy = sy + 76 * scale
    if kind == "list":
        for i, r in enumerate(rows * 2):
            o.append(R(sx + 14, yy + i * 62 * scale, sw_ - 28, 54 * scale, "#fff", 12, "#e5e7eb") + C(sx + 44, yy + i * 62 * scale + 27 * scale, 15 * scale, [p.p2, p.acc, p.acc2][i % 3], .9) + T(sx + 70, yy + i * 62 * scale + 24 * scale, clip(r[0], 17), 13 * scale, "#0f172a", 700) + T(sx + 70, yy + i * 62 * scale + 42 * scale, clip(r[2], 20), 11 * scale, "#64748b") + T(sx + sw_ - 26, yy + i * 62 * scale + 32 * scale, clip(r[-1], 9), 10 * scale, p.p, 700, "end"))
    elif kind == "cards":
        for i, r in enumerate(rows):
            gx, gy = sx + 14 + (i % 2) * ((sw_ - 42) / 2 + 14), yy + (i // 2) * 188 * scale
            cw = (sw_ - 42) / 2
            o.append(R(gx, gy, cw, 176 * scale, "#fff", 12, "#e5e7eb") + R(gx + 8, gy + 8, cw - 16, 88 * scale, [p.soft, p.soft2][i % 2], 10) + C(gx + cw / 2, gy + 52 * scale, 22 * scale, p.p2, .6) + T(gx + 12, gy + 120 * scale, clip(r[0], 14), 12 * scale, "#0f172a", 700) + T(gx + 12, gy + 142 * scale, clip(r[1], 14), 10.5 * scale, "#64748b") + R(gx + 12, gy + 150 * scale, cw - 24, 18 * scale, p.p, 9) + T(gx + cw / 2, gy + 163 * scale, "View", 10 * scale, "#fff", 700, "middle"))
    elif kind == "map":
        o.append(R(sx, yy - 10, sw_, 250 * scale, "#e8f0e8", 0))
        for i in range(7):
            o.append(L(sx + 10 + i * 40 * scale, yy - 10, sx + 60 + i * 30 * scale, yy + 240 * scale, "#fff", 8) + L(sx, yy + i * 36 * scale, sx + sw_, yy + 18 + i * 30 * scale, "#fff", 7))
        for i in range(4):
            px, py = sx + 40 + kv(slug, i, 0, 180) * scale, yy + 20 + kv(slug, i + 9, 0, 180) * scale
            o.append(C(px, py, 11 * scale, [p.p, p.acc, p.acc2, p.p2][i]) + C(px, py, 4.5 * scale, "#fff"))
        o.append(R(sx + 12, yy + 188 * scale, sw_ - 24, 130 * scale, "#fff", 16, "#e5e7eb") + T(sx + 28, yy + 218 * scale, clip(rows[0][0], 18), 14 * scale, "#0f172a", 800) + T(sx + 28, yy + 240 * scale, clip(f"{rows[0][1]} · {rows[0][2]}", 28), 11 * scale, "#64748b") + R(sx + 28, yy + 256 * scale, sw_ - 56, 36 * scale, p.p, 18) + T(sx + sw_ / 2, yy + 279 * scale, "Check in", 13 * scale, "#fff", 800, "middle"))
    elif kind == "chart":
        for i in range(2):
            o.append(R(sx + 14 + i * ((sw_ - 42) / 2 + 14), yy, (sw_ - 42) / 2, 70 * scale, "#fff", 12, "#e5e7eb") + T(sx + 26 + i * ((sw_ - 42) / 2 + 14), yy + 26 * scale, clip(kpis[i], 14), 10.5 * scale, "#64748b", 600) + T(sx + 26 + i * ((sw_ - 42) / 2 + 14), yy + 56 * scale, f"{kv(slug, i, 10, 990):,}", 20 * scale, p.p, 800))
        o.append(chart("donut", sx + 14, yy + 84 * scale, sw_ - 28, 200 * scale, p, slug))
        for i, r in enumerate(rows[:3]):
            o.append(T(sx + 26, yy + 316 * scale + i * 30 * scale, clip(r[0], 16), 12 * scale, "#0f172a", 600) + T(sx + sw_ - 26, yy + 316 * scale + i * 30 * scale, clip(r[-1], 12), 12 * scale, p.p, 700, "end"))
    else:  # form
        for i, c in enumerate(cols):
            o.append(T(sx + 20, yy + 14 + i * 74 * scale, c, 11 * scale, "#64748b", 700) + R(sx + 14, yy + 22 + i * 74 * scale, sw_ - 28, 42 * scale, "#fff", 10, "#cbd5e1") + T(sx + 28, yy + 49 * scale + i * 74 * scale, clip(rows[1][i], 22), 13 * scale, "#0f172a", 600))
        o.append(R(sx + 14, yy + 330 * scale, sw_ - 28, 46 * scale, p.p, 23) + T(sx + sw_ / 2, yy + 360 * scale, "Continue", 15 * scale, "#fff", 800, "middle"))
    o.append(R(sx, y + h - 66 * scale, sw_, 56 * scale, "#fff", 0, extra='stroke="#e5e7eb"'))
    for i, m in enumerate(nav[:4]):
        cx = sx + (i + .5) * sw_ / 4
        o.append(C(cx, y + h - 46 * scale, 6 * scale, p.p if i == 0 else "#cbd5e1") + T(cx, y + h - 24 * scale, clip(m, 9), 9 * scale, p.p if i == 0 else "#94a3b8", 700, "middle"))
    return "".join(o)


MOBILE_SETS = {"A": ("list", "cards", "chart"), "B": ("map", "list", "form"), "C": ("cards", "form", "list"), "D": ("chart", "list", "map"), "E": ("form", "chart", "cards")}


def mobile(slug, name, modules, index, layout):
    p = Pal(index, slug)
    dom = domain_of(name)
    kinds = MOBILE_SETS[layout]
    short = clip(name.replace(" App", ""), 18)
    body = [C(600, 400, 360, p.soft, .8)]
    for i, (x, y, sc) in enumerate(((120, 120, .86), (450, 70, 1.0), (790, 120, .86))):
        titles = [modules[1], short, modules[2]]
        body.append(phone(p, x, y, kinds[i], clip(titles[i], 20), modules[:4] if i == 1 else modules[1:5], dom, slug + str(i), sc))
    return shell(p, name, "Product Interface Preview", "".join(body), bg=hsl(p.h, .35, .93))


# ------------------------------------------------------------------------------------------------------------------------------------------------ websites (one distinct design per industry)
def browser(inner, url, p=None):
    return (R(60, 50, 1080, 700, "#fff", 14, "#cbd5e1", 1.5) + R(60, 50, 1080, 38, "#f1f5f9", 14) + R(60, 76, 1080, 12, "#f1f5f9") +
            "".join(C(82 + i * 20, 69, 5.5, c) for i, c in enumerate(("#f87171", "#fbbf24", "#34d399"))) + R(190, 58, 400, 22, "#fff", 11, "#e2e8f0") + T(204, 74, url, 12, "#64748b") + inner)


def web_corporate(p):
    o = [R(60, 88, 1080, 662, "#0b1220", 0), T(90, 128, "NORTHSTAR", 18, "#fff", 800, ls=3)]
    for i, m in enumerate(("Services", "Solutions", "Case studies", "Careers", "Contact")):
        o.append(T(620 + i * 100, 128, m, 13, "#cbd5e1", 600))
    o.append(R(1020, 108, 100, 32, "#22d3ee", 16) + T(1070, 129, "Get in touch", 12, "#06222b", 800, "middle"))
    o.append(T(90, 250, "Technology that scales", 50, "#fff", 800) + T(90, 306, "with your business.", 50, "#22d3ee", 800) + T(90, 350, "Software, cloud and integration teams for growing companies.", 18, "#94a3b8", 500))
    o.append(R(90, 384, 170, 48, "#22d3ee", 24) + T(175, 415, "Start a project", 15, "#06222b", 800, "middle") + R(276, 384, 150, 48, "none", 24, "#475569", 1.5) + T(351, 415, "Our work", 15, "#e2e8f0", 700, "middle"))
    o.append(R(660, 190, 440, 270, "#111c33", 16, "#1e3a5f") + "".join(R(684, 218 + i * 30, [320, 250, 360, 200, 300, 270, 340][i], 12, ["#22d3ee", "#a78bfa", "#34d399", "#fbbf24", "#22d3ee", "#a78bfa", "#34d399"][i], 6, op=.75) for i in range(7)))
    for i, (a, b) in enumerate((("120+", "projects"), ("24/7", "support"), ("15", "technologies"), ("98%", "retention"))):
        o.append(T(110 + i * 260, 580, a, 36, "#fff", 800) + T(110 + i * 260, 608, b, 14, "#94a3b8", 500))
    o.append(R(60, 650, 1080, 100, "#0f1a30", 0) + "".join(R(90 + i * 258, 672, 238, 56, "#14213d", 10) + T(110 + i * 258, 706, s, 14, "#cbd5e1", 700) for i, s in enumerate(("Custom software", "Cloud & DevOps", "AI automation", "IT consulting"))))
    return o


def web_retail(p):
    o = [R(60, 88, 1080, 52, "#fff", 0, extra='stroke="#eee"') + T(90, 122, "Textile House", 22, "#7c2d12", 800), R(60, 140, 1080, 34, "#7c2d12", 0) + T(600, 162, "Festival offer: flat 20% off on silk sarees · Free shipping above ₹ 2,999", 13, "#fde68a", 700, "middle")]
    for i, m in enumerate(("Sarees", "Kurtas", "Fabrics", "Kids", "Offers")):
        o.append(T(500 + i * 90, 122, m, 14, "#44403c", 700))
    o.append(R(980, 104, 130, 34, "#fef3c7", 17) + T(1045, 126, "Cart (2)", 13, "#7c2d12", 800, "middle"))
    cats = [("#be123c", "Kanchipuram silk", "₹ 8,499"), ("#0f766e", "Cotton kurta set", "₹ 1,299"), ("#a16207", "Banarasi dupatta", "₹ 2,150"), ("#4338ca", "Linen fabric (m)", "₹ 540")]
    for i, (c, n, pr) in enumerate(cats):
        x = 90 + i * 258
        o.append(R(x, 210, 238, 300, "#fff", 12, "#e7e5e4") + R(x, 210, 238, 200, c, 12, op=.9) + "".join(L(x + 20, 230 + k * 22, x + 218, 230 + k * 22, "#fff", 1, 'stroke-opacity=".25"') for k in range(8)) + C(x + 119, 310, 44, "#fff", .18) + T(x + 16, 442, n, 15, "#1c1917", 700) + T(x + 16, 470, pr, 16, "#be123c", 800) + R(x + 16, 480, 206, 0.1, "#fff"))
        o.append(R(x + 150, 452, 72, 30, "#7c2d12", 15) + T(x + 186, 472, "Add", 12, "#fff", 800, "middle"))
    o.append(R(90, 540, 1020, 190, "#fffbeb", 14) + T(120, 590, "Shop by occasion", 24, "#7c2d12", 800) + "".join(R(120 + i * 240, 620, 220, 80, "#fff", 12, "#fde68a") + T(230 + i * 240, 668, s, 15, "#7c2d12", 700, "middle") for i, s in enumerate(("Wedding", "Festival", "Office wear", "Daily wear"))))
    return o


def web_health(p):
    o = [R(60, 88, 1080, 662, "#f0fdfa", 0), R(60, 88, 1080, 60, "#fff", 0), C(96, 118, 16, "#0d9488"), T(122, 125, "CityCare Clinic", 20, "#134e4a", 800)]
    for i, m in enumerate(("Doctors", "Departments", "Health tips", "Contact")):
        o.append(T(640 + i * 110, 125, m, 14, "#334155", 600))
    o.append(R(1000, 102, 120, 34, "#0d9488", 17) + T(1060, 124, "Book visit", 13, "#fff", 800, "middle"))
    o.append(T(100, 240, "Caring for your family,", 44, "#134e4a", 800) + T(100, 292, "every day.", 44, "#0d9488", 800) + T(100, 332, "Experienced doctors, clear timings and easy appointments.", 17, "#475569", 500))
    o.append(R(660, 180, 440, 190, "#fff", 18, "#99f6e4") + T(690, 218, "Request an appointment", 17, "#134e4a", 800) + "".join(R(690 + (i % 2) * 200, 236 + (i // 2) * 52, 180, 40, "#f0fdfa", 8, "#99f6e4") + T(702 + (i % 2) * 200, 262 + (i // 2) * 52, s, 13, "#64748b", 500) for i, s in enumerate(("Your name", "Phone number", "Department", "Preferred date"))) + R(690, 342, 380, 0.1))
    o.append(R(100, 400, 160, 46, "#0d9488", 23) + T(180, 430, "Call now", 15, "#fff", 800, "middle"))
    for i, (n, d) in enumerate((("Dr. A. Meera", "General medicine"), ("Dr. K. Rajan", "Paediatrics"), ("Dr. S. Priya", "Gynaecology"), ("Dr. V. Anand", "Orthopaedics"))):
        x = 100 + i * 258
        o.append(R(x, 500, 238, 220, "#fff", 16, "#ccfbf1") + C(x + 119, 560, 36, "#99f6e4") + C(x + 119, 548, 14, "#0d9488", .7) + R(x + 99, 566, 40, 22, "#0d9488", 11, op=.7) + T(x + 119, 632, n, 16, "#134e4a", 800, "middle") + T(x + 119, 656, d, 13, "#64748b", 500, "middle") + R(x + 49, 672, 140, 32, "#ccfbf1", 16) + T(x + 119, 694, "Book", 13, "#0f766e", 800, "middle"))
    return o


def web_edu(p):
    o = [R(60, 88, 1080, 70, "#1e3a8a", 0), C(100, 123, 20, "#fbbf24"), T(132, 130, "Sunrise Institute", 22, "#fff", 800)]
    for i, m in enumerate(("About", "Courses", "Admissions", "Faculty", "Gallery")):
        o.append(T(640 + i * 90, 130, m, 14, "#bfdbfe", 600))
    o.append(R(60, 158, 1080, 250, "#2563eb", 0) + "".join(C(900 + i * 70, 300 - (i % 2) * 40, 90 - i * 10, "#1d4ed8", .5) for i in range(4)) + T(100, 250, "Admissions open 2027", 46, "#fff", 800) + T(100, 296, "Quality education, experienced faculty, modern labs.", 18, "#dbeafe", 500) + R(100, 330, 180, 48, "#fbbf24", 24) + T(190, 361, "Apply now", 16, "#1e3a8a", 800, "middle"))
    for i, (a, b) in enumerate((("30+", "Courses"), ("85", "Faculty"), ("4,200", "Students"), ("22", "Years"))):
        o.append(R(100 + i * 258, 380, 238, 70, "#fff", 12, "#e2e8f0") + T(130 + i * 258, 424, a, 28, "#1e3a8a", 800) + T(230 + i * 258, 424, b, 14, "#64748b", 600))
    for i, c in enumerate(("Computer Science", "Commerce & Accounting", "Electronics", "Management")):
        o.append(R(100 + i * 258, 480, 238, 236, "#fff", 12, "#e2e8f0") + R(100 + i * 258, 480, 238, 100, ["#1d4ed8", "#0e7490", "#7c3aed", "#b45309"][i], 12, op=.85) + T(116 + i * 258, 614, c, 16, "#0f172a", 800) + T(116 + i * 258, 640, "3 years · Full time", 13, "#64748b") + T(116 + i * 258, 690, "View syllabus →", 13, "#1d4ed8", 700))
    return o


def web_food(p):
    o = [R(60, 88, 1080, 662, "#1c1917", 0), T(90, 128, "SPICE ROUTE", 22, "#fbbf24", 800, ls=4)]
    for i, m in enumerate(("Menu", "Reservations", "Gallery", "Events", "Contact")):
        o.append(T(480 + i * 100, 128, m, 14, "#e7e5e4", 600))
    o.append(R(1020, 106, 100, 34, "none", 17, "#fbbf24", 1.5) + T(1070, 128, "Reserve", 13, "#fbbf24", 800, "middle"))
    o.append(T(90, 270, "Slow-cooked flavours,", 48, "#fff", 800, ls=0) + T(90, 324, "served warm.", 48, "#fbbf24", 800) + T(90, 366, "Open daily 11 am – 11 pm · Dine-in and takeaway", 17, "#a8a29e", 500))
    for i, c in enumerate(("#b45309", "#92400e", "#78350f")):
        o.append(C(760 + i * 120, 260 + (i % 2) * 70, 100 - i * 14, c, .95) + C(760 + i * 120, 260 + (i % 2) * 70, 70 - i * 10, "#fbbf24", .25))
    for i, (n, d, pr) in enumerate((("Chettinad chicken", "Pepper & curry leaf", "₹ 320"), ("Veg thali", "Seven items", "₹ 220"), ("Malabar biryani", "Slow cooked", "₹ 280"), ("Filter coffee", "Fresh decoction", "₹ 60"))):
        x = 90 + i * 258
        o.append(R(x, 520, 238, 190, "#292524", 14, "#44403c") + T(x + 18, 566, n, 17, "#fff", 800) + T(x + 18, 592, d, 13, "#a8a29e", 500) + T(x + 18, 640, pr, 22, "#fbbf24", 800) + R(x + 150, 616, 70, 34, "#fbbf24", 17) + T(x + 185, 638, "Order", 13, "#1c1917", 800, "middle"))
    return o


def web_manuf(p):
    o = [R(60, 88, 1080, 662, "#f4f4f5", 0), R(60, 88, 1080, 64, "#27272a", 0), R(90, 106, 30, 30, "#f97316", 4), T(132, 130, "STEELCRAFT INDUSTRIES", 17, "#fff", 800, ls=1.5)]
    for i, m in enumerate(("Products", "Capabilities", "Quality", "Export", "Contact")):
        o.append(T(640 + i * 100, 130, m, 13, "#d4d4d8", 600))
    o.append(R(60, 152, 1080, 250, "#3f3f46", 0) + "".join(R(700 + i * 56, 200 + (i % 3) * 20, 40, 190 - (i % 3) * 20, "#52525b", 2) for i in range(7)) + T(100, 250, "Precision components,", 42, "#fff", 800) + T(100, 298, "made to specification.", 42, "#f97316", 800) + T(100, 336, "CNC machining · Fabrication · Export-ready packaging", 16, "#d4d4d8", 500) + R(100, 354, 200, 40, "#f97316", 4) + T(200, 380, "Request a quote", 14, "#fff", 800, "middle"))
    o.append(R(100, 430, 640, 290, "#fff", 6, "#d4d4d8") + T(122, 462, "Product specifications", 16, "#27272a", 800))
    for i, row in enumerate((("Part", "Material", "Tolerance", "MOQ"), ("Shaft 25 mm", "EN8 steel", "±0.02 mm", "200"), ("Flange DN50", "SS 304", "±0.05 mm", "100"), ("Bracket B12", "MS", "±0.10 mm", "500"))):
        o.append("".join(T(122 + j * 150, 500 + i * 48, v, 13, "#27272a" if i else "#71717a", 700 if i == 0 else 500) for j, v in enumerate(row)) + L(116, 512 + i * 48, 724, 512 + i * 48, "#e4e4e7"))
    for i, (a, b) in enumerate((("ISO", "Quality managed"), ("40+", "Export countries"), ("25 yrs", "Experience"))):
        o.append(R(770, 430 + i * 98, 330, 86, "#fff", 6, "#d4d4d8") + R(770, 430 + i * 98, 6, 86, "#f97316", 2) + T(796, 478 + i * 98, a, 28, "#27272a", 800) + T(900, 478 + i * 98, b, 14, "#71717a", 600))
    return o


def web_estate(p):
    o = [R(60, 88, 1080, 662, "#fff", 0), T(90, 128, "Greenview Builders", 21, "#064e3b", 800)]
    for i, m in enumerate(("Projects", "Ongoing", "Completed", "About", "Contact")):
        o.append(T(580 + i * 100, 128, m, 14, "#334155", 600))
    o.append(R(60, 150, 1080, 330, "#d1fae5", 0) + "".join(R(560 + i * 70, 400 - h, 56, h, ["#047857", "#065f46", "#059669", "#10b981"][i % 4], 3) for i, h in enumerate((140, 220, 180, 260, 200, 240, 160, 210))) + "".join(R(572 + i * 70, 400 - h + 14 + k * 26, 12, 12, "#fef3c7", 2) for i, h in enumerate((140, 220, 180, 260, 200, 240, 160, 210)) for k in range(min(h // 40, 5))) + T(100, 230, "Homes designed for living.", 40, "#064e3b", 800) + T(100, 270, "Apartments and villas across Salem · RERA details on request", 16, "#065f46", 500))
    o.append(R(100, 430, 1000, 76, "#fff", 14, "#a7f3d0", 1.5))
    for i, s in enumerate(("Location", "Type", "Budget")):
        o.append(T(130 + i * 250, 460, s, 12, "#64748b", 700) + T(130 + i * 250, 486, ("Anywhere in Salem", "2 / 3 BHK", "₹ 40 L – 1.2 Cr")[i], 15, "#0f172a", 700))
    o.append(R(900, 444, 180, 48, "#047857", 24) + T(990, 475, "Search projects", 14, "#fff", 800, "middle"))
    for i, (n, a, pr) in enumerate((("Greenview Heights", "2 & 3 BHK · 48 units", "From ₹ 58 L"), ("Lakeside Villas", "3 BHK villas · 24 units", "From ₹ 96 L"), ("Orchid Residency", "2 BHK · 60 units", "From ₹ 42 L"), ("Palm Court", "Plots · 80 sites", "From ₹ 18 L"))):
        x = 100 + i * 256
        o.append(R(x, 536, 236, 190, "#fff", 12, "#d1fae5") + R(x, 536, 236, 90, ["#34d399", "#6ee7b7", "#10b981", "#a7f3d0"][i], 12) + T(x + 16, 656, n, 15, "#064e3b", 800) + T(x + 16, 680, a, 12, "#64748b", 500) + T(x + 16, 708, pr, 15, "#047857", 800))
    return o


def web_beauty(p):
    o = [R(60, 88, 1080, 662, "#fff7f5", 0), T(600, 130, "Aura Salon & Spa", 26, "#9d174d", 800, "middle")]
    for i, m in enumerate(("Services", "Packages", "Gallery", "Offers", "Book")):
        o.append(T(340 + i * 130, 168, m, 14, "#78716c", 600, "middle"))
    o.append(C(900, 330, 160, "#fbcfe8", .55) + C(1010, 260, 90, "#fecdd3", .7) + C(840, 420, 70, "#fde68a", .5))
    o.append(T(100, 300, "Relax. Refresh.", 52, "#831843", 800) + T(100, 360, "Glow.", 52, "#be185d", 800) + T(100, 404, "Hair · Skin · Spa · Bridal", 18, "#78716c", 500) + R(100, 428, 190, 50, "#be185d", 25) + T(195, 460, "Book appointment", 15, "#fff", 800, "middle"))
    for i, (n, pr) in enumerate((("Haircut & styling", "from ₹ 350"), ("Signature facial", "from ₹ 1,200"), ("Aroma massage", "from ₹ 1,800"), ("Bridal package", "on request"))):
        x = 100 + i * 258
        o.append(R(x, 520, 238, 190, "#fff", 18, "#fbcfe8") + C(x + 40, 570, 22, ["#fbcfe8", "#fecdd3", "#fde68a", "#e9d5ff"][i]) + T(x + 24, 628, n, 16, "#831843", 800) + T(x + 24, 654, pr, 14, "#be185d", 700) + T(x + 24, 686, "Learn more →", 13, "#78716c", 600))
    return o


def web_auto(p):
    o = [R(60, 88, 1080, 662, "#0a0a0a", 0), T(90, 128, "METRO MOTORS", 20, "#fff", 800, ls=3), R(990, 106, 120, 34, "#dc2626", 4) + T(1050, 128, "Test drive", 13, "#fff", 800, "middle")]
    for i, m in enumerate(("New cars", "Used", "Service", "Finance", "Contact")):
        o.append(T(560 + i * 90, 128, m, 14, "#a3a3a3", 600))
    # car silhouette
    o.append('<path d="M180 400 C230 340 330 320 430 318 L560 316 C640 318 700 350 740 400 L780 404 C800 408 806 420 800 440 L170 440 C160 420 164 406 180 400 Z" fill="#dc2626"/>' + C(290, 442, 38, "#171717", 1, "#525252", 6) + C(670, 442, 38, "#171717", 1, "#525252", 6) + '<path d="M300 380 C340 340 420 332 500 332 L600 336 C640 340 670 360 690 380 Z" fill="#fca5a5" fill-opacity=".35"/>')
    o.append(T(840, 270, "Drive your", 34, "#fff", 800) + T(840, 312, "next one.", 34, "#dc2626", 800) + T(840, 346, "Certified pre-owned and new models.", 14, "#a3a3a3", 500) + R(840, 372, 150, 44, "#dc2626", 4) + T(915, 400, "View stock", 14, "#fff", 800, "middle"))
    o.append(R(100, 500, 1000, 60, "#171717", 6, "#262626") + "".join(T(124 + i * 245, 536, s, 14, "#e5e5e5", 600) + R(110 + i * 245 - 4 + 200, 520, 0.1, 0.1) for i, s in enumerate(("Brand: Any", "Fuel: Petrol / Diesel", "Budget: ₹ 5–15 L", "Search"))))
    for i, (n, d, pr) in enumerate((("Hatchback LX", "2022 · 18,400 km · Petrol", "₹ 6.4 L"), ("Compact SUV VX", "2021 · 32,100 km · Diesel", "₹ 9.8 L"), ("Sedan ZX", "2023 · 9,200 km · Petrol", "₹ 11.2 L"), ("MPV GX", "2020 · 51,000 km · Diesel", "₹ 8.9 L"))):
        x = 100 + i * 256
        o.append(R(x, 580, 236, 150, "#171717", 6, "#262626") + R(x + 12, 592, 212, 56, "#262626", 4) + R(x + 40, 610, 156, 24, "#dc2626", 10, op=.8) + T(x + 14, 672, n, 15, "#fff", 800) + T(x + 14, 692, d, 11, "#a3a3a3", 500) + T(x + 14, 718, pr, 17, "#f87171", 800))
    return o


def web_pro(p):
    o = [R(60, 88, 1080, 662, "#fafaf9", 0), T(100, 132, "A. Kumar & Associates", 20, "#1c1917", 700), T(1100, 132, "Home   About   Services   Contact", 13, "#57534e", 600, "end")]
    o.append(L(100, 150, 1100, 150, "#d6d3d1"))
    o.append(T(100, 290, "Clear advice for", 54, "#1c1917", 700) + T(100, 352, "growing businesses.", 54, "#b45309", 700) + T(100, 396, "Management consulting · Tax & compliance · Business planning", 17, "#57534e", 500))
    o.append(R(100, 424, 190, 50, "#1c1917", 3) + T(195, 455, "Book a consultation", 14, "#fff", 700, "middle") + T(320, 455, "or call +91 00000 00000", 14, "#57534e", 600))
    for i, (n, d) in enumerate((("Business strategy", "Market entry, pricing and growth plans for small and mid-size companies."), ("Tax & compliance", "Registrations, returns and record-keeping done on time."), ("Financial planning", "Budgets, cash-flow and funding preparation."))):
        x = 100 + i * 340
        o.append(R(x, 520, 320, 190, "#fff", 4, "#e7e5e4") + T(x + 24, 566, f"0{i + 1}", 22, "#b45309", 700) + T(x + 24, 604, n, 18, "#1c1917", 700) + "".join(T(x + 24, 632 + k * 20, line, 13, "#57534e", 500) for k, line in enumerate((d[:44], d[44:88]))))
    return o


WEB = {"corporate": web_corporate, "retail": web_retail, "healthcare": web_health, "education": web_edu, "food": web_food, "manufacturing": web_manuf, "real-estate": web_estate, "beauty": web_beauty, "automobile": web_auto, "professional": web_pro}


def website(slug, name, key, index):
    p = Pal(index, slug)
    host = {"corporate": "northstar.example", "retail": "textilehouse.example", "healthcare": "citycareclinic.example", "education": "sunriseinstitute.example", "food": "spiceroute.example", "manufacturing": "steelcraft.example",
            "real-estate": "greenviewbuilders.example", "beauty": "aurasalon.example", "automobile": "metromotors.example", "professional": "akumarassociates.example"}[key]
    inner = browser("".join(WEB[key](p)), host)
    return shell(p, name, "Website Design Preview", inner, bg="#dfe5ec")


# ------------------------------------------------------------------------------------------------------------------------------------------------ APIs and agents
API_DOCS = {
    "authentication-and-authorization-api": ("POST", "/v1/auth/login", ['{', '  "email": "user@example.com",', '  "password": "••••••••"', '}'], ['{', '  "access_token": "eyJhbGciOi…",', '  "expires_in": 900,', '  "roles": ["manager"]', '}'], ["POST /v1/auth/register", "POST /v1/auth/login", "POST /v1/auth/refresh", "GET  /v1/auth/me", "POST /v1/roles/assign"]),
    "otp-verification-api": ("POST", "/v1/otp/verify", ['{', '  "request_id": "otp_8f21",', '  "code": "482915"', '}'], ['{', '  "verified": true,', '  "attempts_left": 2,', '  "channel": "sms"', '}'], ["POST /v1/otp/send", "POST /v1/otp/verify", "POST /v1/otp/resend", "GET  /v1/otp/status", "GET  /v1/usage"]),
    "email-and-sms-notification-api": ("POST", "/v1/messages", ['{', '  "channel": "sms",', '  "to": "+91XXXXXXXXXX",', '  "template": "booking_confirmed"', '}'], ['{', '  "id": "msg_1042",', '  "status": "queued",', '  "channel": "sms"', '}'], ["POST /v1/messages", "GET  /v1/messages/{id}", "POST /v1/templates", "GET  /v1/templates", "GET  /v1/reports/delivery"]),
    "whatsapp-integration-api": ("POST", "/v1/whatsapp/send", ['{', '  "to": "+91XXXXXXXXXX",', '  "template": "order_update",', '  "params": ["#2041", "Shipped"]', '}'], ['{', '  "message_id": "wamid.HBg…",', '  "status": "sent"', '}'], ["POST /v1/whatsapp/send", "POST /v1/whatsapp/webhook", "GET  /v1/whatsapp/contacts", "GET  /v1/whatsapp/logs", "POST /v1/whatsapp/templates"]),
    "pdf-and-document-generation-api": ("POST", "/v1/documents/render", ['{', '  "template": "certificate",', '  "data": { "name": "A. Kumar", "course": "Python" },', '  "format": "pdf"', '}'], ['{', '  "document_id": "doc_7710",', '  "url": "https://…/doc_7710.pdf",', '  "pages": 1', '}'], ["POST /v1/documents/render", "POST /v1/documents/bulk", "GET  /v1/documents/{id}", "POST /v1/templates", "GET  /v1/templates"]),
    "invoice-generation-api": ("POST", "/v1/invoices", ['{', '  "customer": "cus_2210",', '  "items": [{ "name": "Plan A", "qty": 1, "rate": 4999 }],', '  "series": "INV-2026"', '}'], ['{', '  "invoice_no": "INV-2026-0412",', '  "total": 5898.82,', '  "pdf_url": "https://…"', '}'], ["POST /v1/invoices", "GET  /v1/invoices/{id}", "POST /v1/invoices/{id}/send", "GET  /v1/series", "GET  /v1/reports/monthly"]),
    "qr-code-and-barcode-api": ("POST", "/v1/codes", ['{', '  "type": "qr",', '  "data": "https://yourapp.example/t/8821",', '  "format": "png"', '}'], ['{', '  "code_id": "qr_3381",', '  "image_url": "https://…/qr_3381.png"', '}'], ["POST /v1/codes", "POST /v1/codes/batch", "POST /v1/codes/read", "GET  /v1/codes/{id}", "GET  /v1/usage"]),
    "ocr-and-data-extraction-api": ("POST", "/v1/extract", ['{', '  "file_url": "https://…/bill.jpg",', '  "document_type": "invoice"', '}'], ['{', '  "fields": { "vendor": "…", "total": "12,480.00" },', '  "confidence": 0.94,', '  "needs_review": false', '}'], ["POST /v1/extract", "POST /v1/extract/batch", "GET  /v1/jobs/{id}", "POST /v1/templates", "GET  /v1/usage"]),
    "ai-chatbot-and-conversational-api": ("POST", "/v1/chat", ['{', '  "session": "s_4471",', '  "message": "What are your clinic timings?"', '}'], ['{', '  "reply": "We are open 9 am – 8 pm…",', '  "handover": false,', '  "sources": ["timings.pdf"]', '}'], ["POST /v1/chat", "GET  /v1/sessions/{id}", "POST /v1/knowledge", "POST /v1/handover", "GET  /v1/logs"]),
    "speech-to-text-and-text-to-speech-api": ("POST", "/v1/transcribe", ['{', '  "audio_url": "https://…/call.mp3",', '  "language": "en-IN",', '  "timestamps": true', '}'], ['{', '  "text": "Hello, I would like to book…",', '  "duration": 42.7,', '  "segments": 9', '}'], ["POST /v1/transcribe", "POST /v1/speak", "GET  /v1/jobs/{id}", "GET  /v1/languages", "GET  /v1/usage"]),
}
AGENT_CHAT = {
    "ai-receptionist": ("Front desk", [("v", "Hi, are you open today?"), ("a", "Yes, we are open 9 am – 7 pm. Would you like an appointment?"), ("v", "Tomorrow morning, please."), ("a", "I can offer 10:30 or 11:00. Which suits you?")], ("Visitors today", "Handed to staff", "Details captured")),
    "ai-customer-support-agent": ("Support", [("v", "My order has not arrived."), ("a", "Sorry about that. Could you share the order number?"), ("v", "#20418"), ("a", "It left the hub yesterday and is due tomorrow. I have noted your request.")], ("Open chats", "Resolved", "Handed to people")),
    "ai-sales-and-lead-management-agent": ("Sales", [("v", "Do you do custom billing software?"), ("a", "Yes. What type of business do you run?"), ("v", "A textile shop."), ("a", "Thanks. I have passed your details to our team for a call today.")], ("New leads", "Qualified", "Follow-ups")),
    "ai-whatsapp-assistant": ("WhatsApp", [("v", "Price list please"), ("a", "Here is our latest price list (PDF). Anything else?"), ("v", "Delivery to Salem?"), ("a", "Yes, 1–2 days. Shall I place an order?")], ("Chats today", "Auto-answered", "Handed to staff")),
    "ai-hr-and-recruitment-agent": ("Recruitment", [("v", "I applied for the support role."), ("a", "Thanks. Are you available for a call on Thursday?"), ("v", "Yes, after 3 pm."), ("a", "Booked for Thursday 3:30 pm. HR will confirm.")], ("Applications", "Shortlisted by HR", "Interviews booked")),
    "ai-social-media-management-agent": ("Content", [("a", "Draft: Festive offer post for Friday."), ("v", "Make it shorter."), ("a", "Updated. Scheduled after your approval."), ("v", "Approved.")], ("Drafts", "Approved", "Scheduled")),
    "ai-email-management-agent": ("Inbox", [("a", "12 new emails sorted. 3 need a reply today."), ("v", "Show the first."), ("a", "Quote request from a supplier. Draft reply ready for review."), ("v", "Send after small edit.")], ("Sorted today", "Drafts waiting", "Needs attention")),
    "ai-appointment-booking-agent": ("Bookings", [("v", "Can I move my slot?"), ("a", "Sure. You are booked Friday 10:00. What time works?"), ("v", "Saturday afternoon."), ("a", "Saturday 2:30 pm is free. Confirm?")], ("Booked today", "Rescheduled", "Reminders sent")),
    "ai-document-processing-agent": ("Documents", [("a", "Invoice received from vendor."), ("a", "Extracted: vendor, date, total ₹ 12,480.00."), ("v", "Looks right."), ("a", "Routed to accounts for approval.")], ("Documents today", "Reviewed", "Routed")),
    "ai-business-workflow-automation": ("Workflows", [("a", "Enquiry received from website form."), ("a", "Recorded in CRM and acknowledged by email."), ("a", "Assigned to Priya. Reminder set for tomorrow."), ("v", "Looks good.")], ("Runs today", "Succeeded", "Waiting for a person")),
}


def api(slug, name, modules, index, layout_alt):
    p = Pal(index, slug)
    method, path, req, resp, endpoints = API_DOCS[slug]
    o = [R(60, 60, 1080, 680, "#0f172a", 14, "#1e293b", 1.5), R(60, 60, 1080, 40, "#111c33", 14), R(60, 86, 1080, 14, "#111c33")]
    o += [C(84 + i * 22, 80, 6, c) for i, c in enumerate(("#f87171", "#fbbf24", "#34d399"))]
    o.append(T(600, 85, "API reference", 12, "#94a3b8", 600, "middle"))
    o.append(R(60, 100, 270, 640, "#0b1224", 0) + T(86, 140, clip(name, 26), 15, "#fff", 800) + R(86, 150, 36, 3, p.acc, 1))
    for i, e in enumerate(endpoints):
        yy = 190 + i * 46
        m, pth = e.split(None, 1)
        o.append((R(70, yy - 22, 250, 36, p.p, 8, op=.35) if e.split()[1] == path else "") + R(86, yy - 12, 44, 20, {"POST": p.acc, "GET": "#22c55e"}.get(m, p.p), 5, op=.9) + T(108, yy + 3, m, 10, "#0b1224", 800, "middle") + T(140, yy + 3, clip(pth, 22), 12, "#cbd5e1", 600))
    o.append(T(360, 150, f"{method}  {path}", 20, "#fff", 800) + T(360, 178, f"Part of {name}. Authenticate with a bearer token.", 13, "#94a3b8", 500))
    for blk, (title, lines, y0, col) in enumerate((("Request", req, 210, p.acc), ("Response · 200 OK", resp, 440, "#22c55e"))):
        o.append(R(360, y0, 750, 210 if blk == 0 else 270, "#111c33", 10, "#1e293b") + T(384, y0 + 32, title, 13, col, 800, ls=.8))
        for i, ln in enumerate(lines):
            tok = ln.replace('"', "&quot;")
            color = "#7dd3fc" if ln.strip().startswith('"') else "#94a3b8"
            o.append(f'<text x="{384}" y="{y0 + 66 + i * 28}" font-family="Consolas, Courier New, monospace" font-size="15" fill="{color}" xml:space="preserve">{esc(ln)}</text>')
    o.append(R(360, 690, 150, 34, p.p, 8) + T(435, 712, "Try it", 13, "#fff", 800, "middle") + T(530, 712, f"Modules: {clip(', '.join(modules[:3]), 60)}", 12, "#64748b", 500))
    return shell(p, name, "Solution Preview", "".join(o), bg=hsl(p.h, .4, .12))


def agent(slug, name, modules, index, under_dev):
    p = Pal(index, slug)
    title, chat, kpis = AGENT_CHAT[slug]
    o = [R(50, 50, 1100, 700, "#fff", 16, "#cbd5e1", 1.5), R(50, 50, 740, 70, p.dark, 16), R(50, 90, 740, 30, p.dark, 0), C(94, 85, 20, p.p2) + T(94, 91, "AI", 14, "#fff", 800, "middle") + T(126, 80, clip(name, 30), 18, "#fff", 800) + T(126, 102, "Concept preview · human review kept in the loop" if under_dev else "Workflow preview", 12, "#a7b0c0", 500)]
    o.append(R(50, 120, 740, 570, "#f8fafc", 0))
    y = 156
    for who, msg in chat:
        isa = who == "a"
        lines = [msg[i:i + 46] for i in range(0, len(msg), 46)]
        hh = 28 + 22 * len(lines)
        bx = 80 if isa else 790 - 80 - 360
        o.append(R(bx, y, 360, hh, "#fff" if isa else p.p, 16, "#e2e8f0" if isa else "none") + "".join(T(bx + 18, y + 28 + k * 22, ln, 14, "#1e293b" if isa else "#fff", 500) for k, ln in enumerate(lines)))
        y += hh + 22
    o.append(R(70, 640, 700, 38, "#fff", 19, "#e2e8f0") + T(92, 664, "Type a message…", 13, "#94a3b8", 500) + C(742, 659, 14, p.p))
    o.append(R(790, 50, 360, 700, "#f1f5f9", 16) + T(814, 96, f"{title} overview", 17, "#0f172a", 800))
    for i, k in enumerate(kpis):
        o.append(R(814, 116 + i * 92, 312, 80, "#fff", 12, "#e2e8f0") + T(832, 146 + i * 92, k, 12, "#64748b", 600) + T(832, 182 + i * 92, str(sorted((kv(slug, j, 4, 240) for j in range(3)), reverse=True)[i]), 28, p.p, 800))
    o.append(T(814, 420, "How it works", 14, "#0f172a", 800))
    for i, m in enumerate(modules[:4]):
        o.append(C(830, 450 + i * 40, 9, p.p) + T(832, 455 + i * 40, str(i + 1), 10, "#fff", 800, "middle") + T(850, 456 + i * 40, clip(m, 32), 13, "#334155", 600) + (L(830, 460 + i * 40, 830, 481 + i * 40, p.soft2, 2) if i < 3 else ""))
    o.append(R(814, 630, 312, 46, p.soft, 12) + T(970, 658, "Person approves sensitive steps", 12, p.p, 700, "middle"))
    return shell(p, name, "Concept Preview" if under_dev else "Solution Preview", "".join(o), bg=hsl(p.h, .3, .92))


# ------------------------------------------------------------------------------------------------------------------------------------------------ entry point
LAYOUT_OF = {  # desktop / web app layout per solution (A dashboard, B billing / POS, C list and detail, D schedule, E board, F analytics)
    "inventory-and-billing-software": "B", "clinic-management-software": "C", "hospital-management-software": "A", "accounting-and-finance-software": "F", "manufacturing-erp-software": "E",
    "restaurant-and-pos-software": "B", "school-and-college-management-software": "A", "pharmacy-management-software": "B", "hotel-management-software": "D", "warehouse-management-software": "E",
    "textile-and-garment-management-software": "C", "customer-relationship-management-crm": "E", "hr-and-employee-management-system": "C", "enterprise-resource-planning-erp": "F",
    "learning-management-system-lms": "A", "franchise-discovery-platform": "C", "appointment-and-booking-management-system": "D", "business-analytics-and-reporting-platform": "F",
    "clinic-management-web-application": "D", "hospital-management-web-application": "A",
}
MOBILE_LAYOUT = ["A", "B", "C", "D", "E", "A", "B", "C", "D", "E", "A", "B", "C", "D"]
WEB_KEY = ["corporate", "retail", "healthcare", "education", "food", "manufacturing", "real-estate", "beauty", "automobile", "professional"]


def render_svg(rec: dict, index: int, order: int) -> str:
    """The preview of one solution record (see build_solutions.py)."""
    slug, name, cat, mods = rec["slug"], rec["name"], rec["category"], rec["modules"]
    if cat in ("software", "webapps"):
        return desktop(slug, name, mods, index, LAYOUT_OF.get(slug, "A"), web=cat == "webapps")
    if cat == "mobile":
        return mobile(slug, name, mods, index, MOBILE_LAYOUT[(order - 1) % len(MOBILE_LAYOUT)])
    if cat == "websites":
        return website(slug, name, WEB_KEY[(order - 1) % 10], index)
    if cat == "api":
        return api(slug, name, mods, index, False)
    return agent(slug, name, mods, index, rec["status"] == "under_development")


def render_category_svg(cat: dict, index: int, names: list[str]) -> str:
    p = Pal(index + 70, cat["slug"])
    tiles = []
    for i, n in enumerate(names[:6]):
        x, y = 90 + (i % 3) * 340, 150 + (i // 3) * 270
        tiles.append(R(x, y, 320, 250, "#fff", p.r + 6, "#e2e8f0") + R(x + 16, y + 16, 288, 120, [p.soft, p.soft2][i % 2], p.r + 2) + "".join(R(x + 30 + k * 60, y + 120 - (30 + (i * 13 + k * 17) % 60), 40, 30 + (i * 13 + k * 17) % 60, [p.p, p.acc][k % 2], 4) for k in range(4)) + T(x + 18, y + 176, clip(n, 28), 16, "#0f172a", 800) + R(x + 18, y + 192, 120, 8, p.soft2, 4) + R(x + 18, y + 210, 80, 8, p.soft, 4))
    return shell(p, cat["name"], "Solution Preview", T(90, 100, cat["name"], 36, p.dark, 800) + "".join(tiles), bg=hsl(p.h, .35, .93))
