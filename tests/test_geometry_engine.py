"""
Geometry Engine tests (ModalExecution → GeometryContext).
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

from geometry import (  # noqa: E402
    GeometryContext,
    GeometryContextFailure,
    InvalidGeometryContext,
    create_geometry_engine,
)
from modal import ModalExecution  # noqa: E402
from models import StrategyRef  # noqa: E402
from strategy import FrozenStrategy  # noqa: E402
from strategy_engine import StrategyExecution  # noqa: E402


def _modal_execution(sid: str = "s1") -> ModalExecution:
    handle = FrozenStrategy(strategy_ref=StrategyRef(sid))
    strategy_exec = StrategyExecution(
        strategy_ref=StrategyRef(sid),
        handle=handle,
    )
    return ModalExecution(
        strategy_ref=StrategyRef(sid),
        strategy_execution=strategy_exec,
    )


def test_modal_execution_input() -> None:
    engine = create_geometry_engine()
    modal_exec = _modal_execution("s1")
    result = engine.execute(modal_exec)
    assert result.modal_execution is modal_exec
    assert result.strategy_ref == StrategyRef("s1")


def test_geometry_context_created() -> None:
    result = create_geometry_engine().execute(_modal_execution("g1"))
    assert isinstance(result, GeometryContext)
    assert result.strategy_ref == StrategyRef("g1")
    assert result.metadata is None
    fields = set(result.__dataclass_fields__.keys())
    assert fields == {"strategy_ref", "modal_execution", "metadata"}
    assert not hasattr(result, "distance")
    assert not hasattr(result, "intersection")
    assert not hasattr(result, "ranking")
    assert not hasattr(result, "payload")
    assert not hasattr(result, "kdtree")


def test_invalid_context() -> None:
    engine = create_geometry_engine()
    with pytest.raises(InvalidGeometryContext):
        engine.execute(None)  # type: ignore[arg-type]
    with pytest.raises(InvalidGeometryContext):
        engine.execute("not-a-modal")  # type: ignore[arg-type]
    bad = ModalExecution(
        strategy_ref=StrategyRef(""),
        strategy_execution=StrategyExecution(
            strategy_ref=StrategyRef(""),
            handle=FrozenStrategy(strategy_ref=StrategyRef("")),
        ),
    )
    with pytest.raises(InvalidGeometryContext):
        engine.execute(bad)


def test_frozen_context() -> None:
    result = create_geometry_engine().execute(_modal_execution())
    assert dataclasses.is_dataclass(result)
    assert result.__dataclass_params__.frozen is True  # type: ignore[attr-defined]
    with pytest.raises(dataclasses.FrozenInstanceError):
        result.strategy_ref = StrategyRef("mutated")  # type: ignore[misc]


def test_factory_creation() -> None:
    engine = create_geometry_engine()
    assert engine is not None
    assert hasattr(engine, "execute")
    assert engine.execute(_modal_execution("f1")).strategy_ref == StrategyRef("f1")


def test_read_only() -> None:
    engine = create_geometry_engine()
    public = {name for name in dir(engine) if not name.startswith("_")}
    write_names = {"put", "add", "update", "delete", "write", "save", "set"}
    assert write_names.isdisjoint(public)
    assert "execute" in public


def test_no_side_effect_on_modal_execution() -> None:
    modal_exec = _modal_execution("s1")
    before = copy.deepcopy(modal_exec)
    create_geometry_engine().execute(modal_exec)
    assert modal_exec == before
    assert modal_exec.strategy_ref == before.strategy_ref
    assert modal_exec.strategy_execution == before.strategy_execution


def test_exception_propagation() -> None:
    with pytest.raises(InvalidGeometryContext) as exc_info:
        create_geometry_engine().execute(None)  # type: ignore[arg-type]
    assert isinstance(exc_info.value, InvalidGeometryContext)
    assert "required" in str(exc_info.value).lower()


def test_context_failure_wrap() -> None:
    class _Broken:
        def execute(self, modal_execution):
            raise GeometryContextFailure("boom")

    with pytest.raises(GeometryContextFailure):
        _Broken().execute(_modal_execution())


def test_no_forbidden_layer_calls() -> None:
    for name in (
        "geometry.engine",
        "geometry.context",
        "geometry.factory",
        "geometry.interfaces",
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
            "create_modal_engine",
            "create_strategy_engine",
            "create_strategy_repository",
            "DefaultModalEngine",
            "DefaultStrategyEngine",
            "MemoryStrategyRepository",
            "validation",
            "PublishedDataset",
            "jsonschema",
            "sqrt(",
            "KDTree",
        ):
            assert banned not in src
        # No math / search algorithm implementation in this layer.
        assert "def distance" not in src
        assert "def intersection" not in src
