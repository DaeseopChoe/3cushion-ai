/**
 * Spider Web (거미줄) — hit point + 4-value solver (SSOT §2–§3).
 *
 *   C3_f = CO_f − C1_f + HP_n,   HP_n = 10 × |HP_sel| ∈ {0, 10, 20, 30, 40}
 *
 * No Sn, no 출발값 보정, no 5&Half C4 logic.
 */

import {
  SPIDER_VALUE_RANGES,
  SPIDER_WEB_TRACKS,
  isSpiderWebTrack,
  type SpiderSpinDirection,
  type SpiderWebTrackId,
} from "./spiderWebTracks";

export const SPIDER_HP_LEVELS = [0, 1, 2, 3, 4] as const;
export const SPIDER_HP_N_VALUES = [0, 10, 20, 30, 40] as const;

export type SpiderHitPointId = "0" | "R1" | "R2" | "R3" | "R4" | "L1" | "L2" | "L3" | "L4";

export type SpiderHitPoint = {
  /** Signed SYS selection (-4..+4). */
  selection: number;
  /** Unsigned tip level 0..4. */
  level: number;
  /** HP_n = 10 × level. */
  hpN: number;
  spinDirection: SpiderSpinDirection | null;
  hitPointId: SpiderHitPointId;
};

export type SpiderSolveTarget = "CO_f" | "C1_f" | "C3_f" | "HP";

export type SpiderSolveErrorCode =
  | "INVALID_TRACK"
  | "INVALID_SOLVE_TARGET"
  | "MISSING_INPUT"
  | "HP_INVALID_SELECTION"
  | "HP_DIRECTION_MISMATCH"
  | "HP_NOT_REPRESENTABLE"
  | "CO_OUT_OF_RANGE"
  | "C1_OUT_OF_RANGE"
  | "C3_BELOW_MIN"
  | "C3_ABOVE_MAX";

export type SpiderSolvedValues = {
  CO_f: number;
  C1_f: number;
  C3_f: number;
  HP_n: number;
  HP_sel: number;
};

export type SpiderSolveResult =
  | { ok: true; values: SpiderSolvedValues; hitPoint: SpiderHitPoint }
  | { ok: false; code: SpiderSolveErrorCode; message: string };

const EPS = 1e-9;

function fail(code: SpiderSolveErrorCode, message: string): SpiderSolveResult {
  return { ok: false, code, message };
}

