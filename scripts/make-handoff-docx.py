# -*- coding: utf-8 -*-
"""Generate the ANYFREEBOOK agent handoff guide as a DOCX."""
import docx
from docx import Document
from docx.shared import Pt, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml.ns import qn
from docx.oxml import OxmlElement

ACCENT = RGBColor(0x1F, 0x4E, 0x79)
MUTED = RGBColor(0x5A, 0x5A, 0x5A)
CODE_BG = "F2F4F7"
HDR_BG = "1F4E79"

doc = Document()

# ---------- base styles ----------
normal = doc.styles["Normal"]
normal.font.name = "Calibri"
normal.font.size = Pt(10.5)
normal.paragraph_format.space_after = Pt(6)
normal.paragraph_format.line_spacing = 1.12

for sec in doc.sections:
    sec.top_margin = Inches(0.85)
    sec.bottom_margin = Inches(0.85)
    sec.left_margin = Inches(0.9)
    sec.right_margin = Inches(0.9)


def shade(el, hexcolor):
    sh = OxmlElement("w:shd")
    sh.set(qn("w:val"), "clear")
    sh.set(qn("w:fill"), hexcolor)
    el.append(sh)


def h(text, level=1):
    p = doc.add_heading(text, level=level)
    for r in p.runs:
        r.font.color.rgb = ACCENT
        r.font.name = "Calibri"
    return p


def para(text, bold=False, italic=False, size=10.5, color=None, space_after=6):
    p = doc.add_paragraph()
    r = p.add_run(text)
    r.bold = bold
    r.italic = italic
    r.font.size = Pt(size)
    if color:
        r.font.color.rgb = color
    p.paragraph_format.space_after = Pt(space_after)
    return p


def bullet(text, level=0):
    p = doc.add_paragraph(style="List Bullet")
    p.paragraph_format.left_indent = Inches(0.28 + 0.25 * level)
    p.paragraph_format.space_after = Pt(3)
    # allow simple **bold** lead-ins
    if text.startswith("**") and "**" in text[2:]:
        end = text.index("**", 2)
        r = p.add_run(text[2:end])
        r.bold = True
        rest = text[end + 2:]
        if rest.startswith(" "):
            rest = rest[1:]
        p.add_run(rest)
    else:
        p.add_run(text)
    return p


def numbered(text):
    p = doc.add_paragraph(style="List Number")
    p.paragraph_format.left_indent = Inches(0.28)
    p.paragraph_format.space_after = Pt(3)
    if text.startswith("**") and "**" in text[2:]:
        end = text.index("**", 2)
        r = p.add_run(text[2:end])
        r.bold = True
        p.add_run(text[end + 2:])
    else:
        p.add_run(text)
    return p


def code(lines, comment_prefixes=("#", "//")):
    """Monospace shaded block."""
    if isinstance(lines, str):
        lines = lines.split("\n")
    tbl = doc.add_table(rows=1, cols=1)
    tbl.style = "Table Grid"
    cell = tbl.cell(0, 0)
    shade(cell._tc.get_or_add_tcPr(), CODE_BG)
    cell.text = ""
    for i, line in enumerate(lines):
        p = cell.paragraphs[0] if i == 0 else cell.add_paragraph()
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.line_spacing = 1.0
        r = p.add_run(line)
        r.font.name = "Consolas"
        r.font.size = Pt(9)
        r._element.rPr.rFonts.set(qn("w:eastAsia"), "Consolas")
    doc.add_paragraph().paragraph_format.space_after = Pt(4)
    return tbl


def table(headers, rows, widths=None):
    t = doc.add_table(rows=1, cols=len(headers))
    t.style = "Table Grid"
    t.alignment = WD_TABLE_ALIGNMENT.CENTER
    hdr = t.rows[0].cells
    for i, txt in enumerate(headers):
        hdr[i].text = ""
        p = hdr[i].paragraphs[0]
        r = p.add_run(txt)
        r.bold = True
        r.font.size = Pt(9.5)
        r.font.color.rgb = RGBColor(0xFF, 0xFF, 0xFF)
        shade(hdr[i]._tc.get_or_add_tcPr(), HDR_BG)
    for row in rows:
        cells = t.add_row().cells
        for i, txt in enumerate(row):
            cells[i].text = ""
            p = cells[i].paragraphs[0]
            p.paragraph_format.space_after = Pt(2)
            r = p.add_run(str(txt))
            r.font.size = Pt(9)
            if i == 0 and len(headers) > 2:
                r.font.name = "Consolas"
                r.font.size = Pt(8.5)
    if widths:
        for i, w in enumerate(widths):
            for row in t.rows:
                row.cells[i].width = Inches(w)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)
    return t


