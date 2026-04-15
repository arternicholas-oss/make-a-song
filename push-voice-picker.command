#!/bin/bash
# push-voice-picker.command — adds an inline male/female/either lead-vocal
# picker to the genre selection step. Voice is stored on answers.voice and
# steered to Lyria via prompt language (Lyria 3 Pro has no structured
# voice-gender param). Per-genre defaults reduce friction so Continue is
# active the moment the user taps a genre card.
set -e
cd "$(dirname "$0")"

echo ""
echo "============================================================"
echo "  push-voice-picker.command"
echo "============================================================"
echo ""

rm -f .git/index.lock

echo "→ git add"
git add \
  src/lib/constants.ts \
  src/lib/types.ts \
  src/lib/lyria.ts \
  src/components/App.tsx \
  src/app/api/preview/generate/route.ts \
  src/app/api/preview/regenerate/route.ts \
  src/app/api/generate/route.ts \
  push-voice-picker.command

if git diff --cached --quiet; then
  echo "  (nothing staged — exiting)"
  exit 0
fi

echo "→ git commit"
git commit -m "feat(voice): inline male/female/either lead-vocal picker on genre step

Frontend (src/components/App.tsx):
  GenreStep now reveals three pill buttons (Male / Female / Either) on the
  selected card. Pills inherit the genre's accent color when selected and use
  the brand's standard 1.5px border + 99-radius pill style with G.muted text
  when unselected — designed to read as part of the existing card, not a
  bolted-on widget. Tapping a genre card auto-applies the per-genre default
  (90s R&B → Female, Country → Male, others → Either) so Continue activates
  immediately. Re-tapping the same card preserves the user's override; the
  pills only stop click propagation, never mutate the genre selection.

Constants (src/lib/constants.ts):
  Adds VoiceChoice type, VOICE_OPTIONS, GENRE_VOICE_DEFAULTS, and
  VOICE_DIRECTIVE map. Defaults track common production conventions for each
  style — easy to retune later from a single map.

Backend (src/lib/lyria.ts):
  generateMusic() takes an optional voice param (defaults to 'either' so
  legacy callers keep working). Voice is rendered into the lyrics prompt as
  'Vocals: <directive>.' — Lyria 3 Pro has no structured voice_gender knob,
  so prompt steering is the only lever. The instrumental fallback path
  intentionally does NOT carry voice, since it explicitly requests no vocals.

Backend (src/app/api/preview/generate/route.ts,
         src/app/api/preview/regenerate/route.ts,
         src/app/api/generate/route.ts):
  Each route reads answers.voice (or order.answers.voice on the post-purchase
  path), normalises to 'either' for legacy rows, and threads it into
  generateMusic(). Voice is persisted as part of the answers JSON we already
  store on previews/orders, so no schema migration needed.

Types (src/lib/types.ts):
  PersonalAnswers and BrandAnswers gain an optional voice field.

NavRow now requires both genre AND voice — but since voice auto-defaults on
genre selection, there's no extra friction for the user."

echo "→ git push origin main"
git push origin main 2>&1 | tail -5

echo ""
echo "  Webhook should auto-deploy. ~60-90s to ready."
echo ""

read -n 1 -s -r -p "Press any key to close..."
echo ""
