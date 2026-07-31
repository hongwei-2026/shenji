"""补充门禁相关的小范围单测。"""
from __future__ import annotations

from io import BytesIO

from werkzeug.datastructures import FileStorage

from modules.data_processor import (
    get_active_table_id,
    get_file_hash,
    process_upload,
    update_cell,
)
from modules.feishu_bot import build_audit_card, process_message


def test_get_file_hash_stable(tmp_path):
    path = tmp_path / 'a.bin'
    path.write_bytes(b'hello-audit')
    h1 = get_file_hash(str(path))
    h2 = get_file_hash(str(path))
    assert h1 == h2
    assert len(h1) == 32


def test_build_audit_card_contains_report_link():
    card = build_audit_card(
        'CI报告',
        {'overall_label': '中', 'risk_percentage': 55},
        ['重复凭证', '大额交易'],
    )
    assert 'CI报告' in card['header']['title']['content']
    button = card['elements'][-1]['actions'][0]
    assert 'report' in button['url']


def test_process_message_help():
    result = process_message({'msg_type': 'text', 'content': '{"text":"help"}'})
    assert result.get('success') is True
    assert result.get('reply')


def test_update_cell_casts_numeric_column(app, sample_csv):
    with open(sample_csv, 'rb') as f:
        fs = FileStorage(stream=BytesIO(f.read()), filename='sample_finance.csv')
    uploaded = process_upload(fs)
    assert uploaded.get('success') is True
    table_id = uploaded.get('table_id') or get_active_table_id()
    result = update_cell(table_id, 0, '金额', '备注文本')
    assert result.get('success') is True
