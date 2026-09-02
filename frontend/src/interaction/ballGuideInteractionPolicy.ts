import type {
  BallGuideAxis,
  BallGuideState,
} from "../hooks/useBallGuide";

export type BallGuideHandleSide = "start" | "end";

export type BallGuideHandleHit = {
  axis: BallGuideAxis;
  side: BallGuideHandleSide;
};

export const BALL_GUIDE_HANDLE_HIT_RADIUS_RG = 3.0;
/** Coarse pointer (touch) — 2× legacy fine radius (~80px at SCALE 10). */
export const BALL_GUIDE_HANDLE_HIT_RADIUS_RG_COARSE = 8.0;
/** End-handle visual radius in Rg (8px at SCALE 10; legacy was 4px). */
export const BALL_GUIDE_HANDLE_VISUAL_RADIUS_RG = 0.8;
export const GUIDE_FINE_STEP_RG = 0.1;
export const GUIDE_ALT_DRAG_FACTOR = 0.1;
/** Legacy arrow placement — not used by spaced dual-triangle controls. */
export const BALL_GUIDE_ARROW_OFFSET_RG = 2.5;
/** Distance from snap-action center to fine-nudge triangle center (Rg). */
export const BALL_GUIDE_TRIANGLE_OFFSET_RG = 6.5;
/** Triangle visual half-extent in Rg (~12px at SCALE 10). */
export const BALL_GUIDE_TRIANGLE_VISUAL_HALF_RG = 1.2;
export const BALL_GUIDE_TRIANGLE_HIT_RADIUS_RG = 2.2;
/** Coarse pointer triangle touch target (~44px at SCALE 10). */
export const BALL_GUIDE_TRIANGLE_HIT_RADIUS_RG_COARSE = 4.0;
export const BALL_GUIDE_SNAP_ACTION_OFFSET_RG = 3;
export const BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG = 1.6;
/** Coarse pointer snap confirm touch target (~28px at SCALE 10). */
export const BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG_COARSE = 2.8;
export const BALL_GUIDE_SNAP_ACTION_EDGE_INSET_RG = 1.5;

export type BallGuideTriangleDirection = "up" | "down" | "left" | "right";

export type BallGuideTriangle = {
  axis: BallGuideAxis;
  direction: BallGuideTriangleDirection;
  point: PointRg;
};

/** @deprecated Use BallGuideTriangleDirection */
export type BallGuideArrowDirection = BallGuideTriangleDirection;

/** @deprecated Use BallGuideTriangle */
export type BallGuideArrow = BallGuideTriangle;

type PointRg = { x: number; y: number };

export type BallGuideSnapAction = {
  point: PointRg;
  target: PointRg;
};

export type BallGuideHitRadii = {
  handleHitRadiusRg: number;
  triangleHitRadiusRg: number;
  snapHitRadiusRg: number;
};

/** Fine (mouse) vs coarse (touch) hit radii. */
export function resolveBallGuideHitRadii(
  isCoarsePointer: boolean
): BallGuideHitRadii {
  if (isCoarsePointer) {
    return {
      handleHitRadiusRg: BALL_GUIDE_HANDLE_HIT_RADIUS_RG_COARSE,
      triangleHitRadiusRg: BALL_GUIDE_TRIANGLE_HIT_RADIUS_RG_COARSE,
      snapHitRadiusRg: BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG_COARSE,
    };
  }
  return {
    handleHitRadiusRg: BALL_GUIDE_HANDLE_HIT_RADIUS_RG,
    triangleHitRadiusRg: BALL_GUIDE_TRIANGLE_HIT_RADIUS_RG,
    snapHitRadiusRg: BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG,
  };
}

export function isCoarsePointerEnvironment(): boolean {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

function isFinitePoint(point: PointRg | null | undefined): boolean {
  return (
    !!point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y)
  );
}

