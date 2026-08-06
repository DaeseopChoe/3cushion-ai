"""
Search Runtime result — Host orchestration output.

Contract: Architecture/SEARCH_RUNTIME_SSOT.md

Holds MembershipCandidate + Resolved Strategy only.
No Modal, Geometry, Ranking, Interpolation, KDTree, or Cache.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional, Tuple

from models import MembershipCandidate
from resolve import Strategy


@dataclass(frozen=True)
class SearchResult:
    """
    Session / Host output for one execute() call.

    - candidate / strategy: primary (first) hit, if any
    - candidates / strategies: all Membership → Resolve pairs (same order, same length)
    """

    candidate: Optional[MembershipCandidate] = None
    strategy: Optional[Strategy] = None
    candidates: Tuple[MembershipCandidate, ...] = ()
    strategies: Tuple[Strategy, ...] = ()
