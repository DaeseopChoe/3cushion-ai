/**
 * Derived source-member lineage contract (Phase 3A-3).
 *
 * Writer-agnostic: does not know CUE_IMPACT_FIRST_30PCT / C3_PLUS_2RG geometry.
 * Identity is memberId + familyId + track + origin — never coordinates / positionId.
 */

import type { PositionRecord, StrategyEntry } from "../positionSearchEngine";
import {
  isDerivedMemberOrigin,
  parseMemberOrigin,
  readPersistedFamilyIdentity,
  type MemberOrigin,
} from "./familyIdentity";

export type FamilySourceMemberRef = {
  familyId: string;
  memberId: string;
  memberOrigin?: MemberOrigin;
  track: string;
};

export type ValidateDerivedSourceResult =
  | { ok: true; source: FamilySourceMemberRef }
  | { ok: false; reason: string };

function trimTrack(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

export function sourceRefFromIdentityFields(args: {
  familyId?: string;
  memberId?: string;
  memberOrigin?: MemberOrigin;
  track?: string;
}): FamilySourceMemberRef | null {
  const familyId = typeof args.familyId === "string" ? args.familyId.trim() : "";
  const memberId = typeof args.memberId === "string" ? args.memberId.trim() : "";
  const track = trimTrack(args.track);
  if (!familyId || !memberId || !track) return null;
  return {
    familyId,
    memberId,
    ...(args.memberOrigin ? { memberOrigin: args.memberOrigin } : {}),
    track,
  };
}

export function collectFamilySourceRefsFromDataset(
  dataset: PositionRecord[],
  familyId: string
): FamilySourceMemberRef[] {
  const out: FamilySourceMemberRef[] = [];
  for (const record of dataset) {
    for (const slot of ["S1", "S2", "S3"] as const) {
      const entry = record.strategies[slot];
      if (!entry) continue;
      const identity = readPersistedFamilyIdentity(entry, {
        authoringStrategyId: entry.authoringStrategyId,
        positionId: record.positionId,
      });
      if (identity?.familyId !== familyId || !identity.memberId) continue;
      const ref = sourceRefFromIdentityFields({
        familyId: identity.familyId,
        memberId: identity.memberId,
        memberOrigin: identity.memberOrigin,
        track: entry.track,
      });
      if (ref) out.push(ref);
    }
  }
  return out;
}

export function validateDerivedSourceMember(args: {
  derived: {
    familyId: string;
    memberId: string;
    memberOrigin?: MemberOrigin | StrategyEntry["memberOrigin"];
    generatedFromMemberId?: string;
    track: string;
  };
  sources: FamilySourceMemberRef[];
}): ValidateDerivedSourceResult {
  const familyId = args.derived.familyId.trim();
  const derivedTrack = trimTrack(args.derived.track);
  const generatedFrom = (args.derived.generatedFromMemberId ?? "").trim();
  if (!generatedFrom) {
    return { ok: false, reason: "derived member requires generatedFromMemberId" };
  }
  if (!derivedTrack) {
    return { ok: false, reason: "derived member requires track" };
  }

  const source = args.sources.find(
    (row) => row.familyId === familyId && row.memberId === generatedFrom
  );
  if (!source) {
    return {
      ok: false,
      reason: `derived ${args.derived.memberId} has no same-family source member ${generatedFrom}`,
    };
  }

  const sourceOrigin = parseMemberOrigin(source.memberOrigin);
  if (isDerivedMemberOrigin(sourceOrigin)) {
    return {
      ok: false,
      reason: `derived ${args.derived.memberId} cannot source another derived member`,
    };
  }
  if (sourceOrigin && sourceOrigin !== "AUTHORED" && sourceOrigin !== "SYMMETRY") {
    return {
      ok: false,
      reason: `derived ${args.derived.memberId} source origin is not a Track base Member`,
    };
  }
  if (trimTrack(source.track) !== derivedTrack) {
    return {
      ok: false,
      reason: `derived ${args.derived.memberId} track ${derivedTrack} must match source track ${source.track}`,
    };
  }
  return { ok: true, source };
}
