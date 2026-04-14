# Screenshots

## One-time setup
```bash
npm install --save-dev playwright
npx playwright install chromium
```

## Generate
```bash
node app-store/screenshots/generate.mjs
# or against a local dev server:
SCREENSHOT_BASE_URL=http://localhost:3000 node app-store/screenshots/generate.mjs
```

Output goes to `app-store/screenshots/out/` with one folder per device size. Each folder contains 5 numbered PNGs ready to upload to App Store Connect or Play Console.

## Framing (optional but recommended)
Raw device screenshots convert at roughly half the rate of framed marketing shots. Drop the PNGs into one of these templates:
- Apple marketing templates: https://developer.apple.com/design/resources/
- Google Play feature graphic template: https://developer.android.com/distribute/marketing-tools
- Or use https://screenshots.pro (paid) for automated framing with captions.

## Known issue
The `/song/demo-example-id?preview=1` route requires a seeded demo song in Supabase. Run `scripts/seed-demo-song.ts` first if the route 404s. (TODO — not yet written; manual task logged for Daemon.)
