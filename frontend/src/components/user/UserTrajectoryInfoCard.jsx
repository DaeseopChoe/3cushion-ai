/**
 * USER 동선분석 정보 카드 — table-area 중앙 overlay, 토글 바 드래그 이동.
 */

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";

const DRAG_THRESHOLD_PX = 4;
const CONTAINER_MARGIN_PX = 8;

export default function UserTrajectoryInfoCard({
  model,
  cardSource,
  onCardSourceChange,
  showAxisValues,
  onShowAxisValuesChange,
  dragOffset = { x: 0, y: 0 },
  onDragOffsetChange,
}) {
  const cardRef = useRef(null);
  const dragRef = useRef(null);
  const offsetRef = useRef(dragOffset);
  const isDraggingRef = useRef(false);
  offsetRef.current = dragOffset;

  const clampOffset = useCallback((x, y) => {
    const card = cardRef.current;
    const container = card?.closest(".table-area");
    if (!card || !container) {
      return { x: Math.round(x), y: Math.round(y) };
    }

    const cw = card.offsetWidth;
    const ch = card.offsetHeight;
    const cr = container.getBoundingClientRect();
    const baseCenterX = cr.left + cr.width / 2;
    const baseCenterY = cr.top + cr.height / 2;

    let left = baseCenterX + x - cw / 2;
    let top = baseCenterY + y - ch / 2;

    const minLeft = cr.left + CONTAINER_MARGIN_PX;
    const maxLeft = cr.right - cw - CONTAINER_MARGIN_PX;
    const minTop = cr.top + CONTAINER_MARGIN_PX;
    const maxTop = cr.bottom - ch - CONTAINER_MARGIN_PX;

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
      x: Math.round(left + cw / 2 - baseCenterX),
      y: Math.round(top + ch / 2 - baseCenterY),
    };
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
    dragRef.current = null;
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      cardRef.current?.classList.remove("user-trajectory-info-card--dragging");
    }
  }, []);

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
        isDraggingRef.current = true;
        cardRef.current?.classList.add("user-trajectory-info-card--dragging");
      }
      if (!drag.moved) return;

      e.preventDefault();
      onDragOffsetChange?.(
        clampOffset(drag.originX + dx, drag.originY + dy)
      );
    };

    windowUpRef.current = (e) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== e.pointerId) return;
      detachWindowDragListeners();
    };
  }, [clampOffset, detachWindowDragListeners, onDragOffsetChange]);

  useEffect(() => () => detachWindowDragListeners(), [detachWindowDragListeners]);

  useLayoutEffect(() => {
    if (!onDragOffsetChange) return;
    const clamped = clampOffset(offsetRef.current.x, offsetRef.current.y);
    if (clamped.x !== offsetRef.current.x || clamped.y !== offsetRef.current.y) {
      onDragOffsetChange(clamped);
    }
  }, [model, cardSource, showAxisValues, clampOffset, onDragOffsetChange]);

  useEffect(() => {
    if (!onDragOffsetChange) return;
    const onResize = () => {
      onDragOffsetChange(
        clampOffset(offsetRef.current.x, offsetRef.current.y)
      );
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [clampOffset, onDragOffsetChange]);

  const onTogglePointerDown = useCallback(
    (e) => {
      if (!onDragOffsetChange) return;
      if (e.target.closest("button")) return;
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
    },
    [onDragOffsetChange]
  );

  if (!model) return null;

  const cardStyle = {
    transform: `translate(calc(-50% + ${dragOffset.x}px), calc(-50% + ${dragOffset.y}px))`,
  };

  return (
    <div
      ref={cardRef}
      className="user-trajectory-info-card"
      style={cardStyle}
      role="region"
      aria-label="동선분석 계산값"
    >
      <div
        className="user-trajectory-info-card__toggle"
        role="group"
        aria-label="동선 표시 옵션"
        data-trajectory-drag-handle="1"
        onPointerDown={onTogglePointerDown}
      >
        <div
          className="user-trajectory-info-card__source-tabs"
          role="tablist"
          aria-label="계산값 종류"
        >
          <button
            type="button"
            role="tab"
            aria-selected={cardSource === "baseline"}
            className={
              cardSource === "baseline"
                ? "user-trajectory-info-card__tab user-trajectory-info-card__tab--active"
                : "user-trajectory-info-card__tab"
            }
            onClick={() => onCardSourceChange("baseline")}
          >
            기준값
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={cardSource === "corrected"}
            className={
              cardSource === "corrected"
                ? "user-trajectory-info-card__tab user-trajectory-info-card__tab--active"
                : "user-trajectory-info-card__tab"
            }
            onClick={() => onCardSourceChange("corrected")}
          >
            보정값
          </button>
        </div>
        <button
          type="button"
          className={
            showAxisValues
              ? "user-trajectory-info-card__tab user-trajectory-info-card__tab--axis user-trajectory-info-card__tab--active"
              : "user-trajectory-info-card__tab user-trajectory-info-card__tab--axis"
          }
          aria-pressed={showAxisValues}
          onClick={() => onShowAxisValuesChange?.(!showAxisValues)}
        >
          시스템값 표시
        </button>
      </div>

      <div className="user-trajectory-info-card__body">
        {model.isEmpty ? (
          <p className="user-trajectory-info-card__empty">{model.emptyMessage}</p>
        ) : (
          <>
            <div className="user-trajectory-info-card__formula">
              <span className="user-trajectory-info-card__label">[공식]</span>
              <span className="user-trajectory-info-card__formula-line">
                {model.formulaLine}
              </span>
            </div>
            <div className="user-trajectory-info-card__values">
              <span className="user-trajectory-info-card__label">[계산]</span>
              <div className="user-trajectory-info-card__value-grid">
                {model.valueLines.map((line) => (
                  <div
                    key={line.key}
                    className="user-trajectory-info-card__value-item"
                  >
                    {line.label} = {line.value}
                  </div>
                ))}
              </div>
            </div>
            {model.correctionDetailLines.length > 0 ? (
              <ul className="user-trajectory-info-card__correction-list">
                {model.correctionDetailLines.map((line, idx) => (
                  <li key={idx}>{line}</li>
                ))}
              </ul>
            ) : null}
            <p className="user-trajectory-info-card__guide">{model.guideLine}</p>
          </>
        )}
      </div>
    </div>
  );
}
