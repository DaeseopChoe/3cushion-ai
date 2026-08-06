"""Fixtures for KDTree tests."""

from __future__ import annotations

from models import EnvelopeRecord, Point, PublishedDataset, RecordIdentity, StrategyRef

from .models import KDTreeQueryInput


def make_fixture_dataset() -> PublishedDataset:
    """Fixture dataset with deterministic candidate spacing."""
    return PublishedDataset(
        records=[
            EnvelopeRecord(
                strategy_ref=StrategyRef("fixture.kd.alpha"),
                target=Point(x=20.0, y=10.0),
                cue_set=[Point(x=10.0, y=10.0), Point(x=12.0, y=10.0)],
                second_set=[Point(x=30.0, y=10.0), Point(x=32.0, y=10.0)],
            ),
            EnvelopeRecord(
                strategy_ref=StrategyRef("fixture.kd.beta"),
                target=Point(x=22.0, y=10.0),
                cue_set=[Point(x=14.0, y=10.0), Point(x=16.0, y=10.0)],
                second_set=[Point(x=34.0, y=10.0), Point(x=36.0, y=10.0)],
            ),
            EnvelopeRecord(
                strategy_ref=StrategyRef("fixture.kd.gamma"),
                target=Point(x=22.0, y=10.0),
                cue_set=[Point(x=14.0, y=10.0), Point(x=16.0, y=10.0)],
                second_set=[Point(x=34.0, y=10.0), Point(x=36.0, y=10.0)],
            ),
        ]
    )


def make_fixture_candidate_ids() -> tuple[RecordIdentity, ...]:
    """Candidate scope aligned with fixture dataset."""
    return (
        RecordIdentity("fixture.kd.alpha"),
        RecordIdentity("fixture.kd.beta"),
        RecordIdentity("fixture.kd.gamma"),
    )


def make_fixture_query() -> KDTreeQueryInput:
    """Query nearest to beta/gamma tie group."""
    return KDTreeQueryInput(
        cue=Point(x=15.0, y=10.0),
        target=Point(x=22.0, y=10.0),
        second=Point(x=35.0, y=10.0),
    )
