/**
 * WorkspaceSnapshot → published Dataset export (PositionRecord[] envelope).
 *
 * Phase 3-C2 / Phase C-2 storage source priority:
 * 1. SNAPSHOT_PAYLOAD — snapshot.publishFamilyPayload
 * 2. STATE_DATASET — legacy snapshot.state.dataset
 * 3. C1_WORKING_FALLBACK — operation present, no payload → rematerialized canonical
 * 4. LEGACY_INFERENCE — no operation → rematerialized canonical
 *
 * Phase C-2: working-corpus fallbacks rematerialize from normalized_dataset.
 * NEVER reads positions_dataset as authority.
 *
 * Fail-closed: publishFamilyPayload field present but invalid → no working fallback.
 */

import type { WorkspaceSnapshot } from "./workspaceHistory";
import { normalizeDatasetFromStorage } from "./positionMergeEngine";
import { loadRematerializedWorkingCorpus } from "./family/loadProductionCompatibleDataset";
import type {
  PositionRecord,
  SlotStrategiesMap,
  StrategyEntry,
} from "./positionSearchEngine";
import {
  DATASET_EXPORT_SCHEMA_VERSION,
  systemIdToFolderLabel,
} from "./datasetPath";
import { readPublishOperationFromSnapshot } from "./publishOperation";
import {
  crossValidateOperationAndPayload,
  readPublishFamilyPayloadFromSnapshot,
} from "./publishFamilyPayload";

export type DatasetExportPayload = {
  schemaVersion: typeof DATASET_EXPORT_SCHEMA_VERSION;
  shotType: string;
  systemId: string;
  systemLabel: string;
  exportedAt: string;
  sourceSnapshotId?: string;
  records: PositionRecord[];
};

export type DatasetExportSource =
  | "SNAPSHOT_PAYLOAD"
  | "STATE_DATASET"
  | "C1_WORKING_FALLBACK"
  | "LEGACY_INFERENCE";

export type BuildDatasetExportResult =
  | {
      ok: true;
      payload: DatasetExportPayload;
      source: DatasetExportSource;
    }
  | {
      ok: false;
      reason: string;
      issues: string[];
    };

function canonicalSystemId(systemId: string | undefined): string {
  if (!systemId || systemId === "5_HALF") return "5_half_system";
  return systemId;
}

function normalizeShotType(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "default" || trimmed === "_") return null;
  return trimmed;
}

function shotTypeMatches(
  entryShotType: string | undefined,
  exportShotType: string
): boolean {
  const entryNorm = normalizeShotType(entryShotType);
  const exportNorm = normalizeShotType(exportShotType);
  if (!exportNorm) return true;
  if (!entryNorm) return true;
  return entryNorm === exportNorm;
}

function strategyMatchesExport(
  entry: StrategyEntry,
  exportSystemId: string,
  exportShotType: string
): boolean {
  const sid = canonicalSystemId(entry.signature.systemId);
  if (sid !== canonicalSystemId(exportSystemId)) return false;
  return shotTypeMatches(entry.signature.shotType, exportShotType);
}

/** Filter snapshot embedded dataset to exportable PositionRecords for shotType + systemId. */
export function filterRecordsForDatasetExport(
  dataset: PositionRecord[],
  systemId: string,
  shotType: string
): PositionRecord[] {
  const out: PositionRecord[] = [];
  for (const rec of dataset) {
    const strategies: SlotStrategiesMap = {};
    for (const slot of ["S1", "S2", "S3"] as const) {
      const entry = rec.strategies[slot];
      if (!entry) continue;
      if (strategyMatchesExport(entry, systemId, shotType)) {
        strategies[slot] = entry;
      }
    }
    if (Object.keys(strategies).length > 0) {
      out.push({ ...rec, strategies });
    }
  }
  return out;
}

function envelopeFromRecords(
  snapshot: WorkspaceSnapshot,
  records: PositionRecord[],
  exportedAt: string
): DatasetExportPayload {
  const shotType = snapshot.pattern ?? "뒤돌리기";
  const systemId = canonicalSystemId(snapshot.systemId);
  return {
    schemaVersion: DATASET_EXPORT_SCHEMA_VERSION,
    shotType,
    systemId,
    systemLabel: systemIdToFolderLabel(systemId),
    exportedAt,
    sourceSnapshotId: snapshot.id,
    records,
  };
}

