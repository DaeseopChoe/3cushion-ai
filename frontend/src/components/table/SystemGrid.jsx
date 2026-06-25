import React from "react";
import { fgToRg, rgToFg } from "../../domain/finalCoordinateEngine";
import { toPx } from "../../utils/geometry/coords";
import { getRailOutwardUnitNormalFG } from "../../utils/geometry/railNormalFG";
import { TABLE_CONFIG } from "../../config/tableConfig";

const { SCALE, TABLE_H, PADDING, CUSHION_RG } = TABLE_CONFIG;

/** FG 단위 — RAIL(C3) 쿠션 중심까지 */
const CUSHION_HALF = CUSHION_RG / 2;
/** C5/C6 프레임–쿠션 중간 영역 (FG 단위 초기값) */
const MID_RANGE = CUSHION_RG * 0.75;
/** C5/C6 전용 — MID보다 약간 더 바깥(FG); 튜닝 상수 */
const MID_RANGE_BETA = 1.0;
/** FRAME(CO/C1) 픽셀 보정 — 예전 24+6 합을 단일 값으로 유지 */
const FRAME_OFFSET_PX = 30;

/** 기존 기본 11px 대비 */
const REF_FONT_PX = 11;
const BASE_FONT_PX = REF_FONT_PX * 0.8;
const MID_FONT_PX = BASE_FONT_PX * 0.7;

const LAYER = {
  FRAME: "FRAME",
  RAIL: "RAIL",
  MID: "MID",
  OTHER: "OTHER",
};

/**
 * anchor id 파싱 — 좌표·값은 기존 규칙 유지, mark는 id 접두로 추출
 * 예: "C1_(40,42.25)_40" → { mark: "C1", x, y, value }
 */
export function parseAnchor(id) {
  if (!id || typeof id !== "string") return null;
  const markMatch = id.match(/^(\w+)_\(/);
  if (!markMatch) return null;
  const mark = markMatch[1];

  const coordMatch = id.match(/_(\(([^)]+)\))_(-?\d+(?:\.\d+)?)/);
  if (!coordMatch) return null;

  const [xs, ys] = coordMatch[2].split(",").map((s) => Number(String(s).trim()));
  const value = Number(coordMatch[3]);

  if (!Number.isFinite(xs) || !Number.isFinite(ys) || !Number.isFinite(value)) return null;

  return { mark, x: xs, y: ys, value };
}

export function getLayer(mark) {
  if (mark === "CO" || mark === "C1") return LAYER.FRAME;
  if (mark === "C3") return LAYER.RAIL;
  if (mark === "C4" || mark === "C5" || mark === "C6") return LAYER.MID;
  return LAYER.OTHER;
}

/** mark별 표시 색 (요청서 팔레트) */
export function getMarkColor(mark) {
  const colors = {
    CO: "#FFD700",
    C1: "#FFFFFF",
    C3: "#38BDF8",
    C4: "#FB923C",
    C5: "#4ADE80",
    C6: "#A78BFA",
  };
  return colors[mark] ?? "#94a3b8";
}

/** 레이어별 폰트 크기(px) */
export function getFontSizeForLayer(layer) {
  if (layer === LAYER.MID) return MID_FONT_PX;
  return BASE_FONT_PX;
}

/**
 * 최단거리 규칙으로 쿠션 기준선(FG) 반환
 * @returns {{ x: number | null, y: number | null }}
 */
export function getRailLineFromPosition(x, y) {
  const distTop = Math.abs(y - 42.25);
  const distBottom = Math.abs(y + 2.25);
  const distLeft = Math.abs(x + 2.25);
  const distRight = Math.abs(x - 82.25);

  const min = Math.min(distTop, distBottom, distLeft, distRight);

  if (min === distTop) return { x: null, y: 42.25 };
  if (min === distBottom) return { x: null, y: -2.25 };
  if (min === distLeft) return { x: -2.25, y: null };
  if (min === distRight) return { x: 82.25, y: null };

  return { x: null, y: null };
}

function usesRailLineBaseMark(mark) {
  return mark === "C2" || mark === "C3" || mark === "C4";
}

/**
 * 벡터 라벨 displacement: C4/C5/C6는 순수 쿠션 외향; C2/C3는 동일(수직 변에서 x 반전, 레거시 C3 정책 유지).
 */
function normalForVectorMarkPlacement(railLine, mark) {
  const outward = getRailOutwardUnitNormalFG(railLine);
  if (mark === "C4" || mark === "C5" || mark === "C6") return outward;
  if (mark === "C2" || mark === "C3")
    return railLine.x != null ? { x: -outward.x, y: outward.y } : outward;
  return outward;
}

/** C2/C3/C4: railLine → baseFG → normal × distance. C5/C6: anchor 기준 유지 */
function computeVectorMarkTargetFG(x, y, mark) {
  const distance = getRailVectorDistance(mark);
  const railLine = getRailLineFromPosition(x, y);
  const baseFG = usesRailLineBaseMark(mark)
    ? { x: railLine.x ?? x, y: railLine.y ?? y }
    : { x, y };
  const normal = normalForVectorMarkPlacement(railLine, mark);
  return {
    x: baseFG.x + normal.x * distance,
    y: baseFG.y + normal.y * distance,
  };
}

