/**
 * Confidence 0..100 — separate from Hard Gates.
 */

import { clamp01, dist } from "./geometryMath";
import {
  CONFIDENCE_WEIGHT_GEOM,
  CONFIDENCE_WEIGHT_PAIR,
  CONFIDENCE_WEIGHT_SECOND,
  CUE_TARGET_POS_TOLERANCE_RG,
  CUE_TARGET_SHAPE_TOLERANCE_RG,
  SECOND_SCORE_TOLERANCE_RG,
} from "./policy";
import type { MatchType } from "./types";

export function computeConfidence(args: {
  matchType: MatchType;
  dScore: number;
  dCue: number;
  dTarget: number;
  eShape: number;
  lambda?: number;
  nearestCueDist?: number;
}): number {
  if (args.matchType === "exact") return 100;

  const qSecond = clamp01(1 - args.dScore / SECOND_SCORE_TOLERANCE_RG);
  const qPos = clamp01(
    1 - Math.max(args.dCue, args.dTarget) / CUE_TARGET_POS_TOLERANCE_RG
  );
  const qShape = clamp01(1 - args.eShape / CUE_TARGET_SHAPE_TOLERANCE_RG);
  const qGeom = 0.5 * qPos + 0.5 * qShape;

  let qPair = 0;
  if (args.matchType === "interpolated" && args.lambda != null) {
    qPair = clamp01(1 - 2 * Math.abs(args.lambda - 0.5));
  } else {
    const nd =
      args.nearestCueDist ?? Math.max(args.dCue, args.dTarget);
    qPair = clamp01(1 - nd / CUE_TARGET_POS_TOLERANCE_RG);
  }

  const raw =
    CONFIDENCE_WEIGHT_SECOND * qSecond +
    CONFIDENCE_WEIGHT_GEOM * qGeom +
    CONFIDENCE_WEIGHT_PAIR * qPair;

  const conf = Math.round(100 * raw);
  if (!Number.isFinite(conf)) return 0;
  return Math.max(0, Math.min(100, conf));
}

export { dist };
