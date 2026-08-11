/**
 * Thin RI result → existing Strategy Slot hydrate projection.
 * No SYS/Modal re-interpolation; no Builder/Calculator ownership.
 * Identity SSOT: authoringStrategyId (≠ strategyRef).
 */

import { isValidAuthoringStrategyId } from "../authoringStrategyId";
import type { StrategyEntry } from "../positionSearchEngine";
import type { MatchType, RealInterpolationStrategyResult } from "./types";

export const RI_STRATEGY_SLOT_IDS = ["S1", "S2", "S3"] as const;
export type RiStrategySlotId = (typeof RI_STRATEGY_SLOT_IDS)[number];

export type RiStrategySlotProjection =
  | {
      ok: true;
      entry: StrategyEntry;
      slotId: RiStrategySlotId;
      authoringStrategyId: string;
      strategyRef: string;
      matchType: MatchType;
    }
  | {
      ok: false;
      reason: string;
    };

function isSlotId(v: unknown): v is RiStrategySlotId {
  return v === "S1" || v === "S2" || v === "S3";
}

/** Parse source slot from strategyRef (`${positionId}.${S1|S2|S3}`). */
export function slotIdFromStrategyRef(strategyRef: unknown): RiStrategySlotId | null {
  if (typeof strategyRef !== "string") return null;
  const m = /^(.*)\.(S[123])$/.exec(strategyRef.trim());
  if (!m) return null;
  return isSlotId(m[2]) ? m[2] : null;
}

export function resolveRealInterpolationActivationSlotId(
  result: Pick<RealInterpolationStrategyResult, "strategyRef">,
  slotHint?: unknown
): RiStrategySlotId | null {
  if (isSlotId(slotHint)) return slotHint;
  return slotIdFromStrategyRef(result?.strategyRef);
}

/**
 * Project engine RI result into a StrategyEntry compatible with
 * loadDraftFromStrategyEntry / activateStrategySlot.
 * Consumes result.sysInputs as-is (exact | interpolated | nearest).
 * Optional slotHint selects existing S1/S2/S3 activation target (TOP3 rank).
 */
export function projectRealInterpolationResultToStrategyEntry(
  result: RealInterpolationStrategyResult | null | undefined,
  slotHint?: unknown
): RiStrategySlotProjection {
  if (!result || typeof result !== "object") {
    return { ok: false, reason: "missing_result" };
  }

  const authoringStrategyId =
    typeof result.authoringStrategyId === "string"
      ? result.authoringStrategyId.trim()
      : "";
  if (!isValidAuthoringStrategyId(authoringStrategyId)) {
    return { ok: false, reason: "missing_authoringStrategyId" };
  }

  const strategyRef =
    typeof result.strategyRef === "string" ? result.strategyRef.trim() : "";
  if (!strategyRef) {
    return { ok: false, reason: "missing_strategyRef" };
  }

  // strategyRef must never be treated as authoringStrategyId.
  if (authoringStrategyId === strategyRef) {
    return { ok: false, reason: "authoringStrategyId_eq_strategyRef" };
  }

  const entry = result.primaryEntry;
  if (!entry || typeof entry !== "object") {
    return { ok: false, reason: "missing_primaryEntry" };
  }

  const entryAsid =
    typeof entry.authoringStrategyId === "string"
      ? entry.authoringStrategyId.trim()
      : "";
  if (entryAsid && entryAsid !== authoringStrategyId) {
    return { ok: false, reason: "cross_family_authoringStrategyId" };
  }

  const sysInputs = result.sysInputs;
  if (
    !sysInputs ||
    typeof sysInputs !== "object" ||
    Array.isArray(sysInputs)
  ) {
    return { ok: false, reason: "malformed_sysInputs" };
  }

  const matchType = result.matchType;
  if (
    matchType !== "exact" &&
    matchType !== "interpolated" &&
    matchType !== "nearest"
  ) {
    return { ok: false, reason: "invalid_matchType" };
  }

  const slotId = resolveRealInterpolationActivationSlotId(result, slotHint);
  if (!slotId) {
    return { ok: false, reason: "unresolved_slotId" };
  }

  const projected: StrategyEntry = {
    ...entry,
    authoringStrategyId,
    sysInputs: { ...sysInputs },
    // Modal / Primary: consume primaryEntry as-is (no blend).
    hpT: entry.hpT,
    str: entry.str,
    ai: entry.ai,
  };

  return {
    ok: true,
    entry: projected,
    slotId,
    authoringStrategyId,
    strategyRef,
    matchType,
  };
}

export function positionIdFromStrategyRef(strategyRef: string): string | null {
  const m = /^(.*)\.(S[123])$/.exec(strategyRef.trim());
  return m?.[1] ? m[1] : null;
}
