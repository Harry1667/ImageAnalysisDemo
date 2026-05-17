#!/usr/bin/env bash
# One-shot deploy: rsync source → server → install + build → pm2 restart → smoke test
# Usage: ./deploy.sh
# Config: 02-web/.deploy.env (gitignored, copy from .deploy.env.example)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$SCRIPT_DIR/.deploy.env"

# ── load config ────────────────────────────────────────────────
if [ ! -f "$CONFIG_FILE" ]; then
  echo "❌ 找不到 $CONFIG_FILE"
  echo "   執行：cp $SCRIPT_DIR/.deploy.env.example $CONFIG_FILE  並填值"
  exit 1
fi
# shellcheck disable=SC1090
source "$CONFIG_FILE"

: "${SSH_KEY:?SSH_KEY 未設}"
: "${SSH_HOST:?SSH_HOST 未設}"
: "${DEPLOY_PATH:?DEPLOY_PATH 未設}"
: "${PM2_NAME:?PM2_NAME 未設}"
: "${SERVER_URL:?SERVER_URL 未設}"
NODE_BIN="${NODE_BIN:-/www/server/nodejs/v22.22.2/bin}"

# ── pre-flight ─────────────────────────────────────────────────
if [ ! -f "$SSH_KEY" ]; then
  echo "❌ SSH key 不存在: $SSH_KEY"
  exit 1
fi

# 提醒 git 髒工作區
if [ -d "$PROJECT_DIR/.git" ]; then
  DIRTY=$(cd "$PROJECT_DIR" && git status --porcelain | head -5)
  if [ -n "$DIRTY" ]; then
    echo "⚠️  工作區有未 commit 變更（不會擋部署，但 GitHub 不會同步）"
    echo "$DIRTY" | sed 's/^/   /'
    echo
  fi
fi

echo "▶ Deploy → $SSH_HOST:$DEPLOY_PATH  (pm2: $PM2_NAME)"
START=$(date +%s)

# ── 1/4 rsync ──────────────────────────────────────────────────
echo
echo "═══ 1/4 rsync source → server ═══════════════════════════"
rsync -av --rsync-path="sudo rsync" \
  --exclude='node_modules/' \
  --exclude='.next/' \
  --exclude='.git/' \
  --exclude='.DS_Store' \
  --exclude='.env.local' \
  --exclude='.deploy.env' \
  --exclude='*.log' \
  --exclude='tsconfig.tsbuildinfo' \
  --exclude='03-Skills/' \
  -e "ssh -i \"$SSH_KEY\" -o StrictHostKeyChecking=no" \
  "$PROJECT_DIR/01-dev" \
  "$PROJECT_DIR/02-web" \
  "$PROJECT_DIR/README.md" \
  "$SSH_HOST:$DEPLOY_PATH/" 2>&1 | tail -6

# ── 2/4 install + build ────────────────────────────────────────
echo
echo "═══ 2/4 install + build on server ═══════════════════════"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_HOST" 'sudo bash -se' <<REMOTE
set -e
export PATH=$NODE_BIN:\$PATH
cd $DEPLOY_PATH/02-web

echo "→ npm install"
npm install --no-audit --no-fund 2>&1 | tail -3

echo "→ npm run build"
npm run build 2>&1 | tail -4
REMOTE

# ── 3/4 pm2 restart ────────────────────────────────────────────
echo
echo "═══ 3/4 pm2 restart $PM2_NAME ════════════════════════════"
ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "$SSH_HOST" 'sudo bash -se' <<REMOTE
set -e
export PATH=$NODE_BIN:\$PATH
pm2 restart $PM2_NAME --update-env 2>&1 | tail -3
pm2 save 2>&1 | tail -1
sleep 3
pm2 list 2>&1 | grep -E "name|$PM2_NAME" | head -3
REMOTE

# ── 4/4 smoke test ─────────────────────────────────────────────
echo
echo "═══ 4/4 smoke test ══════════════════════════════════════"
sleep 2
HTTP_LINE=$(curl -sI -o /dev/null -w "HTTP %{http_code}  %{time_total}s" "$SERVER_URL/")
echo "GET  $SERVER_URL/         → $HTTP_LINE"
API_LINE=$(curl -s -X POST -o /dev/null -w "HTTP %{http_code}  %{time_total}s" "$SERVER_URL/api/extract")
echo "POST $SERVER_URL/api/extract → $API_LINE  (expect 400 bad_request — 沒帶 file 是正常)"

ELAPSED=$(( $(date +%s) - START ))
echo
echo "✅ Deploy 完成（${ELAPSED}s）"
echo "   → $SERVER_URL"
