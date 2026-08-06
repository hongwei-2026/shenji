"""FinanceOS 用户文件空间（桌面快捷方式 / 文档 / 下载）。"""
from __future__ import annotations

import json
import os
import shutil
import time
from pathlib import Path
from typing import Any

_ROOT = Path(__file__).resolve().parent.parent / 'data' / 'userspace'
_MAX_READ = 512 * 1024
_FORBIDDEN = {'.', '..'}


def _user_root(user_id: int | str) -> Path:
    root = _ROOT / str(user_id)
    for sub in ('Desktop', 'Documents', 'Downloads', 'Apps'):
        (root / sub).mkdir(parents=True, exist_ok=True)
    shortcuts = root / 'Desktop' / '.shortcuts.json'
    if not shortcuts.is_file():
        shortcuts.write_text('[]', encoding='utf-8')
    readme = root / 'Documents' / 'Welcome.txt'
    if not readme.is_file():
        readme.write_text(
            'Welcome to FinanceOS Files.\n'
            'Put documents here. Desktop shortcuts live on Desktop.\n',
            encoding='utf-8',
        )
    return root


def _safe_rel(rel: str) -> str:
    rel = (rel or '').replace('\\', '/').strip('/')
    parts = [p for p in rel.split('/') if p and p not in _FORBIDDEN]
    if any(p.startswith('.') and p not in ('.shortcuts.json',) for p in parts if p != '.shortcuts.json'):
        # allow hidden shortcuts file only
        parts = [p for p in parts if not (p.startswith('.') and p != '.shortcuts.json')]
    return '/'.join(parts)


def resolve_path(user_id: int | str, rel: str = '') -> Path:
    root = _user_root(user_id).resolve()
    rel = _safe_rel(rel)
    target = (root / rel).resolve() if rel else root
    if not str(target).startswith(str(root)):
        raise ValueError('path escaped sandbox')
    return target


def list_dir(user_id: int | str, rel: str = '') -> dict[str, Any]:
    path = resolve_path(user_id, rel)
    if not path.exists():
        return {'success': False, 'error': 'not found', 'path': rel}
    if not path.is_dir():
        return {'success': False, 'error': 'not a directory', 'path': rel}
    items = []
    for child in sorted(path.iterdir(), key=lambda p: (not p.is_dir(), p.name.lower())):
        if child.name.startswith('.') and child.name != '.shortcuts.json':
            continue
        if child.name == '.shortcuts.json':
            continue
        st = child.stat()
        items.append({
            'name': child.name,
            'type': 'dir' if child.is_dir() else 'file',
            'size': st.st_size if child.is_file() else 0,
            'mtime': int(st.st_mtime),
            'path': str(Path(rel) / child.name).replace('\\', '/') if rel else child.name,
        })
    return {
        'success': True,
        'path': rel or '',
        'items': items,
        'roots': ['Desktop', 'Documents', 'Downloads', 'Apps'],
    }


def read_file(user_id: int | str, rel: str) -> dict[str, Any]:
    path = resolve_path(user_id, rel)
    if not path.is_file():
        return {'success': False, 'error': 'not a file'}
    if path.stat().st_size > _MAX_READ:
        return {'success': False, 'error': 'file too large'}
    try:
        text = path.read_text(encoding='utf-8')
    except UnicodeDecodeError:
        return {'success': False, 'error': 'binary file', 'binary': True}
    return {'success': True, 'path': rel, 'content': text, 'name': path.name}


def write_file(user_id: int | str, rel: str, content: str) -> dict[str, Any]:
    path = resolve_path(user_id, rel)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content or '', encoding='utf-8')
    return {'success': True, 'path': rel}


def mkdir(user_id: int | str, rel: str) -> dict[str, Any]:
    path = resolve_path(user_id, rel)
    path.mkdir(parents=True, exist_ok=True)
    return {'success': True, 'path': rel}


def delete_path(user_id: int | str, rel: str) -> dict[str, Any]:
    path = resolve_path(user_id, rel)
    root = _user_root(user_id).resolve()
    if path == root:
        return {'success': False, 'error': 'cannot delete root'}
    if not path.exists():
        return {'success': False, 'error': 'not found'}
    if path.is_dir():
        shutil.rmtree(path)
    else:
        path.unlink()
    return {'success': True}


def list_shortcuts(user_id: int | str) -> list[dict[str, Any]]:
    path = resolve_path(user_id, 'Desktop/.shortcuts.json')
    try:
        data = json.loads(path.read_text(encoding='utf-8') or '[]')
        return data if isinstance(data, list) else []
    except Exception:
        return []


def save_shortcuts(user_id: int | str, items: list[dict[str, Any]]) -> dict[str, Any]:
    path = resolve_path(user_id, 'Desktop/.shortcuts.json')
    clean = []
    for it in items or []:
        if not isinstance(it, dict):
            continue
        kind = it.get('kind') or 'app'
        entry = {
            'id': it.get('id') or f'sc-{int(time.time()*1000)}',
            'kind': kind,
            'name': it.get('name') or 'Shortcut',
            'glyph': it.get('glyph') or '•',
            'color': it.get('color') or '#0078d4',
        }
        if kind == 'app':
            entry['app_id'] = it.get('app_id') or it.get('id')
            entry['path'] = it.get('path') or ''
        elif kind == 'file':
            entry['file'] = it.get('file') or ''
        clean.append(entry)
    path.write_text(json.dumps(clean, ensure_ascii=False, indent=2), encoding='utf-8')
    return {'success': True, 'items': clean}


