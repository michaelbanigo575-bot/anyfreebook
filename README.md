# ANYFREEBOOK 📚

**The world's largest free book aggregator** — search 5,000,000+ free books, textbooks, audiobooks, and research papers from 6 open-access sources, all in one place.

🌐 Live site: [anyfreebook.com](https://anyfreebook.com)

## What it does

ANYFREEBOOK aggregates live search results from legal, open-access repositories and links every result back to its original source:

| Source | Content |
|---|---|
| Open Library | 5M+ books (Internet Archive lending library) |
| Project Gutenberg | 70K+ public-domain ebooks |
| Google Books | Free ebooks |
| Internet Archive | Full-text books & scans |
| PubMed Central | Free biomedical research articles |
| DOAJ | Open-access journal articles |

## Features

- 🔍 **Unified live search** across all 6 sources with per-source filtering and deduplication
- 👁️ **In-page book previews** — read before you download (Archive.org BookReader, Google Books embed, Gutenberg HTML)
- 📅 **Study plans & reading reminders** — set a weekly goal, get browser-notification alarms
- 💰 **Savings tracker** — see how much you saved vs. retail, share it in one tap
- 🎁 **Referrals & reading challenges** with tiers and streaks
- 🎧 Audiobook player with TTS, background playback & sleep timer
- 📱 PWA — installable, offline-capable
- 🎨 5 themes + custom gradient builder
- 🗂️ Curated collections and user reading lists
- 🏫 University partnership & free-textbook-alternative SEO pages

## Tech stack

- **Next.js 14** (App Router) + TypeScript + Tailwind CSS
- Prisma schema (PostgreSQL-ready)
- Deployed on Vercel

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Branches

- `main` — production, deployed to anyfreebook.com
- `dev` — active development; merge to `main` when stable

## Legal

Every book links to its original, legal, open-access source. ANYFREEBOOK hosts no copyrighted files — it aggregates and links.
