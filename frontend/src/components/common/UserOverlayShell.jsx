/**
 * USER Overlay Shell — Layout Layer (Overlay Layout SSOT v1.2 + Reading Mode).
 * Owns size / surface / position / drag / clamp / backdrop-close / Reading Mode.
 * Centering SSOT: table-area center + temporary dragOffset;
 * panel ResizeObserver re-places on live DOM box after transition/reflow.
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

  /** Temporary drag offset → table-area center (pre-paint). */
  const resetDragOffsetToCenter = useCallback(() => {
    const zero = { x: 0, y: 0 };
    offsetRef.current = zero;
    setOffset(zero);
    setIsDragging(false);
    dragRef.current = null;
    suppressBackdropClickRef.current = false;
  }, []);

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

  const measureTable = useCallback(() => {
    const backdrop = backdropRef.current;
    const tableArea = backdrop?.closest(".table-area") ?? backdrop;
    setTableSize(readTableAreaSize(tableArea));
  }, []);

  /** Live border-box — must match what ResizeObserver converges to after reflow. */
  const readPanelBox = useCallback(() => {
    const panel = panelRef.current;
    if (!panel) return { width: 0, height: 0 };
    return {
      width: panel.offsetWidth || 0,
      height: panel.offsetHeight || 0,
    };
  }, []);

  const clampOffset = useCallback(
    (x, y) => {
      const panel = panelRef.current;
      const backdrop = backdropRef.current;
      if (!panel || !backdrop) return { x: snapPx(x), y: snapPx(y) };

      const tableArea = backdrop.closest(".table-area") ?? backdrop;
      const tableRect = tableArea.getBoundingClientRect();
      const { width: pw, height: ph } = readPanelBox();
      if (pw <= 0 || ph <= 0) return { x: snapPx(x), y: snapPx(y) };
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
    [metrics.insetPx, readPanelBox]
  );

  /**
   * Centering SSOT:
   * left/top = (backdrop − currentPanelBox) / 2 + dragOffset
   * Uses live DOM size so transition/reflow can re-converge via panel RO.
   */
  const updatePanelPlacement = useCallback(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop) return;

    const { width: pw, height: ph } = readPanelBox();
    if (pw <= 0 || ph <= 0) return;

    const bw = backdrop.clientWidth;
    const bh = backdrop.clientHeight;
    const { x, y } = offsetRef.current;

    setPanelPlacement({
      left: snapPx((bw - pw) / 2 + x),
      top: snapPx((bh - ph) / 2 + y),
    });
  }, [readPanelBox]);

  const updatePanelPlacementRef = useRef(updatePanelPlacement);
  updatePanelPlacementRef.current = updatePanelPlacement;

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

  /**
   * Centering SSOT (pre-paint):
   * Open / Re-open / Switch / size token change → dragOffset=0 + Reading OFF.
   * Close also clears dragOffset so Re-open never reuses it.
   */
  useLayoutEffect(() => {
    resetDragOffsetToCenter();
    setReadingMode(false);
  }, [open, layoutKey, sizeVariant, widthRatio, resetDragOffsetToCenter]);

  /**
   * Reading Zoom In/Out → discard drag; place new size at table-area center.
   * (Does not toggle readingMode — only reacts to it.)
   */
  useLayoutEffect(() => {
    if (!open) return;
    resetDragOffsetToCenter();
  }, [open, readingMode, resetDragOffsetToCenter]);

  useLayoutEffect(() => {
    if (!open) return;
    measureTable();
  }, [open, layoutKey, sizeVariant, widthRatio, readingMode, measureTable]);

  useEffect(() => {
    if (!open) return;

    const backdrop = backdropRef.current;
    const tableArea = backdrop?.closest(".table-area") ?? backdrop;
    if (!tableArea) return undefined;

    const onTableResize = () => {
      measureTable();
      // Keep temporary dragOffset; re-clamp + re-place with current panel box.
      setOffset((prev) => {
        const next = clampOffset(prev.x, prev.y);
        offsetRef.current = next;
        return next;
      });
      updatePanelPlacementRef.current();
    };

    window.addEventListener("resize", onTableResize);
    window.addEventListener("orientationchange", onTableResize);

    let tableRo = null;
    if (typeof ResizeObserver !== "undefined") {
      tableRo = new ResizeObserver(onTableResize);
      tableRo.observe(tableArea);
    }

    return () => {
      window.removeEventListener("resize", onTableResize);
      window.removeEventListener("orientationchange", onTableResize);
      tableRo?.disconnect();
    };
  }, [open, measureTable, clampOffset]);

  /**
   * Panel box RO — content / width / font / max-height / wrapping reflow.
   * Does NOT reset dragOffset (pure re-place: center + current offset).
   */
  useEffect(() => {
    if (!open) return undefined;
    const panel = panelRef.current;
    if (!panel || typeof ResizeObserver === "undefined") return undefined;

    let lastW = -1;
    let lastH = -1;
    const panelRo = new ResizeObserver(() => {
      const { width: w, height: h } = readPanelBox();
      if (w <= 0 || h <= 0) return;
      if (w === lastW && h === lastH) return;
      lastW = w;
      lastH = h;
      updatePanelPlacementRef.current();
    });
    panelRo.observe(panel);

    // Initial sync after mount / open (covers first paint before first RO tick).
    updatePanelPlacementRef.current();

    return () => panelRo.disconnect();
  }, [open, layoutKey, readingMode, children, readPanelBox]);

  // Placement after offset reset in the same layout pass (uses offsetRef).
  useLayoutEffect(() => {
    if (!open || !draggable) return;
    updatePanelPlacement();
  }, [open, draggable, offset, tableSize, metrics, updatePanelPlacement, children, readingMode]);

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
    // Size change → table-area center (drag discarded via readingMode layout effect).
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
    // Position snaps to table-area center (no left/top slide from stale drag).
    // Size/typography may still ease.
    transition: isDragging
      ? "none"
      : "width 165ms ease-out, max-width 165ms ease-out, max-height 165ms ease-out, font-size 165ms ease-out, padding 165ms ease-out",
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
