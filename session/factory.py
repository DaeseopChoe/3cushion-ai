"""
Search Session factory.
"""

from __future__ import annotations

from typing import Optional

from membership import MembershipEngine, create_membership_engine
from resolve import ResolveEngine, StrategyRepository, create_resolve_engine

from .exceptions import SessionConfigurationError
from .interfaces import SearchSession
from .session import DefaultSearchSession


def create_session(
    repository: Optional[StrategyRepository] = None,
    *,
    membership: Optional[MembershipEngine] = None,
    resolve: Optional[ResolveEngine] = None,
) -> SearchSession:
    """
    Create a one-shot Search Session.

    Requires either ``resolve`` or ``repository``.
    Membership defaults to create_membership_engine().
    Each request needs a new Session (do not reuse).
    """
    membership_engine = (
        membership if membership is not None else create_membership_engine()
    )

    if resolve is not None:
        resolve_engine = resolve
    elif repository is not None:
        resolve_engine = create_resolve_engine(repository)
    else:
        raise SessionConfigurationError(
            "repository or resolve engine is required"
        )

    return DefaultSearchSession(
        membership=membership_engine,
        resolve=resolve_engine,
    )
