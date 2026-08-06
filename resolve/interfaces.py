"""
Resolve Engine interfaces and Strategy handle.

Contract: Architecture/RESOLVE_SSOT.md

MembershipCandidate → Strategy (via Repository).
Does not call Membership, Loader, or Validation.
Does not create Strategy / Modal bodies.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol, runtime_checkable

from models import MembershipCandidate, StrategyRef


@dataclass(frozen=True)
class Strategy:
    """
    Authoring Strategy handle returned by Resolve.

    Resolve looks this up; it does not author Strategy or Modal content.
    Body / Modal payload are out of scope for this layer.
    """

    strategy_ref: StrategyRef


@runtime_checkable
class ResolveEngine(Protocol):
    """
    Resolve Layer (RESOLVE_SSOT).

    MembershipCandidate.strategy_ref → Strategy via Repository lookup.
    """

    def resolve(self, candidate: MembershipCandidate) -> Strategy:
        """Resolve strategy_ref to Strategy. Raises on missing / invalid input."""
        ...
