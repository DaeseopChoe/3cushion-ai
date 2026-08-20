/**
 * In-memory projection: frozen Derived Candidate → existing runtime / Modal inputs.
 * No dataset mutation. No writeFamilyMembers.
 */

import type { Ball3, PositionRecord, StrategyEntry } from "../positionSearchEngine";
import {
  draftFamilyIdentityFromStrategyEntry,
  draftRuntimeFieldsFromStrategyEntry,
  runtimeHptFromStrategyEntry,
  strategyEntryToSlotDraftSys,
} from "../slotDraftFromEntry";
import type { LogicalFamilyMemberCandidate } from "./familyAwareWriter";
import { projectFamilyMemberToCompatibilityEntry } from "./familyAwareWriter";
import { resolveRuntimeHptForFamilyMember } from "./familyRuntimeProjection";
import type { FamilyTrack } from "./trackSymmetry";

export type DerivedCandidateRuntimeProjection = {
  entry: StrategyEntry;
  balls: Ball3;
  slotDraft: {
    sys: ReturnType<typeof strategyEntryToSlotDraftSys>;
    hpt: unknown;
    str: unknown;
    ai: unknown;
    corrections?: unknown;
    shotType?: string;
    system_values?: Record<string, number>;
    trajectoryExtensions?: unknown;
    reflectionOverride?: unknown;
    familyId?: string;
    memberId?: string;
    memberOrigin?: string;
    generatedFromMemberId?: string;
    symmetryOp?: string;
    derivedRule?: string;
    derivedStep?: string;
    track?: string;
  };
  adminPatch: {
    hpt: unknown;
    str: unknown;
    ai: unknown;
    sys: ReturnType<typeof strategyEntryToSlotDraftSys>;
  };
};

function runtimeHptForDerivedCandidate(args: {
  dataset: PositionRecord[];
  familyId: string;
  candidate: LogicalFamilyMemberCandidate;
  projectedEntry: StrategyEntry;
}): unknown {
  const resolved = resolveRuntimeHptForFamilyMember({
    dataset: args.dataset,
    familyId: args.familyId,
    requestedTrack: args.candidate.track,
    memberEntry: args.projectedEntry,
  });
  if (resolved?.hpt) return resolved.hpt;
  return args.projectedEntry.hpT;
}

/**
 * Project a frozen Derived Candidate for INSPECT (in-memory only).
 * Uses Family HPT resolver for candidate.track — not SYMMETRY-only runtimeHptFromStrategyEntry.
 */
export function projectDerivedCandidateToRuntimeView(args: {
  dataset: PositionRecord[];
  familyId: string;
  candidate: LogicalFamilyMemberCandidate;
  slot: StrategyEntry["slot"];
}): DerivedCandidateRuntimeProjection {
  const projected = projectFamilyMemberToCompatibilityEntry(args.candidate, args.slot);
  const runtimeHpt = runtimeHptForDerivedCandidate({
    dataset: args.dataset,
    familyId: args.familyId,
    candidate: args.candidate,
    projectedEntry: projected,
  });
  const entry: StrategyEntry = { ...projected, hpT: runtimeHpt };
  const runtimeFields = draftRuntimeFieldsFromStrategyEntry(entry);
  const slotDraft = {
    sys: strategyEntryToSlotDraftSys(entry),
    hpt: runtimeHpt,
    str: entry.str,
    ai: entry.ai,
    ...draftFamilyIdentityFromStrategyEntry(entry),
    ...runtimeFields,
  };
  return {
    entry,
    balls: args.candidate.balls,
    slotDraft,
    adminPatch: {
      sys: slotDraft.sys,
      hpt: runtimeHpt,
      str: entry.str,
      ai: entry.ai,
    },
  };
}

/**
 * Project a Family source member (AUTHORED/SYMMETRY) for Review track display.
 */
export function projectFamilySourceMemberToRuntimeView(args: {
  entry: StrategyEntry;
  balls: Ball3;
  slot: StrategyEntry["slot"];
}): DerivedCandidateRuntimeProjection {
  const runtimeHpt = runtimeHptFromStrategyEntry(args.entry);
  const runtimeFields = draftRuntimeFieldsFromStrategyEntry(args.entry);
  const slotDraft = {
    sys: strategyEntryToSlotDraftSys(args.entry),
    hpt: runtimeHpt,
    str: args.entry.str,
    ai: args.entry.ai,
    ...draftFamilyIdentityFromStrategyEntry(args.entry),
    ...runtimeFields,
  };
  return {
    entry: args.entry,
    balls: args.balls,
    slotDraft,
    adminPatch: {
      sys: slotDraft.sys,
      hpt: runtimeHpt,
      str: args.entry.str,
      ai: args.entry.ai,
    },
  };
}

export function familyTrackFromSession(
  session: { authoredTrack: FamilyTrack } | null | undefined,
  viewingTrack: FamilyTrack | null | undefined
): FamilyTrack | null {
  return viewingTrack ?? session?.authoredTrack ?? null;
}
