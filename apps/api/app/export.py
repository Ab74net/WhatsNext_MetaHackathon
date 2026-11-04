"""Claim exports: spreadsheet (xlsx, csv) and PDF with an evidence photo beside each item.

Only user-confirmed items are exported. All images come from the session's EXIF-free
JPEGs and are re-encoded as crops, so exports carry no photo metadata.
"""

import csv
import io
from datetime import datetime

from fpdf import FPDF
from openpyxl import Workbook
from openpyxl.drawing.image import Image as XLImage
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter

from .config import BRAND
from .images import crop_jpeg
from .schemas import InventoryItem, MaskBounds
from .sessions import Session

DISCLAIMER = ("Prepared by the policyholder with {name}. Items were identified from the policyholder's own photos "
              "and confirmed by them line by line. Replacement costs are estimates from public retail listings, "
              "not appraisals. This is not insurance or legal advice.")

EVIDENCE_LABEL = {"seen_in_photo": "Seen in photo", "inferred": "Inferred"}


def confirmed_items(session: Session) -> list[InventoryItem]:
    return sorted((i for i in session.items.values() if i.user_confirmed), key=lambda i: (i.category, i.id))


def evidence_crop(session: Session, item: InventoryItem, side: int) -> bytes | None:
    for ev in item.photos:
        stored = session.photos.get(ev.photo_id)
        if stored and ev.mask:
            return crop_jpeg(stored.photo.jpeg, ev.mask.bounds, max_side=side)
    ev = item.photos[0] if item.photos else None
    stored = session.photos.get(ev.photo_id) if ev else None
    if stored:
        p = stored.photo
        return crop_jpeg(p.jpeg, MaskBounds(left=0, top=0, right=p.width, bottom=p.height), pad=0, max_side=side)
    return None


def _photo_dates(item: InventoryItem) -> list[str]:
    return sorted({p.taken_at[:10] for p in item.photos if p.taken_at})


def _row(n: int, item: InventoryItem) -> list:
    est = item.estimated_replacement_usd
    dates = _photo_dates(item)
    return [
        n, item.category.capitalize(), item.brand or "", item.model or "", item.condition,
        EVIDENCE_LABEL[item.evidence], round(item.confidence, 2), len(item.photos),
        dates[0] if dates else "", est.low if est else None, est.high if est else None,
        est.source_url if est else "", est.checked_at[:10] if est else "",
    ]


HEADERS = ["#", "Item", "Brand", "Model", "Condition", "Evidence", "Scan confidence", "Photos",
           "Earliest photo", "Est. low (USD)", "Est. high (USD)", "Price source", "Price checked"]


def _csv_value(value):
    # Spreadsheet apps can interpret user/model text as formulas, even after whitespace.
    if isinstance(value, str) and (value.lstrip().startswith(("=", "+", "-", "@")) or
                                   value.startswith(("\t", "\r", "\n"))):
        return "'" + value
    return value


def build_csv(session: Session) -> bytes:
    out = io.StringIO()
    w = csv.writer(out)
    w.writerow(HEADERS)
    for n, item in enumerate(confirmed_items(session), start=1):
        w.writerow([_csv_value(value) for value in _row(n, item)])
    return out.getvalue().encode("utf-8-sig")  # BOM so Excel opens it as UTF-8


def build_xlsx(session: Session) -> bytes:
    items = confirmed_items(session)
    wb = Workbook()
    wb.properties.creator = BRAND["projectName"]
    ws = wb.active
    ws.title = "Inventory"

    ws["A1"] = "Personal property inventory"
    ws["A1"].font = Font(size=16, bold=True)
    ws["A2"] = f"Generated {datetime.now():%B %d, %Y}  ·  {len(items)} confirmed items"
    ws["A3"] = DISCLAIMER.format(name=BRAND["projectName"])
    ws["A3"].alignment = Alignment(wrap_text=True, vertical="top")
    ws.merge_cells("A3:N3")
    ws.row_dimensions[3].height = 45
    ws["A5"], ws["C5"] = "Policyholder:", "Claim number:"

    head = 7
    for col, title in enumerate(["Photo"] + HEADERS, start=1):
        c = ws.cell(row=head, column=col, value=title)
        c.font = Font(bold=True, color="FFFFFF")
        c.fill = PatternFill("solid", fgColor="1F2937")
        c.alignment = Alignment(vertical="center", wrap_text=True)
    widths = [12, 5, 22, 16, 16, 11, 14, 11, 8, 13, 13, 13, 40, 13]
    for i, wdt in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = wdt

    money = '"$"#,##0.00'
    for n, item in enumerate(items, start=1):
        r = head + n
        for col, value in enumerate(_row(n, item), start=2):
            cell = ws.cell(row=r, column=col, value=value)
            if isinstance(value, str):
                cell.data_type = "s"  # descriptions are text; only our totals below are formulas
            cell.alignment = Alignment(vertical="center", wrap_text=col in (3, 13))
        ws.cell(row=r, column=11).number_format = money
        ws.cell(row=r, column=12).number_format = money
        est = item.estimated_replacement_usd
        if est:
            link = ws.cell(row=r, column=13)
            link.hyperlink = est.source_url
            link.font = Font(color="1D4ED8", underline="single")
        ws.row_dimensions[r].height = 62
        thumb = evidence_crop(session, item, 160)
        if thumb:
            img = XLImage(io.BytesIO(thumb))
            scale = 78 / max(img.width, img.height)
            img.width, img.height = int(img.width * scale), int(img.height * scale)
            ws.add_image(img, f"A{r}")

    if items:
        total = head + len(items) + 1
        ws.cell(row=total, column=3, value="Total (estimated)").font = Font(bold=True)
        for col in (11, 12):
            letter = get_column_letter(col)
            c = ws.cell(row=total, column=col, value=f"=SUM({letter}{head + 1}:{letter}{total - 1})")
            c.number_format, c.font = money, Font(bold=True)
    ws.freeze_panes = ws.cell(row=head + 1, column=1)

    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


