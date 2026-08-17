/**
 * C2 Reflection Override — ADMIN rail handle persist + geometry.
 *
 * Stores { rail, t } only (no absolute coords in Dataset).
 * Builder consumes anchors.C2 when hydrated; Reflection Engine is never modified.
 *
 * Drag clamp: keep point on full rail with a tiny edge epsilon so corners
 * do not flip rail identity / null out override (do NOT use detectRail EPS=3).
 */

import { projectPointToRail } from "../../utils/geometry/rail";
import { resolveNearestRail, type Rail } from "../reflectionEngine";

const RG_W = 80;
const RG_H = 40;

/**
 * Keep C2 slightly inward from exact corners (Presentation clamp only).
 * LEFT/RIGHT → y ∈ [0.2, 39.8]; TOP/BOTTOM → x ∈ [0.2, 79.8].
 */
export const C2_RAIL_EDGE_EPS = 0.2;

/** Dataset / StrategyEntry.reflectionOverride */
export type ReflectionOverride = {
  rail: Rail;
  /** Normalized position along rail in [0, 1]. */
  t: number;
};

export type RgPoint = { x: number; y: number };

export function isRail(value: unknown): value is Rail {
  return (
    value === "TOP" ||
    value === "BOTTOM" ||
    value === "LEFT" ||
    value === "RIGHT"
  );
}

export function clamp01(t: number): number {
  if (!Number.isFinite(t)) return 0;
  return Math.max(0, Math.min(1, t));
}

/** t range that maps to [eps, length-eps] on the rail. */
export function railTBounds(rail: Rail): { tMin: number; tMax: number } {
  const length = rail === "LEFT" || rail === "RIGHT" ? RG_H : RG_W;
  const tMin = C2_RAIL_EDGE_EPS / length;
  const tMax = 1 - C2_RAIL_EDGE_EPS / length;
  return { tMin, tMax };
}

export function clampRailT(rail: Rail, t: number): number {
  const { tMin, tMax } = railTBounds(rail);
  return Math.max(tMin, Math.min(tMax, clamp01(t)));
}

/** Normalize unknown payload → ReflectionOverride | null. */
export function normalizeReflectionOverride(
  value: unknown
): ReflectionOverride | null {
  if (!value || typeof value !== "object") return null;
  const rail = (value as { rail?: unknown }).rail;
  const t = (value as { t?: unknown }).t;
  if (!isRail(rail) || typeof t !== "number" || !Number.isFinite(t)) {
    return null;
  }
  return { rail, t: clampRailT(rail, t) };
}

/** Rail parameter t → Rg point on that rail. */
export function railPointFromT(rail: Rail, t: number): RgPoint {
  const u = clampRailT(rail, t);
  switch (rail) {
    case "BOTTOM":
      return { x: u * RG_W, y: 0 };
    case "TOP":
      return { x: u * RG_W, y: RG_H };
    case "LEFT":
      return { x: 0, y: u * RG_H };
    case "RIGHT":
      return { x: RG_W, y: u * RG_H };
    default:
      return { x: 0, y: 0 };
  }
}

/** Point on rail → t in [0, 1] (before edge clamp). */
export function railTFromPoint(p: RgPoint, rail: Rail): number {
  switch (rail) {
    case "BOTTOM":
    case "TOP":
      return clamp01(p.x / RG_W);
    case "LEFT":
    case "RIGHT":
      return clamp01(p.y / RG_H);
    default:
      return 0;
  }
}

/**
 * Nearest rail by distance — NOT reflectionEngine.detectRail (EPS=3).
 * Corner ties prefer LEFT/RIGHT so side-rail C2 is not stolen by TOP/BOTTOM.
 * Delegates to resolveNearestRail (shared with display-cap same_rail).
 */
export function resolveRailForC2Handle(
  point: RgPoint,
  preferred?: Rail | null
): Rail {
  if (preferred && isRail(preferred)) return preferred;
  return resolveNearestRail(point);
}

/** Override → PathPoint for anchors.C2 injection (always edge-clamped). */
export function reflectionOverrideToPoint(
  override: ReflectionOverride | null | undefined
): RgPoint | null {
  const n = normalizeReflectionOverride(override);
  if (!n) return null;
  return railPointFromT(n.rail, n.t);
}

