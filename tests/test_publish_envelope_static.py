"""
Phase 5 — Product Envelope Static Publisher tests.

Uses temporary directories only — does not touch repo-root dataset/.
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
    InvalidEnvelopePublishInput,
    emit_published_package,
    publish_envelope_static,
    published_envelope_target,
    run_product_export,
)
from product.__main__ import main as product_main  # noqa: E402


def _payload() -> dict:
    strategy = make_fixture_strategy()
    geom = make_fixture_geometry_result(strategy)
    return {
        "sourceSnapshotIds": ["snap-publish-envelope"],
        "exportedAt": "2026-08-06T15:00:00.000Z",
        "generatorBuildIdentity": "product-publish-envelope-v1",
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
    result = emit_published_package(artifact, tmp_path / "export")
    return result.package_dir


def test_publish_valid_package_creates_target(
    package_dir: Path, tmp_path: Path
) -> None:
    dataset_root = tmp_path / "dataset"
    result = publish_envelope_static(package_dir, dataset_root=dataset_root)
    target = published_envelope_target(dataset_root)
    assert result.target_path == target
    assert target.is_file()
    assert not target.with_name(target.name + ".tmp").exists()
    source_bytes = (package_dir / "dataset.json").read_bytes()
    assert target.read_bytes() == source_bytes
    assert result.record_count >= 1


def test_publish_creates_missing_directories(
    package_dir: Path, tmp_path: Path
) -> None:
    dataset_root = tmp_path / "fresh" / "dataset"
    assert not dataset_root.exists()
    publish_envelope_static(package_dir, dataset_root=dataset_root)
    assert published_envelope_target(dataset_root).is_file()


def test_publish_full_replace_existing_target(
    package_dir: Path, tmp_path: Path
) -> None:
    dataset_root = tmp_path / "dataset"
    target = published_envelope_target(dataset_root)
    target.parent.mkdir(parents=True)
    target.write_text('{"old": true}\n', encoding="utf-8")
    old = target.read_bytes()

    publish_envelope_static(package_dir, dataset_root=dataset_root)
    new = target.read_bytes()
    assert new != old
    assert new == (package_dir / "dataset.json").read_bytes()


def test_malformed_json_preserves_existing_target(tmp_path: Path) -> None:
    package = tmp_path / "package"
    package.mkdir()
    (package / "dataset.json").write_text("{not-json", encoding="utf-8")

    dataset_root = tmp_path / "dataset"
    target = published_envelope_target(dataset_root)
    target.parent.mkdir(parents=True)
    sentinel = b'{"keep": true}\n'
    target.write_bytes(sentinel)

    with pytest.raises(InvalidEnvelopePublishInput):
        publish_envelope_static(package, dataset_root=dataset_root)

    assert target.read_bytes() == sentinel
    assert not target.with_name(target.name + ".tmp").exists()


def test_invalid_dataset_preserves_existing_target(tmp_path: Path) -> None:
    package = tmp_path / "package"
    package.mkdir()
    # Valid JSON object but fails PublishedDataset schema
    (package / "dataset.json").write_text(
        json.dumps({"datasetIdentity": "x", "records": "nope"}),
        encoding="utf-8",
    )

    dataset_root = tmp_path / "dataset"
    target = published_envelope_target(dataset_root)
    target.parent.mkdir(parents=True)
    sentinel = b'{"keep": true}\n'
    target.write_bytes(sentinel)

    with pytest.raises(InvalidEnvelopePublishInput):
        publish_envelope_static(package, dataset_root=dataset_root)

    assert target.read_bytes() == sentinel


def test_missing_source_fails(tmp_path: Path) -> None:
    with pytest.raises(InvalidEnvelopePublishInput):
        publish_envelope_static(tmp_path / "missing", dataset_root=tmp_path / "dataset")


def test_source_unchanged_after_publish(
    package_dir: Path, tmp_path: Path
) -> None:
    source = package_dir / "dataset.json"
    before = source.read_bytes()
    publish_envelope_static(package_dir, dataset_root=tmp_path / "dataset")
    assert source.read_bytes() == before


def test_no_temp_left_after_success(package_dir: Path, tmp_path: Path) -> None:
    dataset_root = tmp_path / "dataset"
    target = published_envelope_target(dataset_root)
    publish_envelope_static(package_dir, dataset_root=dataset_root)
    assert not list(target.parent.glob("*.tmp"))


def test_accepts_export_root_with_package_subdir(
    package_dir: Path, tmp_path: Path
) -> None:
    export_root = package_dir.parent
    assert (export_root / "package" / "dataset.json").is_file()
    result = publish_envelope_static(
        export_root, dataset_root=tmp_path / "dataset"
    )
    assert result.target_path.is_file()


def test_cli_publish_envelope_static(package_dir: Path, tmp_path: Path) -> None:
    dataset_root = tmp_path / "dataset"
    code = product_main(
        [
            "publish-envelope-static",
            "--package",
            str(package_dir),
            "--dataset-root",
            str(dataset_root),
        ]
    )
    assert code == 0
    assert published_envelope_target(dataset_root).is_file()


def test_cli_publish_failure_nonzero(tmp_path: Path) -> None:
    code = product_main(
        [
            "publish-envelope-static",
            "--package",
            str(tmp_path / "no-package"),
            "--dataset-root",
            str(tmp_path / "dataset"),
        ]
    )
    assert code == 1
