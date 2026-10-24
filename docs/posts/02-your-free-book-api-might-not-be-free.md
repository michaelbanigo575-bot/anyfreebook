# Your "free" book API might not be free

A book-search API hands you a URL, and usually the word "free" printed next to it. That URL is a black box. Behind it there can be a public-domain full text, a borrow-only lending copy, or a catalogue record for a book still in copyright. If your client calls it free, it is making a claim about the law it cannot support — on your users' behalf.

## Three tiers, and what each one actually means

ANYFREEBOOK returns a tier with every result. The three tiers are deliberately narrow:

- **`download`** — a free, legally readable copy of this exact title, resolved from the source's own metadata. This is the only tier that permits the words "free download" anywhere in the product.
- **`borrow`** — a real Internet Archive copy that the Archive's own metadata says is loan-only. Controlled Digital Lending: a free Internet Archive account plus a loan. There is no file to fetch.
- **`unverified`** — a catalogue record, or a search-results page for this title. We could not confirm a free, legally readable copy of *this exact title*.

The tier is not a guess or a heuristic. It is resolved from the source's own metadata.

## The evidence has to come from the source

For the Internet Archive, the item's own record answers both questions at once: is this copy open, and which files can be downloaded. `src/lib/api/publicRecords.ts` reads the lending fields directly:

```ts
const restricted =
  metadata['access-restricted-item'] === 'true' ||
  !!metadata['lending_identifier'] ||
  !!metadata['lendinginfo'];
```

If the metadata call fails, the resolver falls back to `unverified` rather than assuming the best. A record we could not read is never promoted to `download`.

For Project Gutenberg, the title and the author both have to match. `src/lib/api/resolveSource.ts` checks the author, because a title alone is not enough — a book by one Austen must never resolve to a different book that shares the surname:
```ts
function authorMatches(author: string, authors: { name: string }[] | undefined): boolean {
  if (!authors || authors.length === 0) return false;
  const tokens = author.toLowerCase().split(/[\s,&]+/).filter(t => t.length >= 3);
  const combined = authors.map(a => a.name.toLowerCase()).join(' | ');
  return tokens.some(t => combined.includes(t));
}
```

Only when a match survives both checks does the resolver claim a tier:

```ts
const match = data.results?.find(
  (r: { title?: string; authors?: { name: string }[] }) =>
    titleMatches(title, r.title) && authorMatches(author, r.authors)
);
if (match) {
  const readUrl =
    match.formats?.['text/html'] ||
    match.formats?.['application/epub+zip'] ||
    `https://www.gutenberg.org/ebooks/${match.id}`;
  return {
    sourceUrl: `https://www.gutenberg.org/ebooks/${match.id}`,
    sourceType: 'gutenberg',
    downloadLinks: [{ label: 'Read on Project Gutenberg', url: readUrl, source: 'Project Gutenberg' }],
    tier: 'download',
  };
}
```

And the rule that matters most: **a catalogue record is not a copy.** Open Library holding an entry for a book tells you the book exists and where it can be bought. It says nothing about whether the text is free to read today. Treating "we found the title" as "the title is free" is the single most common bug in this category of API, and the one that ends up in front of a rights holder.

The title has to be checked too, and this is a bug we hit ourselves. Gutendex and Open Library both rank by relevance, so taking the top hit returns whatever scored highest. Our resolver asked Open Library for one result and checked the author; a request for *Fairy Circles* by William James Hudson came back with a downloadable copy of *Alice's Adventures in Wonderland*, labelled `tier: download`. The fix is to fetch several candidates, ask for their title and author fields, and accept the first that is actually the title requested:

```ts
const doc = docs.find((d) => {
  if (!titleMatches(title, d.title)) return false;
  if (!author || !d.author_name || d.author_name.length === 0) return true;
  return authorMatches(author, d.author_name.map((name) => ({ name })));
});
```

`titleMatches` allows a subtitle ("Fairy Circles: Tales and Legends of …") but not a different book that merely starts with the same words. When nothing matches, the resolver returns `unverified` with links to real search pages — the honest answer: we cannot confirm a free copy of *that* book.

## Borrow is not download

Controlled Digital Lending is easy to misdescribe. The Internet Archive holds a real copy of the book. The reader gets a real copy of the book. But it is only accessible through the Archive's lending interface: you need a free account, you need to take out a loan, and the loan is time-limited and renewed through a queue.

None of that is a file. A link to a borrow-only item is not something a downloader can fetch; it is a page that requires an account before it gives you anything. If your API says "free download" and links to a borrow-only item, you have shipped a button that leads to a login wall and called it a download.

That is why the tiers are separate values rather than a boolean `isFree`. `borrow` is a real answer — this copy is free to read, under conditions — but it differs from "you may fetch this file now".

## The rule: never claim a download you cannot point at

Our resolver never returns `download` for a search-results page. Where the source exposes a file, the API's `files[]` array carries it. This is a real response, captured from the live API:

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
  "meta": { "apiVersion": "v1", "generatedAt": "2026-10-24T12:53:48.857Z", "caller": "anonymous" }
}
```

