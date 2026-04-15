#!/bin/bash
# push-ffmpeg-next14.command — move serverExternalPackages +
# outputFileTracingIncludes under experimental.* for Next.js 14.2.5.
# The top-level keys are Next 15 syntax and are silently ignored on 14.x,
# which is how the ffmpeg ENOENT regression slipped back in.
set -e
cd "$(dirname "$0")"

echo ""
echo "============================================================"
echo "  push-ffmpeg-next14.command"
echo "============================================================"
echo ""

rm -f .git/index.lock

echo "→ git add"
git add next.config.js push-ffmpeg-next14.command

if git diff --cached --quiet; then
  echo "  (nothing staged — exiting)"
  exit 0
fi

echo "→ git commit"
git commit -m "ffmpeg: move bundling config under experimental.* for Next 14.2.5

Config (next.config.js):
  PostHog telemetry surfaced 'spawn /var/task/.next/server/chunks/ffmpeg
  ENOENT' on this evening's preview attempts — the same error the
  earlier 073eb25 commit was supposed to have fixed. Lyria itself
  succeeded (instrumental fallback returned audio in ~30s), then the
  20s clip step blew up because ffmpeg-static's binary is still being
  inlined as a JS chunk by Next.js's tracer.

  Root cause: 073eb25 used the top-level keys serverExternalPackages
  and outputFileTracingIncludes, which are Next.js 15 syntax. We're on
  14.2.5, where those keys are silently ignored — no warning, no
  build-time hint, just config that does nothing. The equivalent in
  14.x lives under experimental.*:

    experimental.serverComponentsExternalPackages
    experimental.outputFileTracingIncludes

  Moved both keys under experimental and left a pointer-comment so the
  next person upgrading to Next 15 knows to flatten them back out.

  Once this lands, the preview path becomes:
    Lyria (lyrics or instrumental) -> ffmpeg clip -> 20s MP3 -> uploaded
    to previews-audio bucket -> client plays the teaser.
  has_audio should flip from false to true on the next attempt."

echo "→ git push origin main"
git push origin main 2>&1 | tail -5

echo ""
echo "  Webhook should auto-deploy. ~60-90s to ready."
echo ""

read -n 1 -s -r -p "Press any key to close..."
echo ""
