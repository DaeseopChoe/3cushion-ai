/**
 * baselineDraftState.ts
 * APP-009-A (Batch 5 STEP 5-5A) — Baseline Draft Overlay State SSOT.
 *
 * Overlay Runtime: React state + pointer drag lifecycle only.
 * Geometry / Apply Flow / Trajectory build 금지 (STEP 5-5B / 5-7B).
 */

import { useCallback, useEffect, useRef, useState } from "react";
import type { VaryingAxis } from "../../domain/trajectory/baselineMarkAxisSnap";

export type BaselineDraftMark = "CO" | "C1";

export type RgPoint = { x: number; y: number };

export type BaselineDraftState = {
  coSysValue: number | null;
  coRg: RgPoint | null;
  coAxis: VaryingAxis | null;
  c1SysValue: number | null;
  c1Rg: RgPoint | null;
  c1Axis: VaryingAxis | null;
  activeMark: BaselineDraftMark | null;
  draggingMark: BaselineDraftMark | null;
};

export const EMPTY_BASELINE_DRAFT: BaselineDraftState = {
  coSysValue: null,
  coRg: null,
  coAxis: null,
  c1SysValue: null,
  c1Rg: null,
  c1Axis: null,
  activeMark: null,
  draggingMark: null,
};

export type BaselineLabelSlotSnapshot = {
  CO_f: number | null;
  C1_f: number | null;
};

/** App orchestrator가 매 render 갱신 — geometry snap / eligibility 주입 (D-009 interim). */
export type BaselineDraftDragContext = {
  canEndpointDraftDrag: () => boolean;
  captureLabelSlotSnapshot: () => BaselineLabelSlotSnapshot;
  snapCoPointerRg: (pointerRg: RgPoint) => RgPoint | null;
  snapC1PointerRg: (pointerRg: RgPoint) => RgPoint | null;
  getCoHandleRg?: () => RgPoint | null;
  getC1HandleRg?: () => RgPoint | null;
  nudgeBaselineCoord?: (
    coord: RgPoint,
    axis: VaryingAxis,
    delta: number
  ) => RgPoint | null;
  resolveCoAxis?: (
    pointerRg: RgPoint,
    markCoord: RgPoint
  ) => VaryingAxis | null;
  resolveC1Axis?: (
    pointerRg: RgPoint,
    markCoord: RgPoint
  ) => VaryingAxis | null;
};

export type UseBaselineDraftOptions = {
  appMode: string;
  showBaseLine: boolean;
  svgRef: React.RefObject<SVGSVGElement | null>;
  dragContextRef: React.RefObject<BaselineDraftDragContext>;
};

const BASELINE_ENDPOINT_HIT_RADIUS_RG = 2.5;

