import React from "react";

export default function SystemValueText({
  x,
  y,
  label,
  value,
  fontSize = 16
}) {
  return (
    <text
      x={x}
      y={y}
      fontSize={fontSize}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="middle"
      style={{
        pointerEvents: "none",
        userSelect: "none",
        opacity: 0.9
      }}
    >
      {`${label}_${value}`}
    </text>
  );
}
