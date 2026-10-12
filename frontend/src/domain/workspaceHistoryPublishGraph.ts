/**
 * workspace_history writers for the approved normalized Family graph.
 *
 * - SAVE of a new Family → PENDING row (no Publish input until Derived Approve).
 * - Derived Approve → PENDING row receives the approved graph (LocalDB readback).
 * - OVERWRITE → new row with updated Master + preserved Members (no re-review).
 *
 * The graph is always taken from the committed LocalDB (normalized_dataset),
 * so History and LocalDB hold the same Family graph.
 */

import {
  buildSnapshotName,
  generateUUID,
  getNextVersion,
  loadWorkspaceHistory,
  saveWorkspaceHistory,
  WORKSPACE_HISTORY_KEY,
  type AppState,
  type WorkspaceSnapshot,
} from "./workspaceHistory";
import {
  readPublishOperationFromSnapshot,
  validatePublishOperation,
  type PublishOperation,
} from "./publishOperation";
import {
  buildPublishFamilyGraphFromEnvelope,
  buildPublishFamilyGraphFromRecords,
  countPublishFamilyGraphDerivedMembers,
  crossValidateOperationAndGraph,
  publishFamilyGraphsEqual,
  validatePublishFamilyGraph,
  type PublishFamilyGraph,
  type PublishFamilyGraphResult,
} from "./publishFamilyGraph";
import { loadCanonicalNormalizedCorpus } from "./dataset/infra/canonicalNormalizedCorpusStore";
import { clearPendingNewFamilySaveRecovery } from "./dataset/infra/pendingNewFamilySaveRecoveryStore";
import type { PositionRecord } from "./positionSearchEngine";

export type HistorySaveMode =
  | "PENDING_DERIVED_APPROVAL"
  | "OVERWRITE_PRESERVED"
  | "IMMEDIATE";

export type HistoryGraphWriteResult =
  | { ok: true; snapshot: WorkspaceSnapshot }
  | { ok: false; reason: string; issues: string[] };

function cloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * Committed LocalDB Family graph, cross-checked against the in-memory SAVE
 * result so a stale or partial LocalDB never becomes the Publish input.
 */
export function readCommittedLocalFamilyGraph(args: {
  familyId: string;
  updated?: PositionRecord[] | null;
}): PublishFamilyGraphResult {
  const loaded = loadCanonicalNormalizedCorpus();
  if (!loaded.ok) {
    return { ok: false, reason: "localdb-read-failed", issues: [loaded.reason] };
  }
  const fromLocal = buildPublishFamilyGraphFromEnvelope(loaded.envelope, args.familyId);
  if (!fromLocal.ok) return fromLocal;
  if (args.updated) {
    const fromRecords = buildPublishFamilyGraphFromRecords(args.updated, args.familyId, {
      shotType: loaded.envelope.shotType,
      systemId: loaded.envelope.systemId,
    });
    if (!fromRecords.ok) return fromRecords;
    if (!publishFamilyGraphsEqual(fromLocal.graph, fromRecords.graph)) {
      return {
        ok: false,
        reason: "history-graph-localdb-mismatch",
        issues: [`family:${args.familyId}`],
      };
    }
  }
  return fromLocal;
}

