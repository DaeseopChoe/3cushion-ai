"""
Strategy Corpus helpers — seed snapshot construction.

Read-only corpus materialization for MemoryStrategyRepository.
"""

from __future__ import annotations

from typing import Iterable, Mapping, Optional

from models import StrategyRef

from .exceptions import InvalidStrategyReference, StrategyRepositoryError
from .models import FrozenStrategy, StrategyHandle


def _require_ref(strategy_ref: StrategyRef | None) -> StrategyRef:
    if strategy_ref is None or strategy_ref == "":
        raise InvalidStrategyReference("strategy_ref is empty")
    return strategy_ref


def build_corpus(
    strategies: Optional[Mapping[StrategyRef, StrategyHandle]] = None,
    *,
    seed: Optional[Iterable[StrategyHandle]] = None,
) -> dict[StrategyRef, StrategyHandle]:
    """
    Build an immutable-intent snapshot of Strategy Handles.

    Raises InvalidStrategyReference for empty refs.
    Raises StrategyRepositoryError on duplicate strategy_ref in seed/strategies.
    """
    store: dict[StrategyRef, StrategyHandle] = {}

    if strategies is not None:
        for ref, handle in strategies.items():
            key = _require_ref(ref)
            if handle is None:
                raise StrategyRepositoryError(f"missing handle for {key}")
            if not isinstance(handle, FrozenStrategy):
                raise StrategyRepositoryError(
                    f"handle for {key} must be FrozenStrategy"
                )
            handle_ref = _require_ref(handle.strategy_ref)
            if handle_ref != key:
                raise StrategyRepositoryError(
                    f"handle strategy_ref {handle_ref!r} != map key {key!r}"
                )
            if key in store:
                raise StrategyRepositoryError(f"duplicate strategy_ref: {key}")
            store[key] = handle

    if seed is not None:
        for handle in seed:
            if handle is None or not isinstance(handle, FrozenStrategy):
                raise StrategyRepositoryError("seed entry must be FrozenStrategy")
            key = _require_ref(handle.strategy_ref)
            if key in store:
                raise StrategyRepositoryError(f"duplicate strategy_ref: {key}")
            store[key] = handle

    return store
