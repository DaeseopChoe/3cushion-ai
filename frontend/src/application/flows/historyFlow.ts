// application/flows/historyFlow.ts
// DS-003 — Canonical Save + D History Flow
// Batch 3 STEP 3-7B
//
// AD-B3-02: Hybrid Object Context (READ / WRITE / ACTION 분리).
// React import 금지. Hook 사용 금지. Named Export Only.
//
// Flow → Flow: saveFlow.runSaveStrategy 경유 (동일 Layer 참조 허용).

import { runSaveStrategy, type SaveFlowContext, type SaveFlowResult } from "./saveFlow";
import type { Point, PositionRecord } from "../../domain/positionSearchEngine";
import type { PublishOperation } from "../../domain/publishOperation";
import { OVERWRITE_MISSING_SOURCE_USER_MESSAGE } from "../../domain/family/publishedEditSession";
import type { WorkHistorySaveMode } from "../../domain/workHistory/workHistorySaveCommit";
import type { PendingNewFamilySaveToken } from "./pendingSaveCancelFlow";

export type HistorySaveMode = WorkHistorySaveMode;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type HistoryFlowContext = SaveFlowContext & {
  // READ (추가)
  canUseSystemControls: boolean;
  /** Authored path (C1..C4) stored with a new-Family PENDING snapshot for F5 resume. */
  authoredPathNodes?: ReadonlyArray<Point | null | undefined> | null;

  // ACTION (추가)
  commitWorkspaceHistoryWithStrategyDataset: (
    updated: PositionRecord[],
    runtimeOverride?: {
      adminState: unknown;
      ballsState: unknown;
      shotEditor: unknown;
      targetBall: string | null;
    },
    publishOperation?: PublishOperation | null,
    historyOptions?: {
      mode: HistorySaveMode;
      authoredPathNodes?: ReadonlyArray<Point | null | undefined> | null;
    }
  ) => Promise<{ ok: boolean; reason?: string; snapshotId?: string } | void>;
};

export type CanonicalSaveResult = SaveFlowResult & {
  /** History snapshot created by this SAVE (PENDING until derived approval for new Families). */
  historySnapshotId?: string;
  historyMode?: HistorySaveMode;
  /** New-Family SAVE only: lets a Derived Review cancel revert this whole SAVE. */
  pendingNewFamilySave?: PendingNewFamilySaveToken;
};

/**
 * New 4-track Family SAVE → History snapshot waits for derived approval.
 * OVERWRITE of a 4-track Family → Members preserved, APPROVED immediately.
 */
export function resolveHistorySaveMode(
  saveCommand: SaveFlowContext["saveCommand"],
  r: SaveFlowResult
): HistorySaveMode {
  if (!r.fourTrackWritten) return "IMMEDIATE";
  return saveCommand === "OVERWRITE" ? "OVERWRITE_PRESERVED" : "PENDING_DERIVED_APPROVAL";
}

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

/**
 * Canonical Save Flow (DS-003).
 * 저장 가능 상태 검증 → runSaveStrategy (session dataset) → D History snapshot.
 * History failure → SAVE not successful and the session dataset is restored.
 */
export async function runCanonicalSave(ctx: HistoryFlowContext): Promise<CanonicalSaveResult> {
  if (!ctx.canUseSystemControls) {
    alert("Search 또는 History 편집 세션과 Target 확정 후 저장할 수 있습니다.");
    return { ok: false, reason: "controls-unavailable" };
  }

  const adminSys = ctx.adminState?.sys as
    | Record<string, unknown>
    | undefined;
  const systemId: string =
    (adminSys?.system_id as string | undefined) ??
    (adminSys?.system as string | undefined) ??
    "5_half_system";

  if (!systemId || systemId === "null") {
    alert("시스템을 선택하세요 (SYS 설정)");
    return { ok: false, reason: "missing-system" };
  }

  // SRCH-005 + DS-002: Strategy 저장
  const r = runSaveStrategy(ctx);

  if (!r?.ok) {
    if (import.meta.env.DEV) {
      console.warn("[SAVE] failed", r?.reason);
    }
    if (r?.reason === "overwrite-missing-source-family") {
      alert(OVERWRITE_MISSING_SOURCE_USER_MESSAGE);
    } else if (r?.reason === "missing-balls-state-cue") {
      alert(
        "공 배치(ballsState)를 확인할 수 없습니다. 테이블 공 위치를 확인 후 다시 저장하세요."
      );
    } else {
      alert(`저장 실패: ${r?.reason ?? "알 수 없는 오류"}`);
    }
    return r ?? { ok: false, reason: "save-failed" };
  }

  if (!r.updated) return r;

  const historyMode = resolveHistorySaveMode(ctx.saveCommand, r);
  const commitResult = await ctx.commitWorkspaceHistoryWithStrategyDataset(
    r.updated,
    undefined,
    r.publishOperation ?? null,
    { mode: historyMode, authoredPathNodes: ctx.authoredPathNodes ?? null }
  );
  if (!commitResult || commitResult.ok === false) {
    ctx.setDataset(ctx.dataset ?? []);
    return {
      ok: false,
      reason: (commitResult && commitResult.reason) || "history-commit-failed",
    };
  }
  const historySnapshotId = commitResult.snapshotId;
  const pendingNewFamilySave: PendingNewFamilySaveToken | undefined =
    historyMode === "PENDING_DERIVED_APPROVAL" && historySnapshotId && r.familyId
      ? { historySnapshotId, familyId: r.familyId }
      : undefined;
  return {
    ...r,
    historyMode,
    ...(historySnapshotId ? { historySnapshotId } : {}),
    ...(pendingNewFamilySave ? { pendingNewFamilySave } : {}),
  };
}
