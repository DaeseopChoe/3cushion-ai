"""Cue Sampler output — cueSet only."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Tuple

from models import Point, StrategyRef


@dataclass(frozen=True)
class CueSetResult:
    """
    Cue Sampler output (SP-C-05).

    cue_set = Point[] with N ≥ 1.
    Intermediate Sampler product only — not a Dataset record.
    """

    strategy_ref: StrategyRef
    cue_set: Tuple[Point, ...]
