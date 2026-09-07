/**
 * Phase 2B — EXPERIMENTAL angle-ratio K(q) spin calibration SSOT.
 *
 * Angle ratio q is NOT an incidence angle in degrees.
 * q = |Frame aim B longitudinal − physical Rail hit H longitudinal|
 *   (same cushion-parallel axis; NOT Frame↔Rail normal offset 2.25)
 *
 * K scales existing signed spin magnitude only (common stage after R0/R1b base):
 *   finalθ = baseθ + rawSpin × K(q)
 * Does NOT alter R1b / R0 base geometry. tip=0 ⇒ effective spin 0.
 *
 * Coefficients are provisional — not confirmed real-table constants.
 */

export type AngleRatioCalibrationPoint = {
  /** Longitudinal |B∥ − H∥| (geometry units, not sys). */
  ratio: number;
  /** Dimensionless magnitude scale for existing spin correction. */
  k: number;
};

/**
 * EXPERIMENTAL stand-in: 기준 각비 ~3 → K=1; 각비 ~6 → K=0.50.
 * Real-table validation may replace numbers only — keep this single SSOT.
 */
export const ANGLE_RATIO_K_EXPERIMENTAL: readonly AngleRatioCalibrationPoint[] = [
  { ratio: 3.0, k: 1.0 },
  { ratio: 6.0, k: 0.5 },
] as const;

export const ANGLE_RATIO_K_FALLBACK = 1.0;

/** Status marker — never document these as confirmed physics constants. */
export const ANGLE_RATIO_K_STATUS = "EXPERIMENTAL" as const;

/**
 * Piecewise-linear K(q) with end clamps (no extrapolation).
 * q < 3 → K=1.00; q > 6 → K=0.50; invalid → ANGLE_RATIO_K_FALLBACK (1.0).
 */
export function resolveAngleRatioK(
  angleRatio: number,
  table: readonly AngleRatioCalibrationPoint[] = ANGLE_RATIO_K_EXPERIMENTAL
): number {
  if (
    typeof angleRatio !== "number" ||
    !Number.isFinite(angleRatio) ||
    table.length === 0
  ) {
    return ANGLE_RATIO_K_FALLBACK;
  }

  const sorted = [...table].sort((a, b) => a.ratio - b.ratio);
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;

  if (angleRatio <= first.ratio) return first.k;
  if (angleRatio >= last.ratio) return last.k;

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i]!;
    const b = sorted[i + 1]!;
    if (angleRatio >= a.ratio && angleRatio <= b.ratio) {
      const span = b.ratio - a.ratio;
      if (span <= 0) return a.k;
      const t = (angleRatio - a.ratio) / span;
      return a.k + t * (b.k - a.k);
    }
  }

  return ANGLE_RATIO_K_FALLBACK;
}
