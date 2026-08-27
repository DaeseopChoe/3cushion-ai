import React from "react";
import { toPx } from "../../utils/geometry/coords";
import { getBaselineFineNudgeArrowDescriptors } from "../../interaction/baselineFineNudgePolicy";

const BASELINE_FINE_ARROW_GLYPHS = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

export default function BaselineFineNudgeLayer({
  coRg,
  coAxis,
  c1Rg,
  c1Axis,
  scale,
  tableH,
  padding,
}) {
  const arrows = [
    ...getBaselineFineNudgeArrowDescriptors({
      mark: "CO",
      coord: coRg,
      axis: coAxis,
    }),
    ...getBaselineFineNudgeArrowDescriptors({
      mark: "C1",
      coord: c1Rg,
      axis: c1Axis,
    }),
  ];

  if (arrows.length === 0) return null;

  return (
    <g
      data-baseline-fine-nudge-layer="1"
      pointerEvents="none"
      aria-hidden="true"
    >
      {arrows.map((arrow) => {
        const arrowPx = toPx(arrow.point, scale, tableH);
        return (
          <text
            key={`${arrow.mark}-${arrow.direction}`}
            data-baseline-fine-arrow={`${arrow.mark}-${arrow.direction}`}
            x={arrowPx.x + padding}
            y={arrowPx.y + padding}
            fill="#e0f2fe"
            fontSize={14}
            fontWeight="700"
            textAnchor="middle"
            dominantBaseline="middle"
            pointerEvents="none"
          >
            {BASELINE_FINE_ARROW_GLYPHS[arrow.direction]}
          </text>
        );
      })}
    </g>
  );
}
