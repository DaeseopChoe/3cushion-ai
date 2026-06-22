/**
 * Read-only HP/T ball visualization (extracted from App.jsx HptOverlay SVG).
 * No drag, inputs, or Admin overlay coupling.
 */

function parseThickness(tValue) {
  if (!tValue) return 0;
  if (tValue === "8/8") return 8;
  const match = String(tValue).match(/^([+-]?)(\d+)\/8$/);
  if (!match) return 0;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * parseInt(match[2], 10);
}

const BALL_RADIUS = 120;
const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 300;
const CENTER_Y = CANVAS_HEIGHT / 2;
const CENTER_X = CANVAS_WIDTH / 2;
const MAX_VALUE = 4;

export default function HptBallReadOnlyViz({ T = "8/8", hitX = 0, hitY = 0 }) {
  const thickness = parseThickness(T);
  const isRightImpact = thickness >= 0;
  const thicknessValue = T === "BANK" ? 8 : Math.abs(thickness);
  const thicknessFraction = thicknessValue / 8;
  const centerDistance = (1 - thicknessFraction) * (2 * BALL_RADIUS);

  let impactX;
  let targetX;
  if (isRightImpact) {
    impactX = CENTER_X + centerDistance / 2;
    targetX = CENTER_X - centerDistance / 2;
  } else {
    impactX = CENTER_X - centerDistance / 2;
    targetX = CENTER_X + centerDistance / 2;
  }

  const limit60Radius = BALL_RADIUS * 0.6;
  const scale = limit60Radius / MAX_VALUE;
  const markerX = impactX + hitX * scale;
  const markerY = CENTER_Y - hitY * scale;
  const markerRadius = BALL_RADIUS / 12;

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
          cx={targetX}
          cy={CENTER_Y}
          r={BALL_RADIUS}
          fill="#ef4444"
          stroke="#991b1b"
          strokeWidth="3"
        />
        <circle
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
