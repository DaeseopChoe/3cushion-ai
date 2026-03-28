/**
 * anchorCoordinateEngine.ts
 * sys values → anchors.json SSOT (anchorLookupEngine), trajectory 앵커 생성
 */

import {
  getAnchorCoordFromSys,
  type AnchorLookupMark,
} from "./anchorLookupEngine";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type ParsedAnchor = {
  mark: string;
  x: number;
  y: number;
  sys: number;
};

export type CoordPoint = {
  x: number;
  y: number;
  sys: number;
};

export type AnchorsData = {
  trajectories?: Record<
    string,
    { anchors?: Array<{ id: string }> }
  >;
};

// ---------------------------------------------------------------------------
// 2-1. parseAnchorId
// ---------------------------------------------------------------------------
/**
 * 앵커 id 파싱 (형식: "CO_(40,-2.25)_30", "C1_(55,42.25)_60")
 */
function parseAnchorId(id: string): ParsedAnchor | null {
  if (!id || typeof id !== "string") return null;
  const match = id.match(/^(\w+)_\(([^,]+),([^)]+)\)_(.+)$/);
  if (!match) return null;
  const x = parseFloat(match[2]);
  const y = parseFloat(match[3]);
  const sys = parseFloat(match[4]);
  if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(sys)) return null;
  return { mark: match[1], x, y, sys };
}

// ---------------------------------------------------------------------------
// 2-2. getTrackAnchors
// ---------------------------------------------------------------------------
function getTrackAnchors(
  anchorsData: AnchorsData | undefined,
  track: string
): ParsedAnchor[] {
  const trackData = anchorsData?.trajectories?.[track];
  const anchors = trackData?.anchors;
  if (!anchors?.length) return [];

  const result: ParsedAnchor[] = [];
  for (const item of anchors) {
    const parsed = parseAnchorId(item.id);
    if (parsed) result.push(parsed);
  }
  return result;
}

// ---------------------------------------------------------------------------
// 2-3. interpolateCoord
// ---------------------------------------------------------------------------
function interpolateCoord(
  points: CoordPoint[],
  sysValue: number
): { x: number; y: number } | null {
  if (!points?.length) return null;

  const sorted = [...points].sort((a, b) => a.sys - b.sys);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];

  if (sysValue <= first.sys) return { x: first.x, y: first.y };
  if (sysValue >= last.sys) return { x: last.x, y: last.y };

  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i];
    const b = sorted[i + 1];
    if (sysValue >= a.sys && sysValue <= b.sys) {
      const t = (sysValue - a.sys) / (b.sys - a.sys);
      const x = a.x + t * (b.x - a.x);
      const y = a.y + t * (b.y - a.y);
      return { x, y };
    }
  }
  return { x: last.x, y: last.y };
}

// ---------------------------------------------------------------------------
// 2-4. extractSysValue
// ---------------------------------------------------------------------------
function extractSysValue(
  sysValues: Record<string, unknown> | undefined,
  candidates: string[]
): number | null {
  const r = extractSysValueWithKey(sysValues, candidates);
  return r?.value ?? null;
}

/** value + 사용된 key 반환 (ANCHOR_SPACE_TRACE용) */
function extractSysValueWithKey(
  sysValues: Record<string, unknown> | undefined,
  candidates: string[]
): { value: number; keyUsed: string } | null {
  if (!sysValues || typeof sysValues !== "object") return null;

  const num = (v: unknown): number | null => {
    if (v === "" || v === null || v === undefined) return null;
    const n = typeof v === "number" ? v : Number(v);
    return typeof n === "number" && !Number.isNaN(n) ? n : null;
  };

  for (const key of candidates) {
    const val = num(sysValues[key]);
    if (val != null) return { value: val, keyUsed: key };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Mark → 출력 키 매핑
// ---------------------------------------------------------------------------
const MARK_TO_OUTPUT_KEY: Record<string, string> = {
  CO: "CO",
  C1: "1C",
  C3: "3C",
  C4: "4C",
  C5: "5C",
  C6: "6C",
};

const MARK_SYS_CANDIDATES: Record<string, string[]> = {
  CO: ["CO_f", "CO_r", "CO"],
  C1: ["C1_f", "C1_r", "oneC", "1C"],
  C3: ["C3_f", "C3_r", "threeC", "3C"],
  C4: ["C4_f", "C4_r", "4C"],
  C5: ["C5_f", "C5_r", "5C"],
  C6: ["C6_f", "C6_r", "6C"],
};

const ENGINE_MARK_TO_LOOKUP_MARK: Record<string, AnchorLookupMark> = {
  CO: "CO",
  C1: "1C",
  C3: "3C",
  C4: "4C",
  C5: "5C",
  C6: "6C",
};

export type AnchorPointWithSpace = {
  coord: { x: number; y: number };
  valueSpace: "Fg" | "Rg";
};

// ---------------------------------------------------------------------------
// 2-5. sysToCoordFromAnchors (anchors.json SSOT 직접 매핑)
// ---------------------------------------------------------------------------
function sysToCoordFromAnchors(
  _anchorsData: AnchorsData | undefined,
  track: string,
  sysValues: Record<string, unknown> | undefined,
  systemId: string
): Record<string, AnchorPointWithSpace> {
  const result: Record<string, AnchorPointWithSpace> = {};

  for (const mark of Object.keys(MARK_TO_OUTPUT_KEY)) {
    const candidates = MARK_SYS_CANDIDATES[mark];
    if (!candidates) continue;

    const extracted = extractSysValueWithKey(sysValues, candidates);
    if (extracted == null) continue;

    const lookupMark = ENGINE_MARK_TO_LOOKUP_MARK[mark];
    if (!lookupMark) continue;

    const hit = getAnchorCoordFromSys({
      systemId,
      track,
      mark: lookupMark,
      sysValue: extracted.value,
    });
    if (!hit) continue;

    const key = MARK_TO_OUTPUT_KEY[mark];
    result[key] = hit;

    console.log("[ANCHOR_SPACE_TRACE]", {
      mark,
      keyUsed: extracted.keyUsed,
      coord: hit.coord,
      valueSpace: hit.valueSpace,
    });
  }

  return result;
}

// ---------------------------------------------------------------------------
// 2-6. getAnchorsForRendering
// ---------------------------------------------------------------------------
export type GetAnchorsForRenderingInput = {
  systemId: string;
  track: string | null;
  sysValues: Record<string, unknown> | undefined;
  anchorsData?: AnchorsData;
  fallback?: Record<string, { x: number; y: number }>;
};

function getAnchorsForRendering(
  input: GetAnchorsForRenderingInput
): Record<string, AnchorPointWithSpace | { x: number; y: number }> {
  const { anchorsData, track, sysValues, fallback, systemId } = input;

  if (
    anchorsData &&
    track &&
    sysValues &&
    typeof sysValues === "object" &&
    Object.keys(sysValues).length > 0
  ) {
    const computed = sysToCoordFromAnchors(anchorsData, track, sysValues, systemId);
    if (Object.keys(computed).length > 0) return computed;
  }

  if (fallback && typeof fallback === "object") return fallback;
  return {};
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------
export {
  parseAnchorId,
  getTrackAnchors,
  interpolateCoord,
  extractSysValue,
  sysToCoordFromAnchors,
  getAnchorsForRendering,
  type AnchorPointWithSpace,
};
