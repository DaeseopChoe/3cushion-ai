import React, { useState, useEffect, useRef, useMemo } from "react";
import { convertCanonicalAnchors } from "./lib/convertCanonicalAnchors";
import { useShotSlots } from "./hooks/useShotSlots";
import { useTrajectoryState } from "./hooks/useTrajectoryState";
import { SYSTEM_PROFILES } from "./systems";
import { calculateByProfileExpr } from "./utils/systemCalculator";

const ADMIN_BUTTONS = ["SYS", "HPT", "STR", "AI"];

const SHOTS = [
  { id: "H001_05", label: "H001 – B2T_R / 4C", file: "canonical.json" },
  { id: "H001_05_SB1", label: "H001 – B2T_R / 4C - SB1", file: "B2T_R/H001_05_SB1.json" },
  { id: "H001_05_SB2", label: "H001 – B2T_R / 4C - SB2", file: "B2T_R/H001_05_SB2.json" },
  { id: "H001_05_SB3", label: "H001 – B2T_R / 4C - SB3", file: "B2T_R/H001_05_SB3.json" },
  { id: "H001_05_SB4", label: "H001 – B2T_R / 4C - SB4", file: "B2T_R/H001_05_SB4.json" },
  { id: "H001_05_SB5", label: "H001 – B2T_R / 4C - SB5", file: "B2T_R/H001_05_SB5.json" },
 ];

const SCALE = 10;
const TABLE_W_UNITS = 80;
const TABLE_H_UNITS = 40;
const TABLE_W = TABLE_W_UNITS * SCALE;
const TABLE_H = TABLE_H_UNITS * SCALE;
const PADDING = 30;  // 100 → 30 (여백 축소)

const BALL_DIAMETER_MM = 61.5;
const RG_UNIT_MM = 35.55;
const BALL_DIAMETER_RG = BALL_DIAMETER_MM / RG_UNIT_MM;
const BALL_RADIUS_RG = BALL_DIAMETER_RG / 2;

// Anti-aliasing compensation (렌더링 전용)
const AA_EPSILON = 0.08; // rg 단위
const RENDER_RADIUS_RG = BALL_RADIUS_RG - AA_EPSILON;

// 송설님 치수
const CUSHION_MM = 45;
const FRAME_MM = 80;
const POINT_OFFSET_MM = 80;

const CUSHION_RG = CUSHION_MM / RG_UNIT_MM;
const FRAME_RG = FRAME_MM / RG_UNIT_MM;
const POINT_OFFSET_RG = POINT_OFFSET_MM / RG_UNIT_MM;

function toPx({ x, y }) {
  return { x: x * SCALE, y: TABLE_H - y * SCALE };
}

/*
-------------------------------------------------------
Overlay: STR (Striking parameter adjust)
@useTrajectoryState.ts 참고하여 시스템 1C 보정값과 3C 입력값 표시 및 입력 제어 구현
-------------------------------------------------------
*/

function STRContent({ trajectoryState }) {
  const { state, updateAdjusted } = trajectoryState;
  const threeC = state?.adjusted?.sys?.threeC ?? '';
  const oneC = state?.adjusted?.sys?.oneC ?? '';

  // 3C 입력창 핸들러 (input type=number)
  const handleThreeCChange = e => {
    const value = e.target.value;
    // 숫자로 변환. 빈 값이면 바로 처리
    const num = value === '' ? '' : Number(value);
    updateAdjusted({ threeC: num });
  };

  // 비어있을 때도 허용, 아니면 고정소수점
  const displayOneC = oneC === '' ? '' : Number(oneC).toFixed(2);
  const displayThreeC = threeC === '' ? '' : Number(threeC);

  return (
    <div style={{ padding: 20, fontSize: 16 }}>
      <div style={{ marginBottom: 10 }}>
        <strong>3C 입력값:</strong>
        <input
          type="number"
          value={threeC}
          onChange={handleThreeCChange}
          min={0}
          step="0.01"
          style={{ marginLeft: 10, width: 80 }}
        />
      </div>
      <div>
        <strong>1C 보정값 (실시간 0.75× 보정):</strong>
        <span style={{ marginLeft: 10, fontWeight: 'bold' }}>{displayOneC}</span>
      </div>
    </div>
  );
}

// Rg 역변환 (px → Rg)
function toRg({ x, y }) {
  return {
    x: x / SCALE,
    y: (TABLE_H - y) / SCALE
  };
}

// 포인터 → Rg 좌표 변환
function pointerToRg(e, svgEl) {
  const pt = svgEl.createSVGPoint();
  pt.x = e.clientX;
  pt.y = e.clientY;
  const ctm = svgEl.getScreenCTM();
  if (!ctm) return null;

  const p = pt.matrixTransform(ctm.inverse());
  const px = { x: p.x - PADDING, y: p.y - PADDING };
  return toRg(px);
}

// Clamp 함수
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

/* -------------------------------------------------------
   선회 방향 자동 판단 (앵커 좌표 기반)
------------------------------------------------------- */
function determineRotation(CO, C1) {
  if (!CO || !C1) return "RIGHT";
  
  const isB2T = Math.abs(CO.y - (-2.25)) < 0.5;
  const isT2B = Math.abs(CO.y - 42.25) < 0.5;
  
  if (isB2T) {
    // B2T: CO_x > 1C_x → 좌선회
    return CO.x > C1.x ? "LEFT" : "RIGHT";
  } else if (isT2B) {
    // T2B: CO_x > 1C_x → 우선회
    return CO.x > C1.x ? "RIGHT" : "LEFT";
  }
  
  return "RIGHT";
}

/* -------------------------------------------------------
   패턴별 impact 방향
------------------------------------------------------- */
function getImpactDirection(rotation, pattern) {
  if (pattern === "뒤돌리기" || pattern === "BACKDOUBLE") {
    // 뒤돌리기: 선회 반대로 겨냥
    return rotation === "LEFT" ? 1 : -1;  // 좌선회→우측(+1), 우선회→좌측(-1)
  } else if (pattern === "옆돌리기" || pattern === "SIDEDOUBLE") {
    // 옆돌리기: 선회 그대로 겨냥
    return rotation === "LEFT" ? -1 : 1;  // 좌선회→좌측(-1), 우선회→우측(+1)
  }
  
  // 기본값 (뒤돌리기와 동일)
  return rotation === "LEFT" ? 1 : -1;
}

// ============================================
// ImpactBall / HP-T 함수들
// ============================================

/**
 * T값 파싱
 * @param {string} T - "8/8", "+3/8", "-0/8" 등
 * @returns {{ direction: -1|0|1, numerator: number, denominator: number }}
 */
function parseT(T) {
  // [1] T 없으면 "8/8" fallback
  if (!T) {
    console.warn("parseT: T값 없음, 기본값 8/8 사용");
    return { direction: 0, numerator: 8, denominator: 8 };
  }
  
  // [2] "8/8"은 direction = 0
  if (T === "8/8") {
    return { direction: 0, numerator: 8, denominator: 8 };
  }
  
  // [3] + / - 부호 파싱
  const sign = T[0];
  if (sign !== '+' && sign !== '-') {
    console.warn("parseT: 부호 없음, fallback 8/8", T);
    return { direction: 0, numerator: 8, denominator: 8 };
  }
  
  const direction = sign === '+' ? 1 : -1;
  
  // [4] numerator / denominator 파싱
  const fraction = T.slice(1);
  if (!fraction.includes('/')) {
    console.warn("parseT: 분수 형식 아님, fallback 8/8", T);
    return { direction: 0, numerator: 8, denominator: 8 };
  }
  
  const parts = fraction.split('/');
  const numerator = Number(parts[0]);
  const denominator = Number(parts[1]);
  
  // [5] 잘못된 값은 console.warn 후 8/8 fallback
  if (isNaN(numerator) || isNaN(denominator) || denominator === 0) {
    console.warn("parseT: 숫자 파싱 실패, fallback 8/8", T);
    return { direction: 0, numerator: 8, denominator: 8 };
  }
  
  return { direction, numerator, denominator };
}

/**
 * 타겟볼 기준 임팩트볼 위치 계산
 * 
 * 개념 고정:
 * - 순서: cue → impact → target
 * - 타겟볼이 주체
 * - 접점이 먼저, ImpactBall은 결과
 * - ImpactBall = 접점에서 큐볼 방향으로 BALL_RADIUS 이동
 */
function calcImpactBall(cue, target, T) {
  // [1] 입력 검증
  if (!cue || !target) {
    console.warn("calcImpactBall: 큐볼 또는 타겟볼 없음");
    return null;
  }

  // [2] T 파싱
  const { direction, numerator, denominator } = parseT(T);

  // [3] 큐 → 타겟 진행 방향 단위벡터 계산
  const dx = target.x - cue.x;
  const dy = target.y - cue.y;
  const dist = Math.hypot(dx, dy);
  
  if (dist < 1e-6) {
    console.warn("calcImpactBall: 큐볼과 타겟볼이 겹침");
    return { x: target.x, y: target.y };
  }
  
  const ux = dx / dist;
  const uy = dy / dist;

  // [4] 8/8 특수 처리
  if (T === "8/8") {
    // 접점 = target - (진행방향 × BALL_RADIUS)
    const contactX = target.x - ux * BALL_RADIUS_RG;
    const contactY = target.y - uy * BALL_RADIUS_RG;
    
    // ImpactBall = 접점 - (진행방향 × BALL_RADIUS)
    return {
      x: contactX - ux * BALL_RADIUS_RG,
      y: contactY - uy * BALL_RADIUS_RG
    };
  }

  // [5] 일반 두께 (0/8 ~ 7/8)
  // [5-1] 접선 방향 단위벡터
  const vx = direction * uy;
  const vy = direction * (-ux);

  // [5-2] 접선 이동량
  // ⚠️ numerator === 0 → offset = 0, direction 계산에는 영향 없음
  const offset = (numerator / denominator) * BALL_DIAMETER_RG;

  // [5-3] 타겟볼 표면 시작점
  const surfaceX = target.x - ux * BALL_RADIUS_RG;
  const surfaceY = target.y - uy * BALL_RADIUS_RG;

  // [5-4] 접선 이동 (raw contact)
  const rawContactX = surfaceX + vx * offset;
  const rawContactY = surfaceY + vy * offset;

  // [5-5] 접점 정규화 (타겟볼 원 위)
  const dcx = rawContactX - target.x;
  const dcy = rawContactY - target.y;
  const distContact = Math.hypot(dcx, dcy);
  
  if (distContact < 1e-6) {
    console.warn("calcImpactBall: 접점이 타겟볼 중심과 겹침");
    return {
      x: target.x - ux * BALL_RADIUS_RG * 2,
      y: target.y - uy * BALL_RADIUS_RG * 2
    };
  }
  
  const contactX = target.x + (dcx / distContact) * BALL_RADIUS_RG;
  const contactY = target.y + (dcy / distContact) * BALL_RADIUS_RG;

  // [6] ImpactBall 위치 계산
  // 접점 → 큐볼 방향 단위벡터 계산
  const towardsCueX = cue.x - contactX;
  const towardsCueY = cue.y - contactY;
  const distToCue = Math.hypot(towardsCueX, towardsCueY);
  
  if (distToCue < 1e-6) {
    console.warn("calcImpactBall: 접점이 큐볼과 겹침");
    return {
      x: contactX - ux * BALL_RADIUS_RG,
      y: contactY - uy * BALL_RADIUS_RG
    };
  }
  
  const ucx = towardsCueX / distToCue;
  const ucy = towardsCueY / distToCue;
  
  // ImpactBall = 접점 + (큐방향 × BALL_RADIUS)
  return {
    x: contactX + ucx * BALL_RADIUS_RG,
    y: contactY + ucy * BALL_RADIUS_RG
  };
}

