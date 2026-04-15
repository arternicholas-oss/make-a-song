#!/bin/bash
# push-ffmpeg-fix.command — bundle ffmpeg binary into the preview/generate
# serverless function so audio clipping actually works on Vercel.
set -e
cd "$(dirname "$0")"

echo ""
echo "============================================================"
echo "  push-ffmpeg-fix.command"
echo "============================================================"
echo ""

rm -f .git/index.lock

echo "→ git add"
git add next.config.js push-ffmpeg-fix.command

if git diff --cached --quiet; then
  echo "  (nothing staged — exiting)"
  exit 0
fi

echo "→ git commit"
git commit -m "Audio: bundle ffmpeg binary into preview/generate function

Config (next.config.js):
  Lyria gen worked end-to-end (~42s response with full audio), but the
  20s clip step blew up with 'spawn /var/task/.next/server/chunks/ffmpeg
  ENOENT'. Caught only because we just added stage='lyria' PostHog
  telemetry — Vercel runtime logs truncate at ~30 chars per line so the
  error was effectively invisible before that.

  Root cause: Next.js was inlining ffmpeg-static into a server JS chunk,
  which strips the actual binary. Two-part fix:

    1. serverExternalPackages: ['fluent-ffmpeg', 'ffmpeg-static']
       Keeps them as runtime requires so the package's binary-path
       resolver still works at runtime.

    2. outputFileTracingIncludes['/api/preview/generate']:
         ['./node_modules/ffmpeg-static/ffmpeg']
       Explicitly ships the Linux x64 binary in the function bundle so
       fluent-ffmpeg can spawn it.

  After this lands, the preview should ship with has_audio=true and the
  client will play the 20-second clip instead of falling back to
  lyrics-only mode."

echo "→ git push origin main"
git push origin main 2>&1 | tail -5

echo ""
echo "  Webhook should auto-deploy. ~90s to ready (rebuild needed)."
echo ""

read -n 1 -s -r -p "Press any key to close..."
echo ""
