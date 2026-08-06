"""
Search Runtime Host tests (SEARCH_RUNTIME_SSOT contract).
"""

from __future__ import annotations

import copy
import importlib
import inspect
import sys
from pathlib import Path
from typing import List

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from membership import MembershipQuery, create_membership_engine  # noqa: E402
from models import (  # noqa: E402
    DatasetIdentity,
    EnvelopeRecord,
    MembershipCandidate,
    Point,
    PublishedDataset,
    StrategyRef,
)
from resolve import Strategy, create_memory_repository, create_resolve_engine  # noqa: E402
from runtime import (  # noqa: E402
    SearchResult,
    create_runtime,
)
from runtime.exceptions import RuntimeConfigurationError  # noqa: E402


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
        dataset_identity=DatasetIdentity("ds-runtime"),
    )


def _query(target: Point, cue: Point, second: Point) -> MembershipQuery:
    return MembershipQuery(cue=cue, target=target, second=second)


class _OrderProbe:
    """Records Host call order for Membership / Resolve."""

    def __init__(self) -> None:
        self.order: List[str] = []


class _RecordingMembership:
    def __init__(self, inner, probe: _OrderProbe) -> None:
        self._inner = inner
        self._probe = probe

    def evaluate(self, dataset, query):
        self._probe.order.append("membership")
        return self._inner.evaluate(dataset, query)


class _RecordingResolve:
    def __init__(self, inner, probe: _OrderProbe) -> None:
        self._inner = inner
        self._probe = probe
        self.candidates_seen: List[MembershipCandidate] = []

    def resolve(self, candidate):
        self._probe.order.append("resolve")
        self.candidates_seen.append(candidate)
        return self._inner.resolve(candidate)


def _fixture_points():
    target = Point(10.0, 20.0)
    cue = Point(1.0, 2.0)
    second = Point(3.0, 4.0)
    return target, cue, second


def test_runtime_host() -> None:
    target, cue, second = _fixture_points()
    ds = _dataset(
        [_record("s1", target, [cue], [second])]
    )
    repo = create_memory_repository(
        {StrategyRef("s1"): Strategy(strategy_ref=StrategyRef("s1"))}
    )
    runtime = create_runtime(repository=repo)
    result = runtime.execute(ds, _query(target, cue, second))
    assert isinstance(result, SearchResult)
    assert result.candidate is not None
    assert result.strategy is not None
    assert result.strategy.strategy_ref == StrategyRef("s1")


def test_call_order_membership_then_resolve() -> None:
    """Loader-supplied Dataset → Membership → Resolve (Host order)."""
    target, cue, second = _fixture_points()
    ds = _dataset([_record("s1", target, [cue], [second])])
    repo = create_memory_repository(
        {StrategyRef("s1"): Strategy(strategy_ref=StrategyRef("s1"))}
    )
    probe = _OrderProbe()
    membership = _RecordingMembership(create_membership_engine(), probe)
    resolve = _RecordingResolve(create_resolve_engine(repo), probe)
    runtime = create_runtime(membership=membership, resolve=resolve)

    # Dataset is already Loader-supplied (architectural first stage).
    probe.order.append("loader_dataset")
    runtime.execute(ds, _query(target, cue, second))

    assert probe.order == ["loader_dataset", "membership", "resolve"]


def test_membership_candidate_passed_to_resolve() -> None:
    target, cue, second = _fixture_points()
    ds = _dataset([_record("s1", target, [cue], [second])])
    repo = create_memory_repository(
        {StrategyRef("s1"): Strategy(strategy_ref=StrategyRef("s1"))}
    )
    probe = _OrderProbe()
    recording_resolve = _RecordingResolve(create_resolve_engine(repo), probe)
    runtime = create_runtime(
        membership=create_membership_engine(),
        resolve=recording_resolve,
    )
    result = runtime.execute(ds, _query(target, cue, second))
    assert len(recording_resolve.candidates_seen) == 1
    assert isinstance(recording_resolve.candidates_seen[0], MembershipCandidate)
    assert recording_resolve.candidates_seen[0] is result.candidate
    assert result.candidate.strategy_ref == StrategyRef("s1")


def test_strategy_delivered_in_result() -> None:
    target, cue, second = _fixture_points()
    ds = _dataset([_record("s1", target, [cue], [second])])
    strategy = Strategy(strategy_ref=StrategyRef("s1"))
    repo = create_memory_repository({StrategyRef("s1"): strategy})
    runtime = create_runtime(repository=repo)
    result = runtime.execute(ds, _query(target, cue, second))
    assert result.strategy is strategy
    assert result.strategies == (strategy,)


