"""Published Dataset Builder protocols."""

from __future__ import annotations

from typing import Protocol, Sequence

from models import EnvelopeRecord, PublishedDataset


class PublishedDatasetBuilder(Protocol):
    """
    Assemble PublishedDataset from validated EnvelopeRecord corpus.

    Geometry, Sampling, and Package emit are out of scope.
    Full regenerate only.
    """

    def build(self, records: Sequence[EnvelopeRecord]) -> PublishedDataset:
        ...
