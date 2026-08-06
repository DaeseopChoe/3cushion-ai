"""
Default Modal Engine — StrategyExecution → ModalExecution.

Does not modify StrategyExecution or Repository.
Does not create Geometry.
Does not run Search Algorithm.
Does not re-run Validation.
Does not call Strategy Engine / Strategy Repository.
"""

from __future__ import annotations

from types import MappingProxyType
from typing import Mapping, Optional

from strategy_engine import StrategyExecution

from .exceptions import InvalidModalExecution, ModalExecutionFailure
from .execution import ModalExecution


class DefaultModalEngine:
    """Concrete ModalEngine. Modal execution-context materialization only."""

    def execute(
        self,
        strategy_execution: StrategyExecution,
        *,
        metadata: Optional[Mapping[str, object]] = None,
    ) -> ModalExecution:
        if strategy_execution is None:
            raise InvalidModalExecution("StrategyExecution is required")
        if not isinstance(strategy_execution, StrategyExecution):
            raise InvalidModalExecution(
                "strategy_execution must be a StrategyExecution"
            )

        strategy_ref = strategy_execution.strategy_ref
        if strategy_ref is None or strategy_ref == "":
            raise InvalidModalExecution("strategy_ref is empty")

        try:
            frozen_meta: Optional[Mapping[str, object]] = None
            if metadata is not None:
                frozen_meta = MappingProxyType(dict(metadata))
            return ModalExecution(
                strategy_ref=strategy_ref,
                strategy_execution=strategy_execution,
                metadata=frozen_meta,
            )
        except InvalidModalExecution:
            raise
        except Exception as exc:  # noqa: BLE001
            raise ModalExecutionFailure(str(exc), cause=exc) from exc
