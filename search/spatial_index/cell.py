"""Spatial cell helpers."""

from __future__ import annotations

from models import Point

from .contract import CELL_HEIGHT, CELL_WIDTH, GRID_COLS, GRID_HEIGHT, GRID_ROWS, GRID_WIDTH
from .models import SpatialCell


def _clamp(value: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, value))


def point_to_cell(point: Point) -> SpatialCell:
    """Map a table point to an 8x4 grid cell."""
    x = _clamp(point.x, 0.0, GRID_WIDTH)
    y = _clamp(point.y, 0.0, GRID_HEIGHT)
    col = min(int(x // CELL_WIDTH), GRID_COLS - 1)
    row = min(int(y // CELL_HEIGHT), GRID_ROWS - 1)
    return SpatialCell(col=col, row=row)
