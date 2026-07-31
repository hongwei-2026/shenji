"""财务核算模块 — 科目、凭证、总账（同公司共享工作区）。"""
from __future__ import annotations

from datetime import datetime
from typing import Any

from modules.company_scope import emit_company_event, resolve_company_workspace_id
from modules.database import (
    create_fin_voucher,
    ensure_finance_seed,
    get_fin_accounts,
    get_finance_overview,
    list_fin_vouchers,
    post_fin_voucher,
)


def _scope(user_id: int) -> int:
    return resolve_company_workspace_id(user_id)


def init_user_finance(user_id: int) -> None:
    ensure_finance_seed(_scope(user_id))


def overview(user_id: int) -> dict:
    init_user_finance(user_id)
    data = get_finance_overview(_scope(user_id))
    data['shared_workspace'] = _scope(user_id) != int(user_id)
    data['workspace_user_id'] = _scope(user_id)
    return data


def accounts(user_id: int) -> list[dict]:
    init_user_finance(user_id)
    return get_fin_accounts(_scope(user_id))


def vouchers(user_id: int, *, limit: int = 50, status: str | None = None) -> list[dict]:
    init_user_finance(user_id)
    return list_fin_vouchers(_scope(user_id), limit=limit, status=status)


def create_voucher(user_id: int, payload: dict) -> dict:
    init_user_finance(user_id)
    scope_id = _scope(user_id)
    lines = payload.get('lines') or []
    if len(lines) < 2:
        return {'success': False, 'error': '凭证至少需要两条分录'}
    debit = sum(float(ln.get('debit') or 0) for ln in lines)
    credit = sum(float(ln.get('credit') or 0) for ln in lines)
    if abs(debit - credit) > 0.01:
        return {'success': False, 'error': f'借贷不平衡：借方 {debit:.2f} ≠ 贷方 {credit:.2f}'}
    # 校验科目存在
    acct_codes = {a['code'] for a in get_fin_accounts(scope_id)}
    for ln in lines:
        code = str(ln.get('account_code') or '').strip()
        if not code or code not in acct_codes:
            return {'success': False, 'error': f'无效科目编码：{code or "（空）"}，请从下拉列表选择'}
    try:
        from modules.database import get_fin_voucher_detail
        from modules.enterprise_db import save_doc_version

        summary = payload.get('summary') or '记账凭证'
        vid = create_fin_voucher(
            scope_id,
            voucher_date=payload.get('voucher_date') or datetime.now().strftime('%Y-%m-%d'),
            summary=summary,
            lines=lines,
            auto_post=bool(payload.get('auto_post')),
            created_by=user_id,
        )
        detail = get_fin_voucher_detail(scope_id, vid)
        if detail:
            save_doc_version(scope_id, 'voucher', vid, detail, message='创建凭证', author_id=user_id)
        emit_company_event(
            user_id, 'vouchers', 'create',
            f'新建凭证 {detail.get("voucher_no") if detail else vid}：{summary}',
            ref_type='voucher', ref_id=vid,
        )
        return {'success': True, 'voucher_id': vid}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def submit_voucher_approval(user_id: int, voucher_id: int, approver_id: int | None = None) -> dict:
    init_user_finance(user_id)
    scope_id = _scope(user_id)
    from modules.database import get_fin_voucher_detail
    from modules.enterprise_db import create_approval

    detail = get_fin_voucher_detail(scope_id, voucher_id)
    if not detail:
        return {'success': False, 'error': '凭证不存在'}
    if detail['status'] != 'draft':
        return {'success': False, 'error': '仅草稿凭证可提交审批'}
    aids = [approver_id] if approver_id else [user_id]
    aid = create_approval(
        scope_id, 'voucher', voucher_id,
        f'凭证过账审批 {detail["voucher_no"]}',
        aids,
    )
    emit_company_event(
        user_id, 'vouchers', 'submit_approval',
        f'提交审批 {detail["voucher_no"]}',
        ref_type='voucher', ref_id=voucher_id,
    )
    return {'success': True, 'approval_id': aid}


def approve_voucher(user_id: int, voucher_id: int) -> dict:
    init_user_finance(user_id)
    scope_id = _scope(user_id)
    try:
        from modules.database import get_fin_voucher_detail
        from modules.enterprise_db import save_doc_version

        post_fin_voucher(scope_id, voucher_id)
        detail = get_fin_voucher_detail(scope_id, voucher_id)
        if detail:
            save_doc_version(scope_id, 'voucher', voucher_id, detail, message='审核记账', author_id=user_id)
        emit_company_event(
            user_id, 'vouchers', 'post',
            f'记账 {detail.get("voucher_no") if detail else voucher_id}',
            ref_type='voucher', ref_id=voucher_id,
        )
        return {'success': True, 'voucher_id': voucher_id, 'status': 'posted'}
    except Exception as e:
        return {'success': False, 'error': str(e)}


def agent_summary(user_id: int) -> dict[str, Any]:
    """供 Agent 工具使用的财务摘要。"""
    data = overview(user_id)
    recent = vouchers(user_id, limit=5)
    return {
        'period': data.get('current_period'),
        'totals': data.get('totals'),
        'top_accounts': data.get('top_accounts', [])[:6],
        'recent_vouchers': [
            {'no': v['voucher_no'], 'date': v['voucher_date'], 'summary': v['summary'], 'status': v['status']}
            for v in recent
        ],
        'voucher_counts': data.get('voucher_counts'),
        'shared_workspace': data.get('shared_workspace'),
    }
