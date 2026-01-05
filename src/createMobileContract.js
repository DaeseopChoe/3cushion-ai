// src/createMobileContract.js

/**
 * Phase D
 * - PC(App.jsx)에서 계산 완료되고 이미 렌더링에 사용된 px 좌표를
 *   Mobile Contract로 그대로 변환 (계산 없음, 번역만)
 * - PC와 100% 동일한 렌더링 보장
 */

// 렌더링 상수 (PC와 동일)
const SCALE = 10;
const TABLE_W = 80 * SCALE;
const TABLE_H = 40 * SCALE;
const PADDING = 100;

// 좌표 변환 (Rg → SVG Pixel)
function toPx({ x, y }) {
  return {
    x: x * SCALE,
    y: TABLE_H - y * SCALE,
  };
}

export function createMobileContract(computationResult) {
  if (!computationResult) return null;

  // PC 계산 결과에서 실제 데이터 추출
  const balls = computationResult.balls || {};
  const allAnchors = computationResult.allAnchors || {};
  const cushionPath = computationResult.cushionPath || [];
  const impact = computationResult.impact;
  const CO_line = computationResult.CO_line;
  const C1_line = computationResult.C1_line;
  const railGroups = computationResult.railGroups || {};

  // table 데이터 구성
  const tableBalls = [];
  const tableLines = [];
  const tableLabels = [];
  const tableMarkers = [];

  // Balls: 공 3개 (PC와 동일한 px 좌표)
  if (balls.cue) {
    const p = toPx(balls.cue);
    tableBalls.push({
      id: "cue",
      cx: p.x + PADDING,
      cy: p.y + PADDING,
      r: 5,
      fill: "#ffffff",
      stroke: "#333",
      strokeWidth: 1
    });
  }
  if (balls.target_center) {
    const p = toPx(balls.target_center);
    tableBalls.push({
      id: "target",
      cx: p.x + PADDING,
      cy: p.y + PADDING,
      r: 5,
      fill: "#fde047",
      stroke: "#333",
      strokeWidth: 1
    });
  }
  if (balls.second) {
    const p = toPx(balls.second);
    tableBalls.push({
      id: "second",
      cx: p.x + PADDING,
      cy: p.y + PADDING,
      r: 5,
      fill: "#f87171",
      stroke: "#333",
      strokeWidth: 1
    });
  }

  // Lines: CO-1C 선 (PC와 동일)
  if (CO_line && C1_line) {
    const p1 = toPx(CO_line);
    const p2 = toPx(C1_line);
    tableLines.push({
      id: "co-1c",
      points: [
        { x: p1.x + PADDING, y: p1.y + PADDING },
        { x: p2.x + PADDING, y: p2.y + PADDING }
      ],
      stroke: "#fb923c",
      strokeWidth: 2,
      fill: "none"
    });
  }

  // Lines: 궤적 (PC와 동일)
  if (Array.isArray(cushionPath) && cushionPath.length > 1) {
    const points = cushionPath.map(pt => {
      const p = toPx(pt);
      return { x: p.x + PADDING, y: p.y + PADDING };
    });
    tableLines.push({
      id: "trajectory",
      points,
      stroke: "#ef4444",
      strokeWidth: 2,
      fill: "none"
    });
  }

  // Lines: impact helper (PC와 동일)
  if (balls.cue && impact) {
    const p1 = toPx(balls.cue);
    const p2 = toPx(impact);
    tableLines.push({
      id: "impact-helper",
      points: [
        { x: p1.x + PADDING, y: p1.y + PADDING },
        { x: p2.x + PADDING, y: p2.y + PADDING }
      ],
      stroke: "#e5e7eb",
      strokeWidth: 2,
      strokeDasharray: "4 3",
      fill: "none"
    });
  }

  // Labels + Markers: 앵커 (PC와 동일)
  Object.entries(allAnchors).forEach(([label, data]) => {
    if (data && data.coord) {
      const p = toPx(data.coord);
      
      tableMarkers.push({
        id: `marker-${label}`,
        cx: p.x + PADDING,
        cy: p.y + PADDING,
        r: 3,
        fill: "#facc15"
      });

      tableLabels.push({
        id: `label-${label}`,
        x: p.x + PADDING,
        y: p.y + PADDING - 10,
        text: label,
        fontSize: 9,
        fill: "#facc15",
        textAnchor: "middle"
      });
    }
  });

  // Marker: impact (PC와 동일)
  if (impact) {
    const p = toPx(impact);
    tableMarkers.push({
      id: "impact-marker",
      cx: p.x + PADDING,
      cy: p.y + PADDING,
      r: 7,
      fill: "none",
      stroke: "#facc15",
      strokeWidth: 2
    });
  }

  // Labels: 시스템 값 (railGroups)
  if (railGroups) {
    // BOTTOM
    if (Array.isArray(railGroups.BOTTOM)) {
      railGroups.BOTTOM.forEach((item, i) => {
        if (item && typeof item.x === 'number' && item.mark && item.sys !== undefined) {
          tableLabels.push({
            id: `sys-bottom-${i}`,
            x: item.x * SCALE + PADDING,
            y: TABLE_H + PADDING + 45,
            text: `${item.mark}: ${item.sys}`,
            fontSize: 13,
            fontWeight: "bold",
            fill: "#fff",
            textAnchor: "middle"
          });
        }
      });
    }
    
    // TOP
    if (Array.isArray(railGroups.TOP)) {
      railGroups.TOP.forEach((item, i) => {
        if (item && typeof item.x === 'number' && item.mark && item.sys !== undefined) {
          tableLabels.push({
            id: `sys-top-${i}`,
            x: item.x * SCALE + PADDING,
            y: PADDING - 35,
            text: `${item.mark}: ${item.sys}`,
            fontSize: 13,
            fontWeight: "bold",
            fill: "#fff",
            textAnchor: "middle"
          });
        }
      });
    }
    
    // LEFT
    if (Array.isArray(railGroups.LEFT)) {
      railGroups.LEFT.forEach((item, i) => {
        if (item && typeof item.y === 'number' && item.mark && item.sys !== undefined) {
          tableLabels.push({
            id: `sys-left-${i}`,
            x: PADDING - 45,
            y: TABLE_H - item.y * SCALE + PADDING + 3,
            text: `${item.mark}: ${item.sys}`,
            fontSize: 13,
            fontWeight: "bold",
            fill: "#fff",
            textAnchor: "end"
          });
        }
      });
    }
    
    // RIGHT
    if (Array.isArray(railGroups.RIGHT)) {
      railGroups.RIGHT.forEach((item, i) => {
        if (item && typeof item.y === 'number' && item.mark && item.sys !== undefined) {
          tableLabels.push({
            id: `sys-right-${i}`,
            x: TABLE_W + PADDING + 45,
            y: TABLE_H - item.y * SCALE + PADDING + 3,
            text: `${item.mark}: ${item.sys}`,
            fontSize: 13,
            fontWeight: "bold",
            fill: "#fff",
            textAnchor: "start"
          });
        }
      });
    }
  }

  return {
    table: {
      balls: tableBalls,
      lines: tableLines,
      labels: tableLabels,
      markers: tableMarkers
    },
    buttons: {
      strategies: [],
      activeStrategy: null,
      infoPanels: []
    },
    panels: {},
    _meta: {
      stateHash: computationResult.view?.sample_id || "unknown",
      timestamp: Date.now(),
      version: "D",
      counts: {
        balls: tableBalls.length,
        lines: tableLines.length,
        labels: tableLabels.length,
        markers: tableMarkers.length
      }
    }
  };
}
