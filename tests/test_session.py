"""
Search Session tests (SEARCH_SESSION_SSOT contract).
"""

from __future__ import annotations

import copy
import hashlib
import importlib
import inspect
import sys
from pathlib import Path
from typing import List

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from membership import MembershipQuery, create_membership_engine  # noqa: E402
from models import (  # noqa: E402
    DatasetIdentity,
    EnvelopeRecord,
    MembershipCandidate,
    Point,
    PublishedDataset,
    StrategyRef,
)
from resolve import Strategy, create_memory_repository, create_resolve_engine  # noqa: E402
from runtime.result import SearchResult  # noqa: E402
from session import (  # noqa: E402
    SearchExecutionContext,
    SessionExecutionError,
    SessionState,
    create_session,
)
from session.exceptions import SessionConfigurationError  # noqa: E402


def _record(
    sid: str,
    target: Point,
    cue_set: list[Point],
    second_set: list[Point],
) -> EnvelopeRecord:
    return EnvelopeRecord(
        strategy_ref=StrategyRef(sid),
        target=target,
        cue_set=list(cue_set),
        second_set=list(second_set),
    )


def _dataset(records: list[EnvelopeRecord]) -> PublishedDataset:
    return PublishedDataset(
        records=records,
        dataset_identity=DatasetIdentity("ds-session"),
    )


def _query(target: Point, cue: Point, second: Point) -> MembershipQuery:
    return MembershipQuery(cue=cue, target=target, second=second)


def _fixture_points():
    return Point(10.0, 20.0), Point(1.0, 2.0), Point(3.0, 4.0)


class _OrderProbe:
    def __init__(self) -> None:
        self.order: List[str] = []


class _RecordingMembership:
    def __init__(self, inner, probe: _OrderProbe) -> None:
        self._inner = inner
        self._probe = probe

    def evaluate(self, dataset, query):
        self._probe.order.append("membership")
        return self._inner.evaluate(dataset, query)


class _RecordingResolve:
    def __init__(self, inner, probe: _OrderProbe) -> None:
        self._inner = inner
        self._probe = probe
        self.candidates_seen: List[MembershipCandidate] = []

    def resolve(self, candidate):
        self._probe.order.append("resolve")
        self.candidates_seen.append(candidate)
        return self._inner.resolve(candidate)


def _runtime_engine_fingerprint() -> str:
    path = ROOT / "runtime" / "engine.py"
    return hashlib.sha256(path.read_bytes()).hexdigest()


# Capture fingerprint at import time so tests detect accidental runtime edits.
_RUNTIME_ENGINE_SHA = _runtime_engine_fingerprint()


def test_session_creation() -> None:
    repo = create_memory_repository(
        {StrategyRef("s1"): Strategy(strategy_ref=StrategyRef("s1"))}
    )
    sess = create_session(repository=repo)
    assert sess is not None
    assert sess.state == SessionState.READY
    assert sess.context is None


def test_session_one_shot_run() -> None:
    target, cue, second = _fixture_points()
    ds = _dataset([_record("s1", target, [cue], [second])])
    repo = create_memory_repository(
        {StrategyRef("s1"): Strategy(strategy_ref=StrategyRef("s1"))}
    )
    sess = create_session(repository=repo)
    result = sess.run(ds, _query(target, cue, second))
    assert isinstance(result, SearchResult)
    assert result.candidate is not None
    assert result.strategy is not None
    assert result.strategy.strategy_ref == StrategyRef("s1")
    assert sess.state == SessionState.CLOSED


def test_membership_called() -> None:
    target, cue, second = _fixture_points()
    ds = _dataset([_record("s1", target, [cue], [second])])
    repo = create_memory_repository(
        {StrategyRef("s1"): Strategy(strategy_ref=StrategyRef("s1"))}
    )
    probe = _OrderProbe()
    membership = _RecordingMembership(create_membership_engine(), probe)
    sess = create_session(
        membership=membership,
        resolve=create_resolve_engine(repo),
    )
    sess.run(ds, _query(target, cue, second))
    assert "membership" in probe.order


def test_resolve_called() -> None:
    target, cue, second = _fixture_points()
    ds = _dataset([_record("s1", target, [cue], [second])])
    repo = create_memory_repository(
        {StrategyRef("s1"): Strategy(strategy_ref=StrategyRef("s1"))}
    )
    probe = _OrderProbe()
    recording_resolve = _RecordingResolve(create_resolve_engine(repo), probe)
    sess = create_session(
        membership=create_membership_engine(),
        resolve=recording_resolve,
    )
    result = sess.run(ds, _query(target, cue, second))
    assert "resolve" in probe.order
    assert len(recording_resolve.candidates_seen) == 1
    assert recording_resolve.candidates_seen[0].strategy_ref == StrategyRef("s1")
    assert result.candidate is not None


