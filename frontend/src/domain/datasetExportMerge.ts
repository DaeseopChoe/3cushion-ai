/**
 * Published Dataset export merge — positionId → slot (S1/S2/S3) 2-step merge.
 * Same positionId merges strategies per slot; incoming wins on slot collision.
 */

import type { DatasetExportPayload } from "./datasetExport";
import { normalizeDatasetExport } from "./datasetExport";
import { normalizeDatasetFromStorage } from "./positionMergeEngine";
import type {
  PositionRecord,
  SlotStrategiesMap,
  StrategyEntry,
} from "./positionSearchEngine";

const SLOT_IDS = ["S1", "S2", "S3"] as const;
type SlotId = (typeof SLOT_IDS)[number];

function cloneRecord(rec: PositionRecord): PositionRecord {
  return JSON.parse(JSON.stringify(rec)) as PositionRecord;
}

function cloneStrategyEntry(entry: StrategyEntry): StrategyEntry {
  return JSON.parse(JSON.stringify(entry)) as StrategyEntry;
}

/** Merge strategies within the same position — slot-level update/append only. */
export function mergePositionStrategies(
  existing: SlotStrategiesMap,
  incoming: SlotStrategiesMap
): SlotStrategiesMap {
  const merged: SlotStrategiesMap = { ...existing };
  for (const slot of SLOT_IDS) {
    const incomingEntry = incoming[slot];
    if (incomingEntry) {
      merged[slot] = cloneStrategyEntry(incomingEntry);
    }
  }
  return merged;
}

/**
 * Merge two PositionRecords with the same positionId.
 * Never replaces the whole record — only slot-level merge + optional field refresh.
 */
export function mergePositionRecord(
  existing: PositionRecord,
  incoming: PositionRecord
): PositionRecord {
  return {
    ...existing,
    balls: incoming.balls ?? existing.balls,
    ...(incoming.targetBall === "red" || incoming.targetBall === "yellow"
      ? { targetBall: incoming.targetBall }
      : existing.targetBall != null
        ? { targetBall: existing.targetBall }
        : {}),
    strategies: mergePositionStrategies(existing.strategies, incoming.strategies),
    schemaVersion: incoming.schemaVersion ?? existing.schemaVersion,
    ...(incoming.source ? { source: incoming.source } : existing.source ? { source: existing.source } : {}),
  };
}

/**
 * Merge published record arrays: positionId match → slot merge; else append position.
 * Preserves existing position order; new positionIds append at end.
 */
export function mergePublishedRecords(
  existingRecords: PositionRecord[],
  incomingRecords: PositionRecord[]
): PositionRecord[] {
  const normalizedExisting = normalizeDatasetFromStorage(existingRecords);
  const normalizedIncoming = normalizeDatasetFromStorage(incomingRecords);

  const byId = new Map<string, PositionRecord>();
  const order: string[] = [];

  for (const rec of normalizedExisting) {
    byId.set(rec.positionId, cloneRecord(rec));
    order.push(rec.positionId);
  }

  for (const incoming of normalizedIncoming) {
    const found = byId.get(incoming.positionId);
    if (found) {
      byId.set(incoming.positionId, mergePositionRecord(found, incoming));
    } else {
      byId.set(incoming.positionId, cloneRecord(incoming));
      order.push(incoming.positionId);
    }
  }

  return order.map((id) => byId.get(id)!);
}

/** Merge existing published envelope with incoming export payload (envelope-level). */
export function mergePublishedExport(
  existing: DatasetExportPayload,
  incoming: DatasetExportPayload
): DatasetExportPayload {
  const base = normalizeDatasetExport(incoming);
  const prev = normalizeDatasetExport(existing);
  const mergedRecords = mergePublishedRecords(prev.records, base.records);

  return {
    ...base,
    records: mergedRecords,
  };
}
