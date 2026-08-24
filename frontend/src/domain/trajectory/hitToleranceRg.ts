/**
 * Production trajectory Second-Ball hit tolerance (Rg).
 * Must match App.jsx HIT_TOLERANCE = max(2, BALL_RADIUS_RG * 4).
 */

export const TRAJECTORY_BALL_DIAMETER_MM = 61.5;
export const TRAJECTORY_RG_UNIT_MM = 35.55;
export const TRAJECTORY_BALL_DIAMETER_RG =
  TRAJECTORY_BALL_DIAMETER_MM / TRAJECTORY_RG_UNIT_MM;
export const TRAJECTORY_BALL_RADIUS_RG = TRAJECTORY_BALL_DIAMETER_RG / 2;

/** Shared with Display Cap / buildTrajectory Second-Ball hit-test. */
export function resolveTrajectoryHitTolerance(
  ballRadiusRg: number = TRAJECTORY_BALL_RADIUS_RG
): number {
  return Math.max(2, ballRadiusRg * 4);
}
