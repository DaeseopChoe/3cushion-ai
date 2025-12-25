import React, { useEffect, useMemo, useState } from "react";

const BUTTON_COL_W = 32;          // 좌측 버튼 컬럼 폭 (축소: 36→32)
const BTN_SIZE = 22;              // 버튼 정사각 크기 (축소: 28→22, 약 2/3)
const TABLE_ASPECT = 2;           // 2:1 (W:H)
const OCCUPY_TARGET = 0.90;       // 기본 목표 점유율
const OCCUPY_MIN = 0.85;
const OCCUPY_MAX = 0.95;

export default function MobileWrapper({
  tableSVG,
  tableWidth = 1000,
  tableHeight = 600,
}) {
  // ✅ viewport state 단순화: vw만 관리
  const [vw, setVw] = useState(() => window.innerWidth);

  // 버튼 상태
  const [overlayContent, setOverlayContent] = useState(null);
  const [activeStrategy, setActiveStrategy] = useState("S1");

  // ✅ resize 이벤트만 사용 (orientationchange 제거)
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  /**
   * ✅ scale 계산 (width only)
   * - vh 기반 height 제한 제거
   * - availableW 기준으로만 85~95% 점유 목표
   */
  const layout = useMemo(() => {
    // vw undefined 방어
    const safeVw = vw ?? window.innerWidth;
    const availableW = Math.max(0, safeVw - BUTTON_COL_W);

    // 1) width 기준 목표 점유율(0.9)
    let targetW = availableW * OCCUPY_TARGET;

    // 2) clamp(0.85~0.95)
    targetW = Math.min(
      availableW * OCCUPY_MAX,
      Math.max(availableW * OCCUPY_MIN, targetW)
    );

    // 3) scale 계산 (width 기준만)
    const scale = tableWidth > 0 ? targetW / tableWidth : 1;

    // 안전성 체크
    const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 1;

    return {
      availableW,
      targetW,
      scale: safeScale,
    };
  }, [vw, tableWidth]);

  // 버튼 핸들러
  const onStrategy = (id) => {
    setActiveStrategy(id);
    setOverlayContent(null);
  };

  const onInfo = (id) => {
    setOverlayContent((prev) => (prev === id ? null : id));
  };

  return (
    <div className="fixed inset-0 bg-slate-900 flex" style={{ flexDirection: "row" }}>
      {/* 좌측 버튼 컬럼 */}
      <div
        className="flex-shrink-0 bg-slate-800/50 flex flex-col justify-center gap-1 p-1"
        style={{ width: BUTTON_COL_W }}
      >
        {[
          { id: "S1", label: "S-1", cls: "bg-emerald-600" },
          { id: "S2", label: "S-2", cls: "bg-emerald-600" },
          { id: "S3", label: "S-3", cls: "bg-emerald-600" },
        ].map((b) => (
          <button
            key={b.id}
            onClick={() => onStrategy(b.id)}
            className={`${b.cls} text-white font-bold text-[9px] rounded-md transition-all ${
              activeStrategy === b.id ? "ring-1 ring-white" : "opacity-60"
            }`}
            style={{
              width: BTN_SIZE,
              height: BTN_SIZE,
              padding: 0,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {b.label}
          </button>
        ))}

        <div className="h-px bg-slate-600 my-0.5" />

        {[
          { id: "SYS", label: "SYS", cls: "bg-amber-600" },
          { id: "HPT", label: "HP/T", cls: "bg-amber-600" },
          { id: "STR", label: "STR", cls: "bg-amber-600" },
          { id: "AI", label: "AI", cls: "bg-orange-600" },
        ].map((b) => (
          <button
            key={b.id}
            onClick={() => onInfo(b.id)}
            className={`${b.cls} text-white font-bold text-[9px] rounded-md transition-all ${
              overlayContent === b.id ? "ring-1 ring-white" : "opacity-60"
            }`}
            style={{
              width: BTN_SIZE,
              height: BTN_SIZE,
              padding: 0,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {b.label}
          </button>
        ))}
      </div>

      {/* 당구대 viewport */}
      <div className="flex-1 flex items-center justify-center overflow-hidden">
        {/* transform 1회만 */}
        <div
          style={{
            transform: `scale(${layout.scale})`,
            transformOrigin: "center center",
            width: tableWidth,
            height: tableHeight,
          }}
        >
          {tableSVG}
        </div>
      </div>

      {/* ✅ 정보 패널 overlay (버튼 클릭 시에만 표시) */}
      <div
        className="absolute inset-0 bg-slate-900/60 flex items-center justify-center"
        style={{
          opacity: overlayContent ? 1 : 0,
          pointerEvents: overlayContent ? 'auto' : 'none',
          zIndex: 45,
        }}
        onClick={() => setOverlayContent(null)}
      >
        {overlayContent && (
          <div
            className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4"
            style={{ maxHeight: '80vh' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 패널 헤더 */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
              <h2 className="text-lg font-bold text-slate-900">
                {overlayContent}
              </h2>
              <button
                onClick={() => setOverlayContent(null)}
                className="text-slate-400 hover:text-slate-900 text-2xl leading-none w-8 h-8 flex items-center justify-center"
              >
                ×
              </button>
            </div>

            {/* 패널 내용 (placeholder) */}
            <div className="p-6">
              <p className="text-slate-600 text-center">
                {overlayContent} 정보 준비중
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
