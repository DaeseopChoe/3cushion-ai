"""
Mission 03 — Deployment Workflow tests.
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
    FixtureGeometryPort,
    make_fixture_geometry_result,
    make_fixture_strategy,
)
from product import (  # noqa: E402
    InvalidDeploymentInput,
    emit_published_package,
    run_deployment,
    run_product_export,
    serialize_handoff,
)
from product.deployment_loader import checksum_package_dir  # noqa: E402


def _payload() -> dict:
    strategy = make_fixture_strategy()
    geom = make_fixture_geometry_result(strategy)
    return {
        "sourceSnapshotIds": ["snap-mission-03"],
        "exportedAt": "2026-08-06T15:00:00.000Z",
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


@pytest.fixture
def package_dir(tmp_path: Path) -> Path:
    artifact = run_product_export(_payload(), geometry=FixtureGeometryPort())
    result = emit_published_package(artifact, tmp_path)
    return result.package_dir


def test_deployment_workflow_ready(package_dir: Path) -> None:
    before = checksum_package_dir(package_dir)
    result = run_deployment(package_dir, target_id="local_staging")
    after = checksum_package_dir(package_dir)

    assert before == after
    assert result.report.status.state == "ready"
    assert result.report.status.package_immutable is True
    assert result.report.status.dataset_immutable is True
    assert result.report_path is not None
    assert result.report_path.exists()
    assert result.staging_dir is not None
    assert result.staging_dir.exists()
    assert (result.staging_dir / "package.json").exists()

    report = json.loads(result.report_path.read_text(encoding="utf-8"))
    assert report["validation"]["package"] == "PASS"
    assert report["metadata"]["targetId"] == "local_staging"
    assert "No Git Push" in report["notes"]


def test_deployment_rejects_handoff_json(tmp_path: Path) -> None:
    artifact = run_product_export(_payload(), geometry=FixtureGeometryPort())
    handoff = tmp_path / "export_handoff.json"
    handoff.write_text(
        json.dumps(serialize_handoff(artifact), ensure_ascii=False),
        encoding="utf-8",
    )
    # Pointing at handoff file's parent without package.json fails
    with pytest.raises(InvalidDeploymentInput):
        run_deployment(tmp_path, target_id="git_ready")


def test_deployment_git_ready_no_mirror(package_dir: Path) -> None:
    result = run_deployment(
        package_dir,
        target_id="git_ready",
        mirror_staging=False,
    )
    assert result.report.target.target_id == "git_ready"
    assert result.staging_dir is None
    assert result.report.status.state == "ready"


def test_cli_deploy(package_dir: Path) -> None:
    from product.__main__ import main

    code = main(
        ["deploy", "--package", str(package_dir), "--target", "vercel_ready"]
    )
    assert code == 0


def test_cli_pipeline(tmp_path: Path) -> None:
    from product.__main__ import main

    req = tmp_path / "request.json"
    req.write_text(json.dumps(_payload()), encoding="utf-8")
    out = tmp_path / "out"
    code = main(
        ["pipeline", "--request", str(req), "--out", str(out), "--target", "local_staging"]
    )
    assert code == 0
    assert (out / "export_handoff.json").exists()
    assert (out / "package" / "package.json").exists()
    assert (out / "deployment" / "reports").exists()
