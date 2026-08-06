"""Factory for Generator Host."""

from __future__ import annotations

from typing import Optional

from .cue_sampler.factory import create_cue_sampler
from .cue_sampler.interfaces import CueSampler
from .envelope_builder.factory import create_envelope_builder
from .envelope_builder.interfaces import EnvelopeBuilder
from .host import GeneratorHost
from .published_dataset_builder.factory import create_published_dataset_builder
from .published_dataset_builder.interfaces import PublishedDatasetBuilder
from .second_sampler.factory import create_second_sampler
from .second_sampler.interfaces import SecondSampler
from .trajectory_generator.factory import create_trajectory_generator
from .trajectory_generator.interfaces import GeometryConsumePort, TrajectoryGenerator


def create_generator_host(
    *,
    geometry: GeometryConsumePort,
    trajectory_generator: Optional[TrajectoryGenerator] = None,
    cue_sampler: Optional[CueSampler] = None,
    second_sampler: Optional[SecondSampler] = None,
    envelope_builder: Optional[EnvelopeBuilder] = None,
    published_dataset_builder: Optional[PublishedDatasetBuilder] = None,
) -> GeneratorHost:
    """
    Create Generator Host with Geometry consume port, Samplers, Builders.

    ``geometry`` must supply Impact SSOT + buildTrajectory results
    (consume only — no Formula/Builder reimplementation inside Generator).
    """
    tg = trajectory_generator or create_trajectory_generator(geometry=geometry)
    cs = cue_sampler if cue_sampler is not None else create_cue_sampler()
    ss = second_sampler if second_sampler is not None else create_second_sampler()
    eb = envelope_builder if envelope_builder is not None else create_envelope_builder()
    pdb = (
        published_dataset_builder
        if published_dataset_builder is not None
        else create_published_dataset_builder()
    )
    return GeneratorHost(
        trajectory_generator=tg,
        cue_sampler=cs,
        second_sampler=ss,
        envelope_builder=eb,
        published_dataset_builder=pdb,
    )
