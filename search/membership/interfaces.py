"""Interfaces for optimized Membership candidate prefilter."""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from membership.interfaces import MembershipQuery
from models import EnvelopeRecord, PublishedDataset


@runtime_checkable
class CandidatePrefilterAdapter(Protocol):
    """Return candidate records for optimized Membership, or None for fallback."""

    def select_records(
        self,
        dataset: PublishedDataset,
        query: MembershipQuery,
    ) -> tuple[EnvelopeRecord, ...] | None:
        ...
