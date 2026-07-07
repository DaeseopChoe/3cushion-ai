// domain/dataset/autoCapture.ts
// MISC-002 — Strategy Auto Capture hook (extraction from App.jsx)
// Batch 3 STEP 3-2

import { useEffect, useRef } from "react";
import { createCaptureCandidate } from "../../data/autoCaptureEngine";
import { calcImpactBall } from "../../data/system/calculator";

export interface AutoCaptureProps {
  canEdit: boolean;
  overlayOpen: boolean;
  ballsState: Record<string, { x: number; y: number } | undefined> | null;
  adminSys: Record<string, unknown> | null | undefined;
  adminHptT: string | null | undefined;
  viewBalls: Record<string, { x: number; y: number } | undefined> | null | undefined;
}

export function useAutoCapture({
  canEdit,
  overlayOpen,
  ballsState,
  adminSys,
  adminHptT,
  viewBalls,
}: AutoCaptureProps): void {
  const lastCapturedRef = useRef<ReturnType<typeof createCaptureCandidate> | null>(null);

  useEffect(() => {
    if (!canEdit || overlayOpen) return;
    const balls = ballsState ?? viewBalls ?? {};
    const cue = balls.cue;
    const target =
      (balls as Record<string, { x: number; y: number } | undefined>)
        .target_center ?? balls.target;
    if (!cue || !target) return;

    const timer = setTimeout(() => {
      const impact =
        balls.impact ??
        calcImpactBall(cue, target, adminHptT ?? "8/8");
      const sysVals =
        (adminSys as { systemValues?: Record<string, unknown>; inputs?: Record<string, unknown> } | null)
          ?.systemValues ??
        (adminSys as { inputs?: Record<string, unknown> } | null)?.inputs ??
        {};
      lastCapturedRef.current = createCaptureCandidate({
        balls,
        impact: impact ?? undefined,
        systemValues: sysVals,
      });
    }, 1000);

    return () => clearTimeout(timer);
  }, [canEdit, overlayOpen, ballsState, adminSys, adminHptT, viewBalls]);
}
