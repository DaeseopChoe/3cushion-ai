import React from "react";

/**
 * TrajectoryExtensionLayer — SVG Overlay (P2-6).
 *
 * Solid Extension path. ADMIN/USER: red solid (#ff4444).
 * ADMIN only: yellow Handles/✔.
 * Handles: pointerEvents="none" (SVG hit-test + Capture).
 */

const CHECK_OFFSET_X = 14;
const CHECK_OFFSET_Y = -14;

export default function TrajectoryExtensionLayer({
  revealPointsAttr,
  extensionPolylines,
  handles,
  showHandles = false,
  pathStroke = "#ffffff",
}) {
  const hasReveal =
    typeof revealPointsAttr === "string" && revealPointsAttr.length > 0;
  const lines = Array.isArray(extensionPolylines) ? extensionPolylines : [];
  const handleList = Array.isArray(handles) ? handles : [];
  if (!hasReveal && lines.length === 0 && handleList.length === 0) {
    return null;
  }

  const stroke = pathStroke || "#ffffff";

  return (
    <g className="trajectory-extension-layer" pointerEvents="none">
      {hasReveal ? (
        <polyline
          points={revealPointsAttr}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          opacity={0.9}
          pointerEvents="none"
        />
      ) : null}
      {lines.map((line) => (
        <polyline
          key={line.id || `ext-${line.index}`}
          points={line.pointsAttr}
          fill="none"
          stroke={stroke}
          strokeWidth={2}
          opacity={1}
          pointerEvents="none"
        />
      ))}
      {showHandles
        ? handleList.map((h) => (
            <g
              key={h.id || `ext-handle-${h.index}`}
              className="trajectory-extension-handle"
              data-extension-handle={h.index}
              pointerEvents="none"
            >
              <circle
                cx={h.cx}
                cy={h.cy}
                r={h.r}
                fill={h.fill}
                stroke={h.stroke}
                strokeWidth={h.strokeWidth}
                opacity={h.opacity}
                pointerEvents="none"
              />
              {h.active ? (
                <text
                  x={h.cx + CHECK_OFFSET_X}
                  y={h.cy + CHECK_OFFSET_Y}
                  fill="#67e8f9"
                  fontSize={18}
                  fontWeight="bold"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  style={{ pointerEvents: "none", userSelect: "none" }}
                >
                  ✓
                </text>
              ) : null}
            </g>
          ))
        : null}
    </g>
  );
}
