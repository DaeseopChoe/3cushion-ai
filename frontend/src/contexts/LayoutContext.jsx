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
      const availableW = window.innerWidth;
      const availableH = window.innerHeight;
      const newLayout = calculateLayout(availableW, availableH);

      setLayout((prev) => {
        if (!prev) return newLayout;
        if (
          prev.stageWidth === newLayout.stageWidth &&
          prev.stageHeight === newLayout.stageHeight &&
          prev.mode === newLayout.mode
        ) {
          return prev;
        }
        return newLayout;
      });
    };

    updateLayout();
    window.addEventListener('resize', updateLayout);
    window.addEventListener('orientationchange', updateLayout);

    return () => {
      window.removeEventListener('resize', updateLayout);
      window.removeEventListener('orientationchange', updateLayout);
    };
  }, []);

  // ============================================
  // Context 제공
  // ============================================
  return (
    <LayoutContext.Provider value={layout}>
      {children}
    </LayoutContext.Provider>
  );
}