export function appendWorkspaceHistorySnapshotForSave(args: {
  updated: PositionRecord[];
  publishOperation: PublishOperation | null;
  mode: HistorySaveMode;
  state: AppState;
  systemId: string;
  pattern: string;
  now?: string;
}): HistoryGraphWriteResult {
  let publishOperation: PublishOperation | null = null;
  if (args.publishOperation) {
    const op = validatePublishOperation(args.publishOperation);
    if (!op.ok) return { ok: false, reason: op.reason, issues: op.issues };
    publishOperation = op.operation;
  }

  let publishFamilyGraph: PublishFamilyGraph | null = null;
  let derivedApproval: WorkspaceSnapshot["derivedApproval"] | null = null;
  const timestamp = args.now ?? new Date().toISOString();

  if (publishOperation) {
    if (args.mode === "PENDING_DERIVED_APPROVAL") {
      derivedApproval = { status: "PENDING", derivedCount: 0 };
    } else {
      const graph = readCommittedLocalFamilyGraph({
        familyId: publishOperation.destinationFamilyId,
        updated: args.updated,
      });
      if (!graph.ok) return graph;
      const cross = crossValidateOperationAndGraph(publishOperation, graph.graph);
      if (!cross.ok) return cross;
      publishFamilyGraph = graph.graph;
      if (args.mode === "OVERWRITE_PRESERVED") {
        derivedApproval = {
          status: "APPROVED",
          derivedCount: countPublishFamilyGraphDerivedMembers(graph.graph),
          source: "OVERWRITE_PRESERVED",
          approvedAt: timestamp,
        };
      }
    }
  }

  const history = loadWorkspaceHistory();
  const version = getNextVersion(history, args.systemId, args.pattern);
  const snapshot: WorkspaceSnapshot = {
    id: generateUUID(),
    name: buildSnapshotName(args.pattern, args.systemId, version, timestamp),
    systemId: args.systemId,
    pattern: args.pattern,
    version,
    timestamp,
    exported: false,
    ...(publishOperation ? { publishOperation: cloneJson(publishOperation) } : {}),
    ...(publishFamilyGraph ? { publishFamilyGraph: cloneJson(publishFamilyGraph) } : {}),
    ...(derivedApproval ? { derivedApproval } : {}),
    state: cloneJson(args.state),
  };
  const saved = saveWorkspaceHistory([...history, snapshot]);
  if (!saved.ok) {
    return { ok: false, reason: saved.reason, issues: ["workspace_history:write-failed"] };
  }
  return { ok: true, snapshot };
}

/** Derived Approve completion: PENDING row → approved graph (publishable). */
export function applyApprovedFamilyGraphToHistorySnapshot(args: {
  snapshotId: string;
  graph: PublishFamilyGraph;
  now?: string;
}): HistoryGraphWriteResult {
  const validated = validatePublishFamilyGraph(args.graph);
  if (!validated.ok) return validated;

  const history = loadWorkspaceHistory();
  const idx = history.findIndex((s) => s.id === args.snapshotId);
  if (idx < 0) {
    return { ok: false, reason: "history-snapshot-missing", issues: [`snapshot:${args.snapshotId}`] };
  }
  const current = history[idx]!;
  if (current.derivedApproval?.status !== "PENDING") {
    return {
      ok: false,
      reason: "history-snapshot-not-pending",
      issues: [`status:${current.derivedApproval?.status ?? "none"}`],
    };
  }
  const op = readPublishOperationFromSnapshot(current);
  if (!op) {
    return { ok: false, reason: "publish-operation-missing", issues: [`snapshot:${current.id}`] };
  }
  const cross = crossValidateOperationAndGraph(op, validated.graph);
  if (!cross.ok) return cross;

  const next: WorkspaceSnapshot = {
    ...current,
    publishFamilyGraph: cloneJson(validated.graph),
    derivedApproval: {
      status: "APPROVED",
      derivedCount: countPublishFamilyGraphDerivedMembers(validated.graph),
      source: "SAVE_APPROVE",
      approvedAt: args.now ?? new Date().toISOString(),
    },
  };
  delete next.publishFamilyPayload;
  const nextHistory = history.slice();
  nextHistory[idx] = next;
  const saved = saveWorkspaceHistory(nextHistory);
  if (!saved.ok) {
    return { ok: false, reason: saved.reason, issues: ["workspace_history:write-failed"] };
  }
  clearPendingNewFamilySaveRecovery(args.snapshotId);
  return { ok: true, snapshot: next };
}

/** Read-only lookup of one stored History row (unreadable History → ok:false). */
export function readWorkspaceHistoryRowById(
  snapshotId: string
): { ok: true; row: WorkspaceSnapshot | null } | { ok: false; reason: string } {
  const read = readRawWorkspaceHistoryRows();
  if (!read.ok) return read;
  const row = read.rows.find((r) => rowId(r) === snapshotId) as WorkspaceSnapshot | undefined;
  return { ok: true, row: row ?? null };
}