def test_search_result_returned() -> None:
    target, cue, second = _fixture_points()
    ds = _dataset([_record("s1", target, [cue], [second])])
    repo = create_memory_repository(
        {StrategyRef("s1"): Strategy(strategy_ref=StrategyRef("s1"))}
    )
    result = create_runtime(repository=repo).execute(
        ds, _query(target, cue, second)
    )
    assert isinstance(result, SearchResult)
    assert result.candidate is not None
    assert result.strategy is not None
    # No algorithm / modal / geometry payload fields.
    assert not hasattr(result, "modal")
    assert not hasattr(result, "geometry")
    assert not hasattr(result, "ranking")


def test_empty_membership_result() -> None:
    target, cue, second = _fixture_points()
    ds = _dataset([_record("s1", target, [cue], [second])])
    repo = create_memory_repository(
        {StrategyRef("s1"): Strategy(strategy_ref=StrategyRef("s1"))}
    )
    # Query that is not a member.
    result = create_runtime(repository=repo).execute(
        ds, _query(Point(99.0, 99.0), cue, second)
    )
    assert result.candidate is None
    assert result.strategy is None
    assert result.candidates == ()
    assert result.strategies == ()


def test_no_loader_bypass() -> None:
    """Runtime must not read Package/Manifest/Version or call Loader APIs."""
    engine_mod = importlib.import_module("runtime.engine")
    factory_mod = importlib.import_module("runtime.factory")
    for mod in (engine_mod, factory_mod):
        src = inspect.getsource(mod)
        assert "from loader" not in src
        assert "import loader" not in src
        assert "create_package_loader" not in src
        assert "PackageLoader" not in src
        assert "load_path" not in src
        assert "package_data" not in src
        assert "version_data" not in src
        assert "manifest_data" not in src


def test_membership_unchanged_delegated() -> None:
    """Runtime hosts Membership; does not reimplement matcher logic."""
    engine_src = inspect.getsource(
        importlib.import_module("runtime.engine")
    )
    assert "match_target" not in engine_src
    assert "match_cue" not in engine_src
    assert "match_second" not in engine_src
    assert "match_record" not in engine_src
    assert ".evaluate(" in engine_src


def test_resolve_unchanged_delegated() -> None:
    """Runtime hosts Resolve; does not reimplement repository lookup."""
    engine_src = inspect.getsource(
        importlib.import_module("runtime.engine")
    )
    assert "lookup(" not in engine_src
    assert ".resolve(" in engine_src
    assert "MemoryStrategyRepository" not in engine_src


def test_validation_not_reinvoked() -> None:
    for name in (
        "runtime.engine",
        "runtime.factory",
        "runtime.result",
        "runtime.interfaces",
    ):
        src = inspect.getsource(importlib.import_module(name))
        assert "validation" not in src
        assert "validate_" not in src
        assert "jsonschema" not in src


def test_no_side_effect_on_dataset() -> None:
    target, cue, second = _fixture_points()
    ds = _dataset([_record("s1", target, [cue], [second])])
    before = copy.deepcopy(ds)
    repo = create_memory_repository(
        {StrategyRef("s1"): Strategy(strategy_ref=StrategyRef("s1"))}
    )
    create_runtime(repository=repo).execute(ds, _query(target, cue, second))
    assert ds == before
    assert ds.records[0].strategy_ref == before.records[0].strategy_ref
    assert ds.records[0].target == before.records[0].target
    assert ds.records[0].cue_set == before.records[0].cue_set
    assert ds.records[0].second_set == before.records[0].second_set


def test_configuration_requires_repository_or_resolve() -> None:
    with pytest.raises(RuntimeConfigurationError):
        create_runtime()


def test_multiple_candidates() -> None:
    target, cue, second = _fixture_points()
    ds = _dataset(
        [
            _record("s1", target, [cue], [second]),
            _record("s2", target, [cue], [second]),
        ]
    )
    repo = create_memory_repository(
        {
            StrategyRef("s1"): Strategy(strategy_ref=StrategyRef("s1")),
            StrategyRef("s2"): Strategy(strategy_ref=StrategyRef("s2")),
        }
    )
    result = create_runtime(repository=repo).execute(
        ds, _query(target, cue, second)
    )
    assert len(result.candidates) == 2
    assert len(result.strategies) == 2
    assert result.candidate.strategy_ref == StrategyRef("s1")
    assert result.strategy.strategy_ref == StrategyRef("s1")
    assert result.strategies[1].strategy_ref == StrategyRef("s2")
