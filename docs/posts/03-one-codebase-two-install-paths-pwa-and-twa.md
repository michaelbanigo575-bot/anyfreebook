# One codebase, two install paths: shipping a PWA and an Android app from the same Next.js site

The Play build of ANYFREEBOOK is 1.2 MB. Almost none of that is the app. It is an Android shell around the website that already exists, and the interesting engineering is not in the shell — it is in the handshake that tells Android the shell is allowed to claim your domain.

## What a Trusted Web Activity actually is

A TWA is an Android activity that loads a URL inside a WebView with the browser chrome stripped away. There is no duplicated application code, no second build of the product, nothing to keep in sync. The Play listing for ANYFREEBOOK is exactly that: package `com.anyfreebook.app`, host `anyfreebook.com`, full scope so every route stays inside the app.

The package is built with Bubblewrap over the same Next.js site, and the numbers that matter are small: `minSdkVersion` 24, `targetSdk` 36, and a 1.2 MB app bundle. Compare that with shipping the same features natively — a second codebase, a second release train, and a version of the product that is always behind the website. The TWA gets you a Play listing, a launcher icon, and a native share sheet. Everything else is the website.

## Digital Asset Links is the actual handshake

Before Play will open your site in the app shell instead of a browser tab, something has to prove the domain owns the app. That proof is Digital Asset Links, and it has two halves that must agree:

1. A statement served from your domain at `/.well-known/assetlinks.json`.
2. An equivalent statement embedded in the installed app.

If either half is missing or the two disagree, the link degrades to a Custom Tab. The site still opens — inside a browser-chrome shell, which reads as "the app is broken" rather than "the app is being cautious".

Here is what we publish:

```json
[
  {
    "relation": [
      "delegate_permission/common.handle_all_urls"
    ],
    "target": {
      "namespace": "android_app",
      "package_name": "com.anyfreebook.app",
      "sha256_cert_fingerprints": [
        "A6:76:B1:D9:64:9E:4F:5A:34:4D:EB:06:9B:31:64:00:15:F4:6E:76:79:96:C6:FA:13:56:BE:FA:D6:F7:90:C2"
      ]
    }
  }
]
```

The `relation` is the part people skip. `delegate_permission/common.handle_all_urls` says "this app may handle every URL on this host" — broad delegation, rather than a list of individual paths. Scope it narrowly and only the paths you listed open in the app shell, with everything else falling back to the browser.

## The bug that cost me an afternoon: fingerprints are uppercase-only

The fingerprint above is uppercase, and that is not a style choice.

Google's Digital Asset Links validator parses certificate fingerprints with the same pattern Bubblewrap uses:

```
/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/
```

Look at the character class: `[0-9A-F]`. Uppercase only — there is no `a-f` in the range. A lowercase fingerprint, the same 32 bytes and the same certificate, is rejected as `malformed cert fingerprint`. The validator never gets as far as checking whether the fingerprint matches anything: it refuses to parse the shape.

The fix is one call to `.toUpperCase()`, but the reliable way to apply it is to make it impossible to forget. Our generator validates and normalises every fingerprint before writing the file:

```js
// scripts/make-assetlinks.mjs
const cleaned = fingerprints.map((f) => f.trim().replace(/^SHA256\s*/i, '').toUpperCase());

const invalid = cleaned.filter((f) => !/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f));
if (invalid.length > 0) {
  console.error('These do not look like SHA-256 fingerprints (expected 32 uppercase hex octets):');
  for (const f of invalid) console.error('  ' + f);
  process.exit(1);
}
```

The script accepts more than one fingerprint, and `replace(/^SHA256\s*/i, '')` handles the `SHA256=...` prefix some tools emit. Normalising at the point of writing, and failing loudly on a fingerprint that does not match the expected shape, turns a confusing validator error into a build-time message that says exactly what is wrong.

## Play App Signing: the fingerprint that matters is not the one you signed with

This is the part that costs people a release. You sign your upload bundle with your own upload key. Google Play then re-signs the app with its own Play App Signing key before delivering it. The device validates the certificate of the APK it actually installed — the Play app-signing certificate, not yours.

So publishing only your upload-key fingerprint means the domain proves it owns a key the installed app does not use. The link opens in a Custom Tab: the app launches, the site loads, and the whole thing looks like a slightly broken browser rather than an app.

