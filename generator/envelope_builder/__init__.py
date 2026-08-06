"""
Envelope Builder — assemble EnvelopeRecord (SSOT 4 fields).

Strategy + Snapshot + cueSet + secondSet → EnvelopeRecord.
Validation Layer gate required. No Sampling / Dataset corpus emit.
"""

from .engine import DefaultEnvelopeBuilder
from .exceptions import (
    EnvelopeAssemblyFailure,
    EnvelopeBuilderError,
    InvalidEnvelopeInput,
)
from .factory import create_envelope_builder
from .interfaces import EnvelopeBuilder

__all__ = [
    "DefaultEnvelopeBuilder",
    "EnvelopeAssemblyFailure",
    "EnvelopeBuilder",
    "EnvelopeBuilderError",
    "InvalidEnvelopeInput",
    "create_envelope_builder",
]
