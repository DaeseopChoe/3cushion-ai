import React, { useState, useEffect } from "react";
import { convertCanonicalAnchors } from "./lib/convertCanonicalAnchors";

// ============================================
// Phase B-1 Step 1: 모바일 감지 (임시)
// ============================================
function isMobileDevice() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

const IS_MOBILE = isMobileDevice();

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
const PADDING = 100;

const BALL_DIAMETER_MM = 61.5;
const RG_UNIT_MM = 35.55;
const BALL_DIAMETER_RG = BALL_DIAMETER_MM / RG_UNIT_MM;
const BALL_RADIUS_RG = BALL_DIAMETER_RG / 2;

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

function Ball({ x, y, color, stroke = "#111827" }) {
  const p = toPx({ x, y });
  return <circle cx={p.x + PADDING} cy={p.y + PADDING} r={7} fill={color} stroke={stroke} strokeWidth={1.5} />;
}

function AnchorPoint({ x, y, label, isFg = false }) {
  // 점 위치: 쿠션 날선 (Rg 기준)
  let dotX = x;
  let dotY = y;
  
  if (isFg) {
    // Fg → Rg 변환 (쿠션 날선으로)
    if (Math.abs(y - 42.25) < 0.5) {
      dotY = 40;  // TOP 레일
    } else if (Math.abs(y - (-2.25)) < 0.5) {
      dotY = 0;   // BOTTOM 레일
    }
  }
  
  const p = toPx({ x: dotX, y: dotY });
  
  // 라벨 위치
  let dx = 0, dy = 0, anchor = "middle";
  
  if (Math.abs(dotY - 40) < 0.5) {
    // TOP: 라벨이 날선에 붙어있음 (현재 유지)
    dy = -10;
    anchor = "middle";
  } else if (Math.abs(dotY - 0) < 0.5) {
    // BOTTOM: 쿠션 뒤 0.75 Rg (7.5px)
    dy = 17.5;  // 10px(기본) + 7.5px(0.75 Rg)
    anchor = "middle";
  }
  
  if (Math.abs(dotX - 0) < 0.5) {
    // LEFT: 라벨이 날선에 붙어있음 (현재 유지)
    dx = -10;
    anchor = "end";
    dy = 0;
  } else if (Math.abs(dotX - 80) < 0.5) {
    // RIGHT: 라벨이 날선에 붙어있음 (현재 유지)
    dx = 10;
    anchor = "start";
    dy = 0;
  }

  return (
    <g>
      <circle cx={p.x + PADDING} cy={p.y + PADDING} r={2.5} fill="#facc15" />
      <text x={p.x + PADDING + dx} y={p.y + PADDING + dy} fontSize={9} fill="#facc15" textAnchor={anchor}>{label}</text>
    </g>
  );
}

