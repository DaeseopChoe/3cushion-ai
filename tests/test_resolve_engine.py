"""
Resolve Engine tests (RESOLVE_SSOT contract).
"""

from __future__ import annotations

import copy
import importlib
import inspect
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from models import (  # noqa: E402
    MembershipCandidate,
    MembershipFlags,
    RecordIdentity,
    StrategyRef,
)
from resolve import (  # noqa: E402
    Strategy,
    StrategyNotFound,
    create_memory_repository,
    create_resolve_engine,
)
from resolve.exceptions import ResolveInputError  # noqa: E402


def _flags(
    *,
    target: bool = True,
    cue: bool = True,
    second: bool = True,
) -> MembershipFlags:
    return MembershipFlags(
        target_match=target,
        cue_membership=cue,
        second_membership=second,
    )


def _candidate(sid: str) -> MembershipCandidate:
    return MembershipCandidate(
        strategy_ref=StrategyRef(sid),
        record_identity=RecordIdentity(sid),
        membership=_flags(),
    )


def _engine_with(*sids: str):
    strategies = {
        StrategyRef(sid): Strategy(strategy_ref=StrategyRef(sid)) for sid in sids
    }
    repo = create_memory_repository(strategies)
    return create_resolve_engine(repo), repo


def test_strategy_resolve() -> None:
    engine, _ = _engine_with("s1")
    result = engine.resolve(_candidate("s1"))
    assert isinstance(result, Strategy)
    assert result.strategy_ref == StrategyRef("s1")


def test_repository_lookup() -> None:
    strategies = {
        StrategyRef("a"): Strategy(strategy_ref=StrategyRef("a")),
        StrategyRef("b"): Strategy(strategy_ref=StrategyRef("b")),
    }
    repo = create_memory_repository(strategies)
    assert repo.lookup(StrategyRef("a")).strategy_ref == StrategyRef("a")
    assert repo.lookup(StrategyRef("b")).strategy_ref == StrategyRef("b")


def test_strategy_not_found() -> None:
    engine, _ = _engine_with("s1")
    with pytest.raises(StrategyNotFound):
        engine.resolve(_candidate("missing"))


def test_invalid_candidate() -> None:
    engine, _ = _engine_with("s1")
    with pytest.raises(ResolveInputError):
        engine.resolve(None)  # type: ignore[arg-type]
    with pytest.raises(ResolveInputError):
        engine.resolve("not-a-candidate")  # type: ignore[arg-type]
    bad = MembershipCandidate(
        strategy_ref=StrategyRef(""),
        record_identity=RecordIdentity("x"),
        membership=_flags(),
    )
    with pytest.raises(ResolveInputError):
        engine.resolve(bad)


def test_multiple_resolve() -> None:
    engine, _ = _engine_with("s1", "s2", "s3")
    r1 = engine.resolve(_candidate("s1"))
    r2 = engine.resolve(_candidate("s2"))
    r3 = engine.resolve(_candidate("s3"))
    assert r1.strategy_ref == StrategyRef("s1")
    assert r2.strategy_ref == StrategyRef("s2")
    assert r3.strategy_ref == StrategyRef("s3")


def test_read_only_repository() -> None:
    repo = create_memory_repository(
        {StrategyRef("s1"): Strategy(strategy_ref=StrategyRef("s1"))}
    )
    write_names = {"put", "add", "create", "update", "delete", "remove", "write", "save"}
    public = {name for name in dir(repo) if not name.startswith("_")}
    assert write_names.isdisjoint(public)
    assert hasattr(repo, "lookup")
    assert callable(repo.lookup)


def test_candidate_unchanged() -> None:
    engine, _ = _engine_with("s1")
    candidate = _candidate("s1")
    before = copy.deepcopy(candidate)
    engine.resolve(candidate)
    assert candidate == before
    assert candidate.strategy_ref == before.strategy_ref
    assert candidate.record_identity == before.record_identity
    assert candidate.membership == before.membership


def test_membership_not_called() -> None:
    """Resolve package must not import or invoke Membership Engine."""
    resolve_pkg = importlib.import_module("resolve")
    resolve_engine = importlib.import_module("resolve.engine")
    src = inspect.getsource(resolve_engine)
    # MembershipCandidate model only — not the membership package / engine.
    assert "from membership" not in src
    assert "import membership" not in src
    assert "create_membership_engine" not in src
    assert "MembershipEngine" not in src
    assert not hasattr(resolve_pkg, "evaluate")


def test_loader_not_called() -> None:
    engine_mod = importlib.import_module("resolve.engine")
    src = inspect.getsource(engine_mod)
    assert "from loader" not in src
    assert "import loader" not in src
    assert "create_package_loader" not in src
    assert "PackageLoader" not in src


def test_dataset_not_used() -> None:
    engine_mod = importlib.import_module("resolve.engine")
    src = inspect.getsource(engine_mod)
    assert "from models import" in src
    # Only MembershipCandidate is imported from models — not Dataset types.
    assert "PublishedDataset" not in src
    assert "EnvelopeRecord" not in src
    sig = inspect.signature(engine_mod.DefaultResolveEngine.resolve)
    assert "dataset" not in sig.parameters
    assert list(sig.parameters.keys()) == ["self", "candidate"]


def test_validation_not_reinvoked() -> None:
    for mod_name in (
        "resolve.engine",
        "resolve.repository",
        "resolve.factory",
        "resolve.interfaces",
    ):
        mod = importlib.import_module(mod_name)
        src = inspect.getsource(mod)
        assert "validation" not in src
        assert "validate_" not in src
        assert "jsonschema" not in src