The fix is to publish both fingerprints. The upload key's SHA-256 is what you already have locally; the Play app-signing key's SHA-256 lives in the Play Console under Test and release → Testing → App integrity → App signing key → SHA-256, and only exists after your first upload is processed.

```bash
node scripts/make-assetlinks.mjs com.anyfreebook.app <upload-fp> <play-signing-fp>
```

Then verify, rather than guessing. The Digital Asset Links API will tell you whether the domain and the app actually match:

```
https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https%3A%2F%2Fanyfreebook.com
```

The site parameter is enough — the response lists every app the domain is associated with. (Adding an `source.android.app_id` parameter to narrow it returns `400 Unknown name "source.android.app_id"`, so leave it off.)

A response containing a statement for `com.anyfreebook.app` and no error means the handshake holds. Getting the JSON to parse is not enough — that only proves the file is syntactically valid. The `statements:list` call proves the pairing is right.

There is one more switch in the Play Console: Release → Setup → App integrity → Digital Asset Links verification. Until it is on, the verification is advisory.

## The service worker is the same in both installs

The TWA does not have its own offline story. It loads your site, and your site's service worker does the work — the same `public/sw.js` that serves the PWA install.

That worker precaches a small set of shell assets, serves pages network-first with the cached copy as fallback, serves hashed static assets cache-first, and falls back to `/offline.html` when the network is gone:

```js
// public/sw.js
const CACHE_NAME = 'anyfreebook-v3';
const OFFLINE_FALLBACK = '/offline.html';
const PRECACHE = ['/', OFFLINE_FALLBACK, '/manifest.json', '/favicon.ico', /* ... */];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      // allSettled: one unreachable file must not abort the whole install.
      .then((cache) => Promise.allSettled(PRECACHE.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});
```

Two details there are about living inside an app shell rather than a browser tab. The worker returns error statuses untouched, so a genuine 404 stays a genuine 404 rather than being masked by a cached shell. And when an asset is unreachable offline, it returns a 1×1 transparent PNG with a 200 status instead of a failed request, because a failed subresource inside a TWA looks like a broken app in a way it never does in a tab.

## The Bubblewrap manifest, in essentials

The whole Android project is generated from one JSON file. The parts worth understanding:

```json
{
  "packageId": "com.anyfreebook.app",
  "host": "anyfreebook.com",
  "name": "ANYFREEBOOK",
  "display": "standalone",
  "startUrl": "/",
  "fullScopeUrl": "https://anyfreebook.com/",
  "minSdkVersion": 24,
  "appVersion": "1",
  "appVersionCode": 1,
  "fingerprints": [
    {
      "name": "upload",
      "value": "A6:76:B1:D9:64:9E:4F:5A:34:4D:EB:06:9B:31:64:00:15:F4:6E:76:79:96:C6:FA:13:56:BE:FA:D6:F7:90:C2"
    }
  ]
}
```

`packageId` and `host` are the identity of the app and the domain it claims. `fullScopeUrl` is what makes it a full-scope TWA rather than a partial one — every route under that origin stays inside the shell. `minSdkVersion` 24 and `targetSdk` 36 set the platform floor and the API level the app targets. Changing anything here means re-running `npx bubblewrap update --manifest twa-manifest.json`, which regenerates the project and bumps `appVersionCode`.

Note that the `fingerprints` array here carries the upload key. That is correct for Bubblewrap's own signing step, and it is *not* sufficient for Digital Asset Links — the file the domain serves needs the Play app-signing fingerprint too.

## The practical takeaway

A TWA is not an excuse to skip the PWA, because the PWA is what the TWA loads. The manifest, the service worker, the offline page and the icons all have to be right before the app shell has anything to show. If the service worker's cache-first rules are wrong, the wrong version of a page is what the app shows, offline and online alike.

Get the order right and the work is small: build the bundle, upload it, read the Play app-signing fingerprint out of the Play Console, publish it alongside the upload fingerprint in uppercase, verify with the `statements:list` endpoint, and turn on Digital Asset Links verification. Then the Play icon opens your website instead of a browser tab, and the app you have to maintain is still the one you already ship.
