"""
Search Enhancement Pipeline Orchestrator.

Runtime Host consumes this layer to call Phase-3 engines in order.
Does not implement Membership, Ranking, Interpolation, Geometry, or Resolve logic.
"""

from __future__ import annotations

from dataclasses import dataclass

from membership.interfaces import MembershipEngine, MembershipQuery
from models import MembershipCandidate, PublishedDataset
from search.geometry import (
    GeometryEvaluatedCandidate,
    GeometrySearchQuery,
    create_geometry_metrics_engine,
)
from search.geometry.engine import DefaultGeometryMetricsEngine
from search.interpolation import create_interpolation_engine
from search.interpolation.engine import DefaultInterpolationEngine
from search.interpolation.models import RefinedCandidate
from search.kd_tree import (
    KDTreeQueryInput,
    create_kd_tree_builder,
    create_kd_tree_query,
)
from search.kd_tree.builder import DefaultKDTreeBuilder
from search.kd_tree.query import DefaultKDTreeQuery
from search.ranking import create_ranking_engine
from search.ranking.engine import DefaultRankingEngine
from search.ranking.models import RankedCandidate
from search.spatial_index import SpatialQuery, create_spatial_index_builder
from search.spatial_index.builder import DefaultSpatialIndexBuilder


@dataclass(frozen=True)
class PipelineArtifacts:
    """Read-only stage outputs for one Runtime execute()."""

    membership_candidates: tuple[MembershipCandidate, ...]
    ranked_candidates: tuple[RankedCandidate, ...]
    refined_candidates: tuple[RefinedCandidate, ...]
    geometry_candidates: tuple[GeometryEvaluatedCandidate, ...]
    resolve_candidates: tuple[MembershipCandidate, ...]


class SearchEnhancementOrchestrator:
    """
    Host-side orchestration of Enhancement engines.

    Call order:
      Spatial Index → KDTree → Membership → Ranking → Interpolation
      → Geometry Metrics → (Resolve is performed by Runtime Host)
    """

    def __init__(
        self,
        *,
        membership: MembershipEngine,
        spatial_builder: DefaultSpatialIndexBuilder | None = None,
        kd_builder: DefaultKDTreeBuilder | None = None,
        kd_query: DefaultKDTreeQuery | None = None,
        ranking: DefaultRankingEngine | None = None,
        interpolation: DefaultInterpolationEngine | None = None,
        geometry: DefaultGeometryMetricsEngine | None = None,
    ) -> None:
        self._membership = membership
        self._spatial_builder = spatial_builder or create_spatial_index_builder()
        self._kd_builder = kd_builder or create_kd_tree_builder()
        self._kd_query = kd_query or create_kd_tree_query()
        self._ranking = ranking or create_ranking_engine()
        self._interpolation = interpolation or create_interpolation_engine()
        self._geometry = geometry or create_geometry_metrics_engine()

    def run(
        self,
        dataset: PublishedDataset,
        query: MembershipQuery,
    ) -> PipelineArtifacts:
        # 1. Spatial Index
        spatial_index = self._spatial_builder.build(dataset)
        spatial_result = self._spatial_builder.query(
            spatial_index,
            SpatialQuery(cue=query.cue, target=query.target, second=query.second),
        )

        # 2. KDTree
        candidate_ids = spatial_result.candidate_ids
        kd_index = self._kd_builder.build(dataset, candidate_ids)
        top_n = len(candidate_ids) if candidate_ids else 1
        self._kd_query.search(
            kd_index,
            KDTreeQueryInput(cue=query.cue, target=query.target, second=query.second),
            top_n=top_n,
        )

        # 3. Membership (final contract gate; may reuse Spatial/KDTree internally)
        membership_candidates = tuple(self._membership.evaluate(dataset, query) or ())
        if not membership_candidates:
            empty: tuple = ()
            return PipelineArtifacts(
                membership_candidates=empty,
                ranked_candidates=empty,
                refined_candidates=empty,
                geometry_candidates=empty,
                resolve_candidates=empty,
            )

        # 4. Ranking
        ranked = tuple(self._ranking.rank(membership_candidates))

        # 5. Interpolation
        refined = tuple(self._interpolation.refine(ranked))

        # 6. Geometry Metrics
        geometry = tuple(
            self._geometry.evaluate(
                refined,
                GeometrySearchQuery(
                    cue=query.cue,
                    target=query.target,
                    second=query.second,
                ),
            )
        )

        # Resolve input preserves Geometry / Ranking order via MembershipCandidate.
        resolve_candidates = tuple(
            item.refined.ranked.candidate for item in geometry
        )
        return PipelineArtifacts(
            membership_candidates=membership_candidates,
            ranked_candidates=ranked,
            refined_candidates=refined,
            geometry_candidates=geometry,
            resolve_candidates=resolve_candidates,
        )
