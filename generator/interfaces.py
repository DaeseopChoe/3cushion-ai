"""Generator Host protocol."""

from __future__ import annotations

from typing import Protocol, Sequence

from models import EnvelopeRecord, PublishedDataset

from .cue_sampler.result import CueSetResult
from .second_sampler.result import SecondSetResult
from .strategy import AuthoringStrategy
from .trajectory_generator.snapshot import TrajectorySnapshot


class GeneratorHostProtocol(Protocol):
    """Host entry for Dataset Generator Phase."""

    def generate_trajectory_snapshot(
        self, strategy: AuthoringStrategy
    ) -> TrajectorySnapshot:
        """Strategy (read-only) → Trajectory Snapshot."""
        ...

    def sample_cue(self, snapshot: TrajectorySnapshot) -> CueSetResult:
        """TrajectorySnapshot → cueSet (SP-C-01…05)."""
        ...

    def sample_second(self, snapshot: TrajectorySnapshot) -> SecondSetResult:
        """TrajectorySnapshot → secondSet (SP-S-01…06)."""
        ...

    def build_envelope(
        self,
        strategy: AuthoringStrategy,
        snapshot: TrajectorySnapshot,
        cue: CueSetResult,
        second: SecondSetResult,
    ) -> EnvelopeRecord:
        """Assemble EnvelopeRecord (SSOT 4 fields) with Validation gate."""
        ...

    def build_published_dataset(
        self, records: Sequence[EnvelopeRecord]
    ) -> PublishedDataset:
        """Assemble PublishedDataset via full regenerate + Validation gate."""
        ...
