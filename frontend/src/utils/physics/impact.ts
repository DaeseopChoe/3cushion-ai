// Impact 관련 물리 계산 - ImpactEngine으로 위임
// API 유지: calculateImpact(cue, target, CO_fg, C1_fg, thicknessStr, pattern, BALL_DIAMETER_RG, BALL_RADIUS_RG)

import {
  computeImpactFromDisplayThickness,
  type PhysicsScale,
  type Point,
  type Side,
} from "./ImpactEngine";

function guessSideFromPattern(pattern?: string): Side {
  if (!pattern) return 1;
  if (pattern.includes("좌")) return 1;
  if (pattern.includes("우")) return -1;
  return 1;
}

export function calculateImpact(
  cue: Point | null,
  target: Point | null,
  _CO_fg: { x: number; y: number },
  _C1_fg: { x: number; y: number },
  thicknessStr: string,
  pattern: string,
  BALL_DIAMETER_RG: number,
  BALL_RADIUS_RG: number
): Point | null {
  const scale: PhysicsScale = {
    BALL_DIAMETER_RG,
    BALL_RADIUS_RG,
  };

  const sideHint = guessSideFromPattern(pattern);

  const solved = computeImpactFromDisplayThickness(
    cue,
    target,
    thicknessStr || "8/8",
    sideHint,
    scale
  );

  return solved?.impactBall ?? null;
}
