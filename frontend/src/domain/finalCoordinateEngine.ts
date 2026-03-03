/**
 * finalCoordinateEngine.ts
 * sys 값 → 1C(final) 좌표 계산 엔진
 * 지원: 5_half_system, n_across_short
 */

import type { Point } from "./positionSearchEngine";

/** C1 앵커 id 파싱 결과 (형식: C1_(x,y)_sys) */
export type ParsedC1Anchor = {
  x: number;
  y: number;
  sys: number;
} | null;

/** inv_C1 테이블 구조 (n_across_short) */
export type InvC1Table = {
  y: number;
  pairs_x_sys: Array<[number, number]>; // [sys, x] 쌍
};

/** anchors 트랙 데이터 */
export type AnchorItem = { id: string };
export type AnchorsTrack = { anchors: AnchorItem[] };

/** 시스템 profile (일부) */
export type ProfileLike = {
  tables?: Record<string, { inv_C1?: InvC1Table }>;
  formula?: { expr?: string };
};

// ---------------------------------------------------------------------------
// FG → RG 변환 (offset 2.25 기준)
// ---------------------------------------------------------------------------
const FG_OFFSET = 2.25;
const FG_X_MIN = -2.25;
const FG_X_MAX = 82.25;
const FG_Y_MIN = -2.25;
const FG_Y_MAX = 42.25;
const RG_W = 80;
const RG_H = 40;

export function fgToRg(fg: Point): Point {
  const rg_x = ((fg.x - FG_X_MIN) / (FG_X_MAX - FG_X_MIN)) * RG_W;
  const rg_y = ((fg.y - FG_Y_MIN) / (FG_Y_MAX - FG_Y_MIN)) * RG_H;
  return { x: rg_x, y: rg_y };
}

// ---------------------------------------------------------------------------
// 1) parseC1AnchorId
// ---------------------------------------------------------------------------
/**
 * C1 앵커 id 파싱 (형식: "C1_(40,42.25)_20")
 * @returns { x, y, sys } 또는 null
 */
export function parseC1AnchorId(id: string): ParsedC1Anchor {
  if (!id || typeof id !== "string") return null;
  const match = id.match(/^C1_\(([^,]+),([^)]+)\)_(.+)$/);
  if (!match) return null;
  const x = parseFloat(match[1]);
  const y = parseFloat(match[2]);
  const sys = parseFloat(match[3]);
  if (Number.isNaN(x) || Number.isNaN(y) || Number.isNaN(sys)) return null;
  return { x, y, sys };
}

// ---------------------------------------------------------------------------
// 2) interpolateLinear
// ---------------------------------------------------------------------------
/**
 * pairs [[sys1, val1], [sys2, val2], ...] 에서 sys에 해당하는 val 선형 보간
 * sys가 범위 밖이면 clamp하여 경계값 반환
 */
export function interpolateLinear(
  pairs: Array<[number, number]>,
  sys: number
): number {
  if (!pairs || pairs.length === 0) return Number.NaN;
  const sorted = [...pairs].sort((a, b) => a[0] - b[0]);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (sys <= first[0]) return first[1];
  if (sys >= last[0]) return last[1];
  for (let i = 0; i < sorted.length - 1; i++) {
    const [s0, v0] = sorted[i];
    const [s1, v1] = sorted[i + 1];
    if (sys >= s0 && sys <= s1) {
      const t = (sys - s0) / (s1 - s0);
      return v0 + t * (v1 - v0);
    }
  }
  return last[1];
}

// ---------------------------------------------------------------------------
// 3) computeFinalFromInvC1
// ---------------------------------------------------------------------------
/**
 * inv_C1 테이블로부터 C1_sys → (x, y) 좌표 계산
 * @param invC1 - { y, pairs_x_sys }
 * @param C1_sys - 1쿠션 시스템값
 * @param outputRg - true이면 RG 좌표로 변환하여 반환 (기본 true)
 */
export function computeFinalFromInvC1(
  invC1: InvC1Table,
  C1_sys: number,
  outputRg = true
): Point | null {
  if (!invC1?.pairs_x_sys?.length) return null;
  const xFg = interpolateLinear(invC1.pairs_x_sys, C1_sys);
  if (Number.isNaN(xFg)) return null;
  const ptFg: Point = { x: xFg, y: invC1.y };
  return outputRg ? fgToRg(ptFg) : ptFg;
}

// ---------------------------------------------------------------------------
// 4) computeFinalFromAnchors
// ---------------------------------------------------------------------------
/**
 * C1 앵커 배열에서 C1_sys에 해당하는 좌표를 보간하여 계산
 * @param anchors - { id: "C1_(x,y)_sys" }[] 배열
 * @param C1_sys - 1쿠션 시스템값
 * @param outputRg - true이면 RG 좌표로 변환
 */