For Project Gutenberg the same shape comes back with Gutenberg's canonical URLs instead — `/ebooks/1342.epub3.images`, `.txt.utf-8` and `.html.images` — because those three exist for every ebook. Gutenberg serves no PDF for every title, so none is listed unless the source reported one.

There is one case where `download` comes back with an empty `files[]`: the copy is genuinely free to read, but the source exposes no file you can fetch in one request. A DOAJ article or a PubMed Central paper is free full text at the publisher's page; a LibriVox recording is free as chapter files; an Internet Archive item whose only derivatives are DRM-encrypted has no fetchable file. Those records carry `links[]` instead.

So a machine client should check two things. `tier === 'download'` says the copy is free without payment or an account. `files.length > 0` says you can fetch it right now. A downloader that only checks the tier sometimes finds nothing to download; one that only checks `files[]` misses the cases where the tier matters.

For `borrow` and `unverified`, `files[]` is empty and `links[]` points at the real source. That is not an oversight in the payload — it is the payload making the distinction impossible to miss.

When `/resolve` cannot find a copy it can confirm, the tier is `unverified` and the links are search URLs for the exact title and author. We would rather send a reader to a real search page than pretend it is a download.

One more wrinkle: the file list contains things that look like documents and are not. Labels are matched exactly against a small allowlist of real formats, and the file name is checked too, because "OCR Search Text" is a gzipped search index and "Single Page Original JP2 Tar" is a several-hundred-megabyte dump of page images. Matching labels loosely is how a downloader ends up fetching a 700 MB tarball thinking it fetched a book.

## What a client does with the tier

Here is the client-side consequence, the part most implementations skip. A consumer that downloads each book should check the tier and refuse out loud:

```ts
// An example client consuming GET /api/v1/resolve
type Tier = 'download' | 'borrow' | 'unverified';

interface Resolved {
  tier: Tier;
  tierReason: string;
  files: { format: string; url: string }[];
}

async function download(title: string) {
  const res = await fetch(
    `https://anyfreebook.com/api/v1/resolve?title=${encodeURIComponent(title)}`
  );
  const body = (await res.json()) as Resolved;

  if (body.tier !== 'download' || body.files.length === 0) {
    // Refuse out loud. Skipping the title silently would look, to the user
    // watching the output, exactly like the download succeeded.
    throw new Error(`Cannot download "${title}" (${body.tier}): ${body.tierReason}`);
  }

  for (const file of body.files) {
    // fetch file.url
  }
}
```

The difference between throwing and skipping is the whole point. A silent skip produces a run that looks successful and quietly contains fewer books than it should. A refusal with the tier attached tells the user something true: this title is borrow-only, or it is a catalogue record.

## The tier is the single source of truth

Inside our own codebase the discipline is enforced by having exactly one decision point. `src/lib/api/resolveSource.ts` exports the `SourceTier` type, and the book page's badge, its `<title>`, its meta description and its schema.org offer all read from that one value. The green "100% legal, open-access" badge appears only when the tier is `download`.

When the tier is anything other than `download`, the page does something better than apologising. It offers a genuinely free alternative — a real open resource for that subject, from OpenStax, MIT OpenCourseWare, Project Gutenberg and Cornell LII, with per-title matches taking priority over per-category ones.

## If your API returns "free" URLs, you are making a legal claim

That is the broader point. A "free" URL in an API response is not a convenience field. It is a representation to your users, and indirectly to their employers and their schools, that the thing behind the link costs nothing and can be taken away.

Resolve it properly or don't claim it. The tier is the mechanism: three values, each backed by the source's own metadata, each with a `tierReason` that a human can read and argue with.

The failure this avoids is concrete. It is shipping a "free download" button that leads to a login wall, which is embarrassing. It is also shipping that same button where a downstream site has filled the gap with a pirated copy, which is not. Between the two, the boring tier system is the cheapest insurance there is.
