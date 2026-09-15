/**
 * SYS slide/draw correction sign ownership.
 *
 * - "authored": admin signed value is SSOT (no abs / no shotType flip)
 * - "legacy" / missing: pre–signed-authoring corpus (abs + shotType flip)
 *
 * 밀림/끌림 = label/domain only; mutual exclusion by non-zero (sign-agnostic).
 */

export type CorrectionSignMode = "legacy" | "authored";

export const CORRECTION_SIGN_MODE_AUTHORED = "authored" as const;
export const CORRECTION_SIGN_MODE_LEGACY = "legacy" as const;

/** Missing / unknown marker → legacy (preserve existing corpus meaning). */
export function resolveCorrectionSignMode(
  corrections: { signMode?: unknown } | null | undefined
): CorrectionSignMode {
  if (corrections?.signMode === CORRECTION_SIGN_MODE_AUTHORED) {
    return CORRECTION_SIGN_MODE_AUTHORED;
  }
  return CORRECTION_SIGN_MODE_LEGACY;
}

export function isAuthoredCorrectionSignMode(
  corrections: { signMode?: unknown } | null | undefined
): boolean {
  return resolveCorrectionSignMode(corrections) === CORRECTION_SIGN_MODE_AUTHORED;
}

/** Persist only explicit authored; omit legacy so old JSON stays unmarked. */
export function persistCorrectionSignMode(
  mode: CorrectionSignMode | null | undefined
): { signMode?: typeof CORRECTION_SIGN_MODE_AUTHORED } {
  if (mode === CORRECTION_SIGN_MODE_AUTHORED) {
    return { signMode: CORRECTION_SIGN_MODE_AUTHORED };
  }
  return {};
}

/**
 * Initial overlay mode:
 * - explicit authored → authored
 * - any slide/draw without authored marker → legacy
 * - empty corrections → authored (new entry)
 */
export function resolveInitialCorrectionSignMode(
  corrections: { signMode?: unknown; slide?: unknown; draw?: unknown } | null | undefined
): CorrectionSignMode {
  if (corrections?.signMode === CORRECTION_SIGN_MODE_AUTHORED) {
    return CORRECTION_SIGN_MODE_AUTHORED;
  }
  const s = Number(corrections?.slide);
  const d = Number(corrections?.draw);
  const slide = Number.isFinite(s) ? s : 0;
  const draw = Number.isFinite(d) ? d : 0;
  if (slide !== 0 || draw !== 0) return CORRECTION_SIGN_MODE_LEGACY;
  return CORRECTION_SIGN_MODE_AUTHORED;
}

export function correctionMagnitude(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n === 0) return 0;
  return Math.abs(n);
}

export function correctionIsNegative(value: unknown): boolean {
  const n = Number(value);
  return Number.isFinite(n) && n < 0;
}

/** Build signed value from magnitude + [-] toggle (0 stays 0). */
export function applyCorrectionSign(magnitude: unknown, negative: boolean): number {
  const mag = correctionMagnitude(magnitude);
  if (mag === 0) return 0;
  return negative ? -mag : mag;
}

/**
 * Mutual exclusion by non-zero (sign-agnostic).
 * Prefer the field being written (`prefer`).
 */
export function exclusiveSlideDraw(
  slide: number,
  draw: number,
  prefer: "slide" | "draw"
): { slide: number; draw: number } {
  const s = Number.isFinite(slide) ? slide : 0;
  const d = Number.isFinite(draw) ? draw : 0;
  if (s !== 0 && d !== 0) {
    return prefer === "slide" ? { slide: s, draw: 0 } : { slide: 0, draw: d };
  }
  return { slide: s, draw: d };
}

/**
 * Normalize slide/draw for hydrate / display prep.
 * authored: preserve signed values; mutual exclusion by non-zero.
 * legacy: slide≥0, draw≤0; draw non-zero clears slide.
 */
export function normalizeSlideDrawCorrections(
  corrections: Record<string, unknown> | null | undefined
): {
  slide: number;
  draw: number;
  signMode?: typeof CORRECTION_SIGN_MODE_AUTHORED;
} {
  if (!corrections || typeof corrections !== "object") {
    return { slide: 0, draw: 0 };
  }
  const mode = resolveCorrectionSignMode(corrections);
  const s = Number(corrections.slide);
  const d = Number(corrections.draw);
  let slide = Number.isFinite(s) ? s : 0;
  let draw = Number.isFinite(d) ? d : 0;

  if (mode === CORRECTION_SIGN_MODE_AUTHORED) {
    const exclusive = exclusiveSlideDraw(slide, draw, "draw");
    return {
      slide: exclusive.slide,
      draw: exclusive.draw,
      signMode: CORRECTION_SIGN_MODE_AUTHORED,
    };
  }

  slide = Math.abs(slide);
  if (draw !== 0) draw = -Math.abs(draw);
  if (draw !== 0) slide = 0;
  return { slide, draw };
}
