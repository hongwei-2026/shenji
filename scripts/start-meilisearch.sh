#!/usr/bin/env bash
# 启动本地 Meilisearch（供 AI 财务操作系统搜索引擎使用）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BIN="${MEILI_BIN:-$ROOT/bin/meilisearch}"
DB="${MEILI_DB_PATH:-$ROOT/data/meilisearch}"
ADDR="${MEILI_HTTP_ADDR:-127.0.0.1:7700}"
KEY="${MEILI_MASTER_KEY:-financeos-meili-dev-key}"

if [[ ! -x "$BIN" ]]; then
  echo "Meilisearch 二进制不存在: $BIN"
  echo "请下载: https://github.com/meilisearch/meilisearch/releases"
  exit 1
fi

mkdir -p "$DB"
exec "$BIN" --db-path "$DB" --http-addr "$ADDR" --master-key "$KEY" --env development --no-analytics