def callout(title, body, fill="FFF4E5"):
    t = doc.add_table(rows=1, cols=1)
    t.style = "Table Grid"
    c = t.cell(0, 0)
    shade(c._tc.get_or_add_tcPr(), fill)
    c.text = ""
    p = c.paragraphs[0]
    r = p.add_run(title)
    r.bold = True
    r.font.size = Pt(10)
    r.font.color.rgb = RGBColor(0x8A, 0x4B, 0x00)
    p2 = c.add_paragraph()
    r2 = p2.add_run(body)
    r2.font.size = Pt(9.5)
    doc.add_paragraph().paragraph_format.space_after = Pt(4)


# ============================== COVER ==============================
tp = doc.add_paragraph()
tp.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = tp.add_run("ANYFREEBOOK")
r.bold = True
r.font.size = Pt(30)
r.font.color.rgb = ACCENT

sp = doc.add_paragraph()
sp.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = sp.add_run("Agent Handoff & Maintenance Guide")
r.font.size = Pt(15)
r.font.color.rgb = MUTED

sp2 = doc.add_paragraph()
sp2.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = sp2.add_run("Architecture, Integrity Rules, Known Defects and Debugging Playbook")
r.font.size = Pt(10.5)
r.italic = True
r.font.color.rgb = MUTED

doc.add_paragraph()
table(
    ["Field", "Value"],
    [
        ["Project", "ANYFREEBOOK — free book aggregator + creator/publishing platform"],
        ["Production", "https://anyfreebook.com"],
        ["Repository", "github.com/michaelbanigo575-bot/anyfreebook (public)"],
        ["Framework", "Next.js 14.2 (App Router), React 18.3, TypeScript 5.6"],
        ["Database / Auth", "Supabase (Postgres + RLS + Storage + Realtime)"],
        ["Hosting", "Vercel (production)"],
        ["Guide version", "1.0 — 17 October 2026"],
        ["Audience", "Any agent or engineer taking over debugging, maintenance or feature work"],
    ],
    widths=[1.6, 5.1],
)

doc.add_page_break()

# ============================== 1. HOW TO USE ==============================
h("1. How to use this document", 1)
para(
    "This is the operational manual for ANYFREEBOOK. It is written for an agent or engineer who has "
    "never seen the codebase and needs to change it without breaking the site, its SEO, or its legal posture."
)
para("Read in this order the first time:", bold=True)
numbered("Section 3 (Non-negotiable rules) — these are the constraints that are easy to break by accident.")
numbered("Section 5 (The SourceTier system) — the single most important concept in the codebase.")
numbered("Section 7 (Audit findings) — what was broken and what is now fixed.")
numbered("Section 10 (Debugging playbook) — symptom-to-cause lookup.")

callout(
    "Authority order",
    "Where this document and the code disagree, the code is the truth about current behaviour. Where this "
    "document and CLAUDE.md disagree, this document is newer and reflects the 17 October 2026 audit. "
    "Neither overrides the owner's product decisions — if a rule here blocks something you were explicitly "
    "asked to build, raise it rather than silently working around it.",
)

para("Legend used throughout:", bold=True)
table(
    ["Marker", "Meaning"],
    [
        ["RULE", "Violating this breaks correctness, SEO, or legal integrity. Do not work around it."],
        ["TRAP", "Something that looks like a bug but is deliberate. Read before 'fixing' it."],
        ["MANUAL", "A human must do this step; an agent cannot. Needs explicit user action."],
    ],
    widths=[1.1, 5.6],
)

doc.add_page_break()

# ============================== 2. ARCHITECTURE ==============================
h("2. Architecture map", 1)

h("2.1 Repository shape", 2)
table(
    ["Path", "Purpose"],
    [
        ["src/app/", "All routes (App Router). ~60 route files."],
        ["src/components/", "Shared React components (~50)."],
        ["src/lib/", "Business logic: api adapters, creators, institutions, admin, classrooms, themes."],
        ["src/lib/data.ts", "Curated catalog: 259 book entries across 234 categories. ~68 KB."],
        ["src/lib/blogPosts.ts", "36 long-form SEO blog posts. ~102 KB."],
        ["src/lib/api/", "Live upstream adapters (7 sources) + the SourceTier resolver."],
        ["supabase/migrations/", "10 SQL migrations. Applied by hand (see RULE M1)."],
        ["vercel.json", "Cron schedule definitions."],
        ["CLAUDE.md", "Older project context file. Superseded in places by this document."],
        ["prisma/", "DEAD. 13 models, zero imports, Prisma not even a dependency. Safe to delete."],
        ["src/lib/scrapers/", "DEAD. Stub classes that all return empty arrays. Safe to delete."],
    ],
    widths=[2.1, 4.6],
)

