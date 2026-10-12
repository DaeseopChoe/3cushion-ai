// application/flows/pendingSaveCancelFlow.ts
// New-Family SAVE and its Derived Approval are one operation: cancelling the
// review reverts the whole SAVE by removing its PENDING D History snapshot.
//
// React import 금지. Hook 사용 금지. Named Export Only.

import type { WorkHistoryApi } from "../../domain/workHistory/workHistoryClient";

/** Issued by runCanonicalSave for a new 4-track Family SAVE only. */
export type PendingNewFamilySaveToken = {
  historySnapshotId: string;
  familyId: string;
};

export type CancelPendingNewFamilySaveCode =
  | "REVERTED"
  | "TOKEN_INVALID"
  | "HISTORY_UNAVAILABLE"
  | "HISTORY_ROW_MISSING"
  | "HISTORY_ROW_NOT_PENDING"
  | "HISTORY_ROW_FAMILY_MISMATCH"
  | "HISTORY_REMOVE_FAILED";

export type CancelPendingNewFamilySaveResult = {
  ok: boolean;
  code: CancelPendingNewFamilySaveCode;
  /** The PENDING snapshot is gone. */
  historyRowRemoved: boolean;
  reason?: string;
};

const CODE_BY_API: Record<string, CancelPendingNewFamilySaveCode> = {
  NOT_FOUND: "HISTORY_ROW_MISSING",
  NOT_PENDING: "HISTORY_ROW_NOT_PENDING",
  FAMILY_MISMATCH: "HISTORY_ROW_FAMILY_MISMATCH",
  HOST_UNAVAILABLE: "HISTORY_UNAVAILABLE",
  INDEX_UNREADABLE: "HISTORY_UNAVAILABLE",
  INVALID_ID: "TOKEN_INVALID",
  INVALID_INPUT: "TOKEN_INVALID",
};

/**
 * The server checks the snapshot is still PENDING and belongs to this Family,
 * then removes it atomically (file + index). Anything else changes nothing;
 * a PENDING snapshot that survives stays non-publishable.
 */
export async function cancelPendingNewFamilySave(
  token: PendingNewFamilySaveToken | null | undefined,
  api: WorkHistoryApi
): Promise<CancelPendingNewFamilySaveResult> {
  if (
    !token ||
    typeof token.historySnapshotId !== "string" ||
    !token.historySnapshotId ||
    typeof token.familyId !== "string" ||
    !token.familyId
  ) {
    return { ok: false, code: "TOKEN_INVALID", historyRowRemoved: false };
  }
  let removed: Awaited<ReturnType<WorkHistoryApi["cancelPending"]>>;
  try {
    removed = await api.cancelPending({
      snapshotId: token.historySnapshotId,
      familyId: token.familyId,
    });
  } catch {
    return { ok: false, code: "HISTORY_UNAVAILABLE", historyRowRemoved: false };
  }
  if (!removed.ok) {
    return {
      ok: false,
      code: CODE_BY_API[removed.code] ?? "HISTORY_REMOVE_FAILED",
      historyRowRemoved: false,
      reason: removed.code,
    };
  }
  return { ok: true, code: "REVERTED", historyRowRemoved: true };
}

const CANCEL_FAILURE_DETAIL: Record<string, string> = {
  TOKEN_INVALID: "되돌리기 정보가 올바르지 않습니다.",
  HISTORY_UNAVAILABLE: "History를 사용할 수 없어 저장을 취소하지 못했습니다.",
  HISTORY_ROW_MISSING: "이 작업의 History 기록을 찾을 수 없습니다.",
  HISTORY_ROW_NOT_PENDING: "이 작업은 이미 파생 승인이 끝나 새 SAVE 취소 대상이 아닙니다.",
  HISTORY_ROW_FAMILY_MISMATCH: "History 기록의 Family가 이번 SAVE와 다릅니다.",
  HISTORY_REMOVE_FAILED: "History 기록을 지우지 못했습니다.",
};

/** User-facing alert text for a cancel that could not revert the SAVE. */
export function describePendingSaveCancelFailure(
  result: CancelPendingNewFamilySaveResult | null | undefined
): string {
  const detail = result
    ? CANCEL_FAILURE_DETAIL[result.code] ?? "알 수 없는 이유로 취소하지 못했습니다."
    : "되돌리기 정보가 없어 저장을 취소하지 못했습니다.";
  return [
    "저장 취소 실패",
    detail,
    "History는 바꾸지 않았습니다. 이 작업은 '파생 승인 전 · Publish 불가' 상태로 남아 배포되지 않습니다.",
    "검토 화면은 그대로 둡니다. 다시 [취소]하거나 [승인]할 수 있습니다.",
  ].join("\n");
}