def _latin1(text: str) -> str:
    # Built-in PDF fonts only cover Latin-1.
    return text.replace("’", "'").replace("—", "-").replace("·", "-").encode("latin-1", "replace").decode("latin-1")


class _InventoryPDF(FPDF):
    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", size=8)
        self.set_text_color(120)
        self.cell(0, 6, _latin1(f"{BRAND['projectName']} - estimates only, not insurance or legal advice - page {self.page_no()}"),
                  align="C")


def build_pdf(session: Session) -> bytes:
    items = confirmed_items(session)
    pdf = _InventoryPDF(format="Letter")
    pdf.set_creator(BRAND["projectName"])
    pdf.set_auto_page_break(True, margin=16)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 20)
    pdf.cell(0, 10, "Personal property inventory", new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", size=10)
    pdf.set_text_color(90)
    pdf.cell(0, 6, f"Generated {datetime.now():%B %d, %Y}", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)
    pdf.set_text_color(0)
    pdf.cell(95, 7, "Policyholder: ______________________________")
    pdf.cell(0, 7, "Claim number: ____________________", new_x="LMARGIN", new_y="NEXT")
    pdf.ln(2)

    lows = [i.estimated_replacement_usd.low for i in items if i.estimated_replacement_usd]
    highs = [i.estimated_replacement_usd.high for i in items if i.estimated_replacement_usd]
    pdf.set_fill_color(243, 244, 246)
    pdf.set_font("Helvetica", "B", 11)
    summary = f"{len(items)} confirmed items"
    if lows:
        summary += f"   |   Estimated replacement cost: ${sum(lows):,.0f} - ${sum(highs):,.0f}"
        if len(lows) < len(items):
            summary += f" ({len(items) - len(lows)} items not yet valued)"
    pdf.cell(0, 9, _latin1(summary), fill=True, new_x="LMARGIN", new_y="NEXT")
    pdf.set_font("Helvetica", size=8)
    pdf.set_text_color(90)
    pdf.multi_cell(0, 4, _latin1(DISCLAIMER.format(name=BRAND["projectName"])), new_x="LMARGIN", new_y="NEXT")
    pdf.set_text_color(0)
    pdf.ln(3)

    thumb_w, block_h = 38, 42
    for n, item in enumerate(items, start=1):
        if pdf.get_y() + block_h > pdf.h - 18:
            pdf.add_page()
        top = pdf.get_y()
        thumb = evidence_crop(session, item, 480)
        if thumb:
            pdf.image(io.BytesIO(thumb), x=pdf.l_margin, y=top, w=thumb_w, h=thumb_w, keep_aspect_ratio=True)
        x = pdf.l_margin + thumb_w + 5
        width = pdf.w - pdf.r_margin - x

        pdf.set_xy(x, top)
        pdf.set_font("Helvetica", "B", 12)
        title = f"{n}. {item.category.capitalize()}"
        if item.brand or item.model:
            title += f" - {' '.join(p for p in (item.brand, item.model) if p)}"
        pdf.cell(width, 6, _latin1(title), new_x="LEFT", new_y="NEXT")

        pdf.set_font("Helvetica", size=9)
        dates = _photo_dates(item)
        lines = [
            f"Condition: {item.condition}   |   {EVIDENCE_LABEL[item.evidence]}   |   scan confidence {item.confidence:.0%}",
            f"Seen in {len(item.photos)} photo{'s' if len(item.photos) != 1 else ''}"
            + (f", earliest {dates[0]}" if dates else ", photo dates unknown"),
        ]
        for line in lines:
            pdf.set_x(x)
            pdf.cell(width, 5, _latin1(line), new_x="LEFT", new_y="NEXT")

        est = item.estimated_replacement_usd
        pdf.set_x(x)
        if est:
            pdf.set_font("Helvetica", "B", 10)
            pdf.cell(width, 6, f"Estimated replacement: ${est.low:,.2f} - ${est.high:,.2f}", new_x="LEFT", new_y="NEXT")
            pdf.set_font("Helvetica", size=8)
            pdf.set_text_color(29, 78, 216)
            pdf.set_x(x)
            label = est.source_title or est.source_url
            pdf.cell(width, 4, _latin1(f"Source: {label[:90]}"), link=est.source_url, new_x="LEFT", new_y="NEXT")
            pdf.set_text_color(110)
            pdf.set_x(x)
            pdf.cell(width, 4, f"Price checked {est.checked_at[:10]}", new_x="LEFT", new_y="NEXT")
            pdf.set_text_color(0)
        else:
            pdf.set_font("Helvetica", "I", 9)
            pdf.cell(width, 5, "Replacement cost not estimated", new_x="LEFT", new_y="NEXT")

        pdf.set_y(max(pdf.get_y(), top + thumb_w) + 4)
        pdf.set_draw_color(225)
        pdf.line(pdf.l_margin, pdf.get_y() - 2, pdf.w - pdf.r_margin, pdf.get_y() - 2)

    return bytes(pdf.output())
