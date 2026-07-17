/**
 * validation/engine/plan/layerFamily.ts
 *
 * STEP6-7C — Layer / L4 Family ordering helpers (STEP6-6 §7.2 · §9.2).
 * Consume Framework Layer order + Catalog L4 Family chain. No new cascade rules.
 */

import type { RuleRecordView } from "../models";

/** Parse primaryLayer → 1..7 (unknown → 99 so they sort last). */
export function layerRank(primaryLayer: string | undefined): number {
  if (!primaryLayer) return 99;
  const m = String(primaryLayer).trim().match(/^L?([1-7])$/i);
  if (m) return Number(m[1]);
  const n = Number(primaryLayer);
  if (Number.isInteger(n) && n >= 1 && n <= 7) return n;
  return 99;
}

/**
 * Intra-L4 Family chain: Presence → Typing → Domain-check (STEP6-6 §7.2).
 * Non-L4 or unknown family → high rank (stable after chain).
 */
export function l4FamilyRank(family: string | undefined, layer: number): number {
  if (layer !== 4) return 0;
  if (!family) return 50;
  const f = family.trim().toUpperCase().replace(/[\s_]+/g, "-");
  if (
    f === "F-PRESENCE" ||
    f === "PRESENCE" ||
    f.endsWith("PRESENCE")
  ) {
    return 1;
  }
  if (f === "F-TYPING" || f === "TYPING" || f.endsWith("TYPING")) {
    return 2;
  }
  if (
    f === "F-DOMAIN-CHECK" ||
    f === "DOMAIN-CHECK" ||
    f === "DOMAINCHECK" ||
    f.includes("DOMAIN-CHECK") ||
    f.includes("DOMAINCHECK")
  ) {
    return 3;
  }
  return 40;
}

/** Stable comparator for initial execution order (analysis only). */
export function comparePlanOrder(a: RuleRecordView, b: RuleRecordView): number {
  const la = layerRank(a.primaryLayer);
  const lb = layerRank(b.primaryLayer);
  if (la !== lb) return la - lb;
  const fa = l4FamilyRank(a.family, la);
  const fb = l4FamilyRank(b.family, lb);
  if (fa !== fb) return fa - fb;
  return a.ruleId.localeCompare(b.ruleId);
}

export function isBlockingLayer(layer: number): boolean {
  return layer === 1 || layer === 2;
}

export function looksBlockingCandidate(rule: RuleRecordView): boolean {
  const any = rule as RuleRecordView & { blockingCandidate?: boolean };
  if (any.blockingCandidate === true) return true;
  // Lean: L1/L2 In-Run rules participate in layer-cascade edges (Framework §8 cite).
  return isBlockingLayer(layerRank(rule.primaryLayer));
}
