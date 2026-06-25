export type Point2 = { x: number; y: number };

export function distancePointToSegment(p: Point2, a: Point2, b: Point2): number {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const ap = { x: p.x - a.x, y: p.y - a.y };

  const abLenSq = ab.x * ab.x + ab.y * ab.y;
  if (abLenSq < 1e-18) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }

  const dot = ap.x * ab.x + ap.y * ab.y;

  let t = dot / abLenSq;
  t = Math.max(0, Math.min(1, t));

  const closest = {
    x: a.x + ab.x * t,
    y: a.y + ab.y * t,
  };

  const dx = p.x - closest.x;
  const dy = p.y - closest.y;

  return Math.hypot(dx, dy);
}

export function isForwardHit(a: Point2, b: Point2, p: Point2): boolean {
  const ab = { x: b.x - a.x, y: b.y - a.y };
  const ap = { x: p.x - a.x, y: p.y - a.y };

  const dot = ab.x * ap.x + ab.y * ap.y;
  return dot > 0;
}

export function isSegmentHitBall(
  a: Point2,
  b: Point2,
  ball: Point2,
  tolerance = 2
): boolean {
  const dist = distancePointToSegment(ball, a, b);
  if (dist > tolerance) return false;

  return isForwardHit(a, b, ball);
}
