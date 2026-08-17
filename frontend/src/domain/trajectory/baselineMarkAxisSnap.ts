/**
 * baselineMarkAxisSnap.ts
 * Baseline CO/C1 handle lives on the System Mark axis (Fg FRAME or Rg rail).
 * Project pointer onto that axis only. Never convert Fg → Rg.
 */

import { inferAnchorCoordValueSpace } from "../anchorLookupEngine";

export type AxisPoint = { x: number; y: number };

const FRAME_TOL = 1e-3;

const FG_BOTTOM_Y = -2.25;
const FG_TOP_Y = 42.25;
const FG_LEFT_X = -2.25;
const FG_RIGHT_X = 82.25;
const RG_BOTTOM_Y = 0;
const RG_TOP_Y = 40;
const RG_LEFT_X = 0;
const RG_RIGHT_X = 80;

type MarkRail = "BOTTOM" | "TOP" | "LEFT" | "RIGHT";
type VaryingAxis = "x" | "y";

type MarkAxisLock = {
  rail: MarkRail;
  varying: VaryingAxis;
  constantAxis: VaryingAxis;
  constantValue: number;
  varyMin: number;
  varyMax: number;
};

function near(a: number, b: number, tol = FRAME_TOL): boolean {
  return Math.abs(a - b) <= tol;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function isFinitePoint(
  p: AxisPoint | null | undefined
): p is AxisPoint {
  return (
    !!p &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y)
  );
}

/**
 * Unwrap { coord } or { x, y } — same numeric Mark coord the yellow labels use.
 */
export function readBaselineHandleCoord(
  anchor: unknown
): AxisPoint | null {
  if (anchor == null || typeof anchor !== "object") return null;
  const a = anchor as {
    coord?: { x?: unknown; y?: unknown };
    x?: unknown;
    y?: unknown;
  };
  if (a.coord && typeof a.coord === "object") {
    const x = Number(a.coord.x);
    const y = Number(a.coord.y);
    if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
    return null;
  }
  const x = Number(a.x);
  const y = Number(a.y);
  if (Number.isFinite(x) && Number.isFinite(y)) return { x, y };
  return null;
}

function locksForMarkCoord(coord: AxisPoint): MarkAxisLock[] {
  const space = inferAnchorCoordValueSpace(coord.x, coord.y);
  const locks: MarkAxisLock[] = [];

  if (space === "Fg") {
    if (near(coord.y, FG_BOTTOM_Y)) {
      locks.push({
        rail: "BOTTOM",
        varying: "x",
        constantAxis: "y",
        constantValue: FG_BOTTOM_Y,
        varyMin: FG_LEFT_X,
        varyMax: FG_RIGHT_X,
      });
    }
    if (near(coord.y, FG_TOP_Y)) {
      locks.push({
        rail: "TOP",
        varying: "x",
        constantAxis: "y",
        constantValue: FG_TOP_Y,
        varyMin: FG_LEFT_X,
        varyMax: FG_RIGHT_X,
      });
    }
    if (near(coord.x, FG_LEFT_X)) {
      locks.push({
        rail: "LEFT",
        varying: "y",
        constantAxis: "x",
        constantValue: FG_LEFT_X,
        varyMin: FG_BOTTOM_Y,
        varyMax: FG_TOP_Y,
      });
    }
    if (near(coord.x, FG_RIGHT_X)) {
      locks.push({
        rail: "RIGHT",
        varying: "y",
        constantAxis: "x",
        constantValue: FG_RIGHT_X,
        varyMin: FG_BOTTOM_Y,
        varyMax: FG_TOP_Y,
      });
    }
    return locks;
  }

  if (near(coord.y, RG_BOTTOM_Y)) {
    locks.push({
      rail: "BOTTOM",
      varying: "x",
      constantAxis: "y",
      constantValue: RG_BOTTOM_Y,
      varyMin: RG_LEFT_X,
      varyMax: RG_RIGHT_X,
    });
  }
  if (near(coord.y, RG_TOP_Y)) {
    locks.push({
      rail: "TOP",
      varying: "x",
      constantAxis: "y",
      constantValue: RG_TOP_Y,
      varyMin: RG_LEFT_X,
      varyMax: RG_RIGHT_X,
    });
  }
  if (near(coord.x, RG_LEFT_X)) {
    locks.push({
      rail: "LEFT",
      varying: "y",
      constantAxis: "x",
      constantValue: RG_LEFT_X,
      varyMin: RG_BOTTOM_Y,
      varyMax: RG_TOP_Y,
    });
  }
  if (near(coord.x, RG_RIGHT_X)) {
    locks.push({
      rail: "RIGHT",
      varying: "y",
      constantAxis: "x",
      constantValue: RG_RIGHT_X,
      varyMin: RG_BOTTOM_Y,
      varyMax: RG_TOP_Y,
    });
  }
  return locks;
}

function projectOntoLock(pointer: AxisPoint, lock: MarkAxisLock): AxisPoint {
  if (lock.varying === "x") {
    return {
      x: clamp(pointer.x, lock.varyMin, lock.varyMax),
      y: lock.constantValue,
    };
  }
  return {
    x: lock.constantValue,
    y: clamp(pointer.y, lock.varyMin, lock.varyMax),
  };
}

function distanceToLockLine(pointer: AxisPoint, lock: MarkAxisLock): number {
  return lock.constantAxis === "y"
    ? Math.abs(pointer.y - lock.constantValue)
    : Math.abs(pointer.x - lock.constantValue);
}

/**
 * Project a pointer onto the Mark's current FRAME/RAIL axis.
 * Corner (two constants): pick the rail whose constant line is closer to the pointer.
 * Off-axis mark coord → null (do not fall back to Rg playing rail).
 */
export function projectPointerToMarkAxis(
  pointer: AxisPoint | null | undefined,
  markCoord: AxisPoint | null | undefined
): AxisPoint | null {
  if (!isFinitePoint(pointer) || !isFinitePoint(markCoord)) return null;
  const locks = locksForMarkCoord(markCoord);
  if (!locks.length) return null;

  let chosen = locks[0];
  if (locks.length > 1) {
    let bestD = Infinity;
    for (const lock of locks) {
      const d = distanceToLockLine(pointer, lock);
      if (d < bestD) {
        bestD = d;
        chosen = lock;
      }
    }
  }
  return projectOntoLock(pointer, chosen);
}
