/**
 * domain/calculator/systemValueCalculator.ts
 *
 * AAS v2.0 Batch 4 — CAL-002/003/005 Calculation Domain SSOT.
 * STEP 4-1: buildEffectiveRenderSysValues (CAL-002).
 * STEP 4-2: computeSysOverlayValues (CAL-005) — D-008 App/Overlay 경로 해소.
 * STEP 4-3: buildSlotSysSnapshot (CAL-003) — Recall snapshot SSOT.
 */

import type { StrategyEntry } from "../positionSearchEngine";
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
import { resolveDomainFormulaExpr } from "../runtimeContractSupply";
import { calculateByProfileExpr } from "../../utils/systemCalculator";

type MergedInputs = Record<string, unknown>;
type ResolvedSlotSys = { systemId?: string } | null | undefined;
type RenderSys = {
  spaceSel?: Record<string, string>;
  corrections?: Record<string, number>;
  shotType?: string;
} | null | undefined;

export type SysOverlayFiveHalfSn = {
  Sn: number;
  C4_f: number;
  CO_f: number;
  C3_r: number;
};

export type ComputeSysOverlayValuesParams = {
  systemId: string;
  inputs: Record<string, unknown>;
  spaceSel: Record<string, string>;
  corrections: Record<string, unknown>;
  shotType: string;
  isRestored: boolean;
  hasAllInputs: boolean;
};

export type SlotSysSnapshot = {
  systemId: string;
  track: string;
  inputs: Record<string, unknown>;
  outputs: { result: Record<string, unknown> };
};

export type ComputeSysOverlayValuesResult = {
  normalizedBasePayload: Record<string, number>;
  calcResult: Record<string, number>;
  adjustedInputs: Record<string, number>;
  finalCalc: Record<string, number>;
  lhsKey: string | null;
  effDisplayMap: Record<string, number>;
  snFor5Half: SysOverlayFiveHalfSn | null;
  snFor5HalfEffective: SysOverlayFiveHalfSn | null;
  formUnifiedSlide: number;
  p_spin: number;
  formAngleTilt: number;
  p_start: number;
  systemMode: string;
  useSnForSystem: boolean;
  coKey: string;
  c1Key: string;
  c3Key: string;
};

