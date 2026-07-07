/**
 * domain/calculator/systemValueCalculator.ts
 *
 * AAS v2.0 Batch 4 — CAL-002/003/005 Calculation Domain SSOT.
 * STEP 4-1: buildEffectiveRenderSysValues (CAL-002).
 */

import { angleSpinTargetRail } from "../angleSpinCorrectionTarget";
import {
  canonicalSystemIdForConfig,
  getSysSystemMode,
  getSysUseSn,
  isFiveHalfSystemId,
} from "../system/systemIdentity";
import {
  solveFiveHalfTwoOfThree,
  fiveHalfComputedInputKey,
} from "./fiveHalfCalculator";
import { parseSysFormulaExpr } from "./formulaExpr";
import {
  resolveCoC1C3Keys,
  normalizeToFormulaInputsApp,
  isRhsKeyReadOnlyForSys,
  buildSysOverlayNumericPayload,
  unifiedSlideFromCorrections,
} from "./sysOverlayCalcHelpers";
import { SYSTEM_PROFILES } from "../../data/systems";
import { calculateByProfileExpr } from "../../utils/systemCalculator";

type MergedInputs = Record<string, unknown>;
type ResolvedSlotSys = { systemId?: string } | null | undefined;
type RenderSys = {
  spaceSel?: Record<string, string>;
  corrections?: Record<string, number>;
  shotType?: string;
} | null | undefined;

/**
 * 슬롯 sys 병합값(base) + render sys(CV·spaceSel·systemConfig) → 표시/앵커/궤적용 effective 맵.
 * SysOverlay의 normalizedBase → adjustedInputs → effDisplayMap 규약과 동일.
 */
