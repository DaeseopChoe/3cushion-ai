import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import Stage from "./components/Stage.jsx";
import { LayoutProvider } from "./contexts/LayoutContext.jsx";
import "./index.css";
import "./styles/stage-layout.css";
// import "./styles/mobile-layout.css";  // Phase 1: 임시 비활성화

// Phase F: Service Worker 비활성화
// import { registerServiceWorker } from "./registerSW.js";
// registerServiceWorker();

// ============================================
// Phase G-2 정리: PC 기준 Stage 단독 렌더링
// ============================================

/**
 * Phase 1: Mobile 분기 완전 제거
 * - PC Stage 단독 렌더링 확정
 * - Mobile은 Phase 2에서 재구현
 */
function RootWrapper() {
  // 버튼 클릭 핸들러
  const [currentButtonId, setCurrentButtonId] = useState(null);

  const handleButtonClick = (buttonId) => {
    console.log('🎯 Button clicked:', buttonId);
    setCurrentButtonId(buttonId);
    
    // TODO: App으로 전달하여 오버레이 표시
  };

  console.log('🖥️ Phase G-2 정리: PC Stage 단독 렌더링 모드');

  // ============================================
  // Phase 1: PC 기준 렌더링만
  // ============================================
  return (
    <LayoutProvider>
      <Stage onButtonClick={handleButtonClick}>
        <App currentButtonId={currentButtonId} />
      </Stage>
    </LayoutProvider>
  );
}

// ============================================
// React Root 렌더링
// ============================================
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootWrapper />
  </React.StrictMode>
);
