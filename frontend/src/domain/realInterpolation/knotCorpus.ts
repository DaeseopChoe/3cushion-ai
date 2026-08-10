/**
 * PositionRecord → InterpolationKnotView projection (D1-C1).
 * No duplicate persisted store. Legacy without authoringStrategyId excluded.
 */

import { isValidAuthoringStrategyId } from "../authoringStrategyId";
import { stripRuntimeSysInputs } from "../canonicalStrategy";
import type { PositionRecord, StrategyEntry } from "../positionSearchEngine";
import { listStrategiesInRecord } from "../positionSearchEngine";
import type { InterpolationKnotView } from "./types";

export function strategyRefOf(positionId: string, slot: string): string {
  return `${positionId}.${slot}`;
}

export function projectKnot(
  rec: PositionRecord,
  slot: "S1" | "S2" | "S3"
): InterpolationKnotView | null {
  const entry = rec.strategies?.[slot];
  if (!entry) return null;
  if (!isValidAuthoringStrategyId(entry.authoringStrategyId)) return null;
  if (!rec.balls?.cue || !rec.balls?.target || !rec.balls?.second) return null;

  return {
    authoringStrategyId: entry.authoringStrategyId.trim(),
    strategyRef: strategyRefOf(rec.positionId, slot),
    positionId: rec.positionId,
    slot,
    balls: {
      cue: { x: rec.balls.cue.x, y: rec.balls.cue.y },
      target: { x: rec.balls.target.x, y: rec.balls.target.y },
      second: { x: rec.balls.second.x, y: rec.balls.second.y },
    },
    sysInputs: stripRuntimeSysInputs(
      entry.sysInputs as Record<string, unknown>
    ),
    signature: entry.signature,
    hpT: entry.hpT,
    str: entry.str,
    ai: entry.ai,
    corrections: entry.corrections,
    track: entry.track,
    entry,
  };
}

export function projectAllKnots(
  records: PositionRecord[]
): InterpolationKnotView[] {
  const out: InterpolationKnotView[] = [];
  for (const rec of records) {
    for (const entry of listStrategiesInRecord(rec)) {
      const knot = projectKnot(rec, entry.slot);
      if (knot) out.push(knot);
    }
  }
  return out;
}

export function buildKnotIndex(
  records: PositionRecord[]
): Map<string, InterpolationKnotView[]> {
  const map = new Map<string, InterpolationKnotView[]>();
  for (const knot of projectAllKnots(records)) {
    const list = map.get(knot.authoringStrategyId) ?? [];
    list.push(knot);
    map.set(knot.authoringStrategyId, list);
  }
  return map;
}

export function getKnotsByAuthoringStrategyId(
  index: Map<string, InterpolationKnotView[]>,
  authoringStrategyId: string
): InterpolationKnotView[] {
  return index.get(authoringStrategyId) ?? [];
}

/** Modal fingerprint for INV-03 (stable JSON of Modal carriers). */
export function modalFingerprint(entry: StrategyEntry): string {
  return JSON.stringify({
    hpT: entry.hpT ?? null,
    str: entry.str ?? null,
    ai: entry.ai ?? null,
  });
}
