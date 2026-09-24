#!/bin/bash
set -e
cd "$(dirname "$0")"
if ! command -v npm >/dev/null 2>&1; then
  echo "Node.js و npm نصب یا در دسترس نیست. نسخه LTS رسمی Node.js را نصب کن، سپس Terminal را دوباره باز کن."
  read -r -p "برای بستن Enter بزن..."
  exit 1
fi
if [ ! -d node_modules ]; then
  echo "در حال نصب وابستگی‌ها (فقط بار اول)..."
  npm ci --fetch-retries=5 --fetch-timeout=300000
fi
if [ ! -f .env.local ] || ! grep -q '^N8N_WEBHOOK_SECRET=' .env.local; then
  npm run setup:n8n
fi
echo "TalentFlow در حال اجرا است. این پنجره را نبند."
npm run dev -- --port 5174 --strictPort
