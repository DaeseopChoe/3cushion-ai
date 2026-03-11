/**
 * calibrationEngine.ts
 * Impact pivot 기준 CO→C1 라인 보정
 * SYS 입력 후 자동 보정용
 */

import type { Point } from "../utils/geometry/line";
import { lineToRailIntersections } from "../utils/geometry/rail";
import { calculateImpact } from "../utils/physics/impact";

export interface CalibrationInput {
  cue: Point | null;
  target: Point | null;

  CO_fg: Point | null;
  C1_fg: Point | null;

  thickness: string;
  pattern?: string;

  BALL_DIAMETER_RG: number;
  BALL_RADIUS_RG: number;
}

export interface CalibrationResult {
  CO_corrected: Point | null;
  C1_corrected: Point | null;
  impact: Point | null;
}

/**
 * impact pivot 기준으로 CO→C1 라인 재계산
 * impact → target 방향 직선의 레일 교점 반환
 */
export function calibrateTrajectory(
  input: CalibrationInput
): CalibrationResult {
  const {
    cue,
    target,
    CO_fg,
    C1_fg,
    thickness,
    pattern,
    BALL_DIAMETER_RG,
    BALL_RADIUS_RG,
  } = input;

  if (!cue || !target || !CO_fg || !C1_fg) {
    return { CO_corrected: CO_fg, C1_corrected: C1_fg, impact: null };
  }

  const impact = calculateImpact(
    cue,
    target,
    CO_fg,
    C1_fg,
    thickness,
    pattern || "",
    BALL_DIAMETER_RG,
    BALL_RADIUS_RG
  );

  if (!impact) {
    return { CO_corrected: CO_fg, C1_corrected: C1_fg, impact: null };
  }

  // impact → target 방향 벡터 (직선 연장)
  const dx = target.x - impact.x;
  const dy = target.y - impact.y;

  const farPoint = {
    x: impact.x + dx * 100,
    y: impact.y + dy * 100,
  };

  // impact를 pivot으로 한 직선과 레일 교점 계산
  const { CO_rail, C1_rail } = lineToRailIntersections(impact, farPoint);

  return {
    CO_corrected: CO_rail,
    C1_corrected: C1_rail,
    impact,
  };
}
