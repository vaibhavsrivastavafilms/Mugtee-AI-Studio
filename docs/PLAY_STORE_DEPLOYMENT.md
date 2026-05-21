# Mugtee AI Studio — Android Play Store (TWA) Deployment Guide

This project ships as a **Trusted Web Activity (TWA)** wrapper around the existing
Next.js PWA. There is **no React Native, no Flutter, no separate Android codebase**
to maintain — the production website at `https://mugtee.in` IS the app.

---

## App Identity

| Field | Value |
|---|---|
| App Name | **Mugtee AI Studio** |
| Short Name | **Mugtee** |
| Package Name | **`com.mugtee.aistudio`** |
| Host | `https://mugtee.in` |
| Start URL | `/` |
| Display | `standalone` (no browser UI) |
| Orientation | `portrait` |
| Theme / BG | `#0B0B0B` |
| Manifest | `https://mugtee.in/manifest.json` |
| Asset Links | `https://mugtee.in/.well-known/assetlinks.json` |

---

## One-time Setup

### 1. Generate the Android TWA project with Bubblewrap

```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://mugtee.in/manifest.json
```

When prompted, accept these answers (others can stay default):

- Application Id: **`com.mugtee.aistudio`**
- Display mode: **`standalone`**
- Status bar color: **`#0B0B0B`**
- Splash screen color: **`#0B0B0B`**
- Icon URL: defaults from manifest (`/icons/icon-512.png`)
- Include shortcuts: **yes**

### 2. Build the signed AAB

```bash
bubblewrap build
```

Bubblewrap will create a release keystore the first time and print the SHA-256
fingerprint. **Copy that fingerprint.**

### 3. Wire Digital Asset Links (CRITICAL)

Without this, the TWA will fall back to a Chrome Custom Tab and show the URL bar.

Edit `public/.well-known/assetlinks.json` and replace the placeholder:

```json
"sha256_cert_fingerprints": [
  "AB:CD:EF:01:23:45:...:FF"
]
```

If you upload to Play Console with **Play App Signing** enabled (recommended),
you ALSO need the **App signing key certificate SHA-256** from:

> Play Console → Your app → Setup → App integrity → App signing key

Add both fingerprints to the array:

```json
"sha256_cert_fingerprints": [
  "<upload-key-sha256>",
  "<play-app-signing-sha256>"
]
```

Then redeploy `mugtee.in` so `https://mugtee.in/.well-known/assetlinks.json` is
live. Verify with:

```bash
curl https://mugtee.in/.well-known/assetlinks.json
```

Use Google's validator:
https://developers.google.com/digital-asset-links/tools/generator

### 4. Upload to Play Console

1. Create app → **Mugtee AI Studio**
2. Upload the `.aab` produced by Bubblewrap
3. Fill the data safety form (we collect: email, name, usage analytics via PostHog)
4. Set content rating
5. Provide these URLs:
   - **Privacy policy:** `https://mugtee.in/privacy`
   - **Terms of service:** `https://mugtee.in/terms`
6. Submit for review (typically 1–7 days)

---

## What's already wired (no action needed)

- ✅ Static `public/manifest.json` with required `id`, `start_url`, `scope`,
      `display`, `theme_color`, `background_color`, 192 + 512 + maskable icons
- ✅ `public/sw.js` service worker with offline shell
- ✅ `public/icons/` static PNGs (192, 512, maskable 512, apple-touch 180)
- ✅ `app/layout.tsx` mobile meta tags (`apple-mobile-web-app-capable`,
      `mobile-web-app-capable`, `msapplication-TileColor`)
- ✅ `viewport-fit=cover` so the app extends under the Android status bar
- ✅ `/privacy` and `/terms` routes (required by Play Store listing)
- ✅ `/offline` shell for connectivity drops
- ✅ Service worker bypasses `/api/*`, `/auth/*`, Supabase, PostHog —
      so OAuth and session persistence work identically to the web app

---

## Updating the App

For 99% of changes, you just redeploy `mugtee.in`. The TWA pulls fresh content
on every launch — **no Play Store re-submission required.**

You only need to ship a new `.aab` when:
- Changing the app icon, name, or splash screen
- Changing the package name or signing key
- Bumping minimum Android SDK
- Adding Android-native features (push notifications via FCM, billing, etc.)

---

## Verification Checklist (run on the deployed app)

```bash
# All must return 200
curl -I https://mugtee.in/manifest.json
curl -I https://mugtee.in/sw.js
curl -I https://mugtee.in/icons/icon-512.png
curl -I https://mugtee.in/.well-known/assetlinks.json
curl -I https://mugtee.in/privacy
curl -I https://mugtee.in/terms
curl -I https://mugtee.in/offline
```

Then open `https://mugtee.in` in Android Chrome:

1. Wait ~30s → "Install app" prompt appears OR menu → "Add to Home screen"
2. Install → open from launcher → **no browser address bar, no Chrome UI**
3. Sign in with Google → session persists across app restarts
4. Toggle airplane mode → see the `/offline` shell
