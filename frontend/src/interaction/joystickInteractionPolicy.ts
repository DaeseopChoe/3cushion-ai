/**
 * joystickInteractionPolicy.ts
 * Joystick Interaction SSOT — 좌표(Hit Radius) 기반 판정.
 *
 * DOM 구조(closest('[data-joystick]'))에 의존하지 않는다.
 * 위에 어떤 Overlay/Label 레이어가 덮여도 Interaction이 깨지지 않도록
 * Render 기하와 Hit 판정을 같은 식으로 공유한다.
 *
 * Interaction Layer only — Domain/Physics/Trajectory/DisplayModel 미참조.
 */

export type PointRg = { x: number; y: number };

/** Pad 시각 크기 (SVG viewBox px) — Render/Interaction 공용. */
export const JOYSTICK_BASE_R_PX = 52;
export const JOYSTICK_KNOB_R_PX = 22;

/**
 * UX experiment — visible joystick pad render + hit-test.
 * false: direct ball drag + guide only (implementation retained for easy restore).
 */
export const BALL_POSITION_JOYSTICK_PAD_VISIBLE = false;

/** Must match App.jsx `BALL_PICK_RADIUS_RG = BALL_RADIUS_RG * BALL_PICK_RADIUS_MULTIPLIER`. */
export const BALL_PICK_RADIUS_MULTIPLIER = 5.0;

/** Pad hit-test gate — false when pad is hidden so ball pick remains reachable. */
export function shouldJoystickPadCapturePointer(
  padVisible: boolean,
  joystickSessionVisible: boolean,
  selectedBallId: string | null,
  pointerRg: PointRg | null | undefined,
  ballPos: PointRg | null | undefined,
  ballRadiusRg: number,
  scale: number
): boolean {
  if (!padVisible || !joystickSessionVisible || !selectedBallId) return false;
  return isPointerOnJoystick(pointerRg, ballPos, ballRadiusRg, scale);
}

/** Pad는 테이블 중심 방향으로 배치되고 테이블 안쪽으로 clamp된다. */
const TABLE_CENTER_RG: PointRg = { x: 40, y: 20 };
const CLAMP_MIN_X = 3;
const CLAMP_MAX_X = 77;
const CLAMP_MIN_Y = 3;
const CLAMP_MAX_Y = 37;

