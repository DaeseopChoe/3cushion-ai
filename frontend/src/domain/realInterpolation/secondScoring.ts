/**
 * Second Scoring Gate (D4-A) — query.second vs ordered secondSet polyline.
 */

import type { Point } from "../positionSearchEngine";
import { minDistanceToPolyline } from "./geometryMath";
import { SECOND_SCORE_TOLERANCE_RG } from "./policy";

export function passesSecondScoringGate(
  querySecond: Point,
  secondSet: Point[],
  toleranceRg: number = SECOND_SCORE_TOLERANCE_RG
): { pass: boolean; dScore: number } {
  if (!secondSet || secondSet.length === 0) {
    return { pass: false, dScore: Number.POSITIVE_INFINITY };
  }
  const dScore = minDistanceToPolyline(querySecond, secondSet);
  return { pass: dScore <= toleranceRg, dScore };
}
