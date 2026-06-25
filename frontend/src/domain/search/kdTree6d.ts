/**
 * KD-Tree 6D - 포지션 검색용
 * Balls(cue,target,second)를 6차원 포인트로 변환하여 nearest 탐색
 */

export type Point6D = [number, number, number, number, number, number];

export type Ball3Like = {
  cue: { x: number; y: number };
  target: { x: number; y: number };
  second: { x: number; y: number };
};

export function ballsToPoint6D(b: Ball3Like): Point6D {
  return [
    b.cue.x,
    b.cue.y,
    b.target.x,
    b.target.y,
    b.second.x,
    b.second.y,
  ];
}

export function dist2_6d(a: Point6D, b: Point6D): number {
  let s = 0;
  for (let i = 0; i < 6; i++) {
    const d = a[i] - b[i];
    s += d * d;
  }
  return s;
}

// ---------- KD-Tree Node ----------
export type KDNode = {
  point: Point6D;
  positionId: string;
  axis: number; // 0..5
  left?: KDNode;
  right?: KDNode;
};

export type KDLeaf = {
  point: Point6D;
  positionId: string;
};

function buildNode(
  items: Array<{ point: Point6D; positionId: string }>,
  depth: number
): KDNode | undefined {
  if (items.length === 0) return undefined;
  if (items.length === 1) {
    return {
      point: items[0].point,
      positionId: items[0].positionId,
      axis: depth % 6,
      left: undefined,
      right: undefined,
    };
  }

  const axis = depth % 6;
  const sorted = [...items].sort((a, b) => a.point[axis] - b.point[axis]);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted[mid];

  const leftItems = sorted.slice(0, mid);
  const rightItems = sorted.slice(mid + 1);

  return {
    point: median.point,
    positionId: median.positionId,
    axis,
    left: leftItems.length > 0 ? buildNode(leftItems, depth + 1) : undefined,
    right: rightItems.length > 0 ? buildNode(rightItems, depth + 1) : undefined,
  };
}

/**
 * KD-Tree 빌드
 */
export function buildKDTree(
  items: Array<{ point: Point6D; positionId: string }>
): KDNode | undefined {
  if (items.length === 0) return undefined;
  return buildNode(items, 0);
}

export type NearestResult = {
  positionId: string;
  point: Point6D;
  dist2: number;
};

/**
 * KD-Tree nearest search (표준 백트래킹)
 */
export function nearest(
  root: KDNode | undefined,
  queryPoint: Point6D,
  maxDist2?: number
): NearestResult | null {
  if (!root) return null;

  const bestRef = { current: null as NearestResult | null };

  function search(node: KDNode | undefined, depth: number): void {
    if (!node) return;

    const d2 = dist2_6d(queryPoint, node.point);

    if (!bestRef.current || d2 < bestRef.current.dist2) {
      bestRef.current = {
        positionId: node.positionId,
        point: node.point,
        dist2: d2,
      };
    }

    const axis = node.axis;
    const diff = queryPoint[axis] - node.point[axis];
    const [near, far] = diff <= 0 ? [node.left, node.right] : [node.right, node.left];

    search(near, depth + 1);

    const planeDist2 = diff * diff;
    if (bestRef.current && planeDist2 < bestRef.current.dist2) {
      search(far, depth + 1);
    }
  }

  search(root, 0);

  const result = bestRef.current;
  if (maxDist2 != null && result !== null && result.dist2 > maxDist2) {
    return null;
  }
  return result;
}
