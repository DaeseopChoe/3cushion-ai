"""
Even Ratio (rail-based) simulator
---------------------------------
Computes the 1-cushion (C1) rail point using the ratio of normal distances
from cue ball (CO) and object ball (OB) to a selected rail.
Units: RG (long 0..80, short 0..40).

Author: 3C AI Coach
Version: 1.0.0
"""

from dataclasses import dataclass
from typing import Tuple, Literal, Dict, Any
import json

MM_PER_GRID = 35.55
BALL_RADIUS_MM = 30.75

Rail = Literal["long_left", "long_right", "short_bottom", "short_top"]

@dataclass
class Point:
    x: float  # RG (0..80 for long axis)
    y: float  # RG (0..40 for short axis)

@dataclass
class Result:
    C1: Point
    d1: float
    d2: float
    ratio: float
    rail: Rail

def _edge_distance_rg(p: Point, rail: Rail) -> float:
    """Return effective normal distance from ball edge to the chosen rail, in RG.
    Negative values are clamped to 0 (frozen).
    """
    if rail == "long_left":
        d_mm = p.x * MM_PER_GRID - BALL_RADIUS_MM
    elif rail == "long_right":
        d_mm = (80 - p.x) * MM_PER_GRID - BALL_RADIUS_MM
    elif rail == "short_bottom":
        d_mm = p.y * MM_PER_GRID - BALL_RADIUS_MM
    elif rail == "short_top":
        d_mm = (40 - p.y) * MM_PER_GRID - BALL_RADIUS_MM
    else:
        raise ValueError(f"Unknown rail: {rail}")
    d_rg = d_mm / MM_PER_GRID
    return max(d_rg, 0.0)

def _rail_anchor(rail: Rail) -> Tuple[float, float]:
    if rail == "long_left":
        return (0.0, None)  # x fixed, y varies
    if rail == "long_right":
        return (80.0, None)
    if rail == "short_bottom":
        return (None, 0.0)  # y fixed, x varies
    if rail == "short_top":
        return (None, 40.0)
    raise ValueError(f"Unknown rail: {rail}")

def compute_c1(CO: Point, OB: Point, rail: Rail = "long_left", division: Literal["internal", "external"] = "internal") -> Result:
    d1 = _edge_distance_rg(CO, rail)
    d2 = _edge_distance_rg(OB, rail)
    # To avoid division by zero in extreme cases
    if division == "internal":
        denom = d1 + d2
    else:
        denom = d1 - d2
    if abs(denom) < 1e-9:
        raise ZeroDivisionError("Degenerate configuration: denominator ~ 0. Try switching division mode.")
    ratio = d1 / d2 if d2 != 0 else float("inf")

    x_anchor, y_anchor = _rail_anchor(rail)

    if x_anchor is not None:  # long rail: y varies
        y = CO.y + (OB.y - CO.y) * (d1 / denom)
        C1 = Point(x_anchor, y)
    else:  # short rail: x varies
        x = CO.x + (OB.x - CO.x) * (d1 / denom)
        C1 = Point(x, y_anchor)  # type: ignore[arg-type]

    return Result(C1=C1, d1=d1, d2=d2, ratio=ratio, rail=rail)

def result_to_dict(res: Result) -> Dict[str, Any]:
    return {
        "rail": res.rail,
        "C1": {"x": round(res.C1.x, 3), "y": round(res.C1.y, 3)},
        "d1": round(res.d1, 3),
        "d2": round(res.d2, 3),
        "ratio": (round(res.ratio, 6) if res.ratio != float("inf") else "inf")
    }

def from_dataset(json_path: str) -> Dict[str, Any]:
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    ex = data.get("examples", [])[0]
    CO = Point(ex["CO"]["x"], ex["CO"]["y"])
    OB = Point(ex["OB"]["x"], ex["OB"]["y"])
    rail = ex["rail"]
    res = compute_c1(CO, OB, rail=rail)
    return result_to_dict(res)

if __name__ == "__main__":
    # Demo using the example values
    CO = Point(10.0, 10.0)
    OB = Point(20.0, 40.0)
    res = compute_c1(CO, OB, rail="long_left", division="internal")
    print("Even Ratio (rail-based) demo → CO=(10,10), OB=(20,40), rail=long_left")
    print(result_to_dict(res))
