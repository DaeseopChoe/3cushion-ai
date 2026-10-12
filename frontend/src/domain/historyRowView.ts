/**
 * History row display helpers. One row = one authored work item; Derived
 * Members are summarized as a count badge, never listed as rows.
 * Accepts History list rows ({ status, derivedCount }) or full snapshots.
 */

import type { WorkspaceSnapshot } from "./workspaceHistory";
import { countPublishFamilyGraphDerivedMembers } from "./publishFamilyGraph";

export type HistoryDerivedBadge =
  | { kind: "APPROVED"; count: number; label: string }
  | { kind: "PENDING"; label: string };

type HistoryListRowLike = {
  status?: "PENDING" | "APPROVED" | "PUBLISHED";
  derivedCount?: number;
};

function badgeForApproved(count: number): HistoryDerivedBadge | null {
  if (!Number.isFinite(count) || count <= 0) return null;
  return { kind: "APPROVED", count, label: `파생 승인 완료 · ${count}개` };
}

export function buildHistoryDerivedBadge(
  row: (WorkspaceSnapshot & HistoryListRowLike) | HistoryListRowLike | null | undefined
): HistoryDerivedBadge | null {
  if (!row) return null;
  if (typeof row.status === "string") {
    if (row.status === "PENDING") return { kind: "PENDING", label: "파생 승인 전 · Publish 불가" };
    return badgeForApproved(typeof row.derivedCount === "number" ? row.derivedCount : 0);
  }
  const snap = row as WorkspaceSnapshot;
  const approval = snap.derivedApproval;
  if (!approval) return null;
  if (approval.status === "PENDING") {
    return { kind: "PENDING", label: "파생 승인 전 · Publish 불가" };
  }
  if (approval.status !== "APPROVED") return null;
  let count =
    typeof approval.derivedCount === "number" && Number.isFinite(approval.derivedCount)
      ? approval.derivedCount
      : 0;
  if (count <= 0 && snap.publishFamilyGraph) {
    count = countPublishFamilyGraphDerivedMembers(snap.publishFamilyGraph);
  }
  return badgeForApproved(count);
}
