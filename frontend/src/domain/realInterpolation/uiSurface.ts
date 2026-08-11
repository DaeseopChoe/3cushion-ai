/**
 * Step 5 — RI UI surface projection (display only).
 * Consumes engine results as-is: no rerank, no confidence/SYS/Modal recompute.
 */

import type { MatchType, RealInterpolationStrategyResult } from "./types";

export const RI_UI_SLOT_HINTS = ["S1", "S2", "S3"] as const;

export type RealInterpolationUiCandidate = {
  index: number;
  slotHint: (typeof RI_UI_SLOT_HINTS)[number];
  authoringStrategyId: string;
  strategyRef: string;
  matchType: MatchType;
  /** Engine confidence 0..100 — pass-through only. */
  confidence: number;
  /** Display label only (shotType); never used for identity/dedupe. */
  displayName: string;
};

export type RealInterpolationUiSurface = {
  candidates: RealInterpolationUiCandidate[];
  /** First candidate when present; null when empty. */
  primary: RealInterpolationUiCandidate | null;
};

function isMatchType(v: unknown): v is MatchType {
  return v === "exact" || v === "interpolated" || v === "nearest";
}

/** Human-readable formatting only — does not invent new matchType semantics. */
export function formatRiMatchTypeLabel(matchType: MatchType): string {
  return matchType;
}

/** Engine confidence as display string — no rounding policy change beyond String(). */
export function formatRiConfidenceLabel(confidence: number): string {
  return String(confidence);
}

function displayNameFromResult(
  result: RealInterpolationStrategyResult
): string {
  const shot = result.primaryEntry?.signature?.shotType;
  if (typeof shot === "string" && shot.trim()) return shot.trim();
  return result.authoringStrategyId;
}

/**
 * Build UI surface from engine/application RI results.
 * Preserves engine order; caps at 3; no shot-name dedupe.
 */
export function buildRealInterpolationUiSurface(
  results: readonly RealInterpolationStrategyResult[] | null | undefined
): RealInterpolationUiSurface {
  if (!Array.isArray(results) || results.length === 0) {
    return { candidates: [], primary: null };
  }

  const candidates: RealInterpolationUiCandidate[] = [];
  const limit = Math.min(3, results.length);
  for (let i = 0; i < limit; i += 1) {
    const r = results[i];
    if (!r || typeof r !== "object") continue;
    if (typeof r.authoringStrategyId !== "string" || !r.authoringStrategyId.trim()) {
      continue;
    }
    if (!isMatchType(r.matchType)) continue;
    if (typeof r.confidence !== "number" || !Number.isFinite(r.confidence)) {
      continue;
    }
    if (typeof r.strategyRef !== "string" || !r.strategyRef.trim()) continue;

    candidates.push({
      index: i,
      slotHint: RI_UI_SLOT_HINTS[i] ?? "S1",
      authoringStrategyId: r.authoringStrategyId,
      strategyRef: r.strategyRef,
      matchType: r.matchType,
      confidence: r.confidence,
      displayName: displayNameFromResult(r),
    });
  }

  return {
    candidates,
    primary: candidates[0] ?? null,
  };
}
