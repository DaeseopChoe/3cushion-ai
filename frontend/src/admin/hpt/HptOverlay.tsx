// /frontend/admin/hpt/HptOverlay.tsx

import { useState, useRef, useCallback } from "react";
import { useHptController, MAX_HP_RADIUS_RG, RG_TO_TIP_SCALE, TIP_TO_RG_SCALE } from "./useHptController";

/** 타점 입력 - displayTip 기반 (0~4, 0.1 step), TIP 모드에서만 실제값 표시 */
function TipRow({
  value,
  hpDirection,
  onTipChange,
}: {
  value: number;
  hpDirection: "left" | "right";
  onTipChange: (dir: "left" | "right", tip: number) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", minWidth: "64px" }}>
      <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>타점</label>
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          border: "1px solid #cbd5e1",
          borderRadius: "6px",
          padding: "6px 10px",
          backgroundColor: "white",
          gap: "8px",
        }}
      >
        <button
          type="button"
          onClick={() => {
            const next = Number((value - 0.1).toFixed(1));
            onTipChange(hpDirection, next);
          }}
          style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "16px" }}
        >
          −
        </button>
        <span
          onClick={() => onTipChange(hpDirection === "left" ? "right" : "left", value)}
          style={{ minWidth: "24px", textAlign: "center", fontSize: "14px", cursor: "pointer" }}
        >
          {hpDirection === "left" ? "좌" : "우"}
        </span>
        <input
          type="number"
          step="0.1"
          min="0"
          max="4"
          value={value}
          onChange={(e) => {
            if (e.target.value === "") return;
            const raw = Number(e.target.value);
            if (isNaN(raw)) return;
            onTipChange(hpDirection, raw);
          }}
          style={{
            width: "40px",
            padding: "4px 4px",
            border: "1px solid #cbd5e1",
            borderRadius: "4px",
            fontSize: "14px",
            textAlign: "center",
          }}
        />
        <button
          type="button"
          onClick={() => {
            const next = Number((value + 0.1).toFixed(1));
            onTipChange(hpDirection, next);
          }}
          style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "16px" }}
        >
          +
        </button>
      </div>
    </div>
  );
}

interface Props {
  cue?: { x: number; y: number } | null;
  target?: { x: number; y: number } | null;
  value?: { hp: { x: number; y: number }; T: string };
  hpt?: { hp: { x: number; y: number }; T: string };
  onChange?: (next: { hp: { x: number; y: number }; T: string }) => void;
  onApply?: (next: { hp: { x: number; y: number }; T: string }) => void;
  onClose?: () => void;
  onCancel?: () => void;
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
  hp: { x: number; y: number };
  onHpChange: (next: { x: number; y: number }) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 조이스틱 파라미터 (타점 한계선 = 3/5R, 내부 ±4와 동일 물리 기준)
  const BALL_RADIUS_RG = 1.43;
  const JOYSTICK_SIZE = 200; // 픽셀
  const SCALE = JOYSTICK_SIZE / (2 * BALL_RADIUS_RG);

  /**
   * 픽셀 좌표 → Rg 좌표 변환
   * clamp 기준: MAX_HP_RADIUS_RG (3/5R = 0.858)
   * 화면상 0.9R까지 드래그 가능하더라도, 내부 hp는 3/5 한계선에서 clamp
   */
  const pixelToRg = useCallback((px: number, py: number): { x: number; y: number } => {
    const rgX = (px - JOYSTICK_SIZE / 2) / SCALE;
    const rgY = (py - JOYSTICK_SIZE / 2) / SCALE;

    const rgRadius = Math.hypot(rgX, rgY);
    if (rgRadius > MAX_HP_RADIUS_RG) {
      const ratio = MAX_HP_RADIUS_RG / rgRadius;
      return {
        x: rgX * ratio,
        y: rgY * ratio,
      };
    }

    return { x: rgX, y: rgY };
  }, [SCALE]);
  
