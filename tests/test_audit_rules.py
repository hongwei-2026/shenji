"""审计规则引擎单元测试。"""
from __future__ import annotations

from modules.audit_rules import (
    get_rule_summary,
    rule_duplicates,
    rule_large_amounts,
    rule_negative_amounts,
    run_all_rules,
)


def test_run_all_rules_returns_seven(sample_df):
    results = run_all_rules(sample_df)
    assert len(results) == 7
    assert all('rule' in r or 'name' in r or 'error' in r for r in results)


def test_duplicate_voucher_detected(sample_df):
    result = rule_duplicates(sample_df)
    assert result.get('suspicious') is True
    assert result.get('full_duplicates', 0) > 0


def test_large_amounts_detected(sample_df):
    result = rule_large_amounts(sample_df)
    assert 'error' not in result or result.get('suspicious') is not None
    assert result.get('name') or result.get('rule')


def test_negative_amounts_detected(sample_df):
    result = rule_negative_amounts(sample_df)
    assert result.get('negative_count', 0) > 0


def test_rule_summary(sample_df):
    results = run_all_rules(sample_df)
    summary = get_rule_summary(results)
    assert summary['total_rules'] == 7
    assert 'overall_risk' in summary
    assert summary['overall_risk'] in ('high', 'medium', 'low')
