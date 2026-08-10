/**
 * Top-3 Strategy results by authoringStrategyId (no shot-name dedupe).
 */

import { TOP_STRATEGY_RESULTS } from "./policy";
import type { RealInterpolationStrategyResult } from "./types";

export function selectTopStrategyResults(
  results: RealInterpolationStrategyResult[],
  limit: number = TOP_STRATEGY_RESULTS
): RealInterpolationStrategyResult[] {
  const sorted = [...results].sort((a, b) => {
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return a.authoringStrategyId.localeCompare(b.authoringStrategyId);
  });
  return sorted.slice(0, Math.max(0, limit));
}
