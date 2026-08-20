/**
 * Phase 2C SAVE policy: when to use the 4-track family-aware writer.
 *
 * Does not generate Members. Does not replace Phase 2B writer/generator.
 */

import type { StrategyEntry } from "../positionSearchEngine";
import {
  resolveExplicitFamilyIdentityForUpdate,
  parseMemberOrigin,
  readPersistedFamilyIdentity,
  type FamilyIdentitySource,
  type FamilyIdentityFields,
  type FamilySaveIntent,
} from "./familyIdentity";
import { parseFamilyTrack } from "./trackSymmetry";

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
  const explicit = resolveExplicitFamilyIdentityForUpdate(args.explicitIdentity, {
    authoringStrategyId: args.authoringStrategyId,
    positionId: args.positionId,
  });
  if (explicit) return "UPDATE";
  if (!args.existingSlotEntry) return "CREATE";

  const existing = readPersistedFamilyIdentity(args.existingSlotEntry, {
    authoringStrategyId: args.authoringStrategyId ?? args.existingSlotEntry?.authoringStrategyId,
    positionId: args.positionId,
  });
  if (existing) return "CREATE";
  return "LEGACY";
}

export function shouldWriteFourTrackFamilyOnSave(args: {
  saveIntent?: "LEGACY" | FamilySaveIntent;
  familyIdentity: Pick<FamilyIdentityFields, "familyId" | "memberId" | "memberOrigin">;
  track?: string;
}): boolean {
  if (args.saveIntent === "LEGACY") return false;
  if (!parseFamilyTrack(args.track)) return false;
  if (!args.familyIdentity.familyId || !args.familyIdentity.memberId) return false;

  const origin = parseMemberOrigin(args.familyIdentity.memberOrigin);
  if (origin && origin !== "AUTHORED") return false;

  return true;
}
