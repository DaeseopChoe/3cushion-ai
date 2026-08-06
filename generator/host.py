"""
Generator Host — Phase entry point.

Orchestrates Trajectory Generator, Samplers, Envelope Builder,
and Published Dataset Builder.
Does not run Package Emit.
"""

from __future__ import annotations

from typing import Optional

from models import EnvelopeRecord, PublishedDataset

from .cue_sampler.interfaces import CueSampler
from .cue_sampler.result import CueSetResult
from .envelope_builder.interfaces import EnvelopeBuilder
from .published_dataset_builder.interfaces import PublishedDatasetBuilder
from .second_sampler.interfaces import SecondSampler
from .second_sampler.result import SecondSetResult
from .strategy import AuthoringStrategy
from .trajectory_generator.interfaces import TrajectoryGenerator
from .trajectory_generator.snapshot import TrajectorySnapshot


class GeneratorHost:
    """Producer host. Foundation Consumer layers are not invoked."""

    def __init__(
        self,
        trajectory_generator: TrajectoryGenerator,
        cue_sampler: Optional[CueSampler] = None,
        second_sampler: Optional[SecondSampler] = None,
        envelope_builder: Optional[EnvelopeBuilder] = None,
        published_dataset_builder: Optional[PublishedDatasetBuilder] = None,
    ) -> None:
        self._trajectory_generator = trajectory_generator
        self._cue_sampler = cue_sampler
        self._second_sampler = second_sampler
        self._envelope_builder = envelope_builder
        self._published_dataset_builder = published_dataset_builder

    def generate_trajectory_snapshot(
        self, strategy: AuthoringStrategy
    ) -> TrajectorySnapshot:
        return self._trajectory_generator.generate(strategy)

    def sample_cue(self, snapshot: TrajectorySnapshot) -> CueSetResult:
        if self._cue_sampler is None:
            raise RuntimeError("CueSampler is not configured on GeneratorHost")
        return self._cue_sampler.sample(snapshot)

    def sample_second(self, snapshot: TrajectorySnapshot) -> SecondSetResult:
        if self._second_sampler is None:
            raise RuntimeError("SecondSampler is not configured on GeneratorHost")
        return self._second_sampler.sample(snapshot)

    def build_envelope(
        self,
        strategy: AuthoringStrategy,
        snapshot: TrajectorySnapshot,
        cue: CueSetResult,
        second: SecondSetResult,
    ) -> EnvelopeRecord:
        if self._envelope_builder is None:
            raise RuntimeError("EnvelopeBuilder is not configured on GeneratorHost")
        return self._envelope_builder.build(strategy, snapshot, cue, second)

    def build_published_dataset(
        self, records: list[EnvelopeRecord]
    ) -> PublishedDataset:
        if self._published_dataset_builder is None:
            raise RuntimeError(
                "PublishedDatasetBuilder is not configured on GeneratorHost"
            )
        return self._published_dataset_builder.build(records)
