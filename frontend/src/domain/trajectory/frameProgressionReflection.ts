/**
 * Phase 2A — R1b destination-preserving Frame progression (geometry only).
 *
 * Inputs are resolved Points. No formula/sys conversion.
 * Does not decide when to apply — that is policy's job.
 */

import type { Point } from "../reflectionEngine";
import { angleDeg } from "../reflectionEngine";

export type FrameSide = "TOP_F" | "BOTTOM_F" | "LEFT_F" | "RIGHT_F";

export const FRAME_TOP_Y = 42.25;
export const FRAME_BOTTOM_Y = -2.25;
export const FRAME_LEFT_X = -2.25;
export const FRAME_RIGHT_X = 82.25;

/** Physical rail coordinates matching Frame long/short sides (Rg). */
export const RAIL_TOP_Y = 40;
export const RAIL_BOTTOM_Y = 0;
export const RAIL_LEFT_X = 0;
export const RAIL_RIGHT_X = 80;

export type ParallelOppositeSpec = {
  /** Longitudinal axis along the Frame pair (x for TOP↔BOTTOM, y for LEFT↔RIGHT). */
  axis: "x" | "y";
  startSide: FrameSide;
  aimSide: FrameSide;
};

export type FrameProgressionR1bResult = {
  /** Destination-preserving opposite-Frame reference point. */
  D: Point;
  /** Parallel projection of B onto the physical rail of the aim Frame side (geometry only). */
  R: Point;
  /** Outgoing direction H → D (degrees). */
  thetaOutDeg: number;
  axis: "x" | "y";
  startSide: FrameSide;
  aimSide: FrameSide;
};

type FrameRoles = {
  horizontal: "TOP_F" | "BOTTOM_F" | null;
  vertical: "LEFT_F" | "RIGHT_F" | null;
};

function near(a: number, b: number, tol: number): boolean {
  return Math.abs(a - b) <= tol;
}

export function classifyFrameRoles(p: Point, tol = 0.5): FrameRoles {
  return {
    horizontal: near(p.y, FRAME_TOP_Y, tol)
      ? "TOP_F"
      : near(p.y, FRAME_BOTTOM_Y, tol)
        ? "BOTTOM_F"
        : null,
    vertical: near(p.x, FRAME_LEFT_X, tol)
      ? "LEFT_F"
      : near(p.x, FRAME_RIGHT_X, tol)
        ? "RIGHT_F"
        : null,
  };
}

/**
 * Parallel opposite-Frame progression only.
 * TOP↔BOTTOM (longitudinal x) or LEFT↔RIGHT (longitudinal y).
 * Perpendicular / short-rail mixed pairs → null (caller must keep R0).
 */
export function resolveParallelOppositeFrame(
  A: Point,
  B: Point,
  tol = 0.5,
): ParallelOppositeSpec | null {
  const a = classifyFrameRoles(A, tol);
  const b = classifyFrameRoles(B, tol);

  // Prefer long-rail pair (TOP↔BOTTOM) when both have opposite horizontal roles.
  if (
    a.horizontal &&
    b.horizontal &&
    a.horizontal !== b.horizontal
  ) {
    return {
      axis: "x",
      startSide: a.horizontal,
      aimSide: b.horizontal,
    };
  }

  // Short-axis pair (LEFT↔RIGHT) when both have opposite vertical roles.
  if (a.vertical && b.vertical && a.vertical !== b.vertical) {
    return {
      axis: "y",
      startSide: a.vertical,
      aimSide: b.vertical,
    };
  }

  // Corner A (both roles): allow if B's role has an opposite role on A.
  if (b.horizontal && a.horizontal && a.horizontal !== b.horizontal) {
    return {
      axis: "x",
      startSide: a.horizontal,
      aimSide: b.horizontal,
    };
  }
  if (b.vertical && a.vertical && a.vertical !== b.vertical) {
    return {
      axis: "y",
      startSide: a.vertical,
      aimSide: b.vertical,
    };
  }

  return null;
}

function oppositeFramePoint(
  aimSide: FrameSide,
  parallelCoord: number,
): Point {
  switch (aimSide) {
    case "BOTTOM_F":
      // Opposite of bottom aim → top Frame destination
      return { x: parallelCoord, y: FRAME_TOP_Y };
    case "TOP_F":
      return { x: parallelCoord, y: FRAME_BOTTOM_Y };
    case "LEFT_F":
      return { x: FRAME_RIGHT_X, y: parallelCoord };
    case "RIGHT_F":
      return { x: FRAME_LEFT_X, y: parallelCoord };
  }
}

/** Geometry-only parallel projection of B onto the physical rail of the aim Frame side. */
export function projectAimToPhysicalRail(B: Point, aimSide: FrameSide): Point {
  switch (aimSide) {
    case "BOTTOM_F":
      return { x: B.x, y: RAIL_BOTTOM_Y };
    case "TOP_F":
      return { x: B.x, y: RAIL_TOP_Y };
    case "LEFT_F":
      return { x: RAIL_LEFT_X, y: B.y };
    case "RIGHT_F":
      return { x: RAIL_RIGHT_X, y: B.y };
  }
}

/**
 * R1b: D_∥ = 2·B_∥ − A_∥ on the opposite Frame (resolved geometry coords, not sys).
 * Outgoing reference direction is H → D. Does not move H.
 */
export function computeFrameProgressionR1b(input: {
  A: Point;
  B: Point;
  H: Point;
  tol?: number;
}): FrameProgressionR1bResult | null {
  const { A, B, H, tol = 0.5 } = input;
  const spec = resolveParallelOppositeFrame(A, B, tol);
  if (!spec) return null;

  const A_par = spec.axis === "x" ? A.x : A.y;
  const B_par = spec.axis === "x" ? B.x : B.y;
  const D_par = 2 * B_par - A_par;
  const D = oppositeFramePoint(spec.aimSide, D_par);
  const R = projectAimToPhysicalRail(B, spec.aimSide);
  const thetaOutDeg = angleDeg(H, D);

  return {
    D,
    R,
    thetaOutDeg,
    axis: spec.axis,
    startSide: spec.startSide,
    aimSide: spec.aimSide,
  };
}

/** True when c1Aim provenance is Frame (C1_f). Never parses engine-side "_f" globally. */
export function isC1FrameAimProvenance(c1Aim?: {
  sysFieldKey?: string;
  valueSpace?: "Fg" | "Rg";
} | null): boolean {
  if (!c1Aim) return false;
  const key = c1Aim.sysFieldKey;
  if (typeof key !== "string" || key.length === 0) return false;
  // Opt-in: only C1 Frame field keys (C1_f). C1_r must not match.
  if (key !== "C1_f" && !(key.startsWith("C1") && key.endsWith("_f"))) {
    return false;
  }
  if (c1Aim.valueSpace != null && c1Aim.valueSpace !== "Fg") {
    return false;
  }
  return true;
}
