"""
Search Session — one-shot Execution Context.

Contract: Architecture/SEARCH_SESSION_SSOT.md

PublishedDataset + MembershipQuery
  → Membership.evaluate
  → Resolve.resolve (per candidate)
  → SearchResult (runtime.result.SearchResult)
  → Session end / Context close

Does not replace Runtime Host.
Does not implement Membership / Resolve / Loader logic.
Does not re-run Validation.
Does not mutate PublishedDataset.
"""

from __future__ import annotations

from typing import Optional

from membership import MembershipEngine, MembershipQuery
from membership.exceptions import MembershipError
from models import PublishedDataset
from resolve import ResolveEngine, Strategy
from resolve.exceptions import ResolveError
from runtime.result import SearchResult

from .context import SearchExecutionContext
from .exceptions import SessionConfigurationError, SessionExecutionError
from .state import SessionState


class DefaultSearchSession:
    """Concrete SearchSession. One-shot Execution Context only."""

    def __init__(
        self,
        *,
        membership: MembershipEngine,
        resolve: ResolveEngine,
    ) -> None:
        if membership is None:
            raise SessionConfigurationError("MembershipEngine is required")
        if resolve is None:
            raise SessionConfigurationError("ResolveEngine is required")
        self._membership = membership
        self._resolve = resolve
        self._state = SessionState.READY
        self._context: Optional[SearchExecutionContext] = None

    @property
    def context(self) -> Optional[SearchExecutionContext]:
        return self._context

    @property
    def state(self) -> SessionState:
        return self._state

    def run(
        self,
        dataset: PublishedDataset,
        query: MembershipQuery,
    ) -> SearchResult:
        if self._state != SessionState.READY:
            raise SessionExecutionError(
                "Session already consumed; create a new Session for each request"
            )
        if dataset is None:
            raise SessionConfigurationError("PublishedDataset is required")
        if query is None:
            raise SessionConfigurationError("MembershipQuery is required")
        if not isinstance(dataset, PublishedDataset):
            raise SessionConfigurationError(
                "dataset must be a PublishedDataset (Loader-supplied)"
            )
        if not isinstance(query, MembershipQuery):
            raise SessionConfigurationError("query must be a MembershipQuery")

        self._state = SessionState.RUNNING
        ctx = SearchExecutionContext()
        ctx.query = query
        self._context = ctx

        try:
            result = self._execute(dataset, query, ctx)
            ctx.result = result
            return result
        finally:
            ctx.close()
            self._state = SessionState.CLOSED

    def _execute(
        self,
        dataset: PublishedDataset,
        query: MembershipQuery,
        ctx: SearchExecutionContext,
    ) -> SearchResult:
        try:
            candidates = self._membership.evaluate(dataset, query)
        except MembershipError as exc:
            raise SessionExecutionError(
                f"Membership stage failed: {exc}",
                cause=exc,
            ) from exc
        except Exception as exc:  # noqa: BLE001
            raise SessionExecutionError(
                f"Membership stage failed unexpectedly: {exc}",
                cause=exc,
            ) from exc

        if candidates is None:
            raise SessionExecutionError("Membership returned None")

        resolved_candidates = []
        resolved_strategies: list[Strategy] = []

        for index, candidate in enumerate(candidates):
            try:
                strategy = self._resolve.resolve(candidate)
            except ResolveError as exc:
                raise SessionExecutionError(
                    f"Resolve stage failed at candidate[{index}]: {exc}",
                    cause=exc,
                ) from exc
            except Exception as exc:  # noqa: BLE001
                raise SessionExecutionError(
                    f"Resolve stage failed unexpectedly at candidate[{index}]: {exc}",
                    cause=exc,
                ) from exc
            resolved_candidates.append(candidate)
            resolved_strategies.append(strategy)

        ctx.candidates = tuple(resolved_candidates)
        ctx.strategies = tuple(resolved_strategies)

        if not resolved_candidates:
            return SearchResult()

        return SearchResult(
            candidate=resolved_candidates[0],
            strategy=resolved_strategies[0],
            candidates=tuple(resolved_candidates),
            strategies=tuple(resolved_strategies),
        )