export function computeFinalFromAnchors(
  anchors: AnchorItem[],
  C1_sys: number,
  outputRg = true
): Point | null {
  if (!anchors?.length) return null;
  const c1Items = anchors
    .map((a) => parseC1AnchorId(a.id))
    .filter((p): p is NonNullable<ParsedC1Anchor> => p != null)
    .sort((a, b) => a.sys - b.sys);
  if (c1Items.length === 0) return null;
  const first = c1Items[0];
  const last = c1Items[c1Items.length - 1];
  if (C1_sys <= first.sys) {
    const pt = { x: first.x, y: first.y };
    return outputRg ? fgToRg(pt) : pt;
  }
  if (C1_sys >= last.sys) {
    const pt = { x: last.x, y: last.y };
    return outputRg ? fgToRg(pt) : pt;
  }
  for (let i = 0; i < c1Items.length - 1; i++) {
    const a = c1Items[i];
    const b = c1Items[i + 1];
    if (C1_sys >= a.sys && C1_sys <= b.sys) {
      const t = (C1_sys - a.sys) / (b.sys - a.sys);
      const x = a.x + t * (b.x - a.x);
      const y = a.y + t * (b.y - a.y);
      const pt = { x, y };
      return outputRg ? fgToRg(pt) : pt;
    }
  }
  const pt = { x: last.x, y: last.y };
  return outputRg ? fgToRg(pt) : pt;
}

// ---------------------------------------------------------------------------
// 트랙 선택 (balls 배치 기반 간단 휴리스틱)
// ---------------------------------------------------------------------------
export type TrackId = "B2T_L" | "B2T_R" | "T2B_L" | "T2B_R";

/**
 * balls 위치로 트랙 추정 (단순화: cue가 왼쪽 하단 근처면 B2T_R 등)
 * 더 정확한 판정은 track_selection_rules 또는 별도 로직 필요
 */
export function inferTrackFromBalls(balls: {
  cue: Point;
  target: Point;
  second: Point;
}): TrackId {
  const cx = balls.cue.x;
  const cy = balls.cue.y;
  const tx = balls.target.x;
  const ty = balls.target.y;
  const sx = balls.second.x;
  const sy = balls.second.y;
  // B2T: cue가 bottom(-2.25) 근처, C1이 top(42.25)
  // T2B: cue가 top 근처, C1이 bottom
  const cueNearBottom = cy < 15;
  const cueNearTop = cy > 25;
  const cueOnLeft = cx < 40;
  const cueOnRight = cx >= 40;
  if (cueNearBottom && cueOnLeft) return "B2T_L";
  if (cueNearBottom && cueOnRight) return "B2T_R";
  if (cueNearTop && cueOnRight) return "T2B_L";
  if (cueNearTop && cueOnLeft) return "T2B_R";
  return "B2T_R";
}

// ---------------------------------------------------------------------------
// 5) computeFinalCoord — 통합 진입점
// ---------------------------------------------------------------------------
export type ComputeFinalInput = {
  balls: { cue: Point; target: Point; second: Point };
  sysInputs: Record<string, number>;
  systemId: string;
  trackId?: TrackId;
  profile: ProfileLike;
  anchorsData?: { trajectories?: Record<string, AnchorsTrack> };
};

/**
 * sysInputs + systemId에 따라 최종 1C 좌표 계산
 * - n_across_short: profile.tables[track].inv_C1 사용
 * - 5_half_system: anchorsData.trajectories[track].anchors 사용
 */
export function computeFinalCoord(input: ComputeFinalInput): Point | null {
  const {
    balls,
    sysInputs,
    systemId,
    trackId: givenTrack,
    profile,
    anchorsData,
  } = input;

  const C1_sys =
    sysInputs.C1_f ??
    sysInputs.C1_r ??
    sysInputs.oneC ??
    sysInputs["1C"];
  const c1 = typeof C1_sys === "number" && !Number.isNaN(C1_sys) ? C1_sys : null;
  if (c1 === null) return null;

  const track = givenTrack ?? inferTrackFromBalls(balls);

  // ---- n_across_short ----
  if (systemId === "n_across_short" || systemId === "N_Across_short_system") {
    const table = profile?.tables?.[track];
    const invC1 = table?.inv_C1;
    if (invC1) return computeFinalFromInvC1(invC1, c1, true);
  }

  // ---- 5_half_system ----
  if (systemId === "5_half_system") {
    const trackData = anchorsData?.trajectories?.[track];
    const anchors = trackData?.anchors;
    if (anchors?.length) return computeFinalFromAnchors(anchors, c1, true);
  }

  return null;
}
