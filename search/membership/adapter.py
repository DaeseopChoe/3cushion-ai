"""Optimized candidate prefilter for Membership."""

from __future__ import annotations

from membership.interfaces import MembershipQuery
from models import EnvelopeRecord, PublishedDataset, RecordIdentity
from search.kd_tree import KDTreeQueryInput, create_kd_tree_builder, create_kd_tree_query
from search.spatial_index import SpatialQuery, create_spatial_index_builder


def _record_identity(record: EnvelopeRecord) -> RecordIdentity:
    return RecordIdentity(str(record.strategy_ref))


class DefaultCandidatePrefilterAdapter:
    """
    Spatial Index -> KDTree adapter for Membership.

    Returns candidate records in original dataset order so Membership output order
    remains identical to the legacy full-scan path.
    """

    def __init__(self) -> None:
        self._spatial_builder = create_spatial_index_builder()
        self._kd_builder = create_kd_tree_builder()
        self._kd_query = create_kd_tree_query()

    def select_records(
        self,
        dataset: PublishedDataset,
        query: MembershipQuery,
    ) -> tuple[EnvelopeRecord, ...] | None:
        spatial_index = self._spatial_builder.build(dataset)
        spatial_result = self._spatial_builder.query(
            spatial_index,
            SpatialQuery(cue=query.cue, target=query.target, second=query.second),
        )
        candidate_ids = spatial_result.candidate_ids
        if not candidate_ids:
            return None

        kd_index = self._kd_builder.build(dataset, candidate_ids)
        shortlist = self._kd_query.search(
            kd_index,
            KDTreeQueryInput(cue=query.cue, target=query.target, second=query.second),
            top_n=len(candidate_ids),
        )
        if not shortlist:
            return None

        shortlist_ids = {RecordIdentity(str(item.candidate_id)) for item in shortlist}
        return tuple(
            record
            for record in (dataset.records or [])
            if _record_identity(record) in shortlist_ids
        )
