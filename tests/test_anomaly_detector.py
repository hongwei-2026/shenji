"""异常检测单元测试。"""
from __future__ import annotations

from modules.anomaly_detector import (
    detect_by_group_zscore,
    detect_by_iqr,
    detect_by_zscore,
    run_all_detectors,
)


def test_zscore_runs(sample_df):
    result = detect_by_zscore(sample_df, amount_col='金额')
    assert result['method'] == 'zscore'
    assert 'error' not in result
    assert result['total_records'] >= 10


def test_iqr_runs(sample_df):
    result = detect_by_iqr(sample_df, amount_col='金额')
    assert result['method'] == 'iqr'
    assert 'error' not in result
    assert 'anomaly_count' in result


def test_group_zscore_runs(sample_df):
    result = detect_by_group_zscore(sample_df, amount_col='金额', group_col='科目')
    assert result['method'] == 'group_zscore'
    assert 'error' not in result
    assert 'groups_with_anomalies' in result


def test_run_all_detectors(sample_df):
    results = run_all_detectors(sample_df)
    assert isinstance(results, dict)
    assert 'detectors' in results
    assert 'summary' in results
    assert 'zscore' in results['detectors']
    assert 'group_zscore' in results['detectors']
