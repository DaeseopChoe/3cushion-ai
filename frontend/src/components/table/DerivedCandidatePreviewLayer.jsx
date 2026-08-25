/**
 * Preview-only Derived Candidate markers for Review.
 * Does not alter trajectory geometry or ballsState.
 */

import { toPx } from "../../utils/geometry/coords";

export default function DerivedCandidatePreviewLayer({
  markers = [],
  scale,
  tableH,
  padding,
  ballRadiusRg,
  markerOpacity = 0.5,
  dataAttr = "1",
}) {
  if (!Array.isArray(markers) || markers.length === 0) return null;

  const stroke = "rgba(255,255,255,0.85)";
  const fill = "rgba(255,255,255,0.12)";

  return (
    <g data-derived-preview={dataAttr} pointerEvents="none">
      {markers.map((marker) => {
        const p = toPx(marker.cue, scale, tableH);
        const cx = p.x + padding;
        const cy = p.y + padding;
        const r = ballRadiusRg * scale;
        return (
          <g key={`${marker.track}:${marker.derivedStep}:${marker.memberId}`}>
            <circle
              cx={cx}
              cy={cy}
              r={r}
              fill={fill}
              stroke={stroke}
              strokeWidth={1.5}
              opacity={markerOpacity}
            />
            <text
              x={cx}
              y={cy - r - 3}
              textAnchor="middle"
              fill="rgba(255,255,255,0.9)"
              fontSize={9}
              fontFamily="ui-sans-serif, system-ui, sans-serif"
              opacity={Math.min(1, markerOpacity + 0.25)}
            >
              {marker.tLabel}
            </text>
          </g>
        );
      })}
    </g>
  );
}
