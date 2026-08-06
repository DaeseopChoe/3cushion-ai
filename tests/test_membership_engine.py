"""
Membership Engine tests (MEMBERSHIP_SSOT contract).
"""

from __future__ import annotations

import copy
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from membership import (  # noqa: E402
    MembershipQuery,
    create_membership_engine,
    is_member,
    match_cue,
    match_record,
    match_second,
    match_target,
)
from membership.engine import DefaultMembershipEngine  # noqa: E402
from models import (  # noqa: E402
    DatasetIdentity,
    EnvelopeRecord,
    Point,
    PublishedDataset,
    StrategyRef,
)


class _FallbackAdapter:
    def select_records(self, dataset, query):
        return None


class _BrokenAdapter:
    def select_records(self, dataset, query):
        raise RuntimeError("prefilter unavailable")


class _EmptyAdapter:
    def select_records(self, dataset, query):
        return ()


def _record(
    sid: str,
    target: Point,
    cue_set: list[Point],
    second_set: list[Point],
) -> EnvelopeRecord:
    return EnvelopeRecord(
        strategy_ref=StrategyRef(sid),
        target=target,
        cue_set=list(cue_set),
        second_set=list(second_set),
    )


def _dataset(records: list[EnvelopeRecord]) -> PublishedDataset:
    return PublishedDataset(
        records=records,
        dataset_identity=DatasetIdentity("ds-test"),
    )


def test_match_target() -> None:
    assert match_target(Point(1.0, 2.0), Point(1.0, 2.0)) is True
    assert match_target(Point(1.0, 2.0), Point(9.0, 2.0)) is False


def test_match_cue() -> None:
    cue_set = [Point(0.0, 0.0), Point(1.5, 2.5)]
    assert match_cue(Point(1.5, 2.5), cue_set) is True
    assert match_cue(Point(9.0, 9.0), cue_set) is False


def test_match_second() -> None:
    second_set = [Point(3.0, 4.0)]
    assert match_second(Point(3.0, 4.0), second_set) is True
    assert match_second(Point(0.0, 0.0), second_set) is False


def test_candidate_creation() -> None:
    target = Point(10.0, 20.0)
    cue = Point(1.0, 2.0)
    second = Point(3.0, 4.0)
    ds = _dataset(
        [
            _record(
                "s1",
                target,
                [Point(0.0, 0.0), cue],
                [second],
            )
        ]
    )
    engine = create_membership_engine()
    query = MembershipQuery(cue=cue, target=target, second=second)
    candidates = engine.evaluate(ds, query)
    assert len(candidates) == 1
    c = candidates[0]
    assert c.strategy_ref == "s1"
    assert c.record_identity == "s1"
    assert c.membership.target_match is True
    assert c.membership.cue_membership is True
    assert c.membership.second_membership is True
    assert is_member(c.membership) is True
    assert c.dataset_identity == "ds-test"


def test_not_a_member() -> None:
    ds = _dataset(
        [
            _record(
                "s1",
                Point(10.0, 20.0),
                [Point(1.0, 2.0)],
                [Point(3.0, 4.0)],
            )
        ]
    )
    engine = create_membership_engine()
    query = MembershipQuery(
        cue=Point(1.0, 2.0),
        target=Point(10.0, 20.0),
        second=Point(99.0, 99.0),  # not in second_set
    )
    assert engine.evaluate(ds, query) == []


def test_multiple_candidates() -> None:
    target = Point(10.0, 20.0)
    cue = Point(1.0, 2.0)
    second = Point(3.0, 4.0)
    ds = _dataset(
        [
            _record("s1", target, [cue], [second]),
            _record("s2", target, [cue, Point(0.0, 0.0)], [second]),
            _record("s3", Point(0.0, 0.0), [cue], [second]),  # target miss
        ]
    )
    engine = create_membership_engine()
    query = MembershipQuery(cue=cue, target=target, second=second)
    candidates = engine.evaluate(ds, query)
    assert [c.strategy_ref for c in candidates] == ["s1", "s2"]


