"""
Package Loader tests (SEARCH_LOADER_SSOT contract).
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from loader import (  # noqa: E402
    LoaderValidationError,
    ManifestNotFound,
    VersionNotFound,
    create_package_loader,
)
from models import PublishedDataset  # noqa: E402


def _dataset_json() -> dict:
    return {
        "datasetIdentity": "ds-1",
        "records": [
            {
                "strategyRef": "strategy-1",
                "target": {"x": 10.0, "y": 20.0},
                "cueSet": [{"x": 1.0, "y": 2.0}],
                "secondSet": [{"x": 3.0, "y": 4.0}],
            }
        ],
    }


def _package_json(**overrides) -> dict:
    data = {
        "packageIdentity": "pkg-1",
        "datasetIdentity": "ds-1",
        "dataset": _dataset_json(),
        "manifestReference": "man-1",
        "versionReference": "ver-1",
        "generatorBuildIdentity": "build-1",
    }
    data.update(overrides)
    return data


def _manifest_json() -> dict:
    return {
        "manifestIdentity": "man-1",
        "packageReference": "pkg-1",
        "datasetReference": "ds-1",
        "generatorBuildIdentity": "build-1",
        "versionReference": "ver-1",
    }


def _version_json() -> dict:
    return {
        "versionIdentity": "ver-1",
        "packageReference": "pkg-1",
        "manifestReference": "man-1",
        "datasetReference": "ds-1",
        "generatorBuildIdentity": "build-1",
    }


def test_load_package_success() -> None:
    loader = create_package_loader()
    dataset = loader.load(
        _package_json(),
        manifest_data=_manifest_json(),
        version_data=_version_json(),
    )
    assert isinstance(dataset, PublishedDataset)
    assert dataset.dataset_identity == "ds-1"
    assert len(dataset.records) == 1
    assert dataset.records[0].strategy_ref == "strategy-1"
    assert dataset.records[0].target.x == 10.0


def test_validation_failure_propagated() -> None:
    loader = create_package_loader()
    bad = _package_json()
    del bad["packageIdentity"]
    with pytest.raises(LoaderValidationError):
        loader.load(bad, manifest_data=_manifest_json(), version_data=_version_json())


def test_manifest_reference_required_when_declared() -> None:
    loader = create_package_loader()
    with pytest.raises(ManifestNotFound):
        loader.load(_package_json(), version_data=_version_json())


def test_manifest_reference_mismatch() -> None:
    loader = create_package_loader()
    man = _manifest_json()
    man["manifestIdentity"] = "other-man"
    with pytest.raises(ManifestNotFound):
        loader.load(
            _package_json(),
            manifest_data=man,
            version_data=_version_json(),
        )


def test_version_reference_required_when_declared() -> None:
    loader = create_package_loader()
    with pytest.raises(VersionNotFound):
        loader.load(_package_json(), manifest_data=_manifest_json())


def test_version_reference_ok() -> None:
    loader = create_package_loader()
    dataset = loader.load(
        _package_json(),
        manifest_data=_manifest_json(),
        version_data=_version_json(),
    )
    assert isinstance(dataset, PublishedDataset)


def test_returns_published_dataset_only() -> None:
    loader = create_package_loader()
    result = loader.load(
        _package_json(),
        manifest_data=_manifest_json(),
        version_data=_version_json(),
    )
    assert type(result).__name__ == "PublishedDataset"


def test_load_path_roundtrip(tmp_path: Path) -> None:
    pkg_path = tmp_path / "package.json"
    man_path = tmp_path / "manifest.json"
    ver_path = tmp_path / "version.json"
    pkg_path.write_text(json.dumps(_package_json()), encoding="utf-8")
    man_path.write_text(json.dumps(_manifest_json()), encoding="utf-8")
    ver_path.write_text(json.dumps(_version_json()), encoding="utf-8")

    loader = create_package_loader()
    dataset = loader.load_path(pkg_path, manifest_path=man_path, version_path=ver_path)
    assert len(dataset.records) == 1


def test_loader_has_no_write_api() -> None:
    loader = create_package_loader()
    write_like = [
        name
        for name in dir(loader)
        if name.startswith("save")
        or name.startswith("write")
        or name.startswith("update")
        or name.startswith("delete")
        or name.startswith("patch")
    ]
    assert write_like == []


def test_optional_manifest_version_when_not_referenced() -> None:
    loader = create_package_loader()
    pkg = _package_json()
    pkg.pop("manifestReference")
    pkg.pop("versionReference")
    dataset = loader.load(pkg)
    assert len(dataset.records) == 1
