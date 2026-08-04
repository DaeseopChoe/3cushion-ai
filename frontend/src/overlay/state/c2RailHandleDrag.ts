/**
 * c2RailHandleDrag.ts
 * Overlay Runtime — ADMIN C2 rail handle drag (1D, projectPointToRail).
 *
 * Immediate Reflection Override update (no Apply button).
 * Rail lock uses resolveRailForC2Handle (not detectRail EPS=3).
 * Snap always keeps a non-null override on the locked rail (edge ε clamp).
 */

import { useCallback, useRef, useState } from "react";
import type { Rail } from "../../domain/reflectionEngine";
import {
  hitTestC2Handle,
  resolveRailForC2Handle,
  snapPointerToReflectionOverride,
  type ReflectionOverride,
  type RgPoint,
} from "../../domain/trajectory/c2ReflectionOverride";

export type UseC2RailHandleDragOptions = {
  svgRef: React.RefObject<SVGSVGElement | null>;
  /** ADMIN-only gate. */
  canDrag: () => boolean;
  getOverride: () => ReflectionOverride | null;
  setOverride: (next: ReflectionOverride | null) => void;
  /** Called after C2 hit — clear Ball / joystick selection. */
  onHandleDragStart?: () => void;
};

export function useC2RailHandleDrag({
  svgRef,
  canDrag,
  getOverride,
  setOverride,
  onHandleDragStart,
}: UseC2RailHandleDragOptions) {
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const railLockRef = useRef<Rail | null>(null);
  const onHandleDragStartRef = useRef(onHandleDragStart);
  onHandleDragStartRef.current = onHandleDragStart;

  const tryStartC2HandleDrag = useCallback(
    (
      e: React.PointerEvent | PointerEvent,
      pointerRg: RgPoint,
      handleRg: RgPoint | null | undefined
    ): boolean => {
      if (!canDrag()) return false;
      if (!hitTestC2Handle(pointerRg, handleRg)) return false;
      if (!handleRg) return false;

      const existing = getOverride();
      const rail = resolveRailForC2Handle(handleRg, existing?.rail ?? null);

      railLockRef.current = rail;
      draggingRef.current = true;
      setDragging(true);
      onHandleDragStartRef.current?.();

      // Always set — snap never returns null for a valid rail lock.
      setOverride(snapPointerToReflectionOverride(pointerRg, rail));

      try {
        svgRef.current?.setPointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
      e.preventDefault?.();
      e.stopPropagation?.();
      return true;
    },
    [canDrag, getOverride, setOverride, svgRef]
  );

  const handleC2PointerMove = useCallback(
    (pointerRg: RgPoint | null | undefined): boolean => {
      if (!draggingRef.current) return false;
      const rail = railLockRef.current;
      if (!rail || !pointerRg) return true;
      setOverride(snapPointerToReflectionOverride(pointerRg, rail));
      return true;
    },
    [setOverride]
  );

  const endC2HandleDrag = useCallback(
    (e?: React.PointerEvent | PointerEvent): boolean => {
      if (!draggingRef.current) return false;
      draggingRef.current = false;
      setDragging(false);
      railLockRef.current = null;

      if (e && svgRef.current?.hasPointerCapture?.(e.pointerId)) {
        try {
          svgRef.current.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      return true;
    },
    [svgRef]
  );

  return {
    c2HandleDragging: dragging,
    tryStartC2HandleDrag,
    handleC2PointerMove,
    endC2HandleDrag,
  };
}
