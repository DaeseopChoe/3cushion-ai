"""Spatial Index models."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, FrozenSet, Tuple

from models import Point, RecordIdentity


@dataclass(frozen=True)
class SpatialCell:
    """One runtime-derived cell address in the 8x4 spatial grid."""

    col: int
    row: int


@dataclass(frozen=True)
class SpatialQuery:
    """Query coordinates for coarse prefilter."""

    cue: Point
    target: Point
    second: Point


@dataclass(frozen=True)
class SpatialQueryResult:
    """Coarse prefilter output."""

    target_cell: SpatialCell
    cue_cell: SpatialCell
    second_cell: SpatialCell
    candidate_ids: Tuple[RecordIdentity, ...]


@dataclass(frozen=True)
class SpatialIndex:
    """
    Runtime-derived Spatial Index.

    Dataset is not persisted or modified; only record identities are cached.
    """

    target_cells: Dict[SpatialCell, FrozenSet[RecordIdentity]] = field(default_factory=dict)
    cue_cells: Dict[SpatialCell, FrozenSet[RecordIdentity]] = field(default_factory=dict)
    second_cells: Dict[SpatialCell, FrozenSet[RecordIdentity]] = field(default_factory=dict)
    record_count: int = 0