def test_optimized_path_matches_full_scan_regression() -> None:
    target = Point(10.0, 20.0)
    cue = Point(1.0, 2.0)
    second = Point(3.0, 4.0)
    ds = _dataset(
        [
            _record("s1", target, [cue], [second]),
            _record("s2", target, [cue, Point(9.0, 9.0)], [second]),
            _record("s3", Point(0.0, 0.0), [cue], [second]),
        ]
    )
    query = MembershipQuery(cue=cue, target=target, second=second)
    baseline = DefaultMembershipEngine(prefilter_adapter=_FallbackAdapter()).evaluate(
        ds, query
    )
    optimized = create_membership_engine().evaluate(ds, query)
    assert optimized == baseline
    assert [candidate.strategy_ref for candidate in optimized] == ["s1", "s2"]


def test_full_scan_fallback_when_prefilter_unavailable() -> None:
    target = Point(10.0, 20.0)
    cue = Point(1.0, 2.0)
    second = Point(3.0, 4.0)
    ds = _dataset([_record("s1", target, [cue], [second])])
    query = MembershipQuery(cue=cue, target=target, second=second)
    engine = DefaultMembershipEngine(prefilter_adapter=_BrokenAdapter())
    candidates = engine.evaluate(ds, query)
    assert [candidate.strategy_ref for candidate in candidates] == ["s1"]


def test_full_scan_fallback_when_prefilter_returns_empty() -> None:
    target = Point(10.0, 20.0)
    cue = Point(1.0, 2.0)
    second = Point(3.0, 4.0)
    ds = _dataset([_record("s1", target, [cue], [second])])
    query = MembershipQuery(cue=cue, target=target, second=second)
    engine = DefaultMembershipEngine(prefilter_adapter=_EmptyAdapter())
    candidates = engine.evaluate(ds, query)
    assert [candidate.strategy_ref for candidate in candidates] == ["s1"]


def test_empty_dataset() -> None:
    engine = create_membership_engine()
    query = MembershipQuery(
        cue=Point(1.0, 2.0),
        target=Point(10.0, 20.0),
        second=Point(3.0, 4.0),
    )
    assert engine.evaluate(_dataset([]), query) == []


def test_empty_result() -> None:
    ds = _dataset(
        [
            _record(
                "s1",
                Point(1.0, 1.0),
                [Point(2.0, 2.0)],
                [Point(3.0, 3.0)],
            )
        ]
    )
    engine = create_membership_engine()
    query = MembershipQuery(
        cue=Point(9.0, 9.0),
        target=Point(8.0, 8.0),
        second=Point(7.0, 7.0),
    )
    assert engine.evaluate(ds, query) == []


def test_published_dataset_unchanged() -> None:
    record = _record(
        "s1",
        Point(10.0, 20.0),
        [Point(1.0, 2.0)],
        [Point(3.0, 4.0)],
    )
    ds = _dataset([record])
    before = copy.deepcopy(ds)
    engine = create_membership_engine()
    engine.evaluate(
        ds,
        MembershipQuery(
            cue=Point(1.0, 2.0),
            target=Point(10.0, 20.0),
            second=Point(3.0, 4.0),
        ),
    )
    assert ds.records[0].target.x == before.records[0].target.x
    assert ds.records[0].cue_set[0].x == before.records[0].cue_set[0].x
    assert len(ds.records) == len(before.records)
    assert ds.dataset_identity == before.dataset_identity


def test_no_resolve_api_on_engine() -> None:
    engine = create_membership_engine()
    resolve_like = [
        name
        for name in dir(engine)
        if "resolve" in name.lower()
        or "strategy" in name.lower()
        or "modal" in name.lower()
        or "loader" in name.lower()
    ]
    assert resolve_like == []


def test_match_record_flags() -> None:
    record = _record(
        "s1",
        Point(10.0, 20.0),
        [Point(1.0, 2.0)],
        [Point(3.0, 4.0)],
    )
    flags = match_record(
        MembershipQuery(
            cue=Point(1.0, 2.0),
            target=Point(10.0, 20.0),
            second=Point(0.0, 0.0),
        ),
        record,
    )
    assert flags.target_match is True
    assert flags.cue_membership is True
    assert flags.second_membership is False
    assert is_member(flags) is False
