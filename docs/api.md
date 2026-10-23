# ANYFREEBOOK API v1

A free, no-signup-required HTTP API over seven open-access book sources.

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
| `download` | A verified, public-domain full text you can fetch directly. | Direct file URLs, when we have them. |
| `borrow` | A real copy on the Internet Archive, but confirmed **borrow-only**: a free IA account and a loan are required. Not a download. | Empty. |
| `unverified` | A catalogue record or a search page. We could not confirm a free, legally readable copy of *this exact title*. | Empty. |

Only `download` is a free download. Every other result links to the real
source so you can read it there.

`tier` is never a guess about a specific copy. It comes from the source's own
metadata: for the Internet Archive we read `access-restricted-item` and
`lending_identifier` from the item's own record, and for Project Gutenberg we
only claim `download` when the ebook id resolves to a real file.

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
| `source` | string | `all` | `all`, `local`, `gutenberg`, `openlibrary`, `archive`, `googlebooks`, `pubmed`, `doaj`, `librivox` |
| `limit` | integer | `20` | 1–50. |

```json
{
  "query": "python",
  "page": 1,
  "limit": 20,
  "total": 22537,
  "count": 20,
  "sources": { "Project Gutenberg": 120, "Open Library": 22417 },
  "failedSources": [],
  "partial": false,
  "results": [
    {
      "id": "pg-39560",
      "title": "Fairy Circles",
      "author": "Villamaria",
      "year": null,
      "source": "Project Gutenberg",
      "sourceType": "gutenberg",
      "sourceUrl": "https://www.gutenberg.org/ebooks/39560",
      "tier": "download",
      "tierReason": "Verified public-domain full text on Project Gutenberg.",
      "license": "Public domain (Project Gutenberg)",
      "files": [
        { "format": "epub", "url": "https://www.gutenberg.org/ebooks/39560.epub3.images", "bytes": null, "label": "EPUB" },
        { "format": "txt", "url": "https://www.gutenberg.org/ebooks/39560.txt.utf-8", "bytes": null, "label": "Plain text" },
        { "format": "html", "url": "https://www.gutenberg.org/ebooks/39560.html.images", "bytes": null, "label": "HTML" }
      ],
      "links": [
        { "label": "Read on Project Gutenberg", "url": "https://www.gutenberg.org/ebooks/39560", "source": "Project Gutenberg" }
      ],
      "url": "https://anyfreebook.com/book/fairy-circles-pg-39560"
    }
  ],
  "meta": {
    "apiVersion": "v1",
    "generatedAt": "2026-10-23T23:30:00.000Z"
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

---

## `GET /resolve`

The authoritative answer for one title. It asks Project Gutenberg for a real
ebook and checks the author actually matches, so a book by one Austen never
resolves to a different book that shares the surname.

| Parameter | Type | Required | Notes |
|---|---|---|---|
| `title` | string | **yes** | Max 300 characters. |
| `author` | string | no | Used to confirm the match. |

```json
{
  "title": "Pride and Prejudice",
  "author": "Jane Austen",
  "tier": "download",
  "tierReason": "Verified public-domain full text on Project Gutenberg.",
  "sourceType": "gutenberg",
  "sourceUrl": "https://www.gutenberg.org/ebooks/1342",
  "license": "Public domain",
  "files": [
    { "format": "epub", "url": "https://www.gutenberg.org/ebooks/1342.epub3.images", "bytes": null, "label": "EPUB" }
  ],
  "links": [
    { "label": "Read on Project Gutenberg", "url": "https://www.gutenberg.org/ebooks/1342", "source": "Project Gutenberg" }
  ],
  "meta": { "apiVersion": "v1", "generatedAt": "2026-10-23T23:30:00.000Z" }
}
```

---

## `GET /health`

```json
{
  "status": "ok",
  "apiVersion": "v1",
  "uptimeSeconds": 1234,
  "sources": ["Project Gutenberg", "Open Library", "Internet Archive", "Google Books", "PubMed Central", "DOAJ", "LibriVox"]
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
load — every search fans out to up to seven third-party APIs.

A command-line client or a server-side SDK does not need CORS at all.

---

## Clients

- **CLI** — `npm install -g anyfreebook-cli` → <https://github.com/michaelbanigo575-bot/anyfreebook-cli>
- **Python** — `pip install anyfreebook-api`

Both are generated from this document, so they cannot drift from it.

---

## Sources

Project Gutenberg · Open Library · Internet Archive · Google Books ·
PubMed Central · DOAJ · LibriVox

Google Books records are catalogue entries, not free copies, and are reported
as `unverified` for exactly that reason.
