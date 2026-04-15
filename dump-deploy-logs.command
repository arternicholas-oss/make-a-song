#!/bin/bash
cd "$(dirname "$0")"
cp /tmp/vercel-deploy.log  ./deploy-log-1.txt 2>/dev/null || echo "(no deploy-log-1)"
cp /tmp/vercel-deploy2.log ./deploy-log-2.txt 2>/dev/null || echo "(no deploy-log-2)"
git log --oneline -5 > ./git-log-tail.txt
git rev-parse HEAD >> ./git-log-tail.txt
echo "Dumped deploy logs + git head to make-a-song folder."
sleep 2