/**
 * Build override from a rail-locked Rg point.
 * Prefer explicit railLock; never uses detectRail EPS=3 band.
 */
export function reflectionOverrideFromPoint(
  point: RgPoint | null | undefined,
  railLock?: Rail | null
): ReflectionOverride | null {
  if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return null;
  }
  const rail = resolveRailForC2Handle(point, railLock);
  const snapped = projectPointToRail(point, rail);
  if (!snapped) {
    return { rail, t: clampRailT(rail, 0.5) };
  }
  return { rail, t: clampRailT(rail, railTFromPoint(snapped, rail)) };
}

/**
 * Snap pointer to locked rail and emit override.
 * Always returns a valid override (never null) while railLock is set.
 */
export function snapPointerToReflectionOverride(
  pointerRg: RgPoint,
  railLock: Rail
): ReflectionOverride {
  const snapped =
    projectPointToRail(pointerRg, railLock) ??
    railPointFromT(railLock, 0.5);
  return {
    rail: railLock,
    t: clampRailT(railLock, railTFromPoint(snapped, railLock)),
  };
}

export const C2_HANDLE_HIT_RADIUS_RG = 2.5;

export function hitTestC2Handle(
  pointerRg: RgPoint,
  handleRg: RgPoint | null | undefined,
  radiusRg = C2_HANDLE_HIT_RADIUS_RG
): boolean {
  if (!handleRg) return false;
  if (!Number.isFinite(handleRg.x) || !Number.isFinite(handleRg.y)) return false;
  const dx = pointerRg.x - handleRg.x;
  const dy = pointerRg.y - handleRg.y;
  return Math.hypot(dx, dy) <= radiusRg;
}

/** Normalize track id for equality (SYS Apply Track flip detection). */
export function normalizeTrackId(track: string | null | undefined): string {
  return track && String(track).trim() ? String(track).trim() : "B2T_L";
}

/**
 * Track flip invalidates prior {rail,t} C2 override provenance.
 * Same track → KEEP override. Different track → CLEAR.
 */
export function shouldClearReflectionOverrideOnTrackChange(
  previousTrack: string | null | undefined,
  nextTrack: string | null | undefined
): boolean {
  return normalizeTrackId(previousTrack) !== normalizeTrackId(nextTrack);
}

/**
 * Canonical tip side for C2 reflection (same rule as trajectoryBuilder /
 * App currentTip): hit_point.x (or hp.x) ≥ 0 → "R", else "L".
 * Missing / non-finite hp → null (no side-change decision).
 */
export type CanonicalTipSide = "L" | "R";

export type HptTipSideSource = {
  hit_point?: { x?: unknown; y?: unknown } | null;
  hp?: { x?: unknown; y?: unknown } | null;
} | null | undefined;

export function canonicalTipSideFromHpt(
  hpt: HptTipSideSource
): CanonicalTipSide | null {
  const hp = hpt?.hit_point ?? hpt?.hp;
  if (!hp || typeof hp.x !== "number" || !Number.isFinite(hp.x)) return null;
  return hp.x >= 0 ? "R" : "L";
}

/**
 * HP/T tip side L↔R invalidates prior {rail,t} C2 override provenance
 * (spin / reflection geometry meaning changed). Same side → KEEP.
 * Unknown side on either side → KEEP (do not expand invalidate scope).
 */
export function shouldClearReflectionOverrideOnHptTipSideChange(
  previousHpt: HptTipSideSource,
  nextHpt: HptTipSideSource
): boolean {
  const prev = canonicalTipSideFromHpt(previousHpt);
  const next = canonicalTipSideFromHpt(nextHpt);
  if (prev == null || next == null) return false;
  return prev !== next;
}

/** Remove reflectionOverride from a draft/applied layer (other fields kept). */
export function stripReflectionOverrideFromLayer<
  T extends { reflectionOverride?: unknown } | null | undefined,
>(layer: T): T {
  if (!layer || typeof layer !== "object") return layer;
  if (!("reflectionOverride" in layer)) return layer;
  if ((layer as { reflectionOverride?: unknown }).reflectionOverride == null) {
    return layer;
  }
  const { reflectionOverride: _removed, ...rest } = layer as Record<
    string,
    unknown
  >;
  return rest as T;
}
