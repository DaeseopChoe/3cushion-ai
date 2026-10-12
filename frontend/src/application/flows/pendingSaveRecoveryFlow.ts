// application/flows/pendingSaveRecoveryFlow.ts
// New-Family SAVE ↔ Derived Approval gaps:
//  - Review cannot start right after SAVE → revert the whole SAVE.
//  - Page reload (F5) before Approve/cancel → the PENDING D History snapshot
//    is found and offers resume or cancel. Nothing is kept in the browser.
//
// React import 금지. Hook 사용 금지. Named Export Only.

import type { Point, PositionRecord } from "../../domain/positionSearchEngine";
import {
  createUnifiedDerivedReview,
  type UnifiedDerivedReviewBag,
} from "../../domain/family/unifiedDerivedReview";
import { rematerializeFamilyPartsToPositionRecords } from "../../domain/family/rematerializeFamilyPartsToPositionRecords";
import { isDerivedMemberOrigin } from "../../domain/publishFamilyGraph";
import type { WorkHistoryApi } from "../../domain/workHistory/workHistoryClient";
import type {
  WorkHistoryIndexEntry,
  WorkHistorySnapshot,
} from "../../domain/workHistory/workHistoryModel";
import {
  cancelPendingNewFamilySave,
  type CancelPendingNewFamilySaveResult,
  type PendingNewFamilySaveToken,
} from "./pendingSaveCancelFlow";

export const REVIEW_START_FAILED_REVERTED_MESSAGE =
  "파생 검토를 시작할 수 없어 새 저장을 되돌렸습니다.\n기존 작업 데이터는 유지되었습니다.";

const PENDING_ROW_BLOCKED =
  "이 작업은 History에 '파생 승인 전 · Publish 불가' 상태로 남아 배포되지 않습니다.";
const HISTORY_DELETE_SCOPE =
  "History의 삭제는 이 작업 기록만 지웁니다. 이미 Published된 데이터는 삭제되지 않습니다.";

function toPathNodes(nodes: ReadonlyArray<Point | null | undefined> | null | undefined) {
  return (Array.isArray(nodes) ? nodes : []).map((p) => (p == null ? null : { x: p.x, y: p.y }));
}

// ---------------------------------------------------------------------------
// Review start right after SAVE
// ---------------------------------------------------------------------------

export type StartNewFamilyDerivedReviewResult =
  | { ok: true; bag: UnifiedDerivedReviewBag }
  | {
      ok: false;
      code: "REVIEW_START_FAILED";
      reviewCode: string;
      reviewReason: string;
      revert: CancelPendingNewFamilySaveResult;
    };

/**
 * Opens the Derived Review for a just-saved new Family. On failure the whole
 * SAVE is reverted (PENDING snapshot removed). The PENDING snapshot already
 * holds the path nodes, so a reload can resume without any browser record.
 */
export async function startNewFamilyDerivedReview(args: {
  token: PendingNewFamilySaveToken;
  dataset: PositionRecord[];
  authoredPathNodes: ReadonlyArray<Point | null | undefined>;
  hitTolerance?: number;
  api: WorkHistoryApi;
}): Promise<StartNewFamilyDerivedReviewResult> {
  const review = createUnifiedDerivedReview({
    dataset: Array.isArray(args.dataset) ? args.dataset : [],
    familyId: args.token.familyId,
    authoredPathNodes: toPathNodes(args.authoredPathNodes),
    ...(args.hitTolerance !== undefined ? { hitTolerance: args.hitTolerance } : {}),
  });
  if (!review.ok || review.bag.familyId !== args.token.familyId) {
    return {
      ok: false,
      code: "REVIEW_START_FAILED",
      reviewCode: review.ok ? "FAMILY_MISMATCH" : review.code,
      reviewReason: review.ok ? `review:${review.bag.familyId}` : review.reason,
      revert: await cancelPendingNewFamilySave(args.token, args.api),
    };
  }
  return { ok: true, bag: review.bag };
}

/** Alert text after a failed review start (with or without a successful revert). */
export function describeNewFamilyReviewStartFailure(
  result: Extract<StartNewFamilyDerivedReviewResult, { ok: false }> | null,
  reviewReason?: string
): string {
  const cause = result?.reviewReason ?? reviewReason;
  const causeLine = cause ? `\n(검토 시작 실패 원인: ${cause})` : "";
  if (result?.revert.ok) return REVIEW_START_FAILED_REVERTED_MESSAGE + causeLine;
  return (
    "파생 검토를 시작할 수 없고, 새 저장도 자동으로 되돌리지 못했습니다." +
    causeLine +
    `\n${PENDING_ROW_BLOCKED}\n` +
    "정리 방법: History에서 이 작업을 다시 불러와 [새 SAVE 취소]를 누르거나, History에서 삭제하세요.\n" +
    HISTORY_DELETE_SCOPE
  );
}

// ---------------------------------------------------------------------------
// Reload recovery
// ---------------------------------------------------------------------------

export type InspectPendingWorkHistoryResult =
  | { kind: "NONE" }
  | { kind: "RECOVERABLE"; token: PendingNewFamilySaveToken; entry: WorkHistoryIndexEntry }
  | { kind: "UNAVAILABLE"; code: string; message: string };

