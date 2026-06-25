// data/system/calculator/base.ts

import { Point } from "./types";

/* ===============================
 * 좌표 계산 유틸
 * =============================== */

/**
 * 두 점 사이의 거리 계산 (Rg 단위)
 */
export function distance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * 점의 복사 (immutable)
 */
export function clonePoint(p: Point): Point {
  return { x: p.x, y: p.y };
}

/* ===============================
 * 수식 문자열 생성 유틸
 * =============================== */

/**
 * 보정값 포함 수식 문자열 생성
 * 
 * @example
 * formatCorrectionFormula("CO", 40, "curve", 5)
 * // → "(CO+curve)" or "CO" (if correction=0)
 */
export function formatCorrectionFormula(
  baseVar: string,
  baseValue: number,
  correctionName: string,
  correctionValue: number
): { formula: string; value: number } {
  if (correctionValue === 0) {
    return {
      formula: baseVar,
      value: baseValue
    };
  }
  
  const sign = correctionValue > 0 ? "+" : "";
  return {
    formula: `(${baseVar}${sign}${correctionName})`,
    value: baseValue + correctionValue
  };
}

/**
 * 수식 치환 문자열 생성
 * 
 * @example
 * substituteFormula("1C", [
 *   { var: "CO", value: 40 },
 *   { var: "3C", value: 20 }
 * ], "CO - 3C")
 * // → "1C = 40 - 20"
 */
export function substituteFormula(
  resultVar: string,
  values: Array<{ var: string; value: number }>,
  template: string
): string {
  let substituted = template;
  
  for (const { var: varName, value } of values) {
    // 괄호 포함된 변수도 치환 (예: "(CO+curve)")
    const regex = new RegExp(`\\(${varName}[^)]*\\)|${varName}`, "g");
    substituted = substituted.replace(regex, String(value));
  }
  
  return `${resultVar} = ${substituted}`;
}

/* ===============================
 * 반올림/포맷 유틸
 * =============================== */

/**
 * 시스템값 반올림 (소수점 2자리)
 */
export function roundSystemValue(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * 수식용 숫자 포맷 (불필요한 소수점 제거)
 */
export function formatNumber(value: number): string {
  const rounded = roundSystemValue(value);
  return rounded % 1 === 0 ? String(Math.floor(rounded)) : String(rounded);
}

/* ===============================
 * 검증 유틸
 * =============================== */

/**
 * 앵커 존재 여부 검증
 */
export function requireAnchor(
  anchor: Point | undefined,
  anchorName: string
): Point {
  if (!anchor) {
    throw new Error(`Required anchor not found: ${anchorName}`);
  }
  return anchor;
}

/**
 * 값 범위 검증
 */
export function validateRange(
  value: number,
  min: number,
  max: number,
  valueName: string
): void {
  if (value < min || value > max) {
    throw new Error(
      `${valueName} out of range: ${value} (expected ${min}~${max})`
    );
  }
}

/* ===============================
 * 디버그 유틸
 * =============================== */

/**
 * 계산 과정 로그 생성
 */
export function logCalculation(
  stage: string,
  formula: string,
  value: number
): void {
  console.log(`[Calculator] ${stage}: ${formula} = ${value}`);
}
