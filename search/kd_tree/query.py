"""KDTree top-N nearest query API."""

from __future__ import annotations

import heapq
import math
from typing import List

from .exceptions import InvalidKDTreeQuery
from .models import EncodedCandidate, KDTreeIndex, KDTreeNode, KDTreeQueryInput, NearestCandidate, Vector6D
from .encoding import encode_query_to_vector


def _distance_squared(a: Vector6D, b: Vector6D) -> float:
    return sum((lhs - rhs) ** 2 for lhs, rhs in zip(a, b))


def _candidate_sort_key(distance: float, candidate_id: str) -> tuple[float, str]:
    return (distance, candidate_id)


class DefaultKDTreeQuery:
    """Return deterministic nearest shortlist from KDTree candidate scope."""

    def search(
        self,
        index: KDTreeIndex,
        query: KDTreeQueryInput,
        *,
        top_n: int,
    ) -> tuple[NearestCandidate, ...]:
        if index is None or not isinstance(index, KDTreeIndex):
            raise InvalidKDTreeQuery("KDTreeIndex is required")
        if query is None or not isinstance(query, KDTreeQueryInput):
            raise InvalidKDTreeQuery("KDTreeQueryInput is required")
        if top_n <= 0:
            raise InvalidKDTreeQuery("top_n must be >= 1")
        if index.dimensions != 6:
            raise InvalidKDTreeQuery("KDTreeIndex dimensions must be 6")
        if index.root is None:
            return ()

        query_vector = encode_query_to_vector(query)
        heap: List[tuple[float, str, EncodedCandidate]] = []

        def push(item: EncodedCandidate, distance_sq: float) -> None:
            candidate_id = str(item.candidate_id)
            entry = (-distance_sq, candidate_id, item)
            if len(heap) < top_n:
                heapq.heappush(heap, entry)
                return

            worst_distance_sq = -heap[0][0]
            worst_candidate_id = heap[0][1]
            if _candidate_sort_key(distance_sq, candidate_id) < _candidate_sort_key(
                worst_distance_sq, worst_candidate_id
            ):
                heapq.heapreplace(heap, entry)

        def walk(node: KDTreeNode | None) -> None:
            if node is None:
                return

            axis = node.axis
            distance_sq = _distance_squared(query_vector, node.item.vector)
            push(node.item, distance_sq)

            diff = query_vector[axis] - node.item.vector[axis]
            near, far = (
                (node.left, node.right) if diff <= 0 else (node.right, node.left)
            )

            walk(near)

            if len(heap) < top_n:
                walk(far)
                return

            plane_distance_sq = diff * diff
            worst_distance_sq = -heap[0][0]
            if plane_distance_sq <= worst_distance_sq:
                walk(far)

        walk(index.root)

        ordered = sorted(
            (
                NearestCandidate(
                    candidate_id=item.candidate_id,
                    strategy_ref=item.strategy_ref,
                    distance=math.sqrt(-distance_sq),
                    tie_break_key=item.candidate_id,
                )
                for distance_sq, _, item in heap
            ),
            key=lambda candidate: (candidate.distance, str(candidate.tie_break_key)),
        )
        return tuple(ordered)
