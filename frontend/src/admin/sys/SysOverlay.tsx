// /frontend/admin/sys/SysOverlay.tsx
// Admin SYS: formula.expr 기반 순수 수식 계산기
// - 좌표(anchors) 미사용. 시스템값(CO_f, C1_f 등) 직접 입력만 사용
// - formatFormulaDisplay: ${LHS}_${값} = ${치환된_RHS}

import React, { useState, useMemo } from "react";
import { useSysCalculation, getInputTokensFromExpr } from "./useSysCalculation";
import { SYSTEM_PROFILES } from "../../data/systems";

/** 정수 출력 (포맷 표준) */
function formatResultNum(n: number): number {
  return Math.round(n);
}

/** 출발 보정 영역용 — 소수 있으면 1자리 표시 (Sn, C4_f 검증용) */
function formatDepartureNum(n: number): string {
  const x = Number(n);
  if (Number.isNaN(x)) return "0";
  return x % 1 === 0 ? String(Math.round(x)) : String(Math.round(x * 10) / 10);
}

/**
 * 표시 형식 통일: ${LHS}_${결과값} = ${치환된_RHS}
 * LHS/RHS 모두 ${token}_${값} 형식
 */
function formatFormulaDisplay(expr: string, output: Record<string, number>): string {
  const idx = expr.indexOf("=");
  if (idx < 0) return expr;
  const lhs = expr.slice(0, idx).trim();
  const rhs = expr.slice(idx + 1).trim();
  const lhsVal = lhs in output ? formatResultNum(output[lhs]) : "?";
  const rhsSubstituted = rhs.replace(
    /[A-Za-z_][A-Za-z0-9_]*/g,
    (token) => {
      if (token in output) {
        return `${token}_${formatResultNum(output[token])}`;
      }
      return token;
    }
  );
  return `${lhs}_${lhsVal} = ${rhsSubstituted}`;
}

function getLhsToken(expr: string): string | null {
  const idx = expr.indexOf("=");
  if (idx < 0) return null;
  const lhs = expr.slice(0, idx).trim();
  return lhs || null;
}

export type InputBasis = "CO_C3_C1" | "CO_C1_C3" | "C1_C3_CO";
export type CvEntryMode = "manual" | "targetArrival";
console.log("🔥 NEW SYS OVERLAY LOADED")
/**
 * 입력 기준에 따라 CO_f / C1_f / C3_r 관계를 공식 C1_f = CO_f - C3_r 형태에 맞게 맞춤.
 * expr 변경 없이 payload만 정규화.
 */
function normalizeToFormulaInputs(
  values: Record<string, number>,
  basis: InputBasis
): Record<string, number> {
  const out = { ...values };
  const co = Number(out.CO_f);
  const c1 = Number(out.C1_f);
  const c3 = Number(out.C3_r);
  const coN = Number.isFinite(co) ? co : 0;
  const c1N = Number.isFinite(c1) ? c1 : 0;
  const c3N = Number.isFinite(c3) ? c3 : 0;

  if (basis === "CO_C3_C1") {
    if ("C1_f" in out) out.C1_f = coN - c3N;
  } else if (basis === "CO_C1_C3") {
    if ("C3_r" in out) out.C3_r = coN - c1N;
  } else if (basis === "C1_C3_CO") {
    if ("CO_f" in out) out.CO_f = c1N + c3N;
  }
  return out;
}

function isTokenUserEditable(
  token: string,
  basis: InputBasis
): boolean {
  if (basis === "CO_C3_C1") {
    if (token.startsWith("C1_")) return false;
    return true;
  }
  if (basis === "CO_C1_C3") {
    if (token.startsWith("C3_")) return false;
    return true;
  }
  if (basis === "C1_C3_CO") {
    if (token.startsWith("CO_")) return false;
    return true;
  }
  return true;
}

function buildDisplayTokens(inputTokens: string[], lhsToken: string | null): string[] {
  const set = new Set<string>(inputTokens);
  if (lhsToken) set.add(lhsToken);
  return Array.from(set);
}

/* ===============================
 * SysOverlay 상태 타입
 * =============================== */

