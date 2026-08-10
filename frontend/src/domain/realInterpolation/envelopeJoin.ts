/**
 * Envelope geometry join by strategyRef (D4-A).
 * EnvelopeRecord must not carry SYS/Modal/authoringStrategyId.
 */

import type { EnvelopeGeometryView } from "./types";

export type RawEnvelopeRecord = {
  strategyRef?: string;
  strategy_ref?: string;
  target?: { x: number; y: number };
  cueSet?: Array<{ x: number; y: number }>;
  cue_set?: Array<{ x: number; y: number }>;
  secondSet?: Array<{ x: number; y: number }>;
  second_set?: Array<{ x: number; y: number }>;
};

export type RawPublishedEnvelopeDataset = {
  records?: RawEnvelopeRecord[];
};

function asPoint(
  p: { x?: unknown; y?: unknown } | null | undefined
): { x: number; y: number } | null {
  if (!p) return null;
  const x = Number(p.x);
  const y = Number(p.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

export function projectEnvelopeRecord(
  raw: RawEnvelopeRecord
): EnvelopeGeometryView | null {
  const strategyRef = String(raw.strategyRef ?? raw.strategy_ref ?? "").trim();
  if (!strategyRef) return null;
  const target = asPoint(raw.target);
  if (!target) return null;
  const cueRaw = raw.cueSet ?? raw.cue_set ?? [];
  const secondRaw = raw.secondSet ?? raw.second_set ?? [];
  const cueSet = cueRaw
    .map((p) => asPoint(p))
    .filter((p): p is { x: number; y: number } => p != null);
  const secondSet = secondRaw
    .map((p) => asPoint(p))
    .filter((p): p is { x: number; y: number } => p != null);
  if (!cueSet.length || !secondSet.length) return null;
  return { strategyRef, target, cueSet, secondSet };
}

export function buildEnvelopeIndex(
  dataset: RawPublishedEnvelopeDataset | null | undefined
): Map<string, EnvelopeGeometryView> {
  const map = new Map<string, EnvelopeGeometryView>();
  const records = dataset?.records ?? [];
  for (const raw of records) {
    const view = projectEnvelopeRecord(raw);
    if (!view) continue;
    map.set(view.strategyRef, view);
  }
  return map;
}

export function getEnvelopeByStrategyRef(
  index: Map<string, EnvelopeGeometryView>,
  strategyRef: string
): EnvelopeGeometryView | null {
  return index.get(strategyRef) ?? null;
}
