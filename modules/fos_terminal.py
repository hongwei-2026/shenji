"""FinanceOS 安全终端：在用户文件空间内执行受限命令。"""
from __future__ import annotations

import shlex
from pathlib import Path
from typing import Any

from modules import fos_filespace as fs


def run_command(user_id: int | str, cmdline: str, cwd: str = '') -> dict[str, Any]:
    cmdline = (cmdline or '').strip()
    if not cmdline:
        return {'success': False, 'error': 'empty', 'cwd': cwd}
    try:
        parts = shlex.split(cmdline)
    except ValueError as e:
        return {'success': False, 'error': str(e), 'cwd': cwd}
    if not parts:
        return {'success': False, 'error': 'empty', 'cwd': cwd}

    cmd = parts[0].lower()
    args = parts[1:]
    cwd = fs._safe_rel(cwd)

    try:
        base = fs.resolve_path(user_id, cwd)
    except ValueError as e:
        return {'success': False, 'error': str(e), 'cwd': cwd}

    if cmd in ('help', '?'):
        return {
            'success': True,
            'cwd': cwd,
            'output': (
                'FinanceOS Terminal (sandboxed)\n'
                'Commands: help, pwd, ls, cd, cat, mkdir, touch, rm, clear, apps, open\n'
            ),
        }

    if cmd == 'pwd':
        return {'success': True, 'cwd': cwd or '/', 'output': '/' + cwd if cwd else '/'}

    if cmd == 'ls':
        target_rel = cwd
        if args:
            target_rel = str(Path(cwd) / args[0]).replace('\\', '/') if cwd else args[0]
        data = fs.list_dir(user_id, target_rel)
        if not data.get('success'):
            return {'success': False, 'cwd': cwd, 'error': data.get('error')}
        lines = []
        for it in data['items']:
            mark = 'd' if it['type'] == 'dir' else '-'
            lines.append(f"{mark}  {it['name']}")
        return {'success': True, 'cwd': cwd, 'output': '\n'.join(lines) or '(empty)'}

    if cmd == 'cd':
        if not args or args[0] == '~':
            return {'success': True, 'cwd': '', 'output': ''}
        nxt = args[0]
        if nxt == '..':
            parent = str(Path(cwd).parent) if cwd else ''
            parent = '' if parent == '.' else parent.replace('\\', '/')
            return {'success': True, 'cwd': parent, 'output': ''}
        new_rel = str(Path(cwd) / nxt).replace('\\', '/') if cwd else nxt
        try:
            p = fs.resolve_path(user_id, new_rel)
        except ValueError as e:
            return {'success': False, 'cwd': cwd, 'error': str(e)}
        if not p.is_dir():
            return {'success': False, 'cwd': cwd, 'error': 'not a directory'}
        return {'success': True, 'cwd': fs._safe_rel(new_rel), 'output': ''}

    if cmd == 'cat':
        if not args:
            return {'success': False, 'cwd': cwd, 'error': 'usage: cat <file>'}
        rel = str(Path(cwd) / args[0]).replace('\\', '/') if cwd else args[0]
        data = fs.read_file(user_id, rel)
        if not data.get('success'):
            return {'success': False, 'cwd': cwd, 'error': data.get('error')}
        return {'success': True, 'cwd': cwd, 'output': data['content']}

    if cmd == 'mkdir':
        if not args:
            return {'success': False, 'cwd': cwd, 'error': 'usage: mkdir <dir>'}
        rel = str(Path(cwd) / args[0]).replace('\\', '/') if cwd else args[0]
        return {**fs.mkdir(user_id, rel), 'cwd': cwd, 'output': ''}

    if cmd == 'touch':
        if not args:
            return {'success': False, 'cwd': cwd, 'error': 'usage: touch <file>'}
        rel = str(Path(cwd) / args[0]).replace('\\', '/') if cwd else args[0]
        return {**fs.write_file(user_id, rel, ''), 'cwd': cwd, 'output': ''}

    if cmd == 'rm':
        if not args:
            return {'success': False, 'cwd': cwd, 'error': 'usage: rm <path>'}
        rel = str(Path(cwd) / args[0]).replace('\\', '/') if cwd else args[0]
        data = fs.delete_path(user_id, rel)
        return {**data, 'cwd': cwd, 'output': '' if data.get('success') else ''}

    if cmd == 'clear':
        return {'success': True, 'cwd': cwd, 'output': '', 'clear': True}

    if cmd == 'apps':
        from modules.financeos import list_apps_for_user
        # apps listed without user object — return static ids
        from modules.financeos import FINANCEOS_APPS
        lines = [f"{a['id']:16} {a['name']}" for a in FINANCEOS_APPS]
        return {'success': True, 'cwd': cwd, 'output': '\n'.join(lines)}

    if cmd == 'open':
        if not args:
            return {'success': False, 'cwd': cwd, 'error': 'usage: open <app_id>'}
        return {
            'success': True,
            'cwd': cwd,
            'output': f'Opening {args[0]}…',
            'open_app': args[0],
        }

    if cmd in ('echo',):
        return {'success': True, 'cwd': cwd, 'output': ' '.join(args)}

    return {
        'success': False,
        'cwd': cwd,
        'error': f'command not found: {cmd}. Type help.',
    }
