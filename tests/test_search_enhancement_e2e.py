"""
Phase 3 Search Enhancement — End-to-End Validation.

Validates the full pipeline without changing Engine implementations:
PublishedDataset → Spatial → KDTree → Membership → Ranking
→ Interpolation → Geometry Metrics → Resolve → SearchResult
"""

from __future__ import annotations

import copy
import sys
from pathlib import Path
from typing import List

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from generator import create_generator_host  # noqa: E402
from generator.fixtures import FixtureGeometryPort, make_fixture_strategy  # noqa: E402
from membership import MembershipQuery, create_membership_engine  # noqa: E402
from membership.engine import DefaultMembershipEngine  # noqa: E402
from models import (  # noqa: E402
    DatasetIdentity,
    EnvelopeRecord,
    MembershipCandidate,
    Point,
    PublishedDataset,
    StrategyRef,
)
from resolve import Strategy, create_memory_repository, create_resolve_engine  # noqa: E402
from runtime import SearchResult, create_runtime  # noqa: E402
from search.geometry import create_geometry_metrics_engine  # noqa: E402
from search.interpolation import create_interpolation_engine  # noqa: E402
from search.kd_tree import create_kd_tree_builder, create_kd_tree_query  # noqa: E402
from search.ranking import create_ranking_engine  # noqa: E402
from search.runtime import SearchEnhancementOrchestrator  # noqa: E402
from search.spatial_index import SpatialQuery, create_spatial_index_builder  # noqa: E402


def _build_fixture_dataset() -> tuple[PublishedDataset, EnvelopeRecord]:
    host = create_generator_host(geometry=FixtureGeometryPort())
    strategy = make_fixture_strategy()
    snapshot = host.generate_trajectory_snapshot(strategy)
    cue = host.sample_cue(snapshot)
    second = host.sample_second(snapshot)
    record = host.build_envelope(strategy, snapshot, cue, second)
    dataset = host.build_published_dataset([record])
    return dataset, record


class _Probe:
    def __init__(self) -> None:
        self.order: List[str] = []


def _wrap_pipeline(probe: _Probe, membership, repo):
    class Spatial:
        def __init__(self, inner):
            self._inner = inner

        def build(self, dataset):
            probe.order.append("spatial")
            return self._inner.build(dataset)

        def query(self, index, query):
            return self._inner.query(index, query)

    class KDBuild:
        def __init__(self, inner):
            self._inner = inner

        def build(self, dataset, ids):
            probe.order.append("kdtree")
            return self._inner.build(dataset, ids)

    class KDQuery:
        def __init__(self, inner):
            self._inner = inner

        def search(self, index, query, *, top_n):
            return self._inner.search(index, query, top_n=top_n)

    class Membership:
        def __init__(self, inner):
            self._inner = inner

        def evaluate(self, dataset, query):
            probe.order.append("membership")
            return self._inner.evaluate(dataset, query)

    class Ranking:
        def __init__(self, inner):
            self._inner = inner

        def rank(self, candidates):
            probe.order.append("ranking")
            return self._inner.rank(candidates)

    class Interpolation:
        def __init__(self, inner):
            self._inner = inner

        def refine(self, ranked):
            probe.order.append("interpolation")
            return self._inner.refine(ranked)

    class Geometry:
        def __init__(self, inner):
            self._inner = inner

        def evaluate(self, refined, query):
            probe.order.append("geometry")
            return self._inner.evaluate(refined, query)

    class Resolve:
        def __init__(self, inner):
            self._inner = inner

        def resolve(self, candidate):
            probe.order.append("resolve")
            return self._inner.resolve(candidate)

    mem = Membership(membership)
    orch = SearchEnhancementOrchestrator(
        membership=mem,
        spatial_builder=Spatial(create_spatial_index_builder()),
        kd_builder=KDBuild(create_kd_tree_builder()),
        kd_query=KDQuery(create_kd_tree_query()),
        ranking=Ranking(create_ranking_engine()),
        interpolation=Interpolation(create_interpolation_engine()),
        geometry=Geometry(create_geometry_metrics_engine()),
    )
    return create_runtime(
        membership=mem,
        resolve=Resolve(create_resolve_engine(repo)),
        orchestrator=orch,
    )


