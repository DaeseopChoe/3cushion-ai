/**
 * ballRole.ts
 * Ball Role + Ball3 SSOT — Role-based Clean Cut Phase 1.
 *
 * ═══════════════════════════════════════════════════════════════════════════
 * CANONICAL Ball3 (field name == physical role)
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *   balls.cue    = physical Cue Ball   (always white)
 *   balls.target = physical Target Ball (red or yellow)
 *   balls.second = physical Second Ball (the other object ball)
 *
 * Color is NOT a Role. Color does not select which Ball3 field is Target/Second.
 *
 *   targetBall / targetColor = color metadata of the physical Target only
 *   (red | yellow). Second color = opposite(targetColor).
 *
 * CASE A: targetBall="red"
 *   balls.target  = red Target position
 *   balls.second  = yellow Second position
 *
 * CASE B: targetBall="yellow"
 *   balls.target  = yellow Target position
 *   balls.second  = red Second position
 *
 * Color is metadata only (paint / targetBall filter). Role Clean Cut Phase 1–7C complete.
 */

export type BallRole = "cue" | "target" | "second";

/** Physical color of an object ball (metadata — not a Role). */
export type BallColor = "red" | "yellow";

/**
 * UI / drag coordinate keys (legacy ballsState).
 * Dataset Ball3 roles are cue | target | second — not these paint slots.
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

/** Target Lock UI state: targetColor = color of physical Target. */
export type TargetLockState = {
  targetColor: BallColor | null | undefined;
  isTargetSelected: boolean;
};

/** Minimal Ball3 object-ball pair (canonical roles). */
export type Ball3ObjectPair = {
  target: RgPoint;
  second: RgPoint;
};

export function isBallColor(v: unknown): v is BallColor {
  return v === "red" || v === "yellow";
}

/** Opposite object-ball color. */
export function oppositeColor(color: BallColor): BallColor {
  return color === "red" ? "yellow" : "red";
}

/**
 * Color of the physical Second given Target color metadata.
 * Does not change Ball3 field meaning.
 */
export function secondColorFromTargetColor(
  targetColor: BallColor | null | undefined
): BallColor | null {
  if (!isBallColor(targetColor)) return null;
  return oppositeColor(targetColor);
}

/** SVG paint hex for object-ball colors (UI). */
export const BALL_PAINT_HEX = {
  white: "#ffffff",
  yellow: "#fde047",
  red: "#f87171",
} as const;

/**
 * Provisional Target color when unlocked: yellow @ balls.target, red @ balls.second.
 */
export const PROVISIONAL_TARGET_COLOR: BallColor = "yellow";

/** Paint hex for physical Target Role (field balls.target). */
export function paintHexForTargetRole(
  targetColor: BallColor | null | undefined
): string {
  const c = isBallColor(targetColor) ? targetColor : PROVISIONAL_TARGET_COLOR;
  return c === "red" ? BALL_PAINT_HEX.red : BALL_PAINT_HEX.yellow;
}

/** Paint hex for physical Second Role (field balls.second). */
export function paintHexForSecondRole(
  targetColor: BallColor | null | undefined
): string {
  const c = isBallColor(targetColor) ? targetColor : PROVISIONAL_TARGET_COLOR;
  return oppositeColor(c) === "red" ? BALL_PAINT_HEX.red : BALL_PAINT_HEX.yellow;
}

/**
 * UI: resolve Target Role coordinates (prefer balls.target; legacy target_center alias).
 */
export function uiTargetRoleCoords(
  balls: BallsMap | null | undefined
): RgPoint | null {
  if (!balls) return null;
  const p = balls.target ?? balls.target_center ?? null;
  return isValidPoint(p) ? clonePoint(p) : null;
}

/**
 * First object-ball Target Lock under Role UI.
 * Clicked field is a Role key ("target" | "second").
 * If "second" is locked as Target, swap coordinates into canonical fields.
 */
export function lockTargetRoleFromClickedBall(
  balls: BallsMap,
  clickedBallId: "target" | "second",
  currentTargetColor: BallColor | null | undefined
): { balls: BallsMap; targetColor: BallColor } {
  const provisional = isBallColor(currentTargetColor)
    ? currentTargetColor
    : PROVISIONAL_TARGET_COLOR;
  const targetPos = uiTargetRoleCoords(balls);
  const secondPos = getBallCoordsBySlotId(balls, "second");
  if (!targetPos || !secondPos) {
    return {
      balls: { ...balls },
      targetColor: provisional,
    };
  }

  if (clickedBallId === "target") {
    return {
      balls: {
        cue: balls.cue ?? null,
        target: clonePoint(targetPos),
        second: clonePoint(secondPos),
        ...(balls.impact ? { impact: balls.impact } : {}),
      },
      targetColor: provisional,
    };
  }

  // Clicked physical Second → becomes Target; swap into Role fields
  return {
    balls: {
      cue: balls.cue ?? null,
      target: clonePoint(secondPos),
      second: clonePoint(targetPos),
      ...(balls.impact ? { impact: balls.impact } : {}),
    },
    targetColor: oppositeColor(provisional),
  };
}

// ─── Canonical Ball3 role readers (Phase 1 SSOT) ───────────────────────────

/**
 * Physical Target coordinates from Ball3.
 * Field `target` IS the Target Role — independent of targetBall color.
 */
export function physicalTargetFromBall3(
  balls: { target: RgPoint } | null | undefined
): RgPoint | null {
  if (!balls) return null;
  return isValidPoint(balls.target) ? clonePoint(balls.target) : null;
}

/**
 * Physical Second coordinates from Ball3.
 * Field `second` IS the Second Role — independent of targetBall color.
 */
export function physicalSecondFromBall3(
  balls: { second: RgPoint } | null | undefined
): RgPoint | null {
  if (!balls) return null;
  return isValidPoint(balls.second) ? clonePoint(balls.second) : null;
}

/**
 * Place physical-second scoring sample P onto Ball3.second (canonical).
 * Physical Target (balls.target) is unchanged.
 * targetBall is ignored for field selection (color metadata only).
 */
export function placePhysicalSecondSampleOnRoleBall3(
  base: Ball3ObjectPair,
  sampleP: RgPoint,
  _targetBall?: BallColor | null
): Ball3ObjectPair {
  void _targetBall;
  return {
    target: clonePoint(base.target),
    second: clonePoint(sampleP),
  };
}

/**
 * UI coordinate lookup by ballsState key.
 * Role fields: cue | target | second. target_center is a legacy alias of target.
 * Does NOT map color → Role.
 */
export function getBallCoordsBySlotId(
  balls: BallsMap | null | undefined,
  slotId: BallSlotId | null | undefined
): RgPoint | null {
  if (!balls || !slotId) return null;
  if (slotId === "target_center" || slotId === "target") {
    const p = balls.target ?? balls.target_center ?? null;
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

function clonePoint(p: RgPoint): RgPoint {
  return { x: p.x, y: p.y };
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
