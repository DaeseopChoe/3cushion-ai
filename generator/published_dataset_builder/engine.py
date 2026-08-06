"""
Default Published Dataset Builder — assemble PublishedDataset + Validation gate.

Consumes EnvelopeRecord[] as-is.
Does not mutate records.
Does not perform Sampling, Geometry, or partial patching.
"""

from __future__ import annotations

from typing import List, Sequence

from models import EnvelopeRecord, PublishedDataset
from validation import ValidationFailed, validate_dataset

from .exceptions import (
    InvalidPublishedDatasetInput,
    PublishedDatasetAssemblyFailure,
)
from .serialize import published_dataset_to_json


def _validated_corpus(records: object) -> List[EnvelopeRecord]:
    if records is None:
        raise InvalidPublishedDatasetInput("records corpus is required")
    seq = list(records)  # type: ignore[arg-type]
    for record in seq:
        if not isinstance(record, EnvelopeRecord):
            raise InvalidPublishedDatasetInput(
                "records must contain EnvelopeRecord values"
            )
    return seq


class DefaultPublishedDatasetBuilder:
    """Concrete PublishedDatasetBuilder — corpus assembly + validation."""

    def build(self, records: Sequence[EnvelopeRecord]) -> PublishedDataset:
        corpus = _validated_corpus(records)

        # Full regenerate only: build a complete corpus object every time.
        seen_refs = set()
        for record in corpus:
            ref = record.strategy_ref
            if ref in seen_refs:
                raise InvalidPublishedDatasetInput(
                    "Strategy : Record must remain 1:1 within corpus"
                )
            seen_refs.add(ref)

        dataset_json = published_dataset_to_json(corpus)
        try:
            validate_dataset(dataset_json)
        except ValidationFailed as exc:
            raise PublishedDatasetAssemblyFailure(
                f"PublishedDataset Validation failed: {exc}",
                cause=exc,
            ) from exc
        except Exception as exc:  # noqa: BLE001
            raise PublishedDatasetAssemblyFailure(str(exc), cause=exc) from exc

        return PublishedDataset(records=list(corpus))
