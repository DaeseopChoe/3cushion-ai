/**
 * Phase 2B — EXPERIMENTAL angle-ratio spin scale (common stage).
 *
 * Independent of R0 vs R1b base-law selection (Phase 2A / P7).
 * Scales existing signed spin only: effectiveSpin = rawSpin × K(q).
 * tip=0 → effectiveSpin = 0 (K multiply bypassed for geometry).
 *
 * Does NOT alter q formula, K table, tip table, or base reflection laws.
 */

import {
  detectRail,
  type Point,
  type Rail,
  type TipInput,
} from "../reflectionEngine";
import {
  ANGLE_RATIO_K_FALLBACK,
  resolveAngleRatioK,
} from "./angleRatioCalibration";
import {
  computeAngleRatio,
  type AngleRatioGeometry,
} from "./angleRatioGeometry";
import { isC1FrameAimProvenance } from "./frameProgressionReflection";

function tipHasNonZeroSpin(tip?: TipInput | null): boolean {
  if (!tip) return false;
  if (typeof tip.count === "number" && tip.count > 0) return true;
  if (
    tip.hp &&
    typeof tip.hp.x === "number" &&
    typeof tip.hp.y === "number" &&
    Math.hypot(tip.hp.x, tip.hp.y) > 1e-12
  ) {
    return true;
  }
  return false;
}

export type AngleRatioSpinReference = {
  c1Aim?: {
    point: Point;
    sysFieldKey?: string;
    valueSpace?: "Fg" | "Rg";
  };
};

export type AngleRatioSpinResult = {
  angleRatioEligible: boolean;
  /** True only when tip≠0 and K actually scaled spin (exactly once). */
  angleRatioApplied: boolean;
  angleRatioApplicationCount: 0 | 1;
  angleRatio: number | null;
  angleRatioK: number | null;
  longitudinalAxis?: AngleRatioGeometry["longitudinalAxis"];
  frameAimLongitudinal?: number;
  railHitLongitudinal?: number;
  frameAimPoint?: Point;
  physicalRailHit?: Point;
  rawSpinCorrectionDeg: number;
  effectiveSpinCorrectionDeg: number;
};

function pointFinite(p: Point | null | undefined): p is Point {
  return (
    !!p &&
    typeof p.x === "number" &&
    typeof p.y === "number" &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y)
  );
}

/**
 * q/K eligibility — C1_f + finite B/H + identifiable rail.
 * Does NOT require P7 / parallel opposite Frame.
 */
export function isAngleRatioSpinEligible(input: {
  reference?: AngleRatioSpinReference | null;
  H: Point;
  c1Rail?: Rail | null;
}): boolean {
  const c1Aim = input.reference?.c1Aim;
  if (!isC1FrameAimProvenance(c1Aim)) return false;
  if (!pointFinite(c1Aim!.point)) return false;
  if (!pointFinite(input.H)) return false;
  const rail = input.c1Rail ?? detectRail(input.H);
  return rail != null;
}

/**
 * Apply K(q) to rawSpin at most once.
 * tip=0 → effectiveSpin = 0 (bypass multiply); q may still be diagnosed when eligible.
 * !eligible → effectiveSpin = rawSpin (legacy full spin).
 */
export function applyAngleRatioSpin(input: {
  reference?: AngleRatioSpinReference | null;
  H: Point;
  c1Rail?: Rail | null;
  tip?: TipInput | null;
  rawSpinCorrectionDeg: number;
}): AngleRatioSpinResult {
  const { H, tip, rawSpinCorrectionDeg } = input;
  const eligible = isAngleRatioSpinEligible({
    reference: input.reference,
    H,
    c1Rail: input.c1Rail,
  });

  const B = input.reference?.c1Aim?.point;
  const rail = input.c1Rail ?? (pointFinite(H) ? detectRail(H) : null);

  let ratioGeom: AngleRatioGeometry | null = null;
  if (eligible && pointFinite(B) && rail) {
    ratioGeom = computeAngleRatio(B, H, rail);
  }

  const angleRatio = ratioGeom?.angleRatio ?? null;
  const angleRatioK =
    !eligible
      ? null
      : angleRatio == null
        ? ANGLE_RATIO_K_FALLBACK
        : resolveAngleRatioK(angleRatio);

  const tipActive = tipHasNonZeroSpin(tip);

  // tip=0: always zero effective spin (Phase 2A freeze).
  if (!tipActive) {
    return {
      angleRatioEligible: eligible,
      angleRatioApplied: false,
      angleRatioApplicationCount: 0,
      angleRatio,
      angleRatioK,
      longitudinalAxis: ratioGeom?.longitudinalAxis,
      frameAimLongitudinal: ratioGeom?.frameAimLongitudinal,
      railHitLongitudinal: ratioGeom?.railHitLongitudinal,
      frameAimPoint: pointFinite(B) ? { x: B.x, y: B.y } : undefined,
      physicalRailHit: pointFinite(H) ? { x: H.x, y: H.y } : undefined,
      rawSpinCorrectionDeg,
      effectiveSpinCorrectionDeg: 0,
    };
  }

  if (eligible && angleRatioK != null) {
    return {
      angleRatioEligible: true,
      angleRatioApplied: true,
      angleRatioApplicationCount: 1,
      angleRatio,
      angleRatioK,
      longitudinalAxis: ratioGeom?.longitudinalAxis,
      frameAimLongitudinal: ratioGeom?.frameAimLongitudinal,
      railHitLongitudinal: ratioGeom?.railHitLongitudinal,
      frameAimPoint: pointFinite(B) ? { x: B.x, y: B.y } : undefined,
      physicalRailHit: { x: H.x, y: H.y },
      rawSpinCorrectionDeg,
      effectiveSpinCorrectionDeg: rawSpinCorrectionDeg * angleRatioK,
    };
  }

  // Ineligible (C1_r / native / invalid): legacy full spin.
  return {
    angleRatioEligible: false,
    angleRatioApplied: false,
    angleRatioApplicationCount: 0,
    angleRatio: null,
    angleRatioK: null,
    rawSpinCorrectionDeg,
    effectiveSpinCorrectionDeg: rawSpinCorrectionDeg,
  };
}
