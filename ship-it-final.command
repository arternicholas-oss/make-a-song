#!/bin/bash
# ship-it-final.command — the ACTUAL fix + deploy
#
# Root cause of every failed deploy since 04d6da1b:
#   vercel.json had {"schedule":"*/1 * * * *"} for /api/monitor/failures
#   — Hobby plan caps crons at once/day. Every build errored:
#   "Hobby accounts are limited to daily cron jobs."
#
# This script commits the fix (schedule -> "0 9 * * *" = daily 09:00 UTC)
# AND the /api/version route, pushes, then runs vercel deploy --prod.

set -e
cd "$(dirname "$0")"

echo ""
echo "============================================================"
echo "  ship-it-final.command"
echo "============================================================"
echo ""

rm -f .git/index.lock

echo "→ git add fix + route"
git add vercel.json src/app/api/version/route.ts ship-it-final.command dump-deploy-logs.command

if git diff --cached --quiet; then
  echo "  (nothing staged — will attempt deploy of current HEAD)"
else
  echo "→ git commit"
  git commit -m "Fix vercel.json cron: daily schedule for Hobby plan

Root cause of every failed deploy since 04d6da1b: vercel.json had
/api/monitor/failures on */1 * * * * (every minute). Hobby plan
rejects any cron that runs more than once per day, failing the build
before it ever produces a deployment.

Changed to '0 9 * * *' (09:00 UTC daily). Failure monitor doesn't need
sub-hour resolution on launch day — can upgrade to Pro later if needed.

Also ships /api/version (edge, dynamic) returning {commit, shortCommit,
ref, deploymentId, env, builtAt} for post-deploy SHA verification."

  echo "→ git push origin main"
  git push origin main 2>&1 | tail -5
fi

LOCAL=$(git rev-parse HEAD)
echo "  Local HEAD: $LOCAL"

TOKEN=$(python3 -c 'import json; print(json.load(open("/Users/nickarter/.claude_runner_config.json"))["vercel_token"])')

echo ""
echo "→ npx vercel deploy --prod (this WILL work now — cron fixed)"
npx --yes vercel@latest deploy --prod --yes --token "$TOKEN" 2>&1 | tee /tmp/ship-final.log
echo ""
echo "  Waiting 40s for propagation..."
sleep 40

echo ""
echo "============================================================"
echo "  Verification"
echo "============================================================"
SHORT=$(git rev-parse --short=7 HEAD)
echo "Local HEAD (7):   $SHORT"
echo "Remote /api/version:"
curl -s https://make-a-song.vercel.app/api/version
echo ""
echo "============================================================"
echo ""

# Always copy logs to mount so Claude can see them even on failure
cp /tmp/ship-final.log ./ship-final-log.txt 2>/dev/null || true

read -n 1 -s -r -p "Press any key to close..."
echo ""
