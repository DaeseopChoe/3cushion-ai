/**
 * Work History ledger model (shared by the localhost file store and the browser).
 *
 * One snapshot file per work item; the index holds list metadata only.
 * Snapshot files keep the WorkspaceSnapshot shape so Publish input / badges
 * read them unchanged.
 */

import type { WorkspaceSnapshot } from "../workspaceHistory";
import type { PublishFamilyGraph } from "../publishFamilyGraph";
import { countPublishFamilyGraphDerivedMembers } from "../publishFamilyGraph";
import { readPublishOperationFromSnapshot } from "../publishOperation";
import { buildPublishClientItemFromSnapshot } from "../historyPublishInput";

export const WORK_HISTORY_SCHEMA_VERSION = 1 as const;

export type WorkHistoryStatus = "PENDING" | "APPROVED" | "PUBLISHED";

export type WorkHistoryPathNode = { x: number; y: number } | null;

export type WorkHistoryPublishedInfo = { publishedAt: string; commit: string | null };

export type WorkHistorySnapshot = WorkspaceSnapshot & {
  schemaVersion: typeof WORK_HISTORY_SCHEMA_VERSION;
  revision: number;
  status: WorkHistoryStatus;
  createdAt: string;
  updatedAt: string;
  systemLabel?: string | null;
  /** PENDING only: the Family as saved (Master + base Members), replaced by publishFamilyGraph on approval. */
  pendingFamilyGraph?: PublishFamilyGraph;
  /** C3+ authored path at SAVE time (derived review rebuild after reload). */
  authoredPathNodes?: WorkHistoryPathNode[];
  published?: WorkHistoryPublishedInfo | null;
};

export type WorkHistoryIndexEntry = {
  snapshotId: string;
  name: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  shotType: string;
  systemId: string;
  systemLabel: string | null;
  status: WorkHistoryStatus;
  derivedCount: number;
  familyId: string | null;
  publishable: boolean;
  published: WorkHistoryPublishedInfo | null;
  revision: number;
};

export type WorkHistoryIndex = {
  schemaVersion: typeof WORK_HISTORY_SCHEMA_VERSION;
  entries: WorkHistoryIndexEntry[];
};

/** Letters, digits, `-` and `_` only: no dots, separators, drive letters or shell characters. */
const SNAPSHOT_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{7,79}$/;

export function isValidWorkHistorySnapshotId(id: unknown): id is string {
  return typeof id === "string" && SNAPSHOT_ID_RE.test(id);
}

export function newWorkHistorySnapshotId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (ch) => {
    const r = (Math.random() * 16) | 0;
    return (ch === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export function deriveWorkHistoryStatus(
  snap: Pick<WorkspaceSnapshot, "derivedApproval" | "exported">
): WorkHistoryStatus {
  if (snap.derivedApproval?.status === "PENDING") return "PENDING";
  return snap.exported ? "PUBLISHED" : "APPROVED";
}

export function snapshotFamilyId(snap: WorkHistorySnapshot): string | null {
  return (
    snap.publishFamilyGraph?.familyId ??
    snap.pendingFamilyGraph?.familyId ??
    readPublishOperationFromSnapshot(snap)?.destinationFamilyId ??
    null
  );
}

export function snapshotDerivedCount(snap: WorkHistorySnapshot): number {
  if (snap.status === "PENDING") return 0;
  if (snap.publishFamilyGraph) return countPublishFamilyGraphDerivedMembers(snap.publishFamilyGraph);
  const n = snap.derivedApproval?.derivedCount;
  return typeof n === "number" && Number.isFinite(n) && n > 0 ? n : 0;
}

export function buildWorkHistoryIndexEntry(snap: WorkHistorySnapshot): WorkHistoryIndexEntry {
  return {
    snapshotId: snap.id,
    name: snap.name,
    version: snap.version,
    createdAt: snap.createdAt,
    updatedAt: snap.updatedAt,
    shotType: snap.pattern,
    systemId: snap.systemId,
    systemLabel: snap.systemLabel ?? null,
    status: snap.status,
    derivedCount: snapshotDerivedCount(snap),
    familyId: snapshotFamilyId(snap),
    publishable: snap.status !== "PENDING" && buildPublishClientItemFromSnapshot(snap).ok,
    published: snap.published ?? null,
    revision: snap.revision,
  };
}

/** Row shape for the History list (no graph, no screen state). */
export type WorkHistoryListRow = {
  id: string;
  name: string;
  timestamp: string;
  exported: boolean;
  status: WorkHistoryStatus;
  derivedCount: number;
  publishable: boolean;
};

export function toWorkHistoryListRow(entry: WorkHistoryIndexEntry): WorkHistoryListRow {
  return {
    id: entry.snapshotId,
    name: entry.name,
    timestamp: entry.createdAt,
    exported: entry.status === "PUBLISHED",
    status: entry.status,
    derivedCount: entry.derivedCount,
    publishable: entry.publishable,
  };
}