export type PendingHistoryRowFailureCode =
  | "HISTORY_READ_FAILED"
  | "HISTORY_ROW_NOT_PENDING"
  | "HISTORY_ROW_FAMILY_MISMATCH"
  | "HISTORY_WRITE_FAILED";

export type PendingHistoryRowCheckResult =
  | { ok: true; present: boolean }
  | { ok: false; code: PendingHistoryRowFailureCode; reason: string };

/**
 * Raw rows as stored. loadWorkspaceHistory() turns unreadable JSON into [],
 * which must never be written back over the real History.
 */
function readRawWorkspaceHistoryRows():
  | { ok: true; rows: unknown[] }
  | { ok: false; reason: string } {
  try {
    const raw = localStorage.getItem(WORKSPACE_HISTORY_KEY);
    if (raw == null) return { ok: true, rows: [] };
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return { ok: false, reason: "workspace_history is not an array" };
    return { ok: true, rows: parsed };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

function rowId(row: unknown): string | null {
  return row && typeof row === "object" && typeof (row as { id?: unknown }).id === "string"
    ? (row as { id: string }).id
    : null;
}

function checkPendingRow(
  rows: unknown[],
  snapshotId: string,
  familyId: string
): PendingHistoryRowCheckResult {
  const row = rows.find((r) => rowId(r) === snapshotId) as WorkspaceSnapshot | undefined;
  if (!row) return { ok: true, present: false };
  if (row.derivedApproval?.status !== "PENDING") {
    return {
      ok: false,
      code: "HISTORY_ROW_NOT_PENDING",
      reason: `status:${row.derivedApproval?.status ?? "none"}`,
    };
  }
  const op = readPublishOperationFromSnapshot(row);
  if (!op || op.destinationFamilyId !== familyId) {
    return {
      ok: false,
      code: "HISTORY_ROW_FAMILY_MISMATCH",
      reason: `row:${op?.destinationFamilyId ?? "none"} expected:${familyId}`,
    };
  }
  return { ok: true, present: true };
}

/** Read-only: is `snapshotId` still the PENDING row of this new Family (or already gone)? */
export function checkPendingWorkspaceHistorySnapshot(args: {
  snapshotId: string;
  familyId: string;
}): PendingHistoryRowCheckResult {
  const read = readRawWorkspaceHistoryRows();
  if (!read.ok) return { ok: false, code: "HISTORY_READ_FAILED", reason: read.reason };
  return checkPendingRow(read.rows, args.snapshotId, args.familyId);
}

/**
 * Derived Review cancel: remove exactly the PENDING row of the cancelled new
 * Family. Approved / OVERWRITE / other rows are never removed; the rest of
 * History is written back as stored.
 */
export function removePendingWorkspaceHistorySnapshot(args: {
  snapshotId: string;
  familyId: string;
}): { ok: true; removed: boolean } | { ok: false; code: PendingHistoryRowFailureCode; reason: string } {
  const read = readRawWorkspaceHistoryRows();
  if (!read.ok) return { ok: false, code: "HISTORY_READ_FAILED", reason: read.reason };
  const check = checkPendingRow(read.rows, args.snapshotId, args.familyId);
  if (!check.ok) return check;
  if (!check.present) return { ok: true, removed: false };

  const next = read.rows.filter((r) => rowId(r) !== args.snapshotId);
  try {
    localStorage.setItem(WORKSPACE_HISTORY_KEY, JSON.stringify(next));
  } catch (e) {
    return {
      ok: false,
      code: "HISTORY_WRITE_FAILED",
      reason: e instanceof Error ? e.message : String(e),
    };
  }
  const after = readRawWorkspaceHistoryRows();
  if (!after.ok || after.rows.some((r) => rowId(r) === args.snapshotId)) {
    return { ok: false, code: "HISTORY_WRITE_FAILED", reason: "history readback still holds the row" };
  }
  return { ok: true, removed: true };
}
