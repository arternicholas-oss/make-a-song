# Publish Guide — Make a Song About You (iOS + Android)

This is the end-to-end map. It's written so Agent Hands can execute as much as possible; anything Agent Hands can't do is marked **`HUMAN:`** and mirrored in `Daemon_Manual_Tasks_Log.docx`.

---

## 0. Prerequisites (one-time)

### 0.1 Dev accounts
- **`HUMAN:`** Enroll in Apple Developer Program — **$99/year** — https://developer.apple.com/programs/enroll/
  - Needs: Apple ID with 2FA, legal entity name, D-U-N-S number if filing as an LLC, payment method.
  - Approval: 24–48 hours typical.
- **`HUMAN:`** Create Google Play Console account — **$25 one-time** — https://play.google.com/console/signup
  - Needs: identity verification (government ID), payment method.
  - As of Nov 2023, new Play developer accounts must complete 14 days of closed testing with 12+ testers before promoting to Production. Plan this into the timeline.

### 0.2 Local tools (macOS required for iOS)
- Xcode 15.3+ (Mac App Store) — required for iOS build & upload
- CocoaPods (`sudo gem install cocoapods`) — Capacitor iOS depends on it
- Android Studio Hedgehog+ (https://developer.android.com/studio) — required for Android build
- Java 17 (ships with Android Studio)
- Node 20+ (already present for the Next.js site)

### 0.3 Assets to have on hand
- `public/icons/icon-512x512.png` ← already generated
- `icon-design.svg` (source of truth) ← already in repo
- Privacy policy page at `/privacy` ← **`HUMAN:`** verify it's live & lists Stripe, Supabase, Resend, PostHog, Anthropic
- Support page at `/support` with an email form ← **`HUMAN:`** verify it's live

---

## 1. Wrap the web app with Capacitor (Agent Hands can do this)

All of these commands run from `make-a-song/`.

```bash
# 1.1 Install Capacitor deps (already added to package.json — just install)
npm install

# 1.2 Generate the iOS Xcode project
npx cap add ios

# 1.3 Generate the Android Studio project
npx cap add android

# 1.4 Sync Capacitor config into both platforms
npx cap sync
```

After step 1.3 you will have `ios/App/App.xcworkspace` and `android/` at the repo root. Both should be committed to git.

### 1.5 Apply icon + splash to both platforms

We use `@capacitor/assets` to blast one source image across every iOS/Android size:

```bash
npm install --save-dev @capacitor/assets

mkdir -p assets
cp public/icons/icon-512x512.png assets/icon.png
cp public/icons/icon-512x512.png assets/icon-foreground.png   # TODO: replace with the inner logo only, no background
cp public/icons/icon-512x512.png assets/icon-background.png   # TODO: solid cream #FFF6E8 with no logo
# Splash: use a 2732x2732 PNG with the logo centered on #FFF6E8.
# Use `app-store/splash.png` (generated below) or design one in Figma.
cp app-store/splash.png assets/splash.png
cp app-store/splash.png assets/splash-dark.png

npx @capacitor/assets generate --iconBackgroundColor '#FFF6E8' --iconBackgroundColorDark '#FFF6E8' --splashBackgroundColor '#FFF6E8' --splashBackgroundColorDark '#FFF6E8'
```

### 1.6 Fill in the Universal Links / App Links association files

**iOS Universal Links** — requires the Apple Team ID:

- **`HUMAN:`** Once enrolled in Apple Developer, copy your 10-char Team ID from https://developer.apple.com/account (top-right of the page).
- Agent Hands: replace `__TEAMID__` in `public/.well-known/apple-app-site-association` with the real Team ID, commit, deploy.

**Android App Links** — requires the release keystore's SHA-256 fingerprint:

- Agent Hands can generate the keystore (step 3.1) and then run:
  ```bash
  keytool -list -v -keystore ~/.android-keystores/makeasong-release.jks -alias makeasong | grep SHA256
  ```
- Replace `__SHA256_PLACEHOLDER__` in `public/.well-known/assetlinks.json`, commit, deploy.

Verify association files serve as JSON (no redirects) by hitting:
- https://makeasongaboutyou.com/.well-known/apple-app-site-association
- https://makeasongaboutyou.com/.well-known/assetlinks.json

---

## 2. iOS build & upload

### 2.1 Bundle ID registration (Apple Developer portal)
- **`HUMAN:`** https://developer.apple.com/account/resources/identifiers/list
- "+" → App IDs → App → Description: `Make a Song About You`, Bundle ID: `com.makeasongaboutyou.app`
- Enable capabilities: **Associated Domains** (for Universal Links)

### 2.2 App Store Connect listing
- **`HUMAN:`** https://appstoreconnect.apple.com/apps → "+" → New App
- Platform: iOS, Name: `Make a Song About You`, Primary language: English (U.S.), Bundle ID: `com.makeasongaboutyou.app`, SKU: `makeasongaboutyou-ios-v1`, User Access: Full Access.
- After creation, paste every field from `APP_STORE_LISTING.md`.

### 2.3 Xcode project config
Open `ios/App/App.xcworkspace`. In the "App" target → Signing & Capabilities:
- **`HUMAN:`** Team: select your Apple Developer team
- Bundle Identifier: `com.makeasongaboutyou.app`
- + Capability → **Associated Domains** → add `applinks:makeasongaboutyou.com` and `webcredentials:makeasongaboutyou.com`
- Info tab → URL Types → + → URL Schemes: `makeasong`
- Deployment Info → iOS 14.0+, Orientation: Portrait only (unlock if iPad support is desired)
- Under Info.plist, add the keys Capacitor expects (these are auto-added by `cap add ios`, but verify):
  - `NSCameraUsageDescription` → "Make a Song About You doesn't use the camera." (only add if you plan to support photo attachments)
  - `NSMicrophoneUsageDescription` → leave unset unless adding voice input later

### 2.4 Archive & upload
```bash
cd ios/App
pod install
open App.xcworkspace
```
In Xcode: Product → Scheme → "App" → Edit Scheme → Run → Build Configuration: **Release**. Then:
- Product → Destination → Any iOS Device (arm64)
- Product → Archive
- In Organizer: **Distribute App** → **App Store Connect** → **Upload** → follow prompts

**`HUMAN:`** Xcode's code-signing step is fully interactive and uses your login keychain. Agent Hands cannot drive this yet — see manual task log.

### 2.5 TestFlight → Production
- In App Store Connect, under TestFlight, add yourself as an internal tester and install the build on your iPhone.
- Verify: payment round-trip, deep link from an email, splash screen, status bar color.
- Once good: Version tab → "Add for Review" → Submit.

**Review timeline:** 24–48 hours typical, up to 7 days for first submissions.

---

## 3. Android build & upload

### 3.1 Generate the release keystore (do this ONCE, back it up somewhere you won't lose it — if you lose it, you lose the ability to update the app)
```bash
mkdir -p ~/.android-keystores
keytool -genkey -v \
  -keystore ~/.android-keystores/makeasong-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias makeasong
```
Save the keystore file, the keystore password, and the key password into 1Password.

### 3.2 Configure Gradle signing
Create `android/key.properties` (git-ignored):
```
storePassword=...
keyPassword=...
keyAlias=makeasong
storeFile=/Users/nick/.android-keystores/makeasong-release.jks
```
Edit `android/app/build.gradle` to load it — the Capacitor docs have the exact signingConfigs snippet: https://capacitorjs.com/docs/android/deploying-to-google-play

### 3.3 Build release AAB
```bash
cd android
./gradlew bundleRelease
# Output at android/app/build/outputs/bundle/release/app-release.aab
```

### 3.4 Create the Play Console listing
- **`HUMAN:`** https://play.google.com/console → Create app
- App name: `Make a Song About You`
- Default language: English (United States)
- App or game: App
- Free or paid: Free (external web payment — tier does not trigger Play billing)
- Declarations: confirm Play policies, US export laws, Developer Program Policies

### 3.5 Internal testing → Closed testing → Production
- Internal testing → Upload `app-release.aab` → add testers by email
- **`HUMAN:`** As of Nov 2023, NEW personal Play developer accounts must complete a **closed test with 12+ testers for 14+ days** before the "Production" track unlocks. Plan around this. (Business accounts are exempt.)
- After closed test: Promote release → Production → Submit for review.

**Review timeline:** 3–7 days for first submission, a few hours for updates.

---

## 4. Screenshots (both stores)

Generate from the production site with the Playwright script at `app-store/screenshots/generate.mjs`. See that folder's README.

**`HUMAN:`** Framing screenshots in Apple's & Google's marketing templates (from https://developer.apple.com/design/resources/ and https://developer.android.com/distribute/marketing-tools) improves conversion ~20%. Use Figma or https://screenshots.pro.

---

## 5. Post-submission

- Set up App Store Connect **Users and Access** → add `arternicholas@gmail.com` as Admin (already your Apple ID, but confirm role).
- Set up **App Store Connect API Key** → Keys → App Store Connect API → Generate → download `.p8` file. Required for Fastlane / Agent Hands automation in the future.
- Set up **Play Console Service Account** (https://play.google.com/console → Setup → API access) → required for Agent Hands to automate future releases.

---

## 6. Future release flow (once both apps are live)

Because we use Capacitor with `server.url` pointing at the live site, **99% of updates require NO store resubmission** — they're just Vercel deploys.

You only re-submit to the stores when you change:
- Native permissions (NSCameraUsageDescription etc.)
- App name, icon, or splash
- Bundle ID (never)
- Minimum OS version
- Capacitor or plugin versions

For those changes, run `npx cap sync && npx cap open ios` (or `android`) and re-archive/upload.
