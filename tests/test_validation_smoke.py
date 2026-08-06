"""
Smoke tests for Validation Layer (Schema contract only).
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

# Project root on sys.path
ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from validation import (  # noqa: E402
    ValidationFailed,
    validate_dataset,
    validate_membership_candidate,
    validate_package,
)


def _valid_dataset() -> dict:
    return {
        "datasetIdentity": "ds-1",
        "records": [
            {
                "strategyRef": "strategy-1",
                "target": {"x": 10.0, "y": 20.0},
                "cueSet": [{"x": 1.0, "y": 2.0}, {"x": 1.5, "y": 2.5}],
                "secondSet": [{"x": 3.0, "y": 4.0}],
            }
        ],
    }


def test_valid_published_dataset() -> None:
    data = _valid_dataset()
    out = validate_dataset(data)
    assert out is data


def test_missing_required_field() -> None:
    data = {
        "records": [
            {
                "strategyRef": "strategy-1",
                "target": {"x": 1.0, "y": 2.0},
                "cueSet": [{"x": 0.0, "y": 0.0}],
                # secondSet missing
            }
        ]
    }
    with pytest.raises(ValidationFailed) as exc_info:
        validate_dataset(data)
    assert "secondSet" in str(exc_info.value) or "required" in str(exc_info.value).lower()


def test_additional_properties_violation() -> None:
    data = _valid_dataset()
    data["records"][0]["sysInputs"] = {"CO": 10}
    with pytest.raises(ValidationFailed) as exc_info:
        validate_dataset(data)
    assert "additional" in str(exc_info.value).lower() or "sysInputs" in str(
        exc_info.value
    )


def test_valid_package_with_dataset_ref() -> None:
    package = {
        "packageIdentity": "pkg-1",
        "dataset": _valid_dataset(),
        "manifestReference": "man-1",
    }
    out = validate_package(package)
    assert out is package


def test_membership_candidate_ok() -> None:
    candidate = {
        "strategyRef": "strategy-1",
        "recordIdentity": "rec-1",
        "membership": {
            "targetMatch": True,
            "cueMembership": True,
            "secondMembership": True,
        },
    }
    out = validate_membership_candidate(candidate)
    assert out is candidate
