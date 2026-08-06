"""
Mission 01 — Product Export Pipeline tests.

Export payload → Product Host → Generator Host → Export Handoff Artifact
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from generator.fixtures import (  # noqa: E402
    FIXTURE_STRATEGY_REF,
    FixtureGeometryPort,
    make_fixture_geometry_result,
    make_fixture_strategy,
)
from models import Point  # noqa: E402
from product import (  # noqa: E402
    AuthoringAdapter,
    ExportHandoffArtifact,
    HandoffContractError,
    InvalidExportRequest,
    assert_mission02_input_contract,
    create_product_export_host,
    handoff_to_json,
    run_product_export,
    serialize_handoff,
)
from product.geometry_port import MapGeometryPort  # noqa: E402
from validation import validate_dataset  # noqa: E402


def _fixture_export_payload() -> dict:
    strategy = make_fixture_strategy()
    geom = make_fixture_geometry_result(strategy)
    return {
        "sourceSnapshotIds": ["snap-mission-01"],
        "exportedAt": "2026-08-06T00:00:00.000Z",
        "generatorBuildIdentity": "product-export-pipeline-v1",
        "strategies": [
            {
                "strategyRef": str(strategy.strategy_ref),
                "cue": {"x": strategy.cue.x, "y": strategy.cue.y},
                "target": {"x": strategy.target.x, "y": strategy.target.y},
                "second": {"x": strategy.second.x, "y": strategy.second.y},
                "geometry": {
                    "cue": {"x": geom.cue.x, "y": geom.cue.y},
                    "impact": {"x": geom.impact.x, "y": geom.impact.y},
                    "c3": {"x": geom.c3.x, "y": geom.c3.y},
                    "lastScoringCushion": {
                        "x": geom.last_scoring_cushion.x,
                        "y": geom.last_scoring_cushion.y,
                    },
                    "cueTrajectory": [
                        {"x": p.x, "y": p.y} for p in geom.cue_trajectory
                    ],
                    "lineOfScore": [
                        {"x": p.x, "y": p.y} for p in geom.line_of_score
                    ],
                },
            }
        ],
    }


def test_authoring_adapter_normalizes_payload() -> None:
    request = AuthoringAdapter().adapt(_fixture_export_payload())
    assert request.source_snapshot_ids == ("snap-mission-01",)
    assert len(request.items) == 1
    assert request.items[0].strategy.strategy_ref == FIXTURE_STRATEGY_REF
    assert request.items[0].geometry is not None


def test_authoring_adapter_rejects_empty_strategies() -> None:
    with pytest.raises(InvalidExportRequest):
        AuthoringAdapter().adapt(
            {
                "sourceSnapshotIds": ["s1"],
                "exportedAt": "2026-08-06T00:00:00.000Z",
                "strategies": [],
            }
        )


def test_product_export_pipeline_produces_handoff() -> None:
    artifact = run_product_export(
        _fixture_export_payload(),
        geometry=FixtureGeometryPort(),
    )
    assert isinstance(artifact, ExportHandoffArtifact)
    assert artifact.status.validated is True
    assert artifact.status.package_emitted is False
    assert len(artifact.dataset.records) == 1
    assert artifact.provenance.source == "export_pipeline"
    assert_mission02_input_contract(artifact)
    validate_dataset(dict(artifact.dataset_json))

    raw = handoff_to_json(artifact)
    assert "dataset" in raw
    assert "provenance" in raw
    assert "status" in raw
    assert "packageIdentity" not in raw


def test_product_export_with_fallback_geometry_only() -> None:
    """Payload without per-strategy geometry uses injected GeometryConsumePort."""
    strategy = make_fixture_strategy()
    payload = {
        "sourceSnapshotIds": ["snap-fallback"],
        "exportedAt": "2026-08-06T00:00:00.000Z",
        "strategies": [
            {
                "strategyRef": str(strategy.strategy_ref),
                "cue": {"x": strategy.cue.x, "y": strategy.cue.y},
                "target": {"x": strategy.target.x, "y": strategy.target.y},
                "second": {"x": strategy.second.x, "y": strategy.second.y},
            }
        ],
    }
    artifact = run_product_export(payload, geometry=FixtureGeometryPort())
    assert len(artifact.dataset.records) == 1
    assert artifact.status.package_emitted is False


def test_create_product_export_host_run_export_payload() -> None:
    host = create_product_export_host(geometry=FixtureGeometryPort())
    artifact = host.run_export_payload(_fixture_export_payload())
    assert artifact.status.validated is True


def test_mission02_contract_rejects_package_emitted() -> None:
    artifact = run_product_export(
        _fixture_export_payload(),
        geometry=FixtureGeometryPort(),
    )
    from product.models import ExportHandoffStatus

    broken = ExportHandoffArtifact(
        dataset=artifact.dataset,
        provenance=artifact.provenance,
        status=ExportHandoffStatus(validated=True, package_emitted=True),
        dataset_json=artifact.dataset_json,
    )
    with pytest.raises(HandoffContractError):
        assert_mission02_input_contract(broken)


def test_cli_export_writes_handoff(tmp_path: Path) -> None:
    from product.__main__ import main

    req = tmp_path / "export_request.json"
    out = tmp_path / "export_handoff.json"
    req.write_text(json.dumps(_fixture_export_payload()), encoding="utf-8")
    code = main(["export", "--request", str(req), "--out", str(out)])
    assert code == 0
    assert out.exists()
    data = json.loads(out.read_text(encoding="utf-8"))
    assert data["status"]["validated"] is True
    assert data["status"]["packageEmitted"] is False
    assert len(data["dataset"]["records"]) >= 1


def test_map_geometry_port_uses_mapping() -> None:
    strategy = make_fixture_strategy()
    geom = make_fixture_geometry_result(strategy)
    port = MapGeometryPort({strategy.strategy_ref: geom})
    got = port.consume(strategy)
    assert got.impact == Point(x=35.0, y=18.0)


def test_serialize_handoff_stable_keys() -> None:
    artifact = run_product_export(
        _fixture_export_payload(),
        geometry=FixtureGeometryPort(),
    )
    obj = serialize_handoff(artifact)
    assert set(obj.keys()) == {"dataset", "provenance", "status"}
