/**
 * USER Calculation chrome — Overlay 밖 상단 4버튼.
 * Typography / padding: Overlay Layout tokens (table-area), same scale as CALC/AI Shell.
 */

import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import {
  AI_OVERLAY_MAX_HEIGHT_RATIO,
  AI_OVERLAY_WIDTH_RATIO,
  computeOverlayLayoutMetrics,
  OVERLAY_CONTENT_TYPE_SCALE,
} from "../../overlay/layout/overlayLayoutTokens";

function readTableAreaSize(el) {
  const tableArea = el?.closest?.(".table-area") ?? el;
  if (!tableArea) return { width: 0, height: 0 };
  const rect = tableArea.getBoundingClientRect();
  return {
    width: rect.width || tableArea.clientWidth || 0,
    height: rect.height || tableArea.clientHeight || 0,
  };
}

export default function UserCalcToolbar({
  cardSource = "baseline",
  onCardSourceChange,
  showAxisValues = false,
  onShowAxisValuesChange,
  calcOverlayVisible = true,
  onCalcOverlayVisibleChange,
}) {
  const rootRef = useRef(null);
  const [tableSize, setTableSize] = useState({ width: 0, height: 0 });

  const measure = useCallback(() => {
    const next = readTableAreaSize(rootRef.current);
    setTableSize((prev) =>
      prev.width === next.width && prev.height === next.height ? prev : next
    );
  }, []);

  const setRootNode = useCallback(
    (node) => {
      rootRef.current = node;
      if (!node) return;
      measure();
    },
    [measure]
  );

  useLayoutEffect(() => {
    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    let ro = null;
    const tableArea = rootRef.current?.closest(".table-area");
    if (tableArea && typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(onResize);
      ro.observe(tableArea);
    }
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      ro?.disconnect();
    };
  }, [measure]);

  const metrics = useMemo(
    () =>
      computeOverlayLayoutMetrics(
        tableSize.width,
        tableSize.height,
        "medium",
        OVERLAY_CONTENT_TYPE_SCALE.AI,
        {
          widthRatio: AI_OVERLAY_WIDTH_RATIO,
          maxHeightRatio: AI_OVERLAY_MAX_HEIGHT_RATIO,
        }
      ),
    [tableSize.width, tableSize.height]
  );

  const style = {
    "--uos-body": `${metrics.bodyPx}px`,
    "--uos-note": `${metrics.notePx}px`,
    "--uos-section": `${metrics.sectionPx}px`,
    "--uos-gap": `${metrics.gapPx}px`,
    "--uos-pad-v": `${metrics.padVPx}px`,
    "--uos-pad-h": `${metrics.padHPx}px`,
    "--uos-radius": `${metrics.radiusPx}px`,
    "--uos-line-height": String(metrics.lineHeight),
  };

  return (
    <div
      ref={setRootNode}
      className="user-calc-toolbar"
      role="toolbar"
      aria-label="계산 옵션"
      style={style}
      onClick={(e) => e.stopPropagation()}
    >
      <button
        type="button"
        role="tab"
        aria-selected={cardSource === "baseline"}
        className={
          cardSource === "baseline"
            ? "user-calc-toolbar__btn user-calc-toolbar__btn--active"
            : "user-calc-toolbar__btn"
        }
        onClick={() => onCardSourceChange?.("baseline")}
      >
        기준값
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={cardSource === "corrected"}
        className={
          cardSource === "corrected"
            ? "user-calc-toolbar__btn user-calc-toolbar__btn--active"
            : "user-calc-toolbar__btn"
        }
        onClick={() => onCardSourceChange?.("corrected")}
      >
        보정값
      </button>
      <button
        type="button"
        className={
          calcOverlayVisible
            ? "user-calc-toolbar__btn user-calc-toolbar__btn--active"
            : "user-calc-toolbar__btn"
        }
        aria-pressed={calcOverlayVisible}
        onClick={() => onCalcOverlayVisibleChange?.(!calcOverlayVisible)}
      >
        {calcOverlayVisible ? "계산 감추기" : "계산 보기"}
      </button>
      <button
        type="button"
        className={
          showAxisValues
            ? "user-calc-toolbar__btn user-calc-toolbar__btn--active"
            : "user-calc-toolbar__btn"
        }
        aria-pressed={showAxisValues}
        onClick={() => onShowAxisValuesChange?.(!showAxisValues)}
      >
        쿠션 포인트
      </button>
    </div>
  );
}
