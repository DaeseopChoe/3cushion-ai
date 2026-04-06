import React from "react";
import { toPx } from "../../utils/geometry/coords";
import { getRailOutwardUnitNormalFG } from "../../utils/geometry/railNormalFG";
import { cushionMarkToDisplayLabel } from "../../utils/cushionDisplayLabel";
import { fgToRg, rgToFg } from "../../domain/finalCoordinateEngine";
import { TABLE_CONFIG } from "../../config/tableConfig";
import AnchorPoint from "./AnchorPoint";
import { computeCushionVectorLabelPosition, getRailLineFromPosition } from "./SystemGrid";

/** SystemGrid 벡터 거리와 동일 기준 (3C=C3 … 6C=C6) */
const VECTOR_LABEL_MARK = {
  "3C": "C3",
  "4C": "C4",
  "5C": "C5",
  "6C": "C6",
};

const VECTOR_LABELS = new Set(Object.keys(VECTOR_LABEL_MARK));

/** C4 라벨 전용 — CUSHION_HALF 거리, 쿠션 외향 normal */
function computeC4CushionCenterLabelPosition({ rawX, rawY, isFg, scale, tableH, padding }) {
  const fg = isFg ? { x: rawX, y: rawY } : rgToFg({ x: rawX, y: rawY });
  const railLine = getRailLineFromPosition(fg.x, fg.y);
  const baseFG = { x: railLine.x ?? fg.x, y: railLine.y ?? fg.y };
  const normal = getRailOutwardUnitNormalFG(railLine);
  const half = TABLE_CONFIG.CUSHION_RG / 2;
  const targetFG = {
    x: baseFG.x + normal.x * half,
    y: baseFG.y + normal.y * half,
  };
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

export default function SystemValueLabels({
  anchors,
  scale,
  tableH,
  padding,
  systemValues,
  onAnchorDoubleClick,
}) {
  return (
    <>
      {Object.entries(anchors).map(([label, data]) => {
        if (!data.coord) return null;

        let cx;
        let cy;
        let dx;
        let dy;
        let textAnchor;

        if (label === "4C") {
          const pos = computeC4CushionCenterLabelPosition({
            rawX: data.coord.x,
            rawY: data.coord.y,
            isFg: data.isFg,
            scale,
            tableH,
            padding,
          });
          cx = pos.cx;
          cy = pos.cy;
          dx = pos.dx;
          dy = pos.dy;
          textAnchor = pos.textAnchor;
        } else if (VECTOR_LABELS.has(label)) {
          const mark = VECTOR_LABEL_MARK[label];
          const pos = computeCushionVectorLabelPosition({
            rawX: data.coord.x,
            rawY: data.coord.y,
            isFg: data.isFg,
            mark,
            scale,
            tableH,
            padding,
          });
          cx = pos.cx;
          cy = pos.cy;
          dx = pos.dx;
          dy = pos.dy;
          textAnchor = pos.textAnchor;
        } else {
          let dotX = data.coord.x;
          let dotY = data.coord.y;

          if (data.isFg) {
            if (Math.abs(dotY - 42.25) < 0.5) dotY = 40;
            else if (Math.abs(dotY - (-2.25)) < 0.5) dotY = 0;
          }

          const p = toPx({ x: dotX, y: dotY }, scale, tableH);
          cx = p.x + padding;
          cy = p.y + padding;
          dx = 0;
          dy = 0;
          textAnchor = "middle";

          if (Math.abs(dotY - 40) < 0.5) dy = -10;
          else if (Math.abs(dotY - 0) < 0.5) dy = 17.5;

          if (Math.abs(dotX - 0) < 0.5) {
            dx = -10;
            textAnchor = "end";
          } else if (Math.abs(dotX - 80) < 0.5) {
            dx = 10;
            textAnchor = "start";
          }
        }

        const systemValue =
          typeof label === "string" && systemValues?.[label] != null
            ? systemValues[label]
            : null;

        return (
          <AnchorPoint
            key={label}
            cx={cx}
            cy={cy}
            dx={dx}
            dy={dy}
            textAnchor={textAnchor}
            label={label}
            displayLabel={cushionMarkToDisplayLabel(label)}
            systemValue={systemValue}
            onDoubleClick={onAnchorDoubleClick}
          />
        );
      })}
    </>
  );
}
