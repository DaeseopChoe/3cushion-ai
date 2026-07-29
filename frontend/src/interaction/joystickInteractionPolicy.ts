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