interface SysOverlayState {
  systemId: string;
  strategyType: string;
  systemValues: Record<string, number>;
  inputBasis: InputBasis;
  cvEntryMode: CvEntryMode;
  corrections: {
    curve_ratio: number;
    slide: number;
    draw: number;
    departure: number;
  };
}

/* ===============================
 * SysOverlay 컴포넌트
 * =============================== */

interface SysOverlayProps {
  initialState?: Partial<SysOverlayState>;
  sys?: any;
  onSave?: (result: any) => void;
  onClose?: () => void;
  onApply?: (next: any) => void;
  onCancel?: () => void;
}

const PROFILE_KEY_MAP: Record<string, string> = {
  "5_HALF": "5_half_system",
  "PLUS": "plus_system",
  "3TIP_PLUS": "3tip_plus",
  "RODRIGUEZ": "rodriguez",
  "DIAMOND": "rodriguez",
  "SUNRISE_SUNSET": "sunrise_sunset",
};

/** 보정값을 systemValues에 반영 (slide→CO, draw→C3 등) */
function applyCorrections(
  values: Record<string, number>,
  corrections: SysOverlayState["corrections"]
): Record<string, number> {
  const out = { ...values };
  if (corrections.slide !== 0) {
    if ("CO_f" in out) out.CO_f = (out.CO_f ?? 0) + corrections.slide;
    if ("CO_r" in out) out.CO_r = (out.CO_r ?? 0) + corrections.slide;
  }
  if (corrections.draw !== 0) {
    if ("C3_f" in out) out.C3_f = (out.C3_f ?? 0) - corrections.draw;
    if ("C3_r" in out) out.C3_r = (out.C3_r ?? 0) - corrections.draw;
  }
  if (corrections.curve_ratio !== 0) {
    if ("CO_f" in out) out.CO_f = (out.CO_f ?? 0) + corrections.curve_ratio;
  }
  if (corrections.departure !== 0) {
    if ("C4_f" in out) out.C4_f = (out.C4_f ?? 0) + corrections.departure;
  }
  return out;
}

/** 시스템별 기본 시스템값 */
function getDefaultSystemValues(tokens: string[]): Record<string, number> {
  const defaults: Record<string, number> = {};
  for (const t of tokens) {
    defaults[t] = 0;
  }
  // 자주 쓰는 기본값
  if (tokens.includes("CO_f")) defaults["CO_f"] = 50;
  if (tokens.includes("C1_f")) defaults["C1_f"] = 20;
  if (tokens.includes("C3_r")) defaults["C3_r"] = 20;
  if (tokens.includes("C3_f")) defaults["C3_f"] = 40;
  if (tokens.includes("CO_r")) defaults["CO_r"] = 10;
  return defaults;
}

