"""Factory for Envelope Builder."""

from __future__ import annotations

from .engine import DefaultEnvelopeBuilder
from .interfaces import EnvelopeBuilder


def create_envelope_builder() -> EnvelopeBuilder:
    """Create DefaultEnvelopeBuilder (Record Assembly + Validation)."""
    return DefaultEnvelopeBuilder()
