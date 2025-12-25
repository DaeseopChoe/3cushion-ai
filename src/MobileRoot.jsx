import React, { useState, useEffect } from "react";
import MobileWrapper from "./MobileWrapper";
import { convertCanonicalAnchors } from "./lib/convertCanonicalAnchors";

// ============================================
// 당구대 상수 (App.jsx와 동일)
// ============================================
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

const CUSHION_MM = 45;
const FRAME_MM = 80;
const POINT_OFFSET_MM = 80;

const CUSHION_RG = CUSHION_MM / RG_UNIT_MM;
const FRAME_RG = FRAME_MM / RG_UNIT_MM;
const POINT_OFFSET_RG = POINT_OFFSET_MM / RG_UNIT_MM;

// ============================================
// 샷 데이터 (App.jsx와 동일)
// ============================================
const SHOTS = [
  { id: "H001_05", label: "H001 – B2T_R / 4C", file: "B2T_R_canonical.json" },
  { id: "H001_05_SB1", label: "H001 – B2T_R / 4C - SB1", file: "B2T_R/H001_05_SB1.json" },
  { id: "H001_05_SB2", label: "H001 – B2T_R / 4C - SB2", file: "B2T_R/H001_05_SB2.json" },
  { id: "H001_05_SB3", label: "H001 – B2T_R / 4C - SB3", file: "B2T_R/H001_05_SB3.json" },
  { id: "H001_05_SB4", label: "H001 – B2T_R / 4C - SB4", file: "B2T_R/H001_05_SB4.json" },
  { id: "H001_05_SB5", label: "H001 – B2T_R / 4C - SB5", file: "B2T_R/H001_05_SB5.json" },
  { id: "H001_05_B2T_L", label: "H001 – B2T_L / 4C", file: "B2T_L_generated.json" },
  { id: "H001_05_T2B_L", label: "H001 – T2B_L / 4C", file: "T2B_L_generated.json" },
  { id: "H001_05_T2B_R", label: "H001 – T2B_R / 4C", file: "T2B_R_generated.json" },
];

// ============================================
// 헬퍼 함수들 (App.jsx에서 복사)
// ============================================
function toPx({ x, y }) {
  return { x: x * SCALE, y: TABLE_H - y * SCALE };
}

function determineRotation(CO, C1) {
  if (!CO || !C1) return "RIGHT";
  
  const isB2T = Math.abs(CO.y - (-2.25)) < 0.5;
  const isT2B = Math.abs(CO.y - 42.25) < 0.5;
  
  if (isB2T) {
    return CO.x > C1.x ? "LEFT" : "RIGHT";
  } else if (isT2B) {
    return CO.x > C1.x ? "RIGHT" : "LEFT";
  }
  
  return "RIGHT";
}

function getImpactDirection(rotation, pattern) {
  if (pattern === "뒤돌리기" || pattern === "BACKDOUBLE") {
    return rotation === "LEFT" ? 1 : -1;
  } else if (pattern === "옆돌리기" || pattern === "SIDEDOUBLE") {
    return rotation === "LEFT" ? -1 : 1;
  }
  
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
  
  const rotation = determineRotation(CO_fg, C1_fg);
  const impactSign = getImpactDirection(rotation, pattern);
  
  const offset_rg = t * BALL_DIAMETER_RG;
  const perp_x = -uy * impactSign;
  const perp_y = ux * impactSign;
  
  return {
    x: target.x + perp_x * offset_rg,
    y: target.y + perp_y * offset_rg
  };
}

// ============================================
// 컴포넌트들 (App.jsx에서 복사)
// ============================================
function Ball({ x, y, color }) {
  const p = toPx({ x, y });
  return <circle cx={p.x + PADDING} cy={p.y + PADDING} r={BALL_RADIUS_RG * SCALE} fill={color} stroke="#333" strokeWidth={1} />;
}

