#!/bin/bash
# push-preview-promo.command — add "30-sec preview before you pay"
# messaging to the home page in the 4 highest-leverage spots.
#
# Webhook is healthy now (cron fix landed), so push alone deploys.

set -e
cd "$(dirname "$0")"

echo ""
echo "============================================================"
echo "  push-preview-promo.command"
echo "============================================================"
echo ""

rm -f .git/index.lock

echo "→ git add"
git add src/components/App.tsx push-preview-promo.command

if git diff --cached --quiet; then
  echo "  (nothing staged — exiting)"
  exit 0
fi

echo "→ git commit"
git commit -m "Home page: surface free 30-sec preview promise (conversion)

Frontend (src/components/App.tsx):
  Biggest buyer objection is 'what if I pay and it sucks?'. The free
  preview kills that objection, but today it's a hidden feature — users
  don't find out about it until after they've decided whether to click
  the CTA. Moved the promise to the decision point in 4 places:

  1. Mint-tinted pill directly under the hero CTA row:
     '🎧 Hear a free 30-second preview before you pay'
     (Risk-reversal right when they're choosing whether to click.)
  2. Microcopy under CTAs: replaced 'Personal or brand' with
     'Only pay if you love it'.
  3. How It Works step 3 rewritten from 'Get your song' to
     'Preview it free' — makes the preview-before-pay flow explicit.
  4. Pricing feature list: new top bullet
     'Free 30-second preview before you pay — only buy if you love it'.
  5. Added FAQ: 'Do I have to pay before I hear it?' with
     reinforcing answer, plus updated two adjacent FAQs."

echo "→ git push origin main"
git push origin main 2>&1 | tail -5

echo ""
echo "  Webhook should auto-deploy. Run vercel-status check in ~90s."
echo ""

read -n 1 -s -r -p "Press any key to close..."
echo ""
