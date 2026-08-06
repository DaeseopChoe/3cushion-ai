"""KDTree models."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Tuple

from models import Point, RecordIdentity, StrategyRef

Vector6D = Tuple[float, float, float, float, float, float]


@dataclass(frozen=True)
class KDTreeQueryInput:
    """Runtime search query for fixed-dimension candidate retrieval."""

    cue: Point
    target: Point
    second: Point


@dataclass(frozen=True)
class EncodedCandidate:
    """Fixed-dimension candidate vector derived from one EnvelopeRecord."""

    candidate_id: RecordIdentity
    strategy_ref: StrategyRef
    vector: Vector6D


@dataclass(frozen=True)
class KDTreeNode:
    """Balanced KDTree node."""

    item: EncodedCandidate
    axis: int
    left: Optional["KDTreeNode"] = None
    right: Optional["KDTreeNode"] = None


@dataclass(frozen=True)
class KDTreeIndex:
    """Runtime-only KDTree candidate index."""

    root: Optional[KDTreeNode]
    candidates: Tuple[EncodedCandidate, ...]
    dimensions: int


@dataclass(frozen=True)
class NearestCandidate:
    """Nearest shortlist entry with deterministic order metadata."""

    candidate_id: RecordIdentity
    strategy_ref: StrategyRef
    distance: float
    tie_break_key: RecordIdentity
