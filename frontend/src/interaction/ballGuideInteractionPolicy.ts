import type {
  BallGuideAxis,
  BallGuideState,
} from "../hooks/useBallGuide";

export type BallGuideHandleSide = "start" | "end";

export type BallGuideHandleHit = {
  axis: BallGuideAxis;
  side: BallGuideHandleSide;
};

export const BALL_GUIDE_HANDLE_HIT_RADIUS_RG = 1.5;
export const GUIDE_FINE_STEP_RG = 0.1;
export const GUIDE_ALT_DRAG_FACTOR = 0.1;
export const BALL_GUIDE_ARROW_OFFSET_RG = 2.5;
export const BALL_GUIDE_ARROW_HIT_RADIUS_RG = 0.9;
export const BALL_GUIDE_SNAP_ACTION_OFFSET_RG = 3;
export const BALL_GUIDE_SNAP_ACTION_HIT_RADIUS_RG = 1.6;
export const BALL_GUIDE_SNAP_ACTION_EDGE_INSET_RG = 1.5;

export type BallGuideArrowDirection = "up" | "down" | "left" | "right";

export type BallGuideArrow = {
  axis: BallGuideAxis;
  direction: BallGuideArrowDirection;
  point: PointRg;
};

type PointRg = { x: number; y: number };

export type BallGuideSnapAction = {
  point: PointRg;
  target: PointRg;
};

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

export function getBallGuideArrowDescriptors(
  guideState: BallGuideState | null | undefined,
  tableWidthRg: number,
  tableHeightRg: number
): BallGuideArrow[] {
  if (
    !guideState?.active ||
    !Number.isFinite(guideState.horizontalY) ||
    !Number.isFinite(guideState.verticalX) ||
    !Number.isFinite(tableWidthRg) ||
    !Number.isFinite(tableHeightRg)
  ) {
    return [];
  }

  const offset = BALL_GUIDE_ARROW_OFFSET_RG;
  const perpendicularOffset = 1;
  const horizontalArrowUpY = Math.min(
    tableHeightRg - 0.5,
    guideState.horizontalY + perpendicularOffset
  );
  const horizontalArrowDownY = Math.max(
    0.5,
    guideState.horizontalY - perpendicularOffset
  );
  const verticalArrowLeftX = Math.max(
    0.5,
    guideState.verticalX - perpendicularOffset
  );
  const verticalArrowRightX = Math.min(
    tableWidthRg - 0.5,
    guideState.verticalX + perpendicularOffset
  );
  return [
    {
      axis: "horizontal",
      direction: "up",
      point: {
        x: offset,
        y: horizontalArrowUpY,
      },
    },
    {
      axis: "horizontal",
      direction: "down",
      point: {
        x: offset,
        y: horizontalArrowDownY,
      },
    },
    {
      axis: "vertical",
      direction: "left",
      point: {
        x: verticalArrowLeftX,
        y: tableHeightRg - offset,
      },
    },
    {
      axis: "vertical",
      direction: "right",
      point: {
        x: verticalArrowRightX,
        y: tableHeightRg - offset,
      },
    },
  ];
}

export function resolveBallGuideArrowHit(
  pointerRg: PointRg | null | undefined,
  guideState: BallGuideState | null | undefined,
  tableWidthRg: number,
  tableHeightRg: number,
  hitRadiusRg: number = BALL_GUIDE_ARROW_HIT_RADIUS_RG
): BallGuideArrow | null {
  if (
    !isFinitePoint(pointerRg) ||
    !Number.isFinite(hitRadiusRg) ||
    hitRadiusRg < 0
  ) {
    return null;
  }

  const candidates = getBallGuideArrowDescriptors(
    guideState,
    tableWidthRg,
    tableHeightRg
  );
  let closest: BallGuideArrow | null = null;
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

export function ballGuideArrowDeltaRg(
  direction: BallGuideArrowDirection
): number {
  if (direction === "up" || direction === "right") {
    return GUIDE_FINE_STEP_RG;
  }
  return -GUIDE_FINE_STEP_RG;
}
