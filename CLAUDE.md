# ANYFREEBOOK — project context

Free book aggregator + creator/publishing platform. Live at https://anyfreebook.com.

## Stack

- **Next.js 14 App Router** + TypeScript + Tailwind. `src/app` routes, `src/components`, `src/lib`.
- **Supabase** — Postgres + RLS + Storage + Realtime. Anon-key client (`src/lib/supabase/client.ts` / `server.ts`) and `createServiceClient()` for privileged server-side ops.
- **Vercel** for hosting. `vercel deploy --prod --yes`.
- No test suite. Verification = build + live curl checks.

## Product areas

1. **Aggregator** — live search across Open Library, Gutenberg, Internet Archive, Google Books, PubMed, DOAJ, LibriVox (`src/lib/api/*`). Plus ~240 hardcoded catalog books in `src/lib/data.ts` used for category/detail pages.
2. **Creators** — publish books/articles free, earn from verified reads. `src/lib/creators/`, `src/app/creators/`.
3. **Classrooms** — live WebRTC video classes (own implementation, not Jitsi/Daily). `src/lib/classrooms/`.
4. **Institutions** — schools/libraries with members, roles, study-plan assignment, org-branded publishing. `src/lib/institutions/`.
5. **Blog** — 38 posts in `src/lib/blogPosts.ts`, drives long-tail SEO.

## Hard-won conventions — read before changing things

- **Migrations are applied by hand.** No Supabase CLI link. Give the user the SQL to paste into the Supabase dashboard SQL editor. Only the app-level REST key is available here — raw DDL can't be executed from this environment.
- **Build check must use the exit code**, not log grepping:
  `node node_modules/next/dist/bin/next build > /tmp/b.log 2>&1; echo "EXIT: $?"`
- **Deploys take 5–20 minutes.** 334 static pages, many hitting external book APIs (which rate-limit). A deploy sitting at "Building" for 15 min is normal, not stuck — check `vercel inspect <url> --logs` for page-generation progress before assuming failure.
- **Never add `loading.tsx` to a route segment whose pages call `notFound()`.** Next streams a 200 shell before `notFound()` resolves, turning real 404s into soft-404s and wrecking SEO. This was a live bug on `/read`, `/category`, `/institutions` — fixed by deleting those files. `/classrooms` keeps its `loading.tsx` because nothing under it calls `notFound()`.
- **`catch {}` (silent failure) is the established pattern** across ~14 files. Don't convert wholesale; `error.tsx` boundaries are the safety net on top.
- **Design primitives:** `cardClass()` / `primaryButtonClass()` in `src/lib/ui.ts`, `Skeleton` and `Sparkline` in `src/components/ui/`. Use these instead of re-inventing border/hover/radius strings. Theming is CSS variables (`--surface`, `--text`, `--primary`, `--radius-lg`, …) set by `src/lib/themes.ts`.

## Legal / integrity rules — do not regress these

The local catalog in `data.ts` contains many **in-copyright, commercially sold** books (Clean Code, CLRS, Campbell Biology, …). The site must never claim these are free downloads.

- `resolveBookSource()` (`src/lib/api/resolveSource.ts`) returns a **tier**: `download` (verified public-domain full text, author-matched), `borrow` (real Internet Archive copy, confirmed lending-restricted via their metadata API), or `unverified`.
- `src/app/book/[slug]/page.tsx` renders the badge, page title, and meta description **from that tier**. Only `download` gets the green "100% legal, open-access" claim.
- When tier ≠ `download`, the page offers a genuinely free alternative instead — `src/lib/freeAlternatives.ts` maps every category to a real open resource (OpenStax, MIT OCW, Project Gutenberg, Cornell LII, …), with per-title blog-post matches taking priority.
- **Never source, host, or link pirated copies of in-copyright books.** The whole point of the tier system is honesty about what's actually free.

## Environment

Set in Vercel (production): `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_ADSENSE_CLIENT_ID`, `NEXT_PUBLIC_ADSENSE_SLOT_{BOOK,SEARCH,CATEGORY,BLOG}`, `CLOUDCONVERT_API_KEY` (needs `task.read`+`task.write` scopes), Gemini + TURN credentials.

AdSense: publisher ID live, ads.txt authorized, 4 ad units created and serving real tags. Site approval status is still **"Getting ready"** — pending Google's review, nothing further to configure.
