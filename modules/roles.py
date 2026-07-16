"""用户角色、主题与功能权限配置。"""
from __future__ import annotations

import json

ROLES: dict[str, str] = {
    'audit_manager': '审计经理',
    'finance_director': '财务主管',
    'accountant': '会计',
    'auditor': '审计',
    'cashier': '出纳',
    'tax_assistant': '税务助理',
    'consultant': '顾问',
    'normal_user': '普通用户',
    'student': '学生',
}

PROFESSIONAL_ROLES = [
    'audit_manager', 'finance_director', 'accountant', 'auditor',
    'cashier', 'tax_assistant', 'consultant',
]
CUSTOMIZABLE_ROLES = ['normal_user', 'student']

THEMES = {
    'default': '暖沙经典',
    'dark': '深色专业',
    'ocean': '海蓝清爽',
    'forest': '墨绿沉稳',
    'slate': '岩灰商务',
    'rose': '玫红活力',
}

PAGE_STYLES = {
    'classic': '经典侧栏',
    'compact': '紧凑模式',
    'spacious': '宽松模式',
}

ALL_FEATURES = {
    'upload': '数据导入',
    'edit': '表格编辑',
    'preview': '数据预览',
    'dashboard': '审计概览',
    'analysis': '规则检测',
    'report': '审计报告',
    'history': '历史记录',
    'chat': '消息协作',
    'video': '视频通话',
    'collab': '协同编辑',
    'search': '全文检索',
    'ai': '智能助手',
    'agent': 'AI Agent',
}

ROLE_DEFAULTS: dict[str, dict] = {
    'audit_manager': {
        'theme': 'slate', 'page_style': 'classic',
        'features': {k: True for k in ALL_FEATURES},
    },
    'finance_director': {
        'theme': 'ocean', 'page_style': 'classic',
        'features': {k: True for k in ALL_FEATURES},
    },
    'accountant': {
        'theme': 'default', 'page_style': 'classic',
        'features': {k: k not in ('dashboard',) for k in ALL_FEATURES} | {'dashboard': True, 'upload': True, 'edit': True, 'preview': True, 'analysis': True, 'report': True},
    },
    'auditor': {
        'theme': 'forest', 'page_style': 'classic',
        'features': {k: True for k in ALL_FEATURES},
    },
    'cashier': {
        'theme': 'ocean', 'page_style': 'compact',
        'features': {k: k in ('upload', 'edit', 'preview', 'history', 'chat', 'video', 'search', 'ai', 'agent') for k in ALL_FEATURES},
    },
    'tax_assistant': {
        'theme': 'rose', 'page_style': 'classic',
        'features': {k: k in ('upload', 'preview', 'analysis', 'report', 'history', 'chat', 'video', 'search', 'ai', 'agent') for k in ALL_FEATURES},
    },
    'consultant': {
        'theme': 'dark', 'page_style': 'spacious',
        'features': {k: True for k in ALL_FEATURES},
    },
    'normal_user': {
        'theme': 'default', 'page_style': 'classic',
        'features': {k: True for k in ALL_FEATURES},
    },
    'student': {
        'theme': 'ocean', 'page_style': 'spacious',
        'features': {k: k != 'report' for k in ALL_FEATURES} | {'report': False},
    },
}


def parse_preferences(raw: str | dict | None) -> dict:
    if isinstance(raw, dict):
        return raw
    if not raw:
        return {}
    try:
        return json.loads(raw)
    except (json.JSONDecodeError, TypeError):
        return {}


def get_role_label(role: str | None) -> str:
    return ROLES.get(role or 'normal_user', '普通用户')


def resolve_registration_profile(data: dict) -> dict:
    """根据注册表单解析角色、主题与功能。"""
    role = (data.get('role') or 'normal_user').strip()
    if role not in ROLES:
        role = 'normal_user'

    defaults = ROLE_DEFAULTS.get(role, ROLE_DEFAULTS['normal_user'])
    theme = defaults['theme']
    page_style = defaults['page_style']
    features = dict(defaults['features'])

    if role in CUSTOMIZABLE_ROLES:
        theme = data.get('theme') or theme
        if theme not in THEMES:
            theme = 'default'
        page_style = data.get('page_style') or page_style
        if page_style not in PAGE_STYLES:
            page_style = 'classic'
        if isinstance(data.get('features'), dict):
            for key in ALL_FEATURES:
                if key in data['features']:
                    features[key] = bool(data['features'][key])

    prefs: dict = {
        'features': features,
        'accent_color': data.get('accent_color') or None,
    }
    if role in CUSTOMIZABLE_ROLES and data.get('accent_color'):
        prefs['accent_color'] = data['accent_color']

    return {
        'role': role,
        'theme': theme,
        'page_style': page_style,
        'preferences': prefs,
    }


def get_user_features(user: dict | None) -> dict[str, bool]:
    if not user:
        return {k: True for k in ALL_FEATURES}
    prefs = parse_preferences(user.get('preferences'))
    features = prefs.get('features')
    if isinstance(features, dict):
        merged = {k: bool(features.get(k, True)) for k in ALL_FEATURES}
    else:
        role = user.get('role') or 'normal_user'
        merged = dict(ROLE_DEFAULTS.get(role, ROLE_DEFAULTS['normal_user'])['features'])
    # 启用 AI 助手时同步开放 Agent 工作台与开发工作室
    if merged.get('ai', True):
        merged['agent'] = True
    return merged


def feature_enabled(user: dict | None, feature: str) -> bool:
    return get_user_features(user).get(feature, True)
