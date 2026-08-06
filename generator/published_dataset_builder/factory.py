"""Factory for Published Dataset Builder."""

from __future__ import annotations

from .engine import DefaultPublishedDatasetBuilder
from .interfaces import PublishedDatasetBuilder


def create_published_dataset_builder() -> PublishedDatasetBuilder:
    """Create DefaultPublishedDatasetBuilder (corpus assembly + validation)."""
    return DefaultPublishedDatasetBuilder()
