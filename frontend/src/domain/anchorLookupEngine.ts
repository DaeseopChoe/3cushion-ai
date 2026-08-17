/**
 * anchorLookupEngine.ts
 * anchors.json SSOT: sys ↔ 앵커 좌표 (선형 보간, clamp, 외삽 없음).
 * `_r` 필드로 조회할 때는 Rg 좌표가 나오도록 Rg 앵커만 쓰거나, Fg 보간 결과를 fgToRg 한다.
 *
 * Batch 6 STEP 6-5: anchors via App-bound Contract supply (D-007 Domain Closed).
 */

import { fgToRg, rgToFg } from "./finalCoordinateEngine";
import {
  resolveDomainAnchorsData,
  type DomainAnchorsData,
} from "./runtimeContractSupply";

const FRAME_TOL = 1e-3;

export type AnchorsData = DomainAnchorsData;

export type AnchorLookupMark =
  | "CO"
  | "C1"
  | "C2"
  | "C3"
  | "C4"
  | "C5"
  | "C6";

export type AnchorLookupResult = {
  coord: { x: number; y: number };
  valueSpace: "Fg" | "Rg";
};

/**
 * anchors.json id 접두(parsed mark)는 CO / C1 … 형식. lookup mark와 동일한 접두만 수집한다.
 */
const ANCHOR_JSON_MARKS_FOR_LOOKUP: Record<
  AnchorLookupMark,
  readonly string[]
> = {
  CO: ["CO"],
  C1: ["C1"],
  C2: ["C2"],
  C3: ["C3"],
  C4: ["C4"],
  C5: ["C5"],
  C6: ["C6"],
};

/**
 * id 파싱: <ID>_(x,y)_<sys>
 */
export function parseAnchorIdFromJson(id: string): {
  mark: string;
  x: number;
  y: number;
  sys: number;
} | null {
  if (!id || typeof id !== "string") return null;
  const match = id.match(/^(\w+)_\(([^,]+),([^)]+)\)_(.+)$/);
  if (!match) return null;
  const x = parseFloat(match[2]);
  const y = parseFloat(match[3]);
  const sys = parseFloat(match[4]);
  if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(sys)) return null;
  return { mark: match[1], x, y, sys };
}

function coordValueSpace(x: number, y: number): "Fg" | "Rg" {
  if (
    Math.abs(y - 42.25) < FRAME_TOL ||
    Math.abs(y - (-2.25)) < FRAME_TOL ||
    Math.abs(x - (-2.25)) < FRAME_TOL ||
    Math.abs(x - 82.25) < FRAME_TOL
  ) {
    return "Fg";
  }
  return "Rg";
}

/** anchors.json id 좌표 (x,y)의 값 공간 — getAnchorCoordFromSys와 동일 */
export function inferAnchorCoordValueSpace(x: number, y: number): "Fg" | "Rg" {
  return coordValueSpace(x, y);
}

type PointSys = { x: number; y: number; sys: number };

function interpolatePoints(sorted: PointSys[], sysValue: number): { x: number; y: number } {
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (sysValue <= first.sys) return { x: first.x, y: first.y };
  if (sysValue >= last.sys) return { x: last.x, y: last.y };

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (sysValue >= a.sys && sysValue <= b.sys) {
      const t = (sysValue - a.sys) / (b.sys - a.sys);
      return {
        x: a.x + t * (b.x - a.x),
        y: a.y + t * (b.y - a.y),
      };
    }
  }
  return { x: last.x, y: last.y };
}

function collectPointsForMark(
  anchorsData: AnchorsData | undefined,
  track: string,
  lookupMark: AnchorLookupMark,
  options?: { rgOnly?: boolean }
): PointSys[] {
  const trackData = anchorsData?.trajectories?.[track];
  const list = trackData?.anchors;
  if (!list?.length) return [];

  const accepted = ANCHOR_JSON_MARKS_FOR_LOOKUP[lookupMark];
  const out: PointSys[] = [];
  for (const item of list) {
    const p = parseAnchorIdFromJson(item.id);
    if (p && accepted.includes(p.mark)) {
      if (options?.rgOnly && coordValueSpace(p.x, p.y) !== "Rg") continue;
      out.push({ x: p.x, y: p.y, sys: p.sys });
    }
  }
  return out.sort((a, b) => a.sys - b.sys);
}

function loadMarkPointsForLookup(
  anchorsData: AnchorsData,
  track: string,
  mark: AnchorLookupMark,
  sysFieldKey?: string
): PointSys[] {
  const wantsRgCoord =
    typeof sysFieldKey === "string" && /_r$/.test(sysFieldKey);

  let points = collectPointsForMark(anchorsData, track, mark);
  if (wantsRgCoord) {
    const rgOnly = collectPointsForMark(anchorsData, track, mark, {
      rgOnly: true,
    });
    if (rgOnly.length) {
      points = rgOnly;
    }
  }
  return points;
}

