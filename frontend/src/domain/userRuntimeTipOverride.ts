/**
 * USER runtime tip override for Phase 2B calibration (trajectory only).
 *
 * Persisted / hydrated HPT is never mutated here.
 * Override is an ephemeral tipCount (0–4) layered onto base HPT side/geometry.
 */

export type TipSide = "L" | "R";

export type RuntimeTipInput = {
  count?: number;
  hp?: { x: number; y: number };
  side: TipSide;
};

export type HptTipSource = {
  hit_point?: { x?: number; y?: number } | null;
  hp?: { x?: number; y?: number } | null;
  mode?: string | null;
  tipCount?: number | null;
} | null | undefined;

/** Clamp to integer tipCount 0..4; invalid → null. */
export function clampUserRuntimeTipCount(
  value: unknown
): 0 | 1 | 2 | 3 | 4 | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const n = Math.round(value);
  if (n < 0 || n > 4) return null;
  return n as 0 | 1 | 2 | 3 | 4;
}

function resolveHitPoint(
  hpt: HptTipSource
): { x: number; y: number } | null {
  const hp = hpt?.hit_point ?? hpt?.hp;
  if (!hp || typeof hp.x !== "number" || typeof hp.y !== "number") return null;
  if (!Number.isFinite(hp.x) || !Number.isFinite(hp.y)) return null;
  return { x: hp.x, y: hp.y };
}

/**
 * Same rules as App.jsx currentTip from adminState.hpt (no override).
 */
export function resolveTipFromHpt(hpt: HptTipSource): RuntimeTipInput | null {
  const hp = resolveHitPoint(hpt);
  if (!hp) return null;
  const side: TipSide = hp.x >= 0 ? "R" : "L";
  const mode = hpt?.mode ?? "TIP";
  if (mode === "TIP") {
    const count = Math.max(0, Math.min(4, Math.round(hpt?.tipCount ?? 0)));
    return { count, side };
  }
  return { hp: { x: hp.x, y: hp.y }, side };
}

/**
 * USER experimental tipCount override on top of hydrated HPT.
 * - override == null → identical to resolveTipFromHpt(baseHpt)
 * - override 0..4 → TIP mode { count: override, side from base hit_point }
 * Does not mutate baseHpt.
 */
export function resolveCurrentTipWithUserOverride(args: {
  baseHpt: HptTipSource;
  userTipCountOverride: unknown;
}): RuntimeTipInput | null {
  const { baseHpt, userTipCountOverride } = args;
  const override = clampUserRuntimeTipCount(userTipCountOverride);
  if (override == null) {
    return resolveTipFromHpt(baseHpt);
  }

  const hp = resolveHitPoint(baseHpt);
  // Side from hydrated hit_point; default R if missing (center / no hp)
  const side: TipSide = hp == null ? "R" : hp.x >= 0 ? "R" : "L";
  return { count: override, side };
}
