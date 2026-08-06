"""
Dataset Generator Phase — Producer host.

Strategy → Snapshot → cueSet / secondSet → EnvelopeRecord → PublishedDataset.
Does not implement Package Emit.
Does not modify Foundation Consumer layers.
"""

from .cue_sampler import CueSetResult, create_cue_sampler
from .envelope_builder import create_envelope_builder
from .exceptions import (
    GeneratorError,
    InvalidAuthoringStrategy,
    TrajectoryGenerationFailure,
)
from .factory import create_generator_host
from .host import GeneratorHost
from .interfaces import GeneratorHostProtocol
from .published_dataset_builder import create_published_dataset_builder
from .second_sampler import SecondSetResult, create_second_sampler
from .strategy import AuthoringStrategy
from .trajectory_generator import TrajectorySnapshot

__all__ = [
    "AuthoringStrategy",
    "CueSetResult",
    "GeneratorError",
    "GeneratorHost",
    "GeneratorHostProtocol",
    "InvalidAuthoringStrategy",
    "SecondSetResult",
    "TrajectoryGenerationFailure",
    "TrajectorySnapshot",
    "create_cue_sampler",
    "create_envelope_builder",
    "create_generator_host",
    "create_published_dataset_builder",
    "create_second_sampler",
]
