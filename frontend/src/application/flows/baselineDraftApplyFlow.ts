/**
 * baselineDraftApplyFlow.ts
 * APP-009-C (Batch 5 STEP 5-7B) — Baseline Draft Apply sequence.
 *
 * AD-B5-04 / AD-B5-07 — Application Flow: sequencing only (INV-B5-04).
 * Inverse + 2-of-3 live in domain (resolveBaselineDragSysCommit).
 */

import { resolveBaselineDragSysCommit } from "../../domain/baselineDragSysCommit";
import { canonicalSystemIdForConfig } from "../../domain/system/systemIdentity";
import type { BaselineDraftMark } from "../../overlay/state/baselineDraftState";

export type BaselineDraftApplyTrajectoryApi = {
  state: { adjusted?: unknown };
  setAdjusting: (data: {
    sys: { oneC: number; threeC: number };
  }) => void;
  applySysResult: (result: unknown) => void;
};

export type BaselineDraftApplyFlowContext = {
  mark: BaselineDraftMark;
  appMode: string;
  showBaseLine: boolean;
  overlayState: { open: boolean; type?: string | null };
  baselineDraftState: {
    activeMark?: BaselineDraftMark | null;
    coRg?: { x: number; y: number } | null;
    c1Rg?: { x: number; y: number } | null;
  };
  trackForAnchors: string | null | undefined;
  systemIdForGrid: string | null | undefined;
  activeSlot: string;
  slots: Record<
    string,
    | {
        draft?: { sys?: Record<string, unknown> };
        applied?: { sys?: Record<string, unknown> };
      }
    | undefined
  >;
  resolvedSlotSys: Record<string, unknown> | null | undefined;
  targetColor: string | null;
  trajectory: BaselineDraftApplyTrajectoryApi;
  commitDraftSys: (
    activeSlot: string,
    systemId: string,
    inputDelta: Record<string, number>,
    options: { track: string }
  ) => {
    ok: boolean;
    reason?: string;
    appliedSys?: {
      inputs?: Record<string, unknown>;
      outputs?: { result?: Record<string, unknown> };
    };
  };
  patchSlotRuntimeMeta: (
    slotId: string,
    meta: {
      system_values: Record<string, unknown>;
      targetBall: "red" | "yellow" | null;
    }
  ) => void;
  clearAppliedBaselineDraftMark: (mark: BaselineDraftMark) => void;
};

function slotMergedSysInputs(
  ctx: BaselineDraftApplyFlowContext
): Record<string, unknown> {
  const slot = ctx.slots[ctx.activeSlot];
  const slotSys =
    slot?.draft?.sys ?? slot?.applied?.sys ?? ctx.resolvedSlotSys;
  if (!slotSys || typeof slotSys !== "object") return {};
  const sys = slotSys as {
    inputs?: Record<string, unknown>;
    outputs?: { result?: Record<string, unknown> };
  };
  return {
    ...(sys.inputs ?? {}),
    ...(sys.outputs?.result ?? {}),
  };
}

/** pointerup / ✓ : Mark coord → sys → 2-of-3 → commitDraftSys */
export function runBaselineDraftApply(
  ctx: BaselineDraftApplyFlowContext
): boolean {
  const { mark, baselineDraftState } = ctx;

  if (ctx.appMode !== "ADMIN" || !ctx.showBaseLine) return false;
  if (ctx.overlayState.open) return false;

  const active = baselineDraftState.activeMark;
  if (!active || mark !== active) return false;
  if (mark !== "CO" && mark !== "C1") return false;

  const handleCoord =
    mark === "CO" ? baselineDraftState.coRg : baselineDraftState.c1Rg;
  if (
    !handleCoord ||
    !Number.isFinite(handleCoord.x) ||
    !Number.isFinite(handleCoord.y) ||
    !ctx.trackForAnchors ||
    !ctx.systemIdForGrid
  ) {
    ctx.clearAppliedBaselineDraftMark(mark);
    return false;
  }

  const systemId = canonicalSystemIdForConfig(ctx.systemIdForGrid);
  const slotMerged = slotMergedSysInputs(ctx);
  const resolved = resolveBaselineDragSysCommit({
    systemId,
    track: ctx.trackForAnchors,
    mark,
    coord: handleCoord,
    slotInputs: slotMerged,
  });

  if (!resolved) {
    ctx.clearAppliedBaselineDraftMark(mark);
    return false;
  }

  const activeSlot = ctx.activeSlot;
  const slot = ctx.slots[activeSlot];
  const slotSys =
    slot?.draft?.sys ?? slot?.applied?.sys ?? ctx.resolvedSlotSys;
  const trackVal =
    ctx.trackForAnchors ??
    (slotSys as { track?: string } | null | undefined)?.track ??
    "B2T_L";

  const commitResult = ctx.commitDraftSys(
    activeSlot,
    systemId,
    resolved.inputDelta,
    { track: trackVal }
  );

  if (!commitResult.ok) {
    ctx.clearAppliedBaselineDraftMark(mark);
    return false;
  }

  const appliedSys = commitResult.appliedSys;
  const appliedResult = appliedSys?.outputs?.result;
  const system_values = appliedSys
    ? {
        ...(appliedSys.inputs ?? {}),
        ...(appliedResult ?? {}),
      }
    : resolved.inputDelta;

  ctx.patchSlotRuntimeMeta(activeSlot, {
    system_values,
    targetBall:
      ctx.targetColor === "red" || ctx.targetColor === "yellow"
        ? ctx.targetColor
        : null,
  });

  if (appliedResult && !ctx.trajectory.state.adjusted) {
    ctx.trajectory.setAdjusting({
      sys: {
        oneC: (appliedResult.oneC as number) || 0,
        threeC: (appliedResult.threeC as number) || 0,
      },
    });
  }
  if (appliedResult) {
    ctx.trajectory.applySysResult(appliedResult);
  }

  ctx.clearAppliedBaselineDraftMark(mark);
  return true;
}