function HitpointVisualizer({ hitpoint }) {
  if (!hitpoint) return <div className="text-gray-400 text-sm">정보 없음</div>;
  const parts = hitpoint.split(":");
  if (parts.length !== 2) return <div className="text-gray-400 text-sm">형식 오류</div>;

  const hour = parseInt(parts[0], 10);
  const minute = parseInt(parts[1], 10);
  
  // 시계 방향 각도 계산
  // 12시 = 0°, 3시 = 90°, 6시 = 180°, 9시 = 270°
  const totalMinutes = (hour * 60 + minute) % 720;  // 12시간 = 720분
  const angle = (totalMinutes / 720) * 360;  // 0~360도
  
  // SVG 좌표계로 변환 (12시가 위쪽)
  const angleRad = ((angle - 90) * Math.PI) / 180;
  
  // 중심에서 바깥쪽 3/5 = 0.6
  const radiusScale = 0.6;
  const radius = 24;
  
  const dotX = 25 + radiusScale * radius * Math.cos(angleRad);
  const dotY = 25 + radiusScale * radius * Math.sin(angleRad);

  return (
    <div className="flex items-center space-x-4">
      <svg width="50" height="50">
        {/* 공 외곽 */}
        <circle cx="25" cy="25" r="24" fill="#111827" stroke="#6b7280" strokeWidth="1.5" />
        {/* 중심점 */}
        <circle cx="25" cy="25" r="1.5" fill="#9ca3af" />
        {/* 당점 */}
        <circle cx={dotX} cy={dotY} r={3.5} fill="#f97316" stroke="#fff" strokeWidth="1.5" />
        {/* 12시 표시 (참고용) */}
        <line x1="25" y1="5" x2="25" y2="10" stroke="#6b7280" strokeWidth="1" />
      </svg>
      <span className="text-base font-semibold text-gray-100">{hitpoint}</span>
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

// 전략 버튼
const STRATEGY_BUTTONS = [
  { id: "S1", label: "S-1", color: "bg-emerald-500" },
  { id: "S2", label: "S-2", color: "bg-emerald-500" },
  { id: "S3", label: "S-3", color: "bg-emerald-500" },
];

// 정보 버튼
const INFO_BUTTONS = [
  { id: "SYS", label: "SYS", color: "bg-amber-500" },
  { id: "HPT", label: "HP/T", color: "bg-amber-500" },
  { id: "STR", label: "STR", color: "bg-amber-500" },
  { id: "AI", label: "AI", color: "bg-orange-500" },
];

function MobileWrapper({ children }) {
  const [activeStrategy, setActiveStrategy] = useState("S1");
  const [overlayContent, setOverlayContent] = useState(null);
  
  // Step 2: 레이아웃 계산 (모바일 가로 기준)
  const [dimensions, setDimensions] = useState(null);
  
  useEffect(() => {
    const calculateLayout = () => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      
      // 좌측 버튼 영역 제외
      const buttonWidth = 60;
      const availableW = vw - buttonWidth;
      const availableH = vh;
      
      // 짧은 변 기준 (2:1 비율 유지)
      const shortSide = Math.min(availableW / 2, availableH);
      
      // 당구대 크기 (90% 점유)
      const tableH = shortSide * 0.9;
      const tableW = tableH * 2;
      
      // 원본 크기 기준 scale 계산
      const originalTableW = 800;
      const originalTableH = 400;
      const scale = tableW / originalTableW;
      
      setDimensions({
        tableW,
        tableH,
        scale,
        buttonWidth
      });
      
      console.log("📐 Mobile Layout:", {
        viewport: { vw, vh },
        available: { w: availableW, h: availableH },
        shortSide,
        table: { w: tableW, h: tableH },
        scale: scale.toFixed(3)
      });
    };
    
    calculateLayout();
    window.addEventListener('resize', calculateLayout);
    window.addEventListener('orientationchange', calculateLayout);
    
    return () => {
      window.removeEventListener('resize', calculateLayout);
      window.removeEventListener('orientationchange', calculateLayout);
    };
  }, []);
  
  // 더미 전략 데이터 (Step 1 하드코딩)
  const [strategyBundle] = useState({
    S1: {
      info: {
        SYS: "S1 시스템 정보\n\nCO: 13\n1C: 10\n3C: 3\n\n기본 전략 (더미 데이터)",
        HPT: "S1 당점/두께\n\n당점: 12시\n두께: 1/2\n속도: 중간",
        STR: "S1 전략 설명\n\n뒤돌리기 기본 패턴\n안정적인 진입 각도",
        AI: "S1 AI 코칭\n\n추천: 중간 속도\n주의: 1C 정확도 중요",
      },
    },
    S2: {
      info: {
        SYS: "S2 시스템 정보\n\nCO: 25\n1C: 20\n3C: 10\n\n대안 전략 (더미 데이터)",
        HPT: "S2 당점/두께\n\n당점: 1시\n두께: 2/3\n속도: 빠름",
        STR: "S2 전략 설명\n\n옆돌리기 변형\n공격적인 각도",
        AI: "S2 AI 코칭\n\n추천: 빠른 속도\n주의: 2C 조정 필요",
      },
    },
    S3: {
      info: {
        SYS: "S3 시스템 정보\n\nCO: 35\n1C: 30\n3C: 20\n\n보수적 전략 (더미 데이터)",
        HPT: "S3 당점/두께\n\n당점: 11시\n두께: 1/3\n속도: 느림",
        STR: "S3 전략 설명\n\n안전 패턴\n확실한 득점 우선",
        AI: "S3 AI 코칭\n\n추천: 느린 속도\n주의: 정확도 최우선",
      },
    },
  });

  const handleStrategyClick = (strategy) => {
    if (activeStrategy === strategy) return; // no-op
    setActiveStrategy(strategy);
    setOverlayContent(null);
    console.log(`🎯 전략 변경: ${strategy}`);
  };

  const handleInfoClick = (infoType) => {
    setOverlayContent(overlayContent === infoType ? null : infoType);
    console.log(`📊 정보 표시: ${infoType} (전략: ${activeStrategy})`);
  };

  const closeOverlay = () => {
    setOverlayContent(null);
  };

  const currentOverlayContent = overlayContent
    ? strategyBundle[activeStrategy]?.info[overlayContent]
    : null;

  // Step 2: dimensions 계산 중 로딩 표시
  if (!dimensions) {
    return (
      <div className="fixed inset-0 bg-slate-900 flex items-center justify-center">
        <div className="text-white text-lg">⏳ 레이아웃 계산 중...</div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-slate-900 flex">
      {/* 좌측 버튼 영역 (고정) */}
      <div className="flex-shrink-0 bg-slate-800/50 flex flex-col justify-center gap-2 p-2" style={{ width: `${dimensions.buttonWidth}px` }}>
        {STRATEGY_BUTTONS.map((btn) => (
          <button
            key={btn.id}
            onClick={() => handleStrategyClick(btn.id)}
            className={`
              ${btn.color} 
              text-white font-bold text-xs rounded-lg px-2 py-3 shadow-lg 
              active:scale-95 transition-all
              ${activeStrategy === btn.id ? "ring-2 ring-white ring-offset-2 ring-offset-slate-900" : "opacity-60"}
            `}
          >
            {btn.label}
          </button>
        ))}
        <div className="h-px bg-slate-600 my-1" />
        {INFO_BUTTONS.map((btn) => (
          <button
            key={btn.id}
            onClick={() => handleInfoClick(btn.id)}
            className={`
              ${btn.color} 
              text-white font-bold text-xs rounded-lg px-2 py-3 shadow-lg 
              active:scale-95 transition-all
              ${overlayContent === btn.id ? "ring-2 ring-white" : ""}
            `}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Step 2: 당구대 영역 (scale 적용) */}
      <div className="flex-1 flex items-center justify-center overflow-hidden bg-slate-900">
        <div
          style={{
            transform: `scale(${dimensions.scale})`,
            transformOrigin: 'center center',
            width: '800px',
            height: '400px'
          }}
        >
          {children}
        </div>
      </div>

      {/* 오버레이 */}
      {overlayContent && currentOverlayContent && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/50 z-50"
          onClick={closeOverlay}
        >
          <div
            className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl max-w-md mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-200">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {INFO_BUTTONS.find((b) => b.id === overlayContent)?.label || "정보"}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  전략: {STRATEGY_BUTTONS.find((b) => b.id === activeStrategy)?.label}
                </p>
              </div>
              <button
                onClick={closeOverlay}
                className="text-slate-400 hover:text-slate-900 text-3xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="text-slate-700 whitespace-pre-line leading-relaxed">
              {currentOverlayContent}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-200">
              <p className="text-xs text-slate-400">
                Phase B-1 Step 1 - 더미 데이터
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [currentId, setCurrentId] = useState(SHOTS[0].id);
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [overlayContent, setOverlayContent] = useState(null);

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

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100"><div className="text-lg">로딩 중...</div></div>;
  if (error) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-8"><div className="text-red-400">오류: {error}</div></div>;
  if (!view || !view.ui) return <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100"><div className="text-red-400">데이터 오류</div></div>;

  const ui = view.ui;
  const balls = ui.balls || {};
  const rawAnchors = ui.anchors || {};
  const system = ui.system || { values: {}, human_readable: {} };
  const opts = ui.display_options || {};
  const strategy = ui.strategy || [];

  let anchors = rawAnchors;
  try {
    anchors = convertCanonicalAnchors(rawAnchors, canonical);
  } catch (e) {
    console.error("변환 오류:", e);
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

  const impact = calculateImpact(balls.cue, balls.target_center, CO_fg, C1_fg, opts.thickness || "1/2", view.pattern || "뒤돌리기");

  // CO→1C 선은 레일 교점 사용
  const CO_line = CO_rail;
  const C1_line = C1_rail;
  
  console.log("🔷 레일 교점:", {
    "CO_fg (원본)": CO_fg,
    "C1_fg (원본)": C1_fg,
    "CO_rail (교점)": CO_rail,
    "C1_rail (교점)": C1_rail
  });

  const cuePx = balls.cue ? toPx(balls.cue) : { x: 0, y: 0 };
  const impactPx = impact ? toPx(impact) : cuePx;

  let lastAnchor = null;
  if (view.last_cushion === "4C") lastAnchor = C4;
  if (view.last_cushion === "5C") lastAnchor = C5;
  if (view.last_cushion === "6C") lastAnchor = C6;

  const cushionPath = [C1_rail, C2, C3, lastAnchor].filter(Boolean);
  const cushionPathAttr = cushionPath.map((pt) => {
    const p = toPx(pt);
    return `${p.x + PADDING},${p.y + PADDING}`;
  }).join(" ");

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
  const handleInfoClick = (type) => {
    setOverlayContent(prev => prev === type ? null : type);
  };

  // ✅ tableSVG 정의 (READ-ONLY)
  const tableSVG = (
    <svg width={TABLE_W + 2 * PADDING} height={TABLE_H + 2 * PADDING} className="bg-slate-900/80 rounded-2xl shadow-xl">
      <RailFrame />
      <TableGrid />
      {Object.entries(allAnchors).map(([label, data]) => data.coord && <AnchorPoint key={label} label={label} x={data.coord.x} y={data.coord.y} isFg={data.isFg} />)}
      {CO_line && C1_line && <line x1={toPx(CO_line).x + PADDING} y1={toPx(CO_line).y + PADDING} x2={toPx(C1_line).x + PADDING} y2={toPx(C1_line).y + PADDING} stroke="#fb923c" strokeWidth={2} />}
      {cushionPath.length > 1 && <polyline points={cushionPathAttr} stroke="#ef4444" strokeWidth={2} fill="none" />}
      {balls.cue && impact && <line x1={cuePx.x + PADDING} y1={cuePx.y + PADDING} x2={impactPx.x + PADDING} y2={impactPx.y + PADDING} stroke="#e5e7eb" strokeDasharray="4 3" strokeWidth={2} />}
      {balls.cue && <Ball {...balls.cue} color="#ffffff" />}
      {balls.target_center && <Ball {...balls.target_center} color="#fde047" />}
      {balls.second && <Ball {...balls.second} color="#f87171" />}
      {impact && <circle cx={impactPx.x + PADDING} cy={impactPx.y + PADDING} r={7} fill="none" stroke="#facc15" strokeWidth={2} />}
      <SystemValueLabels railGroups={railGroups} />
    </svg>
  );

  // ✅ PC 레이아웃: 버튼 컬럼 + Stage 중앙
  const content = (
    <div className="min-h-screen bg-slate-900 flex">
      {/* 좌측 버튼 컬럼 */}
      <div className="flex items-center justify-center" style={{ width: '120px' }}>
        <div className="flex flex-col gap-2.5">
          {/* 전략 버튼 (S-1, S-2, S-3) */}
          <button
            onClick={() => setCurrentId(SHOTS[0].id)}
            className="bg-emerald-600 text-white font-bold text-xs rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all opacity-70 hover:opacity-100"
            style={{ width: '48px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            S-1
          </button>
          <button
            onClick={() => setCurrentId(SHOTS[1].id)}
            className="bg-emerald-600 text-white font-bold text-xs rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all opacity-70 hover:opacity-100"
            style={{ width: '48px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            S-2
          </button>
          <button
            onClick={() => setCurrentId(SHOTS[2].id)}
            className="bg-emerald-600 text-white font-bold text-xs rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all opacity-70 hover:opacity-100"
            style={{ width: '48px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            S-3
          </button>

          <div className="h-px bg-slate-600 my-1" />

          {/* 정보 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleInfoClick('SYS');
            }}
            className="bg-amber-600 text-white font-bold text-xs rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all opacity-70 hover:opacity-100"
            style={{ width: '48px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            SYS
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleInfoClick('HPT');
            }}
            className="bg-amber-600 text-white font-bold text-xs rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all opacity-70 hover:opacity-100"
            style={{ width: '48px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            HP/T
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleInfoClick('STR');
            }}
            className="bg-amber-600 text-white font-bold text-xs rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all opacity-70 hover:opacity-100"
            style={{ width: '48px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            STR
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleInfoClick('AI');
            }}
            className="bg-orange-600 text-white font-bold text-xs rounded-lg shadow-lg hover:scale-105 active:scale-95 transition-all opacity-70 hover:opacity-100"
            style={{ width: '48px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            AI
          </button>
        </div>
      </div>

      {/* ✅ Stage 영역: 클릭 시 오버레이 닫힘 */}
      <div 
        className="flex-1 flex items-center justify-center p-8 relative"
        onClick={() => overlayContent && setOverlayContent(null)}
      >
        <div style={{ maxWidth: '1200px' }}>
          {tableSVG}
        </div>

        {/* ✅ 정보 카드 (Stage 위에 배치) */}
        {overlayContent && (
          <div 
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
            style={{ zIndex: 50 }}
          >
            <div
              className="pointer-events-auto rounded-2xl shadow-xl px-10 py-6"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.70)',
                minWidth: '320px',
                maxWidth: '70%',
                maxHeight: '60%',
                overflowY: 'auto'
              }}
              onClick={() => setOverlayContent(null)}
            >
              {/* 헤더 */}
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-slate-900">
                  {overlayContent === 'SYS' && 'SYS'}
                  {overlayContent === 'HPT' && 'HP/T'}
                  {overlayContent === 'STR' && 'STR'}
                  {overlayContent === 'AI' && 'AI'}
                </h2>
                <button
                  onClick={() => setOverlayContent(null)}
                  className="text-slate-400 hover:text-slate-900 text-2xl leading-none w-8 h-8 flex items-center justify-center"
                >
                  ×
                </button>
              </div>

              {/* 내용 */}
              <div className="text-slate-700">
                {/* SYS: 시스템 계산식 */}
                {overlayContent === 'SYS' && (
                  <div className="space-y-2">
                    {system.human_readable && Object.keys(system.human_readable).length > 0 ? (
                      Object.entries(system.human_readable).map(([key, formula]) => (
                        <div key={key} className="font-mono text-sm">
                          {formula}
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-slate-500">시스템 정보 없음</p>
                    )}
                  </div>
                )}
                
                {/* HP/T: 타법 정보 */}
                {overlayContent === 'HPT' && (
                  <div className="space-y-3">
                    {/* 타점 시각화 */}
                    <div>
                      <div className="text-xs text-slate-500 mb-2">타점 (Hit Point)</div>
                      <HitpointVisualizer hitpoint={opts.hitpoint_clock} />
                    </div>
                    
                    {/* 두께 */}
                    <div className="text-sm">
                      <span className="font-semibold">두께:</span> {opts.thickness || '-'}
                    </div>
                    
                    {/* 회전 */}
                    <div className="text-sm">
                      <span className="font-semibold">회전:</span> {opts.english_tips || '-'}
                    </div>
                  </div>
                )}
                
                {/* STR: 전략 디테일 */}
                {overlayContent === 'STR' && (
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="font-semibold">스피드:</span> {opts.speed_rail ? `${opts.speed_rail} 레일` : '-'}
                    </div>
                    <div>
                      <span className="font-semibold">관통:</span> {opts.penetration_ball ? `${opts.penetration_ball} 볼` : '-'}
                    </div>
                  </div>
                )}
                
                {/* AI: 코칭 전략 */}
                {overlayContent === 'AI' && (
                  <div>
                    {strategy && strategy.length > 0 ? (
                      <ul className="space-y-2 text-sm">
                        {strategy.map((line, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-emerald-400 mt-1">•</span>
                            <span>{line}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-slate-500">AI 전략 정보 없음</p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Phase B-1 Step 1: wrapper 조건부 적용
  return IS_MOBILE 
    ? <MobileWrapper>{content}</MobileWrapper> 
    : content;
}
