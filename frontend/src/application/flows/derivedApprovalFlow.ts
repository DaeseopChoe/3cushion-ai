// application/flows/derivedApprovalFlow.ts
// Derived Approval → working dataset + workspace history (no canonical SAVE).

import type { PositionRecord } from "../../domain/positionSearchEngine";
import {
  syncPositionDatasetToNormalizedFamilyStore,
  type NormalizedDualWriteResult,
} from "../../domain/family/syncPositionDatasetToNormalizedFamilyStore";

/** Review-start baseline captured by App.jsx captureDerivedReviewSnapshot. */
export type DerivedReviewBaselineSnapshot = {
  ballsState: unknown;
  adminState: unknown;
  overlayState: unknown;
  targetColor: string | null;
  isTargetSelected: boolean;
  shotEditor: unknown;
  activeSlot: string;
};

/** Explicit runtime fields for workspace_history — avoids React closure staleness. */
export type DerivedApprovalHistoryRuntimeOverride = {
  adminState: unknown;
  ballsState: unknown;
  shotEditor: unknown;
  targetBall: string | null;
};

export type DerivedApprovalCommitContext = {
  resultDataset: PositionRecord[];
  baselineSnapshot: DerivedReviewBaselineSnapshot | null;
  saveWorkingDataset: (updated: PositionRecord[]) => void;
  setDataset: (updated: PositionRecord[]) => void;
  restoreDerivedReviewSnapshot: (snapshot: DerivedReviewBaselineSnapshot | null) => void;
  commitWorkspaceHistoryWithStrategyDataset: (
    updated: PositionRecord[],
    runtimeOverride?: DerivedApprovalHistoryRuntimeOverride
  ) => void;
};

export function baselineSnapshotToHistoryRuntime(
  baseline: DerivedReviewBaselineSnapshot
): DerivedApprovalHistoryRuntimeOverride {
  return {
    adminState: JSON.parse(JSON.stringify(baseline.adminState)),
    ballsState: baseline.ballsState
      ? JSON.parse(JSON.stringify(baseline.ballsState))
      : null,
    shotEditor: JSON.parse(JSON.stringify(baseline.shotEditor)),
    targetBall: baseline.targetColor ?? null,
  };
}

export type DerivedApprovalCommitResult = {
  /** Phase 3A-326 shadow dual-write; failure never rolls back positions_dataset. */
  normalizedDualWrite: NormalizedDualWriteResult;
};

/**
 * Persist approved Derived members, restore pre-review authoring runtime,
 * append one workspace_history snapshot (AFTER dataset + baseline runtime).
 * Must not call runSaveStrategy / runCanonicalSave.
 */
export function commitDerivedApprovalDataset(
  ctx: DerivedApprovalCommitContext
): DerivedApprovalCommitResult {
  ctx.saveWorkingDataset(ctx.resultDataset);
  ctx.setDataset(ctx.resultDataset);

  // Shadow FamilyMaster/Member sync after legacy corpus write succeeds.
  const normalizedDualWrite = syncPositionDatasetToNormalizedFamilyStore(
    ctx.resultDataset
  );

  const historyRuntime = ctx.baselineSnapshot
    ? baselineSnapshotToHistoryRuntime(ctx.baselineSnapshot)
    : undefined;

  if (ctx.baselineSnapshot) {
    ctx.restoreDerivedReviewSnapshot(ctx.baselineSnapshot);
  }

  ctx.commitWorkspaceHistoryWithStrategyDataset(ctx.resultDataset, historyRuntime);
  return { normalizedDualWrite };
}
