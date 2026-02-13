// /frontend/admin/sys/SysOverlay.tsx
// Admin SYS: formula.expr 기반 순수 수식 계산기
// - 좌표(anchors) 미사용. 시스템값(CO_f, C1_f 등) 직접 입력만 사용
// - formatFormulaDisplay: ${LHS}_${값} = ${치환된_RHS}

import React, { useState, useMemo } from "react";
import { useSysCalculation, getInputTokensFromExpr } from "./useSysCalculation";
import { SYSTEM_PROFILES } from "../../src/systems";

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

/* ===============================
 * SysOverlay 상태 타입
 * =============================== */

interface SysOverlayState {
  systemId: string;
  strategyType: string;
  systemValues: Record<string, number>;
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


  const systemValuesWithDefaults = useMemo(() => {
    const base = { ...sysState.systemValues };
    const defaults = getDefaultSystemValues(inputTokens);
    for (const t of inputTokens) {
      if (!(t in base) || typeof base[t] !== "number") {
        base[t] = defaults[t] ?? 0;
      }
    }
    return base;
  }, [sysState.systemValues, inputTokens]);

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
          }
        : null,
    [sysState.systemId, systemValuesWithCorrections, formulaExpr]
  );

  const { expr, output, error } = useSysCalculation(sysCalcInput);
  const hasResult = output && Object.keys(output).length > 0;

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

      {/* 시스템값 입력 — expr RHS 토큰 기반 동적 생성 */}
      {inputTokens.length > 0 && (
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
          {inputTokens.map((token) => (
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
              </label>
              <input
                type="number"
                value={
                  sysState.systemValues[token] ??
                  getDefaultSystemValues(inputTokens)[token] ??
                  0
                }
                onChange={(e) => updateSystemValue(token, Number(e.target.value))}
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
          ))}
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
            isDeparture && output?.Sn !== undefined
              ? output.Sn
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
              readOnly={isDeparture && output?.Sn !== undefined}
              onChange={(e) =>
                !(isDeparture && output?.Sn !== undefined) &&
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

      {/* 계산 결과 — formatFormulaDisplay(expr, output) */}
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
            계산 결과 (미저장)
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
            {formatFormulaDisplay(expr, output)}
          </div>
          {/* 5_half 전용 출발값 보정 표시 — output.Sn 있으면 표시 (systemId 비교 제거) */}
          {hasResult &&
            output.Sn !== undefined &&
            output.C4_f !== undefined && (
              <div
                className="departure-correction"
                style={{
                  marginTop: "16px",
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
                  최종 도착값 : {formatDepartureNum(output.C4_f)}
                </div>
                <div>
                  C4_f = C5_f = C6_f = C3_r_{formatDepartureNum(output.C3_r ?? 0)} + Sn_
                  {formatDepartureNum(output.Sn)} = C4_f_{formatDepartureNum(output.C4_f)}
                </div>
                <div style={{ marginTop: "6px" }}>
                  Sn = (CO_f_{formatDepartureNum(output.CO_f ?? 0)} - 50) × 0.5 = Sn_
                  {formatDepartureNum(output.Sn)}
                </div>
              </div>
            )}
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
