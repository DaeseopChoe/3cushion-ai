"""
Geometry Engine public API.

ModalExecution → GeometryContext (context only; no geometry math).
"""

from .context import GeometryContext
from .engine import DefaultGeometryEngine
from .exceptions import (
    GeometryContextFailure,
    GeometryEngineError,
    InvalidGeometryContext,
)
from .factory import create_geometry_engine
from .interfaces import GeometryEngine

__all__ = [
    "GeometryEngine",
    "DefaultGeometryEngine",
    "GeometryContext",
    "create_geometry_engine",
    "GeometryEngineError",
    "InvalidGeometryContext",
    "GeometryContextFailure",
]
