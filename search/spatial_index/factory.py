"""Factory for Spatial Index."""

from __future__ import annotations

from .builder import DefaultSpatialIndexBuilder


def create_spatial_index_builder() -> DefaultSpatialIndexBuilder:
    """Create DefaultSpatialIndexBuilder."""
    return DefaultSpatialIndexBuilder()