/**
 * WorkspaceSnapshot → Dataset export envelope result.
 * Does not attach publishOperation / publishFamilyPayload onto the envelope.
 */
export function buildDatasetExport(
  snapshot: WorkspaceSnapshot,
  exportedAt: string = new Date().toISOString(),
  options?: {
    /** Injectable for tests; default = rematerialize from normalized_dataset. */
    loadWorking?: () => PositionRecord[];
  }
): BuildDatasetExportResult {
  const loadWorking = options?.loadWorking ?? loadRematerializedWorkingCorpus;
  const shotType = snapshot.pattern ?? "뒤돌리기";
  const systemId = canonicalSystemId(snapshot.systemId);
  const operation = readPublishOperationFromSnapshot(snapshot);
  const payloadRead = readPublishFamilyPayloadFromSnapshot(snapshot);

  // Fail-closed: field present but invalid.
  if (!payloadRead.ok) {
    return {
      ok: false,
      reason: payloadRead.reason,
      issues: payloadRead.issues,
    };
  }

  if (payloadRead.payload != null) {
    if (!operation) {
      return {
        ok: false,
        reason: "payload-without-operation",
        issues: ["publishFamilyPayload requires publishOperation"],
      };
    }
    const cross = crossValidateOperationAndPayload(
      operation,
      payloadRead.payload
    );
    if (!cross.ok) {
      return {
        ok: false,
        reason: cross.reason,
        issues: cross.issues,
      };
    }
    console.warn("[EXPORT] source=SNAPSHOT_PAYLOAD");
    const records = filterRecordsForDatasetExport(
      payloadRead.payload.records,
      systemId,
      shotType
    );
    if (records.length === 0) {
      return {
        ok: false,
        reason: "snapshot-payload-empty-after-leaf-filter",
        issues: ["no-records-for-shotType-systemId"],
      };
    }
    return {
      ok: true,
      source: "SNAPSHOT_PAYLOAD",
      payload: envelopeFromRecords(snapshot, records, exportedAt),
    };
  }

  // C1: operation without payload → working corpus (documented fallback).
  if (operation) {
    console.warn(
      "[EXPORT] source=C1_WORKING_FALLBACK (publishOperation without publishFamilyPayload)"
    );
    const rawRows = loadWorking();
    const normalized = normalizeDatasetFromStorage(rawRows);
    const records = filterRecordsForDatasetExport(
      normalized,
      systemId,
      shotType
    );
    return {
      ok: true,
      source: "C1_WORKING_FALLBACK",
      payload: envelopeFromRecords(snapshot, records, exportedAt),
    };
  }

  // Legacy: state.dataset or working corpus.
  if (
    Array.isArray(snapshot.state?.dataset) &&
    snapshot.state.dataset.length > 0
  ) {
    console.warn("[EXPORT] source=STATE_DATASET");
    const normalized = normalizeDatasetFromStorage(snapshot.state.dataset);
    const records = filterRecordsForDatasetExport(
      normalized,
      systemId,
      shotType
    );
    return {
      ok: true,
      source: "STATE_DATASET",
      payload: envelopeFromRecords(snapshot, records, exportedAt),
    };
  }

  console.warn("[EXPORT] source=LEGACY_INFERENCE (canonical rematerialize)");
  const rawRows = loadWorking();
  const normalized = normalizeDatasetFromStorage(rawRows);
  const records = filterRecordsForDatasetExport(
    normalized,
    systemId,
    shotType
  );
  return {
    ok: true,
    source: "LEGACY_INFERENCE",
    payload: envelopeFromRecords(snapshot, records, exportedAt),
  };
}

/** Validate + re-normalize records before write. */
export function normalizeDatasetExport(
  payload: DatasetExportPayload
): DatasetExportPayload {
  const systemId = canonicalSystemId(payload.systemId);
  return {
    schemaVersion: DATASET_EXPORT_SCHEMA_VERSION,
    shotType: String(payload.shotType ?? "").trim() || "뒤돌리기",
    systemId,
    systemLabel: payload.systemLabel || systemIdToFolderLabel(systemId),
    exportedAt: payload.exportedAt || new Date().toISOString(),
    ...(payload.sourceSnapshotId
      ? { sourceSnapshotId: payload.sourceSnapshotId }
      : {}),
    records: normalizeDatasetFromStorage(payload.records ?? []),
  };
}
