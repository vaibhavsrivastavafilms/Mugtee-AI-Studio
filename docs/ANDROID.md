# Mugtee AI Studio — Android (Capacitor)

Mugtee ships as a **PWA + Capacitor WebView wrapper**, not a native rewrite. The Android app loads the production site:

**`https://mugtee.in`** (SSR on Vercel, APIs unchanged).

## Why URL mode (not static `out/`)

| Approach                             | Pros                                                         | Cons                                        |
| ------------------------------------ | ------------------------------------------------------------ | ------------------------------------------- |
| **server.url → mugtee.in** (default) | No static export rewrite; instant web deploys; full API/auth | Requires network for first load             |
| `next export` → `webDir: out`        | Offline-first shell                                          | Breaks SSR, dynamic routes, many API routes |

`capacitor.config.ts` uses **`server.url`** — `webDir: 'out'` is only a CLI placeholder.

## App identity

| Field            | Value                   |
| ---------------- | ----------------------- |
| App ID           | `com.mugtee.studio`     |
| App name         | Mugtee                  |
| Deep link scheme | `https` (androidScheme) |
| Production URL   | `https://mugtee.in`     |

## One-time setup (local machine with Android Studio)

```bash
yarn install
npx cap add android    # creates android/ if missing
npx cap sync
npx cap open android
```

Override the WebView URL for staging:

```bash
set CAPACITOR_SERVER_URL=https://your-preview.vercel.app
npx cap sync
```

## Build release APK / AAB

1. Open Android Studio via `npx cap open android`.
2. Configure signing (upload key + Play App Signing recommended).
3. Build → Generate Signed Bundle / APK.
4. Upload AAB to Play Console.

## Digital Asset Links (TWA alternative)

If you use **Bubblewrap TWA** instead of Capacitor, see `docs/PLAY_STORE_DEPLOYMENT.md` and update
`public/.well-known/assetlinks.json` with your signing certificate SHA-256.

## Push notifications (stub)

FCM is **not wired** in Phase 3. See `lib/capacitor/push-notifications-readiness.ts` and
`@capacitor/push-notifications` in `package.json` for the integration checklist.

## PWA install (no store)

Android Chrome users can install from the site via `beforeinstallprompt` — see
`components/pwa/install-mugtee-banner.tsx`.
