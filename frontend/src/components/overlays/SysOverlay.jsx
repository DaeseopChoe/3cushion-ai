import { useState, useEffect, useMemo } from "react";
import { SYSTEM_PROFILES } from "../../data/systems";
import { formatResultNum } from "../../utils/geometry/coords";
import {
  parseSysFormulaExpr,
  getDisplayExprForSys,
} from "../../domain/calculator/formulaExpr";
import {
  canonicalSystemIdForConfig,
  getSysSystemMode,
  getSysUseSn,
  isFiveHalfSystemId,
} from "../../domain/system/systemIdentity";
import { fiveHalfComputedInputKey } from "../../domain/calculator/fiveHalfCalculator";
import { angleSpinTargetRail } from "../../domain/angleSpinCorrectionTarget";
import {
  resolveCoC1C3Keys,
  fmtFiveHalfDisplayNum,
  fmtSysOverlayInputDisplay,
  normalizeToFormulaInputsApp,
  isRhsKeyReadOnlyForSys,
  isMarkBasisReadOnly,
  lhsTokenFromExpr,
  showMarkRowExtraForSys,
  buildSysOverlayInitialInputs,
  buildSysOverlayNumericPayload,
  unifiedSlideFromCorrections,
  normalizeSlideDrawCorrections,
  formatFormulaDisplay,
  renderMixedFormulaLine,
  renderSysFormulaContent,
} from "../../overlay/utils/sysOverlayUtils";

/**
 * AD-B2-01: Presentation Layer Pure.
 * SysOverlay 내부에서 Domain 계산 함수를 직접 호출하지 않는다.
 * computeValues(expr, payload) = calculateByProfileExpr (App이 주입)
 * solveFiveHalf(inputs, coKey, c1Key, c3Key) = solveFiveHalfTwoOfThree (App이 주입)
 */

