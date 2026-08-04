/**
 * USER Overlay Shell — Layout Layer (Overlay Layout SSOT v1.1 + Reading Mode §15).
 * Owns size / surface / position / drag / clamp / backdrop-close / Reading Mode.
 * Close (X) removed — outside tap closes. Must not embed Content semantics.
 */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  computeOverlayLayoutMetrics,
  OVERLAY_SIZE_VARIANTS,
  resolveReadingOriginalAspect,
} from "../../overlay/layout/overlayLayoutTokens";

const DRAG_THRESHOLD_PX = 4;
const SUPPRESS_BACKDROP_CLICK_MS = 100;

/** Interactive controls keep click; everything else starts surface drag. */
const NO_DRAG_SELECTOR = [
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "label",
  '[data-overlay-no-drag="1"]',
].join(", ");

const snapPx = (value) => Math.round(value);

function readTableAreaSize(tableArea) {
  if (!tableArea) {
    return { width: 0, height: 0 };
  }
  const rect = tableArea.getBoundingClientRect();
  return {
    width: rect.width || tableArea.clientWidth || 0,
    height: rect.height || tableArea.clientHeight || 0,
  };
}

function ReadingModeToggleIcon({ active }) {
  return (
    <svg
      className="user-overlay-shell__reading-icon"
      viewBox="0 0 24 24"
      width="1em"
      height="1em"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="10.5"
        cy="10.5"
        r="6.25"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M15.2 15.2 L20 20"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      {active ? (
        <path
          d="M7.6 10.5 H13.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M10.5 7.6 V13.4 M7.6 10.5 H13.4"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      )}
    </svg>
  );
}

/**
 * @param {object} props
 * @param {boolean} [props.open]
 * @param {() => void} [props.onClose]
 * @param {import("react").ReactNode} props.children
 * @param {"small"|"medium"|"large"} [props.sizeVariant]
 * @param {"normal"|"strong"|"transparent"|"dark"|"glassDark"} [props.surface]
 * @param {number} [props.contentTypeScale]
 * @param {boolean} [props.fitContent]
 * @param {number} [props.widthRatio]
 * @param {number} [props.maxHeightRatio]
 * @param {string} [props.contentClassName] — Content CSS hook only (no Layout chrome)
 * @param {boolean} [props.draggable]
 * @param {string|number} [props.layoutKey] — reset to center when overlay identity changes
 */
