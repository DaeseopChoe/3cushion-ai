"""
Search Execution Context — disposable per-request state.

Contract: Architecture/SEARCH_SESSION_SSOT.md

Holds only one search execution's data.
After close(), contents are cleared and the context is disposable.
"""

from __future__ import annotations

from typing import Optional, Tuple

from membership import MembershipQuery
from models import MembershipCandidate
from resolve import Strategy
from runtime.result import SearchResult


class SearchExecutionContext:
    """
    Per-request execution bag for one SearchSession.run().

    Disposable after Session ends (close()).
    """

    def __init__(self) -> None:
        self.query: Optional[MembershipQuery] = None
        self.candidates: Tuple[MembershipCandidate, ...] = ()
        self.strategies: Tuple[Strategy, ...] = ()
        self.result: Optional[SearchResult] = None
        self._closed: bool = False

    @property
    def closed(self) -> bool:
        return self._closed

    def close(self) -> None:
        """Mark context closed and drop execution data (disposable)."""
        if self._closed:
            return
        self._closed = True
        self.query = None
        self.candidates = ()
        self.strategies = ()
        self.result = None
