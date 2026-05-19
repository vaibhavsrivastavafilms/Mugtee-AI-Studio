# ViralForgeAI — Play Store Build & Release Guide

This app ships to Android as a thin **Capacitor WebView wrapper** that loads the
live Next.js deployment. Updates happen via web deploys — no Play Store
re-submission is required for content/feature changes.

## 1. Prerequisites (one-time, local)

- Node.js 18+ and Yarn
- Java JDK 17
- Android Studio (latest stable) with:
  - Android SDK Platform 34 (or higher)
  - Android SDK Build-Tools
  - Android SDK Command-line Tools
- Set `ANDROID_HOME` environment variable

## 2. Install Capacitor (LOCAL only — not in dev container)

```bash
yarn add @capacitor/core @capacitor/android
yarn add -D @capacitor/cli
```

## 3. Generate the Android project

From the repo root:

```bash
npx cap add android         # creates the /android folder using capacitor.config.ts
npx cap sync android        # copies web assets + plugins
```

This creates a complete Android Studio project under `./android/`.

## 4. Replace icons & splash

Generate Android-ready assets (uses `@capacitor/assets`):

```bash
yarn add -D @capacitor/assets
# Create source assets: ./resources/icon.png (1024x1024) and ./resources/splash.png (2732x2732)
npx capacitor-assets generate --android
```

The gold `V` mark from `app/apple-icon.tsx` can be screenshotted at 1024×1024 and used as `resources/icon.png`. Splash should be a dark gradient with the centered gold V.

## 5. Sign + build the release bundle

Create a signing key once:

```bash
keytool -genkey -v -keystore viralforge-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias viralforge
```

Add to `android/keystore.properties` (gitignored):

```
storePassword=YOUR_STORE_PWD
keyPassword=YOUR_KEY_PWD
keyAlias=viralforge
storeFile=../viralforge-release.jks
```

Then edit `android/app/build.gradle` to reference these via `signingConfigs`.

Build the AAB:

```bash
cd android
./gradlew bundleRelease
# Output: android/app/build/outputs/bundle/release/app-release.aab
```

## 6. Play Console submission checklist

- [ ] App name: **ViralForgeAI**
- [ ] Short description (≤ 80 chars): **AI Production OS for Creators. Plan, script, schedule, ship viral content.**
- [ ] Full description (4000 chars max): see below
- [ ] Category: **Productivity** (secondary: **Business**)
- [ ] Content rating: **Everyone** (no UGC, no in-app camera, no chat)
- [ ] Privacy policy URL: `https://mugtee.in/privacy`
- [ ] App icon: 512×512 PNG (export from `/apple-icon` route at 512px)
- [ ] Feature graphic: 1024×500 PNG (export from `/opengraph-image` route, cropped)
- [ ] Phone screenshots: 2–8 at min 320px, max 3840px. Capture: Dashboard, Pipeline, AI Studio dialog, Script workspace, Pricing.
- [ ] Data safety form: collects email (sign-in), no location, no advertising IDs
- [ ] Target API level: **34+** (Capacitor 6 defaults to 34)
- [ ] Permissions used: `INTERNET` only (Capacitor default)

### Full description template

> **ViralForgeAI is the AI Production OS for creators, agencies, and brands.**
>
> Plan, script, schedule, and ship viral content — all from one cinematic workspace.
>
> ✨ **AI Idea Engine** — Generate niche-native viral hooks in seconds.
> ✏️ **AI Script Studio** — Write cinematic shot-by-shot scripts.
> 📅 **Weekly Planner** — A balanced 7-day strategy in one click.
> 📊 **Pattern Analysis** — Score hook, pacing, retention.
> 🧠 **Faceless Intelligence** — Decode the storytelling DNA of viral formats.
> ⚡ **Workflow Automation** — Pipeline + scheduling + cross-platform publishing.
>
> Built for YouTube, Instagram, TikTok, LinkedIn, and more.

## 7. Updating after launch

- **Content / feature updates**: deploy the web app. The WebView reloads on next launch — zero Play Store work.
- **Native shell updates** (icon, splash, permissions, plugins): bump `versionCode` in `android/app/build.gradle`, run `./gradlew bundleRelease`, upload new AAB.

## 8. Internal testing track (recommended first)

Play Console → Testing → Internal testing → Create release → Upload AAB → Add testers by email → Share opt-in URL.

Iterate here for 1–2 weeks before promoting to Production.
