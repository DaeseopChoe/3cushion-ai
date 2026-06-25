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

/** FG 레일 판정용 상수 */
const FG_BOTTOM_Y = -2.25;
const FG_TOP_Y = 42.25;
const FG_LEFT_X = -2.25;
const FG_RIGHT_X = 82.25;

export type Rail = "BOTTOM" | "TOP" | "LEFT" | "RIGHT";

/** B2T/T2B 트랙에서 CO 출발 레일 (computeRailImpactPoint·기준선 CO 드래그와 동일) */
export function coDepartureRailForTrack(
  track: string | null | undefined
): Rail {
  if (track?.startsWith("T2B")) return "TOP";
  return "BOTTOM";
}

/** B2T/T2B 트랙에서 C1 도착 레일 (기준선 C1 드래그 스냅과 동일) */
export function c1ArrivalRailForTrack(
  track: string | null | undefined
): Rail {
  if (track?.startsWith("T2B")) return "BOTTOM";
  return "TOP";
}

/**
 * 포인터 Rg 좌표를 지정 레일 축에 투영 (한 축만 이동).
 */
export function projectPointToRail(
  p: Point | null | undefined,
  rail: Rail
): Point | null {
  if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
  switch (rail) {
    case "BOTTOM":
      return {
        x: Math.max(0, Math.min(RG_W, p.x)),
        y: 0,
      };
    case "TOP":
      return {
        x: Math.max(0, Math.min(RG_W, p.x)),
        y: RG_H,
      };
    case "LEFT":
      return {
        x: 0,
        y: Math.max(0, Math.min(RG_H, p.y)),
      };
    case "RIGHT":
      return {
        x: RG_W,
        y: Math.max(0, Math.min(RG_H, p.y)),
      };
    default:
      return null;
  }
}

/**
 * rail 안쪽 좌표를 rail 위로 스냅
 * C3 등이 rail 위가 아닌 rail 내부에 있을 때 detectRail/교점 계산용
 */
export function snapToRail(p: Point | null | undefined, eps = 3): Point | null {
  if (!p || typeof p.x !== "number" || typeof p.y !== "number") return null;
  if (Math.abs(p.y - 0) < eps) return { x: p.x, y: 0 };
  if (Math.abs(p.y - RG_H) < eps) return { x: p.x, y: RG_H };
  if (Math.abs(p.x - 0) < eps) return { x: 0, y: p.y };
  if (Math.abs(p.x - RG_W) < eps) return { x: RG_W, y: p.y };
  return p;
}

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

/** RG 레일 근접 판정 허용 오차 (FG/RG 좌표 모두 대응) */
const RAIL_TOLERANCE = 5;

/**
 * CO, C1 좌표로부터 레일 교점(CO_rail, C1_rail) 계산
 * FG (y=-2.25/42.25) 및 RG (y=0/40, x=0/80) 좌표 모두 지원
 * TOP, BOTTOM, LEFT, RIGHT 4개 레일 처리
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

  /** p가 레일 위/근처인지 판정 (FG 또는 RG) */
  const isOnBottom = (p: Point) =>
    Math.abs(p.y - FG_BOTTOM_Y) < RAIL_TOLERANCE || Math.abs(p.y - 0) < RAIL_TOLERANCE;
  const isOnTop = (p: Point) =>
    Math.abs(p.y - FG_TOP_Y) < RAIL_TOLERANCE || Math.abs(p.y - RG_H) < RAIL_TOLERANCE;
  const isOnLeft = (p: Point) =>
    Math.abs(p.x - FG_LEFT_X) < RAIL_TOLERANCE || Math.abs(p.x - 0) < RAIL_TOLERANCE;
  const isOnRight = (p: Point) =>
    Math.abs(p.x - FG_RIGHT_X) < RAIL_TOLERANCE || Math.abs(p.x - RG_W) < RAIL_TOLERANCE;

  // CO 레일 교점
  if (isOnBottom(CO_fg)) {
    const pt = lineRailIntersection(line, "BOTTOM");
    if (pt) CO_rail = pt;
  } else if (isOnTop(CO_fg)) {
    const pt = lineRailIntersection(line, "TOP");
    if (pt) CO_rail = pt;
  } else if (isOnLeft(CO_fg)) {
    const pt = lineRailIntersection(line, "LEFT");
    if (pt) CO_rail = pt;
  } else if (isOnRight(CO_fg)) {
    const pt = lineRailIntersection(line, "RIGHT");
    if (pt) CO_rail = pt;
  }

  // C1 레일 교점
  if (isOnBottom(C1_fg)) {
    const pt = lineRailIntersection(line, "BOTTOM");
    if (pt) C1_rail = pt;
  } else if (isOnTop(C1_fg)) {
    const pt = lineRailIntersection(line, "TOP");
    if (pt) C1_rail = pt;
  } else if (isOnLeft(C1_fg)) {
    const pt = lineRailIntersection(line, "LEFT");
    if (pt) C1_rail = pt;
  } else if (isOnRight(C1_fg)) {
    const pt = lineRailIntersection(line, "RIGHT");
    if (pt) C1_rail = pt;
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
 * CO→1C→2C→3C→... cushion path 포인트 배열 생성
 * 전체 trajectory 경로: CO_rail, C1_rail, C2, C3, lastAnchor
 */
export function buildCushionPath(
  CO_rail: Point | null | undefined,
  C1_rail: Point | null | undefined,
  C2: Point | null | undefined,
  C3: Point | null | undefined,
  lastAnchor: Point | null | undefined
): Point[] {
  return [CO_rail, C1_rail, C2, C3, lastAnchor].filter((p): p is Point => p != null);
}
