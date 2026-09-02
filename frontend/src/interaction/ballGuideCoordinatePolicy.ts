import type { BallGuideAxis, BallGuideState } from "../hooks/useBallGuide";
import { clampBallGuideAxis } from "../hooks/useBallGuide";
import { ballGuideFineStepDeltaRg } from "./ballGuideInteractionPolicy";

/** Normalize to one decimal Rg without float artifacts (0.1 nudge path). */
export function normalizeRgTenth(value: number): number {
  if (!Number.isFinite(value)) return value;
  return Math.round(value * 10) / 10;
}

/** User-facing 1-decimal Rg label (display only). */
export function formatRgCoordinateDisplay(value: number): string {
  if (!Number.isFinite(value)) return "";
  return normalizeRgTenth(value).toFixed(1);
}

export function nudgeBallGuideAxisValue(
  axis: BallGuideAxis,
  current: number,
  delta: number
): number {
  return normalizeRgTenth(clampBallGuideAxis(axis, current + delta));
}

export type GuideCoordinateDisplaySource = {
  x: number;
  y: number;
  mode: "guide" | "ball";
};

export function resolveGuideCoordinateDisplay(
  guideState: BallGuideState,
  selectedBallId: string | null,
  ballCenter: { x: number; y: number }
): GuideCoordinateDisplaySource {
  const guideActiveForBall =
    guideState.active &&
    guideState.ballId === selectedBallId &&
    Number.isFinite(guideState.verticalX) &&
    Number.isFinite(guideState.horizontalY);

  if (guideActiveForBall) {
    return {
      x: guideState.verticalX as number,
      y: guideState.horizontalY as number,
      mode: "guide",
    };
  }

  return {
    x: ballCenter.x,
    y: ballCenter.y,
    mode: "ball",
  };
}

export function applyGuideTriangleFineNudge(
  guideState: BallGuideState,
  direction: "up" | "down" | "left" | "right"
): BallGuideState {
  if (
    !guideState.active ||
    !Number.isFinite(guideState.horizontalY) ||
    !Number.isFinite(guideState.verticalX)
  ) {
    return guideState;
  }

  const delta = ballGuideFineStepDeltaRg(direction);
  if (direction === "left" || direction === "right") {
    return {
      ...guideState,
      verticalX: nudgeBallGuideAxisValue(
        "vertical",
        guideState.verticalX,
        delta
      ),
    };
  }

  return {
    ...guideState,
    horizontalY: nudgeBallGuideAxisValue(
      "horizontal",
      guideState.horizontalY,
      delta
    ),
  };
}
