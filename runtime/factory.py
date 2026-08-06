"""
Search Runtime Host factory.
"""

from __future__ import annotations

from typing import Optional

from membership import MembershipEngine, create_membership_engine
from resolve import ResolveEngine, StrategyRepository, create_resolve_engine
from search.runtime import SearchEnhancementOrchestrator

from .engine import DefaultSearchRuntime
from .exceptions import RuntimeConfigurationError
from .interfaces import SearchRuntime


def create_runtime(
    repository: Optional[StrategyRepository] = None,
    *,
    membership: Optional[MembershipEngine] = None,
    resolve: Optional[ResolveEngine] = None,
    orchestrator: Optional[SearchEnhancementOrchestrator] = None,
) -> SearchRuntime:
    """
    Build a Search Runtime Host.

    Requires either ``resolve`` or ``repository`` (to create ResolveEngine).
    Membership defaults to create_membership_engine().
    Enhancement engines are wired through SearchEnhancementOrchestrator.
    """
    membership_engine = membership if membership is not None else create_membership_engine()

    if resolve is not None:
        resolve_engine = resolve
    elif repository is not None:
        resolve_engine = create_resolve_engine(repository)
    else:
        raise RuntimeConfigurationError(
            "repository or resolve engine is required"
        )

    pipeline = (
        orchestrator
        if orchestrator is not None
        else SearchEnhancementOrchestrator(membership=membership_engine)
    )

    return DefaultSearchRuntime(
        membership=membership_engine,
        resolve=resolve_engine,
        orchestrator=pipeline,
    )
