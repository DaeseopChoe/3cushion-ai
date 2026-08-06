"""
Default Strategy Engine — Handle → Execution Context.

Does not modify Strategy Handle or Repository.
Does not create Modal.
Does not run Search Algorithm.
Does not re-run Validation.
"""

from __future__ import annotations

from types import MappingProxyType
from typing import Mapping, Optional

from strategy import FrozenStrategy, StrategyHandle

from .exceptions import InvalidStrategyHandle, StrategyExecutionFailure
from .execution import StrategyExecution


class DefaultStrategyEngine:
    """Concrete StrategyEngine. Execution-context materialization only."""

    def execute(
        self,
        strategy_handle: StrategyHandle,
        *,
        metadata: Optional[Mapping[str, object]] = None,
    ) -> StrategyExecution:
        if strategy_handle is None:
            raise InvalidStrategyHandle("Strategy Handle is required")
        if not isinstance(strategy_handle, FrozenStrategy):
            raise InvalidStrategyHandle(
                "strategy_handle must be a FrozenStrategy / StrategyHandle"
            )

        strategy_ref = strategy_handle.strategy_ref
        if strategy_ref is None or strategy_ref == "":
            raise InvalidStrategyHandle("strategy_ref is empty")

        try:
            frozen_meta: Optional[Mapping[str, object]] = None
            if metadata is not None:
                frozen_meta = MappingProxyType(dict(metadata))
            return StrategyExecution(
                strategy_ref=strategy_ref,
                handle=strategy_handle,
                metadata=frozen_meta,
            )
        except InvalidStrategyHandle:
            raise
        except Exception as exc:  # noqa: BLE001
            raise StrategyExecutionFailure(str(exc), cause=exc) from exc
