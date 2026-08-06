"""
Published Envelope Dataset domain models.

Contract: schemas/published_dataset.schema.json
SSOT: ENVELOPE_DATASET_SCHEMA_SSOT · PUBLISHED_DATASET_SSOT

EnvelopeRecord fields only: strategyRef, target, cueSet, secondSet.
No Modal, Strategy body, Geometry, Ranking, or business logic.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import List, Optional

from .types import DatasetIdentity, Point, StrategyRef


@dataclass
class EnvelopeRecord:
    """
    Search Representation for one Strategy.
    Exactly four Required fields (Schema additionalProperties: false).
    """

    strategy_ref: StrategyRef
    target: Point
    cue_set: List[Point]
    second_set: List[Point]


@dataclass
class PublishedDataset:
    """
    Published Envelope Dataset = EnvelopeRecord corpus.
    Optional dataset_identity is packaging/reference meta, not an EnvelopeRecord field.
    """

    records: List[EnvelopeRecord] = field(default_factory=list)
    dataset_identity: Optional[DatasetIdentity] = None
