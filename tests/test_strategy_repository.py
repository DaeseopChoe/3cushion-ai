"""
Strategy Repository tests (read-only StrategyRef → Handle).
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

from models import StrategyRef  # noqa: E402
from strategy import (  # noqa: E402
    FrozenStrategy,
    InvalidStrategyReference,
    StrategyNotFound,
    StrategyRepositoryError,
    create_strategy_repository,
)


def _handle(sid: str) -> FrozenStrategy:
    return FrozenStrategy(strategy_ref=StrategyRef(sid))


def test_lookup_success() -> None:
    repo = create_strategy_repository(
        {StrategyRef("s1"): _handle("s1")}
    )
    result = repo.lookup(StrategyRef("s1"))
    assert isinstance(result, FrozenStrategy)
    assert result.strategy_ref == StrategyRef("s1")


def test_lookup_failure() -> None:
    repo = create_strategy_repository(
        {StrategyRef("s1"): _handle("s1")}
    )
    with pytest.raises(StrategyNotFound):
        repo.lookup(StrategyRef("missing"))


def test_contains() -> None:
    repo = create_strategy_repository(
        {StrategyRef("s1"): _handle("s1")}
    )
    assert repo.contains(StrategyRef("s1")) is True
    assert repo.contains(StrategyRef("missing")) is False
    assert repo.contains(StrategyRef("")) is False
    assert repo.contains(None) is False  # type: ignore[arg-type]


def test_read_only() -> None:
    repo = create_strategy_repository(seed=[_handle("s1")])
    write_names = {
        "put",
        "add",
        "create",
        "update",
        "delete",
        "remove",
        "write",
        "save",
        "set",
        "insert",
    }
    public = {name for name in dir(repo) if not name.startswith("_")}
    assert write_names.isdisjoint(public)
    assert hasattr(repo, "lookup")
    assert hasattr(repo, "contains")
    src = inspect.getsource(type(repo))
    for banned in ("def put", "def add", "def update", "def delete", "def write"):
        assert banned not in src


def test_seed_creation() -> None:
    repo = create_strategy_repository(
        seed=[_handle("a"), _handle("b")]
    )
    assert repo.contains(StrategyRef("a"))
    assert repo.contains(StrategyRef("b"))
    assert repo.lookup(StrategyRef("a")).strategy_ref == StrategyRef("a")
    assert repo.lookup(StrategyRef("b")).strategy_ref == StrategyRef("b")


def test_duplicate_ref() -> None:
    with pytest.raises(StrategyRepositoryError):
        create_strategy_repository(
            seed=[_handle("dup"), _handle("dup")]
        )
    with pytest.raises(StrategyRepositoryError):
        create_strategy_repository(
            {StrategyRef("x"): _handle("x")},
            seed=[_handle("x")],
        )


def test_invalid_ref() -> None:
    repo = create_strategy_repository(seed=[_handle("s1")])
    with pytest.raises(InvalidStrategyReference):
        repo.lookup(StrategyRef(""))
    with pytest.raises(InvalidStrategyReference):
        repo.lookup(None)  # type: ignore[arg-type]
    with pytest.raises(InvalidStrategyReference):
        create_strategy_repository(
            seed=[FrozenStrategy(strategy_ref=StrategyRef(""))]
        )


def test_no_side_effect_on_seed_mapping() -> None:
    seed_map = {StrategyRef("s1"): _handle("s1")}
    before = copy.deepcopy(seed_map)
    repo = create_strategy_repository(seed_map)
    seed_map[StrategyRef("s2")] = _handle("s2")
    assert repo.contains(StrategyRef("s1")) is True
    assert repo.contains(StrategyRef("s2")) is False
    with pytest.raises(StrategyNotFound):
        repo.lookup(StrategyRef("s2"))
    assert StrategyRef("s1") in before
    assert repo.lookup(StrategyRef("s1")).strategy_ref == StrategyRef("s1")


def test_handle_has_no_modal_or_algorithm() -> None:
    handle = _handle("s1")
    assert not hasattr(handle, "modal")
    assert not hasattr(handle, "geometry")
    assert not hasattr(handle, "ranking")
    assert not hasattr(handle, "interpolation")
    assert not hasattr(handle, "kdtree")
    fields = getattr(handle, "__dataclass_fields__", {})
    assert set(fields.keys()) == {"strategy_ref"}


def test_no_forbidden_layer_imports() -> None:
    for name in (
        "strategy.repository",
        "strategy.factory",
        "strategy.models",
        "strategy.corpus",
        "strategy.interfaces",
    ):
        src = inspect.getsource(importlib.import_module(name))
        assert "from membership" not in src
        assert "import membership" not in src
        assert "from resolve" not in src
        assert "import resolve" not in src
        assert "from runtime" not in src
        assert "import runtime" not in src
        assert "from session" not in src
        assert "import session" not in src
        assert "from loader" not in src
        assert "import loader" not in src
        assert "validation" not in src
        assert "PublishedDataset" not in src
        assert "jsonschema" not in src
