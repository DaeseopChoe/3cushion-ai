/**
 * Phase 3B.1 / 3B.1.1 — Final Strategy Summary presentation template.
 * Pure ViewModel: reads resolved display scalars only (no SYS/STR recalculation).
 *
 * Correction explanation roles (presentation only):
 * - slide/draw → 출발값 보정
 * - curve_ratio (기울기) → 3쿠션 도착값 보정 설명
 * - Sn → 출발값 보정 (final arrival / C4) 설명
 */

import { getSystemNameKo } from "../../utils/aiPlayStrategyBuilder";
import { unifiedSlideFromCorrections } from "../aiAutoCommentViewModel";
import { fmtSysDisplayNum, fmtSignedDeparture } from "../../overlay/utils/sysCalcDisplayModel";
import { extractNumericTokens } from "../../../api/_lib/numericGuard.js";

const EPS = 1e-9;

export type StrategySummarySegmentId =
  | "intro"
  | "start"
  | "cushion"
  | "arrival";

export type StrategySummarySegment = {
  id: StrategySummarySegmentId;
  text: string;
  /** Protected numeric tokens for this segment (presentation integrity). */
  protectedTokens: string[];
};

export type StrategySummaryTemplateInputs = {
  systemId: string;
  systemName: string;
  shotType: string;
  baseCo: number | null;
  effCo: number | null;
  /** Unified slide (+밀림 / −끌림). null = unknown; 0 = no slide effect. */
  unifiedSlide: number | null;
  /**
   * Inclination / curve_ratio (표시: 기울기) — C3 arrival explanation only.
   * Read from corrections SSOT; never recomputed.
   */
  inclination: number | null;
  baseC1: number | null;
  effC3: number | null;
  /** Sn (표시 문구: 출발값 보정). null = omit arrival sentence. */
  sn: number | null;
  /** Final arrival C4. null = omit arrival sentence. */
  c4: number | null;
};

export type StrategySummaryTemplateModel = {
  segments: StrategySummarySegment[];
  text: string;
};

function normalizeShotType(raw: unknown, fallback = "뒤돌리기"): string {
  if (typeof raw !== "string") return fallback;
  const t = raw.trim();
  if (!t || t === "default" || t === "_") return fallback;
  return t;
}

