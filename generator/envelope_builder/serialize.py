"""
Serialize EnvelopeRecord fields to Schema JSON shape for Validation Layer.
"""

from __future__ import annotations

from typing import Any, Dict, List, Sequence

from models import Point


def point_to_json(point: Point) -> Dict[str, float]:
    return {"x": point.x, "y": point.y}


def point_set_to_json(points: Sequence[Point]) -> List[Dict[str, float]]:
    return [point_to_json(p) for p in points]


def envelope_record_to_json(
    *,
    strategy_ref: str,
    target: Point,
    cue_set: Sequence[Point],
    second_set: Sequence[Point],
) -> Dict[str, Any]:
    """Schema EnvelopeRecord object (camelCase keys)."""
    return {
        "strategyRef": strategy_ref,
        "target": point_to_json(target),
        "cueSet": point_set_to_json(cue_set),
        "secondSet": point_set_to_json(second_set),
    }


def dataset_wrapper_for_record(record_json: Dict[str, Any]) -> Dict[str, Any]:
    """
    Wrap a single EnvelopeRecord for validate_dataset().

    Published Dataset schema validates records[] items as EnvelopeRecord.
    """
    return {"records": [record_json]}
