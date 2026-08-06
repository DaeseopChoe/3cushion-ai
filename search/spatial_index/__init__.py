"""
Spatial Index — runtime-derived coarse prefilter for PublishedDataset.

PublishedDataset remains the only search input.
Spatial Index exists only as an in-memory derived cache.
"""

from .builder import DefaultSpatialIndexBuilder
from .exceptions import (
    InvalidSpatialDataset,
    InvalidSpatialQuery,
    SpatialIndexBuildFailure,
    SpatialIndexError,
)
from .factory import create_spatial_index_builder
from .models import SpatialCell, SpatialIndex, SpatialQuery, SpatialQueryResult

__all__ = [
    "DefaultSpatialIndexBuilder",
    "InvalidSpatialDataset",
    "InvalidSpatialQuery",
    "SpatialCell",
    "SpatialIndex",
    "SpatialIndexBuildFailure",
    "SpatialIndexError",
    "SpatialQuery",
    "SpatialQueryResult",
    "create_spatial_index_builder",
]
