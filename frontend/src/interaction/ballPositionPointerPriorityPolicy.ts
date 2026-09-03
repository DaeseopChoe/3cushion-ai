/**
 * Local pointer-priority helpers for ball positioning UX.
 * Interaction layer only — does not change guide/ball geometry SSOT.
 */

export type PointRg = { x: number; y: number };

export type BallHitCandidate = {
  id: string;
  pos: PointRg;
};

export type ResolveClosestBallHitOptions = {
  /** ADMIN FREE impact drag only when true. */
  allowImpactDrag?: boolean;
};

function isFinitePoint(point: PointRg | null | undefined): boolean {
  return (
    !!point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y)
  );
}

/**
 * Closest ball within hitRadiusRg.
 * Mirrors App.jsx ball pick rules (target_center alias, impact gate).
 */
export function resolveClosestBallHit(
  pointerRg: PointRg | null | undefined,
  balls: Record<string, PointRg | null | undefined>,
  hitRadiusRg: number,
  options: ResolveClosestBallHitOptions = {}
): BallHitCandidate | null {
  if (
    !isFinitePoint(pointerRg) ||
    !Number.isFinite(hitRadiusRg) ||
    hitRadiusRg < 0
  ) {
    return null;
  }

  let closest: BallHitCandidate | null = null;
  let minDist = Infinity;

  for (const [ballId, ballPos] of Object.entries(balls)) {
    if (!isFinitePoint(ballPos)) continue;

    let hitId = ballId;
    if (ballId === "target_center") {
      if (balls.target) continue;
      hitId = "target";
    }

    if (hitId === "impact" && !options.allowImpactDrag) continue;

    const dist = Math.hypot(
      pointerRg.x - ballPos.x,
      pointerRg.y - ballPos.y
    );
    if (dist <= hitRadiusRg && dist < minDist) {
      minDist = dist;
      closest = { id: hitId, pos: { x: ballPos.x, y: ballPos.y } };
    }
  }

  return closest;
}

/**
 * Absolute ball-drag priority only inside visual radius (not expanded 5× pick).
 */
export function resolveBallVisualCoreHit(
  pointerRg: PointRg | null | undefined,
  balls: Record<string, PointRg | null | undefined>,
  ballVisualRadiusRg: number,
  options: ResolveClosestBallHitOptions = {}
): BallHitCandidate | null {
  return resolveClosestBallHit(
    pointerRg,
    balls,
    ballVisualRadiusRg,
    options
  );
}

/**
 * When snap and rail-handle both hit the same pointer, snap wins.
 * Triangle vs snap relative order is unchanged by callers.
 */
export function shouldPreferSnapOverRailHandle(
  snapHit: unknown,
  handleHit: unknown
): boolean {
  return snapHit != null && handleHit != null;
}
