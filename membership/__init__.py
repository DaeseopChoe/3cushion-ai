"""
Membership Engine public API.

Candidate Selection Layer only (MEMBERSHIP_SSOT).
"""

from .engine import DefaultMembershipEngine
from .exceptions import MembershipError, MembershipFailure, MembershipInputError
from .factory import create_membership_engine
from .interfaces import MembershipEngine, MembershipQuery
from .matcher import (
    is_member,
    match_cue,
    match_record,
    match_second,
    match_target,
    point_in_set,
    points_equal,
)

__all__ = [
    "MembershipEngine",
    "MembershipQuery",
    "DefaultMembershipEngine",
    "create_membership_engine",
    "MembershipError",
    "MembershipInputError",
    "MembershipFailure",
    "match_target",
    "match_cue",
    "match_second",
    "match_record",
    "is_member",
    "points_equal",
    "point_in_set",
]
