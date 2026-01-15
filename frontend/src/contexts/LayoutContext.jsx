import React, { createContext, useState, useEffect } from "react";
import { calculateLayout } from "../utils/layoutCalculator";

/**
 * Phase G-2 정리: Layout Context
 * 
 * 변경사항:
 * - Mobile viewport 해석 로직 제거
 * - PC/Mobile 모두 실제 viewport 기준으로 Stage 크기 계산
 * - 회전 해석은 MobileWrapper가 담당 (책임 분리)
 */
export const LayoutContext = createContext(null);

export function LayoutProvider({ children }) {
  const [layout, setLayout] = useState(null);

  // ============================================
  // Layout 계산 및 갱신
  // ============================================
  useEffect(() => {
    const updateLayout = () => {
      // PC/Mobile 구분 없이 항상 실제 viewport 사용
      const availableW = window.innerWidth;
      const availableH = window.innerHeight;

      // Stage 크기 계산
      const newLayout = calculateLayout(availableW, availableH);
      setLayout(newLayout);

      console.log('🎨 LayoutContext 업데이트:', {
        viewport: `${availableW}×${availableH}`,
        stage: `${newLayout.stageWidth.toFixed(0)}×${newLayout.stageHeight.toFixed(0)}`,
        mode: newLayout.mode,
      });
    };

    // 초기 계산
    updateLayout();

    // resize + orientationchange 이벤트 리스닝
    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', updateLayout);

    return () => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
    };
  }, []); // isPC, isMobile 의존성 제거

  // ============================================
  // Context 제공
  // ============================================
  return (
    <LayoutContext.Provider value={layout}>
      {children}
    </LayoutContext.Provider>
  );
}
