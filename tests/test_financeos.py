"""FinanceOS 桌面与关键功能回归测试。"""
from __future__ import annotations


def test_financeos_health_public(client):
    resp = client.get('/api/financeos/health')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert data['service'] == 'financeosd'


def test_financeos_apps_requires_auth(client):
    resp = client.get('/api/financeos/apps')
    assert resp.status_code == 401


def test_login_page_is_financeos(client):
    resp = client.get('/login')
    assert resp.status_code == 200
    html = resp.get_data(as_text=True)
    assert 'FinanceOS' in html
    assert '注册并进入桌面' in html or 'regBtn' in html or 'Enter FinanceOS' in html


def test_root_redirects_to_os(auth_client):
    resp = auth_client.get('/', follow_redirects=False)
    assert resp.status_code in (302, 301)
    assert '/os' in (resp.headers.get('Location') or '')


def test_os_desktop_page(auth_client):
    resp = auth_client.get('/os')
    assert resp.status_code == 200
    html = resp.get_data(as_text=True)
    assert 'FinanceOS' in html
    assert 'icon-grid' in html
    assert 'financeos-desktop' in html
    assert 'aiCmdForm' in html
    assert 'startMenu' in html
    assert 'startCategories' in html
    assert 'startSmoke' in html
    assert 'folderFlyout' in html
    assert 'AI 财务助手' not in html
    assert '系统搜索' not in html
    assert '财务核算' not in html


def test_browser_page(auth_client):
    resp = auth_client.get('/browser')
    assert resp.status_code == 200
    html = resp.get_data(as_text=True)
    assert 'Blink' in html and 'Gecko' in html


def test_browser_home_api(auth_client):
    resp = auth_client.get('/api/browser/home')
    assert resp.status_code == 200
    assert '双内核' in resp.get_data(as_text=True)


def test_financeos_apps_include_core_and_browser(client):
    reg = client.post(
        '/api/auth/register',
        json={
            'username': 'fos_auditor_full',
            'password': 'test1234',
            'role': 'auditor',
            'company': 'FOS Audit',
        },
    )
    assert reg.get_json().get('success') is True, reg.get_json()
    apps_resp = client.get('/api/financeos/apps')
    data = apps_resp.get_json()
    ids = {a['id'] for a in data['apps']}
    assert 'browser' in ids
    assert 'audit' in ids
    assert 'ai-agent' in ids or 'search' in ids
    assert 'upload' in ids
    assert 'vouchers' not in ids



def test_financeos_apps_filtered_by_role(client):
    # 会计：有凭证，无审计概览
    reg = client.post(
        '/api/auth/register',
        json={
            'username': 'fos_accountant',
            'password': 'test1234',
            'role': 'accountant',
            'company': 'FOS Co',
        },
    )
    assert reg.get_json().get('success') is True, reg.get_json()

    apps_resp = client.get('/api/financeos/apps')
    assert apps_resp.status_code == 200
    data = apps_resp.get_json()
    assert data['success'] is True
    ids = {a['id'] for a in data['apps']}
    assert 'vouchers' in ids
    assert 'settings' in ids
    assert 'audit' in ids  # 仪表盘为全员核心应用
    assert 'edit' in ids   # 表格编辑为全员核心应用
    # 会计仍无深度审计报告签发类（若仍按 feature 过滤）
    # report 仍受角色限制
    assert 'report' not in ids


def test_register_normal_user_without_company(client):
    resp = client.post(
        '/api/auth/register',
        json={
            'username': 'fos_normal_1',
            'password': 'test1234',
            'role': 'normal_user',
            'company': '',
            'next': '/os',
        },
    )
    data = resp.get_json()
    assert resp.status_code == 200
    assert data.get('success') is True, data
    assert data.get('redirect') == '/os'


def test_register_professional_requires_company(client):
    resp = client.post(
        '/api/auth/register',
        json={
            'username': 'fos_acc_nocompany',
            'password': 'test1234',
            'role': 'accountant',
            'company': '',
        },
    )
    data = resp.get_json()
    assert data.get('success') is False
    assert '公司' in (data.get('error') or '')


def test_chrome_os_mode_hides_sidebar(auth_client):
    resp = auth_client.get('/profile?chrome=os')
    assert resp.status_code == 200
    html = resp.get_data(as_text=True)
    assert 'financeos-chrome' in html
    assert 'app-sidebar' not in html


def test_classic_home_available(auth_client):
    resp = auth_client.get('/home')
    assert resp.status_code == 200


def test_list_apps_helper_rbac():
    from modules.financeos import list_apps_for_user

    auditor = {'id': 1, 'role': 'auditor', 'preferences': '{}', 'company': 'X'}
    ids = {a['id'] for a in list_apps_for_user(auditor)}
    assert 'audit' in ids
    assert 'browser' in ids
    assert 'files' in ids
    assert 'terminal' in ids
    assert 'vouchers' not in ids

    accountant = {'id': 2, 'role': 'accountant', 'preferences': '{}', 'company': 'X'}
    ids2 = {a['id'] for a in list_apps_for_user(accountant)}
    assert 'vouchers' in ids2
    assert 'audit' in ids2  # 仪表盘全员可见
    assert 'edit' in ids2
    assert 'browser' in ids2
    assert 'ai-agent' in ids2
    assert 'report' not in ids2


def test_os_desktop_has_ai_logo_and_assist(auth_client):
    resp = auth_client.get('/os')
    html = resp.get_data(as_text=True)
    assert 'fos-logo' in html
    assert 'assistBar' in html
    assert '仪表盘' in html
    assert '表格编辑' in html
    assert 'win-logo' not in html


def test_ai_files_terminal_pages(auth_client):
    for path in ('/os-ai', '/files', '/terminal'):
        resp = auth_client.get(path)
        assert resp.status_code == 200, path


def test_fos_shortcuts_and_files_api(auth_client):
    sc = auth_client.get('/api/fos/shortcuts')
    assert sc.status_code == 200
    data = sc.get_json()
    assert data['success'] is True
    ids = {i.get('app_id') for i in data['items']}
    assert 'ai-agent' in ids
    assert 'audit' in ids or 'edit' in ids  # role-dependent core apps
    names = {i.get('name') for i in data['items']}
    # 若有审计权限，桌面应显示「仪表盘」
    if 'audit' in ids:
        assert '仪表盘' in names
    if 'edit' in ids:
        assert '表格编辑' in names

    files = auth_client.get('/api/fos/files?path=Desktop')
    assert files.status_code == 200
    assert files.get_json()['success'] is True

    term = auth_client.post('/api/fos/terminal', json={'cmd': 'help', 'cwd': 'Desktop'})
    assert term.status_code == 200
    assert 'help' in (term.get_json().get('output') or '').lower()


def test_fos_assist_suggestions():
    from modules.fos_assist import suggest_for

    s = suggest_for('audit')
    assert any(x['app_id'] == 'analysis' for x in s)
    assert s[0].get('auto_open') is False
