"""
Generator Pipeline smoke validation report.
"""

from __future__ import annotations

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
from validation import validate_dataset  # noqa: E402


def test_pipeline_report_smoke() -> None:
    """
    Pipeline report:
    - PublishedDataset generated
    - Validation PASS
    - Loader load PASS
    - Membership candidate PASS
    """
    host = create_generator_host(geometry=FixtureGeometryPort())
    strategy = make_fixture_strategy()

    snapshot = host.generate_trajectory_snapshot(strategy)
    cue = host.sample_cue(snapshot)
    second = host.sample_second(snapshot)
    record = host.build_envelope(strategy, snapshot, cue, second)
    dataset = host.build_published_dataset([record])

    dataset_json = published_dataset_to_json(dataset.records)
    validate_dataset(dataset_json)

    loaded = create_package_loader().load(
        {
            "packageIdentity": "pkg-generator-smoke",
            "datasetIdentity": "ds-generator-smoke",
            "dataset": dataset_json,
        }
    )
    candidates = create_membership_engine().evaluate(
        loaded,
        MembershipQuery(
            cue=record.cue_set[0],
            target=record.target,
            second=record.second_set[0],
        ),
    )

    assert len(candidates) == 1
    assert candidates[0].strategy_ref == strategy.strategy_ref
