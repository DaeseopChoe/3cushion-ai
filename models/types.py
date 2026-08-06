"""
Shared domain types for Envelope Search contracts.

Aligned with schemas/published_dataset.schema.json $defs.
No validation logic, no business logic.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import NewType

# Logical Reference to Strategy (Architecture AR-16: concrete format undecided).
StrategyRef = NewType("StrategyRef", str)

# Logical identity / reference strings (format out of scope).
DatasetIdentity = NewType("DatasetIdentity", str)
PackageIdentity = NewType("PackageIdentity", str)
ManifestIdentity = NewType("ManifestIdentity", str)
VersionIdentity = NewType("VersionIdentity", str)
GeneratorBuildIdentity = NewType("GeneratorBuildIdentity", str)
RecordIdentity = NewType("RecordIdentity", str)


@dataclass
class Point:
    """2D coordinate (schema Point)."""

    x: float
    y: float


# PointSet = List[Point] with N >= 1 (min length enforced in Mission 19 validation).
