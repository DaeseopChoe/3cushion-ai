"""
Search Session public API.

One-shot Execution Context (SEARCH_SESSION_SSOT).
Does not replace Search Runtime Host.
"""

from .context import SearchExecutionContext
from .exceptions import (
    SessionConfigurationError,
    SessionError,
    SessionExecutionError,
)
from .factory import create_session
from .interfaces import SearchSession
from .session import DefaultSearchSession
from .state import SessionState

__all__ = [
    "SearchSession",
    "DefaultSearchSession",
    "SearchExecutionContext",
    "SessionState",
    "create_session",
    "SessionError",
    "SessionConfigurationError",
    "SessionExecutionError",
]