function usesVectorRailMark(mark) {
  return mark === "C2" || mark === "C3" || mark === "C4" || mark === "C5" || mark === "C6";
}

function getRailVectorDistance(mark) {
  if (mark === "C2" || mark === "C3" || mark === "C4") return CUSHION_HALF;
  if (mark === "C5" || mark === "C6") return MID_RANGE + MID_RANGE_BETA;
  return 0;
}

/**
 * C2~C6 라벨: SystemValueLabels 등에서 SystemGrid와 동일 벡터 파이프 사용
 * @param {object} p
 * @param {number} p.rawX
 * @param {number} p.rawY
 * @param {boolean} p.isFg
 * @param {"C2"|"C3"|"C4"|"C5"|"C6"} p.mark
 */
export function computeCushionVectorLabelPosition({ rawX, rawY, isFg, mark, scale, tableH, padding }) {
  const fg = isFg ? { x: rawX, y: rawY } : rgToFg({ x: rawX, y: rawY });
  const targetFG = computeVectorMarkTargetFG(fg.x, fg.y, mark);
  const rg = fgToRg(targetFG);
  const p = toPx(rg, scale, tableH);
  return {
    cx: p.x + padding,
    cy: p.y + padding,
    dx: 0,
    dy: 0,
    textAnchor: "middle",
  };
}

/** FRAME(CO/C1)만 픽셀 기반 바깥 오프셋 — normal은 쿠션 외향(FG) */
export function applyLayerOffset({ layer, normal }) {
  if (layer !== LAYER.FRAME) return { dx: 0, dy: 0 };
  const offset = FRAME_OFFSET_PX;
  if (normal.y === 1) return { dx: 0, dy: -offset };
  if (normal.y === -1) return { dx: 0, dy: offset };
  if (normal.x === -1) return { dx: -offset, dy: 0 };
  if (normal.x === 1) return { dx: offset, dy: 0 };
  return { dx: 0, dy: 0 };
}

function layerDebugStroke(layer) {
  switch (layer) {
    case LAYER.FRAME:
      return "rgba(59, 130, 246, 0.45)";
    case LAYER.MID:
      return "rgba(34, 197, 94, 0.45)";
    case LAYER.RAIL:
      return "rgba(234, 179, 8, 0.45)";
    default:
      return "rgba(148, 163, 184, 0.35)";
  }
}

/**
 * @param {object} props
 * @param {import("../../data/systems/anchorsRegistry").AnchorsData} [props.anchorsData]
 * @param {string} [props.track]
 * @param {boolean} [props.visible]
 * @param {boolean} [props.debugLayerBounds] 레이어별 약한 바운드(원) 표시
 */
export default function SystemGrid({ anchorsData, track, visible = true, debugLayerBounds = false }) {
  if (!visible || !anchorsData) return null;

  const trajectory = anchorsData?.trajectories?.[track];
  if (!trajectory) return null;

  const anchors = trajectory.anchors || [];

  return (
    <g className="system-grid">
      {anchors.map((anchor, idx) => {
        const parsed = parseAnchor(anchor.id);
        if (!parsed) return null;

        const { mark, x, y } = parsed;
        const layer = getLayer(mark);

        let baseX;
        let baseY;
        let dx;
        let dy;

        if (usesVectorRailMark(mark)) {
          const targetFG = computeVectorMarkTargetFG(x, y, mark);
          const rgPt = fgToRg(targetFG);
          const pVec = toPx(rgPt, SCALE, TABLE_H);
          baseX = pVec.x + PADDING;
          baseY = pVec.y + PADDING;
          dx = 0;
          dy = 0;
        } else if (layer === LAYER.FRAME) {
          const railLine = getRailLineFromPosition(x, y);
          const normal = getRailOutwardUnitNormalFG(railLine);
          const rg = fgToRg({ x, y });
          const p = toPx(rg, SCALE, TABLE_H);
          baseX = p.x + PADDING;
          baseY = p.y + PADDING;
          const o = applyLayerOffset({ layer, normal });
          dx = o.dx;
          dy = o.dy;
        } else {
          const rg = fgToRg({ x, y });
          const p = toPx(rg, SCALE, TABLE_H);
          baseX = p.x + PADDING;
          baseY = p.y + PADDING;
          dx = 0;
          dy = 0;
        }

        const tx = baseX + dx;
        const ty = baseY + dy;

        const fontSize = getFontSizeForLayer(layer);

        if (!debugLayerBounds) return null;

        return (
          <g key={anchor.id || idx}>
            <circle
              cx={tx}
              cy={ty}
              r={Math.max(10, fontSize * 1.1)}
              fill="none"
              stroke={layerDebugStroke(layer)}
              strokeWidth={1}
              strokeDasharray="3 2"
              style={{ pointerEvents: "none" }}
            />
          </g>
        );
      })}
    </g>
  );
}
