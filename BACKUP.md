# ANYFREEBOOK — Disaster Recovery Runbook

**Read this first if your PC died, was stolen, or was wiped.**

Last verified: 18 October 2026 · commit `1d94dee` · production https://anyfreebook.com

---

## TL;DR

| Asset | Where it lives | Can you recover it? |
|---|---|---|
| Source code | GitHub `michaelbanigo575-bot/anyfreebook` | ✅ `git clone` |
| Database | Supabase cloud | ✅ automatic |
| Deploys | Vercel (Git integration) | ✅ automatic on push |
| **Secrets / API keys** | **This PC only** | ⚠️ **run `backup-secrets.ps1` NOW** |
| Supabase SQL migrations | GitHub, `supabase/migrations/` | ✅ |
| Agent handoff guide | GitHub, `ANYFREEBOOK-Agent-Handoff-Guide.docx` | ✅ |

The single point of failure is the **secrets**. Everything else is on someone else's servers already.

---

## 1. Get the code back

```powershell
git clone https://github.com/michaelbanigo575-bot/anyfreebook.git
cd anyfreebook
npm install
```

Public repo — no authentication needed to read it.

## 2. Get your secrets back

You encrypted them with:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\backup-secrets.ps1
```

which produced `anyfreebook-secrets.enc` and a passphrase **only you know**.

```powershell
powershell -ExecutionPolicy Bypass -File scripts\restore-secrets.ps1
Copy-Item scripts\_restored\.env.local .env.local -Force
Remove-Item scripts\_restored -Recurse -Force   # it holds plaintext secrets
```

Then `npm run dev` works, and you can deploy.

**If you did not run `backup-secrets.ps1` before losing the PC**, the keys are gone. Recover what you can:

1. **Vercel** — Dashboard → anyfreebook → Settings → Environment Variables. Every production variable is still there. Copy them all into a fresh `.env.local`. (This is the most complete source and survives independently.)
2. **Supabase** — Dashboard → project `ichmkzwjaftteyzrbwji` → Settings → API. Regenerate `SUPABASE_SERVICE_ROLE_KEY` (the old one is lost forever).
3. **Gemini** — aistudio.google.com → API keys → create new.
4. **Google Books** — Google Cloud console → enable the API → create a key.
5. **NEXTAUTH_SECRET** — just generate a new random one; no data depends on the old value.

## 3. Redeploy

Vercel's Git integration is connected: **push to `main` and it deploys.** No CLI login needed.

```powershell
git push origin main
```

Build takes 5–20 minutes. Watch it on the Vercel dashboard.

## 4. Database

Nothing to restore unless something corrupted recently. Supabase takes automatic daily backups on the free tier (7-day retention).

The schema is fully reconstructable from `supabase/migrations/001` … `011` — run them in order in the SQL editor on a fresh project.

---

## Things that are NOT backed up (and why)

- **`.next/` and `node_modules/`** — build output and dependencies. Both regenerate from `npm install` / `npm run build`. Never back these up.
- **`build-verify.log`** — transient build output, deleted after each verification.
- **`relocate-phone-media.ps1`** — a personal phone-media migration script that was sitting uncommitted in the project root. It is **not** part of the website and was deliberately not committed, because it contains your personal file paths. Move it somewhere safe yourself.
- **The old Supabase `publication_reads` rows** — engagement history. Only retained by Supabase's 7-day backup window. If it matters, export to CSV before it ages out.

---

## If your GitHub account is also gone

The repo is public, so the code is safe regardless. To regain write access you need the `michaelbanigo575-bot` account credentials or a new PAT — those live in your OS keyring on this PC and are gone with it.

---

## Routine — do this monthly

1. `powershell -ExecutionPolicy Bypass -File scripts\backup-secrets.ps1` (re-encrypt; it picks up any new keys)
2. Move `anyfreebook-secrets.enc` to your password manager / encrypted drive / private repo
3. Confirm Vercel's environment variables match `.env.local` — drift here is the silent killer