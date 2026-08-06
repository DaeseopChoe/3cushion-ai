"""
Geometry Engine interfaces.

ModalExecution → GeometryContext (context only; no geometry math).
"""

from __future__ import annotations

from typing import Protocol, runtime_checkable

from modal import ModalExecution

from .context import GeometryContext


@runtime_checkable
class GeometryEngine(Protocol):
    """
    Geometry Context Layer.

    Converts ModalExecution into a GeometryContext.
    Does not compute geometry or run search algorithms.
    """

    def execute(self, modal_execution: ModalExecution) -> GeometryContext:
        """Return a frozen GeometryContext for the given ModalExecution."""
        ...