h("2.2 The five product areas", 2)
table(
    ["Area", "Entry points", "Notes"],
    [
        ["Aggregator", "src/app/search, /category/[slug], /book/[slug]; src/lib/api/*",
         "7 live sources; the catalog in data.ts backs category and detail pages."],
        ["Creators", "src/app/creators/**; src/lib/creators/*",
         "Self-publishing. Earnings are SIMULATED (see K4)."],
        ["Classrooms", "src/app/classrooms, /class/[code]; src/lib/classrooms/*",
         "Own WebRTC implementation. Not Jitsi or Daily."],
        ["Institutions", "src/app/institutions/**; src/lib/institutions/*",
         "Schools/libraries, roles, study-plan assignment."],
        ["Blog", "src/app/blog/**; src/lib/blogPosts.ts",
         "36 posts driving long-tail SEO."],
    ],
    widths=[1.1, 2.9, 2.7],
)

h("2.3 Upstream data sources", 2)
para(
    "All seven adapters live in src/lib/api/. Each returns objects shaped like the Book interface in "
    "src/lib/data.ts. All of them are cached with revalidate: 3600 and all of them now carry an "
    "AbortSignal timeout (see K6)."
)
table(
    ["Adapter", "Upstream", "Cache", "Timeout"],
    [
        ["openlibrary.ts", "openlibrary.org/search.json", "1 h", "10 s"],
        ["gutenberg.ts", "gutendex.com, fallback archive.org", "1 h", "10 s"],
        ["archive.ts", "archive.org/advancedsearch.php", "1 h", "10 s"],
        ["googlebooks.ts", "googleapis.com/books/v1", "1 h", "10 s"],
        ["pubmed.ts", "eutils.ncbi.nlm.nih.gov (2 serial calls)", "1 h", "10 s"],
        ["doaj.ts", "doaj.org/api/search/articles", "1 h", "10 s"],
        ["librivox.ts", "librivox.org/api/feed", "1 h", "10 s"],
    ],
    widths=[1.5, 3.0, 0.9, 0.9],
)

doc.add_page_break()

# ============================== 3. NON-NEGOTIABLES ==============================
h("3. Non-negotiable rules", 1)
para(
    "These are not style preferences. Each one encodes a failure that has already happened, or a legal "
    "exposure the owner has explicitly ruled out. Breaking them is a regression, not an improvement.",
)

h("3.1 Legal and content integrity", 2)
callout(
    "RULE L1 — Never claim an in-copyright book is a free download",
    "The catalog in data.ts contains many commercially sold, in-copyright textbooks (Clean Code, CLRS, "
    "Campbell Biology, Harrison's, Atomic Habits). Every statement about free availability must be derived "
    "from the resolved SourceTier, never hardcoded. This applies to the page badge, the <title>, the meta "
    "description, the OG image text, AND the schema.org JSON-LD. A user-visible badge was fixed on "
    "17 Oct 2026 while schema.org still claimed price:0 / 'Free Download' for every book — the structured "
    "data is what search engines actually index.",
    fill="FDECEC",
)

bullet("**RULE L2** — Never source, host, or link a pirated copy. This defeats the entire purpose of the tier system.")
bullet("**RULE L3** — Never invent a statistic. No random ratings, view counts, like counts, prices, or superlatives (see 5.2).")
bullet("**RULE L4** — When a tier is not 'download', the page must offer a genuinely free alternative via src/lib/freeAlternatives.ts.")

h("3.2 Build and deploy", 2)
callout(
    "RULE B1 — Judge the build by its exit code",
    "Never grep the build log for success text. The correct check is the process exit code. A build can "
    "print 'Compiled successfully' and still fail during page generation.",
)
code([
    "cd D:\\ANYFREEBOOK",
    "node node_modules\\next\\dist\\bin\\next build > build-verify.log 2>&1",
    "echo \"EXIT: $LASTEXITCODE\"          # must be 0",
])
bullet("**RULE B2** — A build that prints repeated 'fetch failed' / 'ECONNRESET' but still reaches 351/351 pages and exits 0 is a PASS. Those are caught upstream failures degrading gracefully.")
bullet("**TRAP B3** — A deploy sitting at 'Building' for 15 minutes is normal, not stuck. 351 static pages each perform live upstream calls. Use 'vercel inspect <url> --logs' to watch page-generation progress.")

h("3.3 Routing and SEO", 2)
callout(
    "RULE S1 — Never add loading.tsx to a route segment whose pages call notFound()",
    "Next.js streams a 200 response shell before notFound() resolves, which converts real 404s into "
    "soft-404s and destroys SEO. This was a live production bug on /read, /category and /institutions, "
    "fixed by deleting those files. /classrooms legitimately keeps its loading.tsx because nothing under "
    "it calls notFound().",
    fill="FDECEC",
)

bullet("**RULE S2** — A new public route must be added to src/app/sitemap.ts.")
bullet("**RULE S3** — Server-side Date.now() is fine in a dynamic route. In a 'use client' component it causes a hydration mismatch — use the useNow() hook (see 8.2).")

