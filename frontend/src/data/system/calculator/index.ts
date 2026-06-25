/**
 * 타겟볼 기준 임팩트볼·두께 관련 계산
 * - UI/Controller 레이어에서 분리된 순수 계산 모듈
 * - ImpactEngine으로 위임
 */

import {
  computeImpactFromLegacyT,
  DEFAULT_SCALE,
  type Point as ImpactPoint,
} from "../../../utils/physics/ImpactEngine";

export type { Point } from "./types";

export function calcImpactBall(
  cue: ImpactPoint | null,
  target: ImpactPoint | null,
  T: string
): ImpactPoint | null {
  const result = computeImpactFromLegacyT(cue, target, T, DEFAULT_SCALE);
  return result?.impactBall ?? null;
}
