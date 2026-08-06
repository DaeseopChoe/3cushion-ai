"""Serialize PublishedDataset to schema JSON shape for Validation Layer."""

from __future__ import annotations

from typing import Any, Dict, List, Sequence

from models import EnvelopeRecord

from generator.envelope_builder.serialize import envelope_record_to_json


def published_dataset_to_json(
    records: Sequence[EnvelopeRecord],
) -> Dict[str, List[Dict[str, Any]]]:
    """Schema PublishedDataset object (camelCase record fields)."""
    return {
        "records": [
            envelope_record_to_json(
                strategy_ref=str(record.strategy_ref),
                target=record.target,
                cue_set=record.cue_set,
                second_set=record.second_set,
            )
            for record in records
        ]
    }
