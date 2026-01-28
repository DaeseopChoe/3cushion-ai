// /frontend/admin/hpt/HptOverlay.tsx

import { useState, useRef, useCallback } from "react";
import { useHptController } from "./useHptController";
import type { Point } from "@/data/system/calculator/types";

interface Props {
  cue: Point | null;
  target: Point | null;
  value: {
    hp: Point;
    T: string;
  };
  onChange: (next: Props["value"]) => void;
  onClose: () => void;
}

/**
 * HP 조이스틱 컴포넌트
 * 
 * - 큐볼 중심 기준 타점 입력
 * - 드래그 범위: 0.9R 이내
 * - Rg 좌표계
 */
function HpJoystick({
  hp,
  onHpChange,
}: {
  hp: Point;
  onHpChange: (next: Point) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 조이스틱 파라미터
  const BALL_RADIUS_RG = 1.43; // 당구공 반지름 (Rg)
  const MAX_HP_RADIUS = BALL_RADIUS_RG * 0.9;
  const JOYSTICK_SIZE = 200; // 픽셀
  const SCALE = JOYSTICK_SIZE / (2 * BALL_RADIUS_RG);
  
  /**
   * 픽셀 좌표 → Rg 좌표 변환
   */
  const pixelToRg = useCallback((px: number, py: number): Point => {
    const rgX = (px - JOYSTICK_SIZE / 2) / SCALE;
    const rgY = (py - JOYSTICK_SIZE / 2) / SCALE;
    
    // Clamp to MAX_HP_RADIUS
    const dist = Math.hypot(rgX, rgY);
    if (dist > MAX_HP_RADIUS) {
      return {
        x: (rgX / dist) * MAX_HP_RADIUS,
        y: (rgY / dist) * MAX_HP_RADIUS,
      };
    }
    
    return { x: rgX, y: rgY };
  }, [SCALE, MAX_HP_RADIUS]);
  
  /**
   * Rg 좌표 → 픽셀 좌표 변환
   */
  const rgToPixel = useCallback((rg: Point): { x: number; y: number } => {
    return {
      x: rg.x * SCALE + JOYSTICK_SIZE / 2,
      y: rg.y * SCALE + JOYSTICK_SIZE / 2,
    };
  }, [SCALE]);
  
  /**
   * 마우스/터치 위치에서 HP 업데이트
   */
  const updateHpFromEvent = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const px = clientX - rect.left;
    const py = clientY - rect.top;
    
    const newHp = pixelToRg(px, py);
    onHpChange(newHp);
  }, [pixelToRg, onHpChange]);
  
  /**
   * 드래그 시작
   */
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    updateHpFromEvent(e.clientX, e.clientY);
    
    // Pointer capture
    if (e.currentTarget instanceof Element) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  }, [updateHpFromEvent]);
  
  /**
   * 드래그 중
   */
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    updateHpFromEvent(e.clientX, e.clientY);
  }, [isDragging, updateHpFromEvent]);
  
  /**
   * 드래그 종료
   */
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    setIsDragging(false);
    
    // Release pointer capture
    if (e.currentTarget instanceof Element) {
      e.currentTarget.releasePointerCapture(e.pointerId);
    }
  }, []);
  
  // 현재 HP 위치 (픽셀)
  const hpPixel = rgToPixel(hp);
  
  return (
    <div style={{ marginBottom: "16px" }}>
      <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
        타점 (Hit Point)
      </label>
      
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          position: "relative",
          width: `${JOYSTICK_SIZE}px`,
          height: `${JOYSTICK_SIZE}px`,
          border: "2px solid #cbd5e1",
          borderRadius: "50%",
          backgroundColor: "#f8fafc",
          cursor: "pointer",
          touchAction: "none", // 터치 스크롤 방지
          userSelect: "none",
        }}
      >
        {/* 큐볼 (배경) */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: `${BALL_RADIUS_RG * 2 * SCALE}px`,
            height: `${BALL_RADIUS_RG * 2 * SCALE}px`,
            borderRadius: "50%",
            backgroundColor: "#ffffff",
            border: "2px solid #94a3b8",
            pointerEvents: "none",
          }}
        />
        
        {/* 최대 범위 표시 (0.9R) */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: `${MAX_HP_RADIUS * 2 * SCALE}px`,
            height: `${MAX_HP_RADIUS * 2 * SCALE}px`,
            borderRadius: "50%",
            border: "1px dashed #cbd5e1",
            pointerEvents: "none",
          }}
        />
        
        {/* 중심선 (십자) */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "0",
            right: "0",
            height: "1px",
            backgroundColor: "#e2e8f0",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "0",
            bottom: "0",
            width: "1px",
            backgroundColor: "#e2e8f0",
            pointerEvents: "none",
          }}
        />
        
        {/* 타점 (빨간 점) */}
        <div
          style={{
            position: "absolute",
            left: `${hpPixel.x}px`,
            top: `${hpPixel.y}px`,
            transform: "translate(-50%, -50%)",
            width: "12px",
            height: "12px",
            borderRadius: "50%",
            backgroundColor: "#ef4444",
            border: "2px solid #ffffff",
            boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
            pointerEvents: "none",
            zIndex: 10,
          }}
        />
        
        {/* 조이스틱 핸들 (반투명 원) */}
        <div
          style={{
            position: "absolute",
            left: `${hpPixel.x}px`,
            top: `${hpPixel.y}px`,
            transform: "translate(-50%, -50%)",
            width: "24px",
            height: "24px",
            borderRadius: "50%",
            backgroundColor: isDragging ? "rgba(239, 68, 68, 0.3)" : "rgba(239, 68, 68, 0.2)",
            border: "2px solid rgba(239, 68, 68, 0.5)",
            pointerEvents: "none",
            transition: isDragging ? "none" : "all 0.15s ease",
          }}
        />
      </div>
      
      {/* 현재 값 표시 */}
      <div style={{ marginTop: "8px", fontSize: "12px", color: "#64748b" }}>
        <div>X: {hp.x.toFixed(2)} Rg</div>
        <div>Y: {hp.y.toFixed(2)} Rg</div>
      </div>
    </div>
  );
}

