# Google Play Store listing assets

Everything in this folder is ready to upload in Play Console.

| File | Requirement | Status |
|---|---|---|
| `feature-graphic-1024x500.png` | 1024×500 PNG, no alpha | ✅ ready |
| `screenshots/01-home.png` | Phone screenshot, 1080×1920 (9:16) | ✅ ready |
| `screenshots/02-search.png` | Phone screenshot, 1080×1920 | ✅ ready |
| `screenshots/03-results.png` | Phone screenshot, 1080×1920 | ✅ ready |
| `screenshots/04-book.png` | Phone screenshot, 1080×1920 | ✅ ready |
| `screenshots/05-classrooms.png` | Phone screenshot, 1080×1920 | ✅ ready |

Play accepts 2–8 phone screenshots; five are supplied. Add more from
`/explore`, `/creators` and `/audiobooks` if you want to reach the maximum.

## App icon

`public/icon-512.png` is the 512×512 store icon (rounded tile).
`public/icon-maskable-512.png` is the Android adaptive variant.
`public/apple-touch-icon.png` is the iOS home-screen icon.
`public/favicon.ico` is the browser tab icon.

Regenerate all of them with:

```
npm install --no-save sharp
node scripts/generate-icons.mjs
```

## Feature graphic

```
npm install --no-save sharp
node scripts/generate-feature-graphic.mjs
```

## Still required before submitting

1. **Digital Asset Links** — `https://anyfreebook.com/.well-known/assetlinks.json`
   must contain the SHA-256 fingerprint of the **Play App Signing** certificate.
   Generate it with `node scripts/make-assetlinks.mjs com.anyfreebook.app <fingerprint>`
   once the AAB is uploaded to Play Console.
2. **Privacy policy URL** — `https://anyfreebook.com/privacy` is live and already
   names AdSense, Vercel Analytics and local storage. Match the Data safety
   form to it exactly.
3. **Content rating questionnaire** and the **target audience** declaration.
   Declare 13+ — the app has no child-directed features, and AdSense
   advertising is not permitted in child-directed apps.
4. **App name / short description** — use the canonical claim:
   "240+ curated free books plus live results from 7 open-access sources".
