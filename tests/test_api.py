"""Flask API 集成测试（含登录态）。"""
from __future__ import annotations

import json


def test_public_login_page(client):
    resp = client.get('/login')
    assert resp.status_code == 200


def test_api_requires_auth(client):
    resp = client.get('/api/history')
    assert resp.status_code == 401
    data = resp.get_json()
    assert data.get('login_required') is True


def test_auth_roles(client):
    resp = client.get('/api/auth/roles')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data['success'] is True
    assert 'roles' in data


def test_register_login_and_history(auth_client):
    resp = auth_client.get('/api/history')
    assert resp.status_code == 200
    data = resp.get_json()
    assert data.get('success') is True


def test_upload_and_dashboard(auth_client, sample_csv):
    with open(sample_csv, 'rb') as f:
        resp = auth_client.post(
            '/api/upload',
            data={'files': (f, 'sample_finance.csv')},
            content_type='multipart/form-data',
        )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data.get('success') is True, data
    assert 'history_id' in data or 'audit_summary' in data or 'tables' in data

    dash = auth_client.get('/api/dashboard')
    assert dash.status_code == 200
    dash_data = dash.get_json()
    assert dash_data.get('success') is True, dash_data


def test_home_redirects_when_anonymous(client):
    resp = client.get('/', follow_redirects=False)
    assert resp.status_code in (302, 301)
