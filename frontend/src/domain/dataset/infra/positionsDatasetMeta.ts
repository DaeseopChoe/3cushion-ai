/**
 * Phase 3A-333 — Legacy corpus generation authority (side-channel meta).
 *
 * Production SSOT remains positions_dataset (PositionRecord[]).
 * This key only stores durable generation identity for freshness proofs.
 * Does NOT embed generation into PositionRecord rows.
 */

export const POSITIONS_DATASET_META_KEY = "positions_dataset_meta";

export type PositionsDatasetMeta = {
  corpusGeneration: number;
};

export function isValidCorpusGeneration(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    Number.isFinite(value) &&
    value >= 1
  );
}

export function loadPositionsDatasetMeta(): PositionsDatasetMeta | null {
  try {
    if (typeof localStorage === "undefined") return null;
    const raw = localStorage.getItem(POSITIONS_DATASET_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PositionsDatasetMeta>;
    if (!isValidCorpusGeneration(parsed?.corpusGeneration)) return null;
    return { corpusGeneration: parsed.corpusGeneration };
  } catch {
    return null;
  }
}

export function loadPositionsDatasetCorpusGeneration(): number | null {
  return loadPositionsDatasetMeta()?.corpusGeneration ?? null;
}

/**
 * Write absolute corpus generation (diagnostics / tests).
 * Returns false when localStorage write fails or value is invalid.
 */
export function writePositionsDatasetCorpusGeneration(
  corpusGeneration: number
): boolean {
  if (!isValidCorpusGeneration(corpusGeneration)) return false;
  try {
    if (typeof localStorage === "undefined") return false;
    const meta: PositionsDatasetMeta = { corpusGeneration };
    localStorage.setItem(POSITIONS_DATASET_META_KEY, JSON.stringify(meta));
    return true;
  } catch {
    return false;
  }
}

export type BumpCorpusGenerationResult =
  | { ok: true; corpusGeneration: number }
  | { ok: false; reason: string };

/**
 * Allocate next monotonic corpus generation (legacy helper).
 *
 * Phase 3A-335: Prefer `persistPositionsDatasetWithGeneration` for production
 * corpus mutations (invalidate → positions → generation). Using bump alone
 * after a positions write can leave false-fresh if bump fails.
 *
 * Missing / invalid prior meta → next = 1.
 * Failure leaves prior meta unchanged when bump is used in isolation.
 */
export function bumpPositionsDatasetCorpusGeneration(): BumpCorpusGenerationResult {
  try {
    if (typeof localStorage === "undefined") {
      return {
        ok: false,
        reason: "localStorage is not available; corpus generation bump skipped",
      };
    }
    const current = loadPositionsDatasetCorpusGeneration();
    const next = (current ?? 0) + 1;
    if (!writePositionsDatasetCorpusGeneration(next)) {
      return {
        ok: false,
        reason: "failed to persist positions_dataset_meta corpusGeneration",
      };
    }
    return { ok: true, corpusGeneration: next };
  } catch (e) {
    return {
      ok: false,
      reason: e instanceof Error ? e.message : String(e),
    };
  }
}

/** Test helper — does not clear positions_dataset. */
export function clearPositionsDatasetMetaForTests(): void {
  try {
    localStorage.removeItem(POSITIONS_DATASET_META_KEY);
  } catch {
    /* ignore */
  }
}
