/**
 * anchorCoordinateEngine.ts
 * sys values → anchors.json SSOT (anchorLookupEngine), trajectory 앵커 생성
 */

import {
  getAnchorCoordFromSys,
  type AnchorLookupMark,
} from "./anchorLookupEngine";

/** DEV: Vite POST `/__debug/ingest` → workspace `debug-6a4663.log` (see vite.config.js) */
function debugIngestUrl(): string {
  return typeof window !== "undefined" ? "/__debug/ingest" : "";
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
// UI/슬롯 키(C1 …) → system values 필드 후보 (엔진 mark 간접층 없음)
// ---------------------------------------------------------------------------
const LABEL_SYS_CANDIDATES: Record<string, string[]> = {
  CO: ["CO_f", "CO_r", "CO"],
  C1: ["C1_f", "C1_r"],
  C2: ["C2_f", "C2_r"],
  C3: ["C3_f", "C3_r"],
  C4: ["C4_f", "C4_r"],
  C5: ["C5_f", "C5_r"],
  C6: ["C6_f", "C6_r"],
};

const SYS_COORD_FROM_ANCHORS_LABEL_ORDER = [
  "CO",
  "C1",
  "C3",
  "C4",
  "C5",
  "C6",
] as const satisfies readonly string[];

/**
 * 슬롯/뷰 병합 system values에서 라벨별 표시 숫자 하나만 추출 (중복 매핑 단일화).
 * C4~C6는 공식/병합 결과 필드(C4_f 등) 우선.
 */
export function getLabelNumericSuffix(
  labelKey: string,
  sysValues: Record<string, unknown> | undefined
): number | null {
  const candidates = LABEL_SYS_CANDIDATES[labelKey];
  if (!candidates) return null;
  return extractSysValue(sysValues, candidates);
}

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

  for (const labelKey of SYS_COORD_FROM_ANCHORS_LABEL_ORDER) {
    const candidates = LABEL_SYS_CANDIDATES[labelKey];
    if (!candidates) continue;

    const extracted = extractSysValueWithKey(sysValues, candidates);
    if (extracted == null) continue;

    const mark = labelKey as AnchorLookupMark;
    const hit = getAnchorCoordFromSys({
      systemId,
      track,
      mark,
      sysValue: extracted.value,
      sysFieldKey: extracted.keyUsed,
    });
    if (!hit) continue;

    result[labelKey] = hit;
    // #region agent log
    if (labelKey === "C3") {
      const comp = result.C3;
      const judgment =
        comp?.valueSpace === "Rg"
          ? "Rg OK"
          : comp?.valueSpace === "Fg"
            ? "H2_FAIL valueSpace Fg"
            : "unknown valueSpace";
      const approxLong32 =
        comp &&
        (Math.abs(comp.coord.x - 32) < 1.5 || Math.abs(comp.coord.y - 32) < 1.5);
      const ingestUrl = debugIngestUrl();
      if (ingestUrl)
        fetch(ingestUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            runId: "c3-rg-check",
            hypothesisId: "H2",
            location: "anchorCoordinateEngine.ts:sysToCoordFromAnchors",
            message: "computed[C3] Rg check (C3_r=32 case)",
            data: {
              computedC3: comp,
              coord: comp?.coord,
              valueSpace: comp?.valueSpace,
              sysFieldKey: extracted.keyUsed,
              sysValue: extracted.value,
              judgment,
              approxAxis32ForSys32: approxLong32,
              track,
              systemId,
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
      console.log(
        "[C3_RG_VERIFY]",
        JSON.stringify({
          computedC3: comp,
          coord: comp?.coord,
          valueSpace: comp?.valueSpace,
          sysFieldKey: extracted.keyUsed,
          sysValue: extracted.value,
          judgment,
          approxAxis32ForSys32: approxLong32,
          track,
          systemId,
        })
      );
    }
    // #endregion
    console.log("[ANCHOR_AFTER_ENGINE]", {
      stage: "anchorCoordinateEngine:sysToCoordFromAnchors",
      systemId,
      track,
      labelKey,
      sysValue: extracted.value,
      keyUsed: extracted.keyUsed,
      coord: hit.coord,
      valueSpace: hit.valueSpace,
    });

    console.log("[ANCHOR_SPACE_TRACE]", {
      labelKey,
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
    // #region agent log
    if ("C3" in computed) {
      const ingestUrl = debugIngestUrl();
      if (ingestUrl)
        fetch(ingestUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            runId: "c3-rg-check",
            hypothesisId: "H_merge",
            location: "anchorCoordinateEngine.ts:getAnchorsForRendering",
            message: "computed snapshot before merge",
            data: { computedC3: computed.C3, computedKeys: Object.keys(computed) },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
    } else {
      const ingestUrl = debugIngestUrl();
      if (ingestUrl)
        fetch(ingestUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            runId: "c3-rg-check",
            hypothesisId: "H_missing_C3",
            location: "anchorCoordinateEngine.ts:getAnchorsForRendering",
            message: "computed has no C3 key",
            data: { computedKeys: Object.keys(computed) },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
    }
    // #endregion
    const fb =
      fallback && typeof fallback === "object" ? { ...fallback } : {};
    /** 엔진이 채운 키가 우선. 부분 실패 시 나머지 라벨은 fallback(sysValuesToAnchors 등)으로 채움. */
    const merged: Record<string, AnchorPointWithSpace | { x: number; y: number }> = {
      ...fb,
      ...computed,
    };
    if (Object.keys(merged).length > 0) return merged;
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