/**
 * HP/T 설정 오버레이
 */
export function HptOverlay({
  cue,
  target,
  value,
  onChange,
  onClose,
}: Props) {
  const hpt = useHptController({
    cue,
    target,
    hpt: value,
    onChange,
  });
  
  // T값 옵션 (17개 전체)
  const T_OPTIONS = [
    { value: "8/8", label: "정면 (8/8)" },
    { value: "+7/8", label: "우측 7/8" },
    { value: "+6/8", label: "우측 6/8" },
    { value: "+5/8", label: "우측 5/8" },
    { value: "+4/8", label: "우측 4/8" },
    { value: "+3/8", label: "우측 3/8" },
    { value: "+2/8", label: "우측 2/8" },
    { value: "+1/8", label: "우측 1/8" },
    { value: "+0/8", label: "우측 0/8 (극단적 얇은 두께)" },
    { value: "-0/8", label: "좌측 0/8 (극단적 얇은 두께)" },
    { value: "-1/8", label: "좌측 1/8" },
    { value: "-2/8", label: "좌측 2/8" },
    { value: "-3/8", label: "좌측 3/8" },
    { value: "-4/8", label: "좌측 4/8" },
    { value: "-5/8", label: "좌측 5/8" },
    { value: "-6/8", label: "좌측 6/8" },
    { value: "-7/8", label: "좌측 7/8" },
  ];

  return (
    <div 
      className="overlay-panel"
      style={{
        padding: "24px",
        backgroundColor: "white",
        borderRadius: "8px",
        minWidth: "320px",
        maxWidth: "400px",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: "24px", fontSize: "18px", fontWeight: "700" }}>
        HP / T 설정
      </h3>

      {/* HP 조이스틱 영역 */}
      <HpJoystick
        hp={hpt.hp}
        onHpChange={hpt.setHp}
      />

      {/* 두께 선택 */}
      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>
          두께 (Thickness)
        </label>
        <select
          value={hpt.T}
          onChange={(e) => hpt.setT(e.target.value)}
          style={{
            width: "100%",
            padding: "8px 12px",
            fontSize: "14px",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            backgroundColor: "white",
            cursor: "pointer",
          }}
        >
          {T_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      
      {/* ImpactBall 위치 표시 (참고용) */}
      {hpt.impactBall && (
        <div 
          style={{ 
            marginBottom: "24px", 
            padding: "12px", 
            backgroundColor: "#f0fdf4", 
            borderRadius: "6px",
            fontSize: "12px",
            color: "#166534"
          }}
        >
          <div style={{ fontWeight: "600", marginBottom: "4px" }}>
            ✓ ImpactBall 위치
          </div>
          <div>X: {hpt.impactBall.x.toFixed(2)} Rg</div>
          <div>Y: {hpt.impactBall.y.toFixed(2)} Rg</div>
        </div>
      )}

      {/* 액션 버튼 */}
      <div className="actions" style={{ display: "flex", gap: "8px" }}>
        <button 
          onClick={onClose}
          style={{
            flex: 1,
            padding: "10px 16px",
            fontSize: "14px",
            fontWeight: "600",
            color: "#64748b",
            backgroundColor: "#f1f5f9",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}
