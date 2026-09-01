/**
 * Test-only helpers for Physical Thickness SSOT regression.
 * Must NOT call computeHptVizGeometry centerDistance or any production overlap formula.
 */

/** Expected semantic thickness fraction n/8 parsed from legacy T string only. */
export function expectedThicknessFractionFromT(T: string): number {
  if (T === "8/8" || T === "BANK") return 1;
  const match = String(T).match(/^([+-]?)(\d+)\/8$/);
  if (!match) {
    throw new Error(`expectedThicknessFractionFromT: unsupported T "${T}"`);
  }
  return parseInt(match[2], 10) / 8;
}

export type CircleOverlapMetrics = {
  diameter: number;
  distance: number;
  overlap: number;
  overlapFraction: number;
};

/**
 * Independent overlap from rendered circle centers and radius.
 * overlap = max(0, diameter - |impactCx - targetCx|)
 */
export function actualOverlapFractionFromCircles(args: {
  targetCx: number;
  impactCx: number;
  radius: number;
}): CircleOverlapMetrics {
  const diameter = 2 * args.radius;
  const distance = Math.abs(args.impactCx - args.targetCx);
  const overlap = Math.max(0, diameter - distance);
  return {
    diameter,
    distance,
    overlap,
    overlapFraction: overlap / diameter,
  };
}

/** Hardcoded D=240 audit reference — not derived from production geometry. */
/**
 * Billiard direction contract (ImpactEngine / formatThickness aligned).
 * +T => White Cue (impact) screen-right of Red Target.
 * -T => White Cue screen-left of Red Target.
 */
export function cueIsScreenRightOfTarget(targetCx: number, impactCx: number): boolean {
  return impactCx > targetCx;
}

export function cueIsScreenLeftOfTarget(targetCx: number, impactCx: number): boolean {
  return impactCx < targetCx;
}

export function billiardDirectionMatchesT(
  T: string,
  targetCx: number,
  impactCx: number
): boolean {
  if (T === "8/8" || T === "BANK") return targetCx === impactCx;
  if (T.startsWith("+")) return cueIsScreenRightOfTarget(targetCx, impactCx);
  if (T.startsWith("-")) return cueIsScreenLeftOfTarget(targetCx, impactCx);
  return false;
}

export const PHYSICAL_THICKNESS_AUDIT_D240: ReadonlyArray<{
  n: number;
  overlapPx: number;
  centerSeparationPx: number;
}> = [
  { n: 1, overlapPx: 30, centerSeparationPx: 210 },
  { n: 2, overlapPx: 60, centerSeparationPx: 180 },
  { n: 3, overlapPx: 90, centerSeparationPx: 150 },
  { n: 4, overlapPx: 120, centerSeparationPx: 120 },
  { n: 5, overlapPx: 150, centerSeparationPx: 90 },
  { n: 6, overlapPx: 180, centerSeparationPx: 60 },
  { n: 7, overlapPx: 210, centerSeparationPx: 30 },
  { n: 8, overlapPx: 240, centerSeparationPx: 0 },
];