function coordsMatch(a: PointSys | { x: number; y: number }, b: { x: number; y: number }): boolean {
  return Math.abs(a.x - b.x) <= FRAME_TOL && Math.abs(a.y - b.y) <= FRAME_TOL;
}

function sysValuesAgree(values: number[]): number | null {
  if (!values.length) return null;
  const first = values[0];
  for (let i = 1; i < values.length; i++) {
    if (Math.abs(values[i] - first) > 1e-6) return null;
  }
  return first;
}

function inClosedSpan(value: number, a: number, b: number): boolean {
  const lo = Math.min(a, b) - FRAME_TOL;
  const hi = Math.max(a, b) + FRAME_TOL;
  return value >= lo && value <= hi;
}

type SegmentAxis = "x" | "y" | "both" | "degenerate";

function segmentAxis(a: PointSys, b: PointSys): SegmentAxis {
  const dx = Math.abs(b.x - a.x);
  const dy = Math.abs(b.y - a.y);
  if (dx <= FRAME_TOL && dy <= FRAME_TOL) return "degenerate";
  if (dy <= FRAME_TOL) return "x";
  if (dx <= FRAME_TOL) return "y";
  return "both";
}

function sysOnSegment(
  a: PointSys,
  b: PointSys,
  coord: { x: number; y: number }
): number | null {
  const axis = segmentAxis(a, b);
  if (axis === "degenerate") {
    return coordsMatch(a, coord) ? a.sys : null;
  }

  let t: number;
  if (axis === "x") {
    if (Math.abs(coord.y - a.y) > FRAME_TOL) return null;
    if (!inClosedSpan(coord.x, a.x, b.x)) return null;
    t = (coord.x - a.x) / (b.x - a.x);
  } else if (axis === "y") {
    if (Math.abs(coord.x - a.x) > FRAME_TOL) return null;
    if (!inClosedSpan(coord.y, a.y, b.y)) return null;
    t = (coord.y - a.y) / (b.y - a.y);
  } else {
    const dx = Math.abs(b.x - a.x);
    const dy = Math.abs(b.y - a.y);
    const useX = dx >= dy;
    if (useX) {
      if (!inClosedSpan(coord.x, a.x, b.x)) return null;
      t = (coord.x - a.x) / (b.x - a.x);
      const expectedY = a.y + t * (b.y - a.y);
      if (Math.abs(coord.y - expectedY) > FRAME_TOL) return null;
    } else {
      if (!inClosedSpan(coord.y, a.y, b.y)) return null;
      t = (coord.y - a.y) / (b.y - a.y);
      const expectedX = a.x + t * (b.x - a.x);
      if (Math.abs(coord.x - expectedX) > FRAME_TOL) return null;
    }
  }

  if (!Number.isFinite(t)) return null;
  const clampedT = Math.min(1, Math.max(0, t));
  return a.sys + clampedT * (b.sys - a.sys);
}

type RailRun = {
  axis: "x" | "y";
  constant: number;
  knots: PointSys[];
};

function collectAxisAlignedRailRuns(points: PointSys[]): RailRun[] {
  const runs: RailRun[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const a = points[i];
    const b = points[i + 1];
    const axis = segmentAxis(a, b);
    if (axis !== "x" && axis !== "y") continue;
    const constant = axis === "x" ? a.y : a.x;
    const prev = runs[runs.length - 1];
    if (
      prev &&
      prev.axis === axis &&
      Math.abs(prev.constant - constant) <= FRAME_TOL
    ) {
      prev.knots.push(b);
    } else {
      runs.push({ axis, constant, knots: [a, b] });
    }
  }
  return runs;
}

