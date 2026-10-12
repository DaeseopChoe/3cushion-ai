/**
 * One-time move of legacy browser work data into the D History.
 *
 * Order: read-only analysis → import snapshots (all-or-nothing on the server)
 * → verify every planned snapshot → only then remove the legacy keys.
 * Any failure before cleanup withdraws what this run imported and leaves the
 * browser data byte-identical. Re-running never duplicates (fixed ids).
 * Never calls storage.clear().
 */

import {
  parseNormalizedDatasetEnvelope,
  type NormalizedDatasetEnvelope,
} from "../dataset/normalizedDatasetEnvelope";
import {
  buildPublishFamilyGraphFromEnvelope,
  countPublishFamilyGraphDerivedMembers,
  type PublishFamilyGraph,
} from "../publishFamilyGraph";
import { buildSnapshotName } from "../workspaceHistory";
import type { PublishOperation } from "../publishOperation";
import type { WorkHistoryApi } from "./workHistoryClient";
import {
  deriveWorkHistoryStatus,
  isValidWorkHistorySnapshotId,
  snapshotFamilyId,
  type WorkHistoryPathNode,
  type WorkHistorySnapshot,
  type WorkHistoryStatus,
} from "./workHistoryModel";

export const LEGACY_WORK_STORAGE_KEYS = [
  "normalized_dataset",
  "positions_dataset",
  "positions_dataset_meta",
  "family_masters",
  "family_members",
  "workspace_history",
  "pending_new_family_save_recovery_v1",
] as const;

const KEY_CORPUS = "normalized_dataset";
const KEY_HISTORY = "workspace_history";
const KEY_RECOVERY = "pending_new_family_save_recovery_v1";
/** Cleanup order: mirrors → recovery → corpus → History rows last (re-run safe). */
const CLEANUP_ORDER = [
  "positions_dataset",
  "positions_dataset_meta",
  "family_masters",
  "family_members",
  KEY_RECOVERY,
  KEY_CORPUS,
  KEY_HISTORY,
];

export const LEGACY_MIGRATION_FAILED_MESSAGE =
  "작업 데이터 이전에 실패했습니다. 기존 데이터는 보존했습니다.";
export const LEGACY_MIGRATION_CLEANUP_INCOMPLETE_MESSAGE =
  "작업 데이터는 History로 옮겼지만 이전 기록 정리를 끝내지 못했습니다. 다음에 ADMIN에 들어오면 다시 정리합니다.";

type StorageLike = Pick<Storage, "getItem" | "removeItem">;

export type LegacyWorkSummary = {
  present: boolean;
  historyRowCount: number;
  familyCount: number;
  pendingCount: number;
};

type PlannedSnapshot = {
  snapshot: WorkHistorySnapshot;
  status: WorkHistoryStatus;
  familyId: string | null;
  graph: PublishFamilyGraph | null;
};

export type LegacyWorkPlan = { snapshots: PlannedSnapshot[] };

export type LegacyWorkAnalysis = { ok: true; plan: LegacyWorkPlan } | { ok: false; reason: string };

export type LegacyWorkMigrationResult =
  | { ok: true; kind: "NOTHING" }
  | { ok: true; kind: "MIGRATED"; imported: string[]; existing: string[] }
  | { ok: false; kind: "FAILED"; message: string; reason: string }
  | { ok: false; kind: "CLEANUP_INCOMPLETE"; message: string; reason: string };

function safeGet(storage: StorageLike, key: string): string | null {
  try {
    return storage.getItem(key);
  } catch {
    return null;
  }
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function hashId(text: string): string {
  let h1 = 0x811c9dc5;
  let h2 = 0x01000193;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x5bd1e995) >>> 0;
  }
  return h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0");
}

function legacyRowId(id: unknown): string {
  return isValidWorkHistorySnapshotId(id) ? id : `legacy-${hashId(String(id))}`;
}

function legacyFamilySnapshotId(familyId: string): string {
  const id = `legacy-family-${familyId}`;
  return isValidWorkHistorySnapshotId(id) ? id : `legacy-family-${hashId(familyId)}`;
}

function parseRows(raw: string | null): { ok: true; rows: Record<string, unknown>[] } | { ok: false } {
  if (raw == null || raw === "") return { ok: true, rows: [] };
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isPlainObject)) return { ok: false };
    return { ok: true, rows: parsed };
  } catch {
    return { ok: false };
  }
}

function parseCorpus(
  raw: string | null
): { ok: true; envelope: NormalizedDatasetEnvelope | null } | { ok: false } {
  if (raw == null || raw === "") return { ok: true, envelope: null };
  try {
    const parsed = parseNormalizedDatasetEnvelope(JSON.parse(raw));
    return parsed.ok ? { ok: true, envelope: parsed.envelope } : { ok: false };
  } catch {
    return { ok: false };
  }
}

