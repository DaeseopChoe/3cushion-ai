import React from "react";

export default function TableGrid({ tableWUnits, tableHUnits, scale, padding, tableW, tableH }) {
  const lines = [];
  for (let i = 0; i <= tableWUnits; i++) {
    lines.push(<line key={`v-${i}`} x1={i * scale + padding} y1={padding} x2={i * scale + padding} y2={tableH + padding} stroke="#ffffff20" strokeWidth={0.4} />);
  }
  for (let i = 0; i <= tableHUnits; i++) {
    lines.push(<line key={`h-${i}`} x1={padding} y1={i * scale + padding} x2={tableW + padding} y2={i * scale + padding} stroke="#ffffff20" strokeWidth={0.4} />);
  }
  return <g>{lines}</g>;
}
