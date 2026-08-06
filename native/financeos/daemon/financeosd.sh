#!/usr/bin/env bash
# FinanceOS 本地 API 守护进程启动脚本
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$ROOT"

export HOST="${FINANCEOS_HOST:-127.0.0.1}"
export PORT="${FINANCEOS_PORT:-5000}"
export FLASK_DEBUG="${FLASK_DEBUG:-0}"

mkdir -p "$ROOT/data" "$ROOT/uploads" "$ROOT/native/financeos/daemon/logs"

if command -v gunicorn >/dev/null 2>&1; then
  exec gunicorn \
    --bind "${HOST}:${PORT}" \
    --workers "${FINANCEOS_WORKERS:-2}" \
    --threads "${FINANCEOS_THREADS:-4}" \
    --timeout 120 \
    --access-logfile "$ROOT/native/financeos/daemon/logs/access.log" \
    --error-logfile "$ROOT/native/financeos/daemon/logs/error.log" \
    "app:app"
else
  exec python3 app.py
fi
