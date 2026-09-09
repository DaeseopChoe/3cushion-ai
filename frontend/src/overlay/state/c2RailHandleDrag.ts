/**
 * c2RailHandleDrag.ts
 * Overlay Runtime — ADMIN C2 rail handle drag (1D, projectPointToRail).
 *
 * Click / zero-movement: capture only — no setOverride, no Undo begin.
 * First move that changes rail+t from active-handle seed → mutate + onHandleDragStart.
 * Rail lock uses resolveRailForC2Handle (not detectRail EPS=3).
 */

import { useCallback, useRef, useState } from "react";
import {
  hitTestC2Handle,
  type ReflectionOverride,
  type RgPoint,
} from "../../domain/trajectory/c2ReflectionOverride";
import {
  advanceC2DragSession,
  beginC2DragSession,
  type C2DragSession,
} from "./c2DragSession";

export type UseC2RailHandleDragOptions = {
  svgRef: React.RefObject<SVGSVGElement | null>;
  /** ADMIN-only gate. */
  canDrag: () => boolean;
  getOverride: () => ReflectionOverride | null;
  setOverride: (next: ReflectionOverride | null) => void;
  /** Pointer hit on handle — clear Ball / joystick (not Undo). */
  onHandleHit?: () => void;
  /** First real C2 geometry mutation — begin Undo transaction. */
  onHandleDragStart?: () => void;
};

export type EndC2HandleDragResult =
  | { handled: false }
  | { handled: true; didMutate: boolean };

export function useC2RailHandleDrag({
  svgRef,
  canDrag,
  getOverride,
  setOverride,
  onHandleHit,
  onHandleDragStart,
}: UseC2RailHandleDragOptions) {
  const [dragging, setDragging] = useState(false);
  const draggingRef = useRef(false);
  const sessionRef = useRef<C2DragSession | null>(null);
  const onHandleHitRef = useRef(onHandleHit);
  onHandleHitRef.current = onHandleHit;
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

      sessionRef.current = beginC2DragSession({
        handleRg,
        existingOverride: getOverride(),
      });
      draggingRef.current = true;
      setDragging(true);
      onHandleHitRef.current?.();

      try {
        svgRef.current?.setPointerCapture?.(e.pointerId);
      } catch {
        /* ignore */
      }
      e.preventDefault?.();
      e.stopPropagation?.();
      return true;
    },
    [canDrag, getOverride, svgRef]
  );

  const handleC2PointerMove = useCallback(
    (pointerRg: RgPoint | null | undefined): boolean => {
      if (!draggingRef.current) return false;
      const session = sessionRef.current;
      if (!session || !pointerRg) return true;

      const { session: nextSession, nextOverride } = advanceC2DragSession(
        session,
        pointerRg
      );
      sessionRef.current = nextSession;

      if (nextOverride == null) return true;

      if (!session.hasMutated && nextSession.hasMutated) {
        onHandleDragStartRef.current?.();
      }
      setOverride(nextOverride);
      return true;
    },
    [setOverride]
  );

  const endC2HandleDrag = useCallback(
    (e?: React.PointerEvent | PointerEvent): EndC2HandleDragResult => {
      if (!draggingRef.current) return { handled: false };
      const didMutate = sessionRef.current?.hasMutated === true;
      draggingRef.current = false;
      setDragging(false);
      sessionRef.current = null;

      if (e && svgRef.current?.hasPointerCapture?.(e.pointerId)) {
        try {
          svgRef.current.releasePointerCapture(e.pointerId);
        } catch {
          /* ignore */
        }
      }
      return { handled: true, didMutate };
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
