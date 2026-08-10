/**
 * Explicit mapping-only migration for authoringStrategyId.
 * Heuristic grouping forbidden. Dry-run by default.
 */

import { isValidAuthoringStrategyId } from "../authoringStrategyId";
import type { PositionRecord } from "../positionSearchEngine";

export type AuthoringStrategyIdMapping = Record<string, string>;
/** Keys are `${positionId}.${slot}` */

export type MigrationReport = {
  dryRun: boolean;
  applied: Array<{ strategyRef: string; authoringStrategyId: string }>;
  unresolved: string[];
  collisions: Array<{ strategyRef: string; reason: string }>;
  skippedAlreadySet: string[];
};

/**
 * Apply explicit mapping to a PositionRecord dataset clone.
 * Does not write files — caller persists.
 */
export function migrateAuthoringStrategyIds(
  records: PositionRecord[],
  mapping: AuthoringStrategyIdMapping,
  options?: { dryRun?: boolean }
): { records: PositionRecord[]; report: MigrationReport } {
  const dryRun = options?.dryRun !== false;
  const applied: MigrationReport["applied"] = [];
  const unresolved: string[] = [];
  const collisions: MigrationReport["collisions"] = [];
  const skippedAlreadySet: string[] = [];

  // Collision: same mapping key with empty/invalid id
  for (const [ref, id] of Object.entries(mapping)) {
    if (!isValidAuthoringStrategyId(id)) {
      collisions.push({ strategyRef: ref, reason: "invalid_target_id" });
    }
  }

  const next: PositionRecord[] = records.map((rec) => ({
    ...rec,
    strategies: { ...rec.strategies },
  }));

  const mappedRefs = new Set(Object.keys(mapping));

  for (const rec of next) {
    for (const slot of ["S1", "S2", "S3"] as const) {
      const entry = rec.strategies[slot];
      if (!entry) continue;
      const strategyRef = `${rec.positionId}.${slot}`;
      if (!mappedRefs.has(strategyRef)) {
        if (!isValidAuthoringStrategyId(entry.authoringStrategyId)) {
          unresolved.push(strategyRef);
        }
        continue;
      }
      const targetId = mapping[strategyRef];
      if (!isValidAuthoringStrategyId(targetId)) continue;
      if (isValidAuthoringStrategyId(entry.authoringStrategyId)) {
        if (entry.authoringStrategyId.trim() === targetId.trim()) {
          skippedAlreadySet.push(strategyRef);
          continue;
        }
        collisions.push({
          strategyRef,
          reason: `already_set:${entry.authoringStrategyId}`,
        });
        continue;
      }
      applied.push({ strategyRef, authoringStrategyId: targetId.trim() });
      if (!dryRun) {
        rec.strategies[slot] = {
          ...entry,
          authoringStrategyId: targetId.trim(),
        };
      }
    }
  }

  return {
    records: dryRun ? records : next,
    report: {
      dryRun,
      applied,
      unresolved,
      collisions,
      skippedAlreadySet,
    },
  };
}
