// application/flows/derivedApprovalFlow.ts
// Derived Approval → canonical normalized corpus mutate (no canonical SAVE).

import type { PositionRecord } from "../../domain/positionSearchEngine";
import {
  persistWorkingCorpusNormalizedAuthority,
} from "../../domain/dataset/infra/persistWorkingCorpusNormalizedAuthority";
import type { PersistPositionsWithGenerationResult } from "../../domain/dataset/infra/persistPositionsDatasetWithGeneration";
import type { NormalizedDualWriteResult } from "../../domain/family/syncPositionDatasetToNormalizedFamilyStore";
import { normalizePublishedShotTypeHint } from "./recallHydrateFlow";

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
  /**
   * @deprecated Phase C-2 — ignored. Flat positions_dataset is not production-written.
   */
  saveWorkingDataset?: (updated: PositionRecord[]) => void;
  setDataset: (updated: PositionRecord[]) => void;
  restoreDerivedReviewSnapshot: (snapshot: DerivedReviewBaselineSnapshot | null) => void;
  /** @deprecated Approval no longer double-appends history; kept optional for backwards compatibility. */
  commitWorkspaceHistoryWithStrategyDataset?: (
    updated: PositionRecord[],
    runtimeOverride?: DerivedApprovalHistoryRuntimeOverride
  ) => void;
  /** Leaf metadata for normalized envelope (defaults applied if omitted). */
  shotType?: string;
  systemId?: string;
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
  /** Phase C-2: family_* shadow skipped (shape retained for callers). */
  normalizedDualWrite: NormalizedDualWriteResult;
  /** Phase C-2: flat projection skipped (shape retained for callers). */
  corpusPersist: PersistPositionsWithGenerationResult;
  /** True when authoritative normalized corpus commit succeeded. */
  canonicalOk: boolean;
  canonicalReason?: string;
};

/**
 * Persist approved Derived members via canonical normalized commit first.
 * Single successor workspace_history snapshot is committed by runCanonicalSave.
 * Must not call runSaveStrategy / runCanonicalSave or double-append history.
 */
export function commitDerivedApprovalDataset(
  ctx: DerivedApprovalCommitContext
): DerivedApprovalCommitResult {
  const adminSys = ctx.baselineSnapshot?.adminState as
    | { sys?: Record<string, unknown> }
    | undefined;
  const shotType =
    normalizePublishedShotTypeHint(ctx.shotType) ??
    normalizePublishedShotTypeHint(adminSys?.sys?.shotType) ??
    "뒤돌리기";
  const systemId =
    (typeof ctx.systemId === "string" && ctx.systemId.trim()
      ? ctx.systemId.trim()
      : "") ||
    (typeof adminSys?.sys?.system_id === "string"
      ? adminSys.sys.system_id
      : "") ||
    (typeof adminSys?.sys?.systemId === "string"
      ? adminSys.sys.systemId
      : "") ||
    "5_half_system";

  const corpusPersist = persistWorkingCorpusNormalizedAuthority({
    dataset: ctx.resultDataset,
    shotType,
    systemId,
  });

  if (!corpusPersist.ok) {
    console.warn(
      "[APPROVAL] canonical normalized corpus persist failed",
      corpusPersist.stage,
      corpusPersist.reason
    );
    return {
      canonicalOk: false,
      canonicalReason: corpusPersist.reason,
      corpusPersist: {
        ok: false,
        stage: "generation",
        reason: corpusPersist.reason,
        previousGeneration: null,
      },
      normalizedDualWrite: {
        ok: false,
        stage: "generation",
        reason: corpusPersist.reason,
      },
    };
  }

  ctx.setDataset(ctx.resultDataset);

  const normalizedDualWrite: NormalizedDualWriteResult =
    corpusPersist.shadowSync.ok === true
      ? corpusPersist.shadowSync
      : {
          ok: false,
          stage: "exception",
          reason:
            "reason" in corpusPersist.shadowSync
              ? String(corpusPersist.shadowSync.reason)
              : "family_* shadow not written (Phase C-2)",
        };

  if (ctx.baselineSnapshot) {
    ctx.restoreDerivedReviewSnapshot(ctx.baselineSnapshot);
  }

  return {
    canonicalOk: true,
    normalizedDualWrite,
    corpusPersist: corpusPersist.flatProjection,
  };
}