function AnchorPoint({ label, x, y, isFg }) {
  let dotX = x;
  let dotY = y;
  
  if (isFg) {
    const offset = 2.25;
    if (Math.abs(dotY - (-offset)) < 0.5) dotY = 0;
    else if (Math.abs(dotY - (40 + offset)) < 0.5) dotY = 40;
    if (Math.abs(dotX - (-offset)) < 0.5) dotX = 0;
    else if (Math.abs(dotX - (80 + offset)) < 0.5) dotX = 80;
  }
  
  const p = toPx({ x: dotX, y: dotY });
  
  let dx = 0;
  let dy = -15;
  let anchor = "middle";
  
  if (Math.abs(dotY - 40) < 0.5) {
    dy = -10;
  } else if (Math.abs(dotY - 0) < 0.5) {
    dy = 20;
  }
  
  if (Math.abs(dotX - 0) < 0.5) {
    dx = -10;
    anchor = "end";
    dy = 0;
  } else if (Math.abs(dotX - 80) < 0.5) {
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
  const outerRadius = 10;

  return (
    <g>
      <rect
        x={PADDING - cushionW - frameW}
        y={PADDING - cushionW - frameW}
        width={TABLE_W + 2 * (cushionW + frameW)}
        height={TABLE_H + 2 * (cushionW + frameW)}
        fill="#6B3410"
        rx={outerRadius}
        ry={outerRadius}
      />
      <rect
        x={PADDING - cushionW}
        y={PADDING - cushionW}
        width={TABLE_W + 2 * cushionW}
        height={TABLE_H + 2 * cushionW}
        fill="#1e40af"
      />
      <rect
        x={PADDING}
        y={PADDING}
        width={TABLE_W}
        height={TABLE_H}
        fill="#2563eb"
      />
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

function groupSystemValuesByRail(anchors, systemValues, lastCushion) {
  const result = { TOP: [], BOTTOM: [], LEFT: [], RIGHT: [] };
  
  Object.entries(anchors).forEach(([mark, anchorData]) => {
    const sys = systemValues[mark];
    if (sys === undefined || sys === null) return;
    
    const coord = anchorData.coord || anchorData;
    if (!coord || typeof coord.x !== "number" || typeof coord.y !== "number") return;
    
    let rail = null;
    if (Math.abs(coord.y - 0) < 0.5) rail = "BOTTOM";
    else if (Math.abs(coord.y - 40) < 0.5) rail = "TOP";
    else if (Math.abs(coord.x - 0) < 0.5) rail = "LEFT";
    else if (Math.abs(coord.x - 80) < 0.5) rail = "RIGHT";
    
    if (rail) {
      result[rail].push({ mark, x: coord.x, y: coord.y, sys });
    }
  });
  
  return result;
}

// ============================================
// MobileRoot 메인 컴포넌트
// ============================================
export default function MobileRoot() {
  const [currentId] = useState(SHOTS[0].id);
  const [view, setView] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const shot = SHOTS.find((s) => s.id === currentId);
    if (!shot) {
      setError("샷을 찾을 수 없습니다.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/samples/5_half_system/${shot.file}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        console.log("✅ 모바일 로드:", shot.file);
        setView(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("❌ 모바일 오류:", err);
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

  let anchors = rawAnchors;
  try {
    anchors = convertCanonicalAnchors(rawAnchors, view.track);
  } catch (err) {
    console.warn("앵커 변환 실패:", err);
  }

  const CO_fg = anchors.CO?.coord || null;
  const C1_fg = anchors["1C"]?.coord || null;
  const C2 = anchors["2C"]?.coord || null;
  const C3 = anchors["3C"]?.coord || null;
  const C4 = anchors["4C"]?.coord || null;
  const C5 = anchors["5C"]?.coord || null;
  const C6 = anchors["6C"]?.coord || null;

  const impact = calculateImpact(balls.cue, balls.target_center, CO_fg, C1_fg, opts.thickness, view.pattern);

  const offset_fg2rg = 2.25;
  const CO_rail = CO_fg ? { x: CO_fg.x, y: 0 } : null;
  const C1_rail = C1_fg ? { x: C1_fg.x, y: 40 } : null;

  const CO_line = CO_rail;
  const C1_line = C1_rail;

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
    CO: { coord: CO_rail, isFg: false },
    "1C": { coord: C1_rail, isFg: false },
    "2C": { coord: C2, isFg: false }, 
    "3C": { coord: C3, isFg: false }, 
    "4C": { coord: C4, isFg: false }, 
    "5C": { coord: C5, isFg: false }, 
    "6C": { coord: C6, isFg: false } 
  };
  const railGroups = groupSystemValuesByRail(anchors, system.values || {}, view.last_cushion);

  // ============================================
  // tableSVG 생성 (App과 동일)
  // ============================================
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

  // ============================================
  // MobileWrapper에 tableSVG 전달
  // ============================================
  return <MobileWrapper tableSVG={tableSVG} tableWidth={TABLE_W + 2 * PADDING} tableHeight={TABLE_H + 2 * PADDING} />;
}