h("3.4 Supabase", 2)
callout(
    "MANUAL M1 — Migrations are applied by hand",
    "There is no Supabase CLI link in this environment and no database URL. Raw DDL cannot be executed "
    "from the agent environment. To change the schema: write the SQL, give it to the user, and have them "
    "paste it into the Supabase dashboard SQL editor. Never claim a migration has been applied.",
)
bullet("**RULE M2** — The service-role key is server-only. It must never reach a client component or a NEXT_PUBLIC_ variable.")
bullet("**TRAP M3** — src/app/admin/guard.ts authenticates by comparing user email against the ADMIN_EMAILS environment variable. There is no 2FA and no IP allowlist. Treat that variable as a secret.")

h("3.5 Code conventions", 2)
bullet("**TRAP C1** — The silent `catch {}` pattern is deliberate and established across roughly 14 files. Do not convert it wholesale; error.tsx boundaries are the safety net above it. A silent catch in a NEW code path should be justified in a comment.")
bullet("**RULE C2** — Use the shared design primitives instead of re-inventing strings: cardClass() and primaryButtonClass() in src/lib/ui.ts, Skeleton and Sparkline in src/components/ui/.")
bullet("**RULE C3** — Theming is CSS variables set by src/lib/themes.ts (--surface, --text, --primary, --radius-lg, ...). Do not hardcode hex colours in components.")
bullet("**TRAP C4** — The TypeScript target predates iterable Map destructuring. Use Array.from(map.entries()) instead of for..of over a Map, or the build fails with TS2802.")

doc.add_page_break()

# ============================== 4. VERIFICATION ==============================
h("4. Verification recipes", 1)
para(
    "There is no test suite. Verification means the compiler, the linter, and a full production build — "
    "in that order. Run all three before reporting any change as complete."
)

h("4.1 TypeScript", 2)
code([
    "cd D:\\ANYFREEBOOK",
    "node node_modules\\typescript\\bin\\tsc --noEmit -p tsconfig.json",
    "echo \"EXIT: $LASTEXITCODE\"          # must be 0",
])

h("4.2 Lint", 2)
code([
    "$env:ESLINT_NO_DEV_ERRORS='true'",
    "node node_modules\\eslint\\bin\\eslint.js \"src\" --ext .ts,.tsx --format compact",
    "echo \"EXIT: $LASTEXITCODE\"          # must be 0",
])
para(
    "Five no-img-element warnings are pre-existing and expected (admin/page.tsx, admin/github/page.tsx, "
    "institutions/page.tsx, institutions/[slug]/page.tsx, read/[slug]/page.tsx). They are warnings, not errors.",
    italic=True, size=9.5, color=MUTED,
)

h("4.3 Production build", 2)
code([
    "node node_modules\\next\\dist\\bin\\next build > build-verify.log 2>&1",
    "echo \"EXIT: $LASTEXITCODE\"          # must be 0",
    "# expected: ✓ Compiled successfully",
    "#           ✓ Generating static pages (351/351)",
])
para("The build takes roughly 5 to 20 minutes. Run it in the background and poll for completion.", italic=True, size=9.5, color=MUTED)

h("4.4 Baseline as of 17 October 2026", 2)
table(
    ["Check", "Expected result"],
    [
        ["tsc --noEmit", "EXIT: 0, no output"],
        ["ESLint", "EXIT: 0, 5 pre-existing no-img-element warnings"],
        ["next build", "EXIT: 0, 351/351 static pages"],
    ],
    widths=[1.8, 4.9],
)
callout(
    "If a check fails after your change, it passed before your change",
    "That means you introduced the failure. Do not report the work as complete, and do not relax a type "
    "or lint rule to make it pass. Find the actual cause.",
)

doc.add_page_break()

# ============================== 5. SOURCE TIER ==============================
h("5. The SourceTier integrity system", 1)
callout(
    "If you read only one section of this document, read this one",
    "SourceTier is the mechanism that lets this site list in-copyright books without ever lying about "
    "them being free. Every free-availability claim in the product derives from it.",
    fill="E8F1FB",
)

h("5.1 The three tiers", 2)
para("Defined and resolved in src/lib/api/resolveSource.ts. The exported type is SourceTier.")
table(
    ["Tier", "Meaning", "What the page shows", "schema.org Offer"],
    [
        ["download", "Verified, author-matched public-domain full text (Project Gutenberg).",
         "Green 'FREE — 100% legal, open-access'.", "Emitted: price 0, InStock."],
        ["borrow", "A real Internet Archive copy, but confirmed access-restricted (Controlled Digital Lending).",
         "Blue 'Available to borrow'.", "NOT emitted."],
        ["unverified", "Nothing better than a catalog record or a generic search page.",
         "Amber 'No verified free copy found' + a real free alternative.", "NOT emitted."],
    ],
    widths=[0.9, 2.2, 2.2, 1.4],
)

h("5.2 Resolution order", 2)
numbered("Gutendex (gutendex.com) — searched by title, then the result's authors are checked against the catalog author. Only an author match earns the 'download' tier.")
numbered("Open Library — if the record carries an Internet Archive identifier, archive.org/metadata is queried to check 'access-restricted-item'. Restricted becomes 'borrow'; open becomes 'download'.")
numbered("Last resort — generic search-result links across Open Library, Internet Archive and Google Books, tier 'unverified'. A book is never left unlinked.")

