"""共享测试夹具：示例财务数据、Flask 测试客户端。"""
from __future__ import annotations

import os
import sys

import pandas as pd
import pytest

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)


@pytest.fixture
def sample_df() -> pd.DataFrame:
    """构造足够触发审计规则与异常检测的财务样例数据。"""
    rows = []
    for i in range(1, 31):
        amount = 1000.0 + i * 10
        if i in (5, 12):
            amount = 99999.0
        if i == 8:
            amount = -200.0
        if i == 15:
            amount = 10000.0
        rows.append({
            '日期': f'2024-01-{(i % 28) + 1:02d}',
            '凭证号': f'V{i:03d}',
            '科目': '办公费' if i % 2 == 0 else '差旅费',
            '部门': '财务部' if i % 3 == 0 else '行政部',
            '摘要': f'测试交易{i}',
            '金额': amount,
            '备注': '',
        })
    # 完全重复一行，供重复交易规则检测
    rows.append(dict(rows[4]))
    return pd.DataFrame(rows)


@pytest.fixture
def sample_csv(tmp_path, sample_df) -> str:
    path = tmp_path / 'sample_finance.csv'
    sample_df.to_csv(path, index=False, encoding='utf-8-sig')
    return str(path)


@pytest.fixture
def app(tmp_path, monkeypatch):
    """隔离 SQLite / uploads 后提供 Flask app。"""
    data_dir = tmp_path / 'data'
    data_dir.mkdir()
    uploads = tmp_path / 'uploads'
    uploads.mkdir()

    monkeypatch.setenv('FLASK_DEBUG', '0')
    monkeypatch.chdir(ROOT)

    import modules.database as database
    monkeypatch.setattr(database, 'DB_DIR', str(data_dir))
    monkeypatch.setattr(database, 'DB_PATH', str(data_dir / 'audit_history.db'))
    database._db_initialized = False

    import modules.data_processor as dp
    monkeypatch.setattr(dp, 'UPLOAD_FOLDER', str(uploads))
    dp._tables.clear()
    dp._active_table_id = None
    dp._counter = 0

    from app import app as flask_app

    flask_app.config['TESTING'] = True
    flask_app.config['SECRET_KEY'] = 'test-secret'
    database.init_db()

    yield flask_app

    dp._tables.clear()
    dp._active_table_id = None


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def auth_client(client):
    """注册并登录测试用户。"""
    resp = client.post(
        '/api/auth/register',
        json={
            'username': 'ci_tester',
            'password': 'test1234',
            'role': 'normal_user',
            'theme': 'default',
            'page_style': 'classic',
            'company': 'CI Test Co',
        },
    )
    data = resp.get_json()
    assert resp.status_code == 200
    assert data and data.get('success') is True, data
    return client
