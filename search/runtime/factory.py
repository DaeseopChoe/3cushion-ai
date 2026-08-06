"""Factory for Search Enhancement Orchestrator."""

from __future__ import annotations

from membership import MembershipEngine, create_membership_engine

from .orchestrator import SearchEnhancementOrchestrator


def create_search_enhancement_orchestrator(
    *,
    membership: MembershipEngine | None = None,
) -> SearchEnhancementOrchestrator:
    """Create orchestrator with default Phase-3 engines."""
    return SearchEnhancementOrchestrator(
        membership=membership if membership is not None else create_membership_engine(),
    )
