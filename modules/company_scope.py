"""同公司工作区：财务等业务数据按公司共享，并向同功能同事推送同步事件。"""
from __future__ import annotations

from datetime import datetime

from modules.database import _connect, get_user_by_id, init_db


def _ensure_sync_schema() -> None:
    init_db()
    with _connect() as conn:
        conn.execute(
            '''CREATE TABLE IF NOT EXISTS company_sync_events (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                company TEXT NOT NULL,
                feature TEXT NOT NULL,
                action TEXT NOT NULL,
                summary TEXT,
                ref_type TEXT,
                ref_id INTEGER,
                actor_id INTEGER NOT NULL,
                actor_name TEXT,
                created_at TEXT NOT NULL
            )'''
        )
        conn.execute(
            'CREATE INDEX IF NOT EXISTS idx_company_sync_company_id ON company_sync_events(company, id)'
        )
        conn.commit()


def get_user_company_name(user_id: int) -> str:
    user = get_user_by_id(user_id) or {}
    return (user.get('company') or '').strip()


def resolve_company_workspace_id(user_id: int) -> int:
    """
    同公司员工共享同一财务工作区（取该公司最早注册用户的 id 作为数据归属）。
    未填公司则仍用个人工作区。
    """
    company = get_user_company_name(user_id)
    if not company:
        return int(user_id)
    init_db()
    with _connect() as conn:
        # 优先系统管理员，否则最早用户
        row = conn.execute(
            '''SELECT id FROM users
               WHERE TRIM(company)=? AND role='company_admin'
               ORDER BY id ASC LIMIT 1''',
            (company,),
        ).fetchone()
        if not row:
            row = conn.execute(
                '''SELECT id FROM users WHERE TRIM(company)=? ORDER BY id ASC LIMIT 1''',
                (company,),
            ).fetchone()
    if row:
        return int(row['id'])
    return int(user_id)


def list_company_member_ids(user_id: int) -> list[int]:
    company = get_user_company_name(user_id)
    if not company:
        return [int(user_id)]
    init_db()
    with _connect() as conn:
        rows = conn.execute(
            'SELECT id FROM users WHERE TRIM(company)=? ORDER BY id',
            (company,),
        ).fetchall()
    return [int(r['id']) for r in rows] or [int(user_id)]


def emit_company_event(
    actor_id: int,
    feature: str,
    action: str,
    summary: str = '',
    *,
    ref_type: str = '',
    ref_id: int = 0,
) -> int | None:
    """写入公司同步事件；无公司则不写（个人数据无需广播）。"""
    company = get_user_company_name(actor_id)
    if not company:
        return None
    _ensure_sync_schema()
    user = get_user_by_id(actor_id) or {}
    now = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    with _connect() as conn:
        cur = conn.execute(
            '''INSERT INTO company_sync_events
               (company, feature, action, summary, ref_type, ref_id, actor_id, actor_name, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)''',
            (
                company, feature, action, summary or '',
                ref_type or '', int(ref_id or 0),
                int(actor_id), user.get('username') or '',
                now,
            ),
        )
        conn.commit()
        return int(cur.lastrowid)


def list_company_events(user_id: int, since_id: int = 0, limit: int = 40) -> list[dict]:
    company = get_user_company_name(user_id)
    if not company:
        return []
    _ensure_sync_schema()
    with _connect() as conn:
        rows = conn.execute(
            '''SELECT * FROM company_sync_events
               WHERE company=? AND id>?
               ORDER BY id ASC LIMIT ?''',
            (company, int(since_id or 0), limit),
        ).fetchall()
    # 不回传自己刚发的？仍回传，前端可过滤 actor
    return [dict(r) for r in rows]
