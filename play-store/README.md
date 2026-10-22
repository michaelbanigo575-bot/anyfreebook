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

## The app bundle

The `.aab` is already built and signed:

```
D:\ANYFREEBOOK\twa\app-release-bundle.aab     1.2 MB
```

`com.anyfreebook.app`, versionCode 1, minSdk 24, targetSdk 36 — a Trusted Web
Activity over `https://anyfreebook.com`. Rebuild it with `.\twa\build.ps1`;
see `twa/README.md` for the toolchain and keystore details.

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

1. **Upload the `.aab`** to Play Console → App bundle. The package name is
   `com.anyfreebook.app`.
2. **Digital Asset Links** — `https://anyfreebook.com/.well-known/assetlinks.json`
   is published with the **upload key** fingerprint. Play re-signs the app with
   its own **Play App Signing** certificate, so that fingerprint must be added
   too:
   ```
   node scripts/make-assetlinks.mjs com.anyfreebook.app <upload-fp> <play-signing-fp>
   ```
   Find the Play one in Play Console under
   Test and release → Testing → App integrity → App signing key → SHA-256.
   Then turn on Release → Setup → App integrity → Digital Asset Links verification.
   Until this is done the app opens in a Custom Tab rather than the app shell.
3. **Privacy policy URL** — `https://anyfreebook.com/privacy` is live and already
   names AdSense, Vercel Analytics and local storage. Match the Data safety
   form to it exactly.
4. **Content rating questionnaire** and the **target audience** declaration.
   Declare 13+ — the app has no child-directed features, and AdSense
   advertising is not permitted in child-directed apps.
5. **App name / short description** — use the canonical claim:
   "240+ curated free books plus live results from 7 open-access sources".
6. **Personal developer account** — Google requires 12 testers on the closed
   testing track for 14 continuous days before publishing. Start the clock as
   soon as the first `.aab` is uploaded; the 14 days cannot be shortened.
   Developer verification (government ID) and the $25 fee are also required.
