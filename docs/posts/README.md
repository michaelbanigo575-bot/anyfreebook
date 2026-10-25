# Blog post drafts

Three technical posts about the ANYFREEBOOK build. Each is written to be published as-is, with the code excerpts taken from the repository.

## Index

| # | File | Title | Hook |
|---|------|-------|------|
| 1 | `01-fanning-out-search-across-twelve-open-apis.md` | Fanning out a search across twelve APIs, and telling the user when one of them fails | A multi-source search has a failure mode most implementations hide: one dead upstream silently shrinks the result set, and the reader cannot tell "that is all there is" from "we could not ask". |
| 2 | `02-your-free-book-api-might-not-be-free.md` | Your "free" book API might not be free | A book-search API hands you a URL and calls it free, but that URL may be a public-domain text, a borrow-only lending copy, or a catalogue record for a book still in copyright — and linking to it is a legal claim you cannot support. |
| 3 | `03-one-codebase-two-install-paths-pwa-and-twa.md` | One codebase, two install paths: shipping a PWA and an Android app from the same Next.js site | The Play app is a 1.2 MB shell around the website, but the Digital Asset Links handshake has two traps in it: an uppercase-only fingerprint validator and the difference between your upload key and Play's app-signing key. |

## Where each post is intended to go

- **Post 1** — Dev.to (primary) and Hashnode (cross-post). Also a strong fit for r/webdev and r/Python if it is reframed (see below).
- **Post 2** — Dev.to and Hashnode. Best suited to r/Python of the three, since the API and tier-resolution angle is language-agnostic and the code is TypeScript that a Python reader can still follow.
- **Post 3** — Dev.to and Hashnode. The natural home for the PWA/Android half is r/webdev and r/FlutterDev, where Trusted Web Activity discussion is common and the Play-signed-fingerprint trap is repeatedly asked about.

## Adapting them per platform

The three drafts are written in the voice of an engineering blog post, which is the right register for Dev.to and Hashnode but wrong for Reddit. On Reddit, lead with the problem and drop the project: retitle post 1 around the generic failure mode ("what happens when one API in a fan-out returns 500"), post 3 around the Digital Asset Links fingerprint bug on its own, and keep post 2's argument as the thesis rather than as a product announcement. Strip the ANYFREEBOOK-specific URLs, the catalogue figures and the product framing from the opening paragraphs, and if you keep the codebase as the evidence, say plainly at the top that you built it — r/webdev and r/Python both remove self-promotional posts, and "I wrote this" plus a link in the last paragraph is the version that survives. Also drop the cross-links between the posts and the closing call-to-action; on Reddit the discussion in the comments is the call to action. On Dev.to and Hashnode, keep the code blocks, keep the closing line, and add the tags that fit each one (`webdev`, `api`, `typescript`, `nextjs` for post 1; `api`, `legal`, `licensing`, `typescript` for post 2; `android`, `pwa`, `twa`, `nextjs` for post 3).
