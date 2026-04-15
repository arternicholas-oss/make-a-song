#!/bin/bash
# push-lyria-telemetry.command — capture Lyria failures to PostHog
# so we can debug "preview generated but no audio" without fighting
# Vercel's truncated runtime log viewer.
set -e
cd "$(dirname "$0")"

echo ""
echo "============================================================"
echo "  push-lyria-telemetry.command"
echo "============================================================"
echo ""

rm -f .git/index.lock

echo "→ git add"
git add src/app/api/preview/generate/route.ts push-lyria-telemetry.command

if git diff --cached --quiet; then
  echo "  (nothing staged — exiting)"
  exit 0
fi

echo "→ git commit"
git commit -m "Preview: capture Lyria failures to PostHog for debuggability

Backend (src/app/api/preview/generate/route.ts):
  Lyria audio gen failed silently for prv_rmd3o2si7i — preview shipped
  with lyrics only, has_audio=false. Vercel runtime logs truncate at
  ~30 chars per line, so [preview] music generation error is unreadable
  through tooling. PostHog event properties are not truncated, so
  capture the actual Error.message + stack + gemini_key_set flag there
  alongside the existing PREVIEW_GENERATION_FAILED event. Tag with
  stage='lyria' and fatal=false so dashboards can distinguish full
  failures (which break the response) from audio-only degradations
  (which still ship a preview, just lyrics-only).

  Non-behavioral change for users — purely observability."

echo "→ git push origin main"
git push origin main 2>&1 | tail -5

echo ""
echo "  Webhook should auto-deploy. ~60s to ready."
echo ""

read -n 1 -s -r -p "Press any key to close..."
echo ""
