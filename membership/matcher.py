"""
Pure Membership matchers.

Side-effect free. No I/O, no Dataset mutation, no Resolve.
Phase-1 judgment: exact Point equality / exact set membership.
Threshold / distance / KDTree are Out of Scope.
"""

from __future__ import annotations

from typing import Iterable, List

from models import EnvelopeRecord, MembershipFlags, Point

from .interfaces import MembershipQuery


def points_equal(a: Point, b: Point) -> bool:
    """Exact coordinate equality (Phase-1 contract implementation)."""
    return a.x == b.x and a.y == b.y


def point_in_set(point: Point, point_set: Iterable[Point]) -> bool:
    """True when `point` equals any member of `point_set` (exact)."""
    for candidate in point_set:
        if points_equal(point, candidate):
            return True
    return False


def match_target(query_target: Point, record_target: Point) -> bool:
    """Target Match: query target ≡ record.target."""
    return points_equal(query_target, record_target)


def match_cue(query_cue: Point, cue_set: List[Point]) -> bool:
    """Cue Membership: query cue ∈ record.cue_set."""
    return point_in_set(query_cue, cue_set)


def match_second(query_second: Point, second_set: List[Point]) -> bool:
    """Second Membership: query second ∈ record.second_set."""
    return point_in_set(query_second, second_set)


def match_record(query: MembershipQuery, record: EnvelopeRecord) -> MembershipFlags:
    """
    Evaluate all three Membership axes for one EnvelopeRecord.
    Does not mutate record or query.
    """
    return MembershipFlags(
        target_match=match_target(query.target, record.target),
        cue_membership=match_cue(query.cue, record.cue_set),
        second_membership=match_second(query.second, record.second_set),
    )


def is_member(flags: MembershipFlags) -> bool:
    """AND contract: Target ∧ Cue ∧ Second."""
    return (
        flags.target_match
        and flags.cue_membership
        and flags.second_membership
    )
