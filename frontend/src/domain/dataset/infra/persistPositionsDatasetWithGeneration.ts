/**
 * Phase 3A-335 — Safe durable positions_dataset + generation commit.
 *
 * Sequence (fail-closed):
 *   1. read previousGeneration (in memory)
 *   2. invalidate positions_dataset_meta (remove)
 *   3. write positions_dataset
 *   4. write next corpusGeneration
 *
 * If step 4 fails after step 3, marker stays missing → freshness false
 * (closes Phase 3A-334 false-fresh window).
 *
 * Production callers must use this helper (not raw saveWorkingDataset + bump).
 */

import type { PositionRecord } from "../../positionSearchEngine";
import { WORKING_DATASET_KEY } from "./datasetStorage";
import {
  loadPositionsDatasetCorpusGeneration,
  writePositionsDatasetCorpusGeneration,
  POSITIONS_DATASET_META_KEY,
} from "./positionsDatasetMeta";

export type PersistPositionsStage =
  | "invalidate"
  | "positions"
  | "generation";

export type PersistPositionsWithGenerationSuccess = {
  ok: true;
  corpusGeneration: number;
  previousGeneration: number | null;
};

export type PersistPositionsWithGenerationFailure = {
  ok: false;
  stage: PersistPositionsStage;
  reason: string;
  previousGeneration: number | null;
};

export type PersistPositionsWithGenerationResult =
  | PersistPositionsWithGenerationSuccess
  | PersistPositionsWithGenerationFailure;

/** Test-only failure injection. Never set in production. */
export type PersistPositionsTestForceFail = PersistPositionsStage | null;

let testForceFail: PersistPositionsTestForceFail = null;

export function forcePersistPositionsFailureForTests(
  stage: PersistPositionsTestForceFail
): void {
  testForceFail = stage;
}

export function clearPersistPositionsFailureForTests(): void {
  testForceFail = null;
}

/**
 * Remove legacy generation authority so missing marker ⇒ freshness false.
 * Returns false if the marker could not be cleared (do not mutate positions).
 */
export function invalidatePositionsDatasetCorpusGeneration(): boolean {
  try {
    if (typeof localStorage === "undefined") return false;
    if (testForceFail === "invalidate") return false;
    localStorage.removeItem(POSITIONS_DATASET_META_KEY);
    return localStorage.getItem(POSITIONS_DATASET_META_KEY) == null;
  } catch {
    return false;
  }
}

/**
 * Durable corpus mutation with generation safety.
 * Does not run normalized shadow sync (caller does after ok).
 */
export function persistPositionsDatasetWithGeneration(
  dataset: PositionRecord[] | null | undefined
): PersistPositionsWithGenerationResult {
  const records = Array.isArray(dataset) ? dataset : [];
  const previousGeneration = loadPositionsDatasetCorpusGeneration();
  const nextGeneration = (previousGeneration ?? 0) + 1;

  if (!invalidatePositionsDatasetCorpusGeneration()) {
    return {
      ok: false,
      stage: "invalidate",
      reason:
        "failed to invalidate positions_dataset_meta; positions mutation aborted",
      previousGeneration,
    };
  }

  try {
    if (typeof localStorage === "undefined") {
      return {
        ok: false,
        stage: "positions",
        reason: "localStorage is not available; positions write aborted",
        previousGeneration,
      };
    }
    if (testForceFail === "positions") {
      return {
        ok: false,
        stage: "positions",
        reason: "forced positions write failure (test)",
        previousGeneration,
      };
    }
    localStorage.setItem(WORKING_DATASET_KEY, JSON.stringify(records));
  } catch (e) {
    return {
      ok: false,
      stage: "positions",
      reason: e instanceof Error ? e.message : String(e),
      previousGeneration,
    };
  }

  if (testForceFail === "generation") {
    return {
      ok: false,
      stage: "generation",
      reason: "forced generation commit failure (test)",
      previousGeneration,
    };
  }

  if (!writePositionsDatasetCorpusGeneration(nextGeneration)) {
    return {
      ok: false,
      stage: "generation",
      reason: "failed to persist positions_dataset_meta corpusGeneration",
      previousGeneration,
    };
  }

  return {
    ok: true,
    corpusGeneration: nextGeneration,
    previousGeneration,
  };
}
