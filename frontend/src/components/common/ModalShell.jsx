import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

const DRAG_THRESHOLD_PX = 4;
const VIEWPORT_MARGIN_PX = 24;
const SUPPRESS_BACKDROP_CLICK_MS = 100;

const snapPx = (value) => Math.round(value);

/**
 * 공통 modal shell — transparent backdrop + draggable panel (header handle).
 * Drag uses snapped left/top (no transform) to keep text on the normal paint path.
 */
export default function ModalShell({
  open = true,
  onClose,
  children,
  title,
  className = "",
  panelClassName = "",
  panelStyle,
  variant = "default",
  disableBackdropClick = false,
  fixed = false,
  zIndex = 50,
  draggable = true,
}) {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [panelPlacement, setPanelPlacement] = useState({ left: 0, top: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const panelRef = useRef(null);
  const backdropRef = useRef(null);
  const dragRef = useRef(null);
  const suppressBackdropClickRef = useRef(false);
  const offsetRef = useRef(offset);
  offsetRef.current = offset;

  const clampOffset = useCallback((x, y) => {
    const panel = panelRef.current;
    const backdrop = backdropRef.current;
    if (!panel || !backdrop) return { x: snapPx(x), y: snapPx(y) };

    const pw = panel.offsetWidth;
    const ph = panel.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const m = VIEWPORT_MARGIN_PX;

    const backdropRect = backdrop.getBoundingClientRect();
    const baseLeft = backdropRect.left + (backdropRect.width - pw) / 2;
    const baseTop = backdropRect.top + (backdropRect.height - ph) / 2;

    let left = baseLeft + x;
    let top = baseTop + y;

    const minLeft = -(pw - m);
    const maxLeft = vw - m;
    const minTop = -(ph - m);
    const maxTop = vh - m;

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
  }, []);

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

  useEffect(() => {
    if (open) {
      setOffset({ x: 0, y: 0 });
      setIsDragging(false);
      dragRef.current = null;
      suppressBackdropClickRef.current = false;
    }
  }, [open]);

  useLayoutEffect(() => {
    if (!open || !draggable) return;
    updatePanelPlacement();
  }, [open, draggable, offset, updatePanelPlacement]);

  useEffect(() => {
    if (!open || !draggable) return;

    const handleResize = () => {
      setOffset((prev) => clampOffset(prev.x, prev.y));
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [open, draggable, clampOffset]);

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
    const handle = e.target.closest('[data-modal-drag-handle="1"]');
    if (!handle || !panelRef.current.contains(handle)) return;
    if (e.target.closest(".modal-panel-close")) return;
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
    if (disableBackdropClick || suppressBackdropClickRef.current || dragRef.current) {
      return;
    }
    onClose?.();
  };

  if (!open) return null;

  const backdropClass = [
    "modal-backdrop",
    fixed ? "modal-backdrop--fixed" : "",
    variant !== "default" ? `modal-backdrop--${variant}` : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const panelClass = [
    "modal-panel",
    draggable ? "modal-panel--positioned" : "",
    isDragging ? "modal-panel--dragging" : "",
    variant !== "default" ? `modal-panel--${variant}` : "",
    panelClassName,
  ]
    .filter(Boolean)
    .join(" ");

  const mergedPanelStyle = {
    ...panelStyle,
    ...(draggable
      ? {
          left: `${panelPlacement.left}px`,
          top: `${panelPlacement.top}px`,
        }
      : null),
  };

  return (
    <div
      ref={backdropRef}
      className={backdropClass}
      style={fixed ? { zIndex } : undefined}
      onClick={handleBackdropClick}
      data-modal-shell="backdrop"
    >
      <div
        ref={panelRef}
        className={panelClass}
        style={mergedPanelStyle}
        onClick={(e) => e.stopPropagation()}
        onPointerDown={handlePanelPointerDown}
        role="dialog"
        aria-modal="true"
        data-modal-shell="panel"
      >
        {title != null && title !== "" && (
          <div className="modal-panel-header" data-modal-drag-handle="1">
            <h2 className="modal-panel-title">{title}</h2>
            {onClose ? (
              <button
                type="button"
                className="modal-panel-close"
                onClick={onClose}
                aria-label="닫기"
              >
                ×
              </button>
            ) : null}
          </div>
        )}
        <div className="modal-panel-body">{children}</div>
      </div>
    </div>
  );
};