export function SysOverlay({
  initialState,
  sys,
  onSave,
  onClose,
  onApply,
  onCancel,
}: SysOverlayProps) {
  // #region agent log
  fetch("http://127.0.0.1:7698/ingest/05c8c604-4ee9-4069-8fc1-5ac9e58f8454", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "071abe",
    },
    body: JSON.stringify({
      sessionId: "071abe",
      runId: "sys-render-trace",
      hypothesisId: "H2",
      location: "admin/sys/SysOverlay.tsx:mount",
      message: "module SysOverlay (admin/sys) rendered",
      data: { source: "frontend/src/admin/sys/SysOverlay.tsx" },
      timestamp: Date.now(),
    }),
  }).catch(() => {});
  // #endregion
  const handleSaveExternal = onApply ?? onSave;
  const handleCloseExternal = onCancel ?? onClose;
  const initial = initialState ?? sys;

  const [sysState, setSysState] = useState<SysOverlayState>({
    systemId: initial?.systemId || "5_HALF",
    strategyType: initial?.strategyType || "뒤돌리기",
    systemValues: initial?.systemValues ?? {
      CO_f: 50,
      C1_f: 20,
      C3_r: 20,
    },
    inputBasis: initial?.inputBasis ?? "CO_C3_C1",
    cvEntryMode: initial?.cvEntryMode ?? "manual",
    corrections: {
      curve_ratio: initial?.corrections?.curve_ratio || 0,
      slide: initial?.corrections?.slide || 0,
      draw: initial?.corrections?.draw || 0,
      departure: initial?.corrections?.departure || 0,
    },
  });

  const profileKey = PROFILE_KEY_MAP[sysState.systemId] ?? sysState.systemId;
  const profile = SYSTEM_PROFILES[profileKey];
  const formulaExpr = profile?.formula?.expr ?? "";
  const inputTokens = useMemo(
    () => (formulaExpr ? getInputTokensFromExpr(formulaExpr) : []),
    [formulaExpr]
  );

  const lhsToken = useMemo(
    () => (formulaExpr ? getLhsToken(formulaExpr) : null),
    [formulaExpr]
  );

  const displayTokens = useMemo(
    () => buildDisplayTokens(inputTokens, lhsToken),
    [inputTokens, lhsToken]
  );

  const normalizedSystemValues = useMemo(
    () => normalizeToFormulaInputs(sysState.systemValues, sysState.inputBasis),
    [sysState.systemValues, sysState.inputBasis]
  );

  const systemValuesWithDefaults = useMemo(() => {
    const tokenUnion = Array.from(
      new Set<string>([...inputTokens, ...(lhsToken ? [lhsToken] : [])])
    );
    const merged = { ...normalizedSystemValues };
    const defaults = getDefaultSystemValues(tokenUnion);
    for (const t of tokenUnion) {
      if (!(t in merged) || typeof merged[t] !== "number") {
        merged[t] = defaults[t] ?? 0;
      }
    }
    return merged;
  }, [normalizedSystemValues, inputTokens, lhsToken]);

  const systemValuesWithCorrections = useMemo(
    () => applyCorrections(systemValuesWithDefaults, sysState.corrections),
    [systemValuesWithDefaults, sysState.corrections]
  );

  const sysCalcInput = useMemo(
    () =>
      formulaExpr
        ? {
            system_id: sysState.systemId,
            system_values: systemValuesWithCorrections,
            system_values_base: { ...systemValuesWithDefaults },
            system_values_effective: { ...systemValuesWithCorrections },
          }
        : null,
    [
      sysState.systemId,
      systemValuesWithCorrections,
      systemValuesWithDefaults,
      formulaExpr,
    ]
  );

  const { expr, output, base, effective, error } = useSysCalculation(sysCalcInput);
  const hasResult = output && Object.keys(output).length > 0;
  const hasBase = base && Object.keys(base).length > 0;
  const eff = effective ?? output;

  function updateSystemId(systemId: string) {
    const nextProfileKey = PROFILE_KEY_MAP[systemId] ?? systemId;
    const nextProfile = SYSTEM_PROFILES[nextProfileKey];
    const nextExpr = nextProfile?.formula?.expr ?? "";
    const nextTokens = nextExpr ? getInputTokensFromExpr(nextExpr) : [];
    const defaults = getDefaultSystemValues(nextTokens);
    setSysState((prev) => {
      const nextVals = { ...defaults };
      for (const t of nextTokens) {
        if (t in prev.systemValues) nextVals[t] = prev.systemValues[t];
      }
      return { ...prev, systemId, systemValues: nextVals };
    });
  }

  function updateStrategyType(strategyType: string) {
    setSysState((prev) => ({ ...prev, strategyType }));
  }

  function updateSystemValue(token: string, value: number) {
    setSysState((prev) => ({
      ...prev,
      systemValues: { ...prev.systemValues, [token]: value },
    }));
  }

  function updateCorrection(key: keyof SysOverlayState["corrections"], value: number) {
    setSysState((prev) => ({
      ...prev,
      corrections: { ...prev.corrections, [key]: value },
    }));
  }

  function updateInputBasis(next: InputBasis) {
    setSysState((prev) => ({ ...prev, inputBasis: next }));
  }

  function updateCvEntryMode(next: CvEntryMode) {
    setSysState((prev) => ({ ...prev, cvEntryMode: next }));
  }

  const displayDefaults = useMemo(
    () => getDefaultSystemValues(displayTokens),
    [displayTokens]
  );

  function handleSave() {
    if (!output || Object.keys(output).length === 0) {
      alert("계산 결과가 없습니다. 입력값을 확인해주세요.");
      return;
    }

    const sysData = {
      expr,
      output,
      system_id: sysState.systemId,
      strategy_type: sysState.strategyType,
      system_values: sysState.systemValues,
    };

    console.log("💾 [SYS_SAVE]", sysData);
    handleSaveExternal?.(sysData);
  }

  return (
    <div
      className="sys-overlay"
      style={{
        minWidth: "520px",
        maxWidth: "90vw",
        width: "560px",
        padding: "24px",
        backgroundColor: "#ffffff",
        borderRadius: "12px",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.15)",
        maxHeight: "85vh",
        overflowY: "auto",
      }}
    >
      <h2
        style={{
          fontSize: "20px",
          fontWeight: "600",
          marginBottom: "24px",
          color: "#1f2937",
        }}
      >
        SYS 설정
      </h2>

      <div className="input-group" style={{ marginBottom: "16px" }}>
        <label
          style={{
            display: "block",
            fontSize: "14px",
            fontWeight: "500",
            marginBottom: "8px",
            color: "#374151",
          }}
        >
          시스템
        </label>
        <select
          value={sysState.systemId}
          onChange={(e) => updateSystemId(e.target.value)}
          style={{
            width: "100%",
            height: "40px",
            fontSize: "15px",
            padding: "0 12px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            backgroundColor: "#ffffff",
            cursor: "pointer",
          }}
        >
          <option value="5_HALF">5&amp;half</option>
          <option value="PLUS">PLUS</option>
          <option value="3TIP_PLUS">3팁 플러스</option>
          <option value="RODRIGUEZ">로드리게스</option>
          <option value="DIAMOND">DIAMOND</option>
          <option value="SUNRISE_SUNSET">일출·일몰</option>
        </select>
      </div>

      <div className="input-group" style={{ marginBottom: "16px" }}>
        <label
          style={{
            display: "block",
            fontSize: "14px",
            fontWeight: "500",
            marginBottom: "8px",
            color: "#374151",
          }}
        >
          공격 유형
        </label>
        <select
          value={sysState.strategyType}
          onChange={(e) => updateStrategyType(e.target.value)}
          style={{
            width: "100%",
            height: "40px",
            fontSize: "15px",
            padding: "0 12px",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            backgroundColor: "#ffffff",
            cursor: "pointer",
          }}
        >
          <option value="뒤돌리기">뒤돌리기</option>
          <option value="돌리기">돌리기</option>
          <option value="옆돌리기">옆돌리기</option>
        </select>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label
          style={{
            display: "block",
            fontSize: "14px",
            fontWeight: "500",
            marginBottom: "8px",
            color: "#374151",
          }}
        >
          계산 공식
        </label>
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#e5e7eb",
            borderRadius: "6px",
            fontFamily: 'Consolas, Monaco, "Courier New", monospace',
            fontSize: "15px",
            fontWeight: "600",
            color: "#1f2937",
            textAlign: "center",
            letterSpacing: "1px",
          }}
        >
          {formulaExpr || "-"}
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <label
          style={{
            display: "block",
            fontSize: "14px",
            fontWeight: "500",
            marginBottom: "8px",
            color: "#374151",
          }}
        >
          입력 기준
        </label>
        <div
          style={{
            padding: "12px 16px",
            backgroundColor: "#f9fafb",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
            fontSize: "14px",
            color: "#374151",
          }}
        >
          <label style={{ display: "block", marginBottom: "8px", cursor: "pointer" }}>
            <input
              type="radio"
              name="inputBasis"
              checked={sysState.inputBasis === "CO_C3_C1"}
              onChange={() => updateInputBasis("CO_C3_C1")}
            />{" "}
            기본: CO − C3 = C1
          </label>
          <label style={{ display: "block", marginBottom: "8px", cursor: "pointer" }}>
            <input
              type="radio"
              name="inputBasis"
              checked={sysState.inputBasis === "CO_C1_C3"}
              onChange={() => updateInputBasis("CO_C1_C3")}
            />{" "}
            보조: CO − C1 = C3
          </label>
          <label style={{ display: "block", cursor: "pointer" }}>
            <input
              type="radio"
              name="inputBasis"
              checked={sysState.inputBasis === "C1_C3_CO"}
              onChange={() => updateInputBasis("C1_C3_CO")}
            />{" "}
            보조: C1 + C3 = CO
          </label>
        </div>
      </div>

      {/* 시스템값 입력 — 공식 LHS + RHS 토큰, 입력 기준에 따른 활성/비활성 */}
      {displayTokens.length > 0 && (
        <div
          style={{
            marginBottom: "16px",
            padding: "20px",
            backgroundColor: "#f9fafb",
            borderRadius: "8px",
            border: "1px solid #e5e7eb",
          }}
        >
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "600",
              marginBottom: "16px",
              color: "#1f2937",
            }}
          >
            시스템값 입력
          </h3>
          {displayTokens.map((token) => {
            const editable = isTokenUserEditable(token, sysState.inputBasis);
            const raw = sysState.systemValues[token];
            const def = displayDefaults[token] ?? 0;
            const userVal =
              typeof raw === "number" && !Number.isNaN(raw) ? raw : def;
            const displayVal = editable
              ? userVal
              : normalizedSystemValues[token] ?? userVal;
            return (
              <div key={token} className="input-group" style={{ marginBottom: "14px" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "14px",
                    fontWeight: "500",
                    marginBottom: "8px",
                    color: "#374151",
                  }}
                >
                  {token}
                  {!editable ? " (자동)" : ""}
                </label>
                <input
                  type="number"
                  value={displayVal}
                  readOnly={!editable}
                  onChange={(e) =>
                    editable && updateSystemValue(token, Number(e.target.value))
                  }
                  step="0.5"
                  style={{
                    width: "100%",
                    height: "40px",
                    fontSize: "15px",
                    padding: "0 12px",
                    border: "1px solid #d1d5db",
                    borderRadius: "6px",
                    backgroundColor: editable ? "#ffffff" : "#f3f4f6",
                  }}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* 보정값 */}
      <div
        style={{
          marginTop: "24px",
          marginBottom: "24px",
          padding: "20px",
          backgroundColor: "#f9fafb",
          borderRadius: "8px",
          border: "1px solid #e5e7eb",
        }}
      >
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "14px",
              fontWeight: "500",
              marginBottom: "8px",
              color: "#374151",
            }}
          >
            보정 방식
          </label>
          <div style={{ fontSize: "14px", color: "#374151" }}>
            <label style={{ display: "block", marginBottom: "6px", cursor: "pointer" }}>
              <input
                type="radio"
                name="cvEntryMode"
                checked={sysState.cvEntryMode === "manual"}
                onChange={() => updateCvEntryMode("manual")}
              />{" "}
              CV 직접 입력
            </label>
            <label style={{ display: "block", cursor: "pointer" }}>
              <input
                type="radio"
                name="cvEntryMode"
                checked={sysState.cvEntryMode === "targetArrival"}
                onChange={() => updateCvEntryMode("targetArrival")}
              />{" "}
              목표 도착값 입력 (자동 보정) — 준비 중
            </label>
          </div>
        </div>
        <h3
          style={{
            fontSize: "16px",
            fontWeight: "600",
            marginBottom: "16px",
            color: "#1f2937",
          }}
        >
          보정값
        </h3>
        {(
          [
            ["curve_ratio", "Curve (곡구)"],
            ["slide", "Slide (밀림)"],
            ["draw", "Draw (끌림)"],
            ["departure", "Departure (출발값 보정)"],
          ] as const
        ).map(([key, label]) => {
          const isDeparture = key === "departure";
          const displayValue =
            isDeparture && eff?.Sn !== undefined
              ? eff.Sn
              : sysState.corrections[key];
          return (
          <div key={key} className="input-group" style={{ marginBottom: "14px" }}>
            <label
              style={{
                display: "block",
                fontSize: "14px",
                fontWeight: "500",
                marginBottom: "8px",
                color: "#374151",
              }}
            >
              {label}
            </label>
            <input
              type="number"
              value={displayValue}
              readOnly={isDeparture && eff?.Sn !== undefined}
              onChange={(e) =>
                !(isDeparture && eff?.Sn !== undefined) &&
                updateCorrection(key, Number(e.target.value))
              }
              step="0.5"
              style={{
                width: "100%",
                height: "40px",
                fontSize: "15px",
                padding: "0 12px",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                backgroundColor: "#ffffff",
              }}
            />
          </div>
          );
        })}
      </div>

      {/* 기준 계산값 (보정 전) */}
      {hasBase && (
        <div
          className="result-section-base"
          style={{
            marginTop: "24px",
            padding: "20px",
            backgroundColor: "#f8fafc",
            borderRadius: "8px",
            border: "1px solid #cbd5e1",
          }}
        >
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "600",
              marginBottom: "16px",
              color: "#334155",
            }}
          >
            기준 계산값 (미저장)
          </h3>
          <div
            className="formula-display"
            style={{
              fontSize: "15px",
              lineHeight: "1.8",
              padding: "12px 16px",
              backgroundColor: "#ffffff",
              borderRadius: "6px",
              border: "1px solid #e2e8f0",
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontWeight: "600",
              color: "#1f2937",
              textAlign: "center",
            }}
          >
            {formatFormulaDisplay(expr, base)}
          </div>
        </div>
      )}

      {/* 보정 적용 결과 (effective) */}
      {hasResult && (
        <div
          className="result-section"
          style={{
            marginTop: "24px",
            padding: "20px",
            backgroundColor: "#eff6ff",
            borderRadius: "8px",
            border: "1px solid #bfdbfe",
          }}
        >
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "600",
              marginBottom: "16px",
              color: "#1e40af",
            }}
          >
            보정 적용 결과 (미저장)
          </h3>
          <div
            className="formula-display"
            style={{
              fontSize: "15px",
              lineHeight: "1.8",
              padding: "12px 16px",
              backgroundColor: "#ffffff",
              borderRadius: "6px",
              border: "1px solid #dbeafe",
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              fontWeight: "600",
              color: "#1f2937",
              textAlign: "center",
            }}
          >
            {formatFormulaDisplay(expr, eff)}
          </div>
        </div>
      )}

      {error && (
        <div
          className="error-section"
          style={{
            color: "#dc2626",
            backgroundColor: "#fee2e2",
            padding: "16px",
            borderRadius: "8px",
            marginTop: "16px",
            fontSize: "14px",
            border: "1px solid #fecaca",
          }}
        >
          <strong>⚠️ 계산 오류:</strong> {error}
        </div>
      )}

      {hasResult &&
        eff?.Sn !== undefined &&
        eff?.C4_f !== undefined && (
          <div
            className="departure-correction"
            style={{
              marginTop: "24px",
              padding: "12px 16px",
              backgroundColor: "#f0fdf4",
              borderRadius: "6px",
              border: "1px solid #bbf7d0",
              fontSize: "14px",
              lineHeight: "1.8",
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              color: "#166534",
            }}
          >
            <div style={{ fontWeight: "700", fontSize: "16px", marginBottom: "10px" }}>
              최종 도착값 : {formatDepartureNum(eff.C4_f)}
            </div>
            <div>
              C4_f = C5_f = C6_f = C3_r_{formatDepartureNum(eff.C3_r ?? 0)} + Sn_
              {formatDepartureNum(eff.Sn)} = C4_f_{formatDepartureNum(eff.C4_f)}
            </div>
            <div style={{ marginTop: "6px" }}>
              Sn = (CO_f_{formatDepartureNum(eff.CO_f ?? 0)} - 50) × 0.5 = Sn_
              {formatDepartureNum(eff.Sn)}
            </div>
          </div>
        )}

      <div
        className="button-group"
        style={{
          display: "flex",
          gap: "12px",
          justifyContent: "flex-end",
          marginTop: "28px",
          paddingTop: "20px",
          borderTop: "1px solid #e5e7eb",
        }}
      >
        <button
          onClick={handleSave}
          disabled={!hasResult}
          className="save-button"
          style={{
            height: "40px",
            padding: "0 24px",
            fontSize: "15px",
            fontWeight: "600",
            color: "#ffffff",
            backgroundColor: hasResult ? "#3b82f6" : "#9ca3af",
            border: "none",
            borderRadius: "6px",
            cursor: hasResult ? "pointer" : "not-allowed",
            transition: "all 0.2s",
          }}
        >
          SAVE
        </button>
        <button
          onClick={handleCloseExternal}
          className="cancel-button"
          style={{
            height: "40px",
            padding: "0 24px",
            fontSize: "15px",
            fontWeight: "600",
            color: "#374151",
            backgroundColor: "#f3f4f6",
            border: "1px solid #d1d5db",
            borderRadius: "6px",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}
