"""
Default Geometry Engine — ModalExecution → GeometryContext.

Does not modify ModalExecution.
Does not perform Geometry calculation.
Does not run Search Algorithm.
Does not re-run Validation.
Does not call Modal Engine / Strategy Engine / Repository.
"""

from __future__ import annotations

from types import MappingProxyType
from typing import Mapping, Optional

from modal import ModalExecution

from .context import GeometryContext
from .exceptions import GeometryContextFailure, InvalidGeometryContext


class DefaultGeometryEngine:
    """Concrete GeometryEngine. Geometry context materialization only."""

    def execute(
        self,
        modal_execution: ModalExecution,
        *,
        metadata: Optional[Mapping[str, object]] = None,
    ) -> GeometryContext:
        if modal_execution is None:
            raise InvalidGeometryContext("ModalExecution is required")
        if not isinstance(modal_execution, ModalExecution):
            raise InvalidGeometryContext(
                "modal_execution must be a ModalExecution"
            )

        strategy_ref = modal_execution.strategy_ref
        if strategy_ref is None or strategy_ref == "":
            raise InvalidGeometryContext("strategy_ref is empty")

        try:
            frozen_meta: Optional[Mapping[str, object]] = None
            if metadata is not None:
                frozen_meta = MappingProxyType(dict(metadata))
            return GeometryContext(
                strategy_ref=strategy_ref,
                modal_execution=modal_execution,
                metadata=frozen_meta,
            )
        except InvalidGeometryContext:
            raise
        except Exception as exc:  # noqa: BLE001
            raise GeometryContextFailure(str(exc), cause=exc) from exc
