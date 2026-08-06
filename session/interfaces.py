"""
Search Session interfaces.

Contract: Architecture/SEARCH_SESSION_SSOT.md

One-shot Execution Context inside Search Runtime.
Does not replace Runtime Host.
"""

from __future__ import annotations

from typing import Optional, Protocol, runtime_checkable

from membership import MembershipQuery
from models import PublishedDataset
from runtime.result import SearchResult

from .context import SearchExecutionContext


@runtime_checkable
class SearchSession(Protocol):
    """
    Search Session (SEARCH_SESSION_SSOT).

    One search request → Membership → Resolve → SearchResult → end.
    Not reusable; create a new Session for each request.
    """

    def run(
        self,
        dataset: PublishedDataset,
        query: MembershipQuery,
    ) -> SearchResult:
        """Execute one search request. Raises if Session already consumed."""
        ...

    @property
    def context(self) -> Optional[SearchExecutionContext]:
        """Current or last ExecutionContext (closed after run completes)."""
        ...
