// application/flows/derivedApprovalFlow.ts
// Derived Approval → working dataset + workspace history (no canonical SAVE).

import type { PositionRecord } from "../../domain/positionSearchEngine";
import {
  persistPositionsDatasetWithGeneration,
  type PersistPositionsWithGenerationResult,
} from "../../domain/dataset/infra/persistPositionsDatasetWithGeneration";
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
  /** Optional DI callback after durable persist (tests / React mirror helpers). */
  saveWorkingDataset?: (updated: PositionRecord[]) => void;
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
  /** Phase 3A-335 corpus persist result. */
  corpusPersist: PersistPositionsWithGenerationResult;
};

/**
 * Persist approved Derived members, restore pre-review authoring runtime,
 * append one workspace_history snapshot (AFTER durable corpus + baseline runtime).
 * Must not call runSaveStrategy / runCanonicalSave.
 */
export function commitDerivedApprovalDataset(
  ctx: DerivedApprovalCommitContext
): DerivedApprovalCommitResult {
  // Phase 3A-335: invalidate → positions → generation (fail-closed).
  const corpusPersist = persistPositionsDatasetWithGeneration(ctx.resultDataset);
  if (!corpusPersist.ok) {
    console.warn(
      "[APPROVAL] safe corpus persist failed",
      corpusPersist.stage,
      corpusPersist.reason
    );
    return {
      corpusPersist,
      normalizedDualWrite: {
        ok: false,
        stage: "generation",
        reason: corpusPersist.reason,
      },
    };
  }

  ctx.setDataset(ctx.resultDataset);
  ctx.saveWorkingDataset?.(ctx.resultDataset);

  const normalizedDualWrite = syncPositionDatasetToNormalizedFamilyStore(
    ctx.resultDataset,
    { corpusGeneration: corpusPersist.corpusGeneration }
  );

  const historyRuntime = ctx.baselineSnapshot
    ? baselineSnapshotToHistoryRuntime(ctx.baselineSnapshot)
    : undefined;

  if (ctx.baselineSnapshot) {
    ctx.restoreDerivedReviewSnapshot(ctx.baselineSnapshot);
  }

  ctx.commitWorkspaceHistoryWithStrategyDataset(ctx.resultDataset, historyRuntime);
  return { normalizedDualWrite, corpusPersist };
}
