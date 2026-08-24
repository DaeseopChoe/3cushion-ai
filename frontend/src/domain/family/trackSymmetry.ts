/**
 * Family 4-Track coordinate symmetry.
 *
 * FamilyTrack is NOT a system-specific trajectory/route name.
 * `RLTR_R` / `LRTL_L` / spider-web routes are not FamilyTrack values.
 * A future classifier may map a route onto one of these 4 tracks;
 * this module never casts a raw system route into FamilyTrack.
 */

import type { Ball3, Point, StrategyMeta } from "../positionSearchEngine";
import type { TrajectoryExtensionPayload } from "../trajectoryExtension/model";
import type { SymmetryOp } from "./familyIdentity";

export const FAMILY_TRACKS = ["B2T_L", "B2T_R", "T2B_L", "T2B_R"] as const;
export type FamilyTrack = (typeof FAMILY_TRACKS)[number];

/** Raw system trajectory / spider-web route name. Not a FamilyTrack. */
export type SystemTrajectoryName = string;

export const FAMILY_TABLE_WIDTH = 80;
export const FAMILY_TABLE_HEIGHT = 40;
export const FAMILY_BALL_CENTER_MIN = 0.5;
export const FAMILY_BALL_CENTER_MAX_X = 79.5;
export const FAMILY_BALL_CENTER_MAX_Y = 39.5;

const FAMILY_TRACK_SET: ReadonlySet<string> = new Set(FAMILY_TRACKS);

/**
 * 4×4 Family Track map (base × operator).
 * identity is the AUTHORED track itself — not a persisted symmetryOp.
 */
export const FAMILY_TRACK_SYMMETRY_MAP: Record<
  FamilyTrack,
  Record<"identity" | SymmetryOp, FamilyTrack>
> = {
  B2T_L: { identity: "B2T_L", H: "B2T_R", V: "T2B_R", RPI: "T2B_L" },
  B2T_R: { identity: "B2T_R", H: "B2T_L", V: "T2B_L", RPI: "T2B_R" },
  T2B_L: { identity: "T2B_L", H: "T2B_R", V: "B2T_R", RPI: "B2T_L" },
  T2B_R: { identity: "T2B_R", H: "T2B_L", V: "B2T_L", RPI: "B2T_R" },
};

export function isFamilyTrack(raw: unknown): raw is FamilyTrack {
  return typeof raw === "string" && FAMILY_TRACK_SET.has(raw);
}

/**
 * Accepts only the 4 Family tracks.
 * System-specific routes (e.g. RLTR_R) return null — never coerced.
 */
export function parseFamilyTrack(raw: unknown): FamilyTrack | null {
  return isFamilyTrack(raw) ? raw : null;
}

export function mapFamilyTrack(
  base: FamilyTrack,
  op: "identity" | SymmetryOp
): FamilyTrack {
  return FAMILY_TRACK_SYMMETRY_MAP[base][op];
}

/**
 * H/V/RPI are involutions: applying the same op recovers the AUTHORED track.
 * Used by hydrate when only the SYMMETRY Member is in the recalled record.
 */
export function authoredTrackFromSymmetryMember(
  memberTrack: FamilyTrack,
  op: SymmetryOp
): FamilyTrack {
  return mapFamilyTrack(memberTrack, op);
}

export function clonePoint(p: Point): Point {
  return { x: p.x, y: p.y };
}

export function cloneBall3(balls: Ball3): Ball3 {
  return {
    cue: clonePoint(balls.cue),
    target: clonePoint(balls.target),
    second: clonePoint(balls.second),
  };
}

export function transformPoint(op: SymmetryOp, point: Point): Point {
  const x = point.x;
  const y = point.y;
  if (op === "H") return { x: FAMILY_TABLE_WIDTH - x, y };
  if (op === "V") return { x, y: FAMILY_TABLE_HEIGHT - y };
  return { x: FAMILY_TABLE_WIDTH - x, y: FAMILY_TABLE_HEIGHT - y };
}

export function transformBall3(op: SymmetryOp, balls: Ball3): Ball3 {
  return {
    cue: transformPoint(op, balls.cue),
    target: transformPoint(op, balls.target),
    second: transformPoint(op, balls.second),
  };
}

/**
 * Symmetry op that maps `fromTrack` → `toTrack`, or null if unrelated / identity.
 */
export function symmetryOpBetweenTracks(
  fromTrack: FamilyTrack,
  toTrack: FamilyTrack
): SymmetryOp | null {
  if (fromTrack === toTrack) return null;
  for (const op of ["H", "V", "RPI"] as const) {
    if (mapFamilyTrack(fromTrack, op) === toTrack) return op;
  }
  return null;
}

/** Transform corrected pathNodes (nulls preserved). */
export function transformPathNodes(
  op: SymmetryOp,
  pathNodes: ReadonlyArray<Point | null | undefined>
): Array<Point | null> {
  return pathNodes.map((p) => {
    if (p == null) return null;
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
    return transformPoint(op, p);
  });
}

/**
 * Transform persisted trajectoryExtensions endpoints for a SYMMETRY track.
 * Origin reference is path_node (not coordinates) — copied as-is.
 */
export function transformTrajectoryExtensions(
  op: SymmetryOp,
  payload: TrajectoryExtensionPayload
): TrajectoryExtensionPayload {
  return {
    extensionSchemaVersion: payload.extensionSchemaVersion,
    origin: {
      kind: payload.origin.kind,
      source: payload.origin.source,
    },
    items: payload.items.map((item) => ({
      id: item.id,
      index: item.index,
      endpoint: transformPoint(op, item.endpoint),
      userEdited: item.userEdited,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    })),
  };
}

export function isValidBallCenter(point: Point): boolean {
  return (
    Number.isFinite(point.x) &&
    Number.isFinite(point.y) &&
    point.x >= FAMILY_BALL_CENTER_MIN &&
    point.x <= FAMILY_BALL_CENTER_MAX_X &&
    point.y >= FAMILY_BALL_CENTER_MIN &&
    point.y <= FAMILY_BALL_CENTER_MAX_Y
  );
}

export function validateBall3Centers(balls: Ball3): string | null {
  for (const role of ["cue", "target", "second"] as const) {
    if (!isValidBallCenter(balls[role])) {
      return `${role} center out of range`;
    }
  }
  return null;
}

export function pointsEqual(a: Point, b: Point): boolean {
  return a.x === b.x && a.y === b.y;
}

export function ballsEqual(a: Ball3, b: Ball3): boolean {
  return (
    pointsEqual(a.cue, b.cue) &&
    pointsEqual(a.target, b.target) &&
    pointsEqual(a.second, b.second)
  );
}

/**
 * Coordinate-only meta rewrite: transform stored impact/final, recompute angles.
 * Does not call Calculator / Builder. Does not copy AUTHORED meta blindly.
 */
export function transformStrategyMeta(
  op: SymmetryOp,
  meta: StrategyMeta,
  transformedBalls: Ball3
): StrategyMeta {
  const impact = transformPoint(op, meta.impact);
  const final = transformPoint(op, meta.final);
  return {
    impact,
    final,
    angle_ci: Math.atan2(
      impact.y - transformedBalls.cue.y,
      impact.x - transformedBalls.cue.x
    ),
    angle_fs: Math.atan2(
      transformedBalls.second.y - final.y,
      transformedBalls.second.x - final.x
    ),
  };
}
