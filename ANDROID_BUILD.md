# Royal Broiler — Android (Capacitor Hybrid Shell)

The Android app is a thin native wrapper that loads the published web app at
`https://royal-poultry-pro.lovable.app`. UI, backend, auth, and business logic
are 100% identical to the website — nothing is re-implemented.

## One-time setup on your machine

Requires: **Android Studio** (latest), **JDK 17+**, **Node/Bun**.

```bash
# 1. Clone the repo from GitHub (connect via Lovable → GitHub first)
git clone <your-repo-url>
cd <repo>
bun install

# 2. Add the native Android platform (creates ./android)
bunx cap add android

# 3. Sync web config → native project
bunx cap sync android
```

## Build a debug APK (for testing on your phone)

```bash
cd android
./gradlew assembleDebug
# APK: android/app/build/outputs/apk/debug/app-debug.apk
```

Transfer to your Android phone, enable "Install unknown apps", tap to install.

## Build a release AAB (for Play Store)

```bash
# 1. Generate a signing key (once, keep it safe!)
keytool -genkey -v -keystore royal-broiler.keystore \
  -alias royalbroiler -keyalg RSA -keysize 2048 -validity 10000

# 2. Add signing config to android/app/build.gradle (see Capacitor docs)

# 3. Build signed release bundle
cd android
./gradlew bundleRelease
# AAB: android/app/build/outputs/bundle/release/app-release.aab
```

Upload the `.aab` to Google Play Console.

## App icon & splash

Drop a 1024×1024 PNG at `resources/icon.png` and a 2732×2732 splash at
`resources/splash.png`, then:

```bash
bunx @capacitor/assets generate --android
bunx cap sync android
```

## Updating the app

- **UI/logic changes**: just publish the web app in Lovable — the installed
  Android app picks up changes instantly (it loads the hosted URL).
- **Native shell changes** (icon, splash, permissions, app name): rebuild
  the APK/AAB and push a new Play Store release.

## Notes

- `capacitor.config.ts` points `server.url` at the published Lovable URL.
  If you switch to a custom domain, update that URL and rebuild.
- The `android/` folder is generated; commit it once created so CI can build.
- Signing keys must NEVER be committed. Store them in a password manager.