export function buildEffectiveRenderSysValues(
  merged: MergedInputs,
  resolvedSlotSys: ResolvedSlotSys,
  adminSys: RenderSys
): Record<string, number> {
  if (!merged || typeof merged !== "object") return {};

  const mergedNums: Record<string, number> = {};
  for (const [k, v] of Object.entries(merged)) {
    if (v === "" || v == null) continue;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) continue;
    mergedNums[k] = n;
  }

  const rawSid = resolvedSlotSys?.systemId ?? "5_half_system";
  const systemId = canonicalSystemIdForConfig(rawSid);
  const systemMode = getSysSystemMode(systemId);
  const useSn = getSysUseSn(systemId);
  const profile = SYSTEM_PROFILES[systemId];
  const expr =
    typeof profile?.formula === "string"
      ? profile.formula
      : profile?.formula?.expr || "";
  if (!expr || !expr.trim()) return {};

  const { forced, neededKeys, needsHP, needsAn } = parseSysFormulaExpr(expr);
  const lhs = expr.trim().split("=")[0].trim();
  const rhsKeys = Array.from(neededKeys || []).filter((k) => k !== lhs);

  const spaceSel = adminSys?.spaceSel ?? {
    CO: "f",
    C1: "f",
    C2: "f",
    C3: "f",
    C4: "f",
  };
  const { coKey, c1Key, c3Key } = resolveCoC1C3Keys(forced, spaceSel);

  const corrections = adminSys?.corrections ?? {};
  const unifiedSlide = unifiedSlideFromCorrections(corrections, adminSys?.shotType);
  const p_spin = Number(corrections.spin) || 0;
  const angleTilt = Number(corrections.curve_ratio) || 0;

  let hasAll: boolean;
  if (isFiveHalfSystemId(systemId)) {
    const fhIn: Record<string, number> = {};
    for (const k of [coKey, c1Key, c3Key]) {
      if (mergedNums[k] != null && Number.isFinite(mergedNums[k])) fhIn[k] = mergedNums[k];
    }
    if (Object.keys(fhIn).length < 2) return {};
    hasAll = rhsKeys.every((k) => {
      const comp = fiveHalfComputedInputKey(fhIn, coKey, c1Key, c3Key);
      if (comp && k === comp) return true;
      const v = mergedNums[k];
      return v !== undefined && v !== null && Number.isFinite(v);
    });
  } else {
    hasAll = rhsKeys.every((k) => {
      if (isRhsKeyReadOnlyForSys(k, systemMode, c3Key)) return true;
      const v = mergedNums[k];
      return v !== undefined && v !== null && Number.isFinite(v);
    });
  }
  if (!hasAll) return {};

  const numericPayload = buildSysOverlayNumericPayload(
    mergedNums,
    rhsKeys,
    coKey,
    c1Key,
    c3Key,
    needsHP,
    needsAn
  );
  let normalizedBase: Record<string, number>;
  if (isFiveHalfSystemId(systemId)) {
    const fhIn: Record<string, number> = {};
    for (const k of [coKey, c1Key, c3Key]) {
      if (mergedNums[k] != null && Number.isFinite(mergedNums[k])) fhIn[k] = mergedNums[k];
    }
    const solved = solveFiveHalfTwoOfThree(fhIn, coKey, c1Key, c3Key);
    normalizedBase = solved ? { ...numericPayload, ...solved } : numericPayload;
  } else {
    normalizedBase = normalizeToFormulaInputsApp(
      numericPayload,
      systemMode,
      coKey,
      c1Key,
      c3Key,
      0
    );
  }

  const snFor5Half =
    useSn && isFiveHalfSystemId(systemId)
      ? (() => {
          const CO_base = Number(normalizedBase.CO_f) || 0;
          const CO_eff = CO_base + unifiedSlide;
          const C3_r = Number(normalizedBase.C3_r) || 0;
          return { Sn: (CO_eff - 50) * 0.5, C4_f: C3_r + (CO_eff - 50) * 0.5, CO_f: CO_base, C3_r };
        })()
      : null;
  const p_start =
    useSn && isFiveHalfSystemId(systemId) && snFor5Half
      ? snFor5Half.Sn
      : Number(corrections.departure) || 0;

  const adjusted = { ...normalizedBase };
  if ("CO_f" in adjusted) adjusted.CO_f += unifiedSlide;
  if ("CO_r" in adjusted) adjusted.CO_r += unifiedSlide;
  /* angleSpinTargetRail (domain/angleSpinCorrectionTarget): curve_ratio + spin → C3 only */
  if (angleSpinTargetRail === "C3" && systemMode === "full_input") {
    const c3AngleSpin = angleTilt + p_spin;
    if ("C3_f" in adjusted) adjusted.C3_f += c3AngleSpin;
    if ("C3_r" in adjusted) adjusted.C3_r += c3AngleSpin;
  }
  ["C4_f", "C4_r", "C5_f", "C5_r", "C6_f", "C6_r"].forEach((k) => {
    if (k in adjusted) adjusted[k] += p_start;
  });

  const finalCalc = calculateByProfileExpr(expr, adjusted);

  const base = normalizedBase;
  const adj = adjusted;
  let effDisplayMap: Record<string, number>;
  if (systemMode === "full_input") {
    effDisplayMap = { ...base, ...adjusted };
  } else {
    const CO_eff = Number(adj?.CO_f ?? base?.CO_f ?? 0);
    const c1 = Number((c1Key && base[c1Key]) ?? 0);
    effDisplayMap = { ...base, CO_f: CO_eff };
    if (c3Key) {
      let c3Eff = CO_eff - c1;
      if (angleSpinTargetRail === "C3") {
        c3Eff += angleTilt + p_spin;
      }
      effDisplayMap[c3Key] = c3Eff;
    }
  }

  const out: Record<string, number> = { ...mergedNums, ...finalCalc, ...effDisplayMap };

  if (useSn && isFiveHalfSystemId(systemId)) {
    const CO_used = Number(effDisplayMap.CO_f ?? 0);
    const C3_used = Number(effDisplayMap.C3_r ?? effDisplayMap.C3_f ?? 0);
    const Sn_eff = (CO_used - 50) * 0.5;
    out.Sn = Sn_eff;
    out.C4_f = C3_used + Sn_eff;
    out.C5_f = out.C4_f;
    out.C6_f = out.C4_f;
    out.CO_f = CO_used;
    if (effDisplayMap.C3_r != null) out.C3_r = C3_used;
  }

  return out;
}
