// application/flows/derivedApprovalFlow.ts
// Derived Approval → the same D History snapshot becomes APPROVED with the
// approved Family graph (no canonical SAVE, no browser storage).

import type { PositionRecord } from "../../domain/positionSearchEngine";
import {
  buildPublishFamilyGraphFromRecords,
  type PublishFamilyGraph,
} from "../../domain/publishFamilyGraph";
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

/** Explicit runtime fields for a History snapshot — avoids React closure staleness. */
export type DerivedApprovalHistoryRuntimeOverride = {
  adminState: unknown;
  ballsState: unknown;
  shotEditor: unknown;
  targetBall: string | null;
};

export type DerivedApprovalCommitContext = {
  resultDataset: PositionRecord[];
  baselineSnapshot: DerivedReviewBaselineSnapshot | null;
  setDataset: (updated: PositionRecord[]) => void;
  restoreDerivedReviewSnapshot: (snapshot: DerivedReviewBaselineSnapshot | null) => void;
  /** Leaf metadata for the graph (defaults applied if omitted). */
  shotType?: string;
  systemId?: string;
  /** Approved Family. */
  familyId?: string;
  /**
   * Stores the approved graph on the PENDING History snapshot. Required: the
   * graph has no other durable home. Failure leaves the snapshot PENDING.
   */
  finalizeHistory?: (args: {
    familyId: string;
    graph: PublishFamilyGraph;
  }) => Promise<{ ok: boolean; reason?: string; code?: string; message?: string }>;
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
  ok: boolean;
  reason?: string;
  historyOk: boolean;
  historyReason?: string;
  historyMessage?: string;
  approvedGraph?: PublishFamilyGraph;
};

/**
 * Build the approved graph from the review result, store it on the PENDING
 * History snapshot, and only then update the session dataset.
 * Must not call runSaveStrategy / runCanonicalSave.
 */
export async function commitDerivedApprovalDataset(
  ctx: DerivedApprovalCommitContext
): Promise<DerivedApprovalCommitResult> {
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

  if (typeof ctx.finalizeHistory !== "function") {
    return { ok: false, reason: "approval-history-missing", historyOk: false };
  }
  const familyId = typeof ctx.familyId === "string" ? ctx.familyId.trim() : "";
  if (!familyId) {
    return { ok: false, reason: "approval-family-id-missing", historyOk: false };
  }
  const built = buildPublishFamilyGraphFromRecords(ctx.resultDataset, familyId, {
    shotType,
    systemId,
  });
  if (!built.ok) {
    return {
      ok: false,
      reason: `approval-graph-invalid: ${built.reason}`,
      historyOk: false,
      historyReason: built.reason,
    };
  }

  let history: { ok: boolean; reason?: string; code?: string; message?: string };
  try {
    history = await ctx.finalizeHistory({ familyId, graph: built.graph });
  } catch {
    history = { ok: false, reason: "history-commit-threw" };
  }
  if (!history || !history.ok) {
    const historyReason = history?.code ?? history?.reason ?? "unknown";
    console.warn("[APPROVAL] History graph commit failed", historyReason);
    return {
      ok: false,
      reason: `history-commit-failed: ${historyReason}`,
      historyOk: false,
      historyReason,
      ...(history?.message ? { historyMessage: history.message } : {}),
    };
  }

  ctx.setDataset(ctx.resultDataset);
  if (ctx.baselineSnapshot) {
    ctx.restoreDerivedReviewSnapshot(ctx.baselineSnapshot);
  }
  return { ok: true, historyOk: true, approvedGraph: built.graph };
}
