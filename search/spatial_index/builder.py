"""Spatial Index builder and query API."""

from __future__ import annotations

from collections import defaultdict
from types import MappingProxyType
from typing import DefaultDict, FrozenSet, Iterable, Mapping, Sequence

from models import EnvelopeRecord, Point, PublishedDataset, RecordIdentity

from .cell import point_to_cell
from .exceptions import InvalidSpatialDataset, InvalidSpatialQuery, SpatialIndexBuildFailure
from .models import SpatialCell, SpatialIndex, SpatialQuery, SpatialQueryResult


def _record_identity(record: EnvelopeRecord) -> RecordIdentity:
    return RecordIdentity(str(record.strategy_ref))


def _freeze_map(
    source: Mapping[SpatialCell, Iterable[RecordIdentity]]
) -> dict[SpatialCell, FrozenSet[RecordIdentity]]:
    return {cell: frozenset(ids) for cell, ids in source.items()}


def _add_points(
    table: DefaultDict[SpatialCell, set[RecordIdentity]],
    points: Sequence[Point],
    record_id: RecordIdentity,
) -> None:
    for point in points:
        table[point_to_cell(point)].add(record_id)


class DefaultSpatialIndexBuilder:
    """Build runtime-derived spatial index and query candidate ids."""

    def build(self, dataset: PublishedDataset) -> SpatialIndex:
        if dataset is None:
            raise InvalidSpatialDataset("PublishedDataset is required")
        if not isinstance(dataset, PublishedDataset):
            raise InvalidSpatialDataset("dataset must be a PublishedDataset model")

        try:
            target_cells: DefaultDict[SpatialCell, set[RecordIdentity]] = defaultdict(set)
            cue_cells: DefaultDict[SpatialCell, set[RecordIdentity]] = defaultdict(set)
            second_cells: DefaultDict[SpatialCell, set[RecordIdentity]] = defaultdict(set)

            records = dataset.records or []
            for index, record in enumerate(records):
                if not isinstance(record, EnvelopeRecord):
                    raise InvalidSpatialDataset(
                        f"records[{index}] is not an EnvelopeRecord"
                    )
                record_id = _record_identity(record)
                target_cells[point_to_cell(record.target)].add(record_id)
                _add_points(cue_cells, record.cue_set, record_id)
                _add_points(second_cells, record.second_set, record_id)

            return SpatialIndex(
                target_cells=_freeze_map(target_cells),
                cue_cells=_freeze_map(cue_cells),
                second_cells=_freeze_map(second_cells),
                record_count=len(records),
            )
        except InvalidSpatialDataset:
            raise
        except Exception as exc:  # noqa: BLE001
            raise SpatialIndexBuildFailure(str(exc), cause=exc) from exc

    def query(self, index: SpatialIndex, query: SpatialQuery) -> SpatialQueryResult:
        if index is None or not isinstance(index, SpatialIndex):
            raise InvalidSpatialQuery("SpatialIndex is required")
        if query is None or not isinstance(query, SpatialQuery):
            raise InvalidSpatialQuery("SpatialQuery is required")

        target_cell = point_to_cell(query.target)
        cue_cell = point_to_cell(query.cue)
        second_cell = point_to_cell(query.second)

        target_ids = index.target_cells.get(target_cell, frozenset())
        cue_ids = index.cue_cells.get(cue_cell, frozenset())
        second_ids = index.second_cells.get(second_cell, frozenset())
        candidate_ids = tuple(sorted(target_ids & cue_ids & second_ids))

        return SpatialQueryResult(
            target_cell=target_cell,
            cue_cell=cue_cell,
            second_cell=second_cell,
            candidate_ids=candidate_ids,
        )