function parseRecovery(raw: string | null): {
  historySnapshotId: string;
  familyId: string;
  authoredPathNodes: WorkHistoryPathNode[];
} | null {
  if (!raw) return null;
  try {
    const r = JSON.parse(raw);
    if (!isPlainObject(r) || typeof r.historySnapshotId !== "string" || typeof r.familyId !== "string") {
      return null;
    }
    const nodes = Array.isArray(r.authoredPathNodes)
      ? r.authoredPathNodes.map((p: unknown) =>
          isPlainObject(p) && Number.isFinite(p.x) && Number.isFinite(p.y)
            ? { x: p.x as number, y: p.y as number }
            : null
        )
      : [];
    return { historySnapshotId: r.historySnapshotId, familyId: r.familyId, authoredPathNodes: nodes };
  } catch {
    return null;
  }
}

/** Read-only check used on ADMIN entry to decide whether to show the prompt. */
export function detectLegacyWorkData(storage: StorageLike): LegacyWorkSummary {
  const rows = parseRows(safeGet(storage, KEY_HISTORY));
  const corpus = parseCorpus(safeGet(storage, KEY_CORPUS));
  const recovery = safeGet(storage, KEY_RECOVERY);
  const rowList = rows.ok ? rows.rows : [];
  const familyCount = corpus.ok ? corpus.envelope?.familyMasters.length ?? 0 : 0;
  const pendingCount = rowList.filter(
    (r) => isPlainObject(r.derivedApproval) && r.derivedApproval.status === "PENDING"
  ).length;
  const present =
    !rows.ok || !corpus.ok || rowList.length > 0 || familyCount > 0 || (recovery != null && recovery !== "");
  return { present, historyRowCount: rowList.length, familyCount, pendingCount };
}

function planned(snapshot: WorkHistorySnapshot): PlannedSnapshot {
  const status = deriveWorkHistoryStatus(snapshot);
  const graph =
    (status === "PENDING" ? snapshot.pendingFamilyGraph : snapshot.publishFamilyGraph) ?? null;
  return { snapshot, status, familyId: snapshotFamilyId(snapshot), graph };
}

function createOperation(familyId: string): PublishOperation {
  return { schemaVersion: 1, intent: "CREATE", sourceFamilyId: null, destinationFamilyId: familyId };
}

/** Read-only plan: what would be written to the D History. */
export function analyzeLegacyWorkData(storage: StorageLike): LegacyWorkAnalysis {
  const rows = parseRows(safeGet(storage, KEY_HISTORY));
  if (!rows.ok) return { ok: false, reason: "history-unreadable" };
  const corpus = parseCorpus(safeGet(storage, KEY_CORPUS));
  if (!corpus.ok) return { ok: false, reason: "corpus-unreadable" };
  const envelope = corpus.envelope;
  const recovery = parseRecovery(safeGet(storage, KEY_RECOVERY));

  const snapshots: PlannedSnapshot[] = [];
  const referencedFamilies = new Set<string>();
  const usedIds = new Set<string>();

  for (const row of rows.rows) {
    const id = legacyRowId(row.id);
    if (usedIds.has(id)) continue;
    usedIds.add(id);
    const pattern = typeof row.pattern === "string" && row.pattern.trim() ? row.pattern.trim() : "뒤돌리기";
    const systemId =
      typeof row.systemId === "string" && row.systemId.trim() ? row.systemId.trim() : "5_half_system";
    const version = typeof row.version === "number" && Number.isFinite(row.version) ? row.version : 1;
    const timestamp = typeof row.timestamp === "string" && row.timestamp ? row.timestamp : new Date().toISOString();
    let state: unknown = isPlainObject(row.state) ? { ...row.state } : null;
    if (isPlainObject(state) && "dataset" in state) delete state.dataset;

    const snap = {
      ...row,
      id,
      name: typeof row.name === "string" && row.name ? row.name : buildSnapshotName(pattern, systemId, version, timestamp),
      pattern,
      systemId,
      version,
      timestamp,
      state,
      exported: row.exported === true,
    } as unknown as WorkHistorySnapshot;
    delete (snap as { authoredPathNodes?: unknown }).authoredPathNodes;
    delete (snap as { pendingFamilyGraph?: unknown }).pendingFamilyGraph;

    const familyId = snapshotFamilyId(snap);
    if (familyId) referencedFamilies.add(familyId);
    if (snap.derivedApproval?.status === "PENDING" && familyId) {
      if (envelope) {
        const g = buildPublishFamilyGraphFromEnvelope(envelope, familyId);
        if (g.ok) snap.pendingFamilyGraph = g.graph;
      }
      if (recovery && recovery.historySnapshotId === row.id && recovery.familyId === familyId) {
        snap.authoredPathNodes = recovery.authoredPathNodes;
      }
    }
    snapshots.push(planned(snap));
  }

  if (envelope) {
    for (const master of envelope.familyMasters) {
      if (referencedFamilies.has(master.familyId)) continue;
      const g = buildPublishFamilyGraphFromEnvelope(envelope, master.familyId);
      if (!g.ok) return { ok: false, reason: `family-unreadable:${master.familyId}` };
      const id = legacyFamilySnapshotId(master.familyId);
      if (usedIds.has(id)) continue;
      usedIds.add(id);
      const derivedCount = countPublishFamilyGraphDerivedMembers(g.graph);
      const now = new Date().toISOString();
      const shotType = envelope.shotType || "뒤돌리기";
      const systemId = envelope.systemId || "5_half_system";
      const base = {
        id,
        name: buildSnapshotName(shotType, systemId, 1, now),
        pattern: shotType,
        systemId,
        version: 1,
        timestamp: now,
        state: null,
        exported: false,
        publishOperation: createOperation(master.familyId),
      };
      const snap = (
        derivedCount > 0
          ? {
              ...base,
              publishFamilyGraph: g.graph,
              derivedApproval: { status: "APPROVED", derivedCount, source: "SAVE_APPROVE" },
            }
          : {
              ...base,
              pendingFamilyGraph: g.graph,
              derivedApproval: { status: "PENDING", derivedCount: 0 },
            }
      ) as unknown as WorkHistorySnapshot;
      snapshots.push(planned(snap));
    }
  }
  return { ok: true, plan: { snapshots } };
}

