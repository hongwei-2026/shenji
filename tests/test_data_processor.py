"""数据处理器单元测试。"""
from __future__ import annotations

from modules.data_processor import allowed_file, allowed_image, load_file


def test_allowed_file_extensions():
    assert allowed_file('a.csv') is True
    assert allowed_file('b.xlsx') is True
    assert allowed_file('c.xls') is True
    assert allowed_file('d.txt') is False
    assert allowed_file('noext') is False


def test_allowed_image_extensions():
    assert allowed_image('a.png') is True
    assert allowed_image('b.jpg') is True
    assert allowed_image('c.csv') is False


def test_load_csv(sample_csv):
    df = load_file(sample_csv, 'sample_finance.csv')
    assert len(df) > 0
    assert '金额' in df.columns or any('金额' in str(c) for c in df.columns)