function finiteOrNull(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function pickNum(
  values: Record<string, unknown> | null | undefined,
  keys: string[]
): number | null {
  if (!values) return null;
  for (const key of keys) {
    const n = finiteOrNull(values[key]);
    if (n != null) return n;
  }
  return null;
}

function tokensOf(text: string): string[] {
  return extractNumericTokens(text);
}

function buildIntro(systemName: string, shotType: string): StrategySummarySegment {
  const text = `${systemName}을 응용한 ${shotType} 공략입니다.`;
  return { id: "intro", text, protectedTokens: tokensOf(text) };
}

function buildStartSegment(args: {
  baseCo: number | null;
  effCo: number | null;
  unifiedSlide: number | null;
}): StrategySummarySegment | null {
  const { baseCo, effCo, unifiedSlide } = args;
  if (baseCo == null) return null;

  const slide =
    unifiedSlide != null && Number.isFinite(unifiedSlide) ? unifiedSlide : 0;
  const hasSlide = Math.abs(slide) > EPS;
  const coLabel = fmtSysDisplayNum(baseCo);

  if (hasSlide && effCo != null) {
    const kind = slide > 0 ? "밀림" : "끌림";
    // Signed display of resolved unifiedSlide (no abs, no recomputation).
    const signed = fmtSignedDeparture(slide);
    const effLabel = fmtSysDisplayNum(effCo);
    const text = `출발값 ${coLabel}에서 ${kind}값 ${signed}을 보정하면 출발값은 ${effLabel}이 됩니다.`;
    return { id: "start", text, protectedTokens: tokensOf(text) };
  }

  const text = `출발값은 ${coLabel}입니다.`;
  return { id: "start", text, protectedTokens: tokensOf(text) };
}

function buildCushionSegment(args: {
  baseC1: number | null;
  effC3: number | null;
  inclination: number | null;
}): StrategySummarySegment | null {
  const { baseC1, effC3, inclination } = args;
  if (baseC1 == null || effC3 == null) return null;
  const c1Label = fmtSysDisplayNum(baseC1);
  const c3Label = fmtSysDisplayNum(effC3);
  const tilt =
    inclination != null && Number.isFinite(inclination) ? inclination : 0;
  const hasTilt = Math.abs(tilt) > EPS;
  const text = hasTilt
    ? `1쿠션 ${c1Label}를 겨냥하여 진행하면 기울기 ${fmtSysDisplayNum(Math.abs(tilt))}가 보정되어 3쿠션은 ${c3Label}에 도착합니다.`
    : `1쿠션 ${c1Label}를 겨냥하여 진행하면 3쿠션은 ${c3Label}에 도착합니다.`;
  return { id: "cushion", text, protectedTokens: tokensOf(text) };
}

function buildArrivalSegment(args: {
  sn: number | null;
  c4: number | null;
}): StrategySummarySegment | null {
  const { sn, c4 } = args;
  if (sn == null || c4 == null) return null;
  if (Math.abs(sn) <= EPS) return null;
  const text = `이어서 출발값 보정 ${fmtSignedDeparture(sn)}를 적용하면 최종 도착값은 ${fmtSysDisplayNum(c4)}가 됩니다.`;
  return { id: "arrival", text, protectedTokens: tokensOf(text) };
}

/** Resolve presentation inputs from already-computed slot values (no engine calls). */
export function buildStrategySummaryTemplateInputs(args: {
  systemId?: unknown;
  shotType?: unknown;
  baseValues?: Record<string, unknown> | null;
  correctedValues?: Record<string, unknown> | null;
  corrections?: {
    slide?: unknown;
    draw?: unknown;
    curve_ratio?: unknown;
    spin?: unknown;
    departure?: unknown;
  } | null;
}): StrategySummaryTemplateInputs {
  const systemId =
    args.systemId == null || args.systemId === ""
      ? "5_half_system"
      : String(args.systemId);
  const shotType = normalizeShotType(args.shotType);
  const base = args.baseValues ?? null;
  const corrected = args.correctedValues ?? null;

  const baseCo = pickNum(base, ["CO_f", "CO_r", "CO"]);
  const effCo = pickNum(corrected, ["CO_f", "CO_r", "CO"]);
  const baseC1 = pickNum(base, ["C1_f", "C1_r", "C1"]);
  const effC3 = pickNum(corrected, ["C3_r", "C3_f", "C3"]);
  const sn = pickNum(corrected, ["Sn"]);
  const c4 = pickNum(corrected, ["C4_f", "C4_r"]);

  const unified = unifiedSlideFromCorrections(
    args.corrections as { slide?: number; draw?: number } | null,
    shotType
  );

  // SYS display uses corrections.curve_ratio as angleTilt — read only, no recalc.
  const inclination = finiteOrNull(args.corrections?.curve_ratio);

  return {
    systemId,
    systemName: getSystemNameKo(systemId),
    shotType,
    baseCo,
    effCo,
    unifiedSlide: Number.isFinite(unified) ? unified : null,
    inclination,
    baseC1,
    effC3,
    sn,
    c4,
  };
}

export function buildStrategySummaryTemplateModel(
  inputs: StrategySummaryTemplateInputs
): StrategySummaryTemplateModel {
  const segments: StrategySummarySegment[] = [];
  segments.push(buildIntro(inputs.systemName, inputs.shotType));
  const start = buildStartSegment(inputs);
  if (start) segments.push(start);
  const cushion = buildCushionSegment(inputs);
  if (cushion) segments.push(cushion);
  const arrival = buildArrivalSegment(inputs);
  if (arrival) segments.push(arrival);
  return {
    segments,
    text: segments.map((s) => s.text).join("\n"),
  };
}

export function composeFinalStrategySummary(
  inputs: StrategySummaryTemplateInputs
): string {
  return buildStrategySummaryTemplateModel(inputs).text;
}

/**
 * Count multiset of numeric tokens.
 * Sorted extractNumericTokens → frequency map.
 */
export function countNumericTokenMultiset(text: unknown): Map<string, number> {
  const tokens = extractNumericTokens(text);
  const map = new Map<string, number>();
  for (const t of tokens) {
    map.set(t, (map.get(t) ?? 0) + 1);
  }
  return map;
}

/**
 * Phase 3B.1 numeric guard:
 * - Edited tokens must be a submultiset of baseline (optional sentence deletion OK)
 * - New / mutated numeric values rejected
 */
export function assertStrategySummaryNumericSubmultiset(
  generatedBaseline: unknown,
  editedDraft: unknown
): { ok: true } | { ok: false; code: "NUMERIC_GUARD"; message: string } {
  const baseline = countNumericTokenMultiset(generatedBaseline);
  const edited = countNumericTokenMultiset(editedDraft);
  for (const [token, count] of edited) {
    const allowed = baseline.get(token) ?? 0;
    if (count > allowed) {
      return {
        ok: false,
        code: "NUMERIC_GUARD",
        message:
          "공략 요약의 숫자 표현이 원본과 다릅니다. 숫자를 확인해 주세요.",
      };
    }
  }
  return { ok: true };
}
