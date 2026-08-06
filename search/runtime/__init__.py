"""
Search Runtime Enhancement wiring.

Orchestrates Phase-3 engines for the Search Runtime Host.
Does not implement search algorithms.
"""

from .factory import create_search_enhancement_orchestrator
from .orchestrator import PipelineArtifacts, SearchEnhancementOrchestrator

__all__ = [
    "PipelineArtifacts",
    "SearchEnhancementOrchestrator",
    "create_search_enhancement_orchestrator",
]
