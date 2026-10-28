#!/usr/bin/env python
"""Render a guide spec into a print-ready PDF.

The spec is a JSON file:

    {
      "slug": "back-to-school-encouragement-strategies",
      "title": "...",
      "subtitle": "...",
      "audience": "Returning students",
      "description": "...",
      "keywords": ["...", "..."],
      "accent": "#0f766e",
      "date": "28 October 2026",
      "body_md": "## Section\\n..."
    }

The body is written in the markdown subset documented in
docs/guides/FORMAT.md. Two passes are made: the first finds which page each
section starts on, the second prints the contents page with those numbers.
Afterwards a PDF outline is added and a footer is stamped on every page.

    python scripts/guides/render-guide.py --spec specs/x.json --out out/x.pdf
"""

import argparse
import json
import os
import re
import subprocess
import shutil
import sys
import tempfile
from pathlib import Path

CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
]


def find_chrome():
    for path in CHROME_CANDIDATES:
        if os.path.exists(path):
            return path
    raise SystemExit("No Chrome or Edge found on this machine.")


def slugify(text):
    slug = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return slug or "section"


def build_html(spec, contents):
    """Build the whole document: cover, contents, body, back page."""
    from markdown_it import MarkdownIt

    md = MarkdownIt("default", {"html": True, "linkify": False, "typographer": False})
    # Links inside the body must be underlined and must not be swallowed by the
    # print stylesheet.
    md.enable("table")
    md.enable("strikethrough")

    body_html = md.render(spec["body_md"])
    accent = spec.get("accent", "#0f766e")
    keywords = ", ".join(spec.get("keywords", []))
    title = spec["title"]
    subtitle = spec.get("subtitle", "")
    audience = spec.get("audience", "")

    toc_rows = "\n".join(
        f'<li><a href="#{entry["id"]}"><span class="toc-title">{entry["title"]}</span>'
        f'<span class="toc-page">{entry["page"]}</span></a></li>'
        for entry in contents
    )

    cover_points = spec.get("cover_points") or [t["title"] for t in contents[:6]]
    points_html = "\n".join(f"<li>{point}</li>" for point in cover_points)

    return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>{title}</title>
