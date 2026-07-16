"""本地 Qwen2.5-0.5B-Instruct 推理（所有 AI 功能统一走此模块）。"""
from __future__ import annotations

import json
import os
import re
import threading
from pathlib import Path
from typing import Any

_BASE_DIR = Path(__file__).resolve().parent.parent
DEFAULT_MODEL_DIR = _BASE_DIR / 'data' / 'models' / 'Qwen2.5-0.5B-Instruct'
MODEL_NAME = 'Qwen2.5-0.5B-Instruct'
HF_MODEL_ID = 'Qwen/Qwen2.5-0.5B-Instruct'

_lock = threading.Lock()
_model = None
_tokenizer = None


def get_model_path() -> Path:
    return Path(os.environ.get('LOCAL_MODEL_PATH', DEFAULT_MODEL_DIR))


def is_model_ready(path: Path | None = None) -> bool:
    root = path or get_model_path()
    if not (root / 'config.json').exists():
        return False
    return any(root.glob('*.safetensors')) or any(root.glob('*.bin'))


def model_status() -> dict[str, Any]:
    path = get_model_path()
    return {
        'model': MODEL_NAME,
        'path': str(path),
        'ready': is_model_ready(path),
        'loaded': _model is not None,
    }


def _load() -> None:
    global _model, _tokenizer
    if _model is not None and _tokenizer is not None:
        return

    path = get_model_path()
    if not is_model_ready(path):
        raise FileNotFoundError(
            f'本地模型未就绪，请先下载到: {path}\n'
            f'运行: python scripts/download_qwen_model.py'
        )

    import torch
    from transformers import AutoModelForCausalLM, AutoTokenizer

    _tokenizer = AutoTokenizer.from_pretrained(path, trust_remote_code=True)
    _model = AutoModelForCausalLM.from_pretrained(
        path,
        dtype=torch.float32,
        device_map='cpu',
        trust_remote_code=True,
    )
    _model.eval()


def preload_model() -> None:
    """应用启动时预加载模型（可选）。"""
    if os.environ.get('LOCAL_LLM_PRELOAD', '1') != '1':
        return
    if not is_model_ready():
        return
    with _lock:
        _load()


def chat(
    messages: list[dict[str, str]],
    *,
    max_tokens: int = 512,
    temperature: float = 0.7,
) -> str:
    """多轮对话，messages 格式: [{'role':'system'|'user'|'assistant', 'content': '...'}]"""
    import torch

    with _lock:
        _load()
        assert _tokenizer is not None and _model is not None

        prompt = _tokenizer.apply_chat_template(
            messages,
            tokenize=False,
            add_generation_prompt=True,
        )
        inputs = _tokenizer(prompt, return_tensors='pt')
        with torch.no_grad():
            outputs = _model.generate(
                **inputs,
                max_new_tokens=max_tokens,
                do_sample=temperature > 0,
                temperature=temperature if temperature > 0 else None,
                top_p=0.9,
                pad_token_id=_tokenizer.eos_token_id,
            )
        new_tokens = outputs[0][inputs['input_ids'].shape[1]:]
        return _tokenizer.decode(new_tokens, skip_special_tokens=True).strip()


def _extract_json(text: str) -> dict:
    text = text.strip()
    if text.startswith('```'):
        text = re.sub(r'^```(?:json)?\s*', '', text)
        text = re.sub(r'\s*```$', '', text)
    return json.loads(text)


def vision_table_from_ocr(ocr_text: str) -> dict:
    """OCR 文本 + 本地模型，整理为表格 JSON。"""
    messages = [
        {
            'role': 'system',
            'content': (
                '你是表格结构化助手。根据 OCR 识别的文本，输出 JSON 表格。'
                '格式: {"headers":["列1","列2"],"rows":[["值1","值2"]]}。'
                '只输出 JSON，不要其他说明。'
            ),
        },
        {
            'role': 'user',
            'content': f'OCR 文本如下，请整理为表格 JSON：\n{ocr_text[:6000]}',
        },
    ]
    reply = chat(messages, max_tokens=2000, temperature=0.2)
    return _extract_json(reply)