function finite(v: unknown): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** Selections offered for a track (0 plus four tips in the track's spin direction). */
export function spiderAllowedHpSelections(track: SpiderWebTrackId): number[] {
  return SPIDER_WEB_TRACKS[track].spin === "R" ? [0, 1, 2, 3, 4] : [0, -1, -2, -3, -4];
}

export function spiderHitPointFromSelection(
  track: SpiderWebTrackId,
  selection: unknown
): { ok: true; hitPoint: SpiderHitPoint } | { ok: false; code: SpiderSolveErrorCode; message: string } {
  const sel = finite(selection);
  if (sel == null || !Number.isInteger(sel) || Math.abs(sel) > 4) {
    return { ok: false, code: "HP_INVALID_SELECTION", message: "타점은 -4..+4 정수만 허용됩니다." };
  }
  const spin = SPIDER_WEB_TRACKS[track].spin;
  if ((spin === "R" && sel < 0) || (spin === "L" && sel > 0)) {
    return {
      ok: false,
      code: "HP_DIRECTION_MISMATCH",
      message: `${track} 트랙은 ${spin === "R" ? "우" : "좌"}회전 타점(0, ${spin}1~${spin}4)만 허용됩니다.`,
    };
  }
  const level = Math.abs(sel);
  return {
    ok: true,
    hitPoint: {
      selection: sel === 0 ? 0 : sel,
      level,
      hpN: level * 10,
      spinDirection: level === 0 ? null : spin,
      hitPointId: (level === 0 ? "0" : `${spin}${level}`) as SpiderHitPointId,
    },
  };
}

/** Exact inverse: HP_n must be one of 0/10/20/30/40 — never rounded. */
export function spiderHitPointFromHpN(
  track: SpiderWebTrackId,
  hpN: number
): { ok: true; hitPoint: SpiderHitPoint } | { ok: false; code: SpiderSolveErrorCode; message: string } {
  const level = SPIDER_HP_N_VALUES.findIndex((v) => Math.abs(v - hpN) <= EPS);
  if (level < 0) {
    return {
      ok: false,
      code: "HP_NOT_REPRESENTABLE",
      message: `HP 값 ${formatNum(hpN)}은(는) 0/10/20/30/40 중 하나가 아니어서 타점으로 표현할 수 없습니다.`,
    };
  }
  const sign = SPIDER_WEB_TRACKS[track].spin === "R" ? 1 : -1;
  return spiderHitPointFromSelection(track, level === 0 ? 0 : sign * level);
}

function formatNum(n: number): string {
  return String(Number(n.toFixed(6)));
}

function checkRanges(values: { CO_f: number; C1_f: number; C3_f: number }): SpiderSolveResult | null {
  const [coMin, coMax] = SPIDER_VALUE_RANGES.CO_f;
  const [c1Min, c1Max] = SPIDER_VALUE_RANGES.C1_f;
  const [c3Min, c3Max] = SPIDER_VALUE_RANGES.C3_f;
  if (values.C3_f < c3Min - EPS) {
    return fail("C3_BELOW_MIN", `C3 ${formatNum(values.C3_f)}은(는) ${c3Min}보다 작아 계산할 수 없습니다.`);
  }
  if (values.C3_f > c3Max + EPS) {
    return fail("C3_ABOVE_MAX", `C3 ${formatNum(values.C3_f)}은(는) ${c3Max}를 넘어 계산할 수 없습니다.`);
  }
  if (values.CO_f < coMin - EPS || values.CO_f > coMax + EPS) {
    return fail("CO_OUT_OF_RANGE", `CO ${formatNum(values.CO_f)}은(는) ${coMin}~${coMax} 범위를 벗어납니다.`);
  }
  if (values.C1_f < c1Min - EPS || values.C1_f > c1Max + EPS) {
    return fail("C1_OUT_OF_RANGE", `C1 ${formatNum(values.C1_f)}은(는) ${c1Min}~${c1Max} 범위를 벗어납니다.`);
  }
  return null;
}

/**
 * Solve the explicitly selected target from the other three values.
 * `hpSel` is the signed -4..+4 SYS selection (ignored when solveTarget is "HP").
 */
export function solveSpiderWeb(input: {
  track: unknown;
  solveTarget: unknown;
  CO_f?: unknown;
  C1_f?: unknown;
  C3_f?: unknown;
  hpSel?: unknown;
}): SpiderSolveResult {
  if (!isSpiderWebTrack(input.track)) {
    return fail("INVALID_TRACK", "거미줄 트랙(RLTR_R / LRTL_L / RLBR_L / LRBL_R)을 선택하십시오.");
  }
  const track = input.track;
  const target = input.solveTarget;
  if (target !== "CO_f" && target !== "C1_f" && target !== "C3_f" && target !== "HP") {
    return fail("INVALID_SOLVE_TARGET", "계산할 값(CO / C1 / C3 / 타점)을 선택하십시오.");
  }

  const co = finite(input.CO_f);
  const c1 = finite(input.C1_f);
  const c3 = finite(input.C3_f);

  let hitPoint: SpiderHitPoint | null = null;
  if (target !== "HP") {
    const hp = spiderHitPointFromSelection(track, input.hpSel);
    if (!hp.ok) return fail(hp.code, hp.message);
    hitPoint = hp.hitPoint;
  }

  let values: { CO_f: number; C1_f: number; C3_f: number };
  if (target === "C3_f") {
    if (co == null || c1 == null) return fail("MISSING_INPUT", "CO와 C1을 입력하십시오.");
    values = { CO_f: co, C1_f: c1, C3_f: co - c1 + hitPoint!.hpN };
  } else if (target === "CO_f") {
    if (c1 == null || c3 == null) return fail("MISSING_INPUT", "C1과 C3를 입력하십시오.");
    values = { CO_f: c3 + c1 - hitPoint!.hpN, C1_f: c1, C3_f: c3 };
  } else if (target === "C1_f") {
    if (co == null || c3 == null) return fail("MISSING_INPUT", "CO와 C3를 입력하십시오.");
    values = { CO_f: co, C1_f: co + hitPoint!.hpN - c3, C3_f: c3 };
  } else {
    if (co == null || c1 == null || c3 == null) {
      return fail("MISSING_INPUT", "CO, C1, C3를 입력하십시오.");
    }
    values = { CO_f: co, C1_f: c1, C3_f: c3 };
    const rangeErr = checkRanges(values);
    if (rangeErr) return rangeErr;
    const hp = spiderHitPointFromHpN(track, c3 - co + c1);
    if (!hp.ok) return fail(hp.code, hp.message);
    hitPoint = hp.hitPoint;
  }

  const rangeErr = checkRanges(values);
  if (rangeErr) return rangeErr;

  return {
    ok: true,
    values: { ...values, HP_n: hitPoint!.hpN, HP_sel: hitPoint!.selection },
    hitPoint: hitPoint!,
  };
}

/**
 * Validate a stored spider SYS input map (slot / StrategyEntry) without re-solving targets.
 * Accepts HP_sel (preferred) or legacy unsigned HP_n; returns null when inconsistent.
 */
export function spiderValuesFromStoredInputs(
  track: unknown,
  inputs: Record<string, unknown> | null | undefined
): SpiderSolvedValues | null {
  if (!isSpiderWebTrack(track) || !inputs) return null;
  const co = finite(inputs.CO_f);
  const c1 = finite(inputs.C1_f);
  const c3 = finite(inputs.C3_f);
  if (co == null || c1 == null || c3 == null) return null;
  const selRaw = finite(inputs.HP_sel);
  const hp =
    selRaw != null
      ? spiderHitPointFromSelection(track, selRaw)
      : spiderHitPointFromHpN(track, finite(inputs.HP_n) ?? Number.NaN);
  if (!hp.ok) return null;
  if (checkRanges({ CO_f: co, C1_f: c1, C3_f: c3 })) return null;
  if (Math.abs(co - c1 + hp.hitPoint.hpN - c3) > 1e-6) return null;
  return { CO_f: co, C1_f: c1, C3_f: c3, HP_n: hp.hitPoint.hpN, HP_sel: hp.hitPoint.selection };
}

/** Keys persisted in sysInputs for spider (system-specific strip policy). */
export const SPIDER_PERSIST_SYS_INPUT_KEYS: ReadonlySet<string> = new Set([
  "CO_f",
  "C1_f",
  "C3_f",
  "HP_n",
  "HP_sel",
]);
