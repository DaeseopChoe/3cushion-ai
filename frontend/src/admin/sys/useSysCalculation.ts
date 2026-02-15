// frontend/admin/sys/useSysCalculation.ts
// Admin SYS 전용: formula.expr 기반 순수 수식 계산기
// 좌표(anchors) 의존성 없음. 시스템값(system_values) 직접 입력만 사용.

import { useMemo } from "react";
import { SYSTEM_PROFILES } from "../../data/systems";

type Values = Record<string, number>;

export type SysCalcInput = {
  system_id: string;
  system_values: Record<string, number>;
};

export type SysCalcResult = {
  expr: string;
  output: Values;
  error?: string;
};

/** system_id → SYSTEM_PROFILES 키 매핑 */
const SYSTEM_ID_TO_PROFILE_KEY: Record<string, string> = {
  "5_HALF": "5_half_system",
  "PLUS": "plus_system",
  "DIAMOND": "rodriguez",
  "RODRIGUEZ": "rodriguez",
  "3TIP_PLUS": "3tip_plus",
  "SUNRISE_SUNSET": "sunrise_sunset",
};

/** Math 객체 함수/상수 — 변수 목록에서 제외 */
const MATH_TOKENS = new Set([
  "Math", "floor", "ceil", "round", "sqrt", "sin", "cos", "tan",
  "asin", "acos", "atan", "exp", "log", "abs", "min", "max",
  "sign", "trunc", "PI", "E", "pow", "atan2",
]);

/**
 * formula.expr에서 등호 기준으로 좌변(LHS)을 정확히 추출
 */
function extractLhsFromExpr(expr: string): { lhs: string; rhs: string } {
  const idx = expr.indexOf("=");
  if (idx < 0) {
    throw new Error(`Unsupported expr: no "=" found, got "${expr}"`);
  }
  const lhs = expr.slice(0, idx).trim();
  const rhs = expr.slice(idx + 1).trim();
  if (!lhs || !rhs) {
    throw new Error(`Unsupported expr: empty LHS or RHS, got "${expr}"`);
  }
  return { lhs, rhs };
}

/**
 * expr에서 변수 토큰 추출 (LHS 제외, Math 객체 함수/상수 제외)
 */
function getRhsTokens(expr: string): string[] {
  const tokens = expr.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
  const [lhsPart] = expr.split("=");
  const lhs = lhsPart?.trim() ?? "";
  return [...new Set(tokens.filter((t) => t !== lhs && !MATH_TOKENS.has(t)))];
}

/**
 * buildValuesFromInput — 좌표 의존성 완전 제거
 * 1) expr에서 토큰 자동 추출
 * 2) LHS 제외
 * 3) system_values에서 expr에 등장한 토큰만 할당
 * anchors.x, anchors.y 참조 금지
 */
function buildValuesFromInput(expr: string, systemValues: Record<string, number>): Values {
  const rhsTokens = getRhsTokens(expr);
  const vals: Values = {};

  for (const token of rhsTokens) {
    const v = systemValues[token];
    vals[token] =
      typeof v === "number" && !Number.isNaN(v) ? v : 0;
  }

  return vals;
}

/** RHS 수식 평가 → LHS 키로 output 저장 */
function evaluateExpr(expr: string, values: Values): Values {
  const { lhs, rhs } = extractLhsFromExpr(expr);

  const tokens = rhs.match(/[A-Za-z_][A-Za-z0-9_]*|\d+\.\d+|\d+|[\+\-\*\/\(\)]/g);
  if (!tokens) {
    throw new Error(`Failed to tokenize RHS: "${rhs}"`);
  }
  
  const rhsJs = tokens
    .map((t) => {
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(t)) {
        if (MATH_TOKENS.has(t)) return t;
        const v = t in values ? values[t] : 0;
        return typeof v === "number" && !Number.isNaN(v) ? String(v) : "0";
      }
      if (/^\d+(\.\d+)?$/.test(t)) return t;
      if (/^[\+\-\*\/\(\)]$/.test(t)) return t;
      throw new Error(`Illegal token: ${t}`);
    })
    .join(" ");

  // eslint-disable-next-line no-new-func
  const fn = new Function("Math", `return (${rhsJs});`);
  const result = fn(Math);
  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error(`RHS evaluated to non-finite number: ${result}`);
  }

  const out: Values = { ...values };
  out[lhs] = result; // LHS 반드시 output에 포함 (화면 ${LHS}_${값} 출력용)
  return out;
}

/**
 * useSysCalculation(input)
 * - input: { system_id, system_values } | null
 * - 반환: { expr, output, error }
 * 좌표 엔진(calculateSystemV1, trajectory) 미참조
 */
export function useSysCalculation(input: SysCalcInput | null): SysCalcResult {
  const res = useMemo<SysCalcResult>(() => {
    if (!input || !input.system_values) {
      return { expr: "", output: {}, error: "입력 없음" };
    }

    const profileKey =
      SYSTEM_ID_TO_PROFILE_KEY[input.system_id] ??
      input.system_id.toLowerCase().replace(/-/g, "_");
    const profile = SYSTEM_PROFILES[profileKey];

    if (!profile) {
      return { expr: "", output: {}, error: `Unknown systemId: ${input.system_id}` };
    }

    const expr: string = profile?.formula?.expr;
    if (!expr || typeof expr !== "string") {
      return { expr: "", output: {}, error: "profile.formula.expr not found" };
    }

    const values = buildValuesFromInput(expr, input.system_values);

    try {
      let out = evaluateExpr(expr, values);

      // 3️⃣ 5_half 분기: profile.system 기준 (profileKey 미사용)
      if (profile?.system === "5_half_system") {
        const CO_f = out.CO_f ?? 0;
        const C3_r = out.C3_r ?? 0;
        const Sn = (CO_f - 50) * 0.5;
        const C4_f = C3_r + Sn;
        out = {
          ...out,
          Sn,
          C4_f,
          C5_f: C4_f,
          C6_f: C4_f,
        };
      }

      return { expr, output: out };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { expr, output: {}, error: msg };
    }
  }, [input ? JSON.stringify(input) : null]);

  return res;
}

/** expr의 RHS 토큰 목록 추출 (동적 입력 UI용) */
export function getInputTokensFromExpr(expr: string): string[] {
  return getRhsTokens(expr);
}
