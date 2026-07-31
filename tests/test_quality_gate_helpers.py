"""补充门禁相关的小范围单测。"""
from __future__ import annotations

from modules.data_processor import get_file_hash
from modules.feishu_bot import build_audit_card


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
