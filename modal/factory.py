"""
Modal Engine factory.
"""

from __future__ import annotations

from .engine import DefaultModalEngine
from .interfaces import ModalEngine


def create_modal_engine() -> ModalEngine:
    """Return the default Modal Execution Engine."""
    return DefaultModalEngine()
