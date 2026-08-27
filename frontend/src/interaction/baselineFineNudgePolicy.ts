import type { VaryingAxis } from "../domain/trajectory/baselineMarkAxisSnap";

export type BaselineFineNudgeMark = "CO" | "C1";
export type BaselineFineNudgeDirection = "up" | "down" | "left" | "right";
export type BaselineFineNudgePoint = { x: number; y: number };

export type BaselineFineNudgeArrow = {
  mark: BaselineFineNudgeMark;
  axis: VaryingAxis;
  direction: BaselineFineNudgeDirection;
  point: BaselineFineNudgePoint;
};

export const BASELINE_FINE_NUDGE_STEP_RG = 0.1;
export const BASELINE_FINE_NUDGE_OFFSET_RG = 3.5;
export const BASELINE_FINE_NUDGE_HIT_RADIUS_RG = 1.1;

function isFinitePoint(
  point: BaselineFineNudgePoint | null | undefined
): point is BaselineFineNudgePoint {
  return (
    !!point &&
    Number.isFinite(point.x) &&
    Number.isFinite(point.y)
  );
}

export function getBaselineFineNudgeArrowDescriptors(params: {
  mark: BaselineFineNudgeMark;
  coord: BaselineFineNudgePoint | null | undefined;
  axis: VaryingAxis | null | undefined;
}): BaselineFineNudgeArrow[] {
  const { mark, coord, axis } = params;
  if (!isFinitePoint(coord) || (axis !== "x" && axis !== "y")) return [];

  const offset = BASELINE_FINE_NUDGE_OFFSET_RG;
  if (axis === "x") {
    return [
      {
        mark,
        axis,
        direction: "left",
        point: { x: coord.x - offset, y: coord.y },
      },
      {
        mark,
        axis,
        direction: "right",
        point: { x: coord.x + offset, y: coord.y },
      },
    ];
  }

  return [
    {
      mark,
      axis,
      direction: "down",
      point: { x: coord.x, y: coord.y - offset },
    },
    {
      mark,
      axis,
      direction: "up",
      point: { x: coord.x, y: coord.y + offset },
    },
  ];
}

export function getBaselineFineNudgeArrowDelta(
  direction: BaselineFineNudgeDirection
): number {
  return direction === "right" || direction === "up"
    ? BASELINE_FINE_NUDGE_STEP_RG
    : -BASELINE_FINE_NUDGE_STEP_RG;
}

export function resolveBaselineFineNudgeArrowHit(
  pointerRg: BaselineFineNudgePoint | null | undefined,
  arrows: BaselineFineNudgeArrow[],
  hitRadiusRg: number = BASELINE_FINE_NUDGE_HIT_RADIUS_RG
): BaselineFineNudgeArrow | null {
  if (
    !isFinitePoint(pointerRg) ||
    !Number.isFinite(hitRadiusRg) ||
    hitRadiusRg < 0
  ) {
    return null;
  }

  let closest: BaselineFineNudgeArrow | null = null;
  let closestDistance = Infinity;
  for (const arrow of arrows) {
    if (!isFinitePoint(arrow.point)) continue;
    const distance = Math.hypot(
      pointerRg.x - arrow.point.x,
      pointerRg.y - arrow.point.y
    );
    if (distance <= hitRadiusRg && distance < closestDistance) {
      closest = arrow;
      closestDistance = distance;
    }
  }
  return closest;
}
