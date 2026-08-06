"""
KDTree layer for envelope candidate retrieval.

Consumes Spatial Index candidate ids and PublishedDataset records,
then returns deterministic nearest shortlists only.
"""

from .builder import DefaultKDTreeBuilder
from .contract import KD_TREE_DIMENSIONS
from .encoding import (
    encode_query_to_vector,
    encode_record_to_vector,
    encode_record_to_vector_item,
)
from .exceptions import (
    InvalidKDTreeCandidate,
    InvalidKDTreeDataset,
    InvalidKDTreeQuery,
    KDTreeBuildFailure,
    KDTreeError,
)
from .factory import create_kd_tree_builder, create_kd_tree_query
from .models import (
    EncodedCandidate,
    KDTreeIndex,
    KDTreeNode,
    KDTreeQueryInput,
    NearestCandidate,
)
from .query import DefaultKDTreeQuery

__all__ = [
    "DefaultKDTreeBuilder",
    "DefaultKDTreeQuery",
    "EncodedCandidate",
    "InvalidKDTreeCandidate",
    "InvalidKDTreeDataset",
    "InvalidKDTreeQuery",
    "KDTreeBuildFailure",
    "KDTreeError",
    "KDTreeIndex",
    "KDTreeNode",
    "KDTreeQueryInput",
    "KD_TREE_DIMENSIONS",
    "NearestCandidate",
    "create_kd_tree_builder",
    "create_kd_tree_query",
    "encode_query_to_vector",
    "encode_record_to_vector",
    "encode_record_to_vector_item",
]
