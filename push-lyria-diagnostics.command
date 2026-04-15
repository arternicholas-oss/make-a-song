#!/bin/bash
# push-lyria-diagnostics.command — embed promptFeedback + raw response head
# into the Lyria error message so PostHog tells us WHY Lyria returned no
# candidates (safety filter? quota? model issue?).
set -e
cd "$(dirname "$0")"

echo ""
echo "============================================================"
echo "  push-lyria-diagnostics.command"
echo "============================================================"
echo ""

rm -f .git/index.lock

echo "→ git add"
git add src/lib/lyria.ts push-lyria-diagnostics.command

if git diff --cached --quiet; then
  echo "  (nothing staged — exiting)"
  exit 0
fi

echo "→ git commit"
git commit -m "Lyria: surface promptFeedback + raw response on no-candidates error

Backend (src/lib/lyria.ts):
  ffmpeg fix landed and confirmed working — error moved from 'spawn ffmpeg
  ENOENT' (audio-clip stage) to 'No response candidates returned from
  Lyria API' (audio-gen stage). Lyria now returns an empty response in
  ~10s instead of generating for 41s, which means the API is rejecting
  the prompt before generation.

  Most likely cause: safety filter blocking the lyrics prompt. To confirm,
  embed promptFeedback (which carries blockReason + safetyRatings) and
  the first 600 chars of the raw response into the thrown error message.
  The existing PostHog stage='lyria' telemetry will then capture it in
  the error property — Vercel runtime logs truncate at ~30 chars so
  console.error alone is unreadable.

  Also handle the case where a candidate exists but has no content parts
  (finishReason=SAFETY/RECITATION + empty content) — surface finishReason
  and safetyRatings the same way.

  Pure observability change. Once we see the blockReason we can decide
  whether to: (a) sanitize the lyrics prompt, (b) switch model, or (c)
  add safetySettings overrides to the request."

echo "→ git push origin main"
git push origin main 2>&1 | tail -5

echo ""
echo "  Webhook should auto-deploy. ~60-90s to ready."
echo ""

read -n 1 -s -r -p "Press any key to close..."
echo ""
