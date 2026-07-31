#!/usr/bin/env python3
"""PR 变更门禁：改了业务代码就必须带测试；禁止提交密钥类文件。"""
from __future__ import annotations

import os
import subprocess
import sys

FORBIDDEN_SUFFIXES = (
    '.pem', '.p12', '.pfx', '.key', '.secret',
)
FORBIDDEN_NAMES = {
    '.env', 'credentials.json', 'service-account.json', 'id_rsa',
}
SOURCE_PREFIXES = ('modules/', 'app.py')
TEST_PREFIXES = ('tests/',)


def _changed_files() -> list[str]:
    base = os.environ.get('GITHUB_BASE_REF') or os.environ.get('DIFF_BASE') or 'origin/master'
    # GitHub Actions checkout 通常有 origin/$base
    candidates = [f'origin/{base}', base, 'HEAD~1']
    for ref in candidates:
        try:
            out = subprocess.check_output(
                ['git', 'diff', '--name-only', '--diff-filter=ACMR', f'{ref}...HEAD'],
                text=True,
                stderr=subprocess.DEVNULL,
            )
            files = [line.strip().replace('\\', '/') for line in out.splitlines() if line.strip()]
            if files or ref == candidates[-1]:
                return files
        except subprocess.CalledProcessError:
            continue
    return []


def main() -> int:
    files = _changed_files()
    if not files:
        print('No changed files detected; skip PR change checks.')
        return 0

    print('Changed files:')
    for f in files:
        print(f'  - {f}')

    errors: list[str] = []

    for f in files:
        name = os.path.basename(f)
        if name in FORBIDDEN_NAMES or f.endswith(FORBIDDEN_SUFFIXES):
            errors.append(f'Forbidden secret-like file in PR: {f}')

    src_changed = [
        f for f in files
        if (f == 'app.py' or f.startswith('modules/')) and f.endswith('.py')
    ]
    test_changed = [
        f for f in files
        if f.startswith('tests/') and f.endswith('.py')
    ]

    if src_changed and not test_changed:
        errors.append(
            'Business Python code changed without updating tests/. '
            f'Changed: {", ".join(src_changed[:8])}'
        )

    large = []
    for f in files:
        if not os.path.isfile(f):
            continue
        size = os.path.getsize(f)
        # 1.5MB soft limit for non-binary samples
        if size > 1_500_000 and not f.startswith('static/vendor/'):
            large.append(f'{f} ({size // 1024} KiB)')
    if large:
        errors.append('Oversized files (keep PRs reviewable): ' + '; '.join(large))

    if errors:
        print('\nPR quality check FAILED:')
        for e in errors:
            print(f'  ✗ {e}')
        return 1

    print('\nPR change checks passed.')
    return 0


if __name__ == '__main__':
    sys.exit(main())