<style>
  @page {{ size: A4; margin: 20mm 18mm 18mm 18mm; }}
  /* The cover is full bleed, so it gets its own page box with no margins.
     Chrome supports named pages; this is what keeps the band from being
     clipped at the paper edge. */
  @page cover {{ size: A4; margin: 0; }}
  :root {{ --accent: {accent}; --ink: #14181d; --muted: #5b6672; --rule: #d9e0e6; }}
  * {{ box-sizing: border-box; }}
  html {{ -webkit-print-color-adjust: exact; print-color-adjust: exact; }}
  body {{ font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif; color: var(--ink);
         font-size: 10.4pt; line-height: 1.55; margin: 0; }}
  h1, h2, h3, h4 {{ font-family: Georgia, "Times New Roman", serif; line-height: 1.22;
                   page-break-after: avoid; margin: 0 0 8pt 0; }}
  h2 {{ font-size: 17pt; margin-top: 20pt; padding-bottom: 5pt; border-bottom: 2px solid var(--accent); }}
  h3 {{ font-size: 12.6pt; margin-top: 13pt; color: var(--accent); }}
  h4 {{ font-size: 11pt; margin-top: 11pt; }}
  p {{ margin: 0 0 7.5pt 0; orphans: 3; widows: 3; }}
  ul, ol {{ margin: 0 0 8pt 0; padding-left: 17pt; }}
  li {{ margin-bottom: 3.2pt; }}
  li > ul {{ margin-top: 3pt; }}
  a {{ color: var(--accent); text-decoration: none; border-bottom: 0.6pt solid rgba(15,118,110,0.4); }}
  strong {{ font-weight: 700; }}
  code {{ font-family: "Cascadia Mono", Consolas, monospace; font-size: 9.2pt;
          background: #f2f5f7; padding: 0.5pt 2.5pt; border-radius: 2pt; }}
  pre {{ background: #f2f5f7; border-left: 2.5pt solid var(--accent); padding: 7pt 9pt;
         font-size: 8.8pt; white-space: pre-wrap; page-break-inside: avoid; }}
  blockquote {{ margin: 9pt 0; padding: 7pt 11pt; background: #f4f8f8;
                border-left: 3pt solid var(--accent); page-break-inside: avoid; }}
  blockquote p:last-child {{ margin-bottom: 0; }}
  table {{ width: 100%; border-collapse: collapse; margin: 9pt 0 11pt 0; font-size: 9.3pt;
           page-break-inside: avoid; }}
  th {{ background: var(--accent); color: #fff; text-align: left; padding: 5pt 6pt;
        font-weight: 600; border: 0.4pt solid var(--accent); }}
  td {{ padding: 4.4pt 6pt; border: 0.4pt solid var(--rule); vertical-align: top; }}
  tbody tr:nth-child(even) td {{ background: #f7f9fa; }}
  hr {{ border: none; border-top: 0.8pt solid var(--rule); margin: 13pt 0; }}

  /* Cover */
  .cover {{ page: cover; height: 297mm; display: flex; flex-direction: column;
            justify-content: space-between; page-break-after: always; overflow: hidden; }}
  .cover-band {{ background: var(--accent); color: #fff; padding: 40mm 20mm 24mm 20mm; }}
  .cover-label {{ font-size: 8.4pt; letter-spacing: 2.4pt; text-transform: uppercase; opacity: 0.92; }}
  .cover-title {{ font-size: 29pt; margin: 12pt 0 0 0; font-family: Georgia, serif; }}
  .cover-sub {{ font-size: 12.6pt; margin-top: 11pt; line-height: 1.42; opacity: 0.96; max-width: 150mm; }}
  .cover-body {{ padding: 20mm 20mm 0 20mm; }}
  .cover-audience {{ display: inline-block; border: 1pt solid var(--accent); color: var(--accent);
                     padding: 3.5pt 8pt; font-size: 8.6pt; letter-spacing: 1.1pt; text-transform: uppercase;
                     margin-bottom: 13pt; }}
  .cover-meta {{ font-size: 9.6pt; color: var(--muted); max-width: 140mm; line-height: 1.5; }}
  .cover-inside {{ margin-top: 9mm; max-width: 145mm; }}
  .cover-inside-label {{ font-size: 8.4pt; letter-spacing: 1.6pt; text-transform: uppercase;
                          color: var(--accent); font-weight: 700; margin-bottom: 4mm; }}
  .cover-inside ul {{ list-style: none; padding: 0; margin: 0; }}
  .cover-inside li {{ font-size: 9.4pt; color: var(--muted); padding-left: 11pt; position: relative;
                      margin-bottom: 2.2pt; }}
  .cover-inside li::before {{ content: "—"; position: absolute; left: 0; color: var(--accent); }}
  .cover-foot {{ border-top: 1.4pt solid var(--accent); padding: 10pt 20mm 16mm 20mm; font-size: 9.4pt;
                 line-height: 1.5; }}
  .cover-foot strong {{ color: var(--accent); letter-spacing: 1.4pt; text-transform: uppercase; font-size: 9pt; }}

  /* Contents */
  .toc {{ page-break-after: always; }}
  .toc h2 {{ border-bottom-width: 2px; }}
  .toc ol {{ list-style: none; padding: 0; margin: 0; counter-reset: toc; }}
  .toc li {{ counter-increment: toc; margin-bottom: 6pt; }}
  .toc a {{ display: flex; align-items: baseline; color: var(--ink); border: none; font-size: 10.6pt; }}
  .toc a::before {{ content: counter(toc) "."; color: var(--accent); font-weight: 700; margin-right: 5pt; }}
  .toc-title {{ white-space: nowrap; flex: 1 1 auto; display: flex; align-items: baseline; }}
  .toc-title::after {{ content: ""; flex: 1 1 auto; border-bottom: 0.7pt dotted #b9c2ca; margin: 0 8pt 3.5pt 8pt; }}
  .toc-page {{ color: var(--muted); font-variant-numeric: tabular-nums; flex: 0 0 auto; }}

  .section {{ page-break-inside: auto; }}
  .backpage {{ page-break-before: always; background: #f4f8f8; padding: 20pt; margin: 0 -18mm 0 -18mm; }}
  .backpage h2 {{ border-bottom: 2px solid var(--accent); }}
  .kw {{ font-size: 8.6pt; color: var(--muted); line-height: 1.5; }}
</style></head>
<body>

<section class="cover">
  <div class="cover-band">
    <div class="cover-label">Anyfreebook Guide</div>
    <h1 class="cover-title">{title}</h1>
    <div class="cover-sub">{subtitle}</div>
  </div>
  <div class="cover-body">
    <div class="cover-audience">{audience}</div>
    <div class="cover-meta">{spec.get("description", "")}</div>
    <div class="cover-inside">
      <div class="cover-inside-label">Inside this guide</div>
      <ul>{points_html}</ul>
    </div>
  </div>
  <div class="cover-foot">
    <strong>Published by ANYFREEBOOK</strong><br>
    anyfreebook.com — free books, textbooks and research papers from
    {spec.get("source_count", "twelve")} open-access libraries.<br>
    {spec.get("date", "")} · Edition 1.0 · Free to download and share
  </div>
</section>

<section class="toc">
  <h2>Contents</h2>
  <ol>{toc_rows}</ol>
</section>

<main>{body_html}</main>

<section class="backpage">
  <h2>About this guide</h2>
  <p>{spec.get("about", spec.get("description", ""))}</p>
  <p><strong>Published by ANYFREEBOOK</strong> — anyfreebook.com. Every book, textbook and
  research paper behind this guide was found through free, open-access libraries:
  Project Gutenberg, Open Library, the Internet Archive, Google Books, PubMed Central, DOAJ,
  LibriVox, OpenAlex, Wikisource, Europeana, Zenodo and the Open Textbook Library. Each result
  carries a legal tier, so a title that is genuinely free to download is never confused with one
  that is only borrowable or merely a catalogue record.</p>
  <p>You are free to download this guide, print it, share it and teach from it. Please keep the
  ANYFREEBOOK credit on it, and link to <a href="https://anyfreebook.com">anyfreebook.com</a> when
  you share it.</p>
  <p class="kw"><strong>Keywords:</strong> {keywords}</p>
</section>

</body></html>"""


def render_pdf(html_path, pdf_path):
    chrome = find_chrome()
    cmd = [
        chrome,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        "--no-pdf-header-footer",
        "--disable-extensions",
        "--user-data-dir=" + tempfile.mkdtemp(prefix="afb-pdf-"),
        f"--print-to-pdf={pdf_path}",
        html_path,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=300)
    if not os.path.exists(pdf_path):
        raise SystemExit(f"Chrome did not write the PDF.\n{result.stderr[-2000:]}")


def section_titles(spec):
    """The H2 headings, in order, with a stable id for each."""
    titles = []
    for line in spec["body_md"].splitlines():
        match = re.match(r"^##\s+(.+?)\s*$", line)
        if match:
            titles.append({"title": match.group(1), "id": slugify(match.group(1))})
    return titles


def locate_pages(pdf_path, titles):
    """Find the page each section heading appears on.

    The cover and the contents page both repeat the section titles, so the
    search starts after the contents page — otherwise every section would be
    reported as being on page one.
    """
    from pypdf import PdfReader

    reader = PdfReader(pdf_path)
    pages = []
    for page in reader.pages:
        try:
            pages.append(page.extract_text() or "")
        except Exception:
            pages.append("")

    body_start = 0
    for index, text in enumerate(pages):
        flat = re.sub(r"\s+", " ", text).strip()
        if flat.startswith("Contents"):
            body_start = index + 1
    body_start = max(body_start, 2)

    found = []
    for title in titles:
        needle = re.sub(r"[*`]", "", title["title"]).strip()[:48]
        page_no = None
        for index in range(body_start, len(pages)):
            flat = re.sub(r"\s+", " ", pages[index])
            if needle.lower() in flat.lower():
                page_no = index + 1
                break
        found.append({**title, "page": page_no if page_no else "—"})
    return found


def add_outline_and_footer(pdf_path, titles, guide_title):
    """Add a PDF outline and a footer with the page number on every page."""
    from pypdf import PdfReader, PdfWriter
    from pypdf.generic import (
        ArrayObject,
        DecodedStreamObject,
        FloatObject,
        NameObject,
        RectangleObject,
    )

    reader = PdfReader(pdf_path)
    writer = PdfWriter()
    writer.append_pages_from_reader(reader)

    total = len(reader.pages)
    for index, page in enumerate(writer.pages, start=1):
        if index == 1:
            # The cover carries the publisher's name already.
            continue
        width = float(page.mediabox.width)
        height = float(page.mediabox.height)
        footer = f"ANYFREEBOOK  ·  {guide_title[:66]}  ·  page {index} of {total}"
        _stamp_footer(page, footer, width, height)

    # Bookmark outline: one entry per section, pointing at its first page.
    if titles:
        outline = []
        for title in titles:
            page_no = title.get("page")
            if not page_no or page_no == "—":
                continue
            try:
                reference = writer.pages[page_no - 1].indirect_reference
            except Exception:
                continue
            outline.append((title["title"], reference))

        if outline:
            # A flat outline: every section at the top level, so the PDF
            # bookmark list reads as the contents page does.
            for label, reference in outline:
                writer.add_outline_item(label, reference, None)

    with open(pdf_path, "wb") as handle:
        writer.write(handle)


def _escape_pdf_text(text):
    return text.replace("\\", r"\\").replace("(", r"\(").replace(")", r"\)")


def _stamp_footer(page, text, width, height):
    """Draw a rule and the footer line on one page."""
    import io

    from pypdf import PdfReader
    from reportlab.pdfgen import canvas

    buffer = io.BytesIO()
    sheet = canvas.Canvas(buffer, pagesize=(width, height))
    sheet.setFont("Helvetica", 7.4)
    sheet.setFillColorRGB(0.40, 0.44, 0.47)
    sheet.drawString(42, 28, text)
    sheet.setStrokeColorRGB(0.78, 0.80, 0.82)
    sheet.setLineWidth(0.7)
    sheet.line(42, 38, width - 42, 38)
    sheet.save()
    buffer.seek(0)
    page.merge_page(PdfReader(buffer).pages[0])


def body_only_html(spec):
    """The body of the guide as HTML, for the web page."""
    from markdown_it import MarkdownIt

    md = MarkdownIt("default", {"html": True, "linkify": False, "typographer": False})
    md.enable("table")
    md.enable("strikethrough")
    body = md.render(spec["body_md"])

    # The web page needs anchors that match the section ids used by the PDF.
    def add_id(match):
        opening = match.group(1)
        heading = match.group(2).strip()
        closing = match.group(3)
        anchor = slugify(re.sub(r"[*`]", "", heading))
        return f'{opening} id="{anchor}">{heading}{closing}'

    body = re.sub(r"(<h2[^>]*>)(.*?)(</h2>)", add_id, body, flags=re.S)
    return body


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--spec", required=True)
    parser.add_argument("--out", required=True)
    args = parser.parse_args()

    spec = json.loads(Path(args.spec).read_text(encoding="utf-8"))
    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    titles = section_titles(spec)
    if not titles:
        raise SystemExit("The spec has no '## ' section headings.")

    workdir = Path(tempfile.mkdtemp(prefix="afb-guide-"))
    html_path = workdir / "guide.html"
    pdf_path = workdir / "guide.pdf"

    # Pass one: render without page numbers so we can find where each section
    # actually starts.
    contents = [{**t, "page": "—"} for t in titles]
    html_path.write_text(build_html(spec, contents), encoding="utf-8")
    render_pdf(html_path.as_uri(), str(pdf_path))
    located = locate_pages(str(pdf_path), titles)

    # Pass two: render again with the real page numbers in the contents.
    html_path.write_text(build_html(spec, located), encoding="utf-8")
    render_pdf(html_path.as_uri(), str(pdf_path))
    located2 = locate_pages(str(pdf_path), titles)

    # If the contents page changed the pagination, use the second reading.
    drift = [
        (a["title"], a["page"], b["page"])
        for a, b in zip(located, located2)
        if a["page"] != b["page"]
    ]
    if drift:
        html_path.write_text(build_html(spec, located2), encoding="utf-8")
        render_pdf(html_path.as_uri(), str(pdf_path))
        located = located2

    add_outline_and_footer(str(pdf_path), located, spec["title"])

    # The finished PDF goes where the caller asked for it.
    shutil.copyfile(str(pdf_path), str(out_path))

    # Keep the HTML beside the PDF: it is the source, and it is what the web
    # version of the guide is built from.
    out_path.with_suffix(".html").write_text(build_html(spec, located), encoding="utf-8")

    # The body on its own, for the web page. The site renders this inside its
    # own layout, with the site's navigation, footer and adverts.
    body_html = body_only_html(spec)
    out_path.with_suffix(".body.html").write_text(body_html, encoding="utf-8")

    from pypdf import PdfReader

    reader = PdfReader(str(out_path))
    pages = len(reader.pages)
    width = round(float(reader.pages[0].mediabox.width))
    height = round(float(reader.pages[0].mediabox.height))
    try:
        outline = len(reader.outline)
    except Exception:
        outline = 0
    print(f"{out_path.name}: {pages} pages, {width}x{height}pt, {outline} outline entries")
    for entry in located:
        print(f"  p{entry['page']}  {entry['title']}")
    if width != 595 or height != 842:
        print("WARNING: the page is not A4.")
    if pages < 20:
        print(f"WARNING: only {pages} pages; the target is at least 20.")


if __name__ == "__main__":
    main()
