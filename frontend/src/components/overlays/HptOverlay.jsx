import { useState, useEffect } from "react";
import { useHptController, clampHpToRadius } from "../../admin/hpt/useHptController";

export function HptOverlay({ data, sysHpNResult, onSave, onCancel }) {
  const [tempData, setTempData] = useState(data);
  const [lastChanged, setLastChanged] = useState(null); // 'x' or 'y'
  const [isClamped, setIsClamped] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // STEP A: useHptController 어댑터 (hit_point ↔ hp)
  // hit_point는 항상 hp(±4) 저장. Rg 오해석 제거 → 내부로 드래그 시 바깥으로 튐 방지
  const rawX = Number.isFinite(tempData.hit_point?.x) ? tempData.hit_point.x : 0;
  const rawY = Number.isFinite(tempData.hit_point?.y) ? tempData.hit_point.y : 0;
  const hpClamped = clampHpToRadius(rawX, rawY, 4);
  const rCv = Math.hypot(hpClamped.x, hpClamped.y);
  if (rCv > 4.0001) {
    console.error("[CLAMP BREAK - controllerValue]", { rawX: hpClamped.x, rawY: hpClamped.y, r: rCv });
  }
  const controllerValue = {
    T: tempData.T ?? "8/8",
    hp: { x: hpClamped.x, y: hpClamped.y },
    mode: tempData.mode ?? "TIP",
    tipCount: tempData.tipCount,
  };
  const onControllerChange = (next) => {
    const rx = next.hp?.x ?? 0;
    const ry = next.hp?.y ?? 0;
    const r = Math.hypot(rx, ry);
    if (r > 4.0001) {
      console.error("[CLAMP BREAK - parent store]", next.hp);
    }
    const c = clampHpToRadius(rx, ry, 4);
    setTempData((prev) => ({
      ...prev,
      T: next.T,
      hit_point: { x: c.x, y: c.y },
      mode: next.mode ?? "TIP",
      tipCount: next.tipCount,
    }));
  };
  const hpt = useHptController({
    cue: null,
    target: null,
    hpt: controllerValue,
    onChange: onControllerChange,
  });

  useEffect(() => {
    if (sysHpNResult != null) {
      const dir = sysHpNResult >= 0 ? "right" : "left";
      const tip = Math.min(4, Math.max(0, Number(Math.abs(sysHpNResult).toFixed(1))));
      hpt.setHpFromTip(dir, tip);
    }
  }, [sysHpNResult]);

  // T값 옵션 (0/8 ~ 8/8, 17개)
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
    { value: "BANK", label: "뱅크 샷" }
  ];

  // ==========================================
  // 타점 입력 핸들러 (클램프 포함)
  // ==========================================
  const MAX_VALUE = 4.0;
  const CLAMP_RADIUS = 4.0; // 점선 원 = 입력값 4까지

  const safeNum = (v) => (typeof v === 'number' && !isNaN(v) ? v : 0);

  const handleHitPointChange = (axis, rawValue) => {
    const num = parseFloat(rawValue);
    if (isNaN(num)) return;

    // 1차 제한: ±4, 소수점 1자리
    let value = Math.max(-MAX_VALUE, Math.min(MAX_VALUE, num));
    value = Math.round(value * 10) / 10;

    const currentX = axis === 'x' ? value : hpt.hp.x;
    const currentY = axis === 'y' ? value : hpt.hp.y;

    // 2차 제한: 원형 클램프 (한계 반지름 4)
    const distance = Math.sqrt(currentX ** 2 + currentY ** 2);
    
    let finalX = currentX;
    let finalY = currentY;
    let clamped = false;

    if (distance > CLAMP_RADIUS) {
      clamped = true;
      
      // 마지막 변경 축만 클램프
      if (axis === 'x') {
        // X를 방금 변경 → X만 한계선으로 클램프
        const maxX = Math.sqrt(Math.max(0, CLAMP_RADIUS ** 2 - currentY ** 2));
        finalX = currentX > 0 ? Math.min(currentX, maxX) : Math.max(currentX, -maxX);
        finalX = Math.round(finalX * 10) / 10;
        // Y는 그대로 유지
        finalY = currentY;
      } else {
        // Y를 방금 변경 → Y만 한계선으로 클램프
        const maxY = Math.sqrt(Math.max(0, CLAMP_RADIUS ** 2 - currentX ** 2));
        finalY = currentY > 0 ? Math.min(currentY, maxY) : Math.max(currentY, -maxY);
        finalY = Math.round(finalY * 10) / 10;
        // X는 그대로 유지
        finalX = currentX;
      }
    }

    // STEP A: 컨트롤러 경유 → onControllerChange → tempData
    hpt.setHp({ x: finalX, y: finalY });
    setLastChanged(axis);
    setIsClamped(clamped);

    // 클램프 피드백 0.5초 후 제거
    if (clamped) {
      setTimeout(() => setIsClamped(false), 500);
    }
  };

  // ==========================================
  // 두께값 파싱 (숫자 변환)
  // ==========================================
  const parseThickness = (tValue) => {
    if (!tValue) return 0;
    
    // "8/8" → 8 (완전 겹침)
    if (tValue === "8/8") return 8;
    
    // "+7/8" → 7, "-3/8" → -3
    const match = tValue.match(/^([+-]?)(\d+)\/8$/);
    if (!match) return 0;
    
    const sign = match[1] === '-' ? -1 : 1;
    const num = parseInt(match[2], 10);
    return sign * num;
  };

  const thickness = parseThickness(tempData.T);
  const isRightImpact = thickness >= 0;

  // ==========================================
  // 볼 시각화 설정
  // ==========================================
  const BALL_RADIUS = 120; // 40 → 120 (3배)
  const CANVAS_WIDTH = 600; // 300 → 600 (2배)
  const CANVAS_HEIGHT = 300; // 150 → 300 (2배)
  const CENTER_Y = CANVAS_HEIGHT / 2;
  const CENTER_X = CANVAS_WIDTH / 2;
  
  // 두께에 따른 X 위치 (지름 기준)
  // 뱅크샷: 두께 불필요 → 정면(8/8)으로 시각화
  const thicknessValue = tempData.T === "BANK" ? 8 : Math.abs(thickness); // 0~8 (표기의 n)
  const thicknessFraction = thicknessValue / 8; // n/8 그대로 사용
  const centerDistance = (1 - thicknessFraction) * (2 * BALL_RADIUS); // 지름 기준
  
  let impactX, targetX;
  if (isRightImpact) {
    // 우측이 임펙트볼 (앞)
    impactX = CENTER_X + centerDistance / 2;
    targetX = CENTER_X - centerDistance / 2;
  } else {
    // 좌측이 임펙트볼 (앞)
    impactX = CENTER_X - centerDistance / 2;
    targetX = CENTER_X + centerDistance / 2;
  }
  
  // 60% 원의 반지름
  const limit60Radius = BALL_RADIUS * 0.6;

  // ==========================================
  // 드래그 핸들러
  // ==========================================
  const handleMouseDown = (e) => {
    setIsDragging(true);
    handleDragMove(e);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    handleDragMove(e);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleDragMove = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // 픽셀 → 논리 좌표 변환
    const scale = MAX_VALUE / limit60Radius;
    
    const logicalX = (mouseX - impactX) * scale;
    const logicalY = (CENTER_Y - mouseY) * scale; // Y축 반전
    
    // 클램프 적용 (반지름 4 기준)
    const distance = Math.sqrt(logicalX ** 2 + logicalY ** 2);
    let finalX = logicalX;
    let finalY = logicalY;
    
    if (distance > CLAMP_RADIUS) {
      const clampScale = CLAMP_RADIUS / distance;
      finalX = logicalX * clampScale;
      finalY = logicalY * clampScale;
    }
    
    // 소수점 1자리로 반올림 (STEP A: 컨트롤러 경유 → onControllerChange → tempData)
    finalX = Math.round(finalX * 10) / 10;
    finalY = Math.round(finalY * 10) / 10;

    hpt.setHp({ x: finalX, y: finalY });
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSave(tempData);
  };

  return (
    <form onSubmit={handleFormSubmit} style={{ color: '#334155', fontSize: '14px' }}>
      {/* ========================================
          볼 시각화 영역
      ======================================== */}
      <div style={{ 
        marginBottom: '24px', 
        padding: '20px',
        backgroundColor: '#f9fafb',
        borderRadius: '8px',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{ 
          fontSize: '14px', 
          fontWeight: '700', 
          marginBottom: '16px',
          color: '#1f2937'
        }}>
          타점/두께 시각화
        </h3>
        
        <svg 
          width={CANVAS_WIDTH} 
          height={CANVAS_HEIGHT}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          style={{ 
            display: 'block', 
            margin: '0 auto',
            backgroundColor: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            cursor: isDragging ? 'grabbing' : 'grab'
          }}
        >
          {/* 타겟볼 (뒤) */}
          <circle
            cx={targetX}
            cy={CENTER_Y}
            r={BALL_RADIUS}
            fill="#ef4444"
            stroke="#991b1b"
            strokeWidth="3"
          />
          
          {/* 임펙트볼 (앞) */}
          <circle
            cx={impactX}
            cy={CENTER_Y}
            r={BALL_RADIUS}
            fill="#ffffff"
            stroke="#1f2937"
            strokeWidth="3"
          />
          
          {/* 임펙트볼 전용 표시 */}
          {/* 60% 한계선 */}
          <circle
            cx={impactX}
            cy={CENTER_Y}
            r={limit60Radius}
            fill="none"
            stroke="#d1d5db"
            strokeWidth="1.5"
            strokeDasharray="6,3"
            opacity="0.6"
          />
          
          {/* 중심 십자선 (60% 원까지) */}
          <line
            x1={impactX - limit60Radius}
            y1={CENTER_Y}
            x2={impactX + limit60Radius}
            y2={CENTER_Y}
            stroke="#d1d5db"
            strokeWidth="1"
            opacity="0.5"
          />
          <line
            x1={impactX}
            y1={CENTER_Y - limit60Radius}
            x2={impactX}
            y2={CENTER_Y + limit60Radius}
            stroke="#d1d5db"
            strokeWidth="1"
            opacity="0.5"
          />
          
          {/* 중심점 (작게) */}
          <circle
            cx={impactX}
            cy={CENTER_Y}
            r="3"
            fill="#6b7280"
            opacity="0.7"
          />
          
          {/* 클램프 피드백 (빨간 테두리) */}
          {isClamped && (
            <circle
              cx={impactX}
              cy={CENTER_Y}
              r={limit60Radius}
              fill="none"
              stroke="#ef4444"
              strokeWidth="3"
              opacity="0.6"
            />
          )}
          
          {/* 타점 마커 (STEP B: hpt.hp) */}
          {(() => {
            const hitX = hpt.hp.x;
            const hitY = hpt.hp.y;
            
            // 타점 좌표를 픽셀로 변환 (±4 → 볼 반지름 60%)
            const scale = limit60Radius / MAX_VALUE;
            const markerX = impactX + (hitX * scale);
            const markerY = CENTER_Y - (hitY * scale); // Y축 반전
            const markerRadius = BALL_RADIUS / 12;
            
            return (
              <circle
                cx={markerX}
                cy={markerY}
                r={markerRadius}
                fill="#000000"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            );
          })()}
        </svg>
      </div>

      {/* 1줄: 두께 | 타점 | 시침 값 */}
      <div style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>두께</label>
            <select
              value={tempData.T ?? "8/8"}
              onChange={(e) => hpt.setT(e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                border: '1px solid #cbd5e1',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            >
              {T_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>타점</label>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', width: '100%', boxSizing: 'border-box' }}>
              <button type="button" onClick={() => { const next = Number((hpt.displayTip - 0.1).toFixed(1)); hpt.setSystemTip(hpt.hpDirection, next); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' }}>−</button>
              <span onClick={() => hpt.setSystemTip(hpt.hpDirection === "left" ? "right" : "left", hpt.displayTip)} style={{ cursor: 'pointer', fontSize: '14px', margin: '0 4px' }}>{hpt.hpDirection === "left" ? "좌측" : "우측"}</span>
              <input type="number" step="0.1" min="0" max="4" value={hpt.displayTip}
                onChange={(e) => { if (e.target.value === "") return; const raw = Number(e.target.value); if (isNaN(raw)) return; hpt.setSystemTip(hpt.hpDirection, raw); }}
                style={{ width: '48px', padding: '4px 6px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px', textAlign: 'center' }} />
              <span style={{ fontSize: '14px' }}>팁</span>
              <button type="button" onClick={() => { const next = Number((hpt.displayTip + 0.1).toFixed(1)); hpt.setSystemTip(hpt.hpDirection, next); }} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' }}>+</button>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '80px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>시침 값</label>
            <div style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '6px', backgroundColor: '#f8fafc', fontSize: '14px', textAlign: 'center' }}>
              {hpt.displayClock}
            </div>
          </div>
        </div>
      </div>

      {/* 2줄: 회전 | 당점 */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>회전</label>
            <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', backgroundColor: 'white', gap: '8px' }}>
              <button type="button" onClick={() => hpt.setRotationTip(hpt.rotationTip - 0.1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' }}>−</button>
              <span onClick={() => hpt.setRotationTip(-hpt.rotationTip)} style={{ minWidth: '32px', textAlign: 'center', fontSize: '14px', cursor: 'pointer' }}>
                {hpt.displayRotation >= 0 ? '우측' : '좌측'}
              </span>
              <input type="number" step="0.1" min="0" max="4" value={Number(Math.abs(hpt.displayRotation).toFixed(1))}
                onChange={(e) => {
                  if (e.target.value === '') return;
                  const raw = Number(e.target.value);
                  if (isNaN(raw)) return;
                  const sign = hpt.rotationTip >= 0 ? 1 : -1;
                  hpt.setRotationTip(sign * Number(Math.min(4, Math.max(0, raw)).toFixed(1)));
                }}
                style={{ width: '80px', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px', textAlign: 'center' }} />
              <span style={{ fontSize: '14px' }}>팁</span>
              <button type="button" onClick={() => hpt.setRotationTip(hpt.rotationTip + 0.1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' }}>+</button>
            </div>
          </div>
          <div style={{ flex: 1, minWidth: '120px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', fontSize: '14px' }}>당점</label>
            <div style={{ display: 'inline-flex', alignItems: 'center', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '6px 10px', backgroundColor: 'white', gap: '8px' }}>
              <button type="button" onClick={() => hpt.setVerticalTip(hpt.verticalTip - 0.1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' }}>−</button>
              <span onClick={() => hpt.setVerticalTip(-hpt.verticalTip)} style={{ minWidth: '32px', textAlign: 'center', fontSize: '14px', cursor: 'pointer' }}>
                {hpt.displayVertical >= 0 ? '상단' : '하단'}
              </span>
              <input type="number" step="0.1" min="0" max="4" value={Number(Math.abs(hpt.displayVertical).toFixed(1))}
                onChange={(e) => {
                  if (e.target.value === '') return;
                  const raw = Number(e.target.value);
                  if (isNaN(raw)) return;
                  const sign = hpt.verticalTip >= 0 ? 1 : -1;
                  hpt.setVerticalTip(sign * Number(Math.min(4, Math.max(0, raw)).toFixed(1)));
                }}
                style={{ width: '80px', padding: '4px', border: '1px solid #cbd5e1', borderRadius: '4px', fontSize: '14px', textAlign: 'center' }} />
              <span style={{ fontSize: '14px' }}>팁</span>
              <button type="button" onClick={() => hpt.setVerticalTip(hpt.verticalTip + 0.1)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '16px' }}>+</button>
            </div>
          </div>
        </div>
      </div>

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
        <button
          type="submit"
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          적용
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#e2e8f0',
            color: '#334155',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          취소
        </button>
      </div>
    </form>
  );
}

export function StrOverlay({ data, onSave, onCancel }) {
  const [tempData, setTempData] = useState({
    type: data?.type ?? null,
    acceleration: data?.acceleration || 'smooth_const',
    speed: data?.speed ?? 2.5,
    depth: data?.depth ?? 2,
    impact: data?.impact || 'medium'
  });

  // 스트로크 타입 옵션 (null = 선택 안함)
  const STROKE_TYPES = [
    { value: null, label: '선택 안함' },
    { value: 'long_follow', label: '롱 팔로우' },
    { value: 'through_shot', label: '관통 샷' },
    { value: 'stop_shot', label: '스톱 샷' },
    { value: 'short_shot', label: '숏 샷' }
  ];

  // 가속 패턴 옵션
  const ACCELERATION_PATTERNS = [
    { value: 'smooth_accel', label: '부드러운 가속' },
    { value: 'sharp_accel', label: '날카로운 가속' },
    { value: 'smooth_const', label: '부드러운 등속' },
    { value: 'intentional_decel', label: '의도적 감속' }
  ];

  // 타격 강도 옵션
  const IMPACT_STRENGTHS = [
    { value: 'soft', label: '부드러운' },
    { value: 'medium', label: '평범한' },
    { value: 'hard', label: '강한' },
    { value: 'sharp', label: '날카로운' }
  ];

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onSave(tempData);
  };

  return (
    <form onSubmit={handleFormSubmit} style={{ color: '#334155', fontSize: '16px' }}>
      {/* 1. 스트로크 타입 */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: '600',
          fontSize: '16px'
        }}>
          스트로크 타입
        </label>
        <select
          value={tempData.type ?? ""}
          onChange={(e) => setTempData({ ...tempData, type: e.target.value === "" ? null : e.target.value })}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          {STROKE_TYPES.map(opt => (
            <option key={opt.value ?? "null"} value={opt.value ?? ""}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* 2. 가속 패턴 */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: '600',
          fontSize: '16px'
        }}>
          가속 패턴
        </label>
        <select
          value={tempData.acceleration}
          onChange={(e) => setTempData({ ...tempData, acceleration: e.target.value })}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          {ACCELERATION_PATTERNS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* 3. 목표 속도 (슬라이더) */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '10px', 
          fontWeight: '600',
          fontSize: '16px'
        }}>
          목표 속도
        </label>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '4px'
        }}>
          <input
            type="range"
            min="0.5"
            max="7.0"
            step="0.5"
            value={tempData.speed}
            onChange={(e) => setTempData({ ...tempData, speed: Number(e.target.value) })}
            style={{
              flex: 1,
              cursor: 'pointer'
            }}
          />
          <span style={{ 
            minWidth: '100px',
            textAlign: 'right',
            fontWeight: '600',
            fontSize: '18px',
            color: '#2563eb'
          }}>
            {tempData.speed.toFixed(1)} 레일
          </span>
        </div>
      </div>

      {/* 4. 스트로크 깊이 (슬라이더) */}
      <div style={{ marginBottom: '24px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '10px', 
          fontWeight: '600',
          fontSize: '16px'
        }}>
          스트로크 깊이
        </label>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          marginBottom: '4px'
        }}>
          <input
            type="range"
            min="0.5"
            max="6.0"
            step="0.5"
            value={tempData.depth}
            onChange={(e) => setTempData({ ...tempData, depth: Number(e.target.value) })}
            style={{
              flex: 1,
              cursor: 'pointer'
            }}
          />
          <span style={{ 
            minWidth: '100px',
            textAlign: 'right',
            fontWeight: '600',
            fontSize: '18px',
            color: '#2563eb'
          }}>
            {tempData.depth.toFixed(1)} Ball
          </span>
        </div>
      </div>

      {/* 5. 타격 강도 */}
      <div style={{ marginBottom: '20px' }}>
        <label style={{ 
          display: 'block', 
          marginBottom: '8px', 
          fontWeight: '600',
          fontSize: '16px'
        }}>
          타격 강도
        </label>
        <select
          value={tempData.impact}
          onChange={(e) => setTempData({ ...tempData, impact: e.target.value })}
          style={{
            width: '100%',
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          {IMPACT_STRENGTHS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
        <button
          type="submit"
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          적용
        </button>
        <button
          type="button"
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '10px',
            backgroundColor: '#e2e8f0',
            color: '#334155',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          취소
        </button>
      </div>
    </form>
  );
}
