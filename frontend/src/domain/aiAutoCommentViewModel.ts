/**
 * AI 버튼 자동 생성 코멘트 (SYS + STR, HP/T 제외).
 * Pure ViewModel — Recall/궤적/SYS 엔진 미변경.
 */

import { getShotTypeCorrectionSign } from "./englishCorrectionSign";
import { getSystemNameKo } from "../utils/aiPlayStrategyBuilder";

export type SysCorrectionsInput = {
  slide?: number;
  draw?: number;
  curve_ratio?: number;
  spin?: number;
  departure?: number;
};

export type AiAutoCommentStrInput = {
  depth?: number;
  speed?: number;
  acceleration?: string;
};

export type AiAutoCommentModel = {
  introLine: string;
  formulaUserLine: string;
  correctionLine: string | null;
  strLine: string | null;
};

export type BuildAiAutoCommentArgs = {
  systemId?: string | null;
  systemName?: string | null;
  shotType?: string | null;
  baseValues?: Record<string, number> | null;
  correctedValues?: Record<string, number> | null;
  corrections?: SysCorrectionsInput | null;
  str?: AiAutoCommentStrInput | null;
};

const ACCEL_PATTERN_KO: Record<string, string> = {
  smooth_accel: "부드러운 가속",
  sharp_accel: "날카로운 가속",
  smooth_const: "부드러운 등속",
  intentional_decel: "의도적 감속",
};

const CORRECTION_EPS = 1e-9;

function normalizeShotType(raw: unknown, fallback = "뒤돌리기"): string {
  if (typeof raw !== "string") return fallback;
  const t = raw.trim();
  if (!t || t === "default" || t === "_") return fallback;
  return t;
}

function isFiveHalfSystemId(systemId: string | null | undefined): boolean {
  const s = systemId == null ? "" : String(systemId);
  return s === "5_half_system" || s === "5_HALF" || s === "five_half";
}

/** App.jsx unifiedSlideFromCorrections와 동일 규약 */
export function unifiedSlideFromCorrections(
  corrections: SysCorrectionsInput | null | undefined,
  shotType?: string | null
): number {
  if (!corrections || typeof corrections !== "object") return 0;
  const s = Number(corrections.slide);
  const d = Number(corrections.draw);
  const slideVal = Math.abs(Number.isFinite(s) ? s : 0);
  const drawVal = -Math.abs(Number.isFinite(d) ? d : 0);
  const raw = drawVal !== 0 ? drawVal : slideVal;
  return raw * getShotTypeCorrectionSign(shotType);
}

