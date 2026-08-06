"""
Phase 3 Search Enhancement — Regression Suite.

Ensures Enhancement Runtime preserves Membership/Resolve hit contracts
and deterministic ordering relative to baseline Membership evaluation.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from membership import MembershipQuery, create_membership_engine  # noqa: E402
from membership.engine import DefaultMembershipEngine  # noqa: E402
from models import (  # noqa: E402
    DatasetIdentity,
    EnvelopeRecord,
    Point,
    PublishedDataset,
    StrategyRef,
)
from resolve import Strategy, create_memory_repository  # noqa: E402
from runtime import create_runtime  # noqa: E402
from search.ranking import create_ranking_engine  # noqa: E402


def _record(
    sid: str,
    target: Point,
    cue: Point,
    second: Point,
    *,
    cue_ok: bool = True,
) -> EnvelopeRecord:
    return EnvelopeRecord(
        strategy_ref=StrategyRef(sid),
        target=target,
        cue_set=[cue] if cue_ok else [Point(99.0, 99.0)],
        second_set=[second],
    )


def _dataset(records: list[EnvelopeRecord]) -> PublishedDataset:
    return PublishedDataset(records=records, dataset_identity=DatasetIdentity("ds-reg"))


class _ForceFullScan:
    def select_records(self, dataset, query):
        return None


def test_regression_enhanced_runtime_matches_membership_hits() -> None:
    target = Point(10.0, 20.0)
    cue = Point(1.0, 2.0)
    second = Point(3.0, 4.0)
    ds = _dataset(
        [
            _record("s1", target, cue, second),
            _record("s2", target, cue, second),
            _record("s3", Point(0.0, 0.0), cue, second),  # target miss
        ]
    )
    query = MembershipQuery(cue=cue, target=target, second=second)

    baseline = create_membership_engine().evaluate(ds, query)
    baseline_ids = [str(c.strategy_ref) for c in baseline]
    assert baseline_ids == ["s1", "s2"]

    repo = create_memory_repository(
        {
            StrategyRef("s1"): Strategy(strategy_ref=StrategyRef("s1")),
            StrategyRef("s2"): Strategy(strategy_ref=StrategyRef("s2")),
            StrategyRef("s3"): Strategy(strategy_ref=StrategyRef("s3")),
        }
    )
    result = create_runtime(repository=repo).execute(ds, query)
    result_ids = [str(c.strategy_ref) for c in result.candidates]
    assert set(result_ids) == set(baseline_ids)
    assert len(result.strategies) == len(result.candidates)


def test_regression_ranking_stable_and_deterministic() -> None:
    target = Point(10.0, 20.0)
    cue = Point(1.0, 2.0)
    second = Point(3.0, 4.0)
    ds = _dataset(
        [
            _record("s_b", target, cue, second),
            _record("s_a", target, cue, second),
        ]
    )
    query = MembershipQuery(cue=cue, target=target, second=second)
    membership = create_membership_engine().evaluate(ds, query)
    ranking = create_ranking_engine()
    first = ranking.rank(membership)
    second_pass = ranking.rank(membership)
    assert first == second_pass
    assert [str(item.strategy_ref) for item in first] == ["s_a", "s_b"]


def test_regression_optimized_membership_equals_full_scan() -> None:
    target = Point(10.0, 20.0)
    cue = Point(1.0, 2.0)
    second = Point(3.0, 4.0)
    ds = _dataset(
        [
            _record("s1", target, cue, second),
            _record("s2", target, cue, second),
        ]
    )
    query = MembershipQuery(cue=cue, target=target, second=second)
    optimized = create_membership_engine().evaluate(ds, query)
    full_scan = DefaultMembershipEngine(prefilter_adapter=_ForceFullScan()).evaluate(
        ds, query
    )
    assert optimized == full_scan


def test_regression_empty_query_stays_empty() -> None:
    target = Point(10.0, 20.0)
    cue = Point(1.0, 2.0)
    second = Point(3.0, 4.0)
    ds = _dataset([_record("s1", target, cue, second)])
    repo = create_memory_repository(
        {StrategyRef("s1"): Strategy(strategy_ref=StrategyRef("s1"))}
    )
    result = create_runtime(repository=repo).execute(
        ds,
        MembershipQuery(cue=Point(9.0, 9.0), target=Point(8.0, 8.0), second=Point(7.0, 7.0)),
    )
    assert result.candidate is None
    assert result.candidates == ()
    assert result.strategies == ()
