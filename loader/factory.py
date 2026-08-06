"""
Loader factory.

Creates the default PackageLoader instance.
"""

from __future__ import annotations

from .interfaces import PackageLoader
from .package_loader import DefaultPackageLoader


def create_package_loader() -> PackageLoader:
    """Return the repository Package Reader / Dataset Provider."""
    return DefaultPackageLoader()
