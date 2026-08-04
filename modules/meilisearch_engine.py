"""Meilisearch 搜索引擎集成（不可用时自动回退 SQLite FTS5）。"""
from __future__ import annotations

import atexit
import os
import subprocess
import time
from pathlib import Path
from typing import Any

_ROOT = Path(__file__).resolve().parent.parent
_BIN = Path(os.environ.get('MEILI_BIN', str(_ROOT / 'bin' / 'meilisearch')))
_DB_PATH = Path(os.environ.get('MEILI_DB_PATH', str(_ROOT / 'data' / 'meilisearch')))
_HOST = os.environ.get('MEILI_HTTP_ADDR', '127.0.0.1:7700')
_KEY = os.environ.get('MEILI_MASTER_KEY', 'financeos-meili-dev-key')
_INDEX = 'financeos_docs'
_proc: subprocess.Popen | None = None
_started = False


def _client():
    import meilisearch
    return meilisearch.Client(f'http://{_HOST}', _KEY)


def is_binary_present() -> bool:
    if not (_BIN.is_file() and os.access(_BIN, os.X_OK)):
        return False
    # 未下完的文件通常很小或不是 ELF
    try:
        if _BIN.stat().st_size < 20_000_000:
            return False
        with open(_BIN, 'rb') as f:
            return f.read(4) == b'\x7fELF'
    except OSError:
        return False


def ensure_server(timeout: float = 8.0) -> bool:
    """确保本机 Meilisearch 可用；成功返回 True。"""
    global _proc, _started
    if _health_ok():
        _started = True
        return True
    if not is_binary_present():
        return False
    _DB_PATH.mkdir(parents=True, exist_ok=True)
    env = os.environ.copy()
    env['MEILI_HTTP_ADDR'] = _HOST
    env['MEILI_MASTER_KEY'] = _KEY
    env['MEILI_ENV'] = 'development'
    env['MEILI_NO_ANALYTICS'] = 'true'
    try:
        _proc = subprocess.Popen(
            [str(_BIN), '--db-path', str(_DB_PATH), '--http-addr', _HOST, '--master-key', _KEY],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            env=env,
        )
        atexit.register(_stop_server)
    except OSError:
        return False
    deadline = time.time() + timeout
    while time.time() < deadline:
        if _health_ok():
            _started = True
            return True
        time.sleep(0.25)
    return False


def _stop_server() -> None:
    global _proc
    if _proc and _proc.poll() is None:
        _proc.terminate()
        try:
            _proc.wait(timeout=3)
        except Exception:
            _proc.kill()
    _proc = None


def _health_ok() -> bool:
    try:
        import urllib.request
        with urllib.request.urlopen(f'http://{_HOST}/health', timeout=1.5) as r:
            return r.status == 200
    except Exception:
        return False


def status() -> dict[str, Any]:
    ok = _health_ok()
    return {
        'engine': 'Meilisearch' if ok else 'SQLite FTS5',
        'meilisearch': ok,
        'binary': is_binary_present(),
        'host': _HOST,
        'index': _INDEX,
        'started_by_app': _started,
    }


def _docs_from_fts(user_id: int | None = None) -> list[dict[str, Any]]:
    from modules import search_engine as se
    se.rebuild_index(user_id=user_id)
    conn = se._connect()
    try:
        rows = conn.execute('SELECT title, content, url, tags, source FROM docs').fetchall()
        docs = []
        for i, r in enumerate(rows):
            docs.append({
                'id': f'{r["source"]}-{i}-{abs(hash(r["title"])) % 10_000_000}',
                'title': r['title'] or '',
                'content': r['content'] or '',
                'url': r['url'] or '',
                'tags': r['tags'] or '',
                'source': r['source'] or '',
            })
        return docs
    finally:
        conn.close()


def sync_index(user_id: int | None = None) -> dict[str, Any]:
    if not ensure_server():
        return {'success': False, 'error': 'Meilisearch 未启动', **status()}
    client = _client()
    try:
        try:
            client.get_index(_INDEX)
        except Exception:
            client.create_index(_INDEX, {'primaryKey': 'id'})
        index = client.index(_INDEX)
        index.update_settings({
            'searchableAttributes': ['title', 'content', 'tags'],
            'displayedAttributes': ['title', 'content', 'url', 'tags', 'source'],
            'rankingRules': ['words', 'typo', 'proximity', 'attribute', 'sort', 'exactness'],
        })
        docs = _docs_from_fts(user_id)
        if docs:
            task = index.add_documents(docs)
            try:
                client.wait_for_task(task.task_uid, timeout_in_ms=20000)
            except Exception:
                pass
        return {'success': True, 'count': len(docs), **status()}
    except Exception as e:
        return {'success': False, 'error': str(e), **status()}


def search(query: str, user_id: int | None = None, limit: int = 20) -> dict[str, Any] | None:
    """Meilisearch 检索；不可用返回 None（由上层回退）。"""
    query = (query or '').strip()
    if not query:
        return {
            'success': False,
            'query': '',
            'results': [],
            'error': '请输入搜索关键词',
            'engine': 'Meilisearch',
        }
    if not ensure_server():
        return None
    try:
        client = _client()
        try:
            client.get_index(_INDEX)
        except Exception:
            sync_index(user_id)
        index = client.index(_INDEX)
        # 首次空索引时同步
        try:
            stats = index.get_stats()
            if getattr(stats, 'number_of_documents', 1) == 0:
                sync_index(user_id)
        except Exception:
            sync_index(user_id)
        raw = index.search(query, {'limit': limit})
        hits = raw.get('hits') if isinstance(raw, dict) else getattr(raw, 'hits', [])
        results = []
        for h in hits or []:
            results.append({
                'title': h.get('title', ''),
                'content': h.get('content', ''),
                'url': h.get('url', '/'),
                'engine': 'Meilisearch',
                'source': h.get('source', ''),
            })
        return {
            'success': bool(results),
            'query': query,
            'results': results,
            'total': len(results),
            'engine': 'Meilisearch',
            'engine_note': 'Meilisearch 全文检索 · 已索引知识库、历史记录与上传数据',
        }
    except Exception:
        return None
