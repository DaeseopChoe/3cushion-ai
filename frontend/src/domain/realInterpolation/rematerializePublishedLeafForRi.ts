/**
 * Phase E-3 — On-demand PositionRecord[] projection for Real Interpolation.
 *
 * RI knot corpus meaning = Strategy/slot (authoringStrategyId families),
 * Cue-1D brackets need ALL positions in the leaf — not Search winner-only.
 *
 * Does NOT change RI formulas / neighbor / weights / thresholds.
 * Uses canonical rematerializeFamilyPartsToPositionRecords only.
 *
 * Not a durable cache field — call only when RI runs.
 */

import type { FamilyMaster, FamilyMember } from "../family/familyNormalizedSchema";
import { rematerializeFamilyPartsToPositionRecords } from "../family/rematerializeFamilyPartsToPositionRecords";
import type { PositionRecord } from "../positionSearchEngine";

export type RematerializePublishedLeafForRiInput = {
  familyMasters: FamilyMaster[];
  familyMembers: FamilyMember[];
};

export type RematerializePublishedLeafForRiResult =
  | { ok: true; records: PositionRecord[] }
  | { ok: false; reason: string };

/**
 * Whole-leaf rematerialize for RI knot corpus (on-demand).
 * Fail-closed on rematerialize issues — no silent partial corpus.
 */
export function rematerializePublishedLeafForRi(
  input: RematerializePublishedLeafForRiInput
): RematerializePublishedLeafForRiResult {
  const { familyMasters, familyMembers } = input;
  if (!familyMembers.length) {
    return { ok: false, reason: "empty-members" };
  }
  const remat = rematerializeFamilyPartsToPositionRecords({
    masters: familyMasters,
    members: familyMembers,
  });
  if (!remat.ok) {
    return {
      ok: false,
      reason: remat.issues[0]?.code ?? "rematerialize-failed",
    };
  }
  if (!remat.dataset.length) {
    return { ok: false, reason: "empty-dataset" };
  }
  return { ok: true, records: remat.dataset };
}