function clampPresentationCoordinate(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export function getBallGuideSnapAction(
  guideState: BallGuideState | null | undefined,
  tableWidthRg: number,
  tableHeightRg: number
): BallGuideSnapAction | null {
  if (
    !guideState?.active ||
    !guideState.ballId ||
    !Number.isFinite(guideState.horizontalY) ||
    !Number.isFinite(guideState.verticalX) ||
    !Number.isFinite(tableWidthRg) ||
    !Number.isFinite(tableHeightRg) ||
    tableWidthRg <= 1 ||
    tableHeightRg <= 1
  ) {
    return null;
  }

  const target = {
    x: guideState.verticalX,
    y: guideState.horizontalY,
  };
  const offset = BALL_GUIDE_SNAP_ACTION_OFFSET_RG;
  const edgeInset = BALL_GUIDE_SNAP_ACTION_EDGE_INSET_RG;
  return {
    target,
    point: {
      x: clampPresentationCoordinate(
        target.x + offset,
        edgeInset,
        tableWidthRg - edgeInset
      ),
      y: clampPresentationCoordinate(
        target.y + offset,
        edgeInset,
        tableHeightRg - edgeInset
      ),
    },
  };
}

export function resolveBallGuideHandleHit(
  pointerRg: PointRg | null | undefined,
  guideState: BallGuideState | null | undefined,
  tableWidthRg: number,
  tableHeightRg: number,
  hitRadiusRg: number = BALL_GUIDE_HANDLE_HIT_RADIUS_RG
): BallGuideHandleHit | null {
  if (
    !isFinitePoint(pointerRg) ||
    !guideState?.active ||
    !Number.isFinite(guideState.horizontalY) ||
    !Number.isFinite(guideState.verticalX) ||
    !Number.isFinite(tableWidthRg) ||
    !Number.isFinite(tableHeightRg) ||
    !Number.isFinite(hitRadiusRg) ||
    hitRadiusRg < 0
  ) {
    return null;
  }

  const candidates: Array<{
    hit: BallGuideHandleHit;
    point: PointRg;
  }> = [
    {
      hit: { axis: "horizontal", side: "start" },
      point: { x: 0, y: guideState.horizontalY },
    },
    {
      hit: { axis: "horizontal", side: "end" },
      point: { x: tableWidthRg, y: guideState.horizontalY },
    },
    {
      hit: { axis: "vertical", side: "start" },
      point: { x: guideState.verticalX, y: tableHeightRg },
    },
    {
      hit: { axis: "vertical", side: "end" },
      point: { x: guideState.verticalX, y: 0 },
    },
  ];

  let closest: BallGuideHandleHit | null = null;
  let closestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = Math.hypot(
      pointerRg.x - candidate.point.x,
      pointerRg.y - candidate.point.y
    );
    if (distance <= hitRadiusRg && distance < closestDistance) {
      closest = candidate.hit;
      closestDistance = distance;
    }
  }
  return closest;
}

export function getBallGuideTriangleDescriptors(
  guideState: BallGuideState | null | undefined,
  tableWidthRg: number,
  tableHeightRg: number
): BallGuideTriangle[] {
  if (
    !guideState?.active ||
    !Number.isFinite(guideState.horizontalY) ||
    !Number.isFinite(guideState.verticalX)
  ) {
    return [];
  }

  const snap = getBallGuideSnapAction(
    guideState,
    tableWidthRg,
    tableHeightRg
  );
  if (!snap) return [];

  const offset = BALL_GUIDE_TRIANGLE_OFFSET_RG;
  const { x: sx, y: sy } = snap.point;

  return [
    {
      axis: "horizontal",
      direction: "up",
      point: { x: sx, y: sy + offset },
    },
    {
      axis: "horizontal",
      direction: "down",
      point: { x: sx, y: sy - offset },
    },
    {
      axis: "vertical",
      direction: "left",
      point: { x: sx - offset, y: sy },
    },
    {
      axis: "vertical",
      direction: "right",
      point: { x: sx + offset, y: sy },
    },
  ];
}

