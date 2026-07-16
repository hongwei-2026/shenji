#!/usr/bin/env bash
# 从分片还原 Qwen 模型权重（Gitee 单文件 100MB 限制，权重以 part 形式存储）
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODEL_DIR="${LOCAL_MODEL_PATH:-$ROOT/data/models/Qwen2.5-0.5B-Instruct}"
TARGET="$MODEL_DIR/model.safetensors"

if [[ -f "$TARGET" ]]; then
  echo "模型已存在: $TARGET"
  exit 0
fi

shopt -s nullglob
parts=("$MODEL_DIR"/model.safetensors.part-*)
shopt -u nullglob

if [[ ${#parts[@]} -eq 0 ]]; then
  echo "未找到分片 model.safetensors.part-*，请确认已 git clone 完整仓库"
  exit 1
fi

echo "正在合并 ${#parts[@]} 个分片 -> $TARGET"
cat "${parts[@]}" > "$TARGET"
echo "完成: $(du -h "$TARGET" | cut -f1)"
