import React from "react";

// 순수 렌더링 전용. 좌표 변환은 App.jsx에서 수행 후 cx, cy 전달
export default function AnchorPoint({ cx, cy, dx, dy, textAnchor, label, systemValue, onDoubleClick }) {
  return (
    <g
      onDoubleClick={(e) => {
        e.stopPropagation();
        onDoubleClick?.(label);
      }}
      style={{ cursor: onDoubleClick ? "pointer" : undefined }}
    >
      <circle cx={cx} cy={cy} r={2.5} fill="#facc15" />
      <text
        x={cx + dx}
        y={cy + dy}
        fill="#facc15"
        textAnchor={textAnchor}
        dominantBaseline="middle"
        fontWeight="bold"
      >
        <tspan fontSize={20}>{label}</tspan>
        {systemValue != null && (
          <tspan fontSize={20}>{" "}_{systemValue}</tspan>
        )}
      </text>
    </g>
  );
}
