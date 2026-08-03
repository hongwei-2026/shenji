"""FinanceOS 桌面应用清单与权限过滤。"""
from __future__ import annotations

from typing import Any

# 首期独立软件：id → 元数据
FINANCEOS_APPS: list[dict[str, Any]] = [
    {
        'id': 'vouchers',
        'name': '凭证',
        'description': '记账凭证录入与查询',
        'icon': 'journal-text',
        'path': '/finance/vouchers',
        'feature': 'vouchers',
        'category': 'finance',
    },
    {
        'id': 'receivables',
        'name': '应收',
        'description': '应收账款与客户往来',
        'icon': 'cash-coin',
        'path': '/finance/receivables',
        'feature': 'receivables',
        'category': 'finance',
    },
    {
        'id': 'payables',
        'name': '应付',
        'description': '应付账款与供应商往来',
        'icon': 'credit-card',
        'path': '/finance/payables',
        'feature': 'payables',
        'category': 'finance',
    },
    {
        'id': 'invoices',
        'name': '发票',
        'description': '进销项发票管理',
        'icon': 'receipt',
        'path': '/finance/invoices',
        'feature': 'invoices',
        'category': 'finance',
    },
    {
        'id': 'audit',
        'name': '审计',
        'description': '审计概览与规则检测',
        'icon': 'clipboard2-check',
        'path': '/dashboard',
        'feature': 'dashboard',
        'alt_feature': 'analysis',
        'alt_path': '/analysis',
        'category': 'audit',
    },
    {
        'id': 'chat',
        'name': '消息',
        'description': '即时消息与会议',
        'icon': 'chat-left-text',
        'path': '/chat',
        'feature': 'chat',
        'category': 'collab',
    },
    {
        'id': 'settings',
        'name': '设置',
        'description': '个人资料与系统偏好',
        'icon': 'gear',
        'path': '/profile',
        'feature': None,  # 登录用户均可
        'category': 'system',
    },
]

CATEGORY_LABELS = {
    'finance': '财务',
    'audit': '审计',
    'collab': '协作',
    'system': '系统',
}


def list_apps_for_user(user: dict | None) -> list[dict[str, Any]]:
    """按角色功能权限过滤桌面应用。"""
    from modules.roles import feature_enabled, get_user_features

    if not user:
        return []
    features = get_user_features(user)
    apps: list[dict[str, Any]] = []
    for raw in FINANCEOS_APPS:
        app = dict(raw)
        feat = app.get('feature')
        alt = app.get('alt_feature')
        if feat is None:
            apps.append(app)
            continue
        if feature_enabled(user, feat) or features.get(feat):
            apps.append(app)
            continue
        if alt and (feature_enabled(user, alt) or features.get(alt)):
            app['path'] = app.get('alt_path') or app['path']
            app['feature'] = alt
            apps.append(app)
    return apps


def app_url(app: dict[str, Any], base: str = '') -> str:
    path = app.get('path') or '/'
    sep = '&' if '?' in path else '?'
    return f"{base.rstrip('/')}{path}{sep}chrome=os"
