"""
Resolve Engine — strategy_ref → Strategy.

Contract: Architecture/RESOLVE_SSOT.md

MembershipCandidate → Repository.lookup(strategy_ref) → Strategy

Does not call Membership, Loader, Validation.
Does not read Published Dataset.
Does not create Strategy or Modal.
Does not mutate MembershipCandidate.
"""

from __future__ import annotations

from models import MembershipCandidate

from .exceptions import ResolveFailure, ResolveInputError, StrategyNotFound
from .interfaces import Strategy
from .repository import StrategyRepository


class DefaultResolveEngine:
    """Concrete ResolveEngine. Lookup only."""

    def __init__(self, repository: StrategyRepository) -> None:
        if repository is None:
            raise ResolveInputError("StrategyRepository is required")
        self._repository = repository

    def resolve(self, candidate: MembershipCandidate) -> Strategy:
        if candidate is None:
            raise ResolveInputError("MembershipCandidate is required")
        if not isinstance(candidate, MembershipCandidate):
            raise ResolveInputError("candidate must be a MembershipCandidate model")

        strategy_ref = candidate.strategy_ref
        if strategy_ref is None or strategy_ref == "":
            raise ResolveInputError("strategy_ref is required")

        try:
            return self._repository.lookup(strategy_ref)
        except StrategyNotFound:
            raise
        except ResolveInputError:
            raise
        except Exception as exc:  # noqa: BLE001 — wrap unexpected repository failures
            raise ResolveFailure(str(exc), cause=exc) from exc
