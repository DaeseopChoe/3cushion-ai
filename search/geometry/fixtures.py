"""Fixtures for Geometry Metrics Engine tests."""

from __future__ import annotations

from models import Point
from search.geometry.models import GeometrySearchQuery
from search.interpolation import create_interpolation_engine
from search.interpolation.models import RefinedCandidate
from search.ranking import create_ranking_engine
from search.ranking.fixtures import make_fixture_candidates


def make_fixture_query() -> GeometrySearchQuery:
    return GeometrySearchQuery(
        cue=Point(x=10.0, y=10.0),
        target=Point(x=40.0, y=20.0),
        second=Point(x=70.0, y=10.0),
    )


def make_fixture_refined_candidates() -> list[RefinedCandidate]:
    ranked = create_ranking_engine().rank(make_fixture_candidates())
    return create_interpolation_engine().refine(ranked)
