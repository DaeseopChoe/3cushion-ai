/**
 * Family HPT / thickness runtime resolver.
 *
 * Canonical source = AUTHORED Member persisted hpT / T.
 * Mirror is decided by L/R handedness difference, never by symmetryOp.
 * Do not persist resolver output as a SYMMETRY Member canonical value.
 *
 * Does not change Calculator / Builder formulas.
 */

import { isOppositeHandedness } from "./handedness";

export type FamilyHptPoint = { x?: unknown; y?: unknown };

export type FamilyHptPayload = {
  T?: unknown;
  hit_point?: FamilyHptPoint | null;
  hp?: FamilyHptPoint | null;
  mode?: unknown;
  tipCount?: unknown;
  [key: string]: unknown;
};

function cloneUnknown<T>(value: T): T {
  if (value == null || typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function mirrorNumericSign(value: unknown): unknown {
  return typeof value === "number" && Number.isFinite(value) ? -value : value;
}

/**
 * Existing production T semantics:
 *   + prefix = right, - prefix = left
 *   8/8 and BANK have no side to flip
 * Unsigned fractions are left unchanged (no invented side).
 */
export function mirrorThicknessT(canonicalT: string): string {
  const txt = canonicalT.trim();
  if (txt === "8/8") return txt;
  if (txt.toUpperCase() === "BANK") return txt;
  if (txt.startsWith("+")) return `-${txt.slice(1)}`;
  if (txt.startsWith("-")) return `+${txt.slice(1)}`;
  return txt;
}

function mirrorHptPayload(canonical: FamilyHptPayload): FamilyHptPayload {
  const out = cloneUnknown(canonical);
  if (typeof out.T === "string") {
    out.T = mirrorThicknessT(out.T);
  }
  if (out.hit_point && typeof out.hit_point === "object") {
    out.hit_point = {
      ...out.hit_point,
      x: mirrorNumericSign(out.hit_point.x),
    };
  }
  if (out.hp && typeof out.hp === "object") {
    out.hp = {
      ...out.hp,
      x: mirrorNumericSign(out.hp.x),
    };
  }
  return out;
}

export type ResolveFamilyHptArgs = {
  authoredTrack?: string;
  requestedTrack?: string;
  canonicalHpt: unknown;
};

export type ResolveFamilyHptResult = {
  hpt: unknown;
  mirrored: boolean;
};

/**
 * Runtime HPT for a requested Family track.
 * Same handedness → canonical unchanged.
 * Opposite handedness → T sign reverse, hit_point.x / hp.x sign reverse;
 * hit_point.y, tipCount, mode unchanged.
 */
export function resolveFamilyHpt(args: ResolveFamilyHptArgs): ResolveFamilyHptResult {
  const canonical = cloneUnknown(args.canonicalHpt);
  if (!isOppositeHandedness(args.authoredTrack, args.requestedTrack)) {
    return { hpt: canonical, mirrored: false };
  }
  if (canonical == null || typeof canonical !== "object") {
    return { hpt: canonical, mirrored: true };
  }
  return {
    hpt: mirrorHptPayload(canonical as FamilyHptPayload),
    mirrored: true,
  };
}

export type ResolveFamilyThicknessArgs = {
  authoredTrack?: string;
  requestedTrack?: string;
  canonicalT: string;
};

export type ResolveFamilyThicknessResult = {
  T: string;
  mirrored: boolean;
};

export function resolveFamilyThickness(
  args: ResolveFamilyThicknessArgs
): ResolveFamilyThicknessResult {
  if (!isOppositeHandedness(args.authoredTrack, args.requestedTrack)) {
    return { T: args.canonicalT, mirrored: false };
  }
  return { T: mirrorThicknessT(args.canonicalT), mirrored: true };
}

/**
 * Hydrate / runtime projection bridge.
 * Consumers should call this immediately before Calculator / Builder input.
 * Phase 2B does not wire ADMIN SAVE or App hydrate automatically.
 */
export function projectFamilyRuntimeHpt(args: ResolveFamilyHptArgs): unknown {
  return resolveFamilyHpt(args).hpt;
}

export function projectFamilyRuntimeThickness(
  args: ResolveFamilyThicknessArgs
): string {
  return resolveFamilyThickness(args).T;
}