function sysOverlayInputFinite(
  inputs: Record<string, unknown> | null | undefined,
  key: string
): number | null {
  if (!inputs || !(key in inputs)) return null;
  const v = inputs[key];
  if (v === "" || v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

/** SysOverlay hasAllInputs — UI gate (CAL-005). */
export function evaluateSysOverlayHasAllInputs(params: {
  systemId: string;
  expr: string;
  inputs: Record<string, unknown>;
  coKey: string;
  c1Key: string;
  c3Key: string;
  rhsKeys: string[];
  needsHP: boolean;
  needsAn: boolean;
}): boolean {
  const { systemId, expr, inputs, coKey, c1Key, c3Key, rhsKeys, needsHP, needsAn } =
    params;

  if (!rhsKeys || rhsKeys.length === 0) return false;

  const mode = getSysSystemMode(systemId);
  let ok: boolean;
  if (isFiveHalfSystemId(systemId)) {
    const filled = [coKey, c1Key, c3Key].filter(
      (k) => sysOverlayInputFinite(inputs, k) != null
    ).length;
    ok = filled >= 2;
    if (ok) {
      const preview = solveFiveHalfTwoOfThree(inputs, coKey, c1Key, c3Key);
      ok =
        !!preview && rhsKeys.every((k) => Number.isFinite(Number(preview[k])));
    }
  } else {
    ok = rhsKeys.every((k) => {
      if (isRhsKeyReadOnlyForSys(k, mode, c3Key)) return true;
      const v = inputs && inputs[k];
      return v !== "" && v !== null && v !== undefined;
    });
  }
  if (!ok) return false;

  if (needsHP) {
    const v = inputs.HP_n;
    if (v === "" || v === null || v === undefined) return false;
  }
  if (needsAn) {
    const v = inputs.An;
    if (v === "" || v === null || v === undefined) return false;
  }
  return true;
}

/**
 * CAL-003: Recall entry → slot draft.sys snapshot (StrategyEntry → sys snapshot).
 * formulaExpr via App-bound Contract supply (D-006 Domain Closed — STEP 6-5).
 */
export function buildSlotSysSnapshot(
  entry: StrategyEntry | null | undefined
): SlotSysSnapshot | null {
  if (!entry) return null;
  const systemId =
    entry.signature.systemId === "5_HALF"
      ? "5_half_system"
      : (entry.signature.systemId ?? "5_half_system");
  const inputs = entry.sysInputs ?? {};
  const expr = resolveDomainFormulaExpr(systemId) ?? undefined;
  const baseThreeC =
    typeof inputs.baseThreeC === "number"
      ? inputs.baseThreeC
      : typeof inputs.C3 === "number"
        ? inputs.C3
        : typeof inputs.C3_r === "number"
          ? inputs.C3_r
          : 0;
  const baseOneC =
    typeof inputs.baseOneC === "number"
      ? inputs.baseOneC
      : typeof inputs.CO === "number"
        ? inputs.CO
        : typeof inputs.CO_f === "number"
          ? inputs.CO_f
          : 0;
  const exprInputs = {
    ...inputs,
    baseThreeC,
    baseOneC,
    CO_f: typeof inputs.CO_f === "number" ? inputs.CO_f : baseOneC,
    C3_r: typeof inputs.C3_r === "number" ? inputs.C3_r : baseThreeC,
  };
  let calcResult: Record<string, unknown> = {};
  if (expr) {
    calcResult = calculateByProfileExpr(expr, exprInputs as Record<string, number>);
  }
  return {
    systemId,
    track: entry.track ?? "B2T_L",
    inputs,
    outputs: { result: calcResult },
  };
}

const EMPTY_OVERLAY_RESULT: ComputeSysOverlayValuesResult = {
  normalizedBasePayload: {},
  calcResult: {},
  adjustedInputs: {},
  finalCalc: {},
  lhsKey: null,
  effDisplayMap: {},
  snFor5Half: null,
  snFor5HalfEffective: null,
  formUnifiedSlide: 0,
  p_spin: 0,
  formAngleTilt: 0,
  p_start: 0,
  systemMode: "",
  useSnForSystem: false,
  coKey: "",
  c1Key: "",
  c3Key: "",
};

/**
 * CAL-005: SysOverlay 실시간 SYS 계산 SSOT.
 * SysOverlay.jsx inline calc → Domain (App이 prop으로 주입).
 */
export function computeSysOverlayValues(
  params: ComputeSysOverlayValuesParams
): ComputeSysOverlayValuesResult {
  const { systemId, inputs, spaceSel, corrections, shotType, isRestored, hasAllInputs } =
    params;

  const expr = resolveDomainFormulaExpr(systemId) ?? "";

  if (!expr || !expr.trim()) {
    return { ...EMPTY_OVERLAY_RESULT };
  }

  const parsed = parseSysFormulaExpr(expr);
  const { forced, neededKeys, needsHP, needsAn } = parsed;

  const lhs = expr.trim().split("=")[0].trim();
  const rhsKeys = Array.from(neededKeys || []).filter((k) => k !== lhs);
  const { coKey, c1Key, c3Key } = resolveCoC1C3Keys(forced, spaceSel);

  const systemMode = getSysSystemMode(systemId);
  const useSnForSystem = getSysUseSn(systemId);

  const payload = buildSysOverlayNumericPayload(
    inputs as Record<string, number>,
    rhsKeys,
    coKey,
    c1Key,
    c3Key,
    needsHP,
    needsAn
  );

  let normalizedBasePayload: Record<string, number>;
  if (isRestored) {
    normalizedBasePayload = payload;
  } else if (isFiveHalfSystemId(systemId)) {
    const solved = solveFiveHalfTwoOfThree(inputs, coKey, c1Key, c3Key);
    normalizedBasePayload = solved ? { ...payload, ...solved } : payload;
  } else {
    const mode = getSysSystemMode(systemId);
    normalizedBasePayload = normalizeToFormulaInputsApp(
      payload,
      mode,
      coKey,
      c1Key,
      c3Key,
      0
    );
  }

  const formUnifiedSlide = unifiedSlideFromCorrections(corrections, shotType);
  const p_spin = Number(corrections.spin) || 0;
  const formAngleTilt = Number(corrections.curve_ratio) || 0;

  const snFor5Half =
    useSnForSystem && isFiveHalfSystemId(systemId)
      ? (() => {
          const CO_base = Number(normalizedBasePayload.CO_f) || 0;
          const CO_eff = CO_base + formUnifiedSlide;
          const C3_r = Number(normalizedBasePayload.C3_r) || 0;
          return {
            Sn: (CO_eff - 50) * 0.5,
            C4_f: C3_r + (CO_eff - 50) * 0.5,
            CO_f: CO_base,
            C3_r,
          };
        })()
      : null;

  const p_start =
    useSnForSystem && isFiveHalfSystemId(systemId) && snFor5Half
      ? snFor5Half.Sn
      : Number(corrections.departure) || 0;

  if (!hasAllInputs) {
    return {
      ...EMPTY_OVERLAY_RESULT,
      normalizedBasePayload,
      snFor5Half,
      formUnifiedSlide,
      p_spin,
      formAngleTilt,
      p_start,
      systemMode,
      useSnForSystem,
      coKey,
      c1Key,
      c3Key,
    };
  }

  const calcResult = calculateByProfileExpr(expr, normalizedBasePayload);

  const adjusted = { ...normalizedBasePayload };
  if ("CO_f" in adjusted) adjusted.CO_f += formUnifiedSlide;
  if ("CO_r" in adjusted) adjusted.CO_r += formUnifiedSlide;
  if (angleSpinTargetRail === "C3" && systemMode === "full_input") {
    const c3AngleSpin = formAngleTilt + p_spin;
    if ("C3_f" in adjusted) adjusted.C3_f += c3AngleSpin;
    if ("C3_r" in adjusted) adjusted.C3_r += c3AngleSpin;
  }
  ["C4_f", "C4_r", "C5_f", "C5_r", "C6_f", "C6_r"].forEach((k) => {
    if (k in adjusted) adjusted[k] += p_start;
  });

  const finalCalc = calculateByProfileExpr(expr, adjusted);
  const finalKeys = Object.keys(finalCalc);
  const lhsKey = finalKeys.length > 0 ? finalKeys[0] : null;

  const base = normalizedBasePayload;
  let effDisplayMap: Record<string, number>;
  if (systemMode === "full_input") {
    effDisplayMap = { ...base, ...adjusted };
  } else {
    const adj = adjusted;
    const CO_eff = Number(adj?.CO_f ?? base?.CO_f ?? 0);
    const c1 = Number((c1Key && base[c1Key]) ?? 0);
    effDisplayMap = { ...base, CO_f: CO_eff };
    if (c3Key) {
      let c3Eff = CO_eff - c1;
      if (angleSpinTargetRail === "C3") {
        c3Eff += formAngleTilt + p_spin;
      }
      effDisplayMap[c3Key] = c3Eff;
    }
  }

  let snFor5HalfEffective: SysOverlayFiveHalfSn | null = null;
  if (useSnForSystem && isFiveHalfSystemId(systemId)) {
    const basePl = normalizedBasePayload;
    if (effDisplayMap && Object.keys(effDisplayMap).length > 0) {
      const CO_used = Number(effDisplayMap?.CO_f ?? basePl?.CO_f ?? 0);
      const C3_used = Number(effDisplayMap?.C3_r ?? basePl?.C3_r ?? 0);
      const Sn_eff = (CO_used - 50) * 0.5;
      const C4_eff = C3_used + Sn_eff;
      snFor5HalfEffective = {
        Sn: Sn_eff,
        C4_f: C4_eff,
        CO_f: CO_used,
        C3_r: C3_used,
      };
    }
  }

  return {
    normalizedBasePayload,
    calcResult,
    adjustedInputs: adjusted,
    finalCalc,
    lhsKey,
    effDisplayMap,
    snFor5Half,
    snFor5HalfEffective,
    formUnifiedSlide,
    p_spin,
    formAngleTilt,
    p_start,
    systemMode,
    useSnForSystem,
    coKey,
    c1Key,
    c3Key,
  };
}

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
  const expr = resolveDomainFormulaExpr(systemId) ?? "";
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
