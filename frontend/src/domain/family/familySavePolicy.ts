/**
 * Phase 2C SAVE policy: when to use the 4-track family-aware writer.
 *
 * Save Intent Split (2026-09-20):
 * - CREATE / UPDATE is decided by the user command (SAVE vs OVERWRITE),
 *   never by recall source alone (Published Search / Local DB / Derived).
 * - Draft familyId presence must NOT auto-select UPDATE.
 */

import type { StrategyEntry } from "../positionSearchEngine";
import {
  parseMemberOrigin,
  readPersistedFamilyIdentity,
  type FamilyIdentitySource,
  type FamilyIdentityFields,
  type FamilySaveIntent,
} from "./familyIdentity";
import { parseFamilyTrack } from "./trackSymmetry";

/**
 * Resolve Family save intent from an explicit command only.
 *
 * - requestedIntent CREATE|UPDATE → honor it
 * - otherwise → CREATE (never infer UPDATE from draft/slot identity)
 * - LEGACY only when no requested intent and no persistable family context path
 *   needs the pre-family Exact upsert (no track / no family writer)
 */
export function resolveFamilySaveIntent(args: {
  explicitIdentity?: FamilyIdentitySource | null;
  existingSlotEntry?: StrategyEntry | null;
  authoringStrategyId?: string;
  positionId?: string;
  requestedIntent?: FamilySaveIntent | null;
}): "LEGACY" | FamilySaveIntent {
  if (args.requestedIntent === "UPDATE" || args.requestedIntent === "CREATE") {
    return args.requestedIntent;
  }
  // Default SAVE path: always CREATE. Do not treat draft familyId as UPDATE.
  if (!args.existingSlotEntry) return "CREATE";

  const existing = readPersistedFamilyIdentity(args.existingSlotEntry, {
    authoringStrategyId:
      args.authoringStrategyId ?? args.existingSlotEntry?.authoringStrategyId,
    positionId: args.positionId,
  });
  // Existing Exact slot with family metadata still gets a NEW family on SAVE.
  if (existing) return "CREATE";
  return "LEGACY";
}

export function shouldWriteFourTrackFamilyOnSave(args: {
  saveIntent?: "LEGACY" | FamilySaveIntent;
  familyIdentity: Pick<
    FamilyIdentityFields,
    "familyId" | "memberId" | "memberOrigin"
  >;
  track?: string;
}): boolean {
  if (args.saveIntent === "LEGACY") return false;
  if (!parseFamilyTrack(args.track)) return false;
  if (!args.familyIdentity.familyId || !args.familyIdentity.memberId) return false;

  const origin = parseMemberOrigin(args.familyIdentity.memberOrigin);
  if (origin && origin !== "AUTHORED") return false;

  return true;
}