# 桌面核心快捷方式（全员必有，靠前显示）
CORE_DESKTOP_APP_IDS = (
    'audit',      # 仪表盘
    'edit',       # 表格编辑
    'ai-agent',
    'files',
    'terminal',
    'browser',
    'upload',
)

_CORE_FALLBACK_META = {
    'audit': {'name': '仪表盘', 'glyph': '盘', 'color': '#1d4ed8', 'path': '/dashboard'},
    'edit': {'name': '表格编辑', 'glyph': '编', 'color': '#0d9488', 'path': '/edit'},
    'files': {'name': 'Files', 'glyph': '📁', 'color': '#ca8a04', 'path': '/files'},
    'terminal': {'name': 'Terminal', 'glyph': '>_', 'color': '#111827', 'path': '/terminal'},
    'ai-agent': {'name': 'AI', 'glyph': 'AI', 'color': '#6366f1', 'path': '/os-ai'},
    'browser': {'name': 'Browser', 'glyph': '浏', 'color': '#0078d4', 'path': '/browser'},
    'upload': {'name': 'Import', 'glyph': '导', 'color': '#0891b2', 'path': '/home'},
}

# 始终强制出现在桌面的应用（不依赖角色权限）
ALWAYS_DESKTOP_IDS = ('audit', 'edit', 'ai-agent', 'files', 'terminal', 'browser')


def _shortcut_from_app(app: dict[str, Any]) -> dict[str, Any]:
    return {
        'id': f"app-{app['id']}",
        'kind': 'app',
        'app_id': app['id'],
        'name': app.get('name'),
        'glyph': app.get('glyph') or (app.get('name') or '?')[:1],
        'color': app.get('color') or '#0078d4',
        'path': app.get('path') or '',
    }


def _resolve_core(app_id: str, app_by_id: dict[str, dict[str, Any]]) -> dict[str, Any] | None:
    if app_id in app_by_id:
        sc = _shortcut_from_app(app_by_id[app_id])
        # 强制中文核心名
        if app_id in _CORE_FALLBACK_META:
            sc['name'] = _CORE_FALLBACK_META[app_id]['name']
            sc['glyph'] = _CORE_FALLBACK_META[app_id]['glyph']
            sc['path'] = _CORE_FALLBACK_META[app_id]['path']
            sc['color'] = _CORE_FALLBACK_META[app_id]['color']
        return sc
    if app_id in ALWAYS_DESKTOP_IDS or app_id in _CORE_FALLBACK_META:
        meta = _CORE_FALLBACK_META[app_id]
        return {
            'id': f'app-{app_id}',
            'kind': 'app',
            'app_id': app_id,
            **meta,
        }
    return None


def _order_shortcuts(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """仪表盘、表格编辑置顶，其余保持相对顺序。"""
    priority = {aid: i for i, aid in enumerate(CORE_DESKTOP_APP_IDS)}
    apps = [x for x in items if x.get('kind') == 'app']
    files = [x for x in items if x.get('kind') != 'app']
    apps.sort(key=lambda x: priority.get(x.get('app_id'), 100))
    return apps + files


def ensure_default_shortcuts(user_id: int | str, apps: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """确保桌面必有「仪表盘」「表格编辑」等核心快捷方式并置顶。"""
    existing = list_shortcuts(user_id)
    app_by_id = {a['id']: a for a in apps}
    by_id: dict[str, dict[str, Any]] = {}
    others: list[dict[str, Any]] = []

    for item in existing:
        if item.get('kind') == 'app' and item.get('app_id'):
            by_id[item['app_id']] = dict(item)
        else:
            others.append(item)

    for app_id in CORE_DESKTOP_APP_IDS:
        sc = _resolve_core(app_id, app_by_id)
        if not sc:
            continue
        # 有权限的 pinned / 核心项：强制写入或刷新
        if app_id in ALWAYS_DESKTOP_IDS or app_id in app_by_id:
            prev = by_id.get(app_id) or {}
            prev.update(sc)
            by_id[app_id] = prev

    for a in apps:
        if a.get('pinned') and a['id'] not in by_id:
            by_id[a['id']] = _shortcut_from_app(a)

    items = list(by_id.values()) + others
    items = _order_shortcuts(items)
    # 限制数量但永不丢掉仪表盘/表格编辑
    if len(items) > 12:
        keep_ids = set(ALWAYS_DESKTOP_IDS)
        head = [x for x in items if x.get('app_id') in keep_ids]
        tail = [x for x in items if x.get('app_id') not in keep_ids]
        items = head + tail[: max(0, 12 - len(head))]

    save_shortcuts(user_id, items)
    return items
