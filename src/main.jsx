import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import MobileRoot from './MobileRoot';

/**
 * ⚠️ CSS 로드 순서 중요
 */
import './index.css';
import './App.css';   // ✅ 반드시 필요 (지금 빠져 있음)

// ============================================
// 모바일 기기 감지
// ============================================
function isMobileDevice() {
  const ua = navigator.userAgent || navigator.vendor || window.opera;
  return /iPhone|iPad|iPod|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(ua);
}

const IS_MOBILE = isMobileDevice();

// ============================================
// 모바일일 때 body에 class 추가
// ============================================
if (IS_MOBILE) {
  document.body.classList.add("mobile-root");
}

console.log(`🎯 기기 감지: ${IS_MOBILE ? "Mobile" : "PC"}`);

// ============================================
// 최상위 렌더 분기
// ============================================
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {IS_MOBILE ? <MobileRoot /> : <App />}
  </React.StrictMode>
);
