"""
Generator Pipeline E2E validation.

Strategy
  -> PublishedDataset
  -> Validation
  -> Loader
  -> MembershipCandidate
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from generator import create_generator_host  # noqa: E402
from generator.fixtures import FixtureGeometryPort, make_fixture_strategy  # noqa: E402
from generator.published_dataset_builder.serialize import (  # noqa: E402
    published_dataset_to_json,
)
from loader import create_package_loader  # noqa: E402
from membership import MembershipQuery, create_membership_engine  # noqa: E402
from models import MembershipCandidate, PublishedDataset  # noqa: E402
from validation import validate_dataset  # noqa: E402


def _package_json(dataset_json: dict) -> dict:
    return {
        "packageIdentity": "pkg-generator-e2e",
        "datasetIdentity": "ds-generator-e2e",
        "dataset": dataset_json,
        "manifestReference": "man-generator-e2e",
        "versionReference": "ver-generator-e2e",
        "generatorBuildIdentity": "build-generator-e2e",
    }


def _manifest_json() -> dict:
    return {
        "manifestIdentity": "man-generator-e2e",
        "packageReference": "pkg-generator-e2e",
        "datasetReference": "ds-generator-e2e",
        "generatorBuildIdentity": "build-generator-e2e",
        "versionReference": "ver-generator-e2e",
    }


def _version_json() -> dict:
    return {
        "versionIdentity": "ver-generator-e2e",
        "packageReference": "pkg-generator-e2e",
        "manifestReference": "man-generator-e2e",
        "datasetReference": "ds-generator-e2e",
        "generatorBuildIdentity": "build-generator-e2e",
    }


def test_generator_pipeline_e2e_in_memory() -> None:
    """
    Authoring Strategy
        ↓
    Generator pipeline
        ↓
    PublishedDataset
        ↓
    Validation
        ↓
    Loader
        ↓
    MembershipCandidate
    """
    host = create_generator_host(geometry=FixtureGeometryPort())
    strategy = make_fixture_strategy()

    snapshot = host.generate_trajectory_snapshot(strategy)
    cue = host.sample_cue(snapshot)
    second = host.sample_second(snapshot)
    record = host.build_envelope(strategy, snapshot, cue, second)
    dataset = host.build_published_dataset([record])

    assert isinstance(dataset, PublishedDataset)
    assert len(dataset.records) == 1

    dataset_json = published_dataset_to_json(dataset.records)
    validate_dataset(dataset_json)

    loaded = create_package_loader().load(
        _package_json(dataset_json),
        manifest_data=_manifest_json(),
        version_data=_version_json(),
    )
    assert isinstance(loaded, PublishedDataset)
    assert loaded.records == dataset.records

    query = MembershipQuery(
        cue=record.cue_set[0],
        target=record.target,
        second=record.second_set[0],
    )
    candidates = create_membership_engine().evaluate(loaded, query)

    assert len(candidates) == 1
    assert isinstance(candidates[0], MembershipCandidate)
    assert candidates[0].strategy_ref == strategy.strategy_ref
    assert candidates[0].membership.target_match is True
    assert candidates[0].membership.cue_membership is True
    assert candidates[0].membership.second_membership is True


def test_generator_pipeline_round_trip_load_path(tmp_path: Path) -> None:
    """PublishedDataset JSON round-trip through loader.load_path()."""
    host = create_generator_host(geometry=FixtureGeometryPort())
    strategy = make_fixture_strategy()

    snapshot = host.generate_trajectory_snapshot(strategy)
    cue = host.sample_cue(snapshot)
    second = host.sample_second(snapshot)
    record = host.build_envelope(strategy, snapshot, cue, second)
    dataset = host.build_published_dataset([record])

    dataset_json = published_dataset_to_json(dataset.records)
    package_path = tmp_path / "package.json"
    manifest_path = tmp_path / "manifest.json"
    version_path = tmp_path / "version.json"

    package_path.write_text(json.dumps(_package_json(dataset_json)), encoding="utf-8")
    manifest_path.write_text(json.dumps(_manifest_json()), encoding="utf-8")
    version_path.write_text(json.dumps(_version_json()), encoding="utf-8")

    loaded = create_package_loader().load_path(
        package_path,
        manifest_path=manifest_path,
        version_path=version_path,
    )
    assert loaded.records == dataset.records

    query = MembershipQuery(
        cue=record.cue_set[-1],
        target=record.target,
        second=record.second_set[-1],
    )
    candidates = create_membership_engine().evaluate(loaded, query)
    assert [candidate.strategy_ref for candidate in candidates] == [
        strategy.strategy_ref
    ]