function pickNum(values: Record<string, number> | null | undefined, keys: string[]): number | null {
  if (!values) return null;
  for (const key of keys) {
    const v = values[key];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return null;
}

function formatDisplayNum(n: number): string {
  if (!Number.isFinite(n)) return "";
  const r = Math.round(n * 10) / 10;
  return Number.isInteger(r) ? String(r) : String(r);
}

/** 사용자용 기본 공식 (엔진 식 미노출) */
export function getUserFormulaLine(systemId?: string | null): string {
  if (isFiveHalfSystemId(systemId)) {
    return "1쿠션값 = 출발값 - 3쿠션값";
  }
  return "1쿠션값 = 출발값 - 3쿠션값";
}

/** 0이 아닌 보정 항목 한글 라벨 */
export function getActiveCorrectionLabels(
  corrections: SysCorrectionsInput | null | undefined,
  shotType?: string | null
): string[] {
  const c = corrections ?? {};
  const labels: string[] = [];
  const unified = unifiedSlideFromCorrections(c, shotType);

  if (unified > CORRECTION_EPS) labels.push("밀림");
  else if (unified < -CORRECTION_EPS) labels.push("끌림");

  if (Math.abs(Number(c.curve_ratio) || 0) > CORRECTION_EPS) labels.push("기울기");
  if (Math.abs(Number(c.spin) || 0) > CORRECTION_EPS) labels.push("스핀");

  const hasDepartureManual = Math.abs(Number(c.departure) || 0) > CORRECTION_EPS;
  const hasSlideEffect = Math.abs(unified) > CORRECTION_EPS;
  if (hasDepartureManual || hasSlideEffect) {
    if (!labels.includes("출발값 보정")) labels.push("출발값 보정");
  }

  return labels;
}

export function hasAnySysCorrection(
  corrections: SysCorrectionsInput | null | undefined,
  shotType?: string | null,
  baseValues?: Record<string, number> | null,
  correctedValues?: Record<string, number> | null
): boolean {
  if (getActiveCorrectionLabels(corrections, shotType).length > 0) return true;
  const coB = pickNum(baseValues, ["CO_f", "CO_r", "CO"]);
  const coC = pickNum(correctedValues, ["CO_f", "CO_r", "CO"]);
  const c4B = pickNum(baseValues, ["C4_f", "C4_r", "threeC"]);
  const c4C = pickNum(correctedValues, ["C4_f", "C4_r", "threeC"]);
  if (coB != null && coC != null && Math.abs(coB - coC) > CORRECTION_EPS) return true;
  if (c4B != null && c4C != null && Math.abs(c4B - c4C) > CORRECTION_EPS) return true;
  return false;
}

function buildCorrectionLine(
  labels: string[],
  baseValues: Record<string, number> | null | undefined,
  correctedValues: Record<string, number> | null | undefined
): string | null {
  if (labels.length === 0) return null;

  const coBase = pickNum(baseValues, ["CO_f", "CO_r", "CO"]);
  const coCorr = pickNum(correctedValues, ["CO_f", "CO_r", "CO"]);
  const c4Base = pickNum(baseValues, ["C4_f", "C4_r", "threeC"]);
  const c4Corr = pickNum(correctedValues, ["C4_f", "C4_r", "threeC"]);

  const deltas: string[] = [];
  if (coBase != null && coCorr != null && Math.abs(coBase - coCorr) > CORRECTION_EPS) {
    deltas.push(`출발값은 ${formatDisplayNum(coBase)} → ${formatDisplayNum(coCorr)}`);
  }
  if (c4Base != null && c4Corr != null && Math.abs(c4Base - c4Corr) > CORRECTION_EPS) {
    deltas.push(`도착값은 ${formatDisplayNum(c4Base)} → ${formatDisplayNum(c4Corr)}`);
  }

  if (deltas.length === 0) return null;

  return `${labels.join(", ")}이 반영되어 ${deltas.join(", ")}로 보정되었습니다.`;
}

function buildStrLine(str: AiAutoCommentStrInput | null | undefined): string | null {
  const depth = typeof str?.depth === "number" && Number.isFinite(str.depth) ? str.depth : null;
  const speed = typeof str?.speed === "number" && Number.isFinite(str.speed) ? str.speed : null;
  const accelKey = str?.acceleration ?? "smooth_const";
  const accel =
    ACCEL_PATTERN_KO[accelKey] || accelKey || "부드러운 등속";

  if (depth == null || speed == null) return null;

  const depthLabel = Number.isInteger(depth) ? String(depth) : formatDisplayNum(depth);
  const speedLabel = formatDisplayNum(speed);

  return `볼 ${depthLabel}개 통과 기준, ${speedLabel}레일 속도의 ${accel} 패턴으로 공략합니다.`;
}

export function buildAiAutoCommentModel(args: BuildAiAutoCommentArgs): AiAutoCommentModel {
  const systemId = args.systemId ?? "5_half_system";
  const systemName = args.systemName ?? getSystemNameKo(systemId);
  const shotType = normalizeShotType(args.shotType);
  const introLine = `${systemName}을 응용한 ${shotType} 공략입니다.`;
  const formulaUserLine = getUserFormulaLine(systemId);

  const labels = getActiveCorrectionLabels(args.corrections, shotType);
  const showCorrection =
    labels.length > 0 &&
    hasAnySysCorrection(args.corrections, shotType, args.baseValues, args.correctedValues);
  const correctionLine = showCorrection
    ? buildCorrectionLine(labels, args.baseValues, args.correctedValues)
    : null;

  const strLine = buildStrLine(args.str);

  return {
    introLine,
    formulaUserLine,
    correctionLine,
    strLine,
  };
}

export const AI_COMMENT_FORMULA_TITLE = "[기본 공식]";

/** 플레인 텍스트 (로그/레거시); 문단 사이 빈 줄 1개(\n\n) */
export function composeAiAutoComment(model: AiAutoCommentModel): string {
  const parts: string[] = [
    model.introLine,
    `${AI_COMMENT_FORMULA_TITLE}  ${model.formulaUserLine}`,
  ];
  if (model.correctionLine) parts.push(model.correctionLine);
  if (model.strLine) parts.push(model.strLine);
  return parts.join("\n\n");
}