function calculateImpact(cue, target, CO_fg, C1_fg, thicknessStr, pattern) {
  let t = 0.5;
  if (typeof thicknessStr === "string" && thicknessStr.includes("/")) {
    const [a, b] = thicknessStr.split("/").map(Number);
    if (b !== 0) t = a / b;
  }
  if (!cue || !target) return null;

  const dx_ct = target.x - cue.x;
  const dy_ct = target.y - cue.y;
  const dist_ct = Math.sqrt(dx_ct * dx_ct + dy_ct * dy_ct);
  if (dist_ct < 1e-6) return { ...target };

  const ux = dx_ct / dist_ct;
  const uy = dy_ct / dist_ct;
  
  // 앵커로 선회 방향 자동 판단
  const rotation = determineRotation(CO_fg, C1_fg);
  const impactSign = getImpactDirection(rotation, pattern);
  
  console.log("🎯 Impact 상세:", {
    "큐볼": cue,
    "타겟볼": target,
    "CO_fg": CO_fg,
    "C1_fg": C1_fg,
    "진행방향(ux,uy)": { ux, uy },
    "rotation": rotation,
    "pattern": pattern,
    "impactSign": impactSign,
    "겨냥": impactSign === 1 ? "우측(+1)" : "좌측(-1)",
    "수직벡터(vx,vy)": { vx: impactSign * uy, vy: impactSign * -ux }
  });
  
  const vx = impactSign * uy;
  const vy = impactSign * -ux;
  const offset = (1 - t) * BALL_DIAMETER_RG;

  return {
    x: target.x - ux * BALL_RADIUS_RG + vx * offset,
    y: target.y - uy * BALL_RADIUS_RG + vy * offset,
  };
}

function adjustSystemLine(CO_rg, C1_rg, impact) {
  if (!CO_rg || !C1_rg || !impact) return { CO_adj: null, C1_adj: null };
  const dx = C1_rg.x - CO_rg.x;
  const dy = C1_rg.y - CO_rg.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 1e-6) return { CO_adj: CO_rg, C1_adj: C1_rg };

  const ux = dx / dist;
  const uy = dy / dist;
  const to_x = impact.x - CO_rg.x;
  const to_y = impact.y - CO_rg.y;
  const proj = to_x * ux + to_y * uy;
  const perp_x = to_x - proj * ux;
  const perp_y = to_y - proj * uy;

  return {
    CO_adj: { x: CO_rg.x + perp_x, y: CO_rg.y + perp_y },
    C1_adj: { x: C1_rg.x + perp_x, y: C1_rg.y + perp_y },
  };
}

function groupSystemValuesByRail(anchors, systemValues, lastCushion) {
  const groups = { BOTTOM: [], TOP: [], LEFT: [], RIGHT: [] };
  if (!anchors || !systemValues) return groups;

  const markOrder = ["CO", "1C", "2C", "3C", "4C", "5C", "6C"];
  const lastIndex = markOrder.indexOf(lastCushion);
  const visibleMarks = lastIndex >= 0 ? markOrder.slice(0, lastIndex + 1) : markOrder;

  visibleMarks.forEach((mark) => {
    const coord = anchors[mark];
    if (!coord) return;
    const sys = systemValues?.[mark];
    if (sys == null) return;
    const { x, y } = coord;

    if (Math.abs(y - 0) < 0.5) groups.BOTTOM.push({ mark, x, sys });
    if (Math.abs(y - 40) < 0.5) groups.TOP.push({ mark, x, sys });
    if (Math.abs(x - 0) < 0.5) groups.LEFT.push({ mark, y, sys });
    if (Math.abs(x - 80) < 0.5) groups.RIGHT.push({ mark, y, sys });
  });

  return groups;
}

function Ball({ x, y, color, opacity = 1, ...eventProps }) {
  const p = toPx({ x, y });
  return (
    <circle
      cx={p.x + PADDING}
      cy={p.y + PADDING}
      r={RENDER_RADIUS_RG * SCALE}
      fill={color}
      opacity={opacity}
      shapeRendering="geometricPrecision"
      pointerEvents="all"
      {...eventProps}
    />
  );
}

function AnchorPoint({ x, y, label, isFg = false, systemValues }) {
  let dotX = x;
  let dotY = y;

  if (isFg) {
    if (Math.abs(y - 42.25) < 0.5) dotY = 40;
    else if (Math.abs(y - (-2.25)) < 0.5) dotY = 0;
  }

  const p = toPx({ x: dotX, y: dotY });

  let dx = 0, dy = 0, anchor = "middle";
  if (Math.abs(dotY - 40) < 0.5) dy = -10;
  else if (Math.abs(dotY - 0) < 0.5) dy = 17.5;

  if (Math.abs(dotX - 0) < 0.5) {
    dx = -10;
    anchor = "end";
  } else if (Math.abs(dotX - 80) < 0.5) {
    dx = 10;
    anchor = "start";
  }

  const systemValue =
    typeof label === "string" && systemValues?.[label] != null
      ? systemValues[label]
      : null;

  return (
    <g>
      <circle
        cx={p.x + PADDING}
        cy={p.y + PADDING}
        r={2.5}
        fill="#facc15"
      />
      <text
        x={p.x + PADDING + dx}
        y={p.y + PADDING + dy}
        fill="#facc15"
        textAnchor={anchor}
        dominantBaseline="middle"
        fontWeight="bold"
      >
        {/* 메인 C 포인트 (크게) */}
        <tspan fontSize={20}>{label}</tspan>

        {/* 시스템 값 (_20, _40 등) — 살짝 작게 */}
        {systemValue !== null && (
          <tspan fontSize={20}>{" "}_{systemValue}</tspan>
        )}
      </text>
    </g>
  );
}



// ============================================
// 관리자 모드 오버레이 컴포넌트들
// ============================================