function clampNum(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

/** Pad 반지름 (Rg) = Hit Radius. */
export function joystickHitRadiusRg(scale: number): number {
  return JOYSTICK_BASE_R_PX / scale;
}

/** 선택된 볼 기준 Pad 중심 (Rg). Render와 동일 식 (SSOT). */
export function computeJoystickCenterRg(
  ballPos: PointRg,
  ballRadiusRg: number,
  scale: number
): PointRg {
  let dx = TABLE_CENTER_RG.x - ballPos.x;
  let dy = TABLE_CENTER_RG.y - ballPos.y;
  let len = Math.hypot(dx, dy);

  if (len < 1e-6) {
    dx = 0;
    dy = -1;
    len = 1;
  }

  const offsetRg = ballRadiusRg + joystickHitRadiusRg(scale);

  return {
    x: clampNum(ballPos.x + (dx / len) * offsetRg, CLAMP_MIN_X, CLAMP_MAX_X),
    y: clampNum(ballPos.y + (dy / len) * offsetRg, CLAMP_MIN_Y, CLAMP_MAX_Y),
  };
}

/** Fine Controller directional hit-zone (SVG viewBox px) — Render/Placement 공용. */
export const FINE_CTRL_ZONE_INNER_PX = 24;
export const FINE_CTRL_ZONE_OUTER_PX = 120;
/** Joystick hit boundary와 Fine hit boundary 사이 최소 빈 공간 (Rg). */
export const FINE_CTRL_INTERACTION_GAP_RG = 3;

/** Fine Controller 중심 (Rg). Joystick 너머 같은 Ball→Center vector를 따른다. */
export function computeFineControllerCenterRg(
  ballPos: PointRg,
  ballRadiusRg: number,
  scale: number
): PointRg {
  let dx = TABLE_CENTER_RG.x - ballPos.x;
  let dy = TABLE_CENTER_RG.y - ballPos.y;
  let len = Math.hypot(dx, dy);

  if (len < 1e-6) {
    dx = 0;
    dy = -1;
    len = 1;
  }

  const ux = dx / len;
  const uy = dy / len;
  const joystickExtent = joystickHitRadiusRg(scale);
  const joystickOffset = ballRadiusRg + joystickExtent;
  const fineInwardRg = (FINE_CTRL_ZONE_OUTER_PX / scale) * (Math.abs(ux) + Math.abs(uy));
  const fineOffset =
    joystickOffset + joystickExtent + FINE_CTRL_INTERACTION_GAP_RG + fineInwardRg;

  return {
    x: clampNum(ballPos.x + ux * fineOffset, CLAMP_MIN_X, CLAMP_MAX_X),
    y: clampNum(ballPos.y + uy * fineOffset, CLAMP_MIN_Y, CLAMP_MAX_Y),
  };
}

/** pointer(Rg)가 Pad 안쪽인지 — 볼 hit-test보다 우선 판정. */
export function isPointerOnJoystick(
  pointerRg: PointRg | null | undefined,
  ballPos: PointRg | null | undefined,
  ballRadiusRg: number,
  scale: number
): boolean {
  if (!pointerRg || !ballPos) return false;
  if (!Number.isFinite(pointerRg.x) || !Number.isFinite(pointerRg.y)) return false;
  if (!Number.isFinite(ballPos.x) || !Number.isFinite(ballPos.y)) return false;

  const center = computeJoystickCenterRg(ballPos, ballRadiusRg, scale);
  const dist = Math.hypot(pointerRg.x - center.x, pointerRg.y - center.y);
  return dist <= joystickHitRadiusRg(scale);
}

/** Fine Controller hit kind — App render zone 기하와 동일 SSOT. */
export type FineCtrlHitKind = "center" | "up" | "down" | "left" | "right";

export type FineCtrlHit = {
  kind: FineCtrlHitKind;
  dirX: number;
  dirY: number;
};

/**
 * pointer(Rg)가 Fine Controller hit zone 안인지.
 * Render rect 기하와 동일 (SVG y-down 상대좌표 · non-overlapping plus).
 *
 * Hit priority (App): Handles → Joystick → Ball → Fine → Empty.
 * Ball과 겹치면 App이 Ball을 우선하므로 이 함수는 Ball miss 이후에만 호출한다.
 */
export function resolveFineControllerHit(
  pointerRg: PointRg | null | undefined,
  selectedBallPos: PointRg | null | undefined,
  ballRadiusRg: number,
  scale: number
): FineCtrlHit | null {
  if (!pointerRg || !selectedBallPos) return null;
  if (!Number.isFinite(pointerRg.x) || !Number.isFinite(pointerRg.y)) return null;
  if (!Number.isFinite(selectedBallPos.x) || !Number.isFinite(selectedBallPos.y)) {
    return null;
  }
  if (!Number.isFinite(scale) || scale <= 0) return null;

  const fc = computeFineControllerCenterRg(
    selectedBallPos,
    ballRadiusRg,
    scale
  );
  // SVG viewBox px relative to Fine center (y down) — matches App.jsx zone rects
  const sx = (pointerRg.x - fc.x) * scale;
  const sy = (fc.y - pointerRg.y) * scale;
  const inner = FINE_CTRL_ZONE_INNER_PX;
  const outer = FINE_CTRL_ZONE_OUTER_PX;

  if (Math.abs(sx) <= inner && Math.abs(sy) <= inner) {
    return { kind: "center", dirX: 0, dirY: 0 };
  }
  if (Math.abs(sx) <= outer && sy >= -outer && sy < -inner) {
    return { kind: "up", dirX: 0, dirY: 1 };
  }
  if (Math.abs(sx) <= outer && sy > inner && sy <= outer) {
    return { kind: "down", dirX: 0, dirY: -1 };
  }
  if (sx >= -outer && sx < -inner && Math.abs(sy) <= inner) {
    return { kind: "left", dirX: -1, dirY: 0 };
  }
  if (sx > inner && sx <= outer && Math.abs(sy) <= inner) {
    return { kind: "right", dirX: 1, dirY: 0 };
  }
  return null;
}

/** Fine zone 안 여부 (center 포함). */
export function isPointerOnFineController(
  pointerRg: PointRg | null | undefined,
  selectedBallPos: PointRg | null | undefined,
  ballRadiusRg: number,
  scale: number
): boolean {
  return (
    resolveFineControllerHit(
      pointerRg,
      selectedBallPos,
      ballRadiusRg,
      scale
    ) != null
  );
}
