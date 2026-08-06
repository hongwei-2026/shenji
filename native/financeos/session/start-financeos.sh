#!/usr/bin/env bash
# FinanceOS 图形会话入口（由显示管理器调用）
set -euo pipefail

export FINANCEOS_URL="${FINANCEOS_URL:-http://127.0.0.1:5000}"
export FINANCEOS_SHELL="${FINANCEOS_SHELL:-$HOME/.local/share/financeos/desktop-shell}"

# 确保本地 API 可用
if ! curl -sf "${FINANCEOS_URL}/api/financeos/health" >/dev/null 2>&1; then
  if systemctl --user is-enabled financeosd.service >/dev/null 2>&1; then
    systemctl --user start financeosd.service || true
  fi
  # 等待最多 15 秒
  for _ in $(seq 1 15); do
    if curl -sf "${FINANCEOS_URL}/api/financeos/health" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
fi

exec financeos-open desktop
