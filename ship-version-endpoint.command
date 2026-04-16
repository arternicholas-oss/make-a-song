#!/bin/bash
# ──────────────────────────────────────────────────────────────────
# Ship the new /api/version endpoint end-to-end:
#   1. git commit + push the new route file
#   2. vercel deploy --prod (bypasses the broken GitHub webhook)
#   3. wait 45s for propagation
#   4. curl /api/version — verify the SHA matches HEAD
# ──────────────────────────────────────────────────────────────────

set -e
cd "$(dirname "$0")"

REPO="/Users/nickarter/Downloads/make-a-song"
mkdir -p "$HOME/.claude_runner"

cat > "$HOME/.claude_runner/inbox.json" <<'EOF'
{"actions":[
  {"type":"terminal","description":"Stage + commit + push the /api/version route","command":"cd /Users/nickarter/Downloads/make-a-song && rm -f .git/index.lock && git add src/app/api/version/route.ts ship-version-endpoint.command && git commit -m 'Add /api/version endpoint for deploy verification\n\nReturns {commit, shortCommit, ref, deploymentId, env, builtAt}\nso we can confirm which SHA is live without opening the Vercel\ndashboard. Edge runtime, no secrets, dynamic.\n\nAlso unblocks post-deploy smoke tests now that the GitHub webhook\nis intermittently not firing.' && git push origin main 2>&1 | tail -10"},
  {"type":"terminal","description":"Ensure Vercel CLI is available","command":"command -v vercel >/dev/null 2>&1 || npm install -g vercel@latest 2>&1 | tail -5"},
  {"type":"terminal","description":"Link project (idempotent) + deploy to prod via CLI","command":"cd /Users/nickarter/Downloads/make-a-song && TOKEN=$(python3 -c 'import json; print(json.load(open(\"/Users/nickarter/.claude_runner_config.json\"))[\"vercel_token\"])') && vercel link --yes --project make-a-song --token \"$TOKEN\" 2>&1 | tail -3 && vercel deploy --prod --yes --token \"$TOKEN\" 2>&1 | tail -15"},
  {"type":"terminal","description":"Propagation wait","command":"sleep 45"},
  {"type":"terminal","description":"Verify /api/version returns the new HEAD SHA","command":"LOCAL=$(cd /Users/nickarter/Downloads/make-a-song && git rev-parse HEAD) && echo 'Local HEAD:' $LOCAL && echo 'Remote /api/version:' && curl -s https://make-a-song.vercel.app/api/version | python3 -m json.tool"},
  {"type":"vercel","description":"GitHub→Vercel webhook health re-check","operation":"check_git_integration"},
  {"type":"vercel","description":"Preview endpoint smoke test (expect 400)","operation":"smoke_test","url":"https://make-a-song.vercel.app/api/preview/generate","expected_status":400}
]}
EOF

echo "✓ Queued 7 actions: commit → push → CLI deploy → wait → verify SHA → webhook check → smoke test"
echo ""
echo "─────────────────────────────────────────────────────────"
echo "  Tailing daemon log — Ctrl-C to exit (daemon keeps running)."
echo "  Expect ~3-4 minutes for the full sequence."
echo "─────────────────────────────────────────────────────────"
echo ""
sleep 1
tail -f "$HOME/.claude_runner/daemon.log"
