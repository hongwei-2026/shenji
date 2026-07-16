"""协同编辑：共享表格会话、权限校验、表格操作。"""
from __future__ import annotations

from typing import Any

import pandas as pd

from modules.data_processor import clean_data, detect_column_types, export_table_snapshot
from modules.database import (
    create_collab_session,
    get_collab_online_members,
    get_collab_session,
    is_collab_member,
    join_collab_session,
    touch_collab_presence,
    update_collab_table,
)


def _snapshot_to_df(snapshot: dict) -> pd.DataFrame:
    columns = snapshot.get('columns') or []
    rows = snapshot.get('rows') or []
    if not columns and rows:
        columns = list(rows[0].keys())
    df = pd.DataFrame(rows, columns=columns)
    return clean_data(df)


def _df_to_snapshot(df: pd.DataFrame, filename: str = '') -> dict:
    return {
        'columns': list(df.columns),
        'rows': df.fillna('').to_dict(orient='records'),
        'filename': filename,
    }


def can_access_collab(session: dict, user_id: int) -> bool:
    """拥有链接并成功 join 的成员均可编辑；不再强制好友关系。"""
    if not session:
        return False
    if session['owner_id'] == user_id:
        return True
    return is_collab_member(session['id'], user_id)


def create_session_from_table(owner_id: int, table_id: str) -> dict:
    snapshot = export_table_snapshot(table_id)
    if not snapshot:
        return {'success': False, 'error': '当前表格不存在，请先上传数据'}
    title = snapshot.get('filename') or '协同表格'
    created = create_collab_session(owner_id, title, snapshot)
    return {
        'success': True,
        'token': created['token'],
        'title': created['title'],
        'share_url': f'/edit?collab={created["token"]}',
        'version': created['version'],
    }


def join_session(token: str, user_id: int) -> dict:
    session = get_collab_session(token)
    if not session:
        return {'success': False, 'error': '协同会话不存在或已失效'}
    # 持有邀请链接即可加入，自动登记为成员
    join_collab_session(session['id'], user_id)
    touch_collab_presence(session['id'], user_id)
    return {
        'success': True,
        'token': token,
        'title': session['title'],
        'owner_id': session['owner_id'],
        'version': session['version'],
    }


def get_sync_state(token: str, user_id: int, since_version: int = 0) -> dict:
    session = get_collab_session(token)
    if not session:
        return {'success': False, 'error': '协同会话不存在'}
    if not can_access_collab(session, user_id):
        return {'success': False, 'error': '无权访问该协同编辑，请通过邀请链接加入'}
    touch_collab_presence(session['id'], user_id)
    changed = session['version'] > since_version
    members = get_collab_online_members(session['id'])
    result = {
        'success': True,
        'version': session['version'],
        'changed': changed,
        'title': session['title'],
        'members': members,
        'updated_at': session['updated_at'],
    }
    if changed or since_version == 0:
        snapshot = session['table_data']
        df = _snapshot_to_df(snapshot)
        result.update({
            'columns': list(df.columns),
            'column_types': detect_column_types(df),
            'total_rows': len(df),
        })
    return result


def get_collab_page(token: str, user_id: int, page: int = 1, per_page: int = 50) -> dict:
    session = get_collab_session(token)
    if not session:
        return {'success': False, 'error': '协同会话不存在'}
    if not can_access_collab(session, user_id):
        return {'success': False, 'error': '无权访问该协同编辑，请通过邀请链接加入'}
    touch_collab_presence(session['id'], user_id)
    df = _snapshot_to_df(session['table_data'])
    total = len(df)
    start = (page - 1) * per_page
    end = start + per_page
    page_df = df.iloc[start:end]
    return {
        'success': True,
        'token': token,
        'title': session['title'],
        'version': session['version'],
        'columns': list(df.columns),
        'column_types': detect_column_types(df),
        'rows': page_df.fillna('').to_dict(orient='records'),
        'total_rows': total,
        'page': page,
        'per_page': per_page,
        'total_pages': max(1, (total + per_page - 1) // per_page),
        'members': get_collab_online_members(session['id']),
    }


def _save_session_df(token: str, df: pd.DataFrame, filename: str) -> dict:
    new_version = update_collab_table(token, _df_to_snapshot(df, filename))
    return {'success': True, 'version': new_version}


def update_collab_cell(token: str, user_id: int, row_idx: int, column: str, value: Any) -> dict:
    session = get_collab_session(token)
    if not session or not can_access_collab(session, user_id):
        return {'success': False, 'error': '无权编辑'}
    df = _snapshot_to_df(session['table_data'])
    try:
        df.at[row_idx, column] = value
    except Exception as e:
        return {'success': False, 'error': str(e)}
    return _save_session_df(token, df, session['title'])


def add_collab_row(token: str, user_id: int, row_data: dict | None = None) -> dict:
    session = get_collab_session(token)
    if not session or not can_access_collab(session, user_id):
        return {'success': False, 'error': '无权编辑'}
    df = _snapshot_to_df(session['table_data'])
    new_row = row_data or {}
    for col in df.columns:
        new_row.setdefault(col, '')
    df = pd.concat([df, pd.DataFrame([new_row])], ignore_index=True)
    result = _save_session_df(token, df, session['title'])
    result['new_index'] = len(df) - 1
    return result


def delete_collab_row(token: str, user_id: int, row_idx: int) -> dict:
    session = get_collab_session(token)
    if not session or not can_access_collab(session, user_id):
        return {'success': False, 'error': '无权编辑'}
    df = _snapshot_to_df(session['table_data'])
    if row_idx < 0 or row_idx >= len(df):
        return {'success': False, 'error': '行索引越界'}
    df = df.drop(df.index[row_idx]).reset_index(drop=True)
    return _save_session_df(token, df, session['title'])


def add_collab_column(token: str, user_id: int, col_name: str, default_value: Any = '') -> dict:
    session = get_collab_session(token)
    if not session or not can_access_collab(session, user_id):
        return {'success': False, 'error': '无权编辑'}
    df = _snapshot_to_df(session['table_data'])
    if col_name in df.columns:
        return {'success': False, 'error': f'列 "{col_name}" 已存在'}
    df[col_name] = default_value
    return _save_session_df(token, df, session['title'])


def delete_collab_column(token: str, user_id: int, col_name: str) -> dict:
    session = get_collab_session(token)
    if not session or not can_access_collab(session, user_id):
        return {'success': False, 'error': '无权编辑'}
    df = _snapshot_to_df(session['table_data'])
    if col_name not in df.columns:
        return {'success': False, 'error': f'列 "{col_name}" 不存在'}
    df = df.drop(columns=[col_name])
    return _save_session_df(token, df, session['title'])


def build_invite_message(token: str, title: str, sender_name: str) -> str:
    return (
        f'[collab:{token}:{title}]'
        f'{sender_name} 邀请你一起协同编辑表格「{title}」，点击链接共同完成校对。'
    )
