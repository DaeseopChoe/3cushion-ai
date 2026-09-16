/**
 * Phase 3-A — Published Family Replacement Core (domain only).
 *
 * UPDATE identity = familyId (never positionId / coordinates / sys values).
 * Granularity = StrategyEntry slot. Empty PositionRecords may be dropped.
 *
 * Does NOT write disk, connect Export UI, or change mergePublishedRecords.
 * Pipeline: purge target familyIds from existing → mergePublishedRecords(remaining, incoming).
 */

import { mergePublishedRecords } from "./datasetExportMerge";
import { isValidFamilyId } from "./family/familyIdentity";
import type { PositionRecord, SlotStrategiesMap } from "./positionSearchEngine";

const SLOT_IDS = ["S1", "S2", "S3"] as const;

function cloneRecord(rec: PositionRecord): PositionRecord {
  return JSON.parse(JSON.stringify(rec)) as PositionRecord;
}

function trimFamilyId(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

/** Family-aware replace targets: mintFamilyId contract (fm_*) only. */
function asReplaceFamilyId(raw: unknown): string | null {
  const trimmed = trimFamilyId(raw);
  return isValidFamilyId(trimmed) ? trimmed : null;
}

function occupiedSlots(record: PositionRecord): number {
  let n = 0;
  for (const slot of SLOT_IDS) {
    if (record.strategies?.[slot]) n += 1;
  }
  return n;
}

/**
 * Collect StrategyEntry.familyId values that match mintFamilyId contract.
 * No invent / no coordinate / no positionId inference.
 * Legacy (missing/invalid familyId) excluded.
 */
export function collectFamilyIdsFromRecords(
  records: PositionRecord[] | null | undefined
): string[] {
  const set = new Set<string>();
  if (!Array.isArray(records)) return [];
  for (const rec of records) {
    if (!rec || typeof rec !== "object") continue;
    for (const slot of SLOT_IDS) {
      const entry = rec.strategies?.[slot];
      if (!entry) continue;
      const familyId = asReplaceFamilyId(entry.familyId);
      if (familyId) set.add(familyId);
    }
  }
  return [...set];
}

/**
 * Remove StrategyEntry slots whose familyId is in `familyIds` (exact string match).
 * Matches raw entry.familyId (trim) — does not require memberId completeness.
 * Legacy entries without familyId are never removed by this path.
 * Records with no remaining strategies are dropped.
 */
export function purgeFamilyIdsFromPublishedRecords(
  existingRecords: PositionRecord[],
  familyIds: Iterable<string>
): PositionRecord[] {
  const targets = new Set<string>();
  for (const id of familyIds) {
    const familyId = asReplaceFamilyId(id);
    if (familyId) targets.add(familyId);
  }

  if (!Array.isArray(existingRecords) || existingRecords.length === 0) {
    return [];
  }
  if (targets.size === 0) {
    return existingRecords.map(cloneRecord);
  }

  const out: PositionRecord[] = [];

  for (const rec of existingRecords) {
    if (!rec || typeof rec !== "object") continue;
    if (!rec.strategies) {
      out.push(cloneRecord(rec));
      continue;
    }
    const nextStrategies: SlotStrategiesMap = { ...rec.strategies };
    let changed = false;
    for (const slot of SLOT_IDS) {
      const entry = nextStrategies[slot];
      if (!entry) continue;
      const familyId = trimFamilyId(entry.familyId);
      if (familyId && targets.has(familyId)) {
        delete nextStrategies[slot];
        changed = true;
      }
    }
    if (!changed) {
      out.push(cloneRecord(rec));
      continue;
    }
    const next: PositionRecord = {
      ...cloneRecord(rec),
      strategies: nextStrategies,
    };
    if (occupiedSlots(next) > 0) {
      out.push(next);
    }
  }

  return out;
}

export type ReplaceFamiliesInPublishedRecordsResult = {
  records: PositionRecord[];
  /** Family ids that were present in existing and requested for replace. */
  purgedFamilyIds: string[];
  /** Family ids requested for replace (from arg or collected from incoming). */
  replaceFamilyIds: string[];
};

/**
 * Family-aware published replacement core.
 *
 * 1. Determine familyIdsToReplace (explicit or collect from incoming).
 * 2. Purge those familyIds from existing at strategy-slot granularity.
 * 3. mergePublishedRecords(remaining, incoming) for CREATE append / slot merge.
 *
 * CREATE (new familyId not in existing): purge is no-op → append via merge.
 * UPDATE (same familyId): old members removed even if positionId differs → then incoming inserted.
 */
export function replaceFamiliesInPublishedRecords(
  existingRecords: PositionRecord[],
  incomingRecords: PositionRecord[],
  familyIdsToReplace?: Iterable<string> | null
): ReplaceFamiliesInPublishedRecordsResult {
  const replaceFamilyIds =
    familyIdsToReplace == null
      ? collectFamilyIdsFromRecords(incomingRecords)
      : [
          ...new Set(
            [...familyIdsToReplace]
              .map((id) => asReplaceFamilyId(id))
              .filter((id): id is string => id != null)
          ),
        ];

  const existingBefore = Array.isArray(existingRecords)
    ? existingRecords.map(cloneRecord)
    : [];
  const existingFamilyIds = new Set(collectFamilyIdsFromRecords(existingBefore));
  const purgedFamilyIds = replaceFamilyIds.filter((id) =>
    existingFamilyIds.has(id)
  );

  const remaining = purgeFamilyIdsFromPublishedRecords(
    existingBefore,
    replaceFamilyIds
  );
  const records = mergePublishedRecords(remaining, incomingRecords);

  return {
    records,
    purgedFamilyIds,
    replaceFamilyIds,
  };
}

/** Count StrategyEntry members with exact familyId (trim). */
export function countFamilyMembersInRecords(
  records: PositionRecord[],
  familyId: string
): number {
  const target = trimFamilyId(familyId);
  if (!target) return 0;
  let n = 0;
  for (const rec of records) {
    for (const slot of SLOT_IDS) {
      const entry = rec.strategies?.[slot];
      if (!entry) continue;
      if (trimFamilyId(entry.familyId) === target) n += 1;
    }
  }
  return n;
}