export default function UserOverlayShell({
  open = true,
  onClose,
  children,
  sizeVariant = "medium",
  surface = "normal",
  contentTypeScale = 1,
  fitContent,
  widthRatio,
  maxHeightRatio,
  contentClassName = "",
  draggable = true,
  layoutKey,
}) {
  const sizeToken = OVERLAY_SIZE_VARIANTS[sizeVariant] ?? OVERLAY_SIZE_VARIANTS.medium;
  const useFitContent = fitContent ?? sizeToken.fitContent;

  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [panelPlacement, setPanelPlacement] = useState({ left: 0, top: 0 });
  const [tableSize, setTableSize] = useState({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  /** Reading Mode — Shell Presentation UX only (no localStorage). */
  const [readingMode, setReadingMode] = useState(false);

  const backdropRef = useRef(null);
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  const suppressBackdropClickRef = useRef(false);
  const offsetRef = useRef(offset);
  offsetRef.current = offset;
  /** Reading toggle only — capture rect before size change to keep center. */
  const readingCenterSnapshotRef = useRef(null);

  const setBackdropNode = useCallback((node) => {
    backdropRef.current = node;
    if (!node) return;
    const tableArea = node.closest(".table-area") ?? node;
    const next = readTableAreaSize(tableArea);
    setTableSize((prev) =>
      prev.width === next.width && prev.height === next.height ? prev : next
    );
  }, []);

  const readingOriginalAspect = useMemo(
    () => resolveReadingOriginalAspect(contentClassName),
    [contentClassName]
  );

  const metrics = useMemo(
    () =>
      computeOverlayLayoutMetrics(
        tableSize.width,
        tableSize.height,
        sizeVariant,
        contentTypeScale,
        { widthRatio, maxHeightRatio, readingMode, readingOriginalAspect }
      ),
    [
      tableSize.width,
      tableSize.height,
      sizeVariant,
      contentTypeScale,
      widthRatio,
      maxHeightRatio,
      readingMode,
      readingOriginalAspect,
    ]
  );

  const layoutReady = tableSize.width > 0 && tableSize.height > 0;

  /** Fixed-width shells: use target metrics width (not mid-transition offsetWidth). */
  const panelLayoutWidth = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return 0;
    if (!useFitContent && layoutReady && metrics.widthPx > 0) {
      return metrics.widthPx;
    }
    return panel.offsetWidth;
  }, [useFitContent, layoutReady, metrics.widthPx]);

  const measureTable = useCallback(() => {
    const backdrop = backdropRef.current;
    const tableArea = backdrop?.closest(".table-area") ?? backdrop;
    setTableSize(readTableAreaSize(tableArea));
  }, []);

  const clampOffset = useCallback(
    (x, y) => {
      const panel = panelRef.current;
      const backdrop = backdropRef.current;
      if (!panel || !backdrop) return { x: snapPx(x), y: snapPx(y) };

      const tableArea = backdrop.closest(".table-area") ?? backdrop;
      const tableRect = tableArea.getBoundingClientRect();
      const pw = panelLayoutWidth() || panel.offsetWidth;
      const ph = panel.offsetHeight;
      const inset = metrics.insetPx;

      const baseLeft = tableRect.left + (tableRect.width - pw) / 2;
      const baseTop = tableRect.top + (tableRect.height - ph) / 2;

      let left = baseLeft + x;
      let top = baseTop + y;

      const minLeft = tableRect.left + inset;
      const maxLeft = tableRect.right - pw - inset;
      const minTop = tableRect.top + inset;
      const maxTop = tableRect.bottom - ph - inset;

      if (minLeft <= maxLeft) {
        left = Math.max(minLeft, Math.min(left, maxLeft));
      } else {
        left = (minLeft + maxLeft) / 2;
      }
      if (minTop <= maxTop) {
        top = Math.max(minTop, Math.min(top, maxTop));
      } else {
        top = (minTop + maxTop) / 2;
      }

      return {
        x: snapPx(left - baseLeft),
        y: snapPx(top - baseTop),
      };
    },
    [metrics.insetPx, panelLayoutWidth]
  );

  const updatePanelPlacement = useCallback(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop) return;

    const pw = panelLayoutWidth() || panel.offsetWidth;
    const ph = panel.offsetHeight;
    const bw = backdrop.clientWidth;
    const bh = backdrop.clientHeight;
    const { x, y } = offsetRef.current;

    setPanelPlacement({
      left: snapPx((bw - pw) / 2 + x),
      top: snapPx((bh - ph) / 2 + y),
    });
  }, [panelLayoutWidth]);

  const windowMoveRef = useRef(null);
  const windowUpRef = useRef(null);

  const detachWindowDragListeners = useCallback(() => {
    if (windowMoveRef.current) {
      window.removeEventListener("pointermove", windowMoveRef.current);
    }
    if (windowUpRef.current) {
      window.removeEventListener("pointerup", windowUpRef.current);
      window.removeEventListener("pointercancel", windowUpRef.current);
    }
  }, []);

  // Close → reopen / kind switch: Center + Reading OFF (no persistence).
  useEffect(() => {
    if (!open) {
      setReadingMode(false);
      return;
    }
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
    setReadingMode(false);
    dragRef.current = null;
    suppressBackdropClickRef.current = false;
  }, [open, layoutKey, sizeVariant, widthRatio]);

  useLayoutEffect(() => {
    if (!open) return;
    measureTable();
  }, [open, layoutKey, sizeVariant, widthRatio, measureTable]);

  useEffect(() => {
    if (!open) return;

    const backdrop = backdropRef.current;
    const tableArea = backdrop?.closest(".table-area") ?? backdrop;
    if (!tableArea) return undefined;

    const onResize = () => {
      measureTable();
      setOffset((prev) => clampOffset(prev.x, prev.y));
    };

    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);

    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(onResize);
      ro.observe(tableArea);
    }

    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
      ro?.disconnect();
    };
  }, [open, measureTable, clampOffset]);

  useLayoutEffect(() => {
    if (!open || !draggable) return;
    updatePanelPlacement();
  }, [open, draggable, offset, tableSize, metrics, updatePanelPlacement, children]);

  /**
   * Reading Mode toggle only — keep visual center while size changes.
   * Drag / clamp formula / pointer handlers are unchanged; only offset is
   * recomputed from the pre-toggle center, then passed through existing clamp.
   */
  useLayoutEffect(() => {
    if (!open) return;
    const snapshot = readingCenterSnapshotRef.current;
    if (!snapshot) return;
    readingCenterSnapshotRef.current = null;

    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop) return;

    const centerX = snapshot.left + snapshot.width / 2;
    const centerY = snapshot.top + snapshot.height / 2;
    const newW = panelLayoutWidth() || panel.offsetWidth;
    const newH = panel.offsetHeight || snapshot.height;
    const bw = backdrop.clientWidth;
    const bh = backdrop.clientHeight;

    const newLeft = centerX - newW / 2;
    const newTop = centerY - newH / 2;
    const nextX = newLeft - (bw - newW) / 2;
    const nextY = newTop - (bh - newH) / 2;
    const clamped = clampOffset(nextX, nextY);

    offsetRef.current = clamped;
    setOffset(clamped);
    setPanelPlacement({
      left: snapPx((bw - newW) / 2 + clamped.x),
      top: snapPx((bh - newH) / 2 + clamped.y),
    });
  }, [open, readingMode, panelLayoutWidth, clampOffset]);

  useEffect(() => {
    windowMoveRef.current = (e) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;

      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;

      if (
        !drag.moved &&
        (Math.abs(dx) > DRAG_THRESHOLD_PX || Math.abs(dy) > DRAG_THRESHOLD_PX)
      ) {
        drag.moved = true;
        setIsDragging(true);
      }
      if (!drag.moved) return;

      e.preventDefault();
      setOffset(clampOffset(drag.originX + dx, drag.originY + dy));
    };

    windowUpRef.current = (e) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;

      if (drag.moved) {
        suppressBackdropClickRef.current = true;
        window.setTimeout(() => {
          suppressBackdropClickRef.current = false;
        }, SUPPRESS_BACKDROP_CLICK_MS);
      }

      dragRef.current = null;
      setIsDragging(false);
      detachWindowDragListeners();
    };
  }, [clampOffset, detachWindowDragListeners]);

  useEffect(() => () => detachWindowDragListeners(), [detachWindowDragListeners]);

  const handlePanelPointerDown = (e) => {
    if (!draggable || !panelRef.current) return;
    if (!panelRef.current.contains(e.target)) return;
    if (e.target.closest(NO_DRAG_SELECTOR)) return;
    if (e.button !== 0) return;

    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originX: offsetRef.current.x,
      originY: offsetRef.current.y,
      moved: false,
    };

    if (windowMoveRef.current) {
      window.addEventListener("pointermove", windowMoveRef.current);
    }
    if (windowUpRef.current) {
      window.addEventListener("pointerup", windowUpRef.current);
      window.addEventListener("pointercancel", windowUpRef.current);
    }
  };

  const handleBackdropClick = () => {
    if (suppressBackdropClickRef.current || dragRef.current) return;
    onClose?.();
  };

  const handleReadingToggle = (e) => {
    e.stopPropagation();
    const panel = panelRef.current;
    if (panel) {
      readingCenterSnapshotRef.current = {
        left: panel.offsetLeft,
        top: panel.offsetTop,
        width: panel.offsetWidth,
        height: panel.offsetHeight,
      };
    }
    setReadingMode((prev) => !prev);
  };

  if (!open) return null;

  const isUserInfoOverlay =
    contentClassName.includes("user-ai") ||
    contentClassName.includes("user-calc") ||
    contentClassName.includes("user-hpt");

  const shellClass = [
    "user-overlay-shell",
    `user-overlay-shell--${sizeVariant}`,
    `user-overlay-shell--surface-${surface}`,
    useFitContent ? "user-overlay-shell--fit" : "user-overlay-shell--fixed",
    draggable ? "user-overlay-shell--positioned" : "",
    draggable ? "user-overlay-shell--surface-drag" : "",
    isDragging ? "user-overlay-shell--dragging" : "",
    readingMode ? "user-overlay-shell--reading" : "",
    contentClassName.includes("user-ai") ? "user-overlay-shell--ai" : "",
    contentClassName.includes("user-calc") ? "user-overlay-shell--calc" : "",
    contentClassName.includes("user-hpt") ? "user-overlay-shell--hpt" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const contentClass = ["user-overlay-shell__content", contentClassName]
    .filter(Boolean)
    .join(" ");

  const backdropClass = [
    "user-overlay-shell-backdrop",
    readingMode ? "user-overlay-shell-backdrop--reading" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const shellStyle = {
    left: `${panelPlacement.left}px`,
    top: `${panelPlacement.top}px`,
    visibility: layoutReady ? "visible" : "hidden",
    // left/top transition with size → Reading expand stays centered; drag disables.
    transition: isDragging
      ? "none"
      : "width 165ms ease-out, max-width 165ms ease-out, max-height 165ms ease-out, left 165ms ease-out, top 165ms ease-out, font-size 165ms ease-out, padding 165ms ease-out",
    ...(useFitContent
      ? { maxWidth: layoutReady ? `${metrics.widthPx}px` : undefined }
      : {
          width: layoutReady ? `${metrics.widthPx}px` : undefined,
          maxWidth: layoutReady ? `${metrics.widthPx}px` : undefined,
        }),
    maxHeight: layoutReady ? `${metrics.maxHeightPx}px` : undefined,
    "--uos-w": `${metrics.widthPx}px`,
    "--uos-max-h": `${metrics.maxHeightPx}px`,
    "--uos-font-base": `${metrics.fontBasePx}px`,
    "--uos-title": `${metrics.titlePx}px`,
    "--uos-section": `${metrics.sectionPx}px`,
    "--uos-body": `${metrics.bodyPx}px`,
    "--uos-note": `${metrics.notePx}px`,
    "--uos-metric": `${metrics.metricPx}px`,
    "--uos-pad-v": `${metrics.padVPx}px`,
    "--uos-pad-h": `${metrics.padHPx}px`,
    "--uos-gap": `${metrics.gapPx}px`,
    "--uos-radius": `${metrics.radiusPx}px`,
    "--uos-line-height": String(metrics.lineHeight),
    "--uos-content-scale": String(metrics.contentScale),
    "--uos-overlay-scale": String(metrics.overlayScale),
    "--uos-svg-scale": String(metrics.svgScale),
    // Legacy content hooks (Content files unchanged)
    "--ai-scale": String(metrics.contentScale),
    "--overlay-scale": String(metrics.overlayScale),
    "--overlay-svg-scale": String(metrics.svgScale),
  };

  return (
    <div
      ref={setBackdropNode}
      className={backdropClass}
      onClick={handleBackdropClick}
      data-user-overlay-shell="backdrop"
      data-reading-mode={readingMode ? "1" : "0"}
    >
      <div
        ref={panelRef}
        className={shellClass}
        style={shellStyle}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePanelPointerDown}
        role="dialog"
        aria-modal="true"
        data-user-overlay-shell="panel"
        data-size-variant={sizeVariant}
        data-surface={surface}
        data-reading-mode={readingMode ? "1" : "0"}
      >
        {isUserInfoOverlay ? (
          <button
            type="button"
            className="user-overlay-shell__reading-toggle"
            aria-label={readingMode ? "기본 크기로 축소" : "읽기 모드로 확대"}
            aria-pressed={readingMode}
            title={readingMode ? "기본 크기" : "읽기 모드"}
            data-overlay-no-drag="1"
            onClick={handleReadingToggle}
          >
            <ReadingModeToggleIcon active={readingMode} />
          </button>
        ) : null}
        <div className="user-overlay-shell__body">
          <div className={contentClass}>{children}</div>
        </div>
      </div>
    </div>
  );
}
