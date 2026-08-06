"""
Smoke test — Strategy → Snapshot → cueSet/secondSet → EnvelopeRecord.

Mission 32 completion gate.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from generator import (  # noqa: E402
    create_cue_sampler,
    create_envelope_builder,
    create_generator_host,
    create_second_sampler,
)
from generator.envelope_builder.serialize import (  # noqa: E402
    dataset_wrapper_for_record,
    envelope_record_to_json,
)
from generator.fixtures import (  # noqa: E402
    FixtureGeometryPort,
    make_fixture_snapshot,
    make_fixture_strategy,
)
from models import EnvelopeRecord  # noqa: E402
from validation import validate_dataset  # noqa: E402


def test_smoke_pipeline_to_envelope_record() -> None:
    """
    Strategy
        ↓
    TrajectorySnapshot
        ↓
    cueSet / secondSet
        ↓
    EnvelopeRecord
        ↓
    Validation PASS
    """
    strategy = make_fixture_strategy()
    snapshot = make_fixture_snapshot()
    cue = create_cue_sampler().sample(snapshot)
    second = create_second_sampler().sample(snapshot)
    record = create_envelope_builder().build(strategy, snapshot, cue, second)

    assert isinstance(record, EnvelopeRecord)
    assert record.strategy_ref == strategy.strategy_ref
    assert record.target == strategy.target
    assert len(record.cue_set) >= 1
    assert len(record.second_set) >= 1

    validate_dataset(
        dataset_wrapper_for_record(
            envelope_record_to_json(
                strategy_ref=str(record.strategy_ref),
                target=record.target,
                cue_set=record.cue_set,
                second_set=record.second_set,
            )
        )
    )


def test_smoke_host_end_to_end_envelope() -> None:
    host = create_generator_host(geometry=FixtureGeometryPort())
    strategy = make_fixture_strategy()
    snapshot = host.generate_trajectory_snapshot(strategy)
    cue = host.sample_cue(snapshot)
    second = host.sample_second(snapshot)
    record = host.build_envelope(strategy, snapshot, cue, second)

    assert record.strategy_ref == strategy.strategy_ref
    assert record.cue_set == list(cue.cue_set)
    assert record.second_set == list(second.second_set)
