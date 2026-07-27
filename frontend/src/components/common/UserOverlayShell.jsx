/**
 * USER Overlay Shell — Layout Layer (Overlay Layout SSOT v1.1).
 * Owns size / surface / position / drag / clamp / close.
 * Must not embed Content semantics (AI / 타점 / 계산).
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
  ".user-overlay-shell__close",
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

  const backdropRef = useRef(null);
  const panelRef = useRef(null);
  const dragRef = useRef(null);
  const suppressBackdropClickRef = useRef(false);
  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  const setBackdropNode = useCallback((node) => {
    backdropRef.current = node;
    if (!node) return;
    const tableArea = node.closest(".table-area") ?? node;
    const next = readTableAreaSize(tableArea);
    setTableSize((prev) =>
      prev.width === next.width && prev.height === next.height ? prev : next
    );
  }, []);

  const metrics = useMemo(
    () =>
      computeOverlayLayoutMetrics(
        tableSize.width,
        tableSize.height,
        sizeVariant,
        contentTypeScale,
        { widthRatio, maxHeightRatio }
      ),
    [
      tableSize.width,
      tableSize.height,
      sizeVariant,
      contentTypeScale,
      widthRatio,
      maxHeightRatio,
    ]
  );

  const layoutReady = tableSize.width > 0 && tableSize.height > 0;

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
      const pw = panel.offsetWidth;
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
    [metrics.insetPx]
  );

  const updatePanelPlacement = useCallback(() => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop) return;

    const pw = panel.offsetWidth;
    const ph = panel.offsetHeight;
    const bw = backdrop.clientWidth;
    const bh = backdrop.clientHeight;
    const { x, y } = offsetRef.current;

    setPanelPlacement({
      left: snapPx((bw - pw) / 2 + x),
      top: snapPx((bh - ph) / 2 + y),
    });
  }, []);

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

  // Close → reopen always starts at Center (no persistence).
  useEffect(() => {
    if (!open) return;
    setOffset({ x: 0, y: 0 });
    setIsDragging(false);
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

  if (!open) return null;

  const shellClass = [
    "user-overlay-shell",
    `user-overlay-shell--${sizeVariant}`,
    `user-overlay-shell--surface-${surface}`,
    useFitContent ? "user-overlay-shell--fit" : "user-overlay-shell--fixed",
    draggable ? "user-overlay-shell--positioned" : "",
    draggable ? "user-overlay-shell--surface-drag" : "",
    isDragging ? "user-overlay-shell--dragging" : "",
    contentClassName.includes("user-ai") ? "user-overlay-shell--ai" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const contentClass = ["user-overlay-shell__content", contentClassName]
    .filter(Boolean)
    .join(" ");

  const shellStyle = {
    left: `${panelPlacement.left}px`,
    top: `${panelPlacement.top}px`,
    visibility: layoutReady ? "visible" : "hidden",
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
      className="user-overlay-shell-backdrop"
      onClick={handleBackdropClick}
      data-user-overlay-shell="backdrop"
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
      >
        {onClose ? (
          <button
            type="button"
            className="user-overlay-shell__close"
            onClick={onClose}
            aria-label="닫기"
            data-overlay-no-drag="1"
          >
            ×
          </button>
        ) : null}
        <div className="user-overlay-shell__body">
          <div className={contentClass}>{children}</div>
        </div>
      </div>
    </div>
  );
}
