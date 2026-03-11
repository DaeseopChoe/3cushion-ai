/**
 * anchorCoordinateEngine.ts
 * sys values → anchors.json 기반 좌표 계산
 * trajectory 렌더링용 CO, 1C, 3C, 4C, 5C, 6C 앵커 생성
 */

// ---------------------------------------------------------------------------
// FG → RG 변환 (offset 2.25 기준)
// ---------------------------------------------------------------------------
const FG_X_MIN = -2.25;
const FG_X_MAX = 82.25;
const FG_Y_MIN = -2.25;
const FG_Y_MAX = 42.25;
const RG_W = 80;
const RG_H = 40;

function fgToRg(pt: { x: number; y: number }): { x: number; y: number } {
  const x = ((pt.x - FG_X_MIN) / (FG_X_MAX - FG_X_MIN)) * RG_W;
  const y = ((pt.y - FG_Y_MIN) / (FG_Y_MAX - FG_Y_MIN)) * RG_H;
  return { x, y };
}

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
  if (!sysValues || typeof sysValues !== "object") return null;

  const num = (v: unknown): number | null => {
    if (v === "" || v === null || v === undefined) return null;
    const n = typeof v === "number" ? v : Number(v);
    return typeof n === "number" && !Number.isNaN(n) ? n : null;
  };

  for (const key of candidates) {
    const val = num(sysValues[key]);
    if (val != null) return val;
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

// ---------------------------------------------------------------------------
// 2-5. sysToCoordFromAnchors
// ---------------------------------------------------------------------------
function sysToCoordFromAnchors(
  anchorsData: AnchorsData | undefined,
  track: string,
  sysValues: Record<string, unknown> | undefined
): Record<string, { x: number; y: number }> {
  const result: Record<string, { x: number; y: number }> = {};
  const parsed = getTrackAnchors(anchorsData, track);
  if (!parsed.length) return result;

  const byMark: Record<string, CoordPoint[]> = {};
  for (const p of parsed) {
    if (!byMark[p.mark]) byMark[p.mark] = [];
    byMark[p.mark].push({ x: p.x, y: p.y, sys: p.sys });
  }

  for (const mark of Object.keys(MARK_TO_OUTPUT_KEY)) {
    const points = byMark[mark];
    if (!points?.length) continue;

    const candidates = MARK_SYS_CANDIDATES[mark];
    if (!candidates) continue;

    const sysVal = extractSysValue(sysValues, candidates);
    if (sysVal == null) continue;

    const coord = interpolateCoord(points, sysVal);
    if (!coord) continue;

    const rg = fgToRg(coord);
    const key = MARK_TO_OUTPUT_KEY[mark];
    result[key] = rg;
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
): Record<string, { x: number; y: number }> {
  const { anchorsData, track, sysValues, fallback } = input;

  if (anchorsData && track && sysValues && typeof sysValues === "object" && Object.keys(sysValues).length > 0) {
    const computed = sysToCoordFromAnchors(anchorsData, track, sysValues);
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
};
