"""
Published Dataset Builder — assemble PublishedDataset from EnvelopeRecord[].

Corpus assembly only. Validation Layer gate required.
No Sampling / Geometry / Package emit.
"""

from .engine import DefaultPublishedDatasetBuilder
from .exceptions import (
    InvalidPublishedDatasetInput,
    PublishedDatasetAssemblyFailure,
    PublishedDatasetBuilderError,
)
from .factory import create_published_dataset_builder
from .interfaces import PublishedDatasetBuilder

__all__ = [
    "DefaultPublishedDatasetBuilder",
    "InvalidPublishedDatasetInput",
    "PublishedDatasetAssemblyFailure",
    "PublishedDatasetBuilder",
    "PublishedDatasetBuilderError",
    "create_published_dataset_builder",
]
