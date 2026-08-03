/**
 * ballRole.ts
 * Ball Role SSOT (Trajectory Extension v1.3 final).
 *
 * Role  = cue | target | second   (behavior)
 * Slot  = cue | target_center | second  (coordinate storage only)
 *
 * Historical slot keys are preserved for Dataset / SAVE / Search (frozen):
 *   target_center = yellow color slot (not "target role")
 *   second        = red color slot (not "second role")
 *
 * Target Role = first DoubleClick color.
 * Second Role = the other color ball while Target is locked.
 */

export type BallRole = "cue" | "target" | "second";

/** Physical color of the object ball (not a Role). */
export type BallColor = "red" | "yellow";

/**
 * Coordinate slot ids in ballsState / Dataset.
 * Do not treat these names as Roles.
 */
export type BallSlotId = "cue" | "target_center" | "second" | "target";

export type RgPoint = { x: number; y: number };

export type BallsMap = {
  cue?: RgPoint | null;
  target_center?: RgPoint | null;
  target?: RgPoint | null;
  second?: RgPoint | null;
  [key: string]: RgPoint | null | undefined;
};

export type TargetLockState = {
  targetColor: BallColor | null | undefined;
  isTargetSelected: boolean;
};

/** Yellow object-ball coordinate slot (storage only). */
export const YELLOW_SLOT_ID: BallSlotId = "target_center";

/** Red object-ball coordinate slot (storage only). */
export const RED_SLOT_ID: BallSlotId = "second";

export function isBallColor(v: unknown): v is BallColor {
  return v === "red" || v === "yellow";
}

/** Slot id that stores a given object-ball color. */
export function slotIdForColor(color: BallColor): BallSlotId {
  return color === "yellow" ? YELLOW_SLOT_ID : RED_SLOT_ID;
}

/** Object-ball color stored in a slot id (null for cue / unknown). */
export function colorForSlotId(slotId: string | null | undefined): BallColor | null {
  if (slotId === "target" || slotId === "target_center") return "yellow";
  if (slotId === "second") return "red";
  return null;
}

/** Opposite object-ball color. */
export function oppositeColor(color: BallColor): BallColor {
  return color === "red" ? "yellow" : "red";
}

/**
 * Slot id for Target Role.
 * Requires Target Lock (isTargetSelected + valid targetColor).
 */
export function resolveTargetSlotId(
  lock: TargetLockState
): BallSlotId | null {
  if (!lock.isTargetSelected || !isBallColor(lock.targetColor)) return null;
  return slotIdForColor(lock.targetColor);
}

/**
 * Slot id for Second Role (= non-target object ball).
 * Requires Target Lock.
 */
export function resolveSecondSlotId(
  lock: TargetLockState
): BallSlotId | null {
  if (!lock.isTargetSelected || !isBallColor(lock.targetColor)) return null;
  return slotIdForColor(oppositeColor(lock.targetColor));
}

/** Alias matching SSOT wording. */
export function resolveSecondRole(lock: TargetLockState): BallSlotId | null {
  return resolveSecondSlotId(lock);
}

/**
 * Resolve Role for a coordinate slot under current Target Lock.
 * cue is always cue. Object slots are target/second only after Lock.
 */
export function resolveRoleForSlotId(
  slotId: string | null | undefined,
  lock: TargetLockState
): BallRole | null {
  if (!slotId) return null;
  if (slotId === "cue") return "cue";
  const color = colorForSlotId(slotId);
  if (!color) return null;
  if (!lock.isTargetSelected || !isBallColor(lock.targetColor)) return null;
  if (color === lock.targetColor) return "target";
  return "second";
}

export function getBallCoordsBySlotId(
  balls: BallsMap | null | undefined,
  slotId: BallSlotId | null | undefined
): RgPoint | null {
  if (!balls || !slotId) return null;
  if (slotId === "target_center" || slotId === "target") {
    const p = balls.target_center ?? balls.target ?? null;
    return isValidPoint(p) ? { x: p.x, y: p.y } : null;
  }
  if (slotId === "second") {
    const p = balls.second ?? null;
    return isValidPoint(p) ? { x: p.x, y: p.y } : null;
  }
  if (slotId === "cue") {
    const p = balls.cue ?? null;
    return isValidPoint(p) ? { x: p.x, y: p.y } : null;
  }
  return null;
}

export function getBallByRole(
  balls: BallsMap | null | undefined,
  role: BallRole,
  lock: TargetLockState
): { slotId: BallSlotId; point: RgPoint } | null {
  if (role === "cue") {
    const point = getBallCoordsBySlotId(balls, "cue");
    return point ? { slotId: "cue", point } : null;
  }
  const slotId =
    role === "target" ? resolveTargetSlotId(lock) : resolveSecondSlotId(lock);
  if (!slotId) return null;
  const point = getBallCoordsBySlotId(balls, slotId);
  return point ? { slotId, point } : null;
}

export function getTargetBall(
  balls: BallsMap | null | undefined,
  lock: TargetLockState
) {
  return getBallByRole(balls, "target", lock);
}

export function getSecondBall(
  balls: BallsMap | null | undefined,
  lock: TargetLockState
) {
  return getBallByRole(balls, "second", lock);
}

export function isTargetRoleSlot(
  slotId: string | null | undefined,
  lock: TargetLockState
): boolean {
  return resolveRoleForSlotId(slotId, lock) === "target";
}

export function isSecondRoleSlot(
  slotId: string | null | undefined,
  lock: TargetLockState
): boolean {
  return resolveRoleForSlotId(slotId, lock) === "second";
}

/** Yellow slot coords (storage helper — not Target Role). */
export function getYellowBallCoords(balls: BallsMap | null | undefined) {
  return getBallCoordsBySlotId(balls, YELLOW_SLOT_ID);
}

/** Red slot coords (storage helper — not Second Role). */
export function getRedBallCoords(balls: BallsMap | null | undefined) {
  return getBallCoordsBySlotId(balls, RED_SLOT_ID);
}

/**
 * Impact / coaching: Target Role coords when locked; else yellow-then-red fallback.
 */
export function resolveImpactTargetBall(
  balls: BallsMap | null | undefined,
  targetColorSel: BallColor | null | undefined
): RgPoint | null {
  if (!balls) return null;
  if (isBallColor(targetColorSel)) {
    return getBallCoordsBySlotId(balls, slotIdForColor(targetColorSel));
  }
  return getYellowBallCoords(balls) ?? getRedBallCoords(balls);
}

/** UI emphasis: slot matches locked Target Role color. */
export function isConfirmedTargetBall(
  slotId: string | null | undefined,
  targetColorSel: BallColor | null | undefined,
  isSelected: boolean
): boolean {
  if (!isSelected || !isBallColor(targetColorSel)) return false;
  return colorForSlotId(slotId) === targetColorSel;
}

function isValidPoint(p: RgPoint | null | undefined): p is RgPoint {
  return (
    p != null &&
    typeof p.x === "number" &&
    typeof p.y === "number" &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y)
  );
}
