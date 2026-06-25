import React from "react";

// 순수 렌더 전용. 계산/모드 판단은 App에서 수행 후 props로 전달
export default function CoachingOverlay({
  guideLine,
  impactBallPx,
  impactBallRadius,
  impactBallOpacity,
  onImpactBallDoubleClick,
  impactBallCursor
}) {
  if (!impactBallPx) return null;

  return (
    <>
      {guideLine}
      <circle
        cx={impactBallPx.cx}
        cy={impactBallPx.cy}
        r={impactBallRadius}
        fill="#F3F4F6"
        opacity={impactBallOpacity ?? 0.6}
        shapeRendering="geometricPrecision"
        pointerEvents="all"
        onDoubleClick={onImpactBallDoubleClick}
        style={{ cursor: impactBallCursor }}
      />
    </>
  );
}