  /**
   * Rg 좌표 → 픽셀 좌표 변환
   */
  const rgToPixel = useCallback((rg: { x: number; y: number }): { x: number; y: number } => {
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
        
        {/* 최대 범위 표시 (3/5R = 타점 한계선) */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: `${MAX_HP_RADIUS_RG * 2 * SCALE}px`,
            height: `${MAX_HP_RADIUS_RG * 2 * SCALE}px`,
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
  cue = null,
  target = null,
  value,
  hpt: hptProp,
  onChange,
  onApply,
  onClose,
  onCancel,
}: Props) {
  const resolvedValue = value ?? hptProp ?? { hp: { x: 0, y: 0 }, T: "8/8", mode: "TIP" };
  const resolvedOnChange = onChange ?? onApply ?? (() => {});

  const hpt = useHptController({
    hpt: resolvedValue,
    onChange: resolvedOnChange,
  });

  const hpRg = { x: hpt.hp.x * TIP_TO_RG_SCALE, y: hpt.hp.y * TIP_TO_RG_SCALE };
  const handleJoystickChange = useCallback(
    (rg: { x: number; y: number }) => {
      hpt.setJoystick(rg.x * RG_TO_TIP_SCALE, rg.y * RG_TO_TIP_SCALE);
    },
    [hpt.setJoystick]
  );

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
    { value: "BANK", label: "뱅크 샷" },
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

      {/* 1줄: 두께 | 타점 | 시침 값 */}
      <div
        className="hpt-row-1"
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
          gap: "12px",
          marginBottom: "12px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", flex: 1, minWidth: 0 }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>두께</label>
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
        <TipRow value={hpt.displayTip} hpDirection={hpt.hpDirection} onTipChange={hpt.setSystemTip} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", minWidth: "64px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>시침 값</label>
          <div
            style={{
              padding: "8px 12px",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              backgroundColor: "#f8fafc",
              fontSize: "14px",
            }}
          >
            {hpt.displayClock}
          </div>
        </div>
      </div>

      {/* 2줄: 회전 | 당점 */}
      <div
        className="hpt-row-2"
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "flex-end",
          gap: "12px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", minWidth: "120px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>회전</label>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: "6px 10px",
              backgroundColor: "white",
              gap: "8px",
            }}
          >
            <button
              type="button"
              onClick={() => hpt.setRotationTip(hpt.rotationTip - 0.1)}
              style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "16px" }}
            >
              −
            </button>
            <span
              onClick={() => hpt.setRotationTip(-hpt.rotationTip)}
              style={{ minWidth: "32px", textAlign: "center", fontSize: "14px", cursor: "pointer" }}
            >
              {hpt.displayRotation >= 0 ? "우측" : "좌측"}
            </span>
            <input
              type="number"
              step="0.1"
              min="0"
              max="4"
              value={Number(Math.abs(hpt.displayRotation).toFixed(1))}
              onChange={(e) => {
                if (e.target.value === "") return;
                const raw = Number(e.target.value);
                if (isNaN(raw)) return;
                const sign = hpt.rotationTip >= 0 ? 1 : -1;
                hpt.setRotationTip(sign * Number(Math.min(4, Math.max(0, raw)).toFixed(1)));
              }}
              style={{ width: "80px", padding: "4px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "14px", textAlign: "center" }}
            />
            <span style={{ fontSize: "14px" }}>팁</span>
            <button
              type="button"
              onClick={() => hpt.setRotationTip(hpt.rotationTip + 0.1)}
              style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "16px" }}
            >
              +
            </button>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", minWidth: "120px" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600" }}>당점</label>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              border: "1px solid #cbd5e1",
              borderRadius: "6px",
              padding: "6px 10px",
              backgroundColor: "white",
              gap: "8px",
            }}
          >
            <button
              type="button"
              onClick={() => hpt.setVerticalTip(hpt.verticalTip - 0.1)}
              style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "16px" }}
            >
              −
            </button>
            <span
              onClick={() => hpt.setVerticalTip(-hpt.verticalTip)}
              style={{ minWidth: "32px", textAlign: "center", fontSize: "14px", cursor: "pointer" }}
            >
              {hpt.displayVertical >= 0 ? "상단" : "하단"}
            </span>
            <input
              type="number"
              step="0.1"
              min="0"
              max="4"
              value={Number(Math.abs(hpt.displayVertical).toFixed(1))}
              onChange={(e) => {
                if (e.target.value === "") return;
                const raw = Number(e.target.value);
                if (isNaN(raw)) return;
                const sign = hpt.verticalTip >= 0 ? 1 : -1;
                hpt.setVerticalTip(sign * Number(Math.min(4, Math.max(0, raw)).toFixed(1)));
              }}
              style={{ width: "80px", padding: "4px", border: "1px solid #cbd5e1", borderRadius: "4px", fontSize: "14px", textAlign: "center" }}
            />
            <span style={{ fontSize: "14px" }}>팁</span>
            <button
              type="button"
              onClick={() => hpt.setVerticalTip(hpt.verticalTip + 0.1)}
              style={{ border: "none", background: "transparent", cursor: "pointer", fontSize: "16px" }}
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* HP 조이스틱 (SPIN 모드, 회전/당점 실시간 반영) */}
      <HpJoystick
        hp={hpRg}
        onHpChange={handleJoystickChange}
      />
      
      {/* 액션 버튼 */}
      <div className="actions" style={{ display: "flex", gap: "8px" }}>
        <button 
          onClick={onClose ?? onCancel}
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
