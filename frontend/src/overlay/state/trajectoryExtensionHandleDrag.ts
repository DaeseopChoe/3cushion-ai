/**
 * trajectoryExtensionHandleDrag.ts
 * Overlay Runtime — Extension Handle Drag lifecycle (P2-5 / v1.3).
 *
 * Pointer Capture pattern matches CO/C1 baseline (pointerdown capture).
 * draggingMarkRef: PointerDown writes immediately; Move/Up read ref only (no stale closure).
 * Geometry only — Ball does not follow Handle Drag (SSOT v1.3 §8).
 */

import { useCallback, useRef, useState } from "react";
import type { Rail } from "../../domain/reflectionEngine";
import {
  constrainExtension1Endpoint,
  constrainExtension2Endpoint,
  hitTestExtensionHandle,
  resolveExtension1RailLock,
  updateDraftEndpoint,
  type ExtensionHandleMark,
} from "../../domain/trajectoryExtension/endpointEdit";
import type {
  RgPoint,
  TrajectoryExtensionDraft,
} from "../../domain/trajectoryExtension/proposal";

export type ExtensionHandleDragState = {
  draggingMark: ExtensionHandleMark | null;
};

export type UseTrajectoryExtensionHandleDragOptions = {
  svgRef: React.RefObject<SVGSVGElement | null>;
  canDrag: () => boolean;
  getDraft: () => TrajectoryExtensionDraft | null;
  setDraft: (
    updater:
      | TrajectoryExtensionDraft
      | null
      | ((
          prev: TrajectoryExtensionDraft | null
        ) => TrajectoryExtensionDraft | null)
  ) => void;
  setActiveHandle: (mark: ExtensionHandleMark | null) => void;
  /** Called after Handle hit succeeds — clear Ball drag / joystick / selection. */
  onHandleDragStart?: () => void;
};

export function useTrajectoryExtensionHandleDrag({
  svgRef,
  canDrag,
  getDraft,
  setDraft,
  setActiveHandle,
  onHandleDragStart,
}: UseTrajectoryExtensionHandleDragOptions) {
  /** UI opacity / ✔ only — Move must not depend on this (stale closure). */
  const [draggingMark, setDraggingMark] = useState<ExtensionHandleMark | null>(
    null
  );
  /** Authoritative drag mark — written on PointerDown, read on Move/Up. */
  const draggingMarkRef = useRef<ExtensionHandleMark | null>(null);
  const railLockRef = useRef<Rail | null>(null);
  const onHandleDragStartRef = useRef(onHandleDragStart);
  onHandleDragStartRef.current = onHandleDragStart;

  const tryStartExtensionHandleDrag = useCallback(
    (
      e: React.PointerEvent | PointerEvent,
      pointerRg: RgPoint,
      handle1Rg: RgPoint | null | undefined,
      handle2Rg: RgPoint | null | undefined
    ): boolean => {
      if (!canDrag()) return false;
      const draft = getDraft();
      if (!draft || draft.items.length === 0) return false;

      const mark = hitTestExtensionHandle(pointerRg, handle1Rg, handle2Rg);
      if (mark == null) return false;
      if (!draft.items.some((it) => it.index === mark)) return false;

      draggingMarkRef.current = mark;
      setActiveHandle(mark);
      setDraggingMark(mark);

      if (mark === 1) {
        const ep =
          draft.items.find((it) => it.index === 1)?.endpoint ?? handle1Rg;
        railLockRef.current = resolveExtension1RailLock(ep);
      } else {
        railLockRef.current = null;
      }

      onHandleDragStartRef.current?.();

      try {
        svgRef.current?.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      return true;
    },
    [canDrag, getDraft, setActiveHandle, svgRef]
  );

  const handleExtensionHandlePointerMove = useCallback(
    (pointerRg: RgPoint | null): boolean => {
      const mark = draggingMarkRef.current;
      if (mark == null || !pointerRg) return false;

      const draft = getDraft();
      if (!draft) return true;

      const current =
        draft.items.find((it) => it.index === mark)?.endpoint ?? null;
      if (!current) return true;

      const nextEndpoint =
        mark === 1
          ? constrainExtension1Endpoint(
              pointerRg,
              railLockRef.current,
              current
            )
          : constrainExtension2Endpoint(pointerRg);

      const nextDraft = updateDraftEndpoint(draft, mark, nextEndpoint);
      setDraft(nextDraft);
      return true;
    },
    [getDraft, setDraft]
  );

  const endExtensionHandleDrag = useCallback(
    (e?: React.PointerEvent | PointerEvent): boolean => {
      const mark = draggingMarkRef.current;
      if (mark == null) return false;

      draggingMarkRef.current = null;
      railLockRef.current = null;
      setDraggingMark(null);
      setActiveHandle(mark);
      try {
        if (svgRef.current && e?.pointerId != null) {
          svgRef.current.releasePointerCapture(e.pointerId);
        }
      } catch {
        /* ignore */
      }
      return true;
    },
    [setActiveHandle, svgRef]
  );

  return {
    extensionDraggingMark: draggingMark,
    tryStartExtensionHandleDrag,
    handleExtensionHandlePointerMove,
    endExtensionHandleDrag,
  };
}
