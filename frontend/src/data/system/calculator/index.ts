/**
 * 타겟볼 기준 임팩트볼·두께 관련 계산
 * - UI/Controller 레이어에서 분리된 순수 계산 모듈
 */

import type { Point } from "./types";

const BALL_DIAMETER_MM = 61.5;
const RG_UNIT_MM = 35.55;
const BALL_DIAMETER_RG = BALL_DIAMETER_MM / RG_UNIT_MM;
const BALL_RADIUS_RG = BALL_DIAMETER_RG / 2;

/**
 * T값 파싱
 * @param {string} T - "8/8", "+3/8", "-0/8" 등
 * @returns {{ direction: -1|0|1, numerator: number, denominator: number }}
 */
function parseT(T: string) {
  if (!T) {
    console.warn("parseT: T값 없음, 기본값 8/8 사용");
    return { direction: 0, numerator: 8, denominator: 8 };
  }

  if (T === "8/8") {
    return { direction: 0, numerator: 8, denominator: 8 };
  }

  const sign = T[0];
  if (sign !== "+" && sign !== "-") {
    console.warn("parseT: 부호 없음, fallback 8/8", T);
    return { direction: 0, numerator: 8, denominator: 8 };
  }

  const direction = sign === "+" ? 1 : -1;
  const fraction = T.slice(1);

  if (!fraction.includes("/")) {
    console.warn("parseT: 분수 형식 아님, fallback 8/8", T);
    return { direction: 0, numerator: 8, denominator: 8 };
  }

  const parts = fraction.split("/");
  const numerator = Number(parts[0]);
  const denominator = Number(parts[1]);

  if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
    console.warn("parseT: 숫자 파싱 실패, fallback 8/8", T);
    return { direction: 0, numerator: 8, denominator: 8 };
  }

  return { direction, numerator, denominator };
}

/**
 * 타겟볼 기준 임팩트볼 위치 계산
 *
 * 개념 고정:
 * - 순서: cue → impact → target
 * - 타겟볼이 주체
 * - 접점이 먼저, ImpactBall은 결과
 * - ImpactBall = 접점에서 큐볼 방향으로 BALL_RADIUS 이동
 */
export function calcImpactBall(
  cue: Point | null,
  target: Point | null,
  T: string
): Point | null {
  if (!cue || !target) {
    console.warn("calcImpactBall: 큐볼 또는 타겟볼 없음");
    return null;
  }

  const { direction, numerator, denominator } = parseT(T);

  const dx = target.x - cue.x;
  const dy = target.y - cue.y;
  const dist = Math.hypot(dx, dy);

  if (dist < 1e-6) {
    console.warn("calcImpactBall: 큐볼과 타겟볼이 겹침");
    return { x: target.x, y: target.y };
  }

  const ux = dx / dist;
  const uy = dy / dist;

  if (T === "8/8") {
    const contactX = target.x - ux * BALL_RADIUS_RG;
    const contactY = target.y - uy * BALL_RADIUS_RG;
    return {
      x: contactX - ux * BALL_RADIUS_RG,
      y: contactY - uy * BALL_RADIUS_RG,
    };
  }

  const vx = direction * uy;
  const vy = direction * -ux;
  const offset = (numerator / denominator) * BALL_DIAMETER_RG;
  const surfaceX = target.x - ux * BALL_RADIUS_RG;
  const surfaceY = target.y - uy * BALL_RADIUS_RG;
  const rawContactX = surfaceX + vx * offset;
  const rawContactY = surfaceY + vy * offset;
  const dcx = rawContactX - target.x;
  const dcy = rawContactY - target.y;
  const distContact = Math.hypot(dcx, dcy);

  if (distContact < 1e-6) {
    console.warn("calcImpactBall: 접점이 타겟볼 중심과 겹침");
    return {
      x: target.x - ux * BALL_RADIUS_RG * 2,
      y: target.y - uy * BALL_RADIUS_RG * 2,
    };
  }

  const contactX = target.x + (dcx / distContact) * BALL_RADIUS_RG;
  const contactY = target.y + (dcy / distContact) * BALL_RADIUS_RG;
  const towardsCueX = cue.x - contactX;
  const towardsCueY = cue.y - contactY;
  const distToCue = Math.hypot(towardsCueX, towardsCueY);

  if (distToCue < 1e-6) {
    console.warn("calcImpactBall: 접점이 큐볼과 겹침");
    return {
      x: contactX - ux * BALL_RADIUS_RG,
      y: contactY - uy * BALL_RADIUS_RG,
    };
  }

  const ucx = towardsCueX / distToCue;
  const ucy = towardsCueY / distToCue;
  return {
    x: contactX + ucx * BALL_RADIUS_RG,
    y: contactY + ucy * BALL_RADIUS_RG,
  };
}
