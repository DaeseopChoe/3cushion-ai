/**
 * anchorLookupEngine.ts
 * anchors.json SSOT: sys 값 → 앵커 좌표 직접 매핑 (선형 보간).
 * `_r` 필드로 조회할 때는 Rg 좌표가 나오도록 Rg 앵커만 쓰거나, Fg 보간 결과를 fgToRg 한다.
 *
 * Batch 6 STEP 6-5: anchors via App-bound Contract supply (D-007 Domain Closed).
 */

import { fgToRg } from "./finalCoordinateEngine";
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

  let points = collectPointsForMark(anchorsData, track, mark);
  if (!points.length) return null;

  if (wantsRgCoord) {
    const rgOnly = collectPointsForMark(anchorsData, track, mark, {
      rgOnly: true,
    });
    if (rgOnly.length) {
      points = rgOnly;
    }
  }

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
