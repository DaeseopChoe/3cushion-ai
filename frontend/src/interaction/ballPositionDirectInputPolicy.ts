import { BALL_GUIDE_AXIS_BOUNDS } from "../hooks/useBallGuide";

export const BALL_CENTER_X_BOUNDS = { min: 0.5, max: 79.5 } as const;
export const BALL_CENTER_Y_BOUNDS = { min: 0.5, max: 39.5 } as const;

export type BallCenterRg = { x: number; y: number };
export type GuideIntersectionRg = {
  verticalX: number;
  horizontalY: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Parse a single coordinate field; empty/invalid → null (caller keeps prior value). */
export function parseCoordinateInput(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed)) return null;
  return parsed;
}

export function clampBallCenterRg(
  x: number,
  y: number
): BallCenterRg | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    x: clamp(x, BALL_CENTER_X_BOUNDS.min, BALL_CENTER_X_BOUNDS.max),
    y: clamp(y, BALL_CENTER_Y_BOUNDS.min, BALL_CENTER_Y_BOUNDS.max),
  };
}

export function clampGuideIntersectionRg(
  x: number,
  y: number
): GuideIntersectionRg | null {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return {
    verticalX: clamp(
      x,
      BALL_GUIDE_AXIS_BOUNDS.vertical.min,
      BALL_GUIDE_AXIS_BOUNDS.vertical.max
    ),
    horizontalY: clamp(
      y,
      BALL_GUIDE_AXIS_BOUNDS.horizontal.min,
      BALL_GUIDE_AXIS_BOUNDS.horizontal.max
    ),
  };
}

export function resolveDirectInputApply(
  rawX: string,
  rawY: string,
  fallback: BallCenterRg
): BallCenterRg | null {
  const parsedX = parseCoordinateInput(rawX);
  const parsedY = parseCoordinateInput(rawY);
  if (parsedX == null || parsedY == null) return null;
  return clampBallCenterRg(parsedX, parsedY) ?? {
    x: clamp(fallback.x, BALL_CENTER_X_BOUNDS.min, BALL_CENTER_X_BOUNDS.max),
    y: clamp(fallback.y, BALL_CENTER_Y_BOUNDS.min, BALL_CENTER_Y_BOUNDS.max),
  };
}

export function resolveGuideDirectInputApply(
  rawX: string,
  rawY: string,
  fallback: BallCenterRg
): GuideIntersectionRg | null {
  const parsedX = parseCoordinateInput(rawX);
  const parsedY = parseCoordinateInput(rawY);
  if (parsedX == null || parsedY == null) return null;
  return (
    clampGuideIntersectionRg(parsedX, parsedY) ?? {
      verticalX: clamp(
        fallback.x,
        BALL_GUIDE_AXIS_BOUNDS.vertical.min,
        BALL_GUIDE_AXIS_BOUNDS.vertical.max
      ),
      horizontalY: clamp(
        fallback.y,
        BALL_GUIDE_AXIS_BOUNDS.horizontal.min,
        BALL_GUIDE_AXIS_BOUNDS.horizontal.max
      ),
    }
  );
}