/** module-private: sysOverlayInputFinite 역할 (AD-B2-02: export 제거) */
function checkInputFinite(inputs, key) {
  if (!inputs || !(key in inputs)) return null;
  const v = inputs[key];
  if (v === "" || v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

export function SysOverlay({ data, onSave, onCancel, computeValues, solveFiveHalf }) {
  // ==========================================
  // v1 공략 유형 (내부 상수 고정)
  // D-004: SYSTEM_OPTIONS 하드코딩 → Batch 6 (Runtime Contract 후) 해소 예정
  // ==========================================
  const SHOT_TYPE_OPTIONS = [
    "뒤돌리기",
    "옆돌리기",
    "앞돌리기",
    "세워치기",
    "비켜치기",
    "더블쿠션",
    "횡단샷",
    "리버스",
    "짧은 뒤돌리기",
    "뒤돌리기 대회전",
    "옆돌리기 대회전",
    "앞돌리기 대회전",
    "더블 레일",
    "1뱅크",
    "2뱅크",
    "3뱅크",
    "대회전 뱅크",
    "바운딩"
  ];

  // ==========================================
  // v1 적용 시스템 (내부 상수 고정)
  // D-004: 하드코딩 → Batch 6 (Runtime Contract 후) 해소 예정
  // ==========================================
  const SYSTEM_OPTIONS = [
    { id: "5_half_system", label: "파이브 앤드 하프 시스템" },
    { id: "rodriguez", label: "로드리게스" },
    { id: "ball_system", label: "볼 시스템" },
    { id: "sunrise_sunset", label: "일출·일몰 시스템" },
    { id: "plus_system", label: "플러스 시스템" },
    { id: "plus2_system", label: "플러스2 시스템" },
    { id: "3tip_plus", label: "3팁 플러스" },
    { id: "2_3_system", label: "3분의 2 시스템" },
    { id: "35half", label: "35와 ½ 시스템" },
    { id: "double_rail", label: "더블 레일" },
    { id: "peruvian_system", label: "페루 시스템" },
    { id: "reverse_end_system", label: "리버스 엔드" },
    { id: "zigzag_system", label: "지그재그" },
    { id: "7_system", label: "7 시스템" },
    { id: "99 to 1", label: "99 to 1" },
    { id: "clay_shooting", label: "클레이 사격" },
    { id: "long_plate_system", label: "긴각 접시" },
    { id: "long_wedge", label: "롱 웨지" },
    { id: "reverse_system", label: "리버스 시스템" },
    { id: "schaefer_system", label: "쉐퍼 시스템" },
    { id: "tokyo_system", label: "도쿄 시스템" },
    { id: "turkish_angle_system", label: "터키 시스템" },
    { id: "short_plate_system", label: "짧은각 접시" },
    { id: "short_wedge", label: "숏 웨지" },
    { id: "spider_web", label: "거미줄 시스템" },
    { id: "0tip plus", label: "0팁 플러스" },
    { id: "1byhalf", label: "반팁 시스템" },
    { id: "3and4_system", label: "3과4 시스템" },
    { id: "3tip_across", label: "3팁 횡단" },
    { id: "Plus_5_system", label: "플러스 5" },
    { id: "minus_5_system", label: "마이너스 5" },
    { id: "n_across", label: "N자 횡단" },
    { id: "n_across_short", label: "짧은 N자 횡단" },
    { id: "spread30", label: "스프레드 30" },
    { id: "split", label: "분열" },
    { id: "accordion", label: "아코디언" },
    { id: "florida_system", label: "플로리다 시스템" }
  ];

  // ==========================================
  // HP_n 드롭다운 옵션
  // ==========================================
  const HP_OPTIONS = [
    { label: "좌 4팁 (-4)", value: -4 },
    { label: "좌 3팁 (-3)", value: -3 },
    { label: "좌 2팁 (-2)", value: -2 },
    { label: "좌 1팁 (-1)", value: -1 },
    { label: "무회전 (0)", value: 0 },
    { label: "우 1팁 (1)", value: 1 },
    { label: "우 2팁 (2)", value: 2 },
    { label: "우 3팁 (3)", value: 3 },
    { label: "우 4팁 (4)", value: 4 },
  ];

  // ==========================================
  // 상태 관리 (완성 키 방식)
  // ==========================================
  const [formData, setFormData] = useState({
    shotType: data?.shotType || "뒤돌리기",
    system: data?.system || data?.system_id || SYSTEM_OPTIONS[0]?.id || "5_half_system",
    track: data?.track || "B2T_L",
    inputs: buildSysOverlayInitialInputs(data),
    corrections: {
      curve_ratio: data?.corrections?.curve_ratio || 0,
      departure: data?.corrections?.departure || 0,
      spin: data?.corrections?.spin || 0,
      ...normalizeSlideDrawCorrections(data?.corrections),
    },
  });

  useEffect(() => {
    const t = data?.track || "B2T_L";
    setFormData((prev) => (prev.track === t ? prev : { ...prev, track: t }));
  }, [data?.track]);

  // UI 토글 상태 (표시용) - 계산키와 분리
  const [spaceSel, setSpaceSel] = useState({
    CO: data?.spaceSel?.CO || "f",
    C1: data?.spaceSel?.C1 || "f",
    C2: data?.spaceSel?.C2 || "f",
    C3: data?.spaceSel?.C3 || "f",
    C4: data?.spaceSel?.C4 || "f"
  });

  /** true면 저장값 복원 직후 — normalizeToFormulaInputsApp 비활성(덮어쓰기 방지) */
  const [isRestored, setIsRestored] = useState(() => {
    const s = data?.system_values;
    return !!(s && typeof s === "object" && Object.keys(s).length > 0);
  });

  useEffect(() => {
    const saved = data?.system_values;
    if (!saved || typeof saved !== "object" || Object.keys(saved).length === 0) return;
    setFormData((prev) => {
      const mergedCorr = { ...prev.corrections, ...(data.corrections || {}) };
      return {
        ...prev,
        inputs: buildSysOverlayInitialInputs(data),
        corrections: {
          ...mergedCorr,
          ...normalizeSlideDrawCorrections(mergedCorr),
        },
      };
    });
    setIsRestored(true);
  }, [data?.system_values]);

  // ==========================================
  // 공식 로딩 및 파싱
  // ==========================================
  const profile = SYSTEM_PROFILES?.[formData.system];
  const expr = typeof profile?.formula === "string"
    ? profile.formula
    : profile?.formula?.expr || "";

  const parsed = useMemo(() => parseSysFormulaExpr(expr), [expr]);
  const { forced, neededKeys, needsHP, needsAn } = parsed;

  const rhsKeys = useMemo(() => {
    const keyList = Array.from(neededKeys || []);
    if (!expr || !expr.trim()) return keyList;
    const lhs = expr.trim().split('=')[0].trim();
    return keyList.filter((k) => k !== lhs);
  }, [expr, neededKeys]);

  const exprLhsToken = useMemo(() => lhsTokenFromExpr(expr), [expr]);
  const { coKey, c1Key, c3Key } = useMemo(
    () => resolveCoC1C3Keys(forced, spaceSel),
    [forced, spaceSel]
  );

  const systemMode = getSysSystemMode(formData.system);
  const useSnForSystem = getSysUseSn(formData.system);

  const normalizedBasePayload = useMemo(() => {
    if (!expr || !expr.trim()) return {};
    const payload = buildSysOverlayNumericPayload(
      formData.inputs,
      rhsKeys,
      coKey,
      c1Key,
      c3Key,
      needsHP,
      needsAn
    );
    if (isRestored) {
      return payload;
    }
    if (isFiveHalfSystemId(formData.system)) {
      // AD-B2-01: solveFiveHalf prop 호출 (computeValues 주입 패턴)
      const solved = solveFiveHalf(formData.inputs, coKey, c1Key, c3Key);
      if (solved) {
        return { ...payload, ...solved };
      }
      return payload;
    }
    const mode = getSysSystemMode(formData.system);
    return normalizeToFormulaInputsApp(payload, mode, coKey, c1Key, c3Key, 0);
  }, [
    expr,
    rhsKeys,
    formData.inputs,
    formData.system,
    needsHP,
    needsAn,
    coKey,
    c1Key,
    c3Key,
    isRestored,
    solveFiveHalf,
  ]);

  // 공식 로딩 시 f/r 스위치 자동 고정
  useEffect(() => {
    const { forced: forcedSpaces } = parsed;
    setSpaceSel(prev => {
      const next = { ...prev };
      (["CO", "C1", "C2", "C3", "C4"]).forEach(k => {
        if (forcedSpaces[k]) next[k] = forcedSpaces[k];
      });
      return next;
    });
  }, [expr]);

  const hasAllInputs = useMemo(() => {
    if (!rhsKeys || rhsKeys.length === 0) return false;

    const mode = getSysSystemMode(formData.system);
    let ok;
    if (isFiveHalfSystemId(formData.system)) {
      // AD-B2-02: checkInputFinite (module-private, 대체 sysOverlayInputFinite)
      const filled = [coKey, c1Key, c3Key].filter(
        (k) => checkInputFinite(formData.inputs, k) != null
      ).length;
      ok = filled >= 2;
      if (ok) {
        const preview = solveFiveHalf(formData.inputs, coKey, c1Key, c3Key);
        ok = !!preview && rhsKeys.every((k) => Number.isFinite(Number(preview[k])));
      }
    } else {
      ok = rhsKeys.every((k) => {
        if (isRhsKeyReadOnlyForSys(k, mode, c3Key)) return true;
        const v = formData.inputs && formData.inputs[k];
        return v !== "" && v !== null && v !== undefined;
      });
    }
    if (!ok) return false;

    if (needsHP) {
      const v = formData.inputs.HP_n;
      if (v === "" || v === null || v === undefined) return false;
    }
    if (needsAn) {
      const v = formData.inputs.An;
      if (v === "" || v === null || v === undefined) return false;
    }
    return true;
  }, [formData.inputs, rhsKeys, needsHP, needsAn, formData.system, c3Key, coKey, c1Key, solveFiveHalf]);

  // ==========================================
  // AD-B2-01: 계산 엔진 연결 — computeValues prop 호출
  // ==========================================
  const [calcResult, setCalcResult] = useState({});

  useEffect(() => {
    if (!expr) {
      setCalcResult({});
      return;
    }
    if (!hasAllInputs) {
      setCalcResult({});
      return;
    }

    // AD-B2-01: Domain 함수는 computeValues prop을 통해 호출
    const result = computeValues(expr, normalizedBasePayload);
    setCalcResult((prev) => {
      const prevKey = Object.keys(prev)[0];
      const nextKey = Object.keys(result)[0];
      if (prevKey === nextKey && prev[prevKey] === result[nextKey]) return prev;
      return result;
    });
  }, [expr, hasAllInputs, normalizedBasePayload, computeValues]);

  const baseResultValue = Object.keys(calcResult).length > 0 ? Object.values(calcResult)[0] : null;
  const baseResultKey = Object.keys(calcResult).length > 0 ? Object.keys(calcResult)[0] : null;

  useEffect(() => {
    if (isFiveHalfSystemId(formData.system)) return;
    if (!baseResultKey || baseResultValue == null) return;

    setFormData(prev => {
      if (Number(prev.inputs[baseResultKey]) === Number(baseResultValue)) return prev;
      return {
        ...prev,
        inputs: { ...prev.inputs, [baseResultKey]: formatResultNum(baseResultValue) }
      };
    });
  }, [baseResultValue, baseResultKey, formData.system]);

  // 물리 보정
  const formUnifiedSlide = unifiedSlideFromCorrections(
    formData.corrections,
    formData.shotType
  );
  const p_spin = Number(formData.corrections.spin) || 0;
  const formAngleTilt = Number(formData.corrections.curve_ratio) || 0;
  const snFor5Half = useMemo(() => {
    if (!useSnForSystem || !isFiveHalfSystemId(formData.system)) return null;
    const CO_base = Number(normalizedBasePayload.CO_f) || 0;
    const CO_eff = CO_base + formUnifiedSlide;
    const C3_r = Number(normalizedBasePayload.C3_r) || 0;
    return { Sn: (CO_eff - 50) * 0.5, C4_f: C3_r + (CO_eff - 50) * 0.5, CO_f: CO_base, C3_r };
  }, [
    formData.system,
    formData.shotType,
    normalizedBasePayload,
    useSnForSystem,
    formUnifiedSlide,
  ]);
  const p_start =
    useSnForSystem && isFiveHalfSystemId(formData.system) && snFor5Half
      ? snFor5Half.Sn
      : Number(formData.corrections.departure) || 0;

  const { adjustedInputs, finalCalc, lhsKey } = useMemo(() => {
    if (!expr || !expr.trim()) return { adjustedInputs: {}, finalCalc: {}, lhsKey: null };
    if (!hasAllInputs) return { adjustedInputs: {}, finalCalc: {}, lhsKey: null };
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

    // AD-B2-01: Domain 함수는 computeValues prop을 통해 호출
    const final = computeValues(expr, adjusted);
    const keys = Object.keys(final);
    return { adjustedInputs: adjusted, finalCalc: final, lhsKey: keys.length > 0 ? keys[0] : null };
  }, [
    expr,
    hasAllInputs,
    normalizedBasePayload,
    formUnifiedSlide,
    p_spin,
    formAngleTilt,
    systemMode,
    p_start,
    needsHP,
    needsAn,
    computeValues,
  ]);

  /** 표시용: full_input은 base 그대로, derived는 CO 보정 후 C3 = CO_eff − C1(base). */
  const effDisplayMap = useMemo(() => {
    if (!hasAllInputs) return {};
    const base = normalizedBasePayload;
    if (systemMode === "full_input") {
      return { ...base, ...adjustedInputs };
    }
    const adj = adjustedInputs;
    const CO_eff = Number(adj?.CO_f ?? base?.CO_f ?? 0);
    const c1 = Number((c1Key && base[c1Key]) ?? 0);
    const out = { ...base, CO_f: CO_eff };
    if (c3Key) {
      let c3Eff = CO_eff - c1;
      if (angleSpinTargetRail === "C3") {
        c3Eff += formAngleTilt + p_spin;
      }
      out[c3Key] = c3Eff;
    }
    return out;
  }, [
    hasAllInputs,
    normalizedBasePayload,
    adjustedInputs,
    systemMode,
    c1Key,
    c3Key,
    formAngleTilt,
    p_spin,
  ]);

  const snFor5HalfEffective = useMemo(() => {
    if (!useSnForSystem || !isFiveHalfSystemId(formData.system) || !hasAllInputs) return null;
    const basePl = normalizedBasePayload;
    if (!effDisplayMap || Object.keys(effDisplayMap).length === 0) return null;
    const CO_used = Number(effDisplayMap?.CO_f ?? basePl?.CO_f ?? 0);
    const C3_used = Number(effDisplayMap?.C3_r ?? basePl?.C3_r ?? 0);
    const Sn_eff = (CO_used - 50) * 0.5;
    const C4_eff = C3_used + Sn_eff;
    return {
      Sn: Sn_eff,
      C4_f: C4_eff,
      CO_f: CO_used,
      C3_r: C3_used,
    };
  }, [formData.system, hasAllInputs, effDisplayMap, normalizedBasePayload, useSnForSystem]);

  const finalResultDisplay = (() => {
    if (!lhsKey) return null;
    const v = finalCalc[lhsKey];
    return v != null ? v : null;
  })();

  const handleInputChange = (key, value) => {
    setIsRestored(false);
    setFormData((prev) => ({
      ...prev,
      inputs: { ...prev.inputs, [key]: value },
    }));
  };

  // ==========================================
  // 저장 핸들러
  // ==========================================
  const handleSave = () => {
    const systemValuesBase =
      hasAllInputs &&
      normalizedBasePayload &&
      Object.keys(normalizedBasePayload).length > 0
        ? { ...normalizedBasePayload }
        : undefined;
    console.log("[SAVE] system_values (base) =", systemValuesBase);
    const saveData = {
      ...formData,
      track: formData.track,
      spaceSel,
      calculated: calcResult,
      finalResult: finalResultDisplay,
      adjustedInputs,
      ...(systemValuesBase != null ? { system_values: systemValuesBase } : {}),
      sys_system_mode: systemMode,
      sys_use_sn: useSnForSystem,
    };
    onSave(saveData);
  };

  const displayExpr = useMemo(
    () => getDisplayExprForSys(expr, formData.system, systemMode),
    [expr, formData.system, systemMode]
  );

  const baseDisplayMap = useMemo(
    () => ({ ...normalizedBasePayload, ...calcResult }),
    [normalizedBasePayload, calcResult]
  );

  const baseFormulaLine = useMemo(() => {
    if (!displayExpr || !displayExpr.trim()) return "입력 대기 중...";
    if (!hasAllInputs) return "입력 대기 중...";
    return formatFormulaDisplay(displayExpr, baseDisplayMap);
  }, [displayExpr, hasAllInputs, baseDisplayMap]);

  /** 기준(base): 항상 C1 = CO − C3, 값은 normalizedBasePayload만 */
  const fiveHalfBaseDisplayLine = useMemo(() => {
    if (!isFiveHalfSystemId(formData.system) || !hasAllInputs) return null;
    const co = Number(normalizedBasePayload[coKey]);
    const c1 = Number(normalizedBasePayload[c1Key]);
    const c3 = Number(normalizedBasePayload[c3Key]);
    return `${c1Key}_${fmtFiveHalfDisplayNum(c1)} = ${coKey}_${fmtFiveHalfDisplayNum(co)} - ${c3Key}_${fmtFiveHalfDisplayNum(c3)}`;
  }, [formData.system, hasAllInputs, normalizedBasePayload, coKey, c1Key, c3Key]);

  const effectiveFormulaLine = useMemo(() => {
    if (!displayExpr || !displayExpr.trim()) return null;
    if (!hasAllInputs) return null;
    return formatFormulaDisplay(displayExpr, effDisplayMap);
  }, [displayExpr, hasAllInputs, effDisplayMap]);

  const hasSlideDraw = formUnifiedSlide !== 0;
  const hasRailAngleSpin = formAngleTilt !== 0 || p_spin !== 0;
  const hasManualDeparture =
    !snFor5HalfEffective &&
    Math.abs(Number(formData.corrections.departure) || 0) > 1e-9;
  const hasAnyCorrection = hasSlideDraw || hasRailAngleSpin || hasManualDeparture;

  /** 5½ derived: C3 after CO 슬라이드만 (레일 기울기·스핀 제외) */
  const c3AfterSlideOnlyFiveHalf = useMemo(() => {
    if (!isFiveHalfSystemId(formData.system) || !hasAllInputs || systemMode === "full_input") {
      return null;
    }
    const coE = Number(adjustedInputs[coKey]);
    const c1 = Number(normalizedBasePayload[c1Key]);
    if (!Number.isFinite(coE) || !Number.isFinite(c1)) return null;
    return coE - c1;
  }, [
    formData.system,
    hasAllInputs,
    systemMode,
    adjustedInputs,
    coKey,
    c1Key,
    normalizedBasePayload,
  ]);

  const eduStartCorrectionLine = useMemo(() => {
    if (!hasSlideDraw || !hasAllInputs) return null;
    const coBase = Number(normalizedBasePayload[coKey]);
    const coEff = Number(adjustedInputs[coKey]);
    if (!Number.isFinite(coBase) || !Number.isFinite(coEff)) return null;
    const f = fmtFiveHalfDisplayNum;
    if (formUnifiedSlide > 0) {
      return `출발값 보정 : ${coKey}_${f(coBase)} + 밀림 ${f(formUnifiedSlide)} = ${coKey}_${f(coEff)}`;
    }
    return `출발값 보정 : ${coKey}_${f(coBase)} - 끌림 ${f(Math.abs(formUnifiedSlide))} = ${coKey}_${f(coEff)}`;
  }, [
    hasSlideDraw,
    hasAllInputs,
    normalizedBasePayload,
    coKey,
    adjustedInputs,
    formUnifiedSlide,
  ]);

  const eduRailCorrectionLine = useMemo(() => {
    if (!hasRailAngleSpin || !hasAllInputs || !c3Key) return null;
    const c3Eff = Number(effDisplayMap[c3Key]);
    if (!Number.isFinite(c3Eff)) return null;
    const f = fmtFiveHalfDisplayNum;
    let c3Mid;
    if (isFiveHalfSystemId(formData.system) && systemMode !== "full_input" && c3AfterSlideOnlyFiveHalf != null) {
      c3Mid = c3AfterSlideOnlyFiveHalf;
    } else {
      c3Mid = Number(normalizedBasePayload[c3Key]);
    }
    if (!Number.isFinite(c3Mid)) return null;
    const parts = [`${c3Key}_${f(c3Mid)}`];
    if (formAngleTilt !== 0) {
      parts.push(
        formAngleTilt > 0
          ? `+ 기울기 ${f(formAngleTilt)}`
          : `- 기울기 ${f(Math.abs(formAngleTilt))}`
      );
    }
    if (p_spin !== 0) {
      parts.push(p_spin > 0 ? `+ 스핀 ${f(p_spin)}` : `- 스핀 ${f(Math.abs(p_spin))}`);
    }
    return `3쿠션값 보정 : ${parts.join(" ")} = ${c3Key}_${f(c3Eff)}`;
  }, [
    hasRailAngleSpin,
    hasAllInputs,
    c3Key,
    effDisplayMap,
    normalizedBasePayload,
    formAngleTilt,
    p_spin,
    formData.system,
    systemMode,
    c3AfterSlideOnlyFiveHalf,
  ]);

  const eduCorrectedFormulaLine = useMemo(() => {
    if (!hasAnyCorrection || !hasAllInputs) return null;
    if (isFiveHalfSystemId(formData.system) && (hasSlideDraw || hasRailAngleSpin)) {
      const c1 = Number(normalizedBasePayload[c1Key]);
      const coE = Number(effDisplayMap[coKey]);
      const c3E = Number(effDisplayMap[c3Key]);
      if (!Number.isFinite(c1) || !Number.isFinite(coE) || !Number.isFinite(c3E)) return null;
      return `${c1Key}_${fmtFiveHalfDisplayNum(c1)} = ${coKey}_${fmtFiveHalfDisplayNum(coE)} - ${c3Key}_${fmtFiveHalfDisplayNum(c3E)}`;
    }
    if (!displayExpr || !displayExpr.trim()) return null;
    return effectiveFormulaLine;
  }, [
    hasAnyCorrection,
    hasAllInputs,
    formData.system,
    hasSlideDraw,
    hasRailAngleSpin,
    normalizedBasePayload,
    c1Key,
    coKey,
    c3Key,
    effDisplayMap,
    displayExpr,
    effectiveFormulaLine,
  ]);

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (hasAllInputs) handleSave();
  };

  return (
    <form
      onSubmit={handleFormSubmit}
      style={{
        color: '#334155',
        fontSize: '14px',
        lineHeight: 1.55,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        flexWrap: 'wrap',
        overflowX: 'hidden'
      }}
    >
      {/* [B] 상단 설정: 공략 유형(고정폭) | 적용 시스템(남은 공간) */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: '0 0 auto' }}>
        <div style={{ flex: '0 0 160px' }}>
          <select
            value={formData.shotType}
            onChange={(e) => {
              setIsRestored(false);
              setFormData({ ...formData, shotType: e.target.value });
            }}
            style={{
              width: '100%',
              height: '36px',
              padding: '0 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
          >
            {SHOT_TYPE_OPTIONS.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <select
            value={formData.system}
            onChange={(e) => {
              setIsRestored(false);
              setFormData({ ...formData, system: e.target.value });
            }}
            style={{
              width: '100%',
              height: '36px',
              padding: '0 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '14px',
              backgroundColor: '#fff',
              cursor: 'pointer'
            }}
          >
            {SYSTEM_OPTIONS.map(sys => (
              <option key={sys.id} value={sys.id}>{sys.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span style={{ fontSize: '12px', fontWeight: 600, color: '#64748b' }}>트랙 (Track)</span>
        <select
          value={formData.track}
          onChange={(e) => {
            setIsRestored(false);
            setFormData({ ...formData, track: e.target.value });
          }}
          style={{
            width: '100%',
            height: '36px',
            padding: '0 10px',
            border: '1px solid #cbd5e1',
            borderRadius: '6px',
            fontSize: '14px',
            backgroundColor: '#fff'
          }}
        >
          <option value="B2T_R">B2T_R</option>
          <option value="B2T_L">B2T_L</option>
          <option value="T2B_R">T2B_R</option>
          <option value="T2B_L">T2B_L</option>
        </select>
      </div>

      {/* [D] 기준 입력값: flex-wrap, 폭 하드 지정 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '6px',
          alignItems: 'center'
        }}
      >
        {["CO", "C1", "C2", "C3", "C4"].map(mark => {
          const sel = spaceSel[mark];
          const key = `${mark}_${sel}`;
          let inputKey = key;
          if (
            showMarkRowExtraForSys(mark, systemMode, exprLhsToken) &&
            mark === "C1" &&
            exprLhsToken.startsWith("C1_")
          ) {
            inputKey = exprLhsToken;
          } else if (
            showMarkRowExtraForSys(mark, systemMode, exprLhsToken) &&
            mark === "C3" &&
            exprLhsToken.startsWith("C3_")
          ) {
            inputKey = exprLhsToken;
          } else if (
            showMarkRowExtraForSys(mark, systemMode, exprLhsToken) &&
            mark === "CO" &&
            exprLhsToken.startsWith("CO_")
          ) {
            inputKey = exprLhsToken;
          }
          const enabled = neededKeys.has(key) || showMarkRowExtraForSys(mark, systemMode, exprLhsToken);
          const lock = !!forced[mark];
          const fiveHalfComp = isFiveHalfSystemId(formData.system)
            ? fiveHalfComputedInputKey(formData.inputs, coKey, c1Key, c3Key)
            : null;
          const basisRO =
            (mark === "CO" || mark === "C1" || mark === "C3") &&
            (isFiveHalfSystemId(formData.system)
              ? fiveHalfComp != null && inputKey === fiveHalfComp
              : isMarkBasisReadOnly(mark, systemMode));
          const readOnly = basisRO;
          const numDisplay =
            normalizedBasePayload[inputKey] != null && Number.isFinite(Number(normalizedBasePayload[inputKey]))
              ? normalizedBasePayload[inputKey]
              : formData.inputs[inputKey] ?? "";
          return (
            <div
              key={mark}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                opacity: enabled ? 1 : 0.3,
                pointerEvents: enabled ? 'auto' : 'none'
              }}
            >
              <label style={{ minWidth: '22px', fontSize: '12px', fontWeight: '600' }}>{mark}</label>
              <input
                type="number"
                step="0.5"
                readOnly={readOnly}
                value={
                  readOnly
                    ? fmtSysOverlayInputDisplay(numDisplay)
                    : fmtSysOverlayInputDisplay(formData.inputs[inputKey])
                }
                onChange={(e) => !readOnly && handleInputChange(inputKey, e.target.value)}
                style={{
                  width: '70px',
                  height: '32px',
                  padding: '0 6px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '13px',
                  boxSizing: 'border-box',
                  backgroundColor: readOnly ? "#f1f5f9" : "#fff"
                }}
              />
              <div style={{ display: 'flex', gap: '1px' }}>
                <button
                  type="button"
                  disabled={lock || basisRO}
                  onClick={() => {
                    setIsRestored(false);
                    setSpaceSel((p) => ({ ...p, [mark]: "f" }));
                  }}
                  style={{
                    width: '24px',
                    height: '32px',
                    padding: 0,
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '600',
                    cursor: lock || basisRO ? 'not-allowed' : 'pointer',
                    backgroundColor: sel === "f" ? '#3b82f6' : '#fff',
                    color: sel === "f" ? '#fff' : '#64748b'
                  }}
                >
                  f
                </button>
                <button
                  type="button"
                  disabled={lock || basisRO}
                  onClick={() => {
                    setIsRestored(false);
                    setSpaceSel((p) => ({ ...p, [mark]: "r" }));
                  }}
                  style={{
                    width: '24px',
                    height: '32px',
                    padding: 0,
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '600',
                    cursor: lock || basisRO ? 'not-allowed' : 'pointer',
                    backgroundColor: sel === "r" ? '#ef4444' : '#fff',
                    color: sel === "r" ? '#fff' : '#64748b'
                  }}
                >
                  r
                </button>
              </div>
            </div>
          );
        })}
        <div style={{ opacity: needsHP ? 1 : 0.3, pointerEvents: needsHP ? 'auto' : 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600' }}>HP_n</label>
          <select
            value={formData.inputs.HP_n}
            onChange={(e) => handleInputChange('HP_n', Number(e.target.value))}
            style={{
              width: '110px',
              height: '32px',
              padding: '0 6px',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              fontSize: '13px',
              backgroundColor: '#fff',
              cursor: 'pointer',
              boxSizing: 'border-box'
            }}
          >
            {HP_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div style={{ opacity: needsAn ? 1 : 0.3, pointerEvents: needsAn ? 'auto' : 'none', display: 'flex', alignItems: 'center', gap: '4px' }}>
          <label style={{ fontSize: '12px', fontWeight: '600' }}>An</label>
          <input
            type="number"
            step="0.1"
            value={fmtSysOverlayInputDisplay(formData.inputs.An)}
            onChange={(e) => {
              const v = Number(e.target.value);
              handleInputChange('An', isNaN(v) ? 0 : Math.round(v * 10) / 10);
            }}
            style={{
              width: '70px',
              height: '32px',
              padding: '0 6px',
              border: '1px solid #cbd5e1',
              borderRadius: '4px',
              fontSize: '13px',
              backgroundColor: '#fff',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* [C] 계산 공식 (입력 필드 아래) */}
      <div
        style={{
          padding: '6px 8px',
          backgroundColor: '#f1f5f9',
          borderRadius: '6px',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: '13px',
          border: '1px solid #e2e8f0'
        }}
      >
        계산 공식 :{" "}
        {isFiveHalfSystemId(formData.system) && systemMode !== "full_input"
          ? "C1_f = CO_f - C3_r"
          : (expr || "(공식 없음)")}
      </div>

      <div
        style={{
          padding: '6px 10px',
          backgroundColor: '#f8fafc',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          fontSize: '15px',
          color: '#0f172a',
          fontWeight: 600,
          lineHeight: 1.45,
          wordBreak: 'keep-all'
        }}
      >
        <span style={{ color: '#1e40af', fontWeight: 700 }}>[용어 설명]</span>
        <span style={{ display: 'inline', marginLeft: '6px', letterSpacing: '0.04em' }}>
          C1_f : 1쿠션 프레임 값
        </span>
        <span style={{ color: '#94a3b8', margin: '0 10px', fontWeight: 400 }}>,</span>
        <span style={{ letterSpacing: '0.04em' }}>CO_f : 출발 프레임 값</span>
        <span style={{ color: '#94a3b8', margin: '0 10px', fontWeight: 400 }}>,</span>
        <span style={{ letterSpacing: '0.04em' }}>C3_r : 3쿠션 레일 값</span>
      </div>

      {/* [E] 물리 보정: 밀림 · 끌림 · 기울기 · 스핀 · 출발값 보정 */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { key: 'slide', label: '밀림' },
          { key: 'draw', label: '끌림' },
          { key: 'curve_ratio', label: '기울기' },
          { key: 'spin', label: '스핀' },
          { key: 'departure', label: '출발값 보정' },
        ].map(({ key, label }) => {
          const isDeparture = key === 'departure';
          const displayValue = isDeparture && snFor5HalfEffective
            ? snFor5HalfEffective.Sn
            : formData.corrections[key];
          return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', minWidth: isDeparture ? '70px' : '32px' }}>{label}</label>
            <input
              type="number"
              step="0.5"
              value={fmtSysOverlayInputDisplay(displayValue)}
              readOnly={isDeparture && !!snFor5HalfEffective}
              onChange={(e) => {
                if (isDeparture && snFor5HalfEffective) return;
                setIsRestored(false);
                const raw = Number(e.target.value);
                const fin = Number.isFinite(raw) ? raw : 0;
                const nextCorr = { ...formData.corrections };
                if (key === "slide") {
                  nextCorr.slide = Math.abs(fin);
                  nextCorr.draw = 0;
                } else if (key === "draw") {
                  nextCorr.draw = fin === 0 ? 0 : -Math.abs(fin);
                  nextCorr.slide = 0;
                } else {
                  nextCorr[key] = fin;
                }
                setFormData({
                  ...formData,
                  corrections: nextCorr,
                });
              }}
              style={{
                width: '70px',
                height: '32px',
                padding: '0 6px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                fontSize: '13px',
                backgroundColor: '#fff',
                boxSizing: 'border-box'
              }}
            />
          </div>
          );
        })}
      </div>

      <div
        className={
          hasAnyCorrection && eduCorrectedFormulaLine
            ? "sys-info-grid sys-info-grid--two"
            : "sys-info-grid sys-info-grid--one"
        }
      >
        <div className="sys-info-box sys-info-box--base">
          <strong className="sys-info-box__title">기준 계산값</strong>
          <div className="sys-info-box__line">
            {renderSysFormulaContent(
              isFiveHalfSystemId(formData.system) && fiveHalfBaseDisplayLine != null
                ? fiveHalfBaseDisplayLine
                : baseFormulaLine
            )}
          </div>
        </div>

        {hasAnyCorrection && eduCorrectedFormulaLine && (
          <div className="sys-info-box sys-info-box--corrected">
            <strong className="sys-info-box__title">보정 계산값</strong>
            <div className="sys-info-box__line">
              {renderSysFormulaContent(eduCorrectedFormulaLine)}
            </div>
          </div>
        )}
      </div>

      {hasAnyCorrection && (eduStartCorrectionLine || eduRailCorrectionLine) && (
        <div className="sys-info-box sys-info-box--detail">
          {eduStartCorrectionLine && (
            <div className="sys-info-box--detail-line">
              {renderMixedFormulaLine(eduStartCorrectionLine)}
            </div>
          )}
          {eduRailCorrectionLine && (
            <div className="sys-info-box--detail-line">
              {renderMixedFormulaLine(eduRailCorrectionLine)}
            </div>
          )}
        </div>
      )}

      {useSnForSystem && isFiveHalfSystemId(formData.system) && hasAllInputs && snFor5HalfEffective && (() => {
        const { Sn: Sn_eff, C4_f: C4_eff, CO_f: CO_used, C3_r: C3_used } = snFor5HalfEffective;
        const c3Label = c3Key || "C3_r";
        const coLabel = coKey || "CO_f";
        const signMid = Sn_eff >= 0 ? "+" : "−";
        const midAbs = fmtFiveHalfDisplayNum(Math.abs(Sn_eff));
        return (
          <div className="sys-info-box sys-info-box--arrival">
            <div className="sys-info-box__title">
              4쿠션 도착값 : <span className="sys-info-box__num">{fmtFiveHalfDisplayNum(C4_eff)}</span>
            </div>
            <div className="sys-info-box--detail-line">
              {renderMixedFormulaLine(
                `4쿠션 도착값 : ${c3Label}_${fmtFiveHalfDisplayNum(C3_used)} ${signMid} ${midAbs} = ${fmtFiveHalfDisplayNum(C4_eff)}`
              )}
            </div>
            <div className="sys-info-box--detail-line">
              {renderMixedFormulaLine(
                `출발값 보정 계산 : (${coLabel}_${fmtFiveHalfDisplayNum(CO_used)} - 50) × 0.5 = ${fmtFiveHalfDisplayNum(Sn_eff)}`
              )}
            </div>
          </div>
        );
      })()}

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '4px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
        <button
          type="submit"
          disabled={!hasAllInputs}
          title={!hasAllInputs ? "공식에 필요한 입력을 모두 채운 뒤 적용할 수 있습니다." : undefined}
          style={{
            flex: 1,
            height: '36px',
            padding: '0 16px',
            backgroundColor: hasAllInputs ? '#3b82f6' : '#94a3b8',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '14px',
            cursor: hasAllInputs ? 'pointer' : 'not-allowed',
            opacity: hasAllInputs ? 1 : 0.85,
          }}
        >
          적용
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            height: '36px',
            padding: '0 16px',
            backgroundColor: '#e2e8f0',
            color: '#475569',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          취소
        </button>
      </div>
    </form>
  );
}
