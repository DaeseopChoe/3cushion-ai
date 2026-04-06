/**
 * FG에서 쿠션 라인 기준 단위 법선 — 플레이 영역 안쪽에서 프레임(바깥) 방향.
 * fgToRg / toPx와 독립적인 순수 기하.
 */
export type RailLineFG = { x: number | null; y: number | null };

export function getRailOutwardUnitNormalFG(railLine: RailLineFG): { x: number; y: number } {
  if (railLine.y === 42.25) return { x: 0, y: 1 };
  if (railLine.y === -2.25) return { x: 0, y: -1 };
  if (railLine.x === -2.25) return { x: -1, y: 0 };
  if (railLine.x === 82.25) return { x: 1, y: 0 };
  return { x: 0, y: 0 };
}
