# ANYFREEBOOK — Android App Bundle (Trusted Web Activity)

The Google Play listing for ANYFREEBOOK is a **Trusted Web Activity**: a thin
Android shell that loads `https://anyfreebook.com` inside Chrome's WebView.
There is no duplicated app code — the live website *is* the app.

- Package: `com.anyfreebook.app`
- Host: `anyfreebook.com` (full scope — every route stays inside the app)
- targetSdk 36, minSdk 21
- The TWA manifest lives in `twa-manifest.json`.

## Toolchain (installed on drive D)

| Tool | Path |
| --- | --- |
| JDK 17 (Temurin 17.0.20.1) | `D:\Android\jdk17\jdk-17.0.20.1+1` |
| Android SDK | `D:\Android\sdk` (platform-tools, `platforms;android-36`, `build-tools;36.1.0`) |
| Bubblewrap CLI | `twa\node_modules\.bin\bubblewrap.cmd` |
| Gradle cache | `D:\Android\gradle-home` |

Bubblewrap reads `~/.bubblewrap/config.json`, which points it at both of the
above. Because the drive D install is self-contained, nothing was written to
`C:\Program Files` and no system `PATH` was changed.

## The upload key

```
Keystore : D:\Android\keys\anyfreebook-upload.jks
Alias    : upload
Password : see D:\Android\keys\anyfreebook-upload-credentials.txt
```

**Keep this file.** If you lose the upload key you cannot ship an update to an
existing Play listing — Play will ask for it to prove you own the app. The
keystore lives outside the git repo on purpose and is gitignored here as well.

This is the **upload key**. Google Play re-signs the app with its own
**app-signing key** before delivery, so the fingerprint that the device trusts
is the Play one — see the Digital Asset Links step below.

## Build

```powershell
.\twa\build.ps1
```

Output: `twa\app-release-bundle.aab` (plus `twa\app-release-signed.apk` for
sideload testing on a device).

To change anything in the app — name, colours, icon, scope — edit
`twa-manifest.json`, then re-run:

```powershell
cd twa
npx bubblewrap update --manifest twa-manifest.json
```

`update` regenerates the Android project and bumps `appVersionCode`.

## Digital Asset Links (required before the app will open your site)

Play only shows the TWA instead of a browser when the domain is verified.
That needs `https://anyfreebook.com/.well-known/assetlinks.json` containing the
**Play App Signing** SHA-256 fingerprint.

1. Upload the `.aab` to the Play Console.
2. Wait for Play App Signing to provision the app-signing key
   (Test and release → Testing → App integrity → App signing key → SHA-256).
3. Generate the file:

   ```bash
   node scripts/make-assetlinks.mjs com.anyfreebook.app <SHA256:...>
   ```

   The script uppercases the fingerprints. Google's Digital Asset Links
   validator parses them with the same pattern Bubblewrap uses —
   `/^([0-9A-F]{2}:){31}[0-9A-F]{2}$/` — and rejects a lowercase fingerprint
   as "malformed cert fingerprint" even though the bytes are identical.
   Verify with:

   ```
   https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://anyfreebook.com
   ```

   It should return a statement for `com.anyfreebook.app` and no error.

4. Commit it, deploy, then confirm at:

   ```
   https://digitalassetlinks.googleapis.com/v1/statements:list?source.web.site=https://anyfreebook.com&source.android.app_id=com.anyfreebook.app
   ```

5. In the Play Console: Release → Setup → App integrity → turn on
   **Digital Asset Links verification**.

Until step 3 the app opens in a Custom Tab instead of the app shell, which
still works but looks like a browser.

## Play Console account

This listing is on a **personal developer account**. Two consequences:

- No D-U-N-S number is needed.
- Google requires **12 testers opted into the closed testing track for 14
  continuous days** before the app can be published. Start that clock as soon
  as the first `.aab` is uploaded — the 14 days cannot be shortened.
