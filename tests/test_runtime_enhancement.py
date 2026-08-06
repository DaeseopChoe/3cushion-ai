"""
Integration tests — Search Runtime Enhancement Wiring.
"""

from __future__ import annotations

import copy
import sys
from pathlib import Path
from typing import List

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from membership import MembershipQuery, create_membership_engine  # noqa: E402
from models import (  # noqa: E402
    DatasetIdentity,
    EnvelopeRecord,
    Point,
    PublishedDataset,
    StrategyRef,
)
from resolve import Strategy, create_memory_repository, create_resolve_engine  # noqa: E402
from runtime import create_runtime  # noqa: E402
from search.geometry import create_geometry_metrics_engine  # noqa: E402
from search.interpolation import create_interpolation_engine  # noqa: E402
from search.kd_tree import create_kd_tree_builder, create_kd_tree_query  # noqa: E402
from search.ranking import create_ranking_engine  # noqa: E402
from search.runtime import SearchEnhancementOrchestrator  # noqa: E402
from search.spatial_index import create_spatial_index_builder  # noqa: E402


def _record(sid: str, target: Point, cue: Point, second: Point) -> EnvelopeRecord:
    return EnvelopeRecord(
        strategy_ref=StrategyRef(sid),
        target=target,
        cue_set=[cue],
        second_set=[second],
    )


def _dataset(records: list[EnvelopeRecord]) -> PublishedDataset:
    return PublishedDataset(records=records, dataset_identity=DatasetIdentity("ds-enh"))


class _Probe:
    def __init__(self) -> None:
        self.order: List[str] = []


class _RecordingSpatial:
    def __init__(self, inner, probe: _Probe) -> None:
        self._inner = inner
        self._probe = probe

    def build(self, dataset):
        self._probe.order.append("spatial_build")
        return self._inner.build(dataset)

    def query(self, index, query):
        self._probe.order.append("spatial_query")
        return self._inner.query(index, query)


class _RecordingKDBuilder:
    def __init__(self, inner, probe: _Probe) -> None:
        self._inner = inner
        self._probe = probe

    def build(self, dataset, candidate_ids):
        self._probe.order.append("kdtree_build")
        return self._inner.build(dataset, candidate_ids)


class _RecordingKDQuery:
    def __init__(self, inner, probe: _Probe) -> None:
        self._inner = inner
        self._probe = probe

    def search(self, index, query, *, top_n: int):
        self._probe.order.append("kdtree_query")
        return self._inner.search(index, query, top_n=top_n)


class _RecordingMembership:
    def __init__(self, inner, probe: _Probe) -> None:
        self._inner = inner
        self._probe = probe

    def evaluate(self, dataset, query):
        self._probe.order.append("membership")
        return self._inner.evaluate(dataset, query)


class _RecordingRanking:
    def __init__(self, inner, probe: _Probe) -> None:
        self._inner = inner
        self._probe = probe

    def rank(self, candidates):
        self._probe.order.append("ranking")
        return self._inner.rank(candidates)


class _RecordingInterpolation:
    def __init__(self, inner, probe: _Probe) -> None:
        self._inner = inner
        self._probe = probe

    def refine(self, ranked):
        self._probe.order.append("interpolation")
        return self._inner.refine(ranked)


class _RecordingGeometry:
    def __init__(self, inner, probe: _Probe) -> None:
        self._inner = inner
        self._probe = probe

    def evaluate(self, refined, query):
        self._probe.order.append("geometry")
        return self._inner.evaluate(refined, query)


class _RecordingResolve:
    def __init__(self, inner, probe: _Probe) -> None:
        self._inner = inner
        self._probe = probe

    def resolve(self, candidate):
        self._probe.order.append("resolve")
        return self._inner.resolve(candidate)


def test_runtime_pipeline_call_order() -> None:
    target, cue, second = Point(10.0, 20.0), Point(1.0, 2.0), Point(3.0, 4.0)
    ds = _dataset([_record("s1", target, cue, second)])
    repo = create_memory_repository(
        {StrategyRef("s1"): Strategy(strategy_ref=StrategyRef("s1"))}
    )
    probe = _Probe()
    membership = _RecordingMembership(create_membership_engine(), probe)
    orchestrator = SearchEnhancementOrchestrator(
        membership=membership,
        spatial_builder=_RecordingSpatial(create_spatial_index_builder(), probe),
        kd_builder=_RecordingKDBuilder(create_kd_tree_builder(), probe),
        kd_query=_RecordingKDQuery(create_kd_tree_query(), probe),
        ranking=_RecordingRanking(create_ranking_engine(), probe),
        interpolation=_RecordingInterpolation(create_interpolation_engine(), probe),
        geometry=_RecordingGeometry(create_geometry_metrics_engine(), probe),
    )
    runtime = create_runtime(
        membership=membership,
        resolve=_RecordingResolve(create_resolve_engine(repo), probe),
        orchestrator=orchestrator,
    )
    result = runtime.execute(
        ds, MembershipQuery(cue=cue, target=target, second=second)
    )

    assert result.candidate is not None
    assert probe.order == [
        "spatial_build",
        "spatial_query",
        "kdtree_build",
        "kdtree_query",
        "membership",
        "ranking",
        "interpolation",
        "geometry",
        "resolve",
    ]


def test_runtime_does_not_mutate_dataset() -> None:
    target, cue, second = Point(10.0, 20.0), Point(1.0, 2.0), Point(3.0, 4.0)
    ds = _dataset([_record("s1", target, cue, second)])
    before = copy.deepcopy(ds)
    repo = create_memory_repository(
        {StrategyRef("s1"): Strategy(strategy_ref=StrategyRef("s1"))}
    )
    create_runtime(repository=repo).execute(
        ds, MembershipQuery(cue=cue, target=target, second=second)
    )
    assert ds == before


def test_runtime_resolve_contract_preserved() -> None:
    target, cue, second = Point(10.0, 20.0), Point(1.0, 2.0), Point(3.0, 4.0)
    ds = _dataset([_record("s1", target, cue, second)])
    strategy = Strategy(strategy_ref=StrategyRef("s1"))
    repo = create_memory_repository({StrategyRef("s1"): strategy})
    result = create_runtime(repository=repo).execute(
        ds, MembershipQuery(cue=cue, target=target, second=second)
    )
    assert result.strategy is strategy
    assert result.candidate.strategy_ref == StrategyRef("s1")
    assert not hasattr(result, "ranking")
    assert not hasattr(result, "geometry")