def test_e2e_full_pipeline_and_call_order() -> None:
    dataset, record = _build_fixture_dataset()
    query = MembershipQuery(
        cue=record.cue_set[0],
        target=record.target,
        second=record.second_set[0],
    )
    repo = create_memory_repository(
        {record.strategy_ref: Strategy(strategy_ref=record.strategy_ref)}
    )
    probe = _Probe()
    runtime = _wrap_pipeline(probe, create_membership_engine(), repo)
    result = runtime.execute(dataset, query)

    assert isinstance(result, SearchResult)
    assert result.candidate is not None
    assert result.strategy is not None
    assert result.candidate.strategy_ref == record.strategy_ref
    assert probe.order == [
        "spatial",
        "kdtree",
        "membership",
        "ranking",
        "interpolation",
        "geometry",
        "resolve",
    ]


def test_e2e_published_dataset_immutable() -> None:
    dataset, record = _build_fixture_dataset()
    before = copy.deepcopy(dataset)
    query = MembershipQuery(
        cue=record.cue_set[0],
        target=record.target,
        second=record.second_set[0],
    )
    repo = create_memory_repository(
        {record.strategy_ref: Strategy(strategy_ref=record.strategy_ref)}
    )
    create_runtime(repository=repo).execute(dataset, query)
    assert dataset == before


def test_e2e_stage_contracts() -> None:
    dataset, record = _build_fixture_dataset()
    query = MembershipQuery(
        cue=record.cue_set[0],
        target=record.target,
        second=record.second_set[0],
    )

    spatial = create_spatial_index_builder()
    index = spatial.build(dataset)
    spatial_result = spatial.query(
        index,
        SpatialQuery(cue=query.cue, target=query.target, second=query.second),
    )
    assert record.strategy_ref in spatial_result.candidate_ids

    kd = create_kd_tree_builder().build(dataset, spatial_result.candidate_ids)
    from search.kd_tree import KDTreeQueryInput

    shortlist = create_kd_tree_query().search(
        kd,
        KDTreeQueryInput(cue=query.cue, target=query.target, second=query.second),
        top_n=1,
    )
    assert shortlist[0].candidate_id == record.strategy_ref

    membership = create_membership_engine().evaluate(dataset, query)
    assert len(membership) == 1
    assert isinstance(membership[0], MembershipCandidate)

    ranked = create_ranking_engine().rank(membership)
    assert ranked[0].rank == 1
    assert ranked[0].score_detail is not None

    refined = create_interpolation_engine().refine(ranked)
    assert refined[0].refinement_detail is not None
    assert refined[0].score == ranked[0].score

    from search.geometry import GeometrySearchQuery

    geometry = create_geometry_metrics_engine().evaluate(
        refined,
        GeometrySearchQuery(cue=query.cue, target=query.target, second=query.second),
    )
    assert geometry[0].geometry_score >= 0.0
    assert geometry[0].metric_detail is not None

    repo = create_memory_repository(
        {record.strategy_ref: Strategy(strategy_ref=record.strategy_ref)}
    )
    result = create_runtime(repository=repo).execute(dataset, query)
    assert result.candidate.strategy_ref == record.strategy_ref
    assert not hasattr(result, "ranking")
    assert not hasattr(result, "geometry")


def test_e2e_full_scan_fallback_membership() -> None:
    """Broken prefilter falls back to full scan; Membership contract holds."""

    class _Broken:
        def select_records(self, dataset, query):
            raise RuntimeError("prefilter unavailable")

    target = Point(10.0, 20.0)
    cue = Point(1.0, 2.0)
    second = Point(3.0, 4.0)
    record = EnvelopeRecord(
        strategy_ref=StrategyRef("fallback.s1"),
        target=target,
        cue_set=[cue],
        second_set=[second],
    )
    dataset = PublishedDataset(
        records=[record],
        dataset_identity=DatasetIdentity("ds-fallback"),
    )
    engine = DefaultMembershipEngine(prefilter_adapter=_Broken())
    candidates = engine.evaluate(
        dataset, MembershipQuery(cue=cue, target=target, second=second)
    )
    assert [c.strategy_ref for c in candidates] == ["fallback.s1"]
