// frontend/src/hooks/useSysCalculation.ts
import { useMemo } from "react";

// (1) 시스템 프로파일 레지스트리에서 systemId → profile 로딩
// 프로젝트 구조에 맞게 경로를 조정하세요.
import OTIP_PLUS_PROFILE from "../systems/otip_plus/profile.json";

/** 시스템 레지스트리: 필요 시 다른 시스템도 추가 */
const SYSTEM_PROFILES: Record<string, any> = {
  otip_plus: OTIP_PLUS_PROFILE
};

/** 외부 수식 계산기(프로젝트에 이미 존재한다면 아래 import를 주석 해제)
 *  import { calculateByProfileExpr } from "@/utils/calculateByProfileExpr";
 */
type Values = Record<string, number>;

type CalcResult = {
  expr: string;
  output: Values;
  error?: string;
};

/** (2) Fallback evaluator: "LHS = <arithmetic RHS>" 만 지원 */
function fallbackCalculateByProfileExpr(expr: string, values: Values): Values {
  // 분해: "C2_f = <RHS>"
  const parts = expr.split("=");
  if (parts.length !== 2) {
    throw new Error(`Unsupported expr: expected "LHS = RHS", got "${expr}"`);
  }
  const lhs = parts[0].trim();
  const rhs = parts[1].trim();

  // 변수 치환: 안전하게 토큰 단위로 치환
  // 허용 토큰: 변수명(\w+), 숫자, 연산자, 괄호, 공백, 소수점
  // 정규화: 변수 테이블에서 값 가져오기
  const tokens = rhs.match(/[A-Za-z_][A-Za-z0-9_]*|\d+\.\d+|\d+|[\+\-\*\/\(\)]/g);
  if (!tokens) {
    throw new Error(`Failed to tokenize RHS: "${rhs}"`);
  }

  const rhsJs = tokens
    .map((t) => {
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(t)) {
        if (!(t in values)) throw new Error(`Missing variable: ${t}`);
        const v = values[t];
        if (typeof v !== "number" || Number.isNaN(v)) {
          throw new Error(`Invalid number for ${t}: ${v}`);
        }
        return String(v);
      }
      if (/^\d+(\.\d+)?$/.test(t)) return t;
      if (/^[\+\-\*\/\(\)]$/.test(t)) return t;
      throw new Error(`Illegal token: ${t}`);
    })
    .join(" ");

  // 평가: Math만 허용된 안전한 함수 스코프
  // (연산자/숫자만 존재하므로 실제로 Math는 쓰지 않음)
  // eslint-disable-next-line no-new-func
  const fn = new Function("Math", `return (${rhsJs});`);
  const result = fn(Math);
  if (typeof result !== "number" || !Number.isFinite(result)) {
    throw new Error(`RHS evaluated to non-finite number: ${result}`);
  }

  const out: Values = { ...values };
  out[lhs] = result;
  return out;
}

/** (3) 실제 훅: 프로파일 로딩 → expr 해석 → 계산 */
export function useSysCalculation(systemId: string, input: Values): CalcResult {
  const res = useMemo<CalcResult>(() => {
    const profile = SYSTEM_PROFILES[systemId];
    if (!profile) {
      return { expr: "", output: {}, error: `Unknown systemId: ${systemId}` };
    }

    const expr: string = profile?.formula?.expr;
    if (!expr || typeof expr !== "string") {
      return { expr: "", output: {}, error: "profile.formula.expr not found" };
    }

    // 값 준비: 도메인 범위 체크(하드 클램프는 프로젝트 정책에 따라 조정)
    const values: Values = { ...input };

    // 권장: C1_f 하한 0.05 (분모 0 방지) — 프로필에도 range로 명시됨.
    if (typeof values.C1_f === "number" && values.C1_f < 0.05) {
      values.C1_f = 0.05;
    }
    // is_left 정규화: {0,1} 이외 값이 오면 0/1로 스냅
    if (typeof values.is_left === "number") {
      values.is_left = values.is_left >= 0.5 ? 1 : 0;
    }

    try {
      // (A) 프로젝트 기본 계산기 사용 (있다면)
      // const out = calculateByProfileExpr(expr, values);

      // (B) Fallback 계산기 사용 (상단 import 부재 시)
      const out = fallbackCalculateByProfileExpr(expr, values);

      return { expr, output: out };
    } catch (e: any) {
      return { expr, output: {}, error: e?.message ?? String(e) };
    }
  }, [systemId, JSON.stringify(input)]); // 입력 변경 시 재계산

  return res;
}

/** 사용 예:
 * const { expr, output, error } = useSysCalculation("otip_plus", {
 *   CO_f: 6, C1_f: 17.78, is_left: 1
 * });
 * // output.C2_f ≈ 7.5
 */
