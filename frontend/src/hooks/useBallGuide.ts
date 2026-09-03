import { useCallback, useRef, useState } from "react";
import { normalizeRgTenth } from "../interaction/ballGuideCoordinatePolicy";

export type BallGuidePoint = {
  x: number;
  y: number;
};

export type BallGuideState = {
  active: boolean;
  ballId: string | null;
  horizontalY: number | null;
  verticalX: number | null;
};

export type BallGuideAxis = "horizontal" | "vertical";

export type BallGuideDragState = {
  active: boolean;
  axis: BallGuideAxis | null;
  pointerId: number | null;
  startRg: BallGuidePoint | null;
  startValue: number | null;
  precisionFactor: number;
};

export const EMPTY_BALL_GUIDE: BallGuideState = {
  active: false,
  ballId: null,
  horizontalY: null,
  verticalX: null,
};

export const EMPTY_BALL_GUIDE_DRAG: BallGuideDragState = {
  active: false,
  axis: null,
  pointerId: null,
  startRg: null,
  startValue: null,
  precisionFactor: 1,
};

export const BALL_GUIDE_AXIS_BOUNDS = {
  horizontal: { min: 0.5, max: 39.5 },
  vertical: { min: 0.5, max: 79.5 },
} as const;

export function clampBallGuideAxis(
  axis: BallGuideAxis,
  value: number
): number {
  const bounds = BALL_GUIDE_AXIS_BOUNDS[axis];
  return Math.max(bounds.min, Math.min(bounds.max, value));
}

export function createBallGuideState(
  ballId: string,
  point: BallGuidePoint
): BallGuideState {
  return {
    active: true,
    ballId,
    horizontalY: point.y,
    verticalX: point.x,
  };
}

export function selectBallGuideState(
  previous: BallGuideState,
  ballId: string,
  point: BallGuidePoint
): BallGuideState {
  if (previous.active && previous.ballId === ballId) {
    return previous;
  }
  return createBallGuideState(ballId, point);
}

export function updateBallGuideAxis(
  previous: BallGuideState,
  axis: BallGuideAxis,
  value: number
): BallGuideState {
  if (!previous.active || !Number.isFinite(value)) {
    return previous;
  }

  const clampedValue = clampBallGuideAxis(axis, value);
  if (axis === "horizontal") {
    return { ...previous, horizontalY: clampedValue };
  }
  return { ...previous, verticalX: clampedValue };
}

/** Atomic guide intersection update (verticalX + horizontalY). Ball position unchanged. */
export function setBallGuideIntersection(
  previous: BallGuideState,
  point: BallGuidePoint
): BallGuideState {
  if (!previous.active) return previous;
  if (!Number.isFinite(point.x) || !Number.isFinite(point.y)) {
    return previous;
  }
  return {
    ...previous,
    verticalX: clampBallGuideAxis("vertical", point.x),
    horizontalY: clampBallGuideAxis("horizontal", point.y),
  };
}

export function updateBallGuideFromPointer(
  previous: BallGuideState,
  drag: BallGuideDragState,
  pointerRg: BallGuidePoint
): BallGuideState {
  if (
    !drag.active ||
    !drag.axis ||
    !drag.startRg ||
    !Number.isFinite(drag.startValue) ||
    !Number.isFinite(drag.precisionFactor) ||
    !Number.isFinite(pointerRg?.x) ||
    !Number.isFinite(pointerRg?.y)
  ) {
    return previous;
  }

  const pointerDelta =
    drag.axis === "horizontal"
      ? pointerRg.y - drag.startRg.y
      : pointerRg.x - drag.startRg.x;
  return updateBallGuideAxis(
    previous,
    drag.axis,
    drag.startValue + pointerDelta * drag.precisionFactor
  );
}

export function useBallGuide() {
  const [guideState, setGuideState] =
    useState<BallGuideState>(EMPTY_BALL_GUIDE);
  const [guideDragState, setGuideDragState] =
    useState<BallGuideDragState>(EMPTY_BALL_GUIDE_DRAG);
  const guideDragRef = useRef<BallGuideDragState>(EMPTY_BALL_GUIDE_DRAG);

  const selectBallForGuide = useCallback(
    (ballId: string, point: BallGuidePoint) => {
      setGuideState((previous) =>
        selectBallGuideState(previous, ballId, point)
      );
    },
    []
  );

  const startGuideDrag = useCallback(
    (
      axis: BallGuideAxis,
      pointerId: number | null = null,
      startRg: BallGuidePoint | null = null,
      startValue: number | null = null,
      precisionFactor = 1
    ) => {
      const next = {
        active: true,
        axis,
        pointerId,
        startRg,
        startValue,
        precisionFactor,
      };
      guideDragRef.current = next;
      setGuideDragState(next);
      return true;
    },
    []
  );

  const moveGuideDrag = useCallback((pointerRg: BallGuidePoint) => {
    setGuideState((previous) =>
      updateBallGuideFromPointer(previous, guideDragRef.current, pointerRg)
    );
  }, []);

  const nudgeGuide = useCallback((axis: BallGuideAxis, delta: number) => {
    if (!Number.isFinite(delta) || guideDragRef.current.active) return;
    setGuideState((previous) => {
      const currentValue =
        axis === "horizontal"
          ? previous.horizontalY
          : previous.verticalX;
      if (!Number.isFinite(currentValue)) return previous;
      const nextValue = normalizeRgTenth(
        clampBallGuideAxis(axis, currentValue + delta)
      );
      return updateBallGuideAxis(previous, axis, nextValue);
    });
  }, []);

  const setGuideIntersection = useCallback((point: BallGuidePoint) => {
    setGuideState((previous) => setBallGuideIntersection(previous, point));
  }, []);

  /**
   * After successful direct ball drag: re-attach guide intersection to final ball center.
   * No-op unless guide is active for the same ballId.
   */
  const syncGuideAttachmentToBallCenter = useCallback(
    (ballId: string, point: BallGuidePoint) => {
      if (!ballId || !Number.isFinite(point?.x) || !Number.isFinite(point?.y)) {
        return;
      }
      setGuideState((previous) => {
        if (!previous.active || previous.ballId !== ballId) {
          return previous;
        }
        return setBallGuideIntersection(previous, point);
      });
    },
    []
  );

  const endGuideDrag = useCallback((pointerId: number | null = null) => {
    const current = guideDragRef.current;
    if (!current.active) return false;
    if (
      pointerId != null &&
      current.pointerId != null &&
      pointerId !== current.pointerId
    ) {
      return false;
    }
    guideDragRef.current = EMPTY_BALL_GUIDE_DRAG;
    setGuideDragState(EMPTY_BALL_GUIDE_DRAG);
    return true;
  }, []);

  const clearGuide = useCallback(() => {
    guideDragRef.current = EMPTY_BALL_GUIDE_DRAG;
    setGuideDragState(EMPTY_BALL_GUIDE_DRAG);
    setGuideState(EMPTY_BALL_GUIDE);
  }, []);

  return {
    guideState,
    guideDragState,
    selectBallForGuide,
    startGuideDrag,
    moveGuideDrag,
    endGuideDrag,
    nudgeGuide,
    setGuideIntersection,
    syncGuideAttachmentToBallCenter,
    clearGuide,
  };
}
