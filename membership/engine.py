"""
Membership Engine — Candidate Selection Layer.

Contract: Architecture/MEMBERSHIP_SSOT.md

PublishedDataset + MembershipQuery → list[MembershipCandidate]

Does not call Resolve, Loader, Strategy, Modal, Generator.
Does not mutate PublishedDataset or EnvelopeRecord.
"""

from __future__ import annotations

from typing import List

from models import (
    EnvelopeRecord,
    MembershipCandidate,
    PublishedDataset,
    RecordIdentity,
)

from .exceptions import MembershipFailure, MembershipInputError
from .interfaces import MembershipQuery
from .matcher import is_member, match_record
from search.membership.adapter import DefaultCandidatePrefilterAdapter
from search.membership.interfaces import CandidatePrefilterAdapter


def _record_identity(record: EnvelopeRecord, index: int) -> RecordIdentity:
    """
    Logical record identity.
    Strategy : Record = 1:1 → strategy_ref is a stable key (format out of scope).
    """
    return RecordIdentity(str(record.strategy_ref))


class DefaultMembershipEngine:
    """Concrete MembershipEngine. Selection only."""

    def __init__(
        self,
        *,
        prefilter_adapter: CandidatePrefilterAdapter | None = None,
    ) -> None:
        self._prefilter_adapter = (
            prefilter_adapter
            if prefilter_adapter is not None
            else DefaultCandidatePrefilterAdapter()
        )

    def evaluate(
        self,
        dataset: PublishedDataset,
        query: MembershipQuery,
    ) -> List[MembershipCandidate]:
        if dataset is None:
            raise MembershipInputError("PublishedDataset is required")
        if query is None:
            raise MembershipInputError("MembershipQuery is required")
        if not isinstance(dataset, PublishedDataset):
            raise MembershipInputError("dataset must be a PublishedDataset model")
        if not isinstance(query, MembershipQuery):
            raise MembershipInputError("query must be a MembershipQuery")

        try:
            return self._evaluate(dataset, query)
        except MembershipInputError:
            raise
        except Exception as exc:  # noqa: BLE001 — wrap unexpected matcher failures
            raise MembershipFailure(str(exc), cause=exc) from exc

    def _evaluate(
        self,
        dataset: PublishedDataset,
        query: MembershipQuery,
    ) -> List[MembershipCandidate]:
        records = self._validated_records(dataset)
        optimized_records = self._select_candidate_records(dataset, query)
        if not optimized_records:
            optimized_records = tuple(records)
        return self._evaluate_records(dataset, query, optimized_records)

    def _validated_records(self, dataset: PublishedDataset) -> List[EnvelopeRecord]:
        records = dataset.records or []
        for index, record in enumerate(records):
            if not isinstance(record, EnvelopeRecord):
                raise MembershipInputError(
                    f"records[{index}] is not an EnvelopeRecord"
                )
        return records

    def _select_candidate_records(
        self,
        dataset: PublishedDataset,
        query: MembershipQuery,
    ) -> tuple[EnvelopeRecord, ...] | None:
        try:
            return self._prefilter_adapter.select_records(dataset, query)
        except Exception:
            return None

    def _evaluate_records(
        self,
        dataset: PublishedDataset,
        query: MembershipQuery,
        records: tuple[EnvelopeRecord, ...] | List[EnvelopeRecord],
    ) -> List[MembershipCandidate]:
        candidates: List[MembershipCandidate] = []

        for index, record in enumerate(records):
            flags = match_record(query, record)
            if not is_member(flags):
                continue
            candidates.append(
                MembershipCandidate(
                    strategy_ref=record.strategy_ref,
                    record_identity=_record_identity(record, index),
                    membership=flags,
                    dataset_identity=dataset.dataset_identity,
                )
            )
        return candidates
