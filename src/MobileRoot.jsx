import React from "react";
import MobileWrapper from "./MobileWrapper";

/**
 * MobileRoot.jsx
 * 
 * 역할: Pure Viewer (계산·해석·판단 없음)
 * 입력: contract (읽기 전용)
 * 출력: SVG 렌더링만
 */

export default function MobileRoot({ contract, onIntent }) {
  if (!contract) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100">
        <div className="text-red-400">Contract 없음</div>
      </div>
    );
  }

  const { table } = contract;

  // ========================================
  // SVG 렌더링 (contract 데이터만 사용)
  // ========================================
  const tableSVG = (
    <svg 
      width={1000}
      height={600}
      className="bg-slate-900/80 rounded-2xl shadow-xl"
    >
      {/* 마커 */}
      {(table.markers || []).map(marker => (
        <circle 
          key={marker.id} 
          cx={marker.cx} 
          cy={marker.cy} 
          r={marker.r} 
          fill={marker.fill} 
          stroke={marker.stroke} 
          strokeWidth={marker.strokeWidth}
        />
      ))}
      
      {/* 선 (polyline만 사용) */}
      {(table.lines || []).map(line => (
        <polyline 
          key={line.id} 
          points={line.points} 
          stroke={line.stroke} 
          strokeWidth={line.strokeWidth} 
          strokeDasharray={line.strokeDasharray}
          opacity={line.opacity}
          fill={line.fill || "none"}
        />
      ))}
      
      {/* 공 */}
      {(table.balls || []).map(ball => (
        <circle 
          key={ball.id} 
          cx={ball.cx} 
          cy={ball.cy} 
          r={ball.r} 
          fill={ball.fill} 
          stroke={ball.stroke} 
          strokeWidth={ball.strokeWidth}
        />
      ))}
      
      {/* 라벨 */}
      {(table.labels || []).map(label => (
        <text 
          key={label.id} 
          x={label.x} 
          y={label.y} 
          fontSize={label.fontSize} 
          fill={label.fill} 
          fontWeight={label.fontWeight}
          textAnchor={label.textAnchor}
        >
          {label.text}
        </text>
      ))}
    </svg>
  );

  // ========================================
  // MobileWrapper에 전달 (children 방식)
  // ========================================
  return <MobileWrapper>{tableSVG}</MobileWrapper>;
}
