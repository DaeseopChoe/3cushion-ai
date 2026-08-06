"""KDTree builder."""

from __future__ import annotations

from typing import Iterable, Sequence

from models import EnvelopeRecord, PublishedDataset, RecordIdentity

from .contract import KD_TREE_DIMENSIONS
from .encoding import encode_record_to_vector_item
from .exceptions import InvalidKDTreeCandidate, InvalidKDTreeDataset, KDTreeBuildFailure
from .models import EncodedCandidate, KDTreeIndex, KDTreeNode


def _record_identity(record: EnvelopeRecord) -> RecordIdentity:
    return RecordIdentity(str(record.strategy_ref))


def _build_node(items: Sequence[EncodedCandidate], depth: int) -> KDTreeNode | None:
    if not items:
        return None

    axis = depth % KD_TREE_DIMENSIONS
    sorted_items = sorted(
        items,
        key=lambda item: (item.vector[axis], str(item.candidate_id)),
    )
    mid = len(sorted_items) // 2
    pivot = sorted_items[mid]

    return KDTreeNode(
        item=pivot,
        axis=axis,
        left=_build_node(sorted_items[:mid], depth + 1),
        right=_build_node(sorted_items[mid + 1 :], depth + 1),
    )


class DefaultKDTreeBuilder:
    """Build KDTree from Spatial Index candidate scope and PublishedDataset."""

    def build(
        self,
        dataset: PublishedDataset,
        candidate_ids: Iterable[RecordIdentity],
    ) -> KDTreeIndex:
        if dataset is None:
            raise InvalidKDTreeDataset("PublishedDataset is required")
        if not isinstance(dataset, PublishedDataset):
            raise InvalidKDTreeDataset("dataset must be a PublishedDataset model")
        if candidate_ids is None:
            raise InvalidKDTreeCandidate("candidate_ids are required")

        try:
            scope = tuple(sorted({RecordIdentity(str(candidate_id)) for candidate_id in candidate_ids}))
            records = dataset.records or []
            records_by_id: dict[RecordIdentity, EnvelopeRecord] = {}
            for index, record in enumerate(records):
                if not isinstance(record, EnvelopeRecord):
                    raise InvalidKDTreeDataset(
                        f"records[{index}] is not an EnvelopeRecord"
                    )
                records_by_id[_record_identity(record)] = record

            encoded: list[EncodedCandidate] = []
            for candidate_id in scope:
                record = records_by_id.get(candidate_id)
                if record is None:
                    raise InvalidKDTreeCandidate(
                        f"candidate id not found in dataset: {candidate_id}"
                    )
                encoded.append(encode_record_to_vector_item(candidate_id, record))

            candidates = tuple(encoded)
            return KDTreeIndex(
                root=_build_node(candidates, 0),
                candidates=candidates,
                dimensions=KD_TREE_DIMENSIONS,
            )
        except (InvalidKDTreeCandidate, InvalidKDTreeDataset):
            raise
        except Exception as exc:  # noqa: BLE001
            raise KDTreeBuildFailure(str(exc), cause=exc) from exc
