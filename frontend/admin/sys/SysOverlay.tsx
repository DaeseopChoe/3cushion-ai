// /frontend/admin/sys/SysOverlay.tsx
// ⚠️ 이 파일은 연결 예시입니다. 실제 프로젝트 구조에 맞게 조정하세요.

import { useState, useMemo } from "react";
import { useSysCalculation } from "./useSysCalculation";
import type { SystemCalcInputV1 } from "@/data/system/calculator/types";
import type { Point } from "@/data/system/calculator/types";
import { SYSTEM_PROFILES } from "../../src/systems";

/* ===============================
 * SysOverlay 상태 타입
 * =============================== */

interface SysOverlayState {
  systemId: string;
  strategyType: string;
  
  anchors: {
    CO?: Point;
    C1?: Point;
    C3?: Point;
    target_ball?: Point;
    C4?: Point;
    C5?: Point;
    C6?: Point;
    C7?: Point;
  };
  
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
  onSave: (result: any) => void;
  onClose: () => void;
}

export function SysOverlay({ initialState, onSave, onClose }: SysOverlayProps) {
  // ==========================================
  // 1️⃣ SysOverlay 상태 관리
  // ==========================================
  const [sysState, setSysState] = useState<SysOverlayState>({
    systemId: initialState?.systemId || "5_HALF",
    strategyType: initialState?.strategyType || "뒤돌리기",
    
    anchors: {
      CO: initialState?.anchors?.CO || { x: 40, y: 10 },
      C1: initialState?.anchors?.C1 || { x: 20, y: 5 },
      C3: initialState?.anchors?.C3 || { x: 15, y: 8 },
      target_ball: initialState?.anchors?.target_ball,
      ...initialState?.anchors
    },
    
    corrections: {
      curve_ratio: initialState?.corrections?.curve_ratio || 0,
      slide: initialState?.corrections?.slide || 0,
      draw: initialState?.corrections?.draw || 0,
      departure: initialState?.corrections?.departure || 0
    }
  });
  
  // ==========================================
  // 2️⃣ SystemCalcInputV1 생성 (자동)
  // ==========================================
  const sysCalcInput: SystemCalcInputV1 | null = useMemo(() => {
    // 필수 앵커 검증
    if (!sysState.anchors.CO || !sysState.anchors.C1 || !sysState.anchors.C3) {
      return null;
    }
    
    return {
      system_id: sysState.systemId,
      system_version: "v1",
      
      anchors_input: {
        CO: sysState.anchors.CO,
        C1: sysState.anchors.C1,
        C3: sysState.anchors.C3,
        C4: sysState.anchors.C4,
        C5: sysState.anchors.C5,
        C6: sysState.anchors.C6,
        C7: sysState.anchors.C7
      },
      
      hpt: {
        T: "8/8",  // v1에서는 SYS 계산에 T값 미사용
        hit_point: { x: 0, y: 0 }
      },
      
      corrections: sysState.corrections
    };
  }, [sysState]);
  
  // ==========================================
  // 3️⃣ 계산 실행 (자동)
  // ==========================================
  const { result, error } = useSysCalculation(sysCalcInput);
  
  // ==========================================
  // 4️⃣ 상태 업데이트 함수
  // ==========================================
  function updateSystemId(systemId: string) {
    setSysState(prev => ({ ...prev, systemId }));
  }
  
  function updateStrategyType(strategyType: string) {
    setSysState(prev => ({ ...prev, strategyType }));
  }
  
  function updateCorrection(key: keyof SysOverlayState['corrections'], value: number) {
    setSysState(prev => ({
      ...prev,
      corrections: { ...prev.corrections, [key]: value }
    }));
  }
  
  // ==========================================
  // 5️⃣ SAVE 버튼 핸들러
  // ==========================================
  function handleSave() {
    if (!result) {
      alert("계산 결과가 없습니다. 입력값을 확인해주세요.");
      return;
    }
    
    // shot_record.sys에 저장할 데이터
    const sysData = {
      input: sysCalcInput,      // 재현용
      output: result,           // SystemCalcOutputV1 (SSOT)
      system_id: sysState.systemId,
      strategy_type: sysState.strategyType
    };
    
    console.log("💾 [SYS_SAVE]", sysData);
    onSave(sysData);
  }
  
  // 선택된 시스템의 profile에서 계산 공식(expr) 추출 (표시용)
  const profileKey =
    { "5_HALF": "5_half_system", "PLUS": "plus_system" }[sysState.systemId] ?? sysState.systemId;
  const profile = SYSTEM_PROFILES[profileKey];
  const formulaExpr = profile?.formula?.expr ?? "-";

  // ==========================================
  // 6️⃣ UI 렌더링
  // ==========================================
  return (
    <div 
      className="sys-overlay"
      style={{
        minWidth: '520px',
        maxWidth: '90vw',
        width: '560px',
        padding: '24px',
        backgroundColor: '#ffffff',
        borderRadius: '12px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15)',
        maxHeight: '85vh',
        overflowY: 'auto'
      }}
    >
      <h2 style={{
        fontSize: '20px',
        fontWeight: '600',
        marginBottom: '24px',
        color: '#1f2937'
      }}>
        SYS 설정
      </h2>
      
      {/* 시스템 선택 */}
      <div 
        className="input-group"
        style={{ marginBottom: '16px' }}
      >
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '8px',
          color: '#374151'
        }}>
          시스템
        </label>
        <select 
          value={sysState.systemId} 
          onChange={(e) => updateSystemId(e.target.value)}
          style={{
            width: '100%',
            height: '40px',
            fontSize: '15px',
            padding: '0 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            cursor: 'pointer'
          }}
        >
          <option value="5_HALF">5&half</option>
          <option value="PLUS">PLUS</option>
          <option value="DIAMOND">DIAMOND</option>
        </select>
      </div>
      
      {/* 공격 유형 */}
      <div 
        className="input-group"
        style={{ marginBottom: '16px' }}
      >
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '8px',
          color: '#374151'
        }}>
          공격 유형
        </label>
        <select 
          value={sysState.strategyType} 
          onChange={(e) => updateStrategyType(e.target.value)}
          style={{
            width: '100%',
            height: '40px',
            fontSize: '15px',
            padding: '0 12px',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            backgroundColor: '#ffffff',
            cursor: 'pointer'
          }}
        >
          <option value="뒤돌리기">뒤돌리기</option>
          <option value="돌리기">돌리기</option>
          <option value="옆돌리기">옆돌리기</option>
        </select>
      </div>
      
      {/* 계산 공식 (선택된 시스템의 profile.formula.expr) */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          marginBottom: '8px',
          color: '#374151'
        }}>
          계산 공식
        </label>
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#e5e7eb',
          borderRadius: '6px',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: '15px',
          fontWeight: '600',
          color: '#1f2937',
          textAlign: 'center',
          letterSpacing: '1px'
        }}>
          {formulaExpr}
        </div>
      </div>
      
      {/* 보정값들 */}
      <div 
        className="corrections-section"
        style={{
          marginTop: '24px',
          marginBottom: '24px',
          padding: '20px',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}
      >
        <h3 style={{
          fontSize: '16px',
          fontWeight: '600',
          marginBottom: '16px',
          color: '#1f2937'
        }}>
          보정값
        </h3>
        
        <div 
          className="input-group"
          style={{ marginBottom: '14px' }}
        >
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px',
            color: '#374151'
          }}>
            Curve (곡구)
          </label>
          <input 
            type="number" 
            value={sysState.corrections.curve_ratio}
            onChange={(e) => updateCorrection('curve_ratio', Number(e.target.value))}
            step="0.5"
            style={{
              width: '100%',
              height: '40px',
              fontSize: '15px',
              padding: '0 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: '#ffffff'
            }}
          />
        </div>
        
        <div 
          className="input-group"
          style={{ marginBottom: '14px' }}
        >
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px',
            color: '#374151'
          }}>
            Slide (밀림)
          </label>
          <input 
            type="number" 
            value={sysState.corrections.slide}
            onChange={(e) => updateCorrection('slide', Number(e.target.value))}
            step="0.5"
            style={{
              width: '100%',
              height: '40px',
              fontSize: '15px',
              padding: '0 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: '#ffffff'
            }}
          />
        </div>
        
        <div 
          className="input-group"
          style={{ marginBottom: '14px' }}
        >
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px',
            color: '#374151'
          }}>
            Draw (끌림)
          </label>
          <input 
            type="number" 
            value={sysState.corrections.draw}
            onChange={(e) => updateCorrection('draw', Number(e.target.value))}
            step="0.5"
            style={{
              width: '100%',
              height: '40px',
              fontSize: '15px',
              padding: '0 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: '#ffffff'
            }}
          />
        </div>
        
        <div 
          className="input-group"
          style={{ marginBottom: '0' }}
        >
          <label style={{
            display: 'block',
            fontSize: '14px',
            fontWeight: '500',
            marginBottom: '8px',
            color: '#374151'
          }}>
            Departure (출발)
          </label>
          <input 
            type="number" 
            value={sysState.corrections.departure}
            onChange={(e) => updateCorrection('departure', Number(e.target.value))}
            step="0.5"
            style={{
              width: '100%',
              height: '40px',
              fontSize: '15px',
              padding: '0 12px',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              backgroundColor: '#ffffff'
            }}
          />
        </div>
      </div>
      
      {/* 계산 결과 표시 (draft) */}
      {result && (
        <div 
          className="result-section"
          style={{
            marginTop: '24px',
            padding: '20px',
            backgroundColor: '#eff6ff',
            borderRadius: '8px',
            border: '1px solid #bfdbfe'
          }}
        >
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            marginBottom: '16px',
            color: '#1e40af'
          }}>
            계산 결과 (미저장)
          </h3>
          
          {/* 시스템 값 */}
          <div 
            className="values"
            style={{
              marginBottom: '16px',
              fontSize: '14px',
              lineHeight: '1.8'
            }}
          >
            <p style={{ marginBottom: '8px' }}>
              <strong>CO_sys:</strong> {result.values.CO_sys}
            </p>
            <p style={{ marginBottom: '8px' }}>
              <strong>C1_sys:</strong> {result.values.C1_sys}
            </p>
            <p style={{ marginBottom: '8px' }}>
              <strong>C3_sys:</strong> {result.values.C3_sys}
            </p>
            {result.values.arrival_sys !== undefined && (
              <p style={{ marginBottom: '8px' }}>
                <strong>Arrival:</strong> {result.values.arrival_sys}
              </p>
            )}
          </div>
          
          {/* 공식 표시 */}
          <div 
            className="formula"
            style={{
              marginBottom: '16px',
              fontSize: '13px',
              lineHeight: '1.8',
              padding: '12px',
              backgroundColor: '#ffffff',
              borderRadius: '6px',
              border: '1px solid #dbeafe'
            }}
          >
            <p style={{ marginBottom: '6px' }}>
              <strong>[공식]</strong> {result.breakdown.formula.original}
            </p>
            <p style={{ marginBottom: '6px' }}>
              <strong>[보정]</strong> {result.breakdown.formula.withCorrections}
            </p>
            <p style={{ marginBottom: '0' }}>
              <strong>[대입]</strong> {result.breakdown.formula.substituted}
            </p>
          </div>
          
          {/* 계산 단계 */}
          <details style={{ fontSize: '14px' }}>
            <summary style={{
              cursor: 'pointer',
              fontWeight: '500',
              padding: '8px 0',
              color: '#1e40af'
            }}>
              계산 과정 보기
            </summary>
            {result.breakdown.steps.map((step, i) => (
              <div 
                key={i} 
                className="step"
                style={{
                  marginTop: '12px',
                  padding: '12px',
                  backgroundColor: '#ffffff',
                  borderRadius: '6px',
                  border: '1px solid #dbeafe',
                  fontSize: '13px',
                  lineHeight: '1.6'
                }}
              >
                <p style={{ marginBottom: '4px' }}>
                  <strong>{step.stage}:</strong> {step.description}
                </p>
                <p style={{ marginBottom: '4px' }}>
                  {step.formula} = {step.value}
                </p>
                {step.corrections_applied && (
                  <p 
                    className="corrections"
                    style={{
                      marginTop: '8px',
                      fontSize: '12px',
                      color: '#6b7280',
                      marginBottom: '0'
                    }}
                  >
                    보정: {JSON.stringify(step.corrections_applied)}
                  </p>
                )}
              </div>
            ))}
          </details>
        </div>
      )}
      
      {/* 에러 표시 */}
      {error && (
        <div 
          className="error-section" 
          style={{ 
            color: '#dc2626',
            backgroundColor: '#fee2e2',
            padding: '16px',
            borderRadius: '8px',
            marginTop: '16px',
            fontSize: '14px',
            border: '1px solid #fecaca'
          }}
        >
          <strong>⚠️ 계산 오류:</strong> {error}
        </div>
      )}
      
      {/* 버튼들 */}
      <div 
        className="button-group"
        style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end',
          marginTop: '28px',
          paddingTop: '20px',
          borderTop: '1px solid #e5e7eb'
        }}
      >
        <button 
          onClick={handleSave}
          disabled={!result}
          className="save-button"
          style={{
            height: '40px',
            padding: '0 24px',
            fontSize: '15px',
            fontWeight: '600',
            color: '#ffffff',
            backgroundColor: result ? '#3b82f6' : '#9ca3af',
            border: 'none',
            borderRadius: '6px',
            cursor: result ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s'
          }}
        >
          SAVE
        </button>
        <button 
          onClick={onClose}
          className="cancel-button"
          style={{
            height: '40px',
            padding: '0 24px',
            fontSize: '15px',
            fontWeight: '600',
            color: '#374151',
            backgroundColor: '#f3f4f6',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s'
          }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}
