"""Second Sampler output — secondSet only."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple

from models import Point, StrategyRef


@dataclass(frozen=True)
class SecondSetResult:
    """
    Second Sampler output (SP-S-06).

    second_set = Point[] with M ≥ 1.
    Intermediate Sampler product only — not a Dataset record.
    """

    strategy_ref: StrategyRef
    second_set: Tuple[Point, ...]
