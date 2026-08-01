"""群聊与多人会议功能集成测试。"""
from __future__ import annotations


# ------------------------------------------------------------------
# 辅助
# ------------------------------------------------------------------

def _register(client, username: str):
    """注册并返回登录后的 client。"""
    resp = client.post(
        '/api/auth/register',
        json={
            'username': username,
            'password': 'test1234',
            'role': 'normal_user',
            'theme': 'default',
            'page_style': 'classic',
            'company': 'Test Co',
        },
    )
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True
    return client


def _get_uid(client) -> int:
    """从首页 HTML 中提取当前用户 ID。"""
    resp = client.get('/')
    html = resp.data.decode('utf-8')
    marker = 'window.__currentUserId'
    idx = html.find(marker)
    assert idx != -1, '无法找到 __currentUserId'
    start = html.find('=', idx) + 1
    end = html.find(';', start)
    return int(html[start:end].strip())


# ------------------------------------------------------------------
# 群聊
# ------------------------------------------------------------------

def test_group_requires_auth(client):
    """未登录访问群聊接口返回 401。"""
    resp = client.get('/api/groups/list')
    assert resp.status_code == 401


def test_create_group_and_list(auth_client):
    """创建群聊后能在列表中看到。"""
    # 获取自己的用户 ID
    uid = _get_uid(auth_client)

    resp = auth_client.post(
        '/api/groups/create',
        json={'name': '测试群', 'member_ids': []},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    group = data['group']
    assert group['name'] == '测试群'
    assert group['owner_id'] == uid

    # 列表应包含刚创建的群
    resp = auth_client.get('/api/groups/list')
    assert resp.status_code == 200
    groups = resp.get_json()['groups']
    assert any(g['id'] == group['id'] for g in groups)


def test_group_send_and_receive(auth_client):
    """在群聊中发送消息后能获取到。"""
    auth_client.post('/api/groups/create', json={'name': '消息测试群', 'member_ids': []})
    groups = auth_client.get('/api/groups/list').get_json()['groups']
    gid = groups[0]['id']

    # 发送消息
    resp = auth_client.post(f'/api/groups/{gid}/send', json={'content': '你好群聊'})
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True

    # 获取消息
    resp = auth_client.get(f'/api/groups/{gid}/messages')
    assert resp.status_code == 200
    msgs = resp.get_json()['messages']
    assert len(msgs) == 1
    assert msgs[0]['content'] == '你好群聊'


def test_group_send_empty_rejected(auth_client):
    """空消息被拒绝。"""
    auth_client.post('/api/groups/create', json={'name': '空消息群', 'member_ids': []})
    gid = auth_client.get('/api/groups/list').get_json()['groups'][0]['id']

    resp = auth_client.post(f'/api/groups/{gid}/send', json={'content': ''})
    assert resp.get_json()['success'] is False


def test_group_members(auth_client):
    """创建群后能获取成员列表，包含创建者。"""
    uid = _get_uid(auth_client)
    auth_client.post('/api/groups/create', json={'name': '成员测试群', 'member_ids': []})
    gid = auth_client.get('/api/groups/list').get_json()['groups'][0]['id']

    resp = auth_client.get(f'/api/groups/{gid}/members')
    assert resp.status_code == 200
    members = resp.get_json()['members']
    assert len(members) == 1
    assert members[0]['user_id'] == uid
    assert members[0]['role'] == 'admin'


def test_group_leave(auth_client):
    """退出群聊后不再出现在列表中。"""
    auth_client.post('/api/groups/create', json={'name': '退群测试', 'member_ids': []})
    gid = auth_client.get('/api/groups/list').get_json()['groups'][0]['id']

    resp = auth_client.post(f'/api/groups/{gid}/leave')
    assert resp.get_json()['success'] is True

    groups = auth_client.get('/api/groups/list').get_json()['groups']
    assert not any(g['id'] == gid for g in groups)


def test_group_poll(auth_client):
    """轮询群消息接口正常返回。"""
    auth_client.post('/api/groups/create', json={'name': '轮询群', 'member_ids': []})
    gid = auth_client.get('/api/groups/list').get_json()['groups'][0]['id']
    auth_client.post(f'/api/groups/{gid}/send', json={'content': '轮询消息'})

    resp = auth_client.post('/api/groups/poll', json={'last_ids': {gid: 0}})
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True


# ------------------------------------------------------------------
# 多人会议
# ------------------------------------------------------------------

def test_meeting_requires_auth(client):
    """未登录访问会议接口返回 401。"""
    resp = client.post('/api/meeting/create', json={'title': 'test'})
    assert resp.status_code == 401


def test_create_meeting(auth_client):
    """创建会议返回房间码。"""
    resp = auth_client.post('/api/meeting/create', json={'title': '测试会议'})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    meeting = data['meeting']
    assert meeting['room_code']
    assert meeting['title'] == '测试会议'


def test_join_and_leave_meeting(auth_client):
    """加入会议后参与者列表包含自己，离开后不再包含。"""
    uid = _get_uid(auth_client)
    resp = auth_client.post('/api/meeting/create', json={'title': '加入测试'})
    mid = resp.get_json()['meeting']['id']

    # 加入
    resp = auth_client.post(f'/api/meeting/{mid}/join')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    pids = [p['user_id'] for p in data['participants']]
    assert uid in pids

    # 获取参与者
    resp = auth_client.get(f'/api/meeting/{mid}/participants')
    assert resp.status_code == 200
    assert uid in [p['user_id'] for p in resp.get_json()['participants']]

    # 离开
    resp = auth_client.post(f'/api/meeting/{mid}/leave')
    assert resp.get_json()['success'] is True

    resp = auth_client.get(f'/api/meeting/{mid}/participants')
    assert uid not in [p['user_id'] for p in resp.get_json()['participants']]


def test_meeting_signal(auth_client):
    """发送和轮询会议信令。"""
    uid = _get_uid(auth_client)
    resp = auth_client.post('/api/meeting/create', json={'title': '信令测试'})
    mid = resp.get_json()['meeting']['id']
    auth_client.post(f'/api/meeting/{mid}/join')

    # 发送信令给自己（测试用）
    resp = auth_client.post(
        f'/api/meeting/{mid}/signal',
        json={
            'to_user': uid,
            'signal_type': 'offer',
            'payload': {'sdp': 'test-sdp'},
        },
    )
    assert resp.get_json()['success'] is True

    # 轮询信令
    resp = auth_client.get(f'/api/meeting/{mid}/poll?after_id=0')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert len(data['signals']) == 1
    assert data['signals'][0]['signal_type'] == 'offer'


def test_meeting_signal_missing_params(auth_client):
    """信令缺少参数时返回错误。"""
    resp = auth_client.post('/api/meeting/create', json={'title': '参数测试'})
    mid = resp.get_json()['meeting']['id']

    resp = auth_client.post(
        f'/api/meeting/{mid}/signal',
        json={'to_user': 0, 'signal_type': '', 'payload': {}},
    )
    assert resp.get_json()['success'] is False


def test_join_by_invalid_code(auth_client):
    """无效会议码返回错误。"""
    resp = auth_client.post('/api/meeting/join-by-code', json={'code': 'invalid-code'})
    assert resp.get_json()['success'] is False


def test_join_by_valid_code(auth_client):
    """通过有效会议码加入会议。"""
    uid = _get_uid(auth_client)
    resp = auth_client.post('/api/meeting/create', json={'title': '码加入测试'})
    code = resp.get_json()['meeting']['room_code']

    resp = auth_client.post('/api/meeting/join-by-code', json={'code': code})
    assert resp.status_code == 200
    assert resp.get_json()['success'] is True
    assert uid in [p['user_id'] for p in resp.get_json()['participants']]


def test_end_meeting(auth_client):
    """创建者能结束会议，结束后会议码失效。"""
    resp = auth_client.post('/api/meeting/create', json={'title': '结束测试'})
    data = resp.get_json()
    mid = data['meeting']['id']
    code = data['meeting']['room_code']

    # 结束会议
    resp = auth_client.post(f'/api/meeting/{mid}/end')
    assert resp.get_json()['success'] is True

    # 结束后用码加入应失败
    resp = auth_client.post('/api/meeting/join-by-code', json={'code': code})
    assert resp.get_json()['success'] is False


def test_end_meeting_not_creator(auth_client, client):
    """非创建者不能结束会议。"""
    # 用户 A 创建会议
    resp = auth_client.post('/api/meeting/create', json={'title': '权限测试'})
    mid = resp.get_json()['meeting']['id']

    # 用户 B 注册并登录
    _register(client, 'meeting_user_b')
    # B 尝试结束 A 创建的会议
    resp = client.post(f'/api/meeting/{mid}/end')
    assert resp.get_json()['success'] is False