/** Read-only check on ADMIN entry: the latest PENDING snapshot, if any. */
export async function inspectPendingWorkHistory(
  api: WorkHistoryApi
): Promise<InspectPendingWorkHistoryResult> {
  const listed = await api.list();
  if (!listed.ok) return { kind: "UNAVAILABLE", code: listed.code, message: listed.message };
  const pending = listed.entries
    .filter((e) => e.status === "PENDING" && typeof e.familyId === "string" && e.familyId)
    .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  const latest = pending[0];
  if (!latest) return { kind: "NONE" };
  return {
    kind: "RECOVERABLE",
    token: { historySnapshotId: latest.snapshotId, familyId: latest.familyId as string },
    entry: latest,
  };
}

export type RebuildPendingNewFamilyReviewResult =
  | {
      ok: true;
      bag: UnifiedDerivedReviewBag;
      dataset: PositionRecord[];
      token: PendingNewFamilySaveToken;
      historySnapshotId: string;
      authoredPathNodes: Array<Point | null>;
      /** Screen state stored with the PENDING snapshot at SAVE time. */
      rowState: WorkHistorySnapshot["state"];
    }
  | {
      ok: false;
      code: "HISTORY_UNAVAILABLE" | "HISTORY_ROW_MISSING" | "HISTORY_ROW_NOT_PENDING" | "FAMILY_MISSING" | "REVIEW_REBUILD_FAILED";
      reason: string;
    };

/**
 * [파생 승인 재개]: rebuild the same review from the base Family stored in the
 * PENDING snapshot. Writes nothing; the same familyId, Member ids and snapshot
 * are reused.
 */
export async function rebuildPendingNewFamilyReview(args: {
  api: WorkHistoryApi;
  snapshotId: string;
  hitTolerance?: number;
}): Promise<RebuildPendingNewFamilyReviewResult> {
  const read = await args.api.read(args.snapshotId);
  if (!read.ok) {
    return {
      ok: false,
      code: read.code === "NOT_FOUND" ? "HISTORY_ROW_MISSING" : "HISTORY_UNAVAILABLE",
      reason: read.code,
    };
  }
  const { entry, snapshot } = read;
  if (entry.status !== "PENDING") {
    return { ok: false, code: "HISTORY_ROW_NOT_PENDING", reason: entry.status };
  }
  const graph = snapshot.pendingFamilyGraph;
  const baseMembers = graph ? graph.members.filter((m) => !isDerivedMemberOrigin(m.memberOrigin)) : [];
  if (!graph || !baseMembers.some((m) => m.memberOrigin === "AUTHORED")) {
    return { ok: false, code: "FAMILY_MISSING", reason: "pending-graph-missing" };
  }
  const mat = rematerializeFamilyPartsToPositionRecords({ masters: [graph.master], members: baseMembers });
  if (!mat.ok) {
    return { ok: false, code: "REVIEW_REBUILD_FAILED", reason: mat.issues[0]?.code ?? "rematerialize" };
  }
  const authoredPathNodes = toPathNodes(snapshot.authoredPathNodes as Array<Point | null> | undefined);
  const review = createUnifiedDerivedReview({
    dataset: mat.dataset,
    familyId: graph.familyId,
    authoredPathNodes,
    ...(args.hitTolerance !== undefined ? { hitTolerance: args.hitTolerance } : {}),
  });
  if (!review.ok) return { ok: false, code: "REVIEW_REBUILD_FAILED", reason: review.reason };
  if (review.bag.familyId !== graph.familyId) {
    return { ok: false, code: "REVIEW_REBUILD_FAILED", reason: `review:${review.bag.familyId}` };
  }
  return {
    ok: true,
    bag: review.bag,
    dataset: review.dataset,
    token: { historySnapshotId: entry.snapshotId, familyId: graph.familyId },
    historySnapshotId: entry.snapshotId,
    authoredPathNodes,
    rowState: snapshot.state,
  };
}

const UNAVAILABLE_DETAIL: Record<string, string> = {
  HISTORY_UNAVAILABLE: "History를 읽을 수 없습니다.",
  HISTORY_ROW_MISSING: "이 작업의 History 기록이 이미 삭제되었습니다.",
  HISTORY_ROW_NOT_PENDING: "이 작업은 이미 파생 승인이 끝났습니다.",
  FAMILY_MISSING: "History 기록에 새 Family 정보가 없습니다.",
  REVIEW_REBUILD_FAILED: "파생 검토를 다시 만들 수 없습니다.",
};

/** [파생 승인 재개] failed: no fake review is opened and nothing is deleted. */
export function describePendingSaveResumeFailure(
  result: Extract<RebuildPendingNewFamilyReviewResult, { ok: false }>
): string {
  return [
    "파생 검토를 다시 열 수 없습니다.",
    `원인: ${UNAVAILABLE_DETAIL[result.code] ?? "알 수 없는 오류"}`,
    "History는 바꾸지 않았습니다. " + PENDING_ROW_BLOCKED,
    "[새 SAVE 취소]로 저장 전 상태로 되돌리거나, History에서 이 작업을 삭제하세요.",
    HISTORY_DELETE_SCOPE,
  ].join("\n");
}

/** Notice when the ADMIN entry check cannot read the History. */
export function describePendingSaveRecoveryUnavailable(args: { code: string; message?: string }): string {
  return [
    "승인 전 작업을 확인할 수 없습니다.",
    args.message || UNAVAILABLE_DETAIL.HISTORY_UNAVAILABLE,
    "History는 자동으로 바꾸지 않았습니다.",
  ].join("\n");
}
