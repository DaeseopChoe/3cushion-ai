"""
Search Runtime Host interfaces.

Contract: Architecture/SEARCH_RUNTIME_SSOT.md

Orchestration only. No Membership / Resolve / Loader algorithm.
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from membership import MembershipQuery
from models import PublishedDataset

from .result import SearchResult


@runtime_checkable
class SearchRuntime(Protocol):
    """
    Search Runtime Host (SEARCH_RUNTIME_SSOT).

    PublishedDataset (Loader-supplied) + MembershipQuery
        → Membership → Resolve → SearchResult
    """

    def execute(
        self,
        dataset: PublishedDataset,
        query: MembershipQuery,
    ) -> SearchResult:
        """Host Membership then Resolve; return SearchResult."""
        ...
