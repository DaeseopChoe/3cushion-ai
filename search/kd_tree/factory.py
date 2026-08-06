"""Factory helpers for KDTree layer."""

from __future__ import annotations

from .builder import DefaultKDTreeBuilder
from .query import DefaultKDTreeQuery


def create_kd_tree_builder() -> DefaultKDTreeBuilder:
    """Create KDTree builder."""
    return DefaultKDTreeBuilder()


def create_kd_tree_query() -> DefaultKDTreeQuery:
    """Create KDTree query API."""
    return DefaultKDTreeQuery()