function nearestRailEndpointSys(
  run: RailRun,
  coord: { x: number; y: number }
): number | null {
  if (run.axis === "x") {
    if (Math.abs(coord.y - run.constant) > FRAME_TOL) return null;
    const xs = run.knots.map((k) => k.x);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    if (coord.x >= minX - FRAME_TOL && coord.x <= maxX + FRAME_TOL) {
      return null;
    }
    const targetX = coord.x < minX ? minX : maxX;
    const end = run.knots.reduce((best, k) =>
      Math.abs(k.x - targetX) < Math.abs(best.x - targetX) ? k : best
    );
    return end.sys;
  }

  if (Math.abs(coord.x - run.constant) > FRAME_TOL) return null;
  const ys = run.knots.map((k) => k.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  if (coord.y >= minY - FRAME_TOL && coord.y <= maxY + FRAME_TOL) {
    return null;
  }
  const targetY = coord.y < minY ? minY : maxY;
  const end = run.knots.reduce((best, k) =>
    Math.abs(k.y - targetY) < Math.abs(best.y - targetY) ? k : best
  );
  return end.sys;
}

/**
 * anchors 점열에서 coord → sys 역조회.
 * 구간 축(또는 대각선의 주축)만 사용하고, 2D nearest는 쓰지 않는다.
 * 범위 밖은 해당 rail 끝점 sys로 clamp. 모호하면 null.
 */
function invertCoordToSys(
  points: PointSys[],
  coord: { x: number; y: number }
): number | null {
  if (!points.length) return null;
  if (!Number.isFinite(coord.x) || !Number.isFinite(coord.y)) return null;

  const knotHits = points.filter((p) => coordsMatch(p, coord));
  if (knotHits.length) {
    return sysValuesAgree(knotHits.map((p) => p.sys));
  }

  const segmentHits: number[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const sys = sysOnSegment(points[i], points[i + 1], coord);
    if (sys != null) segmentHits.push(sys);
  }
  const fromSegments = sysValuesAgree(segmentHits);
  if (fromSegments != null) return fromSegments;
  if (segmentHits.length) return null;

  const clampHits: number[] = [];
  for (const run of collectAxisAlignedRailRuns(points)) {
    const sys = nearestRailEndpointSys(run, coord);
    if (sys != null) clampHits.push(sys);
  }
  return sysValuesAgree(clampHits);
}

export type GetAnchorCoordFromSysInput = {
  systemId: string;
  track: string | null | undefined;
  mark: AnchorLookupMark;
  sysValue: number;
  /** systemValues에서 실제로 쓰인 키(예: C3_r). `_r`이면 coord를 Rg 기준으로 맞춤. */
  sysFieldKey?: string;
};

/**
 * sys 값 → anchors 기반 좌표 + valueSpace (Fg/Rg, 좌표 기준 규칙).
 * Anchors from App-bound Contract supply (D-007).
 */
export function getAnchorCoordFromSys(
  input: GetAnchorCoordFromSysInput
): AnchorLookupResult | null {
  const { systemId, track, mark, sysValue, sysFieldKey } = input;
  if (!track || !Number.isFinite(sysValue)) return null;

  const wantsRgCoord =
    typeof sysFieldKey === "string" && /_r$/.test(sysFieldKey);

  const sid = systemId === "5_HALF" ? "5_half_system" : systemId;
  const anchorsData = resolveDomainAnchorsData(sid);
  if (!anchorsData) return null;

  const points = loadMarkPointsForLookup(anchorsData, track, mark, sysFieldKey);
  if (!points.length) return null;

  console.log("[ANCHOR_RAW]", {
    stage: "anchorLookupEngine:getAnchorCoordFromSys",
    systemId: sid,
    track,
    mark,
    sysValue,
    sysFieldKey,
    wantsRgCoord,
    points,
  });

  const coord = interpolatePoints(points, sysValue);
  let outCoord = coord;
  let valueSpace = coordValueSpace(coord.x, coord.y);

  if (wantsRgCoord && valueSpace === "Fg") {
    outCoord = fgToRg(coord);
    valueSpace = "Rg";
  }

  return { coord: outCoord, valueSpace };
}

export type GetSysValueFromAnchorCoordInput = {
  systemId: string;
  track: string | null | undefined;
  mark: AnchorLookupMark;
  coord: { x: number; y: number };
  /** getAnchorCoordFromSys와 동일. `_r`이면 Rg 점열(없으면 Fg 점열 + rg→Fg)을 쓴다. */
  sysFieldKey?: string;
};

/**
 * coord → anchors.json 점열 기반 sys 역조회.
 * 해당 track/mark 점열의 segment 축만 사용. 선형 역보간, 범위 밖 clamp, 외삽 없음.
 */
export function getSysValueFromAnchorCoord(
  input: GetSysValueFromAnchorCoordInput
): number | null {
  const { systemId, track, mark, coord, sysFieldKey } = input;
  if (!track || !coord) return null;
  if (!Number.isFinite(coord.x) || !Number.isFinite(coord.y)) return null;

  const wantsRgCoord =
    typeof sysFieldKey === "string" && /_r$/.test(sysFieldKey);

  const sid = systemId === "5_HALF" ? "5_half_system" : systemId;
  const anchorsData = resolveDomainAnchorsData(sid);
  if (!anchorsData) return null;

  const rgOnly = wantsRgCoord
    ? collectPointsForMark(anchorsData, track, mark, { rgOnly: true })
    : [];
  const points = loadMarkPointsForLookup(anchorsData, track, mark, sysFieldKey);
  if (!points.length) return null;

  let lookupCoord = coord;
  if (wantsRgCoord && !rgOnly.length && coordValueSpace(coord.x, coord.y) === "Rg") {
    lookupCoord = rgToFg(coord);
  }

  return invertCoordToSys(points, lookupCoord);
}
