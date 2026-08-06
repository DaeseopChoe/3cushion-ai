"""
Membership Candidate domain model.

Contract: schemas/membership_candidate.schema.json
SSOT: MEMBERSHIP_SSOT

Output of Membership Stage before Resolve.
No Modal, Strategy body, Ranking, Geometry, or Membership algorithm.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional

from .types import DatasetIdentity, RecordIdentity, StrategyRef


@dataclass
class MembershipFlags:
    """Membership Result flags (structure only)."""

    target_match: bool
    cue_membership: bool
    second_membership: bool


@dataclass
class MembershipCandidate:
    """Candidate passed to Resolve. Carries strategy_ref + record identity."""

    strategy_ref: StrategyRef
    record_identity: RecordIdentity
    membership: MembershipFlags
    dataset_identity: Optional[DatasetIdentity] = None
