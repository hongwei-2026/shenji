#!/bin/sh
# Docker 环境冒烟测试脚本（含登录）
set -eu

BASE_URL="${BASE_URL:-http://audit-app:5000}"
COOKIE_JAR="${COOKIE_JAR:-/tmp/smoke_cookies.txt}"

echo "========================================"
echo " 财务审计系统 Docker 环境测试"
echo " 目标: $BASE_URL"
echo "========================================"

echo "[1/6] 登录页可达性..."
curl -sf "$BASE_URL/login" > /dev/null
echo "  OK"

echo "[2/6] 注册并登录测试用户..."
curl -sf -c "$COOKIE_JAR" -b "$COOKIE_JAR" -X POST "$BASE_URL/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d '{"username":"docker_smoke","password":"smoke1234","role":"normal_user","company":"Docker Smoke"}' \
  | grep -q '"success": true'
echo "  OK"

echo "[3/6] 历史记录 API..."
curl -sf -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$BASE_URL/api/history" | grep -q '"success"'
echo "  OK"

echo "[4/6] CSV 文件上传与审计分析..."
RESP=$(curl -sf -c "$COOKIE_JAR" -b "$COOKIE_JAR" -X POST -F "files=@/samples/demo.csv" "$BASE_URL/api/upload")
echo "$RESP" | grep -q '"success": true'
echo "$RESP" | grep -Eq '"history_id"|"audit_summary"|"tables"'
echo "  OK"

echo "[5/6] 历史记录加载..."
HID=$(echo "$RESP" | sed -n 's/.*"history_id": *\([0-9][0-9]*\).*/\1/p' | head -1)
if [ -n "$HID" ]; then
  curl -sf -c "$COOKIE_JAR" -b "$COOKIE_JAR" -X POST "$BASE_URL/api/history/$HID/load" | grep -q '"success": true'
  echo "  OK (id=$HID)"
else
  echo "  SKIP (no history_id in upload response)"
fi

echo "[6/6] 仪表盘数据 API..."
curl -sf -c "$COOKIE_JAR" -b "$COOKIE_JAR" "$BASE_URL/api/dashboard" | grep -q '"success": true'
echo "  OK"

echo "========================================"
echo " 全部测试通过"
echo "========================================"
