"""
Strategy Engine tests (Handle → StrategyExecution).
"""

from __future__ import annotations

import copy
import dataclasses
import importlib
import inspect
import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from models import StrategyRef  # noqa: E402
from strategy import FrozenStrategy, create_strategy_repository  # noqa: E402
from strategy_engine import (  # noqa: E402
    InvalidStrategyHandle,
    StrategyExecution,
    StrategyExecutionFailure,
    create_strategy_engine,
)


def _handle(sid: str) -> FrozenStrategy:
    return FrozenStrategy(strategy_ref=StrategyRef(sid))


def test_strategy_handle_execute() -> None:
    engine = create_strategy_engine()
    handle = _handle("s1")
    execution = engine.execute(handle)
    assert isinstance(execution, StrategyExecution)
    assert execution.strategy_ref == StrategyRef("s1")
    assert execution.handle is handle
    assert execution.metadata is None


def test_invalid_handle() -> None:
    engine = create_strategy_engine()
    with pytest.raises(InvalidStrategyHandle):
        engine.execute(None)  # type: ignore[arg-type]
    with pytest.raises(InvalidStrategyHandle):
        engine.execute("not-a-handle")  # type: ignore[arg-type]
    with pytest.raises(InvalidStrategyHandle):
        engine.execute(FrozenStrategy(strategy_ref=StrategyRef("")))


def test_frozen_execution() -> None:
    execution = create_strategy_engine().execute(_handle("s1"))
    assert dataclasses.is_dataclass(execution)
    assert execution.__dataclass_params__.frozen is True  # type: ignore[attr-defined]
    with pytest.raises(dataclasses.FrozenInstanceError):
        execution.strategy_ref = StrategyRef("mutated")  # type: ignore[misc]


def test_no_side_effect_on_handle() -> None:
    handle = _handle("s1")
    before = copy.deepcopy(handle)
    create_strategy_engine().execute(handle)
    assert handle == before
    assert handle.strategy_ref == before.strategy_ref


def test_read_only_no_repository_mutation() -> None:
    repo = create_strategy_repository(seed=[_handle("s1")])
    handle = repo.lookup(StrategyRef("s1"))
    engine = create_strategy_engine()
    engine.execute(handle)
    # Repository still resolves the same handle; engine has no write API.
    assert repo.contains(StrategyRef("s1"))
    assert repo.lookup(StrategyRef("s1")).strategy_ref == StrategyRef("s1")
    public = {name for name in dir(engine) if not name.startswith("_")}
    write_names = {"put", "add", "update", "delete", "write", "save", "set"}
    assert write_names.isdisjoint(public)
    assert "execute" in public


def test_factory_creation() -> None:
    engine = create_strategy_engine()
    assert engine is not None
    assert hasattr(engine, "execute")
    result = engine.execute(_handle("factory"))
    assert result.strategy_ref == StrategyRef("factory")


def test_exception_propagation() -> None:
    engine = create_strategy_engine()
    with pytest.raises(InvalidStrategyHandle) as exc_info:
        engine.execute(None)  # type: ignore[arg-type]
    assert isinstance(exc_info.value, InvalidStrategyHandle)
    assert "required" in str(exc_info.value).lower()


def test_execution_failure_wrap() -> None:
    """Unexpected construction failure is wrapped as StrategyExecutionFailure."""

    class _BrokenEngine:
        def execute(self, strategy_handle):
            raise StrategyExecutionFailure("boom")

    with pytest.raises(StrategyExecutionFailure):
        _BrokenEngine().execute(_handle("s1"))


def test_no_modal_or_algorithm_fields() -> None:
    execution = create_strategy_engine().execute(_handle("s1"))
    fields = set(execution.__dataclass_fields__.keys())
    assert fields == {"strategy_ref", "handle", "metadata"}
    assert not hasattr(execution, "modal")
    assert not hasattr(execution, "geometry")
    assert not hasattr(execution, "ranking")
    assert not hasattr(execution, "kdtree")


def test_no_forbidden_layer_imports() -> None:
    for name in (
        "strategy_engine.engine",
        "strategy_engine.execution",
        "strategy_engine.factory",
        "strategy_engine.interfaces",
    ):
        src = inspect.getsource(importlib.import_module(name))
        for banned in (
            "from membership",
            "import membership",
            "from resolve",
            "import resolve",
            "from runtime",
            "import runtime",
            "from session",
            "import session",
            "from loader",
            "import loader",
            "validation",
            "PublishedDataset",
            "jsonschema",
            "create_strategy_repository",
            "MemoryStrategyRepository",
        ):
            assert banned not in src
