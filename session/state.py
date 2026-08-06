"""
Search Session lifecycle state.
"""

from __future__ import annotations

from enum import Enum


class SessionState(Enum):
    """One-shot Session lifecycle."""

    READY = "ready"
    RUNNING = "running"
    CLOSED = "closed"
