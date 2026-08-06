"""
Authoring Adapter — Export / snapshot payload → AuthoringStrategy[].

Does not modify Generator. Does not embed Modal into Envelope.
"""

from __future__ import annotations

from typing import Any, Mapping, Optional, Sequence

from generator.strategy import AuthoringStrategy
from generator.trajectory_generator.geometry import GeometryConsumeResult
from models import Point, StrategyRef

from .exceptions import AuthoringAdapterError, InvalidExportRequest
from .models import AuthoringExportItem, ProductExportRequest


def _point_from_mapping(raw: Any, *, label: str) -> Point:
    if not isinstance(raw, Mapping):
        raise AuthoringAdapterError(f"{label} must be an object with x, y")
    try:
        return Point(x=float(raw["x"]), y=float(raw["y"]))
    except (KeyError, TypeError, ValueError) as exc:
        raise AuthoringAdapterError(f"{label} must have numeric x, y") from exc


def _optional_point(raw: Any, *, label: str) -> Optional[Point]:
    if raw is None:
        return None
    return _point_from_mapping(raw, label=label)


def _geometry_from_mapping(raw: Any) -> GeometryConsumeResult:
    if not isinstance(raw, Mapping):
        raise AuthoringAdapterError("geometry must be an object")
    cue = _point_from_mapping(raw.get("cue"), label="geometry.cue")
    impact = _point_from_mapping(raw.get("impact"), label="geometry.impact")
    c3 = _point_from_mapping(raw.get("c3"), label="geometry.c3")
    last = _point_from_mapping(
        raw.get("lastScoringCushion") or raw.get("last_scoring_cushion"),
        label="geometry.lastScoringCushion",
    )
    cue_traj_raw = raw.get("cueTrajectory") or raw.get("cue_trajectory")
    line_raw = raw.get("lineOfScore") or raw.get("line_of_score")
    if not isinstance(cue_traj_raw, Sequence) or len(cue_traj_raw) < 2:
        raise AuthoringAdapterError("geometry.cueTrajectory needs ≥ 2 points")
    if not isinstance(line_raw, Sequence) or len(line_raw) < 2:
        raise AuthoringAdapterError("geometry.lineOfScore needs ≥ 2 points")
    cue_trajectory = tuple(
        _point_from_mapping(p, label=f"geometry.cueTrajectory[{i}]")
        for i, p in enumerate(cue_traj_raw)
    )
    line_of_score = tuple(
        _point_from_mapping(p, label=f"geometry.lineOfScore[{i}]")
        for i, p in enumerate(line_raw)
    )
    return GeometryConsumeResult(
        cue=cue,
        impact=impact,
        cue_trajectory=cue_trajectory,
        c3=c3,
        last_scoring_cushion=last,
        line_of_score=line_of_score,
    )


def _strategy_ref(raw: Mapping[str, Any], index: int) -> StrategyRef:
    ref = raw.get("strategyRef") or raw.get("strategy_ref")
    if isinstance(ref, str) and ref.strip():
        return StrategyRef(ref.strip())
    position_id = raw.get("positionId") or raw.get("position_id")
    slot = raw.get("slot")
    if isinstance(position_id, str) and position_id.strip() and isinstance(slot, str):
        return StrategyRef(f"{position_id.strip()}.{slot.strip()}")
    raise AuthoringAdapterError(
        f"strategies[{index}] requires strategyRef or positionId+slot"
    )


class AuthoringAdapter:
    """
    Adapt Product Export JSON / dict → ProductExportRequest.

    Accepts either:
    - already-normalized { sourceSnapshotIds, exportedAt, strategies: [...] }
    - Workspace-like { id / sourceSnapshotIds, exportedAt?, records: Position-like[] }
    """

    def adapt(self, payload: Mapping[str, Any]) -> ProductExportRequest:
        if payload is None or not isinstance(payload, Mapping):
            raise InvalidExportRequest("Export payload must be an object")

        exported_at = str(
            payload.get("exportedAt") or payload.get("exported_at") or ""
        ).strip()
        if not exported_at:
            raise InvalidExportRequest("exportedAt is required")

        snapshot_ids = payload.get("sourceSnapshotIds") or payload.get(
            "source_snapshot_ids"
        )
        if snapshot_ids is None and isinstance(payload.get("id"), str):
            snapshot_ids = [payload["id"]]
        if not isinstance(snapshot_ids, Sequence) or isinstance(snapshot_ids, (str, bytes)):
            raise InvalidExportRequest("sourceSnapshotIds must be a string array")
        ids = tuple(str(x) for x in snapshot_ids if str(x).strip())
        if not ids:
            raise InvalidExportRequest("sourceSnapshotIds must be non-empty")

        build_id = str(
            payload.get("generatorBuildIdentity")
            or payload.get("generator_build_identity")
            or "product-export-pipeline-v1"
        ).strip()

        strategies_raw = payload.get("strategies")
        if strategies_raw is None and isinstance(payload.get("records"), Sequence):
            strategies_raw = self._flatten_records(payload["records"])
        if not isinstance(strategies_raw, Sequence) or isinstance(
            strategies_raw, (str, bytes)
        ):
            raise InvalidExportRequest("strategies must be an array")
        if len(strategies_raw) == 0:
            raise InvalidExportRequest("strategies must be non-empty")

        items: list[AuthoringExportItem] = []
        for index, raw in enumerate(strategies_raw):
            if not isinstance(raw, Mapping):
                raise AuthoringAdapterError(f"strategies[{index}] must be an object")
            strategy = AuthoringStrategy(
                strategy_ref=_strategy_ref(raw, index),
                cue=_point_from_mapping(
                    raw.get("cue") or (raw.get("balls") or {}).get("cue"),
                    label=f"strategies[{index}].cue",
                ),
                target=_point_from_mapping(
                    raw.get("target") or (raw.get("balls") or {}).get("target"),
                    label=f"strategies[{index}].target",
                ),
                second=_optional_point(
                    raw.get("second") or (raw.get("balls") or {}).get("second"),
                    label=f"strategies[{index}].second",
                ),
            )
            geometry = None
            if raw.get("geometry") is not None:
                geometry = _geometry_from_mapping(raw["geometry"])
            items.append(AuthoringExportItem(strategy=strategy, geometry=geometry))

        return ProductExportRequest(
            source_snapshot_ids=ids,
            exported_at=exported_at,
            items=tuple(items),
            generator_build_identity=build_id,
        )

    @staticmethod
    def _flatten_records(records: Sequence[Any]) -> list[dict[str, Any]]:
        """Legacy PositionRecord[] → strategy rows (balls + strategyRef)."""
        out: list[dict[str, Any]] = []
        for rec in records:
            if not isinstance(rec, Mapping):
                continue
            position_id = str(rec.get("positionId") or rec.get("position_id") or "")
            balls = rec.get("balls")
            strategies = rec.get("strategies")
            if not isinstance(balls, Mapping) or not isinstance(strategies, Mapping):
                continue
            for slot in ("S1", "S2", "S3"):
                entry = strategies.get(slot)
                if entry is None:
                    continue
                row: dict[str, Any] = {
                    "positionId": position_id,
                    "slot": slot,
                    "balls": balls,
                    "cue": balls.get("cue"),
                    "target": balls.get("target"),
                    "second": balls.get("second"),
                }
                if isinstance(entry, Mapping):
                    ref = entry.get("strategyRef")
                    if isinstance(ref, str) and ref.strip():
                        row["strategyRef"] = ref.strip()
                    # Optional precomputed geometry from meta.impact only is insufficient;
                    # callers may attach geometry separately.
                out.append(row)
        return out