h("5.3 Rules for using it", 2)
bullet("**RULE** — Import SourceTier from '@/lib/api/resolveSource' rather than redeclaring the union. It is now the single source of truth.")
bullet("**RULE** — bookSchema(book, tier) must always receive the resolved tier. It defaults to 'download' for backward compatibility, so forgetting the argument silently reintroduces the exact bug this system fixed. Treat the second parameter as required at every call site.")
bullet("**RULE** — Never render the phrase 'Free Download', price 0, or '100% legal' without a tier === 'download' guard in front of it.")
bullet("**RULE** — The '0 means unknown' convention applies to all metrics. Book.rating, ratingCount, viewCount and likeCount use 0 for 'the source gave us nothing'. Never render a bare 0 as a real number, and never substitute a random number.")

h("5.4 Where tier data flows", 2)
table(
    ["Location", "Role"],
    [
        ["src/lib/api/resolveSource.ts", "Defines SourceTier, performs resolution, exports the type."],
        ["src/app/book/[slug]/page.tsx", "Calls getSourceTier(); drives the badge, <title>, meta description, and passes tier into bookSchema()."],
        ["src/lib/schema.ts — bookSchema()", "Builds Book JSON-LD. Emits Offer only for tier 'download'."],
        ["src/lib/schema.ts — collectionSchema()", "Intentionally emits NO Offer. Collections mix public-domain and in-copyright titles, so a blanket price 0 would be false."],
        ["src/lib/freeAlternatives.ts", "Maps every category to a real open resource (OpenStax, MIT OCW, Gutenberg, Cornell LII). Per-title blog matches take priority."],
    ],
    widths=[2.4, 4.3],
)

doc.add_page_break()

# ============================== 6. DATA HONESTY ==============================
h("6. Data honesty conventions", 1)

h("6.1 The rule", 2)
para(
    "This site aggregates real books. Attaching a plausible-looking fake number to a real third-party "
    "title is deceptive even when no money changes hands, and it is the fastest way to lose AdSense "
    "approval and reader trust. The convention after the 17 Oct 2026 audit:"
)
bullet("**Show the real upstream value when the API provides one.**")
bullet("**Use 0 when it does not, and omit the element from the UI.**")
bullet("**Never fill the gap with Math.random(), a derived ratio, or a marketing superlative.**")

h("6.2 Specific things that were removed", 2)
table(
    ["Former behaviour", "Now", "Reason"],
    [
        ["likeCount = downloads / 20", "0", "A download count is not a like count. It was invented."],
        ["ratingCount = downloads / 100", "0", "Invented rating volume from download volume."],
        ["viewCount = 1000 + random(50000)", "0", "Pure fabrication on every search."],
        ["Random star ratings where the API had none", "0", "Fake 4.3-star average on a real book."],
        ["Catalog default description 'Available for free download...'", "Neutral text naming the copyright status", "Was applied to ~240 books regardless of availability."],
        ["Atomic Habits 'the #1 most-downloaded free audiobook'", "Removed", "Invented superlative on a commercially sold book."],
        ["SavingsShareCard price = 15 + random(60), accumulated to localStorage", "Requires a caller-supplied retailPrice", "Displayed and shared invented savings totals on social media."],
    ],
    widths=[2.5, 1.6, 2.6],
)

h("6.3 Known remaining inconsistency", 2)
callout(
    "K0 — The site states three different catalog sizes",
    "src/app/layout.tsx and src/lib/schema.ts say '1,700,000+ free books'; src/app/page.tsx says "
    "'5,000,000+ FREE BOOKS'. These contradict each other in structured data and on the page. Not fixed, "
    "because choosing the true number requires the owner's decision on what is actually being counted. "
    "Pick one figure and make all four call sites agree.",
)

doc.add_page_break()

# ============================== 7. AUDIT ==============================
h("7. Audit of 17 October 2026 — findings and resolutions", 1)
para(
    "A full read-only audit of both the local working tree and the GitHub main branch. "
    "Severity: Critical = legal or SEO-integrity exposure; Medium = real defect with user impact; "
    "Low = correctness or accessibility nit."
)

