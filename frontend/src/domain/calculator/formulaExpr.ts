/**
 * domain/calculator/formulaExpr.ts
 *
 * AAS v2.0 Batch 1 — MISC-006 (Formula Expr Parser)
 * Migration Map: App_Migration_Map.md Part A (MISC-006)
 * Design: Runtime Refactoring/Batch01/Batch1_Design.md (v1.2)
 *
 * expr 파서 / 표시식 helper.
 * Dependency Rule: domain/calculator → domain/system 만 허용 (역방향 금지).
 */

import { isFiveHalfSystemId } from "../system/systemIdentity";

export type ParsedFormulaExpr = {
  forced: Record<string, string | null>;
  neededKeys: Set<string>;
  needsHP: boolean;
  needsAn: boolean;
};

export function parseSysFormulaExpr(expr: string | null | undefined): ParsedFormulaExpr {
  if (!expr) return { forced: {}, neededKeys: new Set(), needsHP: false, needsAn: false };

  const rx = /\b(CO|C1|C2|C3|C4)_(f|r)\b/g;
  const forced: Record<string, string | null> = { CO: null, C1: null, C2: null, C3: null, C4: null };
  const neededKeys = new Set<string>();

  let m: RegExpExecArray | null;
  while ((m = rx.exec(expr)) !== null) {
    const mark = m[1];
    const sp = m[2];
    forced[mark] = sp;
    neededKeys.add(`${mark}_${sp}`);
  }

  const needsHP = /\bHP_n\b/.test(expr);
  const needsAn = /\bAn\b/.test(expr);

  return { forced, neededKeys, needsHP, needsAn };
}

/** 표시용 식: full_input은 profile 그대로, derived(5½)는 C3 자동 관계 안내 문구 */
export function getDisplayExprForSys(
  expr: string | null | undefined,
  systemId: string | null | undefined,
  systemMode: string
): string | null | undefined {
  if (!expr || !expr.trim()) return expr;
  if (systemMode === "full_input") return expr;
  if (!isFiveHalfSystemId(systemId)) return expr;
  return "C3_r = CO_f - C1_f";
}