function SysOverlay({ data, onSave, onCancel }) {
  // ==========================================
  // v1 공략 유형 (내부 상수 고정)
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
  // 공식 파서 함수
  // ==========================================
  function parseExpr(expr) {
    if (!expr) return { forced: {}, neededKeys: new Set(), needsHP: false, needsAn: false };
    
    // 예: CO_f, C3_r, C1_f ...
    const rx = /\b(CO|C1|C2|C3|C4)_(f|r)\b/g;
    const forced = { CO: null, C1: null, C2: null, C3: null, C4: null };
    const neededKeys = new Set();

    let m;
    while ((m = rx.exec(expr)) !== null) {
      const mark = m[1];     // CO..C4
      const sp = m[2];       // f/r
      forced[mark] = sp;     // 이 시스템은 이 mark의 space가 고정임
      neededKeys.add(`${mark}_${sp}`);
    }

    const needsHP = /\bHP_n\b/.test(expr);
    const needsAn = /\bAn\b/.test(expr);

    return { forced, neededKeys, needsHP, needsAn };
  }

  // ==========================================
  // 상태 관리 (완성 키 방식)
  // ==========================================
  const [formData, setFormData] = useState({
    shotType: data?.shotType || '뒤돌리기',
    system: data?.system || SYSTEM_OPTIONS[0]?.id || '5_half_system',
    // 완성 키 방식: CO_f, CO_r, C1_f, C1_r, ..., C4_f, C4_r, HP_n, An
    inputs: {
      CO_f: data?.inputs?.CO_f ?? "",
      CO_r: data?.inputs?.CO_r ?? "",
      C1_f: data?.inputs?.C1_f ?? "",
      C1_r: data?.inputs?.C1_r ?? "",
      C2_f: data?.inputs?.C2_f ?? "",
      C2_r: data?.inputs?.C2_r ?? "",
      C3_f: data?.inputs?.C3_f ?? "",
      C3_r: data?.inputs?.C3_r ?? "",
      C4_f: data?.inputs?.C4_f ?? "",
      C4_r: data?.inputs?.C4_r ?? "",
      HP_n: data?.inputs?.HP_n ?? 0,
      An: data?.inputs?.An ?? 0.0
    },
    corrections: {
      slide: data?.corrections?.slide || 0,
      draw: data?.corrections?.draw || 0,
      departure: data?.corrections?.departure || 0,
      spin: data?.corrections?.spin || 0
    }
  });

  // UI 토글 상태 (표시용) - 계산키와 분리
  const [spaceSel, setSpaceSel] = useState({
    CO: data?.spaceSel?.CO || "f",
    C1: data?.spaceSel?.C1 || "f",
    C2: data?.spaceSel?.C2 || "f",
    C3: data?.spaceSel?.C3 || "f",
    C4: data?.spaceSel?.C4 || "f"
  });

  // ==========================================
  // 공식 로딩 및 파싱 (expr 변경 시에만 재계산 — 매 렌더 새 참조 방지)
  // ==========================================
  const profile = SYSTEM_PROFILES?.[formData.system];
  const expr = typeof profile?.formula === "string"
    ? profile.formula
    : profile?.formula?.expr || "";

  const parsed = useMemo(() => parseExpr(expr), [expr]);
  const { forced, neededKeys, needsHP, needsAn } = parsed;

  // rhsKeys: expr에 의존, neededKeys는 parsed 내부이므로 expr과 동기화
  const rhsKeys = useMemo(() => {
    const keyList = Array.from(neededKeys || []);
    if (!expr || !expr.trim()) return keyList;
    const lhs = expr.trim().split('=')[0].trim();
    return keyList.filter((k) => k !== lhs);
  }, [expr, neededKeys]);

  // 공식 로딩 시 f/r 스위치 자동 고정
  useEffect(() => {
    const { forced: forcedSpaces } = parsed;
    setSpaceSel(prev => {
      const next = { ...prev };
      (["CO", "C1", "C2", "C3", "C4"]).forEach(k => {
        if (forcedSpaces[k]) next[k] = forcedSpaces[k]; // 공식이 강제하면 자동 세팅
      });
      return next;
    });
  }, [expr]);

  // 공식에 필요한 입력: 우변(RHS) 변수만 검사, 좌변(목표 변수)은 제외. HP_n/An은 0도 유효.
  const hasAllInputs = useMemo(() => {
    if (!rhsKeys || rhsKeys.length === 0) return false;

    const ok = rhsKeys.every((k) => {
      const v = formData.inputs && formData.inputs[k];
      return v !== '' && v !== null && v !== undefined;
    });
    if (!ok) return false;

    if (needsHP) {
      const v = formData.inputs.HP_n;
      if (v === '' || v === null || v === undefined) return false;
    }
    if (needsAn) {
      const v = formData.inputs.An;
      if (v === '' || v === null || v === undefined) return false;
    }
    return true;
  }, [formData.inputs, rhsKeys, needsHP, needsAn]);

  // ==========================================
  // 계산 엔진 연결 (실시간 업데이트) — 입력값 부족 시 계산 안 함
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

    const payload = {};
    rhsKeys.forEach((k) => {
      const val = formData.inputs[k];
      payload[k] = val === '' || val === null || val === undefined ? 0 : Number(val);
    });
    if (needsHP) payload.HP_n = Number(formData.inputs.HP_n ?? 0);
    if (needsAn) payload.An = Number(formData.inputs.An ?? 0);

    const result = calculateByProfileExpr(expr, payload);
    setCalcResult((prev) => {
      const prevKey = Object.keys(prev)[0];
      const nextKey = Object.keys(result)[0];
      if (prevKey === nextKey && prev[prevKey] === result[nextKey]) return prev;
      return result;
    });
  }, [expr, hasAllInputs, formData.inputs, rhsKeys, needsHP, needsAn]);

  const baseResultValue = Object.keys(calcResult).length > 0 ? Object.values(calcResult)[0] : null;
  const baseResultKey = Object.keys(calcResult).length > 0 ? Object.keys(calcResult)[0] : null;

  // 소수점 제거: 정수면 정수로, 아니면 그대로 (동기화·노란/초록 박스 공통)
  const formatResultNum = (n) => {
    const x = Number(n);
    if (Number.isNaN(x)) return '0';
    return x % 1 === 0 ? String(Math.round(x)) : String(x);
  };

  // 기준 계산값 → inputs[baseResultKey] 강제 동기화 (계산되면 무조건 주입, 숫자 같을 때만 스킵)
  useEffect(() => {
    if (!baseResultKey || baseResultValue == null) return;

    setFormData(prev => {
      if (Number(prev.inputs[baseResultKey]) === Number(baseResultValue)) return prev;
      return {
        ...prev,
        inputs: { ...prev.inputs, [baseResultKey]: formatResultNum(baseResultValue) }
      };
    });
  }, [baseResultValue, baseResultKey]);

  // 물리 보정 매핑: p_push→CO, p_pull/p_spin→C3, p_start→C4/C5/C6 (입력 변수 선반영 후 재계산)
  const p_push = Number(formData.corrections.slide) || 0;
  const p_pull = Number(formData.corrections.draw) || 0;
  const p_spin = Number(formData.corrections.spin) || 0;
  const snFor5Half = useMemo(() => {
    if (formData.system !== '5_half_system') return null;
    const CO_f = Number(formData.inputs?.CO_f) || 0;
    const C3_r = Number(formData.inputs?.C3_r) || 0;
    return { Sn: (CO_f - 50) * 0.5, C4_f: C3_r + (CO_f - 50) * 0.5 };
  }, [formData.system, formData.inputs?.CO_f, formData.inputs?.C3_r]);
  const p_start = formData.system === '5_half_system' && snFor5Half
    ? snFor5Half.Sn
    : (Number(formData.corrections.departure) || 0);

  const { adjustedInputs, finalCalc, lhsKey } = useMemo(() => {
    if (!expr || !expr.trim()) return { adjustedInputs: {}, finalCalc: {}, lhsKey: null };
    if (!hasAllInputs) return { adjustedInputs: {}, finalCalc: {}, lhsKey: null };
    const payload = {};
    rhsKeys.forEach((k) => {
      const val = formData.inputs[k];
      payload[k] = val === '' || val === null || val === undefined ? 0 : Number(val);
    });
    if (needsHP) payload.HP_n = Number(formData.inputs.HP_n || 0);
    if (needsAn) payload.An = Number(formData.inputs.An || 0);

    const adjusted = { ...payload };
    if ('CO_f' in adjusted) adjusted['CO_f'] += p_push;
    if ('CO_r' in adjusted) adjusted['CO_r'] += p_push;
    const pullSpin = p_pull + p_spin;
    if ('C3_f' in adjusted) adjusted['C3_f'] -= pullSpin;
    if ('C3_r' in adjusted) adjusted['C3_r'] -= pullSpin;
    ['C4_f', 'C4_r', 'C5_f', 'C5_r', 'C6_f', 'C6_r'].forEach((k) => {
      if (k in adjusted) adjusted[k] += p_start;
    });

    const final = calculateByProfileExpr(expr, adjusted);
    const keys = Object.keys(final);
    return { adjustedInputs: adjusted, finalCalc: final, lhsKey: keys.length > 0 ? keys[0] : null };
  }, [expr, hasAllInputs, formData.inputs, rhsKeys, p_push, p_pull, p_spin, p_start, needsHP, needsAn]);

  const finalResultDisplay = (() => {
    if (!lhsKey) return null;
    const v = finalCalc[lhsKey];
    return v != null ? v : null;
  })();

  const handleInputChange = (key, value) => {
    setFormData(prev => ({
      ...prev,
      inputs: { ...prev.inputs, [key]: value }
    }));
  };

  // ==========================================
  // 저장 핸들러
  // ==========================================
  const handleSave = () => {
    const saveData = {
      ...formData,
      spaceSel,
      calculated: calcResult,
      finalResult: finalResultDisplay,
      adjustedInputs
    };
    onSave(saveData);
  };

  // 기준 계산값 치환 문자열 (입력값 부족 시 계산/표시 안 함)
  const substitutionDisplay = useMemo(() => {
    if (!expr || !expr.trim()) return { text: '입력 대기 중...' };
    if (!hasAllInputs) return { text: '입력 대기 중...' };
    const trimmed = expr.trim();
    const parts = trimmed.split('=').map((p) => p.trim());
    if (parts.length < 2 || !parts[0] || !parts[1]) return { text: '입력 대기 중...' };
    const rawLhs = parts[0];
    const rawRhs = parts[1];
    const resultVal = calcResult[rawLhs];
    const numVal = resultVal != null && typeof resultVal === 'number' ? resultVal : 0;

    const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    let substitutedRhs = rawRhs;
    for (const k of (rhsKeys || [])) {
      const v = formData.inputs[k];
      const num = v === '' || v === null || v === undefined ? 0 : Number(v);
      substitutedRhs = substitutedRhs.replace(new RegExp('\\b' + escapeRegExp(k) + '\\b', 'g'), formatResultNum(num));
    }
    if (needsHP) {
      const v = formData.inputs.HP_n;
      substitutedRhs = substitutedRhs.replace(/\bHP_n\b/g, formatResultNum(v === '' || v === null || v === undefined ? 0 : Number(v)));
    }
    if (needsAn) {
      const v = formData.inputs.An;
      substitutedRhs = substitutedRhs.replace(/\bAn\b/g, formatResultNum(v === '' || v === null || v === undefined ? 0 : Number(v)));
    }

    const base = rawLhs.replace(/_f$|_r$/, '');
    const lhsDisplay = base + '_' + formatResultNum(numVal);
    return { text: lhsDisplay + ' = ' + substitutedRhs };
  }, [expr, hasAllInputs, formData.inputs, calcResult, rhsKeys, needsHP, needsAn]);

  // 최종 결과 치환 문자열: C1_35 = (50 + 5) - 20 형태, 괄호는 기본값+보정, 소수점 제거
  const finalResultSubstitution = useMemo(() => {
    if (!lhsKey || !expr || !expr.trim()) return null;
    if (!hasAllInputs) return null;
    const parts = expr.trim().split('=').map((p) => p.trim());
    if (parts.length < 2 || !parts[1]) return null;
    const rawRhs = parts[1];
    const resultVal = finalCalc[lhsKey];
    const numVal = resultVal != null && typeof resultVal === 'number' ? resultVal : 0;
    const escapeRegExp = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pullSpin = p_pull + p_spin;
    let substitutedRhs = rawRhs;
    for (const k of (rhsKeys || [])) {
      const baseVal = Number(formData.inputs[k]) || 0;
      const adjVal = adjustedInputs[k] != null ? Number(adjustedInputs[k]) : 0;
      let disp;
      if ((k === 'CO_f' || k === 'CO_r') && p_push !== 0) disp = `(${formatResultNum(baseVal)} + ${formatResultNum(p_push)})`;
      else if ((k === 'C3_f' || k === 'C3_r') && pullSpin !== 0) disp = `(${formatResultNum(baseVal)} - ${formatResultNum(pullSpin)})`;
      else if (['C4_f', 'C4_r', 'C5_f', 'C5_r', 'C6_f', 'C6_r'].includes(k) && p_start !== 0) disp = `(${formatResultNum(baseVal)} + ${formatResultNum(p_start)})`;
      else disp = formatResultNum(adjVal);
      substitutedRhs = substitutedRhs.replace(new RegExp('\\b' + escapeRegExp(k) + '\\b', 'g'), disp);
    }
    if (needsHP) substitutedRhs = substitutedRhs.replace(/\bHP_n\b/g, formatResultNum(adjustedInputs.HP_n != null ? adjustedInputs.HP_n : 0));
    if (needsAn) substitutedRhs = substitutedRhs.replace(/\bAn\b/g, formatResultNum(adjustedInputs.An != null ? adjustedInputs.An : 0));
    const base = lhsKey.replace(/_f$|_r$/, '');
    return base + '_' + formatResultNum(numVal) + ' = ' + substitutedRhs;
  }, [expr, lhsKey, hasAllInputs, finalCalc, adjustedInputs, formData.inputs, rhsKeys, p_push, p_pull, p_spin, p_start, needsHP, needsAn]);

  return (
    <div
      style={{
        color: '#334155',
        fontSize: '14px',
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        flexWrap: 'wrap',
        maxHeight: '95vh',
        overflow: 'hidden',
        overflowX: 'hidden'
      }}
    >
      {/* [B] 상단 설정: 공략 유형(고정폭) | 적용 시스템(남은 공간) */}
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flex: '0 0 auto' }}>
        <div style={{ flex: '0 0 160px' }}>
          <select
            value={formData.shotType}
            onChange={(e) => setFormData({ ...formData, shotType: e.target.value })}
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
            onChange={(e) => setFormData({ ...formData, system: e.target.value })}
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

      {/* [C] 계산 공식 표시 */}
      <div
        style={{
          padding: '8px',
          backgroundColor: '#f1f5f9',
          borderRadius: '6px',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: '13px',
          border: '1px solid #e2e8f0'
        }}
      >
        계산 공식 : {expr || "(공식 없음)"}
      </div>

      {/* [D] 기준 입력값: flex-wrap, 폭 하드 지정 */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '10px',
          alignItems: 'center'
        }}
      >
        {["CO", "C1", "C2", "C3", "C4"].map(mark => {
          const sel = spaceSel[mark];
          const key = `${mark}_${sel}`;
          const enabled = neededKeys.has(key);
          const lock = !!forced[mark];
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
                value={formData.inputs[key] ?? ''}
                onChange={(e) => handleInputChange(key, e.target.value)}
                style={{
                  width: '70px',
                  height: '32px',
                  padding: '0 6px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '4px',
                  fontSize: '13px',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', gap: '1px' }}>
                <button
                  type="button"
                  disabled={lock}
                  onClick={() => setSpaceSel(p => ({ ...p, [mark]: "f" }))}
                  style={{
                    width: '24px',
                    height: '32px',
                    padding: 0,
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '600',
                    cursor: lock ? 'not-allowed' : 'pointer',
                    backgroundColor: sel === "f" ? '#3b82f6' : '#fff',
                    color: sel === "f" ? '#fff' : '#64748b'
                  }}
                >
                  f
                </button>
                <button
                  type="button"
                  disabled={lock}
                  onClick={() => setSpaceSel(p => ({ ...p, [mark]: "r" }))}
                  style={{
                    width: '24px',
                    height: '32px',
                    padding: 0,
                    border: '1px solid #cbd5e1',
                    borderRadius: '4px',
                    fontSize: '10px',
                    fontWeight: '600',
                    cursor: lock ? 'not-allowed' : 'pointer',
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
            value={formData.inputs.An}
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

      {/* [E] 기준 계산값 (이론값, 자동 계산만 / 연노랑) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          padding: '8px 10px',
          backgroundColor: '#fff3bf',
          borderRadius: '6px',
          fontWeight: '700',
          fontSize: '13px',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          overflow: 'hidden',
          minHeight: '36px'
        }}
      >
        <span style={{ flex: '0 0 auto' }}>기준 계산값 :</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {substitutionDisplay.text}
        </span>
      </div>

      {/* [E-1] 5_half 전용 출발값 보정 (Sn = (CO_f - 50) * 0.5) */}
      {formData.system === '5_half_system' && snFor5Half && (() => {
        const { Sn, C4_f } = snFor5Half;
        const CO_f = Number(formData.inputs?.CO_f) || 0;
        const C3_r = Number(formData.inputs?.C3_r) || 0;
        const fmt = (n) => (n % 1 === 0 ? String(Math.round(n)) : String(Math.round(n * 10) / 10));
        return (
          <div
            style={{
              marginTop: '12px',
              padding: '12px 16px',
              backgroundColor: '#f0fdf4',
              borderRadius: '6px',
              border: '1px solid #bbf7d0',
              fontSize: '13px',
              lineHeight: '1.7',
              fontFamily: 'Consolas, Monaco, "Courier New", monospace',
              color: '#166534',
            }}
          >
            <div style={{ fontWeight: '700', fontSize: '16px', marginBottom: '10px' }}>
              최종 도착값 : {fmt(C4_f)}
            </div>
            <div>C4_f = C5_f = C6_f = C3_r_{fmt(C3_r)} + Sn_{fmt(Sn)} = C4_f_{fmt(C4_f)}</div>
            <div style={{ marginTop: '6px' }}>
              Sn = (CO_f_{fmt(CO_f)} - 50) × 0.5 = Sn_{fmt(Sn)}
            </div>
          </div>
        );
      })()}

      {/* [E] 물리 보정: 밀림 끌림 출발값 보정 스핀 한 줄 */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { key: 'slide', label: '밀림' },
          { key: 'draw', label: '끌림' },
          { key: 'departure', label: '출발값 보정' },
          { key: 'spin', label: '스핀' }
        ].map(({ key, label }) => {
          const isDeparture = key === 'departure';
          const displayValue = isDeparture && snFor5Half
            ? snFor5Half.Sn
            : formData.corrections[key];
          return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <label style={{ fontSize: '12px', minWidth: isDeparture ? '70px' : '32px' }}>{label}</label>
            <input
              type="number"
              step="0.5"
              value={displayValue}
              readOnly={isDeparture && !!snFor5Half}
              onChange={(e) => !(isDeparture && snFor5Half) && setFormData({
                ...formData,
                corrections: { ...formData.corrections, [key]: Number(e.target.value) }
              })}
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

      {/* [F] 최종 결과 (보정 입력변수 반영 후 재계산, 연초록 / 정수 표시) */}
      <div
        style={{
          padding: '8px 12px',
          backgroundColor: '#d3f9d8',
          borderRadius: '6px',
          fontWeight: '700',
          fontSize: '15px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          flexWrap: 'wrap',
          overflow: 'hidden'
        }}
      >
        <span style={{ flex: '0 0 auto' }}>최종 결과 :</span>
        {finalResultSubstitution != null ? (
          <span style={{ fontFamily: 'Consolas, Monaco, "Courier New", monospace', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {finalResultSubstitution}
          </span>
        ) : (
          <span style={{ color: '#64748b' }}>—</span>
        )}
      </div>

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: '10px', marginTop: '4px', paddingTop: '10px', borderTop: '1px solid #e2e8f0' }}>
        <button
          onClick={handleSave}
          style={{
            flex: 1,
            height: '36px',
            padding: '0 16px',
            backgroundColor: '#3b82f6',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer'
          }}
        >
          적용
        </button>
        <button
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
    </div>
  );
}

function HptOverlay({ data, onSave, onCancel }) {
  const [tempData, setTempData] = useState(data);
  const [lastChanged, setLastChanged] = useState(null); // 'x' or 'y'
  const [isClamped, setIsClamped] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

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
    { value: "-7/8", label: "좌측 7/8" }
  ];

  // ==========================================
  // 타점 입력 핸들러 (클램프 포함)
  // ==========================================
  const MAX_VALUE = 4.0;
  const CLAMP_RADIUS = 4.0; // 점선 원 = 입력값 4까지

  const handleHitPointChange = (axis, rawValue) => {
    // 1차 제한: ±4, 소수점 1자리
    let value = parseFloat(rawValue);
    if (isNaN(value)) value = 0;
    value = Math.max(-MAX_VALUE, Math.min(MAX_VALUE, value));
    value = Math.round(value * 10) / 10;

    const currentX = axis === 'x' ? value : (tempData.hit_point?.x ?? 0);
    const currentY = axis === 'y' ? value : (tempData.hit_point?.y ?? 0);

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

    setTempData({
      ...tempData,
      hit_point: { x: finalX, y: finalY }
    });
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
  const thicknessValue = Math.abs(thickness); // 0~8 (표기의 n)
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
    
    // 소수점 1자리로 반올림
    finalX = Math.round(finalX * 10) / 10;
    finalY = Math.round(finalY * 10) / 10;
    
    setTempData({
      ...tempData,
      hit_point: { x: finalX, y: finalY }
    });
  };

  return (
    <div style={{ color: '#334155', fontSize: '14px' }}>
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
          
          {/* 타점 마커 */}
          {(() => {
            const hitX = tempData.hit_point?.x ?? 0;
            const hitY = tempData.hit_point?.y ?? 0;
            
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

      {/* ========================================
          입력 필드
      ======================================== */}
      {/* T값 선택 */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
          두께 (Thickness)
        </label>
        <select
          value={tempData.T ?? "8/8"}
          onChange={(e) => setTempData({ ...tempData, T: e.target.value })}
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

      {/* 타점 X */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
          타점 X (Rg)
        </label>
        <input
          type="number"
          step="0.1"
          min="-4"
          max="4"
          value={tempData.hit_point?.x ?? 0}
          onChange={(e) => handleHitPointChange('x', e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      {/* 타점 Y */}
      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', marginBottom: '4px', fontWeight: '600' }}>
          타점 Y (Rg)
        </label>
        <input
          type="number"
          step="0.1"
          min="-4"
          max="4"
          value={tempData.hit_point?.y ?? 0}
          onChange={(e) => handleHitPointChange('y', e.target.value)}
          style={{
            width: '100%',
            padding: '8px',
            border: '1px solid #cbd5e1',
            borderRadius: '4px',
            fontSize: '14px'
          }}
        />
      </div>

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '24px' }}>
        <button
          onClick={() => onSave(tempData)}
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
    </div>
  );
}

function StrOverlay({ data, onSave, onCancel }) {
  const [tempData, setTempData] = useState({
    type: data?.type || 'medium_follow',
    acceleration: data?.acceleration || 'smooth_const',
    speed: data?.speed || 3.0,
    depth: data?.depth || 2.0,
    impact: data?.impact || 'medium'
  });

  // 스트로크 타입 옵션
  const STROKE_TYPES = [
    { value: 'long_follow', label: '롱 팔로우' },
    { value: 'medium_follow', label: '미디엄 팔로우' },
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
    { value: 'soft', label: 'Soft' },
    { value: 'medium', label: 'Medium' },
    { value: 'hard', label: 'Hard' },
    { value: 'sharp', label: 'Sharp' }
  ];

  return (
    <div style={{ color: '#334155', fontSize: '16px' }}>
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
          value={tempData.type}
          onChange={(e) => setTempData({ ...tempData, type: e.target.value })}
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
            <option key={opt.value} value={opt.value}>{opt.label}</option>
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
          onClick={() => onSave(tempData)}
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
    </div>
  );
}

function AiOverlay({ data, onSave, onCancel }) {
  // ==========================================
  // AI 코멘트 자동 생성
  // ==========================================
  
  // 타점 좌표 → 팁 표현 변환
  const formatHitPoint = (x, y) => {
    const parts = [];
    
    // X축
    if (x === 0) {
      parts.push('중앙');
    } else if (x > 0) {
      parts.push(`우측 ${Math.abs(x).toFixed(1)}팁`);
    } else {
      parts.push(`왼쪽 ${Math.abs(x).toFixed(1)}팁`);
    }
    
    // Y축
    if (y === 0) {
      parts.push('중단');
    } else if (y > 0) {
      parts.push(`상단 ${Math.abs(y).toFixed(1)}팁`);
    } else {
      parts.push(`하단 ${Math.abs(y).toFixed(1)}팁`);
    }
    
    // 중심 타점 특수 처리
    if (Math.abs(x) <= 0.3 && Math.abs(y) <= 0.3) {
      return '중심 타점';
    }
    
    return parts.join(', ');
  };

  // AI 코멘트 생성
  const generateAiComment = () => {
    const sys = data?.sys || {};
    const hpt = data?.hpt || {};
    const str = data?.str || {};
    
    // 기본값 처리
    const shotType = sys.shotType || '뒤돌리기';
    const system = sys.system || '5_half_system';
    const coBase = sys.coBase || 40;
    const c3Base = sys.c3Base || 20;
    
    const thickness = hpt.T || '8/8';
    const hitX = hpt.hit_point?.x || 0;
    const hitY = hpt.hit_point?.y || 0;
    const hitPointText = formatHitPoint(hitX, hitY);
    
    const strokeType = str.type || 'medium_follow';
    const acceleration = str.acceleration || 'smooth_const';
    const speed = str.speed || 3.0;
    const depth = str.depth || 2.0;
    
    // 스트로크 타입 한글 변환
    const strokeTypeMap = {
      'long_follow': '롱 팔로우',
      'medium_follow': '미디엄 팔로우',
      'through_shot': '관통 샷',
      'stop_shot': '스톱 샷',
      'short_shot': '숏 샷'
    };
    
    const accelPatternMap = {
      'smooth_accel': '부드러운 가속',
      'sharp_accel': '날카로운 가속',
      'smooth_const': '부드러운 등속',
      'intentional_decel': '의도적 감속'
    };
    
    const strokeTypeKr = strokeTypeMap[strokeType] || strokeType;
    const accelPatternKr = accelPatternMap[acceleration] || acceleration;
    
    // ① 플레이 전략
    let strategy = `💡 **플레이 전략**

`;
    
    // 타점 기반 해석
    if (Math.abs(hitX) > 2 || Math.abs(hitY) > 2) {
      strategy += '타점이 중심에서 벗어나 있어 회전을 적극 활용하는 구성입니다. ';
    } else if (Math.abs(hitX) <= 0.5 && Math.abs(hitY) <= 0.5) {
      strategy += '중심 타점으로 회전을 최소화하고 정확한 방향 전달을 목표로 합니다. ';
    } else {
      strategy += '적절한 타점 조절로 균형잡힌 회전을 활용하는 설정입니다. ';
    }
    
    // 스트로크 깊이 기반 해석
    if (depth >= 2.5) {
      strategy += '스트로크 깊이가 깊어 관통력을 강조한 설정입니다. ';
    } else if (depth <= 1.5) {
      strategy += '스트로크 깊이가 얕아 섬세한 터치를 의도한 설정입니다. ';
    }
    
    // 가속 패턴 기반 해석
    if (acceleration === 'smooth_const') {
      strategy += `${accelPatternKr}로 공의 움직임을 예측 가능하게 제어하려는 구성입니다.`;
    } else if (acceleration === 'sharp_accel') {
      strategy += `${accelPatternKr}로 빠른 힘 전달을 노린 설정입니다.`;
    } else if (acceleration === 'smooth_accel') {
      strategy += `${accelPatternKr}로 안정적인 힘 전달을 추구하는 설정입니다.`;
    } else {
      strategy += `${accelPatternKr}로 특수한 효과를 노린 설정입니다.`;
    }
    
    // ② 주의 사항
    let caution = `

⚠️ **주의 사항**

`;
    
    // 경고 조건 체크
    const needsWarning = speed > 3.0 || acceleration === 'sharp_accel';
    
    if (needsWarning) {
      if (speed > 3.0) {
        caution += `목표 속도가 ${speed.toFixed(1)}레일로 기준(3레일)을 초과합니다. `;
      }
      if (acceleration === 'sharp_accel') {
        caution += '날카로운 가속 패턴이 적용되어 있습니다. ';
      }
      caution += `쿠션에서의 회전 전달이 증가하여 공이 예상보다 길어질 수 있으니 스트로크 안정성에 특히 유의하세요.`;
    } else {
      caution += `현재 설정은 기준 속도(3레일) 내에서 안정적인 구성입니다. 설정한 시스템 값에 맞춰 쿠션 반응이 예측 가능할 것으로 보입니다.`;
    }
    
    return strategy + caution;
  };

  // 상태 관리: AI 텍스트 (초기값은 자동 생성)
  const [aiText, setAiText] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);

  // data 변경 시 AI 코멘트 재생성
  useEffect(() => {
    const newComment = generateAiComment();
    setAiText(newComment);
    setIsInitialized(true);
  }, [data]);

  return (
    <div style={{ color: '#334155', fontSize: '18px', maxWidth: '1200px' }}>
      <div style={{ marginBottom: '24px' }}>
        <textarea
          value={aiText}
          onChange={(e) => setAiText(e.target.value)}
          style={{
            width: '100%',
            minHeight: '420px',
            padding: '30px',
            border: '3px solid #cbd5e1',
            borderRadius: '12px',
            fontSize: '18px',
            fontFamily: 'inherit',
            backgroundColor: '#ffffff',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.6',
            color: '#374151',
            resize: 'vertical'
          }}
        />
      </div>

      {/* 버튼 */}
      <div style={{ display: 'flex', gap: '12px', marginTop: '36px' }}>
        <button
          onClick={() => onSave({ ...data, aiComment: aiText })}
          style={{
            flex: 1,
            padding: '18px',
            backgroundColor: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: '9px',
            fontWeight: '600',
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          적용
        </button>
        <button
          onClick={onCancel}
          style={{
            flex: 1,
            padding: '18px',
            backgroundColor: '#e2e8f0',
            color: '#334155',
            border: 'none',
            borderRadius: '9px',
            fontWeight: '600',
            fontSize: '18px',
            cursor: 'pointer'
          }}
        >
          취소
        </button>
      </div>
    </div>
  );
}


function TableGrid() {
  const lines = [];
  for (let i = 0; i <= TABLE_W_UNITS; i++) {
    lines.push(<line key={`v-${i}`} x1={i * SCALE + PADDING} y1={PADDING} x2={i * SCALE + PADDING} y2={TABLE_H + PADDING} stroke="#ffffff20" strokeWidth={0.4} />);
  }
  for (let i = 0; i <= TABLE_H_UNITS; i++) {
    lines.push(<line key={`h-${i}`} x1={PADDING} y1={i * SCALE + PADDING} x2={TABLE_W + PADDING} y2={i * SCALE + PADDING} stroke="#ffffff20" strokeWidth={0.4} />);
  }
  return <g>{lines}</g>;
}

function RailFrame() {
  const cushionW = CUSHION_RG * SCALE;
  const frameW = FRAME_RG * SCALE;
  const pointOffset = POINT_OFFSET_RG * SCALE;
  const outerRadius = 10; // 외곽 라운딩

  return (
    <g>
      {/* 프레임 전체 (단일 사각형, 외곽 라운딩) */}
      <rect
        x={PADDING - cushionW - frameW}
        y={PADDING - cushionW - frameW}
        width={TABLE_W + 2 * (cushionW + frameW)}
        height={TABLE_H + 2 * (cushionW + frameW)}
        fill="#6B3410"
        rx={outerRadius}
        ry={outerRadius}
      />

      {/* 쿠션 (진한 파란색) - 프레임 안쪽 전체 */}
      <rect
        x={PADDING - cushionW}
        y={PADDING - cushionW}
        width={TABLE_W + 2 * cushionW}
        height={TABLE_H + 2 * cushionW}
        fill="#1e40af"
      />

      {/* 당구대 (파란색) */}
      <rect
        x={PADDING}
        y={PADDING}
        width={TABLE_W}
        height={TABLE_H}
        fill="#2563eb"
      />

      {/* 포인트 (흰색) */}
      {[0, 10, 20, 30, 40, 50, 60, 70, 80].map((x) => (
        <React.Fragment key={`px-${x}`}>
          <circle cx={x * SCALE + PADDING} cy={TABLE_H + PADDING + pointOffset} r={3} fill="#fff" />
          <circle cx={x * SCALE + PADDING} cy={PADDING - pointOffset} r={3} fill="#fff" />
        </React.Fragment>
      ))}
      {[0, 10, 20, 30, 40].map((y) => (
        <React.Fragment key={`py-${y}`}>
          <circle cx={PADDING - pointOffset} cy={(TABLE_H_UNITS - y) * SCALE + PADDING} r={3} fill="#fff" />
          <circle cx={TABLE_W + PADDING + pointOffset} cy={(TABLE_H_UNITS - y) * SCALE + PADDING} r={3} fill="#fff" />
        </React.Fragment>
      ))}
    </g>
  );
}

function SystemValueLabels({ railGroups }) {
  return (
    <g>
      {railGroups.BOTTOM.map(({ mark, x, sys }, i) => (
        <text 
          key={`b-${i}`} 
          x={x * SCALE + PADDING} 
          y={TABLE_H + PADDING + 45} 
          fontSize={13} 
          fontWeight="bold"
          fill="#fff" 
          textAnchor="middle"
        >
          {mark}: {sys}
        </text>
      ))}
      {railGroups.TOP.map(({ mark, x, sys }, i) => (
        <text 
          key={`t-${i}`} 
          x={x * SCALE + PADDING} 
          y={PADDING - 35} 
          fontSize={13} 
          fontWeight="bold"
          fill="#fff" 
          textAnchor="middle"
        >
          {mark}: {sys}
        </text>
      ))}
      {railGroups.LEFT.map(({ mark, y, sys }, i) => (
        <text 
          key={`l-${i}`} 
          x={PADDING - 45} 
          y={TABLE_H - y * SCALE + PADDING + 3} 
          fontSize={13} 
          fontWeight="bold"
          fill="#fff" 
          textAnchor="end"
        >
          {mark}: {sys}
        </text>
      ))}
      {railGroups.RIGHT.map(({ mark, y, sys }, i) => (
        <text 
          key={`r-${i}`} 
          x={TABLE_W + PADDING + 45} 
          y={TABLE_H - y * SCALE + PADDING + 3} 
          fontSize={13} 
          fontWeight="bold"
          fill="#fff" 
          textAnchor="start"
        >
          {mark}: {sys}
        </text>
      ))}
    </g>
  );
}

// ============================================
// Phase B-1 Step 1: MobileWrapper (완전 투명)
// ============================================

export default function App({ currentButtonId }) {
  const [currentId, setCurrentId] = useState(SHOTS[0].id);
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overlayContent, setOverlayContent] = useState(null);
  
  // ============================================
  // ShotSlots & TrajectoryState 훅 연결
  // ============================================
  const { shotEditor, actions } = useShotSlots();
  const trajectory = useTrajectoryState();
  
  // ============================================
  // 관리자 모드 상태 (v0)
  // ============================================
  const [appMode, setAppMode] = useState("USER"); // "USER" | "ADMIN"
  
  const [adminState, setAdminState] = useState({
    sys: {
      system_id: null,
      CO: null,
      C3: null,
      corrections: {
        push: 0,
        pull: 0,
        start: 0
      }
    },
    hpt: {
      T: "8/8",  // ⚠️ SSOT - 두께·방향의 유일한 기준
      hit_point: { x: 0, y: 0 }  // ⚠️ Rg 좌표계 (타점)
    },
    str: {
      curve: "constant",
      type: "standard",
      speed: 5
    },
    ai: {
      text: ""
    },
    balls: {
      cue: { x: 10, y: 10 },
      target: { x: 50, y: 25 },
      second: { x: 40, y: 20 }
    }
  });

  const [overlayState, setOverlayState] = useState({
    open: false,
    type: null // "SYS" | "HPT" | "STR" | "AI" | null
  });
  
  // ============================================
  // ImpactBall 모드 상태
  // ============================================
  const [impactMode, setImpactMode] = useState("CONTACT");
  // "CONTACT": 타겟볼 접선 고정 (기본)
  // "FREE": 자유 이동 (더블클릭 후)
  
  // ============================================
  // USER MODE 코칭 표시 상태
  // ============================================
  const [showCoaching, setShowCoaching] = useState(false);
  // false: 배치만 표시 (임펙트볼/가이드 비표시)
  // true: 코칭 결과 표시 (임펙트볼/가이드 표시)
  
  // Ball drag state
  const [ballsState, setBallsState] = useState(null);
  const [dragState, setDragState] = useState({
  // dragging: pointer capture 동안만 true (Freeze 적용 구간)
  dragging: false,
  ballId: null,
  grabOffsetRg: { x: 0, y: 0 },
  previousPosRg: null,

  // joystickVisible: 선택 상태(미세조정 모드) 유지
  joystickVisible: false,

  // Freeze slots (드래그 중 파생 객체 고정)
  frozenImpact: null,
  frozenCushionPathAttr: null,
});
  const svgRef = useRef(null);
  const derivedRef = useRef({ impact: null, cushionPathAttr: null });

  // Joystick (mobile fine control)
  const joyIntervalRef = useRef(null);
  const joyDragRef = useRef({ active: false, pointerId: null, lastX: 0, lastY: 0, ballId: null });
  const JOYSTICK_STEP = 0.1; // Rg
  const JOYSTICK_REPEAT_MS = 60;

  // ============================================
  // 관리자 모드 헬퍼 함수
  // ============================================
  
  // 권한 체크
  const canEdit = appMode === "ADMIN";

  // 오버레이 열기 (가드 로직 포함)
  function openOverlay(type) {
    // 드래그 중이면 강제 종료
    if (dragState.dragging) {
      handlePointerUp({ pointerId: null });
    }
    
    // 조이스틱 숨김
    setDragState(prev => ({ ...prev, joystickVisible: false }));
    
    setOverlayState({ open: true, type });
  }

  // 오버레이 닫기
  function closeOverlay() {
    setOverlayState({ open: false, type: null });
  }

  // ⭐ 핵심: 버튼 클릭 → Overlay 여는 함수
  function handleSelectAdminButton(buttonId) {
    if (appMode !== "ADMIN") return;

    if (!ADMIN_BUTTONS.includes(buttonId)) return;

    // 드래그 중이면 강제 종료
    if (dragState.dragging) {
      handlePointerUp({ pointerId: null });
    }
    
    // 조이스틱 숨김
    setDragState(prev => ({ ...prev, joystickVisible: false }));
    
    setOverlayState({
      open: true,
      type: buttonId
    });
  }

  // Admin Mode 토글 함수
  function handleToggleAdminMode() {
    setAppMode((prev) => {
      const nextMode = prev === "ADMIN" ? "USER" : "ADMIN";
      
      // ADMIN 모드 진입 시 항상 코칭 표시 상태로 설정
      if (nextMode === "ADMIN") {
        setShowCoaching(true);
      }
      
      return nextMode;
    });
    setOverlayState({ open: false, type: null });
  }

  // SAVE 핸들러
  function handleSave() {
    if (!adminState.sys.system_id) {
      alert("시스템을 선택하세요");
      return;
    }

    const record = {
      timestamp: Date.now(),
      mode: "ADMIN",
      system_id: adminState.sys.system_id,
      balls: adminState.balls,
      sys_input: adminState.sys,
      hpt_input: adminState.hpt,
      str_input: adminState.str,
      ai_text: adminState.ai.text
    };

    console.log("💾 SAVED:", record);
    alert("저장 완료");
  }

  function nudgeBall(ballId, dx, dy) {
    if (!ballId) return;
    setBallsState((prev) => {
      const cur = prev?.[ballId];
      if (!cur) return prev;
      
      // ⭐ impact는 FREE 모드일 때 쿠션 근처까지 허용
      let minX = 0.5;
      let maxX = 79.5;
      let minY = 0.5;
      let maxY = 39.5;
      
      if (ballId === "impact" && impactMode === "FREE") {
        minX = -CUSHION_RG;
        maxX = 80 + CUSHION_RG;
        minY = -CUSHION_RG;
        maxY = 40 + CUSHION_RG;
      }
      
      const next = {
        x: clamp(cur.x + dx, minX, maxX),
        y: clamp(cur.y + dy, minY, maxY),
      };
      return { ...prev, [ballId]: next };
    });
  }

  function startJoystick(direction) {
    const id = dragState.ballId;
    if (!id) return;
    const delta = {
      up: { dx: 0, dy: JOYSTICK_STEP },
      down: { dx: 0, dy: -JOYSTICK_STEP },
      left: { dx: -JOYSTICK_STEP, dy: 0 },
      right: { dx: JOYSTICK_STEP, dy: 0 },
    }[direction];
    if (!delta) return;
    // single nudge immediately
    nudgeBall(id, delta.dx, delta.dy);
    // repeat while pressed
    stopJoystick();
    joyIntervalRef.current = window.setInterval(() => {
      nudgeBall(id, delta.dx, delta.dy);
    }, JOYSTICK_REPEAT_MS);
  }

  function stopJoystick() {
    if (joyIntervalRef.current != null) {
      window.clearInterval(joyIntervalRef.current);
      joyIntervalRef.current = null;
    }
  }


// Drag-pad Joystick handlers (mobile friendly)
function handleJoyPadPointerDown(e) {
  // joysticks should never trigger table pointer logic
  e.preventDefault();
  e.stopPropagation();
  if (!dragState.joystickVisible || !dragState.ballId) return;

  // stop any legacy repeat mode
  stopJoystick();

  joyDragRef.current = {
    active: true,
    pointerId: e.pointerId,
    lastX: e.clientX,
    lastY: e.clientY,
    ballId: dragState.ballId,
  };

  try {
    e.currentTarget.setPointerCapture(e.pointerId);
  } catch {}
}

function handleJoyPadPointerMove(e) {
  if (!joyDragRef.current.active) return;
  if (joyDragRef.current.pointerId !== e.pointerId) return;

  e.preventDefault();
  e.stopPropagation();

  const dxPx = e.clientX - joyDragRef.current.lastX;
  const dyPx = e.clientY - joyDragRef.current.lastY;

  joyDragRef.current.lastX = e.clientX;
  joyDragRef.current.lastY = e.clientY;

  // px -> Rg (SVG y is inverted in toPx/toRg)
  const dxRg = dxPx / SCALE;
  const dyRg = -dyPx / SCALE;

  const ballId = joyDragRef.current.ballId;
  if (!ballId) return;

  // small deadzone to avoid micro jitter
  if (Math.abs(dxRg) + Math.abs(dyRg) < 0.005) return;

  setBallsState((prev) => {
    const cur = prev?.[ballId];
    if (!cur) return prev;

    const next = {
      x: clamp(cur.x + dxRg, 0.5, 79.5),
      y: clamp(cur.y + dyRg, 0.5, 39.5),
    };
    return { ...prev, [ballId]: next };
  });
}

function handleJoyPadPointerUp(e) {
  if (!joyDragRef.current.active) return;
  if (joyDragRef.current.pointerId !== e.pointerId) return;

  e.preventDefault();
  e.stopPropagation();

  joyDragRef.current.active = false;
  joyDragRef.current.pointerId = null;

  try {
    e.currentTarget.releasePointerCapture(e.pointerId);
  } catch {}
}

function handleJoyPadPointerCancel(e) {
  handleJoyPadPointerUp(e);
}
  // ============================================
  // currentButtonId 처리 (USER 모드 오버레이)
  // ============================================
  useEffect(() => {
    // ✅ ADMIN 모드에서는 기존(USER) overlayContent 흐름을 막는다
    if (appMode === "ADMIN") return;
    
    if (!currentButtonId) return;

    // 코칭 버튼 처리
    if (currentButtonId === "COACH") {
      setShowCoaching(true);
      console.log("🎯 코칭 버튼 클릭 감지");
    }
    else if (currentButtonId === "SYS") setOverlayContent("SYS");
    else if (currentButtonId === "HP/T") setOverlayContent("HPT");
    else if (currentButtonId === "STR") setOverlayContent("STR");
    else if (currentButtonId === "AI") setOverlayContent("AI");
    else setOverlayContent(null);
  }, [currentButtonId, appMode]);

  // ============================================
  // currentButtonId 처리 (ADMIN 모드 오버레이)
  // ============================================
  // ✅ ADMIN 모드에서 SYS/HP/T/STR/AI 버튼 클릭 → 관리자 오버레이(openOverlay)로 연결
  useEffect(() => {
    if (appMode !== "ADMIN") return;
    if (!currentButtonId) return;

    if (currentButtonId === "SYS") openOverlay("SYS");
    else if (currentButtonId === "HP/T") openOverlay("HPT");
    else if (currentButtonId === "STR") openOverlay("STR");
    else if (currentButtonId === "AI") openOverlay("AI");
  }, [currentButtonId, appMode]);

  // ============================================
  // S1/S2/S3 시나리오 전환
  // ============================================
  useEffect(() => {
    if (currentButtonId === 'S1') {
      setOverlayContent(null);
      setOverlayState({ open: false, type: null });
      setCurrentId(SHOTS[0].id);
    }
    else if (currentButtonId === 'S2') {
      setOverlayContent(null);
      setOverlayState({ open: false, type: null });
      setCurrentId(SHOTS[1].id);
    }
    else if (currentButtonId === 'S3') {
      setOverlayContent(null);
      setOverlayState({ open: false, type: null });
      setCurrentId(SHOTS[2].id);
    }
  }, [currentButtonId]);

  useEffect(() => {
    const shot = SHOTS.find((s) => s.id === currentId);
    if (!shot) {
      setError("샷을 찾을 수 없습니다.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const basePath = "/samples/5_half_system";

    const url = shot.file === "canonical.json"
      ? `${basePath}/B2T_R/canonical.json`
      : `${basePath}/${shot.file}`;
    
       
    fetch(url)
    
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("✅ 로드:", shot.file);
        setView(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ 오류:", err);
        setError(err.message);
        setLoading(false);
      });
  }, [currentId]);

  // ballsState 초기화
  useEffect(() => {
    if (view && view.ui && view.ui.balls) {
      setBallsState(view.ui.balls);
    }
  }, [view]);

  // ============================================
  // 키보드 단축키 (관리자 모드)
  // ============================================
  useEffect(() => {
    function handleKeyDown(e) {
      // ✅ 조건 3: input/textarea 포커스 시 동작 금지
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      
      // Ctrl+Shift+A: 관리자 모드 토글
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setAppMode(prev => {
          const nextMode = prev === "USER" ? "ADMIN" : "USER";
          
          // ADMIN 모드 진입 시 항상 코칭 표시 상태로 설정
          if (nextMode === "ADMIN") {
            setShowCoaching(true);
          }
          
          console.log("🔑 모드 전환:", nextMode);
          return nextMode;
        });
      }
      
      // ESC: 오버레이 닫기
      if (e.key === "Escape" && overlayState.open) {
        closeOverlay();
      }
    }
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [appMode, overlayState.open]);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#334155' }}>
        로딩 중...
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ padding: 16, color: '#b91c1c', fontFamily: 'monospace' }}>
        오류: {String(error)}
      </div>
    );
  }
  if (!view || !view.ui) {
    return (
      <div style={{ padding: 16, color: '#334155' }}>
        데이터가 없습니다.
      </div>
    );
  }

  const ui = view.ui;
  const balls = ballsState ?? (ui.balls || {});
  
  // 자동 분리 알고리즘
  function autoSeparate(draggedBall, otherBalls, maxIterations = 3) {
    const MIN_DISTANCE = BALL_DIAMETER_RG;
    
    for (let iter = 0; iter < maxIterations; iter++) {
      let hasOverlap = false;
      
      otherBalls.forEach(other => {
        const dx = draggedBall.x - other.x;
        const dy = draggedBall.y - other.y;
        const dist = Math.hypot(dx, dy);
        
        if (dist < MIN_DISTANCE) {
          hasOverlap = true;
          
          // dist=0 가드 (1e-3만큼만 이동)
          if (dist < 1e-6) {
            draggedBall.x += 1e-3;
          } else {
            const overlap = MIN_DISTANCE - dist;
            const angle = Math.atan2(dy, dx);
            draggedBall.x += Math.cos(angle) * overlap;
            draggedBall.y += Math.sin(angle) * overlap;
          }
        }
      });
      
      draggedBall.x = clamp(draggedBall.x, 0.5, 79.5);
      draggedBall.y = clamp(draggedBall.y, 0.5, 39.5);
      
      if (!hasOverlap) return true;
    }
    
    return false;
  }
  
  // 드래그 핸들러
// 드래그/선택 핸들러
function handlePointerDown(e) {
  // ✅ GUARD: 오버레이 열려있으면 SVG 이벤트 차단
  if (overlayState.open) return;

  // ✅ Rule: joystick closes ONLY when user taps OUTSIDE the joystick.
  // - tap inside joystick: ignore (do not change selection)
  // - tap outside joystick: close joystick immediately and return
  if (dragState.joystickVisible) {
    const inJoy = e.target?.closest?.('[data-joystick="1"]');
    if (inJoy) return;

    stopJoystick();
    // cancel any ongoing joystick drag
    joyDragRef.current = { active: false, pointerId: null, lastX: 0, lastY: 0, ballId: null };

    setDragState((s) => ({
      ...s,
      dragging: false,
      ballId: null,
      grabOffsetRg: { x: 0, y: 0 },
      previousPosRg: null,
      joystickVisible: false,
      frozenImpact: null,
      frozenCushionPathAttr: null,
    }));
    return;
  }

  if (overlayContent) return; // 오버레이 활성 시 비활성화
  if (!svgRef.current) return;

  const pointerRg = pointerToRg(e, svgRef.current);
  if (!pointerRg) return;

  // hit-test: 선택 반경 1.35배 (UX 개선)
  const PICK_RADIUS_RG = BALL_RADIUS_RG * 1.35;
  let closestBall = null;
  let minDist = Infinity;

  for (const [ballId, ballPos] of Object.entries(balls)) {
    if (!ballPos) continue;
    
    // ⭐ impact 드래그 조건
    if (ballId === "impact") {
      // USER 모드: 임펙트볼 드래그 완전 금지
      if (appMode === "USER") continue;
      // ADMIN 모드: FREE 모드일 때만 드래그 가능
      if (impactMode !== "FREE") continue;
    }
    
    const dx = pointerRg.x - ballPos.x;
    const dy = pointerRg.y - ballPos.y;
    const dist = Math.hypot(dx, dy);

    if (dist <= PICK_RADIUS_RG && dist < minDist) {
      minDist = dist;
      closestBall = { id: ballId, pos: ballPos };
    }
  }

  // 🔴 공을 못 잡았을 때
  if (!closestBall) {
    // ❗ 조이스틱이 떠 있어도 여기서는 닫지 않음
    // (전용 닫기 영역에서만 닫도록 별도 처리)
    return;
  }

  // ✅ 공을 다시 터치한 경우 → 조이스틱 재설정
  const grabOffset = {
    x: pointerRg.x - closestBall.pos.x,
    y: pointerRg.y - closestBall.pos.y,
  };

  setDragState((s) => ({
    ...s,
    dragging: true,
    ballId: closestBall.id,
    grabOffsetRg: grabOffset,
    previousPosRg: { ...closestBall.pos },
    joystickVisible: true,

    // Freeze: 드래그 시작 시점의 파생 결과 저장
    frozenImpact: derivedRef.current.impact,
    frozenCushionPathAttr: derivedRef.current.cushionPathAttr,
  }));

  svgRef.current.setPointerCapture(e.pointerId);
}

function handlePointerMove(e) {
  // ✅ GUARD: 오버레이 열려있으면 SVG 이벤트 차단
  if (overlayState.open) return;
  
  if (!dragState.dragging || !dragState.ballId || !svgRef.current) return;

  const pointerRg = pointerToRg(e, svgRef.current);
  if (!pointerRg) return;

  // ⭐ impact는 FREE 모드일 때 쿠션 근처까지 허용
  let minX = 0.5;
  let maxX = 79.5;
  let minY = 0.5;
  let maxY = 39.5;
  
  if (dragState.ballId === "impact" && impactMode === "FREE") {
    minX = -CUSHION_RG;
    maxX = 80 + CUSHION_RG;
    minY = -CUSHION_RG;
    maxY = 40 + CUSHION_RG;
  }

  const newRg = {
    x: clamp(pointerRg.x - dragState.grabOffsetRg.x, minX, maxX),
    y: clamp(pointerRg.y - dragState.grabOffsetRg.y, minY, maxY),
  };

  setBallsState((prev) => ({
    ...prev,
    [dragState.ballId]: newRg,
  }));
}

function handlePointerUp(e) {
  // ✅ GUARD: 오버레이 열려있으면 SVG 이벤트 차단
  if (overlayState.open) return;
  
  if (!dragState.dragging || !dragState.ballId) return;
  stopJoystick();

  const draggedBall = { ...balls[dragState.ballId] };
  const otherBalls = Object.entries(balls)
    .filter(([id]) => id !== dragState.ballId)
    .map(([, pos]) => pos);

  const success = autoSeparate(draggedBall, otherBalls);

  if (success) {
    setBallsState((prev) => ({
      ...prev,
      [dragState.ballId]: draggedBall,
    }));
  } else if (dragState.previousPosRg) {
    setBallsState((prev) => ({
      ...prev,
      [dragState.ballId]: dragState.previousPosRg,
    }));
  }

  // 드래그는 종료하되, 선택/조이스틱은 유지 (바깥 탭으로 닫기)
  setDragState((s) => ({
    ...s,
    dragging: false,
    grabOffsetRg: { x: 0, y: 0 },
    previousPosRg: null,
    frozenImpact: null,
    frozenCushionPathAttr: null,
  }));

  if (svgRef.current) {
    try {
      svgRef.current.releasePointerCapture(e.pointerId);
    } catch {}
  }
}

function handlePointerCancel(e) {
  stopJoystick();
  // cancel은 드래그 종료로 처리
  handlePointerUp(e);
}

  const rawAnchors = ui.anchors || {};
  const system = ui.system || { values: {}, human_readable: {} };
  const opts = ui.display_options || {};
  const strategy = ui.strategy || [];

  // canonical 처리 (안전하게)
  let canonical = view.track || null;
  if (!canonical) {
    const shot = SHOTS.find((s) => s.id === currentId);
    if (shot && shot.file && shot.file.includes("/")) {
      canonical = shot.file.split("/")[0];
    }
  }

  let anchors = rawAnchors;
  
  // 변환 필수 데이터 확인
  const hasConversionData = 
    canonical && 
    canonical !== "canonical" &&
    system.values &&
    typeof system.values.offset_fg2rg === "number";
  
  if (hasConversionData) {
    try {
      anchors = convertCanonicalAnchors(rawAnchors, canonical);
    } catch (e) {
      console.warn("좌표 변환 실패, 원본 사용:", e);
    }
  } else {
    if (!canonical) {
      console.warn("canonical 정보 없음, 좌표 변환 스킵");
    } else if (!system.values || typeof system.values.offset_fg2rg !== "number") {
      console.warn("system.values.offset_fg2rg 없음, 좌표 변환 스킵");
    }
  }

  // ⚠️ convertCanonicalAnchors가 이미 Fg → Rg 변환을 함!
  // 따라서 anchors.CO, anchors["1C"]는 Rg 좌표
  // determineRotation에는 원본 Fg 좌표가 필요
  
  const CO_rg_converted = anchors.CO;      // 이미 Rg
  const C1_rg_converted = anchors["1C"];   // 이미 Rg
  
  // 원본 Fg 좌표 복원
  const CO_fg = rawAnchors.CO;             // 원본 Fg
  const C1_fg = rawAnchors["1C"];          // 원본 Fg
  
  // ✅ CO-1C 선과 레일 날선 교점 계산
  let CO_rail = CO_fg;
  let C1_rail = C1_fg;
  
  if (CO_fg && C1_fg) {
    const dx = C1_fg.x - CO_fg.x;
    const dy = C1_fg.y - CO_fg.y;
    
    if (Math.abs(dy) > 0.01) {
      const m = dy / dx;
      const b = CO_fg.y - m * CO_fg.x;
      
      // B2T: CO=BOTTOM, 1C=TOP
      if (Math.abs(CO_fg.y - (-2.25)) < 0.5) {
        const x_bottom = (0 - b) / m;
        CO_rail = { x: x_bottom, y: 0 };
      }
      
      if (Math.abs(C1_fg.y - 42.25) < 0.5) {
        const x_top = (40 - b) / m;
        C1_rail = { x: x_top, y: 40 };
      }
      
      // T2B: CO=TOP, 1C=BOTTOM
      if (Math.abs(CO_fg.y - 42.25) < 0.5) {
        const x_top = (40 - b) / m;
        CO_rail = { x: x_top, y: 40 };
      }
      
      if (Math.abs(C1_fg.y - (-2.25)) < 0.5) {
        const x_bottom = (0 - b) / m;
        C1_rail = { x: x_bottom, y: 0 };
      }
    }
  }
  
  const C2 = anchors["2C"];
  const C3 = anchors["3C"];
  const C4 = anchors["4C"];
  const C5 = anchors["5C"];
  const C6 = anchors["6C"];

  const impactRaw = calculateImpact(balls.cue, balls.target_center, CO_fg, C1_fg, opts.thickness || "1/2", view.pattern || "뒤돌리기");
  const impact = dragState.dragging ? dragState.frozenImpact : impactRaw;

  // CO→1C 선은 레일 교점 사용
  const CO_line = CO_rail;
  const C1_line = C1_rail;
  
  console.log("🔷 레일 교점:", {
    "CO_fg (원본)": CO_fg,
    "C1_fg (원본)": C1_fg,
    "CO_rail (교점)": CO_rail,
    "C1_rail (교점)": C1_rail
  });

  let lastAnchor = null;
  if (view.last_cushion === "4C") lastAnchor = C4;
  if (view.last_cushion === "5C") lastAnchor = C5;
  if (view.last_cushion === "6C") lastAnchor = C6;

  const cushionPath = [C1_rail, C2, C3, lastAnchor].filter(Boolean);
  const cushionPathAttrRaw = cushionPath.map((pt) => {
    const p = toPx(pt);
    return `${p.x + PADDING},${p.y + PADDING}`;
  }).join(" ");
  // 최신 파생 결과를 ref에 보관 (pointerdown에서 Freeze 캡처용)
  derivedRef.current = { impact: impactRaw, cushionPathAttr: cushionPathAttrRaw };

  const cushionPathAttr = dragState.dragging ? (dragState.frozenCushionPathAttr || cushionPathAttrRaw) : cushionPathAttrRaw;

  const orderedKeys = ["CO", "1C", "2C", "3C", "4C", "5C", "6C"];
  const lastIndex = orderedKeys.indexOf(view.last_cushion);
  const visibleKeys = lastIndex >= 0 ? orderedKeys.slice(0, lastIndex + 1) : orderedKeys;

  const allAnchors = { 
    CO: { coord: CO_rail, isFg: false },   // 레일 교점 (Rg)
    "1C": { coord: C1_rail, isFg: false }, // 레일 교점 (Rg)
    "2C": { coord: C2, isFg: false }, 
    "3C": { coord: C3, isFg: false }, 
    "4C": { coord: C4, isFg: false }, 
    "5C": { coord: C5, isFg: false }, 
    "6C": { coord: C6, isFg: false } 
  };
  const railGroups = groupSystemValuesByRail(anchors, system.values || {}, view.last_cushion);

  // ✅ 정보 버튼 클릭 핸들러 (토글 + 즉시 전환)

  const tableSVG = (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${TABLE_W + 2 * PADDING} ${TABLE_H + 2 * PADDING}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      style={{ touchAction: "none" }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
    >
      <RailFrame />
      <TableGrid />
      {Object.entries(allAnchors).map(([label, data]) => data.coord && <AnchorPoint key={label} label={label} x={data.coord.x} y={data.coord.y} isFg={data.isFg} systemValues={system.values} />)}
      {CO_line && C1_line && <line x1={toPx(CO_line).x + PADDING} y1={toPx(CO_line).y + PADDING} x2={toPx(C1_line).x + PADDING} y2={toPx(C1_line).y + PADDING} stroke="#fb923c" strokeWidth={2} />}
      {cushionPath.length > 1 && <polyline points={cushionPathAttr} stroke="#ef4444" strokeWidth={2} fill="none" />}
      
      {/* 큐 → 임팩트 점선 (calcImpactBall 기반 통일) */}
      {(() => {
        // ✅ USER MODE 코칭 버튼 누르기 전: 가이드 라인 비표시
        if (appMode === "USER" && !showCoaching) return null;
        
        // T값 결정 (모드별 출처만 다름)
        const T = canEdit 
          ? adminState.hpt.T 
          : (view.ui?.hpt?.T || "8/8");
        
        // ============================================
        // ✅ 수정: impactMode에 따라 올바른 좌표 사용
        // ============================================
        let impactBall;
        
        if (impactMode === "CONTACT") {
          // 접선 고정 모드: calcImpactBall 사용
          impactBall = calcImpactBall(balls.cue, balls.target_center, T);
        } else {
          // 자유 이동 모드: ballsState.impact 사용
          if (balls.impact) {
            impactBall = balls.impact;
          } else {
            // impact가 없으면 초기값으로 calcImpactBall 결과 사용
            impactBall = calcImpactBall(balls.cue, balls.target_center, T);
          }
        }
        
        if (!balls.cue || !impactBall) return null;
        
        const cuePx = toPx(balls.cue);
        const impactPx = toPx(impactBall);
        
        // 큐 → 임팩트 점선 (항상 현재 ImpactBall 중심 기준)
        return (
          <line
            x1={cuePx.x + PADDING}
            y1={cuePx.y + PADDING}
            x2={impactPx.x + PADDING}
            y2={impactPx.y + PADDING}
            stroke="#e5e7eb"
            strokeDasharray="4 3"
            strokeWidth={2}
            pointerEvents="none"
          />
        );
      })()}
      
      {balls.cue && <Ball {...balls.cue} color="#ffffff" />}
      {balls.target_center && <Ball {...balls.target_center} color="#fde047" />}
      {balls.second && <Ball {...balls.second} color="#f87171" />}
      {dragState.joystickVisible && dragState.ballId && balls[dragState.ballId] && (() => {
  const bp = balls[dragState.ballId];

  // Joystick position: 10 Rg toward table center (clamped inside table)
  const CENTER = { x: 40, y: 20 };
  let dx = CENTER.x - bp.x;
  let dy = CENTER.y - bp.y;
  let len = Math.hypot(dx, dy);

  if (len < 1e-6) {
    dx = 0;
    dy = -1;
    len = 1;
  }

  const ux = dx / len;
  const uy = dy / len;

  const jx = clamp(bp.x + ux * 10, 3, 77);
  const jy = clamp(bp.y + uy * 10, 3, 37);

  const jp = toPx({ x: jx, y: jy });
  const cx = jp.x + PADDING;
  const cy = jp.y + PADDING;

  // Mobile-friendly sizes (px in SVG viewBox units)
  const BASE_R = 52;   // bigger hit area
  const KNOB_R = 22;

  return (
    <g
      data-joystick="1"
      style={{ pointerEvents: "all", cursor: "grab" }}
      onPointerDown={handleJoyPadPointerDown}
      onPointerMove={handleJoyPadPointerMove}
      onPointerUp={handleJoyPadPointerUp}
      onPointerCancel={handleJoyPadPointerCancel}
    >
      {/* base */}
      <circle cx={cx} cy={cy} r={BASE_R} fill="rgba(15,23,42,0.55)" />
      <circle cx={cx} cy={cy} r={BASE_R - 6} fill="rgba(255,255,255,0.10)" />
      {/* knob (static visual; movement is via drag vector) */}
      <circle cx={cx} cy={cy} r={KNOB_R} fill="rgba(255,255,255,0.85)" />
      <circle cx={cx} cy={cy} r={KNOB_R - 6} fill="rgba(15,23,42,0.35)" />
    </g>
  );
})()}

      {/* ImpactBall (USER/ADMIN 공통, T값 기반) */}
      {(() => {
        // ✅ USER MODE 코칭 버튼 누르기 전: 임펙트볼 비표시
        if (appMode === "USER" && !showCoaching) return null;
        
        // T값 결정 (모드별 소스만 다름)
        const T = canEdit 
          ? adminState.hpt.T 
          : (view.ui?.hpt?.T || "8/8");
        
        // ============================================
        // ImpactBall 위치 결정 (모드별 분기)
        // ============================================
        let impactBall;
        
        if (impactMode === "CONTACT") {
          // 접선 고정 모드: calcImpactBall 사용
          impactBall = calcImpactBall(balls.cue, balls.target_center, T);
        } else {
          // 자유 이동 모드: ballsState.impact 사용
          if (balls.impact) {
            impactBall = balls.impact;
          } else {
            // impact가 없으면 초기값으로 calcImpactBall 결과 사용
            impactBall = calcImpactBall(balls.cue, balls.target_center, T);
          }
        }
        
        if (!impactBall) return null;
        
        // ADMIN: 초록색, USER: 흰색 (시각적 구분만)
        const color = canEdit ? "#00ff00" : "#ffffff";
        const opacity = canEdit ? 0.7 : 0.55;
        
        return (
          <Ball 
            x={impactBall.x} 
            y={impactBall.y} 
            color={color} 
            opacity={opacity}
            onDoubleClick={appMode === "ADMIN" ? (e) => {
              e.stopPropagation();
              console.log("🎯🎯 ImpactBall 더블클릭! 현재 모드:", impactMode);
              
              // 모드 토글
              setImpactMode((prev) => {
                const nextMode = prev === "CONTACT" ? "FREE" : "CONTACT";
                console.log("✅ 모드 전환:", prev, "→", nextMode);
                
                // CONTACT → FREE 전환 시: 현재 calcImpactBall 결과를 저장
                if (nextMode === "FREE") {
                  const currentImpact = calcImpactBall(balls.cue, balls.target_center, T);
                  if (currentImpact) {
                    console.log("💾 impact 저장:", currentImpact);
                    setBallsState((prev) => ({
                      ...prev,
                      impact: currentImpact
                    }));
                  }
                }
                
                return nextMode;
              });
            } : undefined}
            style={{ cursor: appMode === "ADMIN" ? "pointer" : "default" }}
          />
        );
      })()}
     </svg>
  );

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {tableSVG}
      
      {/* 관리자 모드 토글 버튼 (ADMIN 모드에서만 표시) */}
      {appMode === "ADMIN" && (
        <button
          onClick={handleToggleAdminMode}
          style={{
            position: 'absolute',
            top: '10px',
            right: '10px',
            padding: '6px 12px',
            backgroundColor: 'rgba(239, 68, 68, 0.9)',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            fontSize: '12px',
            fontWeight: 'bold',
            cursor: 'pointer',
            zIndex: 100
          }}
        >
          🔧 ADMIN MODE
        </button>
      )}

      {/* SAVE 버튼 (관리자 전용) */}
      {canEdit && (
        <button
          onClick={handleSave}
          style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            padding: '12px 24px',
            backgroundColor: '#10b981',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '16px',
            fontWeight: 'bold',
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            zIndex: 100
          }}
        >
          💾 SAVE
        </button>
      )}

      {/* 관리자 모드 오버레이 */}
      {overlayState.open && (
        <div
          onClick={closeOverlay}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '16px',
              padding: '40px',
              minWidth: '700px',
              width: '750px',
              maxWidth: '90%',
              maxHeight: '80%',
              overflowY: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                {overlayState.type === 'SYS' && 'SYS 설정'}
                {overlayState.type === 'HPT' && 'HP/T 설정'}
                {overlayState.type === 'STR' && 'STR 설정'}
                {overlayState.type === 'AI' && 'AI 코멘트'}
              </h2>
              <button
                onClick={closeOverlay}
                style={{
                  fontSize: '28px',
                  color: '#94a3b8',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            {overlayState.type === 'SYS' && (
              <SysOverlay
                data={adminState.sys}
                onSave={(newData) => {
                  const { system_id, calculated, ...rest } = newData;
                  
                  // 1. adminState 업데이트
                  setAdminState(prev => ({
                    ...prev,
                    sys: {
                      ...prev.sys,
                      ...rest,
                      system: newData.system || system_id
                    }
                  }));
                  
                  // 2. ShotSlots에 draft 업데이트 (시스템 계산 결과 반영)
                  const activeSlot = shotEditor.activeSlot;
                  if (calculated && calculated.finalOneCValue !== undefined) {
                    // draft.sys 업데이트를 위해 updateDraftSys 호출
                    // 입력값: CO, C3, 시스템ID
                    actions.updateDraftSys(activeSlot, newData.system || system_id, {
                      CO: calculated.adjustedCO,
                      C3: calculated.adjustedC3,
                      baseOneC: calculated.finalOneCValue,
                      baseThreeC: calculated.adjustedC3
                    });
                    
                    // 3. Draft를 Applied로 확정
                    const applyResult = actions.applyDraftSys(activeSlot);
                    
                    if (applyResult.ok) {
                      // 4. 확정된 결과를 TrajectoryState에 주입 (화면 갱신)
                      const appliedSlot = actions.getActiveSlot();
                      const appliedResult = appliedSlot?.applied?.sys?.outputs?.result;
                      
                      if (appliedResult) {
                        // TrajectoryState 초기화 (필요시)
                        if (!trajectory.state.adjusted) {
                          trajectory.setAdjusting({
                            sys: {
                              oneC: appliedResult.oneC || 0,
                              threeC: appliedResult.threeC || 0
                            }
                          });
                        }
                        
                        // 결과값 주입
                        trajectory.applySysResult(appliedResult);
                        console.log('🚀 [STEP7] applySysResult 데이터 주입 완료:', appliedResult);
                      } else {
                        console.warn('⚠️ [STEP7] appliedResult가 없습니다.');
                      }
                    } else {
                      console.error('❌ [STEP7] applyDraftSys 실패:', applyResult.reason);
                    }
                  }
                  
                  closeOverlay();
                }}
                onCancel={closeOverlay}
              />
            )}

            {overlayState.type === 'HPT' && (
              <HptOverlay
                data={adminState.hpt}
                onSave={(newData) => {
                  setAdminState({ ...adminState, hpt: newData });
                  closeOverlay();
                }}
                onCancel={closeOverlay}
              />
            )}

            {overlayState.type === 'STR' && (
              <StrOverlay
                data={adminState.str}
                onSave={(newData) => {
                  setAdminState({ ...adminState, str: newData });
                  closeOverlay();
                }}
                onCancel={closeOverlay}
              />
            )}

            {overlayState.type === 'AI' && (
              <AiOverlay
                data={adminState.ai}
                onSave={(newData) => {
                  setAdminState({ ...adminState, ai: newData });
                  closeOverlay();
                }}
                onCancel={closeOverlay}
              />
            )}
          </div>
        </div>
      )}
      
      {/* 기존 USER 모드 오버레이 (조건 2: 완전 보존) */}
      {overlayContent && (
        <div
          onClick={() => setOverlayContent(null)}
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              borderRadius: '16px',
              padding: '24px',
              minWidth: '320px',
              maxWidth: '70%',
              maxHeight: '60%',
              overflowY: 'auto',
              boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 'bold', color: '#1e293b', margin: 0 }}>
                {overlayContent === 'SYS' && 'SYS'}
                {overlayContent === 'HPT' && 'HP/T'}
                {overlayContent === 'STR' && 'STR'}
                {overlayContent === 'AI' && 'AI'}
              </h2>
              <button
                onClick={() => setOverlayContent(null)}
                style={{
                  fontSize: '28px',
                  color: '#94a3b8',
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>

            <div style={{ color: '#334155', fontSize: '14px' }}>
              {overlayContent === 'SYS' && (
                <div>
                  {system.human_readable && Object.keys(system.human_readable).length > 0 ? (
                    Object.entries(system.human_readable).map(([key, formula]) => (
                      <div key={key} style={{ fontFamily: 'monospace', marginBottom: '8px' }}>
                        {formula}
                      </div>
                    ))
                  ) : (
                    <p style={{ color: '#64748b' }}>시스템 정보 없음</p>
                  )}
                </div>
              )}
              
              {overlayContent === 'HPT' && (
                <div>
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>타점 (Hit Point)</div>
                    <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{opts.hitpoint_clock || '-'}</div>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <span style={{ fontWeight: '600' }}>두께:</span> {opts.thickness || '-'}
                  </div>
                  <div>
                    <span style={{ fontWeight: '600' }}>회전:</span> {opts.english_tips || '-'}
                  </div>
                </div>
              )}
              
              {overlayContent === 'STR' && (
                <STRContent trajectoryState={trajectory} />
              )}
              
              {overlayContent === 'AI' && (
                <div>
                  <p style={{ lineHeight: 1.6 }}>
                    AI 추천 기능은 추후 구현 예정입니다.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