h("7.1 Resolved", 2)
table(
    ["#", "Sev", "Finding", "Resolution"],
    [
        ["1", "Critical", "bookSchema() hardcoded headline '{title} — Free Download' and Offer price 0 / InStock for every book, ignoring availability. schema.ts:49,63-65.",
         "bookSchema() now takes a SourceTier. headline is tier-derived; Offer is emitted only for 'download'."],
        ["2", "Critical", "collectionSchema() emitted price 0 for every book in every collection, including in-copyright titles. schema.ts:157.",
         "Offer block removed. Per-book schema carries availability instead."],
        ["3", "Critical", "makeBook() default description claimed 'Available for free download in multiple formats from open-access sources' for ~240 books. data.ts:137.",
         "Rewritten to name the copyright reality instead of asserting free availability."],
        ["4", "Critical", "Atomic Habits described as 'the #1 most-downloaded free audiobook on ANYFREEBOOK' with 380,000 views — an invented claim on a commercially sold book. data.ts:429.",
         "Claim removed; description now states it is a commercial title."],
        ["5", "Critical", "All 7 live API adapters invented star ratings and view/like counts whenever the upstream had no value.",
         "Every adapter now returns real-or-0. UI omits the row when the value is 0."],
        ["6", "Critical", "makeBook() used Math.random() for rating, ratingCount, viewCount and likeCount, so every build produced different fabricated metrics.",
         "Defaults changed to 0. Explicit curated values are preserved."],
        ["7", "Medium", "src/components/BookReader.tsx (10.5 KB) was never rendered anywhere and contained dangerouslySetInnerHTML at line 220 — a latent HTML injection sink.",
         "File deleted. Note: any future HTML rendering must sanitise first."],
        ["8", "Medium", "Unguarded JSON.parse on localStorage would white-screen on corrupted data. themes.ts, ReadingReminderProvider.tsx, SavingsShareCard.tsx (x2).",
         "All wrapped in try/catch with a safe default. Matches the pattern already used in ReaderSurface, BookInteractions, ReadingChallenge and settings."],
        ["9", "Medium", "Date.now() evaluated during render in 'use client' components caused hydration mismatches. NotificationsBell.tsx, CommentsSection.tsx.",
         "New useNow() hook in src/lib/useNow.ts returns null until mounted; both call sites updated."],
        ["10", "Medium", "rateLimit.ts called buckets.clear() at 5000 keys, wiping ALL rate-limit state so one burst of distinct IPs disabled protection for every user on the instance.",
         "Replaced with evictStale() (drops expired buckets) then oldest-key eviction. Used Array.from() to respect the TS target (see TRAP C4)."],
        ["11", "Medium", "6 of 7 upstreams had no fetch timeout. With 351 pages each doing live calls, one slow upstream could stall a deploy indefinitely.",
         "All 16 fetch sites now pass signal: UPSTREAM_TIMEOUT() from new src/lib/api/http.ts (10 s)."],
        ["12", "Medium", "SavingsShareCard invented a retail price and accumulated it into a lifetime savings total, then posted it to Twitter/WhatsApp/LinkedIn.",
         "Requires a caller-supplied retailPrice; without one it shows 'FREE' and adds $0."],
        ["13", "Low", "Book metadata used <dt>/<dd> inside a plain <div> with no <dl> ancestor — invalid HTML; screen readers lost the term/definition pairing.",
         "Wrapped in a <dl>. The per-item <div> wrapper inside <dl> is valid HTML5."],
    ],
    widths=[0.3, 0.6, 3.0, 2.8],
)

h("7.2 Deliberately NOT changed", 2)
table(
    ["Finding", "Why it stays"],
    [
        ["src/lib/scrapers/ — 13 stub classes returning empty arrays, never imported.",
         "Dead but harmless. Deleting is safe; leaving it costs nothing. Worth a cleanup pass."],
        ["prisma/schema.prisma — 13 models, zero imports, Prisma not in package.json.",
         "Misleading to future maintainers (it implies a second data layer that does not exist). Recommend deletion, but it is not urgent."],
        ["Admin auth is a single env email, no 2FA.",
         "Requires an infrastructure decision (adding an identity provider), not a code fix. Escalate to the owner."],
        ["publication_reads and view_events accept anonymous inserts ('with check (true)').",
         "Needed for read tracking from logged-out readers. Dedup relies on a client-supplied session_key in localStorage, which is trivially forgeable — so read counts are inflatable. A real fix needs server-side dedup or a signed token; needs a migration and an owner decision."],
        ["src/app/api/search has no rate limiting (search-stream does).",
         "Adding a limit risks throttling real users during a traffic spike. Needs a chosen threshold; the per-instance limiter is only a deterrent anyway (Vercel cold-starts reset it)."],
        ["Earnings are simulated; creator_earnings is never written.",
         "By design until real ad revenue exists. Do not present payouts as real."],
        ["Classroom TURN fallback is STUN-only on the client.",
         "TURN credentials exist in the environment but are not wired into the client retry path. Users behind symmetric NAT hit a dead end. Needs a design decision on relay cost."],
        ["Two <img> elements in admin pages (plus 3 elsewhere).",
         "Lint warnings only, admin-only routes, no SEO impact."],
    ],
    widths=[2.9, 3.8],
)

doc.add_page_break()

# ============================== 8. DEBUGGING ==============================
h("8. Debugging playbook", 1)

