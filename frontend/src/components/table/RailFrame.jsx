import React from "react";

export default function RailFrame({ cushionRg, frameRg, pointOffsetRg, scale, padding, tableW, tableH, tableHUnits }) {
  const cushionW = cushionRg * scale;
  const frameW = frameRg * scale;
  const pointOffset = pointOffsetRg * scale;
  const outerRadius = 10; // 외곽 라운딩

  return (
    <g>
      {/* 프레임 전체 (단일 사각형, 외곽 라운딩) */}
      <rect
        x={padding - cushionW - frameW}
        y={padding - cushionW - frameW}
        width={tableW + 2 * (cushionW + frameW)}
        height={tableH + 2 * (cushionW + frameW)}
        fill="#6B3410"
        rx={outerRadius}
        ry={outerRadius}
      />

      {/* 쿠션 (진한 파란색) - 프레임 안쪽 전체 */}
      <rect
        x={padding - cushionW}
        y={padding - cushionW}
        width={tableW + 2 * cushionW}
        height={tableH + 2 * cushionW}
        fill="#1e40af"
      />

      {/* 당구대 (파란색) */}
      <rect
        x={padding}
        y={padding}
        width={tableW}
        height={tableH}
        fill="#2563eb"
      />

      {/* 포인트 (흰색) */}
      {[0, 10, 20, 30, 40, 50, 60, 70, 80].map((x) => (
        <React.Fragment key={`px-${x}`}>
          <circle cx={x * scale + padding} cy={tableH + padding + pointOffset} r={3} fill="#fff" />
          <circle cx={x * scale + padding} cy={padding - pointOffset} r={3} fill="#fff" />
        </React.Fragment>
      ))}
      {[0, 10, 20, 30, 40].map((y) => (
        <React.Fragment key={`py-${y}`}>
          <circle cx={padding - pointOffset} cy={(tableHUnits - y) * scale + padding} r={3} fill="#fff" />
          <circle cx={tableW + padding + pointOffset} cy={(tableHUnits - y) * scale + padding} r={3} fill="#fff" />
        </React.Fragment>
      ))}
    </g>
  );
}
