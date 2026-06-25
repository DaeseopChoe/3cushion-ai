/**
 * line.ts — 직선 파라미터 계산
 * App.jsx CO→C1 rail 교점 계산에서 분리
 */

export type Point = { x: number; y: number };

export interface LineParams {
  dx: number;
  dy: number;
  slope: number;
  intercept: number;
}

/**
 * 두 점을 지나는 직선의 파라미터 계산
 * y = slope * x + intercept
 */
export function computeLineFromPoints(p1: Point, p2: Point): LineParams {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const slope = Math.abs(dx) < 1e-10 ? 0 : dy / dx;
  const intercept = p1.y - slope * p1.x;
  return { dx, dy, slope, intercept };
}