h("8.1 Symptom lookup", 2)
table(
    ["Symptom", "Most likely cause", "Action"],
    [
        ["Build hangs at 'Generating static pages'",
         "An upstream API is slow or hanging.",
         "Check the timeouts in src/lib/api/*.ts are present. Inspect build-verify.log for which page index is stuck. Retry — upstream rate limits are transient."],
        ["A real 404 returns HTTP 200 with page content",
         "A loading.tsx was added above a segment that calls notFound().",
         "Delete that loading.tsx. See RULE S1."],
        ["Google shows 'Free Download' for an in-copyright book",
         "bookSchema() called without the tier argument, or an Offer was emitted outside the tier guard.",
         "Verify bookSchema(book, tier) at the call site in book/[slug]/page.tsx. Then re-submit the URL in Search Console — the old structured data persists until recrawled."],
        ["'You just saved $0' or a wrong savings total",
         "SavingsShareCard was mounted without a retailPrice prop.",
         "Expected after the fix. Supply a verified retailPrice, or leave it unset so the honest 'FREE' variant renders."],
        ["Rating/likes row missing from a card",
         "Working as intended — the source returned no real value.",
         "Do not 'fix' this by inventing a number. See 6.1."],
        ["White screen on page load, no console error visible",
         "Unguarded JSON.parse on corrupted localStorage.",
         "Search for JSON.parse( across src/ and confirm each is wrapped in try/catch."],
        ["'Hydration failed' / text flickers on relative timestamps",
         "Date.now() called during render in a 'use client' component.",
         "Use the useNow() hook from src/lib/useNow.ts."],
        ["Rate limiting stops working under load",
         "Too many distinct keys on one instance, or a cold start reset the map.",
         "Remember this limiter is per-instance and is a deterrent, not a quota. Never rely on it for a hard limit."],
        ["A book page shows 'No verified free copy found' for a public-domain classic",
         "Gutendex did not author-match the record, or an upstream was unreachable and the tier degraded.",
         "Check the upstream response directly. An author mismatch means authorMatches() in resolveSource.ts needs review — do NOT simply force tier 'download'."],
        ["Deploy appears stuck at 'Building' for 15+ minutes",
         "Not stuck. 351 pages with live upstream calls.",
         "vercel inspect <url> --logs and watch the page-generation counter advance."],
    ],
    widths=[1.8, 2.1, 2.8],
)

h("8.2 The useNow hook", 2)
para("Use this for any client component that needs the current time.")
code([
    "'use client';",
    "import { useEffect, useState } from 'react';",
    "",
    "export function useNow(intervalMs = 60_000): number | null {",
    "  const [now, setNow] = useState<number | null>(null);",
    "  useEffect(() => {",
    "    setNow(Date.now());",
    "    if (intervalMs <= 0) return;",
    "    const id = setInterval(() => setNow(Date.now()), intervalMs);",
    "    return () => clearInterval(id);",
    "  }, [intervalMs]);",
    "  return now;",
    "}",
])
para("It returns null on the first render, so the server HTML and the first client render agree. Render an empty string or a placeholder while it is null.", italic=True, size=9.5, color=MUTED)

h("8.3 Upstream fetch pattern", 2)
para("Every call to a third-party API must be bounded and cached. Copy this shape:")
code([
    "import { UPSTREAM_TIMEOUT } from './http';",
    "",
    "const res = await fetch(url, {",
    "  next: { revalidate: 3600 },",
    "  signal: UPSTREAM_TIMEOUT(),",
    "});",
    "if (!res.ok) return [];   // degrade, never throw into the page",
])

doc.add_page_break()

# ============================== 9. ENV ==============================
h("9. Environment, deploy and operations", 1)

h("9.1 Environment variables (set in Vercel, production)", 2)
table(
    ["Variable", "Purpose", "Server only?"],
    [
        ["NEXT_PUBLIC_SUPABASE_URL", "Supabase project URL", "No"],
        ["SUPABASE_SERVICE_ROLE_KEY", "Privileged server operations. Bypasses RLS.", "YES — never client-side"],
        ["NEXT_PUBLIC_ADSENSE_CLIENT_ID", "AdSense publisher id", "No"],
        ["NEXT_PUBLIC_ADSENSE_SLOT_BOOK / _SEARCH / _CATEGORY / _BLOG", "4 ad units", "No"],
        ["CLOUDCONVERT_API_KEY", "Office -> PDF conversion. Needs task.read + task.write.", "YES"],
        ["Gemini credentials", "AI study aids, originality check", "YES"],
        ["TURN credentials", "WebRTC relay for classrooms", "YES"],
        ["ADMIN_EMAILS", "Comma-separated admin allowlist", "YES — treat as a secret"],
        ["CRON_SECRET", "Bearer token guarding /api/cron/*", "YES"],
        ["GOOGLE_BOOKS_API_KEY", "Optional; raises Google Books quota", "YES"],
    ],
    widths=[2.6, 2.5, 1.6],
)

