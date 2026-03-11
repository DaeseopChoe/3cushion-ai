/**
 * rail.ts — 직선·레일 교점 계산
 * App.jsx CO→C1 rail 교점 계산에서 분리
 */

import {
  computeLineFromPoints,
  type LineParams,
  type Point,
} from "./line";

const RG_W = 80;
const RG_H = 40;

/** Fg 레일 판정용 상수 (기존 로직 유지) */
const FG_BOTTOM_Y = -2.25;
const FG_TOP_Y = 42.25;

export type Rail = "BOTTOM" | "TOP" | "LEFT" | "RIGHT";

/**
 * 직선과 레일의 교점 계산
 * @param line - computeLineFromPoints로 얻은 직선 파라미터
 * @param rail - 레일 방향
 * @returns Rg 좌표 또는 null (교점 없음)
 */
export function lineRailIntersection(
  line: LineParams,
  rail: Rail
): Point | null {
  const { slope, intercept } = line;

  switch (rail) {
    case "BOTTOM": {
      // y = 0
      if (Math.abs(slope) < 1e-10) return null;
      const x = (0 - intercept) / slope;
      if (x >= -0.5 && x <= RG_W + 0.5) return { x, y: 0 };
      return null;
    }
    case "TOP": {
      // y = 40
      if (Math.abs(slope) < 1e-10) return null;
      const x = (RG_H - intercept) / slope;
      if (x >= -0.5 && x <= RG_W + 0.5) return { x, y: RG_H };
      return null;
    }
    case "LEFT": {
      // x = 0
      const y = intercept;
      if (y >= -0.5 && y <= RG_H + 0.5) return { x: 0, y };
      return null;
    }
    case "RIGHT": {
      // x = 80
      const y = slope * RG_W + intercept;
      if (y >= -0.5 && y <= RG_H + 0.5) return { x: RG_W, y };
      return null;
    }
  }
}

/**
 * CO, C1 좌표(Fg)로부터 레일 교점(CO_rail, C1_rail) 계산
 * 기존 App.jsx 3238~3272 로직 그대로 이동
 */
export function computeRailPoints(
  CO_fg: Point | undefined | null,
  C1_fg: Point | undefined | null
): { CO_rail: Point; C1_rail: Point } | { CO_rail: Point | null; C1_rail: Point | null } {
  let CO_rail: Point | null = CO_fg ?? null;
  let C1_rail: Point | null = C1_fg ?? null;

  if (!CO_fg || !C1_fg) {
    return { CO_rail, C1_rail };
  }

  const line = computeLineFromPoints(CO_fg, C1_fg);

  if (Math.abs(line.dy) > 0.01) {
    const m = line.slope;
    const b = line.intercept;

    // B2T: CO=BOTTOM, 1C=TOP
    if (Math.abs(CO_fg.y - FG_BOTTOM_Y) < 0.5) {
      const pt = lineRailIntersection(line, "BOTTOM");
      if (pt) CO_rail = pt;
    }
    if (Math.abs(C1_fg.y - FG_TOP_Y) < 0.5) {
      const pt = lineRailIntersection(line, "TOP");
      if (pt) C1_rail = pt;
    }

    // T2B: CO=TOP, 1C=BOTTOM
    if (Math.abs(CO_fg.y - FG_TOP_Y) < 0.5) {
      const pt = lineRailIntersection(line, "TOP");
      if (pt) CO_rail = pt;
    }
    if (Math.abs(C1_fg.y - FG_BOTTOM_Y) < 0.5) {
      const pt = lineRailIntersection(line, "BOTTOM");
      if (pt) C1_rail = pt;
    }
  }

  return {
    CO_rail: CO_rail ?? CO_fg,
    C1_rail: C1_rail ?? C1_fg,
  };
}

/**
 * 두 점을 지나는 직선과 레일의 교점 (파라미터 t 기준)
 * p1 → p2 방향으로 t 증가. CO_rail = p1 뒤편, C1_rail = p2 앞편
 */
export function lineToRailIntersections(
  p1: Point,
  p2: Point
): { CO_rail: Point | null; C1_rail: Point | null } {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  if (Math.abs(dx) < 1e-6 && Math.abs(dy) < 1e-6) {
    return { CO_rail: null, C1_rail: null };
  }
  const intersections: { t: number; pt: Point }[] = [];
  if (Math.abs(dy) > 1e-6) {
    const t_bottom = (0 - p1.y) / dy;
    const t_top = (RG_H - p1.y) / dy;
    if (t_bottom >= -0.01 && t_bottom <= 1.01) {
      const x = p1.x + t_bottom * dx;
      if (x >= -0.5 && x <= RG_W + 0.5)
        intersections.push({ t: t_bottom, pt: { x, y: 0 } });
    }
    if (t_top >= -0.01 && t_top <= 1.01) {
      const x = p1.x + t_top * dx;
      if (x >= -0.5 && x <= RG_W + 0.5)
        intersections.push({ t: t_top, pt: { x, y: RG_H } });
    }
  }
  if (Math.abs(dx) > 1e-6) {
    const t_left = (0 - p1.x) / dx;
    const t_right = (RG_W - p1.x) / dx;
    if (t_left >= -0.01 && t_left <= 1.01) {
      const y = p1.y + t_left * dy;
      if (y >= -0.5 && y <= RG_H + 0.5)
        intersections.push({ t: t_left, pt: { x: 0, y } });
    }
    if (t_right >= -0.01 && t_right <= 1.01) {
      const y = p1.y + t_right * dy;
      if (y >= -0.5 && y <= RG_H + 0.5)
        intersections.push({ t: t_right, pt: { x: RG_W, y } });
    }
  }
  intersections.sort((a, b) => a.t - b.t);
  const behind = intersections.filter((p) => p.t < -0.01);
  const toward = intersections.filter((p) => p.t > 0.01);
  const CO_rail = behind.length > 0 ? behind[behind.length - 1].pt : toward[0]?.pt ?? null;
  const C1_rail = toward.length > 0 ? toward[0].pt : behind[0]?.pt ?? null;
  return { CO_rail, C1_rail };
}

/**
 * C1→C2→C3... cushion path 포인트 배열 생성
 * App.jsx cushionPath 구성 로직 분리
 */
export function buildCushionPath(
  C1_rail: Point | null | undefined,
  C2: Point | null | undefined,
  C3: Point | null | undefined,
  lastAnchor: Point | null | undefined
): Point[] {
  return [C1_rail, C2, C3, lastAnchor].filter((p): p is Point => p != null);
}
