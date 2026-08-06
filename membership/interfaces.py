"""
Membership Engine interfaces and query contract.

Read-only Selection Layer. No Resolve / Strategy / Modal / Loader.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import List, Protocol, runtime_checkable

from models import MembershipCandidate, Point, PublishedDataset


@dataclass(frozen=True)
class MembershipQuery:
    """Runtime Query coordinates for Membership (cue / target / second)."""

    cue: Point
    target: Point
    second: Point


@runtime_checkable
class MembershipEngine(Protocol):
    """
    Membership Selection Layer (MEMBERSHIP_SSOT).

    PublishedDataset + MembershipQuery → list[MembershipCandidate]
    Does not call Resolve, Loader, Strategy, or Modal.
    """

    def evaluate(
        self,
        dataset: PublishedDataset,
        query: MembershipQuery,
    ) -> List[MembershipCandidate]:
        """Return Candidates that pass Target ∧ Cue ∧ Second membership."""
        ...
