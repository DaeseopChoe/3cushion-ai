"""
Membership Engine factory.
"""

from __future__ import annotations

from .engine import DefaultMembershipEngine
from .interfaces import MembershipEngine


def create_membership_engine() -> MembershipEngine:
    """Return the repository Membership Selection Engine."""
    return DefaultMembershipEngine()
