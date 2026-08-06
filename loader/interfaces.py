"""
Package Loader interfaces (contracts).

Read-only. No Membership, Resolve, Runtime, Generator, or write APIs.
"""

from __future__ import annotations

from pathlib import Path
from typing import Any, Mapping, Optional, Protocol, runtime_checkable

from models import PublishedDataset


@runtime_checkable
class PackageLoader(Protocol):
    """
    Unique Package Reader / Dataset Provider (SEARCH_LOADER_SSOT).

    Confirms Package / Manifest / Version, returns PublishedDataset.
    """

    def load(
        self,
        package_data: Mapping[str, Any],
        *,
        manifest_data: Optional[Mapping[str, Any]] = None,
        version_data: Optional[Mapping[str, Any]] = None,
    ) -> PublishedDataset:
        """Load from in-memory Package JSON (and optional Manifest/Version JSON)."""
        ...

    def load_path(
        self,
        package_path: Path | str,
        *,
        manifest_path: Optional[Path | str] = None,
        version_path: Optional[Path | str] = None,
    ) -> PublishedDataset:
        """Load Package JSON from disk (optional Manifest/Version paths)."""
        ...
