"""
Search Runtime Host — Enhancement pipeline → Resolve orchestration.

Contract: Architecture/SEARCH_RUNTIME_SSOT.md

Host / orchestration only.
Does not implement Membership, Ranking, Interpolation, Geometry, or Resolve logic.
Does not read Package / Manifest / Version.
Does not mutate PublishedDataset.
"""

from __future__ import annotations

from membership import MembershipEngine, MembershipQuery
from membership.exceptions import MembershipError
from models import PublishedDataset
from resolve import ResolveEngine, Strategy
from resolve.exceptions import ResolveError
from search.runtime.orchestrator import SearchEnhancementOrchestrator

from .exceptions import RuntimeConfigurationError, RuntimeExecutionError
from .result import SearchResult


class DefaultSearchRuntime:
    """Concrete SearchRuntime. Host / orchestration only."""

    def __init__(
        self,
        *,
        membership: MembershipEngine,
        resolve: ResolveEngine,
        orchestrator: SearchEnhancementOrchestrator | None = None,
    ) -> None:
        if membership is None:
            raise RuntimeConfigurationError("MembershipEngine is required")
        if resolve is None:
            raise RuntimeConfigurationError("ResolveEngine is required")
        self._membership = membership
        self._resolve = resolve
        self._orchestrator = (
            orchestrator
            if orchestrator is not None
            else SearchEnhancementOrchestrator(membership=membership)
        )

    def execute(
        self,
        dataset: PublishedDataset,
        query: MembershipQuery,
    ) -> SearchResult:
        if dataset is None:
            raise RuntimeConfigurationError("PublishedDataset is required")
        if query is None:
            raise RuntimeConfigurationError("MembershipQuery is required")
        if not isinstance(dataset, PublishedDataset):
            raise RuntimeConfigurationError(
                "dataset must be a PublishedDataset (Loader-supplied)"
            )
        if not isinstance(query, MembershipQuery):
            raise RuntimeConfigurationError("query must be a MembershipQuery")

        try:
            artifacts = self._orchestrator.run(dataset, query)
        except MembershipError as exc:
            raise RuntimeExecutionError(
                f"Membership stage failed: {exc}",
                cause=exc,
            ) from exc
        except Exception as exc:  # noqa: BLE001
            raise RuntimeExecutionError(
                f"Enhancement pipeline failed: {exc}",
                cause=exc,
            ) from exc

        candidates = list(artifacts.resolve_candidates)
        if not candidates:
            return SearchResult()

        resolved_candidates = []
        resolved_strategies: list[Strategy] = []

        for index, candidate in enumerate(candidates):
            try:
                strategy = self._resolve.resolve(candidate)
            except ResolveError as exc:
                raise RuntimeExecutionError(
                    f"Resolve stage failed at candidate[{index}]: {exc}",
                    cause=exc,
                ) from exc
            except Exception as exc:  # noqa: BLE001
                raise RuntimeExecutionError(
                    f"Resolve stage failed unexpectedly at candidate[{index}]: {exc}",
                    cause=exc,
                ) from exc
            resolved_candidates.append(candidate)
            resolved_strategies.append(strategy)

        return SearchResult(
            candidate=resolved_candidates[0],
            strategy=resolved_strategies[0],
            candidates=tuple(resolved_candidates),
            strategies=tuple(resolved_strategies),
        )