export function useBaselineDraft({
  appMode,
  showBaseLine,
  svgRef,
  dragContextRef,
}: UseBaselineDraftOptions) {
  const [baselineDraftState, setBaselineDraftState] =
    useState<BaselineDraftState>(EMPTY_BASELINE_DRAFT);
  const baselineDraftStateRef = useRef<BaselineDraftState>(
    EMPTY_BASELINE_DRAFT
  );
  baselineDraftStateRef.current = baselineDraftState;
  const baselineLabelSlotSnapshotRef = useRef<BaselineLabelSlotSnapshot>({
    CO_f: null,
    C1_f: null,
  });

  useEffect(() => {
    if (appMode !== "ADMIN" || !showBaseLine) {
      setBaselineDraftState(EMPTY_BASELINE_DRAFT);
    }
  }, [appMode, showBaseLine]);

  const clearAppliedBaselineDraftMark = useCallback((mark: BaselineDraftMark) => {
    setBaselineDraftState((prev) => {
      const next = { ...prev };

      if (mark === "CO") {
        next.coSysValue = null;
        next.coRg = null;
      } else if (mark === "C1") {
        next.c1SysValue = null;
        next.c1Rg = null;
      }

      if (next.draggingMark === mark) {
        next.draggingMark = null;
      }

      const hasCoDraft =
        Number.isFinite(next.coSysValue) &&
        next.coRg != null &&
        Number.isFinite(next.coRg.x) &&
        Number.isFinite(next.coRg.y);
      const hasC1Draft =
        Number.isFinite(next.c1SysValue) &&
        next.c1Rg != null &&
        Number.isFinite(next.c1Rg.x) &&
        Number.isFinite(next.c1Rg.y);

      if (next.activeMark === mark) {
        if (mark === "CO" && hasC1Draft) {
          next.activeMark = "C1";
        } else if (mark === "C1" && hasCoDraft) {
          next.activeMark = "CO";
        } else {
          next.activeMark = null;
        }
      }

      if (import.meta.env.DEV) {
        console.log("[BASELINE DRAFT CLEAR]", {
          mark,
          activeMark: next.activeMark,
          hasCoDraft,
          hasC1Draft,
        });
      }

      return next;
    });
  }, []);

  const tryStartCoBaselineDraftDrag = useCallback(
    (
      e: React.PointerEvent | PointerEvent,
      pointerRg: RgPoint,
      coHandleRg: RgPoint
    ) => {
      if (
        !coHandleRg ||
        !Number.isFinite(coHandleRg.x) ||
        !Number.isFinite(coHandleRg.y)
      ) {
        return false;
      }
      const dist = Math.hypot(
        pointerRg.x - coHandleRg.x,
        pointerRg.y - coHandleRg.y
      );
      if (dist > BASELINE_ENDPOINT_HIT_RADIUS_RG) return false;

      baselineLabelSlotSnapshotRef.current =
        dragContextRef.current.captureLabelSlotSnapshot();
      const coAxis =
        dragContextRef.current.resolveCoAxis?.(pointerRg, coHandleRg) ?? null;
      setBaselineDraftState((prev) => ({
        ...prev,
        activeMark: "CO",
        draggingMark: "CO",
        coRg: { x: coHandleRg.x, y: coHandleRg.y },
        coAxis,
        coSysValue: null,
      }));
      try {
        svgRef.current?.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      return true;
    },
    [dragContextRef, svgRef]
  );

  const tryStartC1BaselineDraftDrag = useCallback(
    (
      e: React.PointerEvent | PointerEvent,
      pointerRg: RgPoint,
      c1HandleRg: RgPoint
    ) => {
      if (
        !c1HandleRg ||
        !Number.isFinite(c1HandleRg.x) ||
        !Number.isFinite(c1HandleRg.y)
      ) {
        return false;
      }
      const dist = Math.hypot(
        pointerRg.x - c1HandleRg.x,
        pointerRg.y - c1HandleRg.y
      );
      if (dist > BASELINE_ENDPOINT_HIT_RADIUS_RG) return false;

      baselineLabelSlotSnapshotRef.current =
        dragContextRef.current.captureLabelSlotSnapshot();
      const c1Axis =
        dragContextRef.current.resolveC1Axis?.(pointerRg, c1HandleRg) ?? null;
      setBaselineDraftState((prev) => ({
        ...prev,
        activeMark: "C1",
        draggingMark: "C1",
        c1Rg: { x: c1HandleRg.x, y: c1HandleRg.y },
        c1Axis,
        c1SysValue: null,
      }));
      try {
        svgRef.current?.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      return true;
    },
    [dragContextRef, svgRef]
  );

  const tryStartBaselineEndpointDraftDrag = useCallback(
    (
      e: React.PointerEvent | PointerEvent,
      pointerRg: RgPoint,
      coHandleRg: RgPoint | null,
      c1HandleRg: RgPoint | null
    ) => {
      if (!dragContextRef.current.canEndpointDraftDrag()) return false;

      const dCo =
        coHandleRg &&
        Number.isFinite(coHandleRg.x) &&
        Number.isFinite(coHandleRg.y)
          ? Math.hypot(pointerRg.x - coHandleRg.x, pointerRg.y - coHandleRg.y)
          : Infinity;
      const dC1 =
        c1HandleRg &&
        Number.isFinite(c1HandleRg.x) &&
        Number.isFinite(c1HandleRg.y)
          ? Math.hypot(pointerRg.x - c1HandleRg.x, pointerRg.y - c1HandleRg.y)
          : Infinity;

      const R = BASELINE_ENDPOINT_HIT_RADIUS_RG;
      if (dC1 <= R && (dCo > R || dC1 < dCo)) {
        return tryStartC1BaselineDraftDrag(e, pointerRg, c1HandleRg!);
      }
      if (dCo <= R) {
        return tryStartCoBaselineDraftDrag(e, pointerRg, coHandleRg!);
      }
      return false;
    },
    [dragContextRef, tryStartC1BaselineDraftDrag, tryStartCoBaselineDraftDrag]
  );

  const endCoBaselineDraftDrag = useCallback(
    (e?: React.PointerEvent | PointerEvent) => {
      if (baselineDraftState.draggingMark !== "CO") return false;
      const coRg = baselineDraftState.coRg;
      setBaselineDraftState((prev) => ({
        ...prev,
        coRg: coRg ? { x: coRg.x, y: coRg.y } : prev.coRg,
        activeMark: "CO",
        draggingMark: null,
      }));
      try {
        if (svgRef.current && e?.pointerId != null) {
          svgRef.current.releasePointerCapture(e.pointerId);
        }
      } catch {
        /* ignore */
      }
      return true;
    },
    [baselineDraftState.coRg, baselineDraftState.draggingMark, svgRef]
  );

  const endC1BaselineDraftDrag = useCallback(
    (e?: React.PointerEvent | PointerEvent) => {
      if (baselineDraftState.draggingMark !== "C1") return false;
      const c1Rg = baselineDraftState.c1Rg;
      setBaselineDraftState((prev) => ({
        ...prev,
        c1Rg: c1Rg ? { x: c1Rg.x, y: c1Rg.y } : prev.c1Rg,
        activeMark: "C1",
        draggingMark: null,
      }));
      try {
        if (svgRef.current && e?.pointerId != null) {
          svgRef.current.releasePointerCapture(e.pointerId);
        }
      } catch {
        /* ignore */
      }
      return true;
    },
    [baselineDraftState.c1Rg, baselineDraftState.draggingMark, svgRef]
  );

  const handleBaselineDraftPointerMove = useCallback(
    (pointerRg: RgPoint | null) => {
      if (!pointerRg) return false;

      if (baselineDraftState.draggingMark === "CO") {
        const snapped = dragContextRef.current.snapCoPointerRg(pointerRg);
        if (snapped) {
          setBaselineDraftState((prev) =>
            prev.draggingMark === "CO" ? { ...prev, coRg: snapped } : prev
          );
        }
        return true;
      }

      if (baselineDraftState.draggingMark === "C1") {
        const snapped = dragContextRef.current.snapC1PointerRg(pointerRg);
        if (snapped) {
          setBaselineDraftState((prev) =>
            prev.draggingMark === "C1" ? { ...prev, c1Rg: snapped } : prev
          );
        }
        return true;
      }

      return false;
    },
    [baselineDraftState.draggingMark, dragContextRef]
  );

  const nudgeBaselineDraft = useCallback(
    (
      mark: BaselineDraftMark,
      axis: VaryingAxis,
      delta = 0.1
    ): BaselineDraftState | null => {
      const previous = baselineDraftStateRef.current;
      const previousAxis =
        mark === "CO" ? previous.coAxis : previous.c1Axis;
      if (previousAxis && previousAxis !== axis) return null;

      const currentCoord =
        mark === "CO"
          ? previous.coRg ?? dragContextRef.current.getCoHandleRg?.() ?? null
          : previous.c1Rg ?? dragContextRef.current.getC1HandleRg?.() ?? null;
      const nextCoord =
        currentCoord &&
        dragContextRef.current.nudgeBaselineCoord?.(
          currentCoord,
          axis,
          delta
        );
      if (!nextCoord) return null;
      if (
        currentCoord &&
        Math.abs(nextCoord.x - currentCoord.x) <= 1e-12 &&
        Math.abs(nextCoord.y - currentCoord.y) <= 1e-12
      ) {
        return null;
      }

      baselineLabelSlotSnapshotRef.current =
        dragContextRef.current.captureLabelSlotSnapshot();
      const next: BaselineDraftState = {
        ...previous,
        activeMark: mark,
        draggingMark: null,
        ...(mark === "CO"
          ? {
              coRg: nextCoord,
              coAxis: axis,
              coSysValue: null,
            }
          : {
              c1Rg: nextCoord,
              c1Axis: axis,
              c1SysValue: null,
            }),
      };
      baselineDraftStateRef.current = next;
      setBaselineDraftState(next);
      return next;
    },
    [dragContextRef]
  );

  const setBaselineDraftCoordinate = useCallback(
    (
      mark: BaselineDraftMark,
      coord: RgPoint | null | undefined,
      axis: VaryingAxis
    ): BaselineDraftState | null => {
      if (
        !coord ||
        !Number.isFinite(coord.x) ||
        !Number.isFinite(coord.y) ||
        (axis !== "x" && axis !== "y")
      ) {
        return null;
      }

      const previous = baselineDraftStateRef.current;
      const previousAxis =
        mark === "CO" ? previous.coAxis : previous.c1Axis;
      if (previousAxis && previousAxis !== axis) return null;

      baselineLabelSlotSnapshotRef.current =
        dragContextRef.current.captureLabelSlotSnapshot();
      const next: BaselineDraftState = {
        ...previous,
        activeMark: mark,
        draggingMark: null,
        ...(mark === "CO"
          ? {
              coRg: { x: coord.x, y: coord.y },
              coAxis: axis,
              coSysValue: null,
            }
          : {
              c1Rg: { x: coord.x, y: coord.y },
              c1Axis: axis,
              c1SysValue: null,
            }),
      };
      baselineDraftStateRef.current = next;
      setBaselineDraftState(next);
      return next;
    },
    [dragContextRef]
  );

  const restoreBaselineDraftState = useCallback(
    (
      state: BaselineDraftState,
      labelSlotSnapshot?: BaselineLabelSlotSnapshot
    ) => {
      baselineDraftStateRef.current = state;
      if (labelSlotSnapshot) {
        baselineLabelSlotSnapshotRef.current = labelSlotSnapshot;
      }
      setBaselineDraftState(state);
    },
    []
  );

  return {
    baselineDraftState,
    baselineLabelSlotSnapshotRef,
    clearAppliedBaselineDraftMark,
    tryStartBaselineEndpointDraftDrag,
    endCoBaselineDraftDrag,
    endC1BaselineDraftDrag,
    handleBaselineDraftPointerMove,
    nudgeBaselineDraft,
    setBaselineDraftCoordinate,
    restoreBaselineDraftState,
  };
}
