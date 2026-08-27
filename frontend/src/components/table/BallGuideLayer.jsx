import React from "react";
import { toPx } from "../../utils/geometry/coords";
import {
  getBallGuideArrowDescriptors,
  getBallGuideSnapAction,
} from "../../interaction/ballGuideInteractionPolicy";

const GUIDE_STROKE = "#38bdf8";
const GUIDE_HANDLE_RADIUS_PX = 4;
const GUIDE_SNAP_ACTION_RADIUS_PX = 12;
const GUIDE_ARROW_GLYPHS = {
  up: "↑",
  down: "↓",
  left: "←",
  right: "→",
};

export default function BallGuideLayer({
  active,
  ballId,
  horizontalY,
  verticalX,
  scale,
  tableW,
  tableH,
  padding,
}) {
  if (
    !active ||
    !Number.isFinite(horizontalY) ||
    !Number.isFinite(verticalX)
  ) {
    return null;
  }

  const horizontalStart = toPx({ x: 0, y: horizontalY }, scale, tableH);
  const horizontalEnd = toPx(
    { x: tableW / scale, y: horizontalY },
    scale,
    tableH
  );
  const verticalStart = toPx({ x: verticalX, y: 0 }, scale, tableH);
  const verticalEnd = toPx(
    { x: verticalX, y: tableH / scale },
    scale,
    tableH
  );
  const arrows = getBallGuideArrowDescriptors(
    { active, horizontalY, verticalX },
    tableW / scale,
    tableH / scale
  );
  const snapAction = getBallGuideSnapAction(
    { active, ballId, horizontalY, verticalX },
    tableW / scale,
    tableH / scale
  );

  return (
    <g
      data-ball-guide-layer="1"
      pointerEvents="none"
      aria-hidden="true"
    >
      <line
        data-ball-guide-horizontal="1"
        x1={horizontalStart.x + padding}
        y1={horizontalStart.y + padding}
        x2={horizontalEnd.x + padding}
        y2={horizontalEnd.y + padding}
        stroke={GUIDE_STROKE}
        strokeWidth={1.2}
        strokeDasharray="6 4"
        opacity={0.72}
      />
      <line
        data-ball-guide-vertical="1"
        x1={verticalStart.x + padding}
        y1={verticalStart.y + padding}
        x2={verticalEnd.x + padding}
        y2={verticalEnd.y + padding}
        stroke={GUIDE_STROKE}
        strokeWidth={1.2}
        strokeDasharray="6 4"
        opacity={0.72}
      />
      <circle
        data-ball-guide-horizontal-handle="start"
        cx={horizontalStart.x + padding}
        cy={horizontalStart.y + padding}
        r={GUIDE_HANDLE_RADIUS_PX}
        fill={GUIDE_STROKE}
        stroke="#e0f2fe"
        strokeWidth={1}
        opacity={0.95}
        pointerEvents="none"
      />
      <circle
        data-ball-guide-horizontal-handle="end"
        cx={horizontalEnd.x + padding}
        cy={horizontalEnd.y + padding}
        r={GUIDE_HANDLE_RADIUS_PX}
        fill={GUIDE_STROKE}
        stroke="#e0f2fe"
        strokeWidth={1}
        opacity={0.95}
        pointerEvents="none"
      />
      <circle
        data-ball-guide-vertical-handle="start"
        cx={verticalStart.x + padding}
        cy={verticalStart.y + padding}
        r={GUIDE_HANDLE_RADIUS_PX}
        fill={GUIDE_STROKE}
        stroke="#e0f2fe"
        strokeWidth={1}
        opacity={0.95}
        pointerEvents="none"
      />
      <circle
        data-ball-guide-vertical-handle="end"
        cx={verticalEnd.x + padding}
        cy={verticalEnd.y + padding}
        r={GUIDE_HANDLE_RADIUS_PX}
        fill={GUIDE_STROKE}
        stroke="#e0f2fe"
        strokeWidth={1}
        opacity={0.95}
        pointerEvents="none"
      />
      {arrows.map((arrow) => {
        const arrowPx = toPx(arrow.point, scale, tableH);
        return (
          <text
            key={`${arrow.axis}-${arrow.direction}`}
            data-ball-guide-arrow={arrow.direction}
            x={arrowPx.x + padding}
            y={arrowPx.y + padding}
            fill="#e0f2fe"
            fontSize={14}
            fontWeight="700"
            textAnchor="middle"
            dominantBaseline="middle"
            pointerEvents="none"
          >
            {GUIDE_ARROW_GLYPHS[arrow.direction]}
          </text>
        );
      })}
      {snapAction && (
        (() => {
          const actionPx = toPx(snapAction.point, scale, tableH);
          const cx = actionPx.x + padding;
          const cy = actionPx.y + padding;
          return (
            <g
              data-ball-guide-snap-action="1"
              transform={`translate(${cx} ${cy})`}
              pointerEvents="none"
            >
              <circle
                r={GUIDE_SNAP_ACTION_RADIUS_PX}
                fill="#0f172a"
                stroke="#facc15"
                strokeWidth={2}
                opacity={0.96}
              />
              <circle
                r={5}
                fill="none"
                stroke="#fef08a"
                strokeWidth={1.5}
              />
              <path
                d="M0 -8V-4M0 4V8M-8 0H-4M4 0H8"
                stroke="#fef08a"
                strokeWidth={1.5}
                strokeLinecap="round"
              />
            </g>
          );
        })()
      )}
    </g>
  );
}
