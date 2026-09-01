/**
 * Read-only HP/T ball visualization (extracted from App.jsx HptOverlay SVG).
 * No drag, inputs, or Admin overlay coupling.
 */

import {
  BALL_RADIUS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CENTER_Y,
  computeHptVizGeometry,
} from "../../domain/hptVizGeometry";

export {
  parseThickness,
  BALL_RADIUS,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  CENTER_Y,
  CENTER_X,
  MAX_VALUE,
  computeHptVizGeometry,
} from "../../domain/hptVizGeometry";

export default function HptBallReadOnlyViz({ T = "8/8", hitX = 0, hitY = 0 }) {
  const {
    targetX,
    impactX,
    limit60Radius,
    markerX,
    markerY,
    markerRadius,
  } = computeHptVizGeometry(T, hitX, hitY);

  return (
    <div className="user-hpt-viz-wrap">
      <svg
        viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`}
        width="100%"
        height="auto"
        aria-hidden
        preserveAspectRatio="xMidYMid meet"
      >
        <circle
          data-testid="hpt-target-ball"
          cx={targetX}
          cy={CENTER_Y}
          r={BALL_RADIUS}
          fill="#ef4444"
          stroke="#991b1b"
          strokeWidth="3"
        />
        <circle
          data-testid="hpt-impact-ball"
          cx={impactX}
          cy={CENTER_Y}
          r={BALL_RADIUS}
          fill="#ffffff"
          stroke="#1f2937"
          strokeWidth="3"
        />
        <circle
          cx={impactX}
          cy={CENTER_Y}
          r={limit60Radius}
          fill="none"
          stroke="#d1d5db"
          strokeWidth="1.5"
          strokeDasharray="6,3"
          opacity="0.6"
        />
        <line
          x1={impactX - limit60Radius}
          y1={CENTER_Y}
          x2={impactX + limit60Radius}
          y2={CENTER_Y}
          stroke="#d1d5db"
          strokeWidth="1"
          opacity="0.5"
        />
        <line
          x1={impactX}
          y1={CENTER_Y - limit60Radius}
          x2={impactX}
          y2={CENTER_Y + limit60Radius}
          stroke="#d1d5db"
          strokeWidth="1"
          opacity="0.5"
        />
        <circle cx={impactX} cy={CENTER_Y} r="3" fill="#6b7280" opacity="0.7" />
        <circle
          cx={markerX}
          cy={markerY}
          r={markerRadius}
          fill="#000000"
          stroke="#ffffff"
          strokeWidth="1.5"
        />
      </svg>
    </div>
  );
}