/** @deprecated Use getBallGuideTriangleDescriptors */
export const getBallGuideArrowDescriptors = getBallGuideTriangleDescriptors;

export function resolveBallGuideTriangleHit(
  pointerRg: PointRg | null | undefined,
  guideState: BallGuideState | null | undefined,
  tableWidthRg: number,
  tableHeightRg: number,
  hitRadiusRg: number = BALL_GUIDE_TRIANGLE_HIT_RADIUS_RG
): BallGuideTriangle | null {
  if (
    !isFinitePoint(pointerRg) ||
    !Number.isFinite(hitRadiusRg) ||
    hitRadiusRg < 0
  ) {
    return null;
  }

  const candidates = getBallGuideTriangleDescriptors(
    guideState,
    tableWidthRg,
    tableHeightRg
  );
  let closest: BallGuideTriangle | null = null;
  let closestDistance = Infinity;
  for (const candidate of candidates) {
    const distance = Math.hypot(
      pointerRg.x - candidate.point.x,
      pointerRg.y - candidate.point.y
    );
    if (distance <= hitRadiusRg && distance < closestDistance) {
      closest = candidate;
      closestDistance = distance;
    }
  }
  return closest;
}

/** @deprecated Use resolveBallGuideTriangleHit */
export const resolveBallGuideArrowHit = resolveBallGuideTriangleHit;

export function resolveBallGuideSnapActionHit(
  pointerRg: PointRg | null | undefined,
  guideState: BallGuideState | null | undefined,
  tableWidthRg: number,
  tableHeightRg: number,
  hitRadiusRg: number = BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG
): BallGuideSnapAction | null {
  if (
    !isFinitePoint(pointerRg) ||
    !Number.isFinite(hitRadiusRg) ||
    hitRadiusRg < 0
  ) {
    return null;
  }

  const action = getBallGuideSnapAction(
    guideState,
    tableWidthRg,
    tableHeightRg
  );
  if (!action) return null;

  return Math.hypot(
    pointerRg.x - action.point.x,
    pointerRg.y - action.point.y
  ) <= hitRadiusRg
    ? action
    : null;
}

export function ballGuideFineStepDeltaRg(
  direction: BallGuideTriangleDirection
): number {
  if (direction === "up" || direction === "right") {
    return GUIDE_FINE_STEP_RG;
  }
  return -GUIDE_FINE_STEP_RG;
}

/** @deprecated Use ballGuideFineStepDeltaRg */
export const ballGuideArrowDeltaRg = ballGuideFineStepDeltaRg;

export function getBallGuideTriangleSpacingMetrics() {
  return {
    triangleOffsetFromSnapCenterRg: BALL_GUIDE_TRIANGLE_OFFSET_RG,
    triangleVisualHalfRg: BALL_GUIDE_TRIANGLE_VISUAL_HALF_RG,
    triangleCenterSeparationRg: BALL_GUIDE_TRIANGLE_OFFSET_RG * 2,
    snapActionOffsetRg: BALL_GUIDE_SNAP_ACTION_OFFSET_RG,
    triangleHitRadiusRg: BALL_GUIDE_TRIANGLE_HIT_RADIUS_RG,
    triangleHitRadiusCoarseRg: BALL_GUIDE_TRIANGLE_HIT_RADIUS_RG_COARSE,
    snapHitRadiusRg: BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG,
    snapHitRadiusCoarseRg: BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG_COARSE,
    handleVisualRadiusRg: BALL_GUIDE_HANDLE_VISUAL_RADIUS_RG,
    handleHitRadiusRg: BALL_GUIDE_HANDLE_HIT_RADIUS_RG,
    handleHitRadiusCoarseRg: BALL_GUIDE_HANDLE_HIT_RADIUS_RG_COARSE,
    legacyHandleVisualRadiusRg: 0.4,
    legacyHandleHitRadiusRg: 1.5,
    legacyHandleHitRadiusCoarseRg: 4.0,
  };
}