h("9.2 Cron jobs", 2)
para("Defined in vercel.json. Both /api/cron/end-stale-classes and /api/cron/daily-distribution require an Authorization: Bearer <CRON_SECRET> header. end-stale-classes auto-closes classroom sessions abandoned more than 6 hours past their scheduled end.")
para("MANUAL: to add a cron, edit vercel.json AND give the user the secret value to set in Vercel. An agent cannot set Vercel environment variables.", bold=False)

h("9.3 Deploy procedure", 2)
numbered("Run the full verification suite (section 4). Do not deploy on a red build.")
numbered("Commit deliberately. The repo carries an uncommitted working tree by design — review the diff before staging.")
numbered("vercel deploy --prod --yes")
numbered("Expect 5 to 20 minutes. Monitor with vercel inspect <url> --logs.")
numbered("After deploy, spot-check one book page per tier (a Gutenberg classic, an IA borrow title, and an unverified textbook) to confirm the badge and schema agree.")

h("9.4 Git and GitHub state", 2)
bullet("Branches: main and dev, both tracking origin.")
bullet("Authenticated GitHub account: michaelbanigo575-bot (a bot account, fine-grained PAT in the OS keyring). Write access is unverified — do not push, open PRs, or comment without explicit user instruction.")
bullet("As of this guide, the working tree contains uncommitted changes including the entire SourceTier integrity system. It exists on disk but NOT on GitHub. Confirm state with 'git status --short' and 'git log --oneline -5' before assuming either side is current.")

doc.add_page_break()

# ============================== 10. WORKFLOW ==============================
h("10. Working agreement for agents", 1)

h("10.1 Definition of done", 2)
para("A change is complete only when all of the following are true. Report honestly against this list — do not claim a check you did not run.")
table(
    ["#", "Criterion"],
    [
        ["1", "tsc --noEmit exits 0."],
        ["2", "ESLint exits 0 with no new warnings."],
        ["3", "next build exits 0 and generates 351/351 pages."],
        ["4", "No new violation of any RULE in section 3."],
        ["5", "Any invented or placeholder data removed rather than replaced with a plausible guess."],
        ["6", "No secret written to a client component or a NEXT_PUBLIC_ variable."],
        ["7", "Schema/DB changes delivered as SQL for the user to paste, with the change clearly labelled as not yet applied."],
        ["8", "New public routes added to sitemap.ts."],
        ["9", "Anything unverifiable stated plainly in the summary, not glossed over."],
    ],
    widths=[0.4, 6.3],
)

h("10.2 Before you change anything", 2)
bullet("Read CLAUDE.md and this document. They encode failure modes that are not visible in the code.")
bullet("Run 'git status --short'. The tree is usually dirty; never assume an uncommitted change is yours to discard.")
bullet("Grep before you write. This codebase has similar helpers in several places and duplicated logic is a recurring pattern.")
bullet("Check whether the thing you are about to 'fix' is a deliberate pattern. Sections 3 and 4.2 exist because someone already made that mistake.")

h("10.3 When you are blocked", 2)
bullet("Schema changes, environment variables, DNS, Supabase RLS and Vercel project settings are all outside agent reach. Say so plainly and hand the user the exact SQL or the exact steps.")
bullet("Do not work around a RULE to make a task succeed. Escalate instead.")
bullet("If the owner's instructions conflict with a RULE in section 3, state the conflict in one sentence, then follow the owner's decision within safety limits.")

h("10.4 Current open items, in priority order", 2)
table(
    ["Priority", "Item", "Owner"],
    [
        ["1", "Commit the SourceTier integrity system. GitHub currently has no legal-honesty layer at all.",
         "User (commit) / agent (verify)"],
        ["2", "Resolve the 1.7M vs 5M catalog-size contradiction in four call sites (K0).", "User (decision)"],
        ["3", "Submit corrected URLs to Search Console so the stale price:0 structured data is recrawled.", "User (manual)"],
        ["4", "Wire TURN relay into the classroom client fallback path.", "User (cost decision)"],
        ["5", "Server-side read-count dedup, to make publication_reads non-inflatable.", "Needs migration + decision"],
        ["6", "Delete prisma/ and src/lib/scrapers/ — both entirely dead.", "Low urgency"],
        ["7", "Add a second identity check to the admin guard.", "User (infra decision)"],
        ["8", "Real earnings pipeline, or explicitly label payouts as projections in the UI.", "Product decision"],
    ],
    widths=[0.8, 4.3, 1.6],
)

doc.add_paragraph()
p = doc.add_paragraph()
p.alignment = WD_ALIGN_PARAGRAPH.CENTER
r = p.add_run("End of guide — ANYFREEBOOK Agent Handoff, v1.0, 17 October 2026")
r.italic = True
r.font.size = Pt(9)
r.font.color.rgb = MUTED

out = r"D:\ANYFREEBOOK\ANYFREEBOOK-Agent-Handoff-Guide.docx"
doc.save(out)
print("WROTE:", out)