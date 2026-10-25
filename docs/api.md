# ANYFREEBOOK API v1

A free, no-signup-required HTTP API over twelve open-access book, paper and textbook sources.

**Base URL:** `https://anyfreebook.com/api/v1`

```bash
curl "https://anyfreebook.com/api/v1/search?q=python&limit=3"
```

---

## Why this API exists

Most "free book" APIs hand you a title and a link and leave you to guess
whether the thing behind that link is actually free to read. Some are public
domain, some are borrow-only loans, and some are a catalogue record for a book
that is still under copyright.

This API answers that question for you, per result, in a field called `tier`.

## The tier system

| `tier` | Meaning | `files` |
|---|---|---|
| `download` | A free, legally readable copy of this exact title, resolved from the source's own metadata. | Direct file URLs, when the source exposes one. Sometimes empty — see below. |
| `borrow` | A real copy on the Internet Archive, but confirmed **borrow-only**: a free IA account and a loan are required. Not a download. | Empty. |
| `unverified` | A catalogue record or a search page. We could not confirm a free, legally readable copy of *this exact title*. | Empty. |

Only `download` is a free download. Every other result links to the real
source so you can read it there.

`tier` is never a guess about a specific copy. It comes from the source's own
metadata: for the Internet Archive we read `access-restricted-item`,
`lending_identifier` and `lendinginfo` from the item's own record, and for
Project Gutenberg we only claim `download` when the title and the author match
a real ebook and its id resolves to a real file.

---

## Authentication

**Optional.** The anonymous tier works with no setup.

```bash
curl "https://anyfreebook.com/api/v1/search?q=python"            # anonymous
curl -H "Authorization: Bearer afb_..." "https://anyfreebook.com/api/v1/search?q=python"
```

| Tier | Requests / minute | Requests / day |
|---|---|---|
| anonymous (no key) | 30 | 200 |
| `free` | 60 | 2,000 |
| `partner` | 300 | 50,000 |

A key that cannot be verified gets `401`. It is never silently downgraded to
the anonymous tier — that would hide a typo behind a working request.

Keys are issued with `scripts/issue-api-key.mjs`; only the SHA-256 hash is
stored.

---

## `GET /search`

| Parameter | Type | Default | Notes |
|---|---|---|---|
| `q` | string | — | **Required.** Max 200 characters. |
| `page` | integer | `1` | |
| `source` | string | `all` | `all`, `local`, `gutenberg`, `openlibrary`, `archive`, `googlebooks`, `pubmed`, `doaj`, `librivox`, `openalex`, `wikisource`, `europeana`, `zenodo`, `otl` |
| `limit` | integer | `20` | 1–50. |

```json
{
  "query": "python",
  "page": 1,
  "limit": 2,
  "total": 23872467,
  "count": 2,
  "sources": {
    "ANYFREEBOOK": 3,
    "Open Library": 6588,
    "Internet Archive": 23527856,
    "DOAJ": 17392,
    "PubMed Central": 297904,
    "Project Gutenberg": 22537,
    "LibriVox": 0,
    "Google Books": 190
  },
  "failedSources": [],
  "partial": false,
  "results": [
    {
      "id": "ol-OL2784125W",
      "title": "Learning Python",
      "author": "Mark Lutz, David Ascher",
      "year": 1999,
      "source": "Open Library",
      "sourceType": "openlibrary",
      "sourceUrl": "https://openlibrary.org/works/OL2784125W",
      "tier": "borrow",
      "tierReason": "A real Internet Archive copy exists, but it is borrow-only: a free Internet Archive account and a loan are required, so it is not a direct download.",
      "license": "Borrow-only lending copy (Internet Archive)",
      "files": [],
      "links": [
        { "label": "Read on Open Library", "url": "https://openlibrary.org/works/OL2784125W", "source": "Open Library" },
        { "label": "Read on Internet Archive", "url": "https://archive.org/details/einfuhrunginpyth0000lutz", "source": "Internet Archive" }
      ],
      "url": "https://anyfreebook.com/book/learning-python-ol-OL2784125W"
    }
  ],
  "meta": {
    "apiVersion": "v1",
    "generatedAt": "2026-10-24T11:45:48.554Z"
  }
}
```

### `failedSources` and `partial`

`failedSources` lists the sources that did not answer, and `partial` is `true`
when it is non-empty. A partial result set is **not** an empty result set — it
means one of the upstreams was down or rate-limited. Surface it; do not present
a short list as though it were everything.

### `files`

Direct file URLs, present only when the file genuinely exists. `bytes` is
`null` when the source does not report a size.

Project Gutenberg's three canonical formats are always offered for a valid
ebook id (EPUB, plain text, HTML). Gutenberg does **not** serve a PDF for every
title, so no PDF is listed unless the source reported one.

A `tier` of `download` means the copy is free to read without payment or an
account. It does **not** guarantee that `files[]` is non-empty: a DOAJ article,
a PubMed Central paper and a LibriVox recording are free, but the source
exposes no file you can fetch in one request, so those records carry `links[]`
instead. Check `files.length` before you try to fetch.

---

## `GET /resolve`

The authoritative answer for one title. It checks the title **and** the author
against the real record, so a book by one Austen never resolves to a different
book that shares the surname — and a request for one title never comes back
with a different book attached. When no record matches, the tier is `unverified`
and `links[]` points at real search pages for that exact title and author.

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `title` | string | **yes** | Max 300 characters. |
| `author` | string | no | Used to confirm the match. |

```json
{
  "title": "Fairy Circles",
  "author": "Villamaria",
  "tier": "download",
  "tierReason": "Open-access copy on the Internet Archive.",
  "sourceType": "archive",
  "sourceUrl": "https://archive.org/details/fairycirclestale00villiala",
  "license": "Public domain",
  "files": [
    { "format": "epub", "url": "https://archive.org/download/fairycirclestale00villiala/fairycirclestale00villiala.epub", "bytes": 15512987, "label": "fairycirclestale00villiala.epub" },
    { "format": "pdf", "url": "https://archive.org/download/fairycirclestale00villiala/fairycirclestale00villiala.pdf", "bytes": 13373257, "label": "fairycirclestale00villiala.pdf" },
    { "format": "txt", "url": "https://archive.org/download/fairycirclestale00villiala/fairycirclestale00villiala_djvu.txt", "bytes": 514307, "label": "fairycirclestale00villiala_djvu.txt" },
    { "format": "html", "url": "https://archive.org/download/fairycirclestale00villiala/fairycirclestale00villiala_hocr.html", "bytes": 11537829, "label": "fairycirclestale00villiala_hocr.html" }
  ],
  "links": [
    { "label": "Read on Internet Archive", "url": "https://archive.org/details/fairycirclestale00villiala", "source": "Internet Archive" },
    { "label": "View on Open Library", "url": "https://openlibrary.org/works/OL7903107W", "source": "Open Library" }
  ],
  "meta": { "apiVersion": "v1", "generatedAt": "2026-10-24T12:53:48.857Z" }
}
```

---

## `GET /health`

```json
{
  "status": "ok",
  "apiVersion": "v1",
  "uptimeSeconds": 1234,
  "sources": ["Project Gutenberg", "Open Library", "Internet Archive", "Google Books", "PubMed Central", "DOAJ", "LibriVox", "OpenAlex", "Wikisource", "Europeana", "Zenodo", "Open Textbook Library"]
}
```

Touches no upstream, so it stays up even when a source is down.

---

## Errors

| Status | Body | Meaning |
|---|---|---|
| `400` | `{"error": "..."}` | Missing or invalid parameter. |
| `401` | `{"error": "..."}` | The presented API key could not be verified. |
| `429` | `{"error": "..."}` | Rate limit exceeded. `Retry-After` header says how long to wait. |
| `500` | `{"error": "..."}` | Something broke on our side. |

---

## CORS

Closed by default. The allowlist comes from `NEXT_PUBLIC_API_ALLOWED_ORIGINS`
(a comma-separated list of origins). Set it to `*` only once you accept the
load — every search fans out to up to twelve third-party APIs.

A command-line client or a server-side SDK does not need CORS at all.

---

## Clients

- **CLI** — `npm install -g anyfreebook-cli` → <https://github.com/michaelbanigo575-bot/anyfreebook-cli>
- **Python** — `pip install anyfreebook-api`

Both are generated from this document, so they cannot drift from it.

---

## Sources

Project Gutenberg · Open Library · Internet Archive · Google Books ·
PubMed Central · DOAJ · LibriVox · OpenAlex · Wikisource · Europeana · Zenodo · Open Textbook Library

Google Books records are catalogue entries, not free copies, and are reported
as `unverified` for exactly that reason.
