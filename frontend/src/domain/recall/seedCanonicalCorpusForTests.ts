/**
 * Test helper — seed canonical normalized_dataset from flat PositionRecord[].
 * Phase C Local Search reads only normalized_dataset; integration tests must seed it.
 */

import type { PositionRecord } from "../positionSearchEngine";
import { persistWorkingCorpusNormalizedAuthority } from "../dataset/infra/persistWorkingCorpusNormalizedAuthority";

export function seedCanonicalLocalCorpusFromFlat(
  dataset: PositionRecord[],
  meta: { shotType?: string; systemId?: string } = {}
): void {
  const result = persistWorkingCorpusNormalizedAuthority({
    dataset,
    shotType: meta.shotType ?? "뒤돌리기",
    systemId: meta.systemId ?? "5_half_system",
    writeFlatCompatibility: false,
    writeFamilyShadow: false,
  });
  if (!result.ok) {
    throw new Error(
      `seedCanonicalLocalCorpusFromFlat failed (${result.stage}): ${result.reason}`
    );
  }
}
