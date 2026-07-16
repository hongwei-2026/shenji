#!/usr/bin/env python3
"""下载 Qwen2.5-0.5B-Instruct 到项目 data/models 目录。"""
from __future__ import annotations

import os
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / 'data' / 'models' / 'Qwen2.5-0.5B-Instruct'
HF_MODEL_ID = 'Qwen/Qwen2.5-0.5B-Instruct'

# 国内网络可设置镜像，例如: set HF_ENDPOINT=https://hf-mirror.com
os.environ.setdefault('HF_HUB_DOWNLOAD_TIMEOUT', '300')


def main() -> int:
    try:
        from huggingface_hub import snapshot_download
    except ImportError:
        print('请先安装: pip install huggingface_hub')
        return 1

    TARGET.mkdir(parents=True, exist_ok=True)
    endpoint = os.environ.get('HF_ENDPOINT', 'https://huggingface.co')
    print(f'正在下载 {HF_MODEL_ID} -> {TARGET}')
    print(f'镜像/端点: {endpoint}')
    snapshot_download(
        repo_id=HF_MODEL_ID,
        local_dir=str(TARGET),
        resume_download=True,
        max_workers=2,
    )
    print('下载完成。')
    return 0


if __name__ == '__main__':
    sys.exit(main())
