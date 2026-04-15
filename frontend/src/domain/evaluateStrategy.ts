/**
 * evaluateStrategy.ts
 * balls + sysInputs → { userImpact, userFinal } 계산
 * adminSaveEngine, positionSearchEngine의 evaluateStrategy 콜백 구현체
 */

import type { Ball3, Point, StrategySignature } from "./positionSearchEngine";
import { calcImpactBall } from "../data/system/calculator";
import { calculateByProfileExpr } from "../utils/systemCalculator";
import {
  computeFinalCoord,
  type ProfileLike,
  type TrackId,
} from "./finalCoordinateEngine";

/** 시스템 프로필 (formula, tables 등) */
export type SystemProfileLike = ProfileLike & {
  formula?: { expr?: string };
};

/** hpT 구조 (T: 두께 문자열) */
export type HptLike = { T?: string } | undefined;

export type EvaluateStrategyInput = {
  balls: Ball3;
  sysInputs: Record<string, number>;
  signature: StrategySignature;
  systemId: string;
  profile: SystemProfileLike;
  anchorsData?: { trajectories?: Record<string, { anchors: { id: string }[] }> };
  hpT?: HptLike;
  trackId?: TrackId;
};

/**
 * balls + sysInputs로 userImpact, userFinal 계산
 * - userImpact: calcImpactBall(cue, target, T)
 * - userFinal: computeFinalCoord (C1_f 보간)
 */
export function evaluateStrategy(
  input: EvaluateStrategyInput
): { userImpact: Point; userFinal: Point } {
  const {
    balls,
    sysInputs,
    systemId,
    profile,
    anchorsData,
    hpT,
    trackId,
  } = input;

  const T = hpT?.T ?? "8/8";

  // ---- userImpact: calcImpactBall ----
  const userImpactRaw = calcImpactBall(balls.cue, balls.target, T);
  const userImpact: Point = userImpactRaw ?? {
    x: balls.target.x,
    y: balls.target.y,
  };

  // ---- C1_f 확정: sysInputs에 없으면 formula로 계산 ----
  let resolvedInputs = { ...sysInputs };
  const hasC1 =
    typeof sysInputs.C1_f === "number" ||
    typeof sysInputs.C1_r === "number";
  if (!hasC1 && profile?.formula?.expr) {
    const computed = calculateByProfileExpr(profile.formula.expr, sysInputs);
    const lhsKey = Object.keys(computed)[0];
    if (lhsKey && typeof computed[lhsKey] === "number") {
      resolvedInputs = { ...sysInputs, [lhsKey]: computed[lhsKey] };
    }
  }

  // ---- userFinal: computeFinalCoord ----
  const userFinalRaw = computeFinalCoord({
    balls,
    sysInputs: resolvedInputs,
    systemId,
    trackId,
    profile,
    anchorsData,
  });
  const userFinal: Point = userFinalRaw ?? {
    x: 40,
    y: 40,
  };

  return { userImpact, userFinal };
}
