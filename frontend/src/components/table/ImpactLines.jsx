import React from "react";
import { toPx } from "../../utils/geometry/coords";

export default function ImpactLines({
  CO_line,
  C1_line,
  cushionPath,
  cushionPathAttr,
  scale,
  tableH,
  padding
}) {
  return (
    <>
      {CO_line && C1_line && (
        <line
          x1={toPx(CO_line, scale, tableH).x + padding}
          y1={toPx(CO_line, scale, tableH).y + padding}
          x2={toPx(C1_line, scale, tableH).x + padding}
          y2={toPx(C1_line, scale, tableH).y + padding}
          stroke="#fb923c"
          strokeWidth={2}
        />
      )}

      {cushionPath.length > 1 && (
        <polyline
          points={cushionPathAttr}
          stroke="#ef4444"
          strokeWidth={2}
          fill="none"
        />
      )}
    </>
  );
}
