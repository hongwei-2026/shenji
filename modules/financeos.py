"""FinanceOS · 桌面应用清单与权限过滤。"""
from __future__ import annotations

from typing import Any

# FinanceOS desktop apps
FINANCEOS_APPS: list[dict[str, Any]] = [
    # —— 财务核算 ——
    {
        'id': 'finance',
        'name': 'Finance',
        'aliases': ['财务', '财务总览', 'finance'],
        'description': '账套概览与经营指标',
        'icon': 'pie-chart',
        'glyph': '财',
        'color': '#0078d4',
        'path': '/finance',
        'feature': 'finance',
        'category': 'finance',
        'pinned': False,
    },
    {
        'id': 'vouchers',
        'name': 'Vouchers',
        'aliases': ['凭证', '记账', 'vouchers'],
        'description': '记账凭证录入与查询',
        'icon': 'journal-text',
        'glyph': '记',
        'color': '#0f766e',
        'path': '/finance/vouchers',
        'feature': 'vouchers',
        'category': 'finance',
        'pinned': False,
    },
    {
        'id': 'receivables',
        'name': 'Receivables',
        'aliases': ['应收', 'receivables'],
        'description': '应收账款与客户往来',
        'icon': 'cash-coin',
        'glyph': '收',
        'color': '#16a34a',
        'path': '/finance/receivables',
        'feature': 'receivables',
        'category': 'finance',
    },
    {
        'id': 'payables',
        'name': 'Payables',
        'aliases': ['应付', 'payables'],
        'description': '应付账款与供应商往来',
        'icon': 'credit-card',
        'glyph': '付',
        'color': '#ea580c',
        'path': '/finance/payables',
        'feature': 'payables',
        'category': 'finance',
    },
    {
        'id': 'invoices',
        'name': 'Invoices',
        'aliases': ['发票', 'invoices'],
        'description': '进销项发票管理',
        'icon': 'receipt',
        'glyph': '票',
        'color': '#ca8a04',
        'path': '/finance/invoices',
        'feature': 'invoices',
        'category': 'finance',
    },
    {
        'id': 'reconciliation',
        'name': 'Bank',
        'aliases': ['银行对账', '对账', 'bank'],
        'description': '银行流水与账面核对',
        'icon': 'bank',
        'glyph': '银',
        'color': '#2563eb',
        'path': '/finance/reconciliation',
        'feature': 'reconciliation',
        'category': 'finance',
    },
    {
        'id': 'travel',
        'name': 'Travel',
        'aliases': ['差旅', '报销', 'travel'],
        'description': '出差费用报销审计',
        'icon': 'airplane',
        'glyph': '差',
        'color': '#7c3aed',
        'path': '/finance/travel-expenses',
        'feature': 'travel_expense_audit',
        'category': 'finance',
    },
    # —— 工作流 ——
    {
        'id': 'approvals',
        'name': 'Approvals',
        'aliases': ['审批', 'approvals'],
        'description': '待办审批与流转',
        'icon': 'check2-square',
        'glyph': '批',
        'color': '#db2777',
        'path': '/workflow/approvals',
        'feature': 'approvals',
        'category': 'workflow',
    },
    {
        'id': 'tasks',
        'name': 'Tasks',
        'aliases': ['任务', 'tasks'],
        'description': '任务分配与跟踪',
        'icon': 'list-task',
        'glyph': '任',
        'color': '#9333ea',
        'path': '/workflow/tasks',
        'feature': 'tasks',
        'category': 'workflow',
    },
    # —— 数据 ——
    {
        'id': 'upload',
        'name': 'Import',
        'aliases': ['导入', '上传', 'import', 'upload'],
        'description': 'CSV / Excel / 截图导入',
        'icon': 'cloud-upload',
        'glyph': '导',
        'color': '#0891b2',
        'path': '/home',
        'feature': 'upload',
        'category': 'data',
        'pinned': True,
    },
    {
        'id': 'edit',
        'name': '表格编辑',
        'aliases': ['编辑', '表格编辑', 'edit', 'Editor', '表格'],
        'description': '在线校对与协同编辑',
        'icon': 'table',
        'glyph': '编',
        'color': '#0d9488',
        'path': '/edit',
        'feature': None,  # 全员可用：桌面核心「表格编辑」
        'category': 'data',
        'pinned': True,
    },
    {
        'id': 'preview',
        'name': 'Preview',
        'aliases': ['预览', 'preview'],
        'description': '上传数据字段预览',
        'icon': 'eye',
        'glyph': '览',
        'color': '#0284c7',
        'path': '/preview',
        'feature': 'preview',
        'category': 'data',
    },
    # —— 审计分析 ——
    {
        'id': 'audit',
        'name': '仪表盘',
        'aliases': ['仪表盘', '审计', '审计概览', 'audit', 'dashboard', 'Dashboard'],
        'description': '三阶段审计与风险看板',
        'icon': 'clipboard2-check',
        'glyph': '盘',
        'color': '#1d4ed8',
        'path': '/dashboard',
        'feature': None,  # 全员可用：桌面核心「仪表盘」
        'category': 'audit',
        'pinned': True,
    },
    {
        'id': 'analysis',
        'name': 'Analysis',
        'aliases': ['规则', '检测', 'analysis'],
        'description': 'Benford / 重复 / 异常规则',
        'icon': 'search',
        'glyph': '规',
        'color': '#4338ca',
        'path': '/analysis',
        'feature': 'analysis',
        'category': 'audit',
    },
    {
        'id': 'report',
        'name': 'Report',
        'aliases': ['报告', 'report'],
        'description': '风险汇总与导出',
        'icon': 'file-earmark-text',
        'glyph': '报',
        'color': '#b45309',
        'path': '/report',
        'feature': 'report',
        'category': 'audit',
    },
    {
        'id': 'history',
        'name': 'History',
        'aliases': ['历史', 'history'],
        'description': '导入与分析存档',
        'icon': 'clock-history',
        'glyph': '史',
        'color': '#475569',
        'path': '/history',
        'feature': 'history',
        'category': 'audit',
    },
    # —— AI（桌面快捷方式，不自动打开）——
    {
        'id': 'ai-agent',
        'name': 'AI',
        'aliases': ['助手', '智能体', 'agent', 'ai', '对话'],
        'description': 'AI Operating System assistant — open apps by chat',
        'icon': 'robot',
        'glyph': 'AI',
        'color': '#6366f1',
        'path': '/os-ai',
        'feature': None,  # 所有登录用户可用
        'category': 'ai',
        'pinned': True,
        'kind': 'ai',
    },
    {
        'id': 'models',
        'name': 'Models',
        'aliases': ['模型', 'models'],
        'description': '本地与云端模型配置',
        'icon': 'cpu',
        'glyph': '模',
        'color': '#4f46e5',
        'path': '/models',
        'feature': 'agent',
        'alt_feature': 'ai',
        'category': 'ai',
    },
    {
        'id': 'agent-dev',
        'name': 'Agent Dev',
        'aliases': ['开发', '扩展'],
        'description': '扩展与工具开发文档',
        'icon': 'code-slash',
        'glyph': '扩',
        'color': '#7c3aed',
        'path': '/agent/develop',
        'feature': 'agent',
        'category': 'ai',
    },
    # —— 协作 ——
    {
        'id': 'chat',
        'name': 'Chat',
        'aliases': ['消息', '聊天', 'chat'],
        'description': '即时消息与会议',
        'icon': 'chat-left-text',
        'glyph': '讯',
        'color': '#059669',
        'path': '/chat',
        'feature': 'chat',
        'category': 'collab',
        'pinned': True,
    },
    # —— 系统：文件 / 终端 / 浏览器 ——
    {
        'id': 'files',
        'name': 'Files',
        'aliases': ['文件', '文件管理器', 'files', 'explorer'],
        'description': 'File manager — Desktop / Documents / Downloads',
        'icon': 'folder2-open',
        'glyph': '📁',
        'color': '#ca8a04',
        'path': '/files',
        'feature': None,
        'category': 'system',
        'pinned': True,
        'kind': 'files',
    },
    {
        'id': 'terminal',
        'name': 'Terminal',
        'aliases': ['终端', 'terminal', 'shell', 'cmd'],
        'description': 'Sandboxed FinanceOS terminal',
        'icon': 'terminal',
        'glyph': '>_',
        'color': '#111827',
        'path': '/terminal',
        'feature': None,
        'category': 'system',
        'pinned': True,
        'kind': 'terminal',
    },
    {
        'id': 'browser',
        'name': 'Browser',
        'aliases': ['浏览器', 'browser'],
        'description': 'Blink + Gecko 双内核浏览器',
        'icon': 'globe2',
        'glyph': '浏',
        'color': '#0078d4',
        'path': '/browser',
        'feature': None,
        'category': 'system',
        'pinned': True,
        'kind': 'browser',
    },
    {
        'id': 'search',
        'name': 'Search',
        'aliases': ['搜索', 'search'],
        'description': 'Meilisearch 全文检索',
        'icon': 'search-heart',
        'glyph': '搜',
        'color': '#ff5caa',
        'path': '/search?q=财务',
        'feature': 'search',
        'category': 'system',
        'pinned': False,
    },
    {
        'id': 'company',
        'name': 'Company',
        'aliases': ['公司', 'company'],
        'description': '成员与权限管理',
        'icon': 'building',
        'glyph': '司',
        'color': '#334155',
        'path': '/company/admin',
        'feature': None,
        'roles': ['company_admin'],
        'category': 'system',
    },
    {
        'id': 'downloads',
        'name': 'Downloads',
        'aliases': ['下载', 'downloads'],
        'description': '客户端与安装包',
        'icon': 'download',
        'glyph': '下',
        'color': '#64748b',
        'path': '/downloads',
        'feature': None,
        'category': 'system',
    },
    {
        'id': 'settings',
        'name': 'Settings',
        'aliases': ['设置', 'settings'],
        'description': '个人资料与系统偏好',
        'icon': 'gear',
        'glyph': '设',
        'color': '#64748b',
        'path': '/profile',
        'feature': None,
        'category': 'system',
        'pinned': True,
    },
]

CATEGORY_LABELS = {
    'finance': 'Finance',
    'workflow': 'Workflow',
    'data': 'Data',
    'audit': 'Audit',
    'ai': 'AI',
    'collab': 'Collab',
    'system': 'System',
}

OS_BRAND = {
    'name': 'FinanceOS',
    'short': 'FinanceOS',
    'tagline': 'AI Financial Operating System',
}


def list_apps_for_user(user: dict | None) -> list[dict[str, Any]]:
    """按角色功能权限过滤桌面应用。"""
    from modules.roles import feature_enabled, get_user_features

    if not user:
        return []
    features = get_user_features(user)
    role = user.get('role') or ''
    apps: list[dict[str, Any]] = []
    for raw in FINANCEOS_APPS:
        app = dict(raw)
        roles = app.get('roles')
        if roles and role not in roles:
            continue
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
    kind = app.get('kind') or ''
    if kind in ('browser', 'files', 'terminal', 'ai') or path.startswith(('/browser', '/files', '/terminal', '/os-ai')):
        return f"{base.rstrip('/')}{path}"
    sep = '&' if '?' in path else '?'
    return f"{base.rstrip('/')}{path}{sep}chrome=os"