def test_search_result_returned() -> None:
    target, cue, second = _fixture_points()
    ds = _dataset([_record("s1", target, [cue], [second])])
    repo = create_memory_repository(
        {StrategyRef("s1"): Strategy(strategy_ref=StrategyRef("s1"))}
    )
    result = create_session(repository=repo).run(ds, _query(target, cue, second))
    assert type(result) is SearchResult
    assert result.__class__.__module__ == "runtime.result"


def test_context_created() -> None:
    target, cue, second = _fixture_points()
    ds = _dataset([_record("s1", target, [cue], [second])])
    repo = create_memory_repository(
        {StrategyRef("s1"): Strategy(strategy_ref=StrategyRef("s1"))}
    )
    sess = create_session(repository=repo)
    assert sess.context is None
    sess.run(ds, _query(target, cue, second))
    assert sess.context is not None
    assert isinstance(sess.context, SearchExecutionContext)


def test_context_closed_after_run() -> None:
    target, cue, second = _fixture_points()
    ds = _dataset([_record("s1", target, [cue], [second])])
    repo = create_memory_repository(
        {StrategyRef("s1"): Strategy(strategy_ref=StrategyRef("s1"))}
    )
    sess = create_session(repository=repo)
    sess.run(ds, _query(target, cue, second))
    ctx = sess.context
    assert ctx is not None
    assert ctx.closed is True
    # Disposable: execution data cleared after close.
    assert ctx.query is None
    assert ctx.candidates == ()
    assert ctx.strategies == ()
    assert ctx.result is None


def test_runtime_unchanged() -> None:
    """Session must not replace or alter Runtime Host sources."""
    assert _runtime_engine_fingerprint() == _RUNTIME_ENGINE_SHA
    runtime_mod = importlib.import_module("runtime")
    assert hasattr(runtime_mod, "create_runtime")
    assert hasattr(runtime_mod, "DefaultSearchRuntime")
    session_mod = importlib.import_module("session")
    # Session is a separate package — does not redefine Runtime Host API.
    assert not hasattr(session_mod, "create_runtime")
    assert not hasattr(session_mod, "SearchRuntime")
    assert not hasattr(session_mod, "DefaultSearchRuntime")
    # Session uses runtime.result.SearchResult; does not own a Result type.
    assert not hasattr(session_mod, "SearchResult")


def test_no_loader_bypass() -> None:
    for name in ("session.session", "session.factory", "session.context"):
        src = inspect.getsource(importlib.import_module(name))
        assert "from loader" not in src
        assert "import loader" not in src
        assert "create_package_loader" not in src
        assert "PackageLoader" not in src
        assert "load_path" not in src
        assert "package_data" not in src
        assert "manifest_data" not in src
        assert "version_data" not in src


def test_validation_not_reinvoked() -> None:
    for name in (
        "session.session",
        "session.factory",
        "session.context",
        "session.interfaces",
    ):
        src = inspect.getsource(importlib.import_module(name))
        assert "validation" not in src
        assert "validate_" not in src
        assert "jsonschema" not in src


def test_session_not_reusable() -> None:
    target, cue, second = _fixture_points()
    ds = _dataset([_record("s1", target, [cue], [second])])
    repo = create_memory_repository(
        {StrategyRef("s1"): Strategy(strategy_ref=StrategyRef("s1"))}
    )
    sess = create_session(repository=repo)
    sess.run(ds, _query(target, cue, second))
    with pytest.raises(SessionExecutionError):
        sess.run(ds, _query(target, cue, second))
    # New request → new Session.
    sess2 = create_session(repository=repo)
    result = sess2.run(ds, _query(target, cue, second))
    assert result.strategy is not None


def test_no_side_effect_on_dataset() -> None:
    target, cue, second = _fixture_points()
    ds = _dataset([_record("s1", target, [cue], [second])])
    before = copy.deepcopy(ds)
    repo = create_memory_repository(
        {StrategyRef("s1"): Strategy(strategy_ref=StrategyRef("s1"))}
    )
    create_session(repository=repo).run(ds, _query(target, cue, second))
    assert ds == before


def test_membership_then_resolve_order() -> None:
    target, cue, second = _fixture_points()
    ds = _dataset([_record("s1", target, [cue], [second])])
    repo = create_memory_repository(
        {StrategyRef("s1"): Strategy(strategy_ref=StrategyRef("s1"))}
    )
    probe = _OrderProbe()
    sess = create_session(
        membership=_RecordingMembership(create_membership_engine(), probe),
        resolve=_RecordingResolve(create_resolve_engine(repo), probe),
    )
    sess.run(ds, _query(target, cue, second))
    assert probe.order == ["membership", "resolve"]


def test_configuration_requires_repository_or_resolve() -> None:
    with pytest.raises(SessionConfigurationError):
        create_session()
