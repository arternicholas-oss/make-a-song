#!/bin/bash
# push-lyria-fallback.command — relax safetySettings + add instrumental
# fallback so Lyria's PROHIBITED_CONTENT filter no longer kills audio.
set -e
cd "$(dirname "$0")"

echo ""
echo "============================================================"
echo "  push-lyria-fallback.command"
echo "============================================================"
echo ""

rm -f .git/index.lock

echo "→ git add"
git add src/lib/lyria.ts push-lyria-fallback.command

if git diff --cached --quiet; then
  echo "  (nothing staged — exiting)"
  exit 0
fi

echo "→ git commit"
git commit -m "Lyria: relax safetySettings + add instrumental fallback when blocked

Backend (src/lib/lyria.ts):
  PostHog telemetry (from previous diagnostics commit) confirmed Lyria
  was returning blockReason=PROHIBITED_CONTENT — the non-toggleable
  safety filter rejecting the lyric-bearing prompt before generation.
  User reports they're only typing their own name in form fields, so
  the trigger is somewhere in our auto-generated lyrics, not user input.

  Two-part fix:

  1. Relax the four TOGGLEABLE safety categories (HARASSMENT,
     HATE_SPEECH, SEXUALLY_EXPLICIT, DANGEROUS_CONTENT) to
     BLOCK_ONLY_HIGH so milder phrasing in lyrics doesn't trigger
     them. PROHIBITED_CONTENT itself is non-toggleable per Gemini API
     docs — can't lower that one.

  2. Instrumental fallback: refactor the Lyria call into a helper and
     retry on ANY first-attempt failure (block or otherwise) with an
     instrumental-only prompt that omits lyric text entirely. The
     fallback prompt describes the song structurally:
     'Compose an instrumental {genre} backing track with a {tone} mood.
     Length: about one minute. Standard song structure: intro, verse,
     chorus, verse, chorus, outro. Clean instrumentation, no vocals.'
     Result: even when lyrics get nuked by PROHIBITED_CONTENT, users
     still get a 20-second audio teaser — much better UX than a 500.

  3. New return field promptStrategy ('with_lyrics' | 'instrumental_fallback')
     so PostHog can break down the conversion funnel by which path
     produced the audio."

echo "→ git push origin main"
git push origin main 2>&1 | tail -5

echo ""
echo "  Webhook should auto-deploy. ~60-90s to ready."
echo ""

read -n 1 -s -r -p "Press any key to close..."
echo ""
