"""
Geometry Engine factory.
"""

from __future__ import annotations

from .engine import DefaultGeometryEngine
from .interfaces import GeometryEngine


def create_geometry_engine() -> GeometryEngine:
    """Return the default Geometry Context Engine."""
    return DefaultGeometryEngine()
