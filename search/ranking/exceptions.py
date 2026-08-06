"""Ranking Engine exceptions."""

from __future__ import annotations


class RankingError(Exception):
    """Base error for Ranking Engine."""


class InvalidRankingInput(RankingError):
    """Ranking input is missing or invalid."""


class RankingFailure(RankingError):
    """Ranking failed unexpectedly."""

    def __init__(self, message: str, *, cause: BaseException | None = None) -> None:
        super().__init__(message)
        self.cause = cause
