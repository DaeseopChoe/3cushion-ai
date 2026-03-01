import React from "react";

// 좌표 변환은 App.jsx에서 수행 후 cx, cy, r 전달
export default function Ball({ cx, cy, r, color, opacity = 1, ...eventProps }) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={color}
      opacity={opacity}
      shapeRendering="geometricPrecision"
      pointerEvents="all"
      {...eventProps}
    />
  );
}
