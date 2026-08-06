"""
Smoke test — EnvelopeRecord[] → PublishedDataset.

Mission 33 completion gate.
"""

from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from generator import create_generator_host  # noqa: E402
from generator.fixtures import (  # noqa: E402
    FixtureGeometryPort,
    make_fixture_corpus,
    make_fixture_snapshot,
    make_fixture_strategy,
)
from generator.published_dataset_builder import create_published_dataset_builder  # noqa: E402
from generator.published_dataset_builder.serialize import (  # noqa: E402
    published_dataset_to_json,
)
from models import PublishedDataset  # noqa: E402
from validation import validate_dataset  # noqa: E402


def test_smoke_corpus_to_published_dataset() -> None:
    """
    EnvelopeRecord[]
        ↓
    PublishedDataset
        ↓
    Validation PASS
    """
    corpus = make_fixture_corpus()
    dataset = create_published_dataset_builder().build(corpus)

    assert isinstance(dataset, PublishedDataset)
    assert len(dataset.records) == len(corpus)
    validate_dataset(published_dataset_to_json(dataset.records))


def test_smoke_host_end_to_end_dataset() -> None:
    """
    Strategy
        ↓
    Snapshot
        ↓
    cueSet / secondSet
        ↓
    EnvelopeRecord
        ↓
    PublishedDataset
    """
    host = create_generator_host(geometry=FixtureGeometryPort())
    strategy = make_fixture_strategy()
    snapshot = host.generate_trajectory_snapshot(strategy)
    cue = host.sample_cue(snapshot)
    second = host.sample_second(snapshot)
    record = host.build_envelope(strategy, snapshot, cue, second)
    dataset = host.build_published_dataset([record])

    assert dataset.records == [record]
    validate_dataset(published_dataset_to_json(dataset.records))
