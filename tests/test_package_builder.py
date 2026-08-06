"""
Mission 02 — Published Package Builder tests.

Export Handoff Artifact → Package Builder → Export Folder → Mission 03 contract
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from generator.fixtures import FixtureGeometryPort  # noqa: E402
from loader import create_package_loader  # noqa: E402
from product import (  # noqa: E402
    InvalidPackageInput,
    Mission03ContractError,
    assert_mission03_input_contract,
    emit_published_package,
    load_export_handoff_artifact,
    run_product_export,
    serialize_handoff,
)
from product.package_builder import PackageBuilder  # noqa: E402
from product.package_factory import (  # noqa: E402
    build_published_package,
    emit_published_package_from_handoff_json,
)
from validation import (  # noqa: E402
    validate_dataset,
    validate_manifest,
    validate_package,
    validate_version,
)


def _fixture_export_payload() -> dict:
    from generator.fixtures import make_fixture_geometry_result, make_fixture_strategy

    strategy = make_fixture_strategy()
    geom = make_fixture_geometry_result(strategy)
    return {
        "sourceSnapshotIds": ["snap-mission-02"],
        "exportedAt": "2026-08-06T12:00:00.000Z",
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
def handoff_artifact():
    return run_product_export(
        _fixture_export_payload(),
        geometry=FixtureGeometryPort(),
    )


def test_package_builder_from_handoff(handoff_artifact) -> None:
    bundle = build_published_package(handoff_artifact)
    assert bundle.identities.package_identity.startswith("pkg-")
    assert bundle.package_json["packageIdentity"] == bundle.identities.package_identity
    assert "records" in bundle.dataset_json
    validate_dataset(dict(bundle.dataset_json))
    validate_package(dict(bundle.package_json))
    validate_manifest(dict(bundle.manifest_json))
    validate_version(dict(bundle.version_json))
    assert_mission03_input_contract(bundle)


def test_write_package_folder(handoff_artifact, tmp_path: Path) -> None:
    result = emit_published_package(handoff_artifact, tmp_path)
    package_dir = result.package_dir
    assert (package_dir / "dataset.json").exists()
    assert (package_dir / "package.json").exists()
    assert (package_dir / "manifest.json").exists()
    assert (package_dir / "version.json").exists()
    assert (package_dir / "metadata" / "provenance.json").exists()
    assert (package_dir / "metadata" / "identities.json").exists()
    assert (package_dir / "metadata" / "build.json").exists()

    package_data = json.loads((package_dir / "package.json").read_text(encoding="utf-8"))
    manifest_data = json.loads((package_dir / "manifest.json").read_text(encoding="utf-8"))
    version_data = json.loads((package_dir / "version.json").read_text(encoding="utf-8"))

    loaded = create_package_loader().load(
        package_data,
        manifest_data=manifest_data,
        version_data=version_data,
    )
    assert len(loaded.records) == len(handoff_artifact.dataset.records)


def test_emit_from_handoff_json_roundtrip(handoff_artifact, tmp_path: Path) -> None:
    handoff_path = tmp_path / "export_handoff.json"
    handoff_path.write_text(
        json.dumps(serialize_handoff(handoff_artifact), ensure_ascii=False),
        encoding="utf-8",
    )
    raw = json.loads(handoff_path.read_text(encoding="utf-8"))
    result = emit_published_package_from_handoff_json(raw, tmp_path / "out")
    assert result.package_dir.exists()
    loaded_artifact = load_export_handoff_artifact(raw)
    assert loaded_artifact.provenance.source_snapshot_ids == (
        "snap-mission-02",
    )


def test_rejects_package_fields_as_input() -> None:
    with pytest.raises(InvalidPackageInput):
        load_export_handoff_artifact(
            {
                "packageIdentity": "pkg-x",
                "dataset": {"records": []},
                "provenance": {
                    "source": "x",
                    "exportedAt": "t",
                    "sourceSnapshotIds": ["a"],
                    "generatorBuildIdentity": "b",
                },
                "status": {"validated": True, "packageEmitted": False},
            }
        )


def test_mission03_contract_rejects_deploy_fields(handoff_artifact) -> None:
    bundle = build_published_package(handoff_artifact)
    from product.package_models import PublishedPackageBundle

    bad_package = dict(bundle.package_json)
    bad_package["deployment"] = True
    broken = PublishedPackageBundle(
        identities=bundle.identities,
        package_json=bad_package,
        dataset_json=bundle.dataset_json,
        manifest_json=bundle.manifest_json,
        version_json=bundle.version_json,
        metadata=bundle.metadata,
    )
    with pytest.raises(Mission03ContractError):
        assert_mission03_input_contract(broken)


def test_cli_package_command(handoff_artifact, tmp_path: Path) -> None:
    from product.__main__ import main

    handoff = tmp_path / "handoff.json"
    out_root = tmp_path / "export_root"
    handoff.write_text(
        json.dumps(serialize_handoff(handoff_artifact), ensure_ascii=False),
        encoding="utf-8",
    )
    code = main(["package", "--handoff", str(handoff), "--out", str(out_root)])
    assert code == 0
    assert (out_root / "package" / "package.json").exists()


def test_builder_does_not_mutate_dataset_records(handoff_artifact) -> None:
    before = [dict(r) for r in handoff_artifact.dataset_json["records"]]
    bundle = PackageBuilder().build(handoff_artifact)
    after_handoff = [dict(r) for r in handoff_artifact.dataset_json["records"]]
    assert before == after_handoff
    # Package dataset adds datasetIdentity only at wrapper level
    assert bundle.dataset_json["records"] == handoff_artifact.dataset_json["records"]
