import React from "react";
import { toPx } from "../../utils/geometry/coords";
import {
  BALL_GUIDE_HANDLE_VISUAL_RADIUS_RG,
  BALL_GUIDE_TRIANGLE_VISUAL_HALF_RG,
  getBallGuideSnapAction,
  getBallGuideTriangleDescriptors,
} from "../../interaction/ballGuideInteractionPolicy";

const GUIDE_STROKE = "#38bdf8";
const GUIDE_SNAP_ACTION_RADIUS_PX = 12;

function trianglePolygonPoints(cx, cy, halfSize, direction) {
  const s = halfSize;
  switch (direction) {
    case "left":
      return `${cx - s},${cy} ${cx + s},${cy - s} ${cx + s},${cy + s}`;
    case "right":
      return `${cx + s},${cy} ${cx - s},${cy - s} ${cx - s},${cy + s}`;
    case "up":
      return `${cx},${cy - s} ${cx - s},${cy + s} ${cx + s},${cy + s}`;
    case "down":
    default:
      return `${cx},${cy + s} ${cx - s},${cy - s} ${cx + s},${cy - s}`;
  }
}

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

  const tableWidthRg = tableW / scale;
  const tableHeightRg = tableH / scale;
  const handleRadiusPx = BALL_GUIDE_HANDLE_VISUAL_RADIUS_RG * scale;
  const triangleHalfPx = BALL_GUIDE_TRIANGLE_VISUAL_HALF_RG * scale;

  const horizontalStart = toPx({ x: 0, y: horizontalY }, scale, tableH);
  const horizontalEnd = toPx(
    { x: tableWidthRg, y: horizontalY },
    scale,
    tableH
  );
  const verticalStart = toPx({ x: verticalX, y: 0 }, scale, tableH);
  const verticalEnd = toPx(
    { x: verticalX, y: tableHeightRg },
    scale,
    tableH
  );
  const triangles = getBallGuideTriangleDescriptors(
    { active, ballId, horizontalY, verticalX },
    tableWidthRg,
    tableHeightRg
  );
  const snapAction = getBallGuideSnapAction(
    { active, ballId, horizontalY, verticalX },
    tableWidthRg,
    tableHeightRg
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
        r={handleRadiusPx}
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
        r={handleRadiusPx}
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
        r={handleRadiusPx}
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
        r={handleRadiusPx}
        fill={GUIDE_STROKE}
        stroke="#e0f2fe"
        strokeWidth={1}
        opacity={0.95}
        pointerEvents="none"
      />
      {triangles.map((triangle) => {
        const trianglePx = toPx(triangle.point, scale, tableH);
        const cx = trianglePx.x + padding;
        const cy = trianglePx.y + padding;
        return (
          <polygon
            key={`${triangle.axis}-${triangle.direction}`}
            data-ball-guide-triangle={triangle.direction}
            data-ball-guide-triangle-axis={triangle.axis}
            points={trianglePolygonPoints(
              cx,
              cy,
              triangleHalfPx,
              triangle.direction
            )}
            fill="#0ea5e9"
            stroke="#e0f2fe"
            strokeWidth={1.5}
            opacity={0.92}
            pointerEvents="none"
          />
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
