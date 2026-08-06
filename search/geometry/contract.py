"""Geometry Metrics Engine contract constants."""

from __future__ import annotations

GEOMETRY_METRICS_ENGINE_ID = "geometry_metrics_v1"

# Equal weights for baseline providers (extensible).
WEIGHT_DISTANCE = 0.25
WEIGHT_ANGLE = 0.25
WEIGHT_SIMILARITY = 0.25
WEIGHT_ERROR = 0.25

# Table diagonal used for distance normalization (80x40 grid).
TABLE_DIAGONAL = (80.0**2 + 40.0**2) ** 0.5
