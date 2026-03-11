import React, { useMemo } from "react";
import { getTrackAnchors } from "../../domain/anchorCoordinateEngine";
import { fgToRg } from "../../domain/finalCoordinateEngine";
import { toPx } from "../../utils/geometry/coords";

const FG_MARK_COLORS = {
  CO: "#FFD400",
  C1: "#00E5FF",
  C3: "#FFFFFF",
  C4: "#C77DFF",
  C5: "#FF9F1C",
  C6: "#FF4D4D",
};

const RG_LABEL_COLOR = "#FFFFFF";

const FG_CONSTANTS = [-2.25, 42.25, 82.25];
const RG_RAIL_CONSTANTS = [0, 40, 80];
const TOL = 0.01;

function inferSpace(p) {
  const onFg = (v) => FG_CONSTANTS.some((c) => Math.abs(v - c) < TOL);
  const onRgRail = (v) => RG_RAIL_CONSTANTS.some((c) => Math.abs(v - c) < TOL);
  if (onFg(p.x) || onFg(p.y)) return "FG";
  if (onRgRail(p.x) || onRgRail(p.y)) return "RG";
  return "FG";
}

function detectRailOrFrame(p, space) {
  if (space === "FG") {
    if (Math.abs(p.y - (-2.25)) < TOL) return "TOP";
    if (Math.abs(p.y - 42.25) < TOL) return "BOTTOM";
    if (Math.abs(p.x - (-2.25)) < TOL) return "LEFT";
    if (Math.abs(p.x - 82.25) < TOL) return "RIGHT";
  }
  if (space === "RG") {
    if (Math.abs(p.y - 0) < TOL) return "TOP";
    if (Math.abs(p.y - 40) < TOL) return "BOTTOM";
    if (Math.abs(p.x - 0) < TOL) return "LEFT";
    if (Math.abs(p.x - 80) < TOL) return "RIGHT";
  }
  return "TOP";
}

function getFgOffsetPx(mark, layout) {
  const { cushionW } = layout;
  const outerPx = Math.max(2, cushionW * 0.08);
  const innerPx = Math.max(4, cushionW * 0.2);
  if (mark === "CO" || mark === "C1" || mark === "C3") return outerPx;
  if (mark === "C4" || mark === "C5" || mark === "C6") return innerPx;
  return outerPx;
}

function getLabelPosition(anchorX, anchorY, mark, rail, space, layout) {
  const {
    railTop,
    railBottom,
    railLeft,
    railRight,
    frameInnerTop,
    frameInnerBottom,
    frameInnerLeft,
    frameInnerRight,
  } = layout;

  if (space === "RG") {
    if (rail === "TOP") return { x: anchorX, y: railTop };
    if (rail === "BOTTOM") return { x: anchorX, y: railBottom };
    if (rail === "LEFT") return { x: railLeft, y: anchorY };
    if (rail === "RIGHT") return { x: railRight, y: anchorY };
  }

  if (space === "FG") {
    const offset = getFgOffsetPx(mark, layout);
    if (rail === "TOP") return { x: anchorX, y: frameInnerTop + offset };
    if (rail === "BOTTOM") return { x: anchorX, y: frameInnerBottom - offset };
    if (rail === "LEFT") return { x: frameInnerLeft + offset, y: anchorY };
    if (rail === "RIGHT") return { x: frameInnerRight - offset, y: anchorY };
  }

  return { x: anchorX, y: anchorY };
}

export default function SystemGrid({
  anchorsData,
  track,
  scale,
  tableH,
  padding,
  tableLayout,
}) {
  const anchors = useMemo(() => {
    if (!anchorsData || !track) return [];
    return getTrackAnchors(anchorsData, track);
  }, [anchorsData, track]);

  const items = useMemo(() => {
    if (!tableLayout) return [];
    const list = [];
    for (const p of anchors) {
      const rg = fgToRg({ x: p.x, y: p.y });
      const px = toPx(rg, scale, tableH);
      const anchorX = px.x + padding;
      const anchorY = px.y + padding;
      const space = inferSpace(p);
      const rail = detectRailOrFrame(p, space);
      const pos = getLabelPosition(anchorX, anchorY, p.mark, rail, space, tableLayout);
      list.push({ p, rail, space, pos });
    }
    return list;
  }, [anchors, tableLayout, scale, tableH, padding]);

  if (!tableLayout) return null;

  return (
    <g className="system-grid">
      {items.map(({ p, rail, space, pos }, i) => {
        const color = space === "RG" ? RG_LABEL_COLOR : (FG_MARK_COLORS[p.mark] ?? "#FFFFFF");
        const textAnchor = rail === "LEFT" ? "end" : rail === "RIGHT" ? "start" : "middle";
        const dominantBaseline = rail === "TOP" ? "hanging" : rail === "BOTTOM" ? "alphabetic" : "middle";

        return (
          <text
            key={`${p.mark}_${i}`}
            x={pos.x}
            y={pos.y}
            fontSize={8}
            fill={color}
            textAnchor={textAnchor}
            dominantBaseline={dominantBaseline}
          >
            {p.sys}
          </text>
        );
      })}
    </g>
  );
}
