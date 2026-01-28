// /frontend/admin/hpt/ImpactBallLayer.tsx

import type { Point } from "@/data/system/calculator/types";

interface Props {
  cue: Point | null;
  impact: Point | null;
  color: string;
  opacity: number;
  scale?: number;       // Rg → 픽셀 변환 스케일 (기본값: 1)
  padding?: number;     // SVG 패딩 (기본값: 0)
}

/**
 * ImpactBall 레이어
 * 
 * - 큐 → 임팩트 점선
 * - ImpactBall 원
 * - Rg 좌표 입력, SVG 좌표계로 자동 변환
 */
export function ImpactBallLayer({
  cue,
  impact,
  color,
  opacity,
  scale = 1,
  padding = 0,
}: Props) {
  if (!cue || !impact) return null;
  
  // 당구공 반지름 (Rg)
  const BALL_RADIUS_RG = 1.43;
  
  // Rg → 픽셀 변환
  const toPixel = (point: Point) => ({
    x: point.x * scale + padding,
    y: point.y * scale + padding,
  });
  
  const cuePixel = toPixel(cue);
  const impactPixel = toPixel(impact);
  const radiusPixel = BALL_RADIUS_RG * scale;

  return (
    <>
      {/* Cue → Impact 점선 */}
      <line
        x1={cuePixel.x}
        y1={cuePixel.y}
        x2={impactPixel.x}
        y2={impactPixel.y}
        stroke="white"
        strokeDasharray="4 4"
        strokeWidth={2}
        opacity={0.6}
        pointerEvents="none"
      />

      {/* ImpactBall */}
      <circle
        cx={impactPixel.x}
        cy={impactPixel.y}
        r={radiusPixel}
        fill={color}
        opacity={opacity}
        stroke="rgba(255, 255, 255, 0.3)"
        strokeWidth={1}
        pointerEvents="none"
      />
    </>
  );
}
