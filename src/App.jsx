import React, { useState, useEffect } from "react";
import canonical from "./canonical.json";
import { convertCanonicalAnchors } from "./lib/convertCanonicalAnchors";

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

export default function App() {
  const [currentId, setCurrentId] = useState(SHOTS[0].id);
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

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-4 lg:p-6 flex flex-col lg:flex-row gap-4">
      <div className="w-full lg:w-64 flex-shrink-0">
        <div className="bg-slate-800/80 rounded-2xl p-4 h-full shadow-lg flex flex-col">
          <h2 className="text-lg font-bold text-emerald-400 mb-4">샷 시뮬레이션 선택</h2>
          <select value={currentId} onChange={(e) => setCurrentId(e.target.value)} className="w-full rounded-lg border border-slate-600 bg-slate-900/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 mb-6">
            {SHOTS.map((s) => (<option key={s.id} value={s.id}>{s.label}</option>))}
          </select>
          <div className="mt-2 border-t border-slate-700 pt-4 text-sm space-y-1">
            <div><span className="text-slate-400">ID: </span><span className="font-medium text-slate-100">{view.sample_id}</span></div>
            <div><span className="text-slate-400">공략 패턴: </span><span className="font-medium text-slate-100">{view.pattern || "뒤돌리기"}</span></div>
            <div><span className="text-slate-400">경로: </span><span className="font-medium text-slate-100">{view.track}</span></div>
            <div><span className="text-slate-400">마지막 쿠션: </span><span className="font-medium text-slate-100">{view.last_cushion}</span></div>
            <div><span className="text-slate-400">두께: </span><span className="font-medium text-slate-100">{opts.thickness}</span></div>
          </div>
        </div>
      </div>

      <div className="flex-1 min-w-0 flex justify-center items-center">
        <div className="w-full bg-slate-800/80 rounded-2xl shadow-lg p-4 lg:p-6">
          <h2 className="text-center text-lg font-bold mb-4">당구대 시각화 (80 x 40)</h2>
          <div className="flex justify-center">
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
          </div>
        </div>
      </div>

      <div className="w-full lg:w-80 flex-shrink-0 flex flex-col gap-4">
        <div className="bg-slate-800/80 rounded-2xl p-4 shadow-lg">
          <h3 className="text-lg font-bold mb-3 text-sky-300">시스템 및 계산</h3>
          <div className="grid grid-cols-2 text-sm gap-y-1 mb-3">
            {visibleKeys.map((key) => (
              <div key={key} className="flex justify-between">
                <span className="text-slate-300">{key}:</span>
                <span className="font-mono text-emerald-400">{system.values?.[key] ?? "-"}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-700 pt-3 space-y-2 text-xs">
            {system.human_readable && Object.entries(system.human_readable).map(([k, formula]) => (
              <div key={k} className="bg-slate-900/70 rounded-lg px-2 py-1 font-mono text-amber-300">{formula}</div>
            ))}
          </div>
        </div>

        <div className="bg-slate-800/80 rounded-2xl p-4 shadow-lg">
          <h3 className="text-lg font-bold mb-3 text-rose-300">타법 및 디테일</h3>
          <div className="mb-4">
            <div className="text-xs text-slate-400 mb-1">당점 (Hit Point)</div>
            <HitpointVisualizer hitpoint={opts.hitpoint_clock} />
          </div>
          <div className="grid grid-cols-2 gap-y-1 text-sm border-t border-slate-700 pt-3">
            <span className="text-slate-300">두께:</span><span className="font-medium">{opts.thickness}</span>
            <span className="text-slate-300">회전 (팁):</span><span className="font-medium">{opts.english_tips}</span>
            <span className="text-slate-300">스피드:</span><span className="font-medium">{opts.speed_rail ? `${opts.speed_rail} 레일` : ""}</span>
            <span className="text-slate-300">관통:</span><span className="font-medium">{opts.penetration_ball ? `${opts.penetration_ball} 볼` : ""}</span>
            <span className="text-slate-300">커브:</span><span className="font-medium">{opts.curving_hint}</span>
          </div>
        </div>

        <div className="bg-slate-800/80 rounded-2xl p-4 shadow-lg">
          <h3 className="text-lg font-bold mb-3 text-emerald-300">AI 코칭 전략</h3>
          <ul className="space-y-2 text-sm text-slate-200">
            {strategy.map((line, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-emerald-400 mt-1">•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
