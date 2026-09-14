import { useCallback, useEffect, useRef, useState } from "react";
import {
  USER_TABLE_MAGNIFIER_DIAMETER,
  USER_TABLE_MAGNIFIER_ZOOM,
  USER_TABLE_VISUAL_ID,
} from "../../config/tableConfig";
import {
  clampLensPosition,
  computeMagnifierViewBox,
  defaultLensPosition,
} from "./userTableMagnifierLayout";
import "../../styles/user-table-magnifier.css";

function hostPointToViewBox(svg, hostEl, hostLocalX, hostLocalY) {
  if (!svg || !hostEl || typeof svg.createSVGPoint !== "function") return null;
  const hostRect = hostEl.getBoundingClientRect();
  const pt = svg.createSVGPoint();
  pt.x = hostRect.left + hostLocalX;
  pt.y = hostRect.top + hostLocalY;
  const ctm = svg.getScreenCTM?.();
  if (!ctm) return null;
  return pt.matrixTransform(ctm.inverse());
}

/**
 * USER mobile circular magnifier — presentation-only.
 * Reuses live SVG subtree via <use href="#user-table-visual"> (no calc recompute).
 */
export default function UserTableMagnifier({
  hostRef,
  svgRef,
  viewBoxWidth,
  viewBoxHeight,
  zoom = USER_TABLE_MAGNIFIER_ZOOM,
  diameter = USER_TABLE_MAGNIFIER_DIAMETER,
}) {
  const [lensPos, setLensPos] = useState({ x: 0, y: 0 });
  const [viewBox, setViewBox] = useState(null);
  const dragRef = useRef(null);
  const rafRef = useRef(0);
  const lensRef = useRef(null);

  const syncViewBox = useCallback(() => {
    const host = hostRef?.current;
    const svg = svgRef?.current;
    if (!host || !svg) return;
    const hostRect = host.getBoundingClientRect();
    const svgRect = svg.getBoundingClientRect();
    const centerX = lensPos.x + diameter / 2;
    const centerY = lensPos.y + diameter / 2;
    const vbCenter = hostPointToViewBox(svg, host, centerX, centerY);
    if (!vbCenter) return;
    setViewBox(
      computeMagnifierViewBox(
        vbCenter.x,
        vbCenter.y,
        svgRect.width,
        svgRect.height,
        viewBoxWidth,
        viewBoxHeight,
        diameter,
        zoom
      )
    );
  }, [diameter, hostRef, lensPos.x, lensPos.y, svgRef, viewBoxHeight, viewBoxWidth, zoom]);

  useEffect(() => {
    const host = hostRef?.current;
    if (!host) return undefined;
    const place = () => {
      const rect = host.getBoundingClientRect();
      setLensPos((prev) => {
        if (prev.x === 0 && prev.y === 0) {
          return defaultLensPosition(rect.width, rect.height, diameter);
        }
        return clampLensPosition(prev.x, prev.y, rect.width, rect.height, diameter);
      });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("orientationchange", place);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("orientationchange", place);
    };
  }, [diameter, hostRef]);

  useEffect(() => {
    syncViewBox();
  }, [syncViewBox]);

  useEffect(() => {
    const svg = svgRef?.current;
    if (!svg || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => syncViewBox());
    ro.observe(svg);
    return () => ro.disconnect();
  }, [svgRef, syncViewBox]);

  const finishDrag = useCallback((e) => {
    dragRef.current = null;
    if (lensRef.current?.hasPointerCapture?.(e.pointerId)) {
      lensRef.current.releasePointerCapture(e.pointerId);
    }
  }, []);

  const onPointerDown = useCallback(
    (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = {
        pointerId: e.pointerId,
        originClientX: e.clientX,
        originClientY: e.clientY,
        originX: lensPos.x,
        originY: lensPos.y,
      };
      lensRef.current?.setPointerCapture?.(e.pointerId);
    },
    [lensPos.x, lensPos.y]
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!dragRef.current || dragRef.current.pointerId !== e.pointerId) return;
      e.preventDefault();
      const host = hostRef?.current;
      if (!host) return;
      const dx = e.clientX - dragRef.current.originClientX;
      const dy = e.clientY - dragRef.current.originClientY;
      const rect = host.getBoundingClientRect();
      const next = clampLensPosition(
        dragRef.current.originX + dx,
        dragRef.current.originY + dy,
        rect.width,
        rect.height,
        diameter
      );
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        setLensPos(next);
      });
    },
    [diameter, hostRef]
  );

  useEffect(
    () => () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    },
    []
  );

  if (!viewBox) return null;

  const viewBoxStr = `${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`;

  return (
    <div
      ref={lensRef}
      className="user-table-magnifier-lens"
      role="img"
      aria-label="확대 보기"
      style={{
        width: diameter,
        height: diameter,
        left: lensPos.x,
        top: lensPos.y,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
    >
      <svg
        className="user-table-magnifier-svg"
        viewBox={viewBoxStr}
        width={diameter}
        height={diameter}
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        <use href={`#${USER_TABLE_VISUAL_ID}`} xlinkHref={`#${USER_TABLE_VISUAL_ID}`} />
      </svg>
    </div>
  );
}
