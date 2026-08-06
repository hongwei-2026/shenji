"""FinanceOS 工作辅助：根据当前应用自动建议 / 打开相关应用。"""
from __future__ import annotations

from typing import Any

# 当前应用 → 建议同时打开的辅助应用
ASSIST_MAP: dict[str, list[dict[str, Any]]] = {
    'vouchers': [
        {'app_id': 'invoices', 'reason': '核对发票与凭证'},
        {'app_id': 'finance', 'reason': '查看账套概览'},
    ],
    'invoices': [
        {'app_id': 'vouchers', 'reason': '关联记账凭证'},
        {'app_id': 'receivables', 'reason': '核对应收'},
    ],
    'receivables': [
        {'app_id': 'invoices', 'reason': '发票勾稽'},
        {'app_id': 'chat', 'reason': '联系客户/同事'},
    ],
    'payables': [
        {'app_id': 'invoices', 'reason': '进项发票核对'},
        {'app_id': 'reconciliation', 'reason': '付款对账'},
    ],
    'reconciliation': [
        {'app_id': 'payables', 'reason': '应付核对'},
        {'app_id': 'finance', 'reason': '资金概览'},
    ],
    'audit': [
        {'app_id': 'analysis', 'reason': '运行规则检测'},
        {'app_id': 'report', 'reason': '生成审计报告'},
        {'app_id': 'ai-agent', 'reason': 'AI 辅助分析'},
    ],
    'analysis': [
        {'app_id': 'audit', 'reason': '回到审计概览'},
        {'app_id': 'report', 'reason': '导出报告'},
    ],
    'upload': [
        {'app_id': 'edit', 'reason': '校对导入数据'},
        {'app_id': 'preview', 'reason': '预览字段'},
    ],
    'edit': [
        {'app_id': 'preview', 'reason': '数据预览'},
        {'app_id': 'analysis', 'reason': '规则检测'},
    ],
    'report': [
        {'app_id': 'history', 'reason': '历史存档'},
        {'app_id': 'ai-agent', 'reason': '解读报告'},
    ],
    'chat': [
        {'app_id': 'files', 'reason': '发送/查阅文件'},
    ],
    'files': [
        {'app_id': 'terminal', 'reason': '命令行操作'},
    ],
}


def suggest_for(app_id: str) -> list[dict[str, Any]]:
    raw = ASSIST_MAP.get(app_id) or []
    out = []
    for item in raw:
        aid = item.get('app_id_alt') or item.get('app_id')
        out.append({
            'app_id': aid,
            'reason': item.get('reason') or '辅助工作',
            'auto_open': False,
        })
    return out
