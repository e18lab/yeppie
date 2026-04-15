#!/usr/bin/env bash
# Деплой Yeppie на VPS: /opt/yeppie, PM2 имя yeppie
# Требуется .env с VITE_API_URL (иначе сборка без URL API).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "[yeppie-deploy] $(date -Is) cwd=$ROOT"

git fetch origin
if ! git show-ref --verify --quiet refs/remotes/origin/main; then
  echo "[yeppie-deploy] ERROR: no origin/main" >&2
  exit 1
fi

git checkout main
git reset --hard origin/main

yarn install --frozen-lockfile

if [ ! -f .env ] && [ ! -f .env.production ]; then
  echo "[yeppie-deploy] WARN: нет .env — создай с VITE_API_URL=" >&2
fi

yarn build

if pm2 describe yeppie >/dev/null 2>&1; then
  pm2 reload yeppie --update-env
else
  pm2 start ecosystem.config.cjs
fi

pm2 save

echo "[yeppie-deploy] OK $(date -Is)"
