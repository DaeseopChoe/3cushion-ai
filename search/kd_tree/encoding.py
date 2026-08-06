"""
Point encoding for KDTree candidate retrieval.

Contract:
- Query is encoded as (cue.x, cue.y, target.x, target.y, second.x, second.y)
- EnvelopeRecord is encoded with target plus cue/second set centroids
- Encoding is deterministic and independent from tree build/query mechanics
"""

from __future__ import annotations

from models import EnvelopeRecord, Point, RecordIdentity

from .models import EncodedCandidate, KDTreeQueryInput, Vector6D


def _centroid(points: list[Point]) -> Point:
    count = len(points)
    return Point(
        x=sum(point.x for point in points) / count,
        y=sum(point.y for point in points) / count,
    )


def encode_query_to_vector(query: KDTreeQueryInput) -> Vector6D:
    """Encode runtime query to fixed 6D vector."""
    return (
        query.cue.x,
        query.cue.y,
        query.target.x,
        query.target.y,
        query.second.x,
        query.second.y,
    )


def encode_record_to_vector(record: EnvelopeRecord) -> Vector6D:
    """
    Encode EnvelopeRecord to fixed 6D vector.

    Cue/Second are set-valued in Envelope Architecture, so their centroids are used
    as deterministic representatives for coarse nearest retrieval.
    """
    cue_center = _centroid(record.cue_set)
    second_center = _centroid(record.second_set)
    return (
        cue_center.x,
        cue_center.y,
        record.target.x,
        record.target.y,
        second_center.x,
        second_center.y,
    )


def encode_record_to_vector_item(
    candidate_id: RecordIdentity,
    record: EnvelopeRecord,
) -> EncodedCandidate:
    """Encode one EnvelopeRecord into KDTree candidate item."""
    return EncodedCandidate(
        candidate_id=candidate_id,
        strategy_ref=record.strategy_ref,
        vector=encode_record_to_vector(record),
    )
