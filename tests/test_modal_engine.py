"""
Modal Engine tests (StrategyExecution → ModalExecution).
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
from strategy import FrozenStrategy  # noqa: E402
from strategy_engine import StrategyExecution  # noqa: E402
from modal import (  # noqa: E402
    InvalidModalExecution,
    ModalExecution,
    ModalExecutionFailure,
    create_modal_engine,
)


def _strategy_execution(sid: str = "s1") -> StrategyExecution:
    handle = FrozenStrategy(strategy_ref=StrategyRef(sid))
    return StrategyExecution(strategy_ref=StrategyRef(sid), handle=handle)


def test_strategy_execution_input() -> None:
    engine = create_modal_engine()
    strategy_exec = _strategy_execution("s1")
    result = engine.execute(strategy_exec)
    assert result.strategy_execution is strategy_exec
    assert result.strategy_ref == StrategyRef("s1")


def test_modal_execution_created() -> None:
    result = create_modal_engine().execute(_strategy_execution("m1"))
    assert isinstance(result, ModalExecution)
    assert result.strategy_ref == StrategyRef("m1")
    assert result.metadata is None
    fields = set(result.__dataclass_fields__.keys())
    assert fields == {"strategy_ref", "strategy_execution", "metadata"}
    assert not hasattr(result, "geometry")
    assert not hasattr(result, "ranking")
    assert not hasattr(result, "payload")
    assert not hasattr(result, "kdtree")


def test_invalid_execution() -> None:
    engine = create_modal_engine()
    with pytest.raises(InvalidModalExecution):
        engine.execute(None)  # type: ignore[arg-type]
    with pytest.raises(InvalidModalExecution):
        engine.execute("not-an-execution")  # type: ignore[arg-type]
    bad = StrategyExecution(
        strategy_ref=StrategyRef(""),
        handle=FrozenStrategy(strategy_ref=StrategyRef("")),
    )
    with pytest.raises(InvalidModalExecution):
        engine.execute(bad)


def test_frozen_execution() -> None:
    result = create_modal_engine().execute(_strategy_execution())
    assert dataclasses.is_dataclass(result)
    assert result.__dataclass_params__.frozen is True  # type: ignore[attr-defined]
    with pytest.raises(dataclasses.FrozenInstanceError):
        result.strategy_ref = StrategyRef("mutated")  # type: ignore[misc]


def test_factory_creation() -> None:
    engine = create_modal_engine()
    assert engine is not None
    assert hasattr(engine, "execute")
    assert engine.execute(_strategy_execution("f1")).strategy_ref == StrategyRef("f1")


def test_read_only() -> None:
    engine = create_modal_engine()
    public = {name for name in dir(engine) if not name.startswith("_")}
    write_names = {"put", "add", "update", "delete", "write", "save", "set"}
    assert write_names.isdisjoint(public)
    assert "execute" in public


def test_no_side_effect_on_strategy_execution() -> None:
    strategy_exec = _strategy_execution("s1")
    before = copy.deepcopy(strategy_exec)
    create_modal_engine().execute(strategy_exec)
    assert strategy_exec == before
    assert strategy_exec.strategy_ref == before.strategy_ref
    assert strategy_exec.handle == before.handle


def test_exception_propagation() -> None:
    with pytest.raises(InvalidModalExecution) as exc_info:
        create_modal_engine().execute(None)  # type: ignore[arg-type]
    assert isinstance(exc_info.value, InvalidModalExecution)
    assert "required" in str(exc_info.value).lower()


def test_execution_failure_wrap() -> None:
    class _Broken:
        def execute(self, strategy_execution):
            raise ModalExecutionFailure("boom")

    with pytest.raises(ModalExecutionFailure):
        _Broken().execute(_strategy_execution())


def test_no_forbidden_layer_calls() -> None:
    for name in (
        "modal.engine",
        "modal.execution",
        "modal.factory",
        "modal.interfaces",
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
            "from strategy import",
            "import strategy\n",
            "create_strategy_engine",
            "create_strategy_repository",
            "DefaultStrategyEngine",
            "MemoryStrategyRepository",
            "validation",
            "PublishedDataset",
            "jsonschema",
        ):
            assert banned not in src
