/**
 * anchorLookupEngine.ts
 * anchors.json SSOT: sys 값 → 앵커 좌표 직접 매핑 (선형 보간, fgToRg 없음)
 */

import { getAnchorsForSystem, type AnchorsData } from "../data/systems/anchorsRegistry";

const FRAME_TOL = 1e-3;

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
  lookupMark: AnchorLookupMark
): PointSys[] {
  const trackData = anchorsData?.trajectories?.[track];
  const list = trackData?.anchors;
  if (!list?.length) return [];

  const accepted = ANCHOR_JSON_MARKS_FOR_LOOKUP[lookupMark];
  const out: PointSys[] = [];
  for (const item of list) {
    const p = parseAnchorIdFromJson(item.id);
    if (p && accepted.includes(p.mark)) {
      out.push({ x: p.x, y: p.y, sys: p.sys });
    }
  }
  return out.sort((a, b) => a.sys - b.sys);
}

export type GetAnchorCoordFromSysInput = {
  systemId: string;
  track: string | null | undefined;
  mark: AnchorLookupMark;
  sysValue: number;
};

/**
 * sys 값 → anchors.json 기반 좌표 + valueSpace (Fg/Rg, 좌표 기준 규칙)
 */
export function getAnchorCoordFromSys(
  input: GetAnchorCoordFromSysInput
): AnchorLookupResult | null {
  const { systemId, track, mark, sysValue } = input;
  if (!track || !Number.isFinite(sysValue)) return null;

  const sid = systemId === "5_HALF" ? "5_half_system" : systemId;
  const anchorsData = getAnchorsForSystem(sid);
  if (!anchorsData) return null;

  const points = collectPointsForMark(anchorsData, track, mark);
  if (!points.length) return null;
  console.log("[ANCHOR_RAW]", {
    stage: "anchorLookupEngine:getAnchorCoordFromSys",
    systemId: sid,
    track,
    mark,
    sysValue,
    points,
  });

  const coord = interpolatePoints(points, sysValue);
  const valueSpace = coordValueSpace(coord.x, coord.y);

  return { coord, valueSpace };
}
