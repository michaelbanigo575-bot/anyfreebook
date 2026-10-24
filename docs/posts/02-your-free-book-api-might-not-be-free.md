# Your "free" book API might not be free

A book-search API hands you a URL, and usually the word "free" printed next to it. That URL is a black box. Behind it there can be a public-domain full text, a borrow-only lending copy, or a catalogue record for a book that is still in copyright. If your client links to it and calls it free, it is making a claim about the law that it cannot support — on your users' behalf.

## Three tiers, and what each one actually means

ANYFREEBOOK returns a tier with every result. The three tiers are deliberately narrow:

- **`download`** — a verified, public-domain full text for this exact title, author-matched, with a real file URL behind it. This is the only tier that permits the words "free download" anywhere in the product.
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

If the metadata call fails or the item cannot be read, the resolver falls back to `unverified` rather than assuming the best. A record we could not read is never promoted to `download`.

For Project Gutenberg, the ebook id has to resolve to a real file, and the author has to match. `src/lib/api/resolveSource.ts` does the author check first, because a title alone is not enough — a book by one Austen must never resolve to a different book that shares the surname:

```ts
function authorMatches(author: string, authors: { name: string }[] | undefined): boolean {
  if (!authors || authors.length === 0) return false;
  const tokens = author.toLowerCase().split(/[\s,&]+/).filter(t => t.length >= 3);
  const combined = authors.map(a => a.name.toLowerCase()).join(' | ');
  return tokens.some(t => combined.includes(t));
}
```

Only when a match survives that check does the resolver claim a tier at all:

```ts
const match = data.results?.find((r: { authors?: { name: string }[] }) =>
  authorMatches(author, r.authors)
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

## Borrow is not download

Controlled Digital Lending is easy to misdescribe. The Internet Archive holds a real copy of the book. The reader gets a real copy of the book. But the copy is only accessible through the Archive's lending interface: you need a free account, and you need to take out a loan, and the loan is time-limited and renewed through a queue.

None of that is a file. A link to a borrow-only item is not something a downloader can fetch; it is a page that requires an account before it gives you anything. If your API says "free download" and links to a borrow-only item, you have shipped a button that leads to a login wall and called it a download.

That is why the tiers are separate values rather than a boolean `isFree`. `borrow` is a real, useful answer — this copy is genuinely free to read, under conditions — but it is a different answer from "you may fetch this file now".

## The rule: a download tier comes with a file URL

Our resolver never returns `download` for a landing page. The tier is tied to a real file, and the API's `files[]` array carries it:

```json
{
  "title": "Fairy Circles",
  "tier": "download",
  "tierReason": "Verified public-domain full text on Project Gutenberg.",
  "license": "Public domain (Project Gutenberg)",
  "files": [
    { "format": "epub", "url": "https://www.gutenberg.org/ebooks/39560.epub3.images", "bytes": null, "label": "EPUB" }
  ],
  "links": [
    { "label": "Read on Project Gutenberg", "url": "https://www.gutenberg.org/ebooks/39560", "source": "Project Gutenberg" }
  ]
}
```

For `borrow` and `unverified`, `files[]` is empty and `links[]` points at the real source. That is not an oversight in the payload — it is the payload making the distinction impossible to miss.

When a source offers only a landing page, the tier is `unverified` and the links are search URLs for the exact title and author. We would rather send a reader to a real search page than pretend it is a download.

One more wrinkle worth knowing if you work against the Internet Archive directly: the file list contains things that look like documents and are not. Labels are matched exactly against a small allowlist of real formats, and the file name is checked too, because "OCR Search Text" is a gzipped search index and "Single Page Original JP2 Tar" is a several-hundred-megabyte dump of page images. Matching labels loosely is how a downloader ends up fetching a 700 MB tarball thinking it fetched a book.

## What a client does with the tier

Here is the client-side consequence, and it is the part most implementations skip. A consumer that downloads each book should check the tier and refuse out loud:

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

The difference between throwing and skipping is the whole point. A silent skip produces a run that looks successful and quietly contains fewer books than it should. A refusal with the tier attached tells the user something true: this title is borrow-only, or it is a catalogue record, and here is why.

## The tier is the single source of truth

Inside our own codebase the discipline is enforced by having exactly one decision point. `src/lib/api/resolveSource.ts` exports the `SourceTier` type, and the book page's badge, its `<title>`, its meta description and its schema.org offer all read from that one value. The green "100% legal, open-access" badge appears only when the tier is `download`. Nothing hardcodes a free claim.

When the tier is anything other than `download`, the page does something better than apologising. It offers a genuinely free alternative — a real open resource for that subject, from OpenStax, MIT OpenCourseWare, Project Gutenberg, Cornell LII and similar, with per-title matches taking priority over per-category ones.

## If your API returns "free" URLs, you are making a legal claim

That is the broader point. A "free" URL in an API response is not a convenience field. It is a representation to your users, and indirectly to their employers and their schools, that the thing behind the link costs nothing and can be taken away.

Resolve it properly or don't claim it. The tier is the mechanism: three values, each backed by the source's own metadata, each with a `tierReason` that a human can read and argue with.

The failure this avoids is concrete. It is shipping a "free download" button that leads to a login wall, which is embarrassing. It is also shipping that same button where some downstream site has filled the gap with a pirated copy, which is not. Between the two, the boring tier system is the cheapest insurance there is.
