/**
 * WorkspaceSnapshot → published Dataset export (PositionRecord[] envelope).
 */

import type { WorkspaceSnapshot } from "./workspaceHistory";
import { normalizeDatasetFromStorage } from "./positionMergeEngine";
import type {
  PositionRecord,
  SlotStrategiesMap,
  StrategyEntry,
} from "./positionSearchEngine";
import {
  DATASET_EXPORT_SCHEMA_VERSION,
  systemIdToFolderLabel,
} from "./datasetPath";

export type DatasetExportPayload = {
  schemaVersion: typeof DATASET_EXPORT_SCHEMA_VERSION;
  shotType: string;
  systemId: string;
  systemLabel: string;
  exportedAt: string;
  sourceSnapshotId?: string;
  records: PositionRecord[];
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

/** WorkspaceSnapshot → Dataset export envelope (no WorkspaceSnapshot fields). */
export function buildDatasetExport(
  snapshot: WorkspaceSnapshot,
  exportedAt: string = new Date().toISOString()
): DatasetExportPayload {
  const shotType = snapshot.pattern ?? "뒤돌리기";
  const systemId = canonicalSystemId(snapshot.systemId);
  const systemLabel = systemIdToFolderLabel(systemId);
  const rawRows = snapshot.state?.dataset ?? [];
  const normalized = normalizeDatasetFromStorage(rawRows);
  const records = filterRecordsForDatasetExport(
    normalized,
    systemId,
    shotType
  );

  return {
    schemaVersion: DATASET_EXPORT_SCHEMA_VERSION,
    shotType,
    systemId,
    systemLabel,
    exportedAt,
    sourceSnapshotId: snapshot.id,
    records,
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
    ...(payload.sourceSnapshotId ? { sourceSnapshotId: payload.sourceSnapshotId } : {}),
    records: normalizeDatasetFromStorage(payload.records ?? []),
  };
}