function sortedIds(graph: PublishFamilyGraph | null | undefined): string {
  return JSON.stringify((graph?.members ?? []).map((m) => m.memberId).sort());
}

async function verifyPlanned(
  api: WorkHistoryApi,
  p: PlannedSnapshot,
  strict: boolean
): Promise<boolean> {
  const read = await api.read(p.snapshot.id);
  if (!read.ok) return false;
  if (read.entry.familyId !== p.familyId) return false;
  if (!strict) return true;
  if (read.entry.status !== p.status) return false;
  if (!p.graph) return true;
  const stored =
    p.status === "PENDING" ? read.snapshot.pendingFamilyGraph : read.snapshot.publishFamilyGraph;
  if (!stored) return false;
  return (
    stored.familyId === p.graph.familyId &&
    stored.master?.familyId === p.graph.master.familyId &&
    stored.members.length === p.graph.members.length &&
    sortedIds(stored) === sortedIds(p.graph) &&
    read.entry.derivedCount === (p.status === "PENDING" ? 0 : countPublishFamilyGraphDerivedMembers(p.graph))
  );
}

/** Runs only after the admin confirmed the move. */
export async function runLegacyWorkMigration(args: {
  storage: StorageLike;
  api: WorkHistoryApi;
}): Promise<LegacyWorkMigrationResult> {
  const { storage, api } = args;
  const failed = (reason: string): LegacyWorkMigrationResult => ({
    ok: false,
    kind: "FAILED",
    message: LEGACY_MIGRATION_FAILED_MESSAGE,
    reason,
  });
  if (!detectLegacyWorkData(storage).present) return { ok: true, kind: "NOTHING" };

  const analysis = analyzeLegacyWorkData(storage);
  if (!analysis.ok) return failed(analysis.reason);
  const { snapshots } = analysis.plan;

  let imported: string[] = [];
  let existing: string[] = [];
  if (snapshots.length > 0) {
    const result = await api.importSnapshots({ snapshots: snapshots.map((p) => p.snapshot) });
    if (!result.ok) return failed(result.code);
    imported = result.imported;
    existing = result.existing;
  }

  const importedSet = new Set(imported);
  for (const p of snapshots) {
    const ok = await verifyPlanned(api, p, importedSet.has(p.snapshot.id));
    if (!ok) {
      if (imported.length > 0) await api.remove({ snapshotIds: imported });
      return failed(`verify:${p.snapshot.id}`);
    }
  }

  for (const key of CLEANUP_ORDER) {
    try {
      storage.removeItem(key);
    } catch {
      return {
        ok: false,
        kind: "CLEANUP_INCOMPLETE",
        message: LEGACY_MIGRATION_CLEANUP_INCOMPLETE_MESSAGE,
        reason: key,
      };
    }
  }
  return { ok: true, kind: "MIGRATED", imported, existing };
}
