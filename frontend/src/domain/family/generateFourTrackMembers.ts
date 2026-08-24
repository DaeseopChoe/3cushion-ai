/**
 * Four-track Family Member generator (domain, no SAVE integration).
 *
 * Input: one Family-aware AUTHORED Member with an explicit FamilyTrack.
 * Output: AUTHORED + H + V + RPI Members.
 *
 * SYMMETRY → SYMMETRY regeneration is forbidden.
 * System-specific routes are not FamilyTrack values.
 *
 * Common payload (sys/hpt/…) is TEMPORARY compatibility duplication.
 * reflectionOverride stays Member-specific (omitted on SYMMETRY).
 * trajectoryExtensions are transformed onto SYMMETRY tracks (Phase 3A-359H).
 */

import { mintAuthoringStrategyId } from "../authoringStrategyId";
import { createPositionId } from "../positionId";
import type {
  Ball3,
  StrategyEntry,
  TargetBall,
} from "../positionSearchEngine";
import {
  familySymmetryIdentity,
  mintMemberId,
  readPersistedFamilyIdentity,
  type FamilySymmetryIdentity,
  type SymmetryOp,
} from "./familyIdentity";
import {
  FAMILY_MASTER_MIGRATION_DEBT,
  TEMPORARY_COMPATIBILITY_DUPLICATION,
} from "./familyMigrationDebt";
import {
  cloneBall3,
  mapFamilyTrack,
  parseFamilyTrack,
  transformBall3,
  transformStrategyMeta,
  transformTrajectoryExtensions,
  validateBall3Centers,
  type FamilyTrack,
} from "./trackSymmetry";
import type { TrajectoryExtensionPayload } from "../trajectoryExtension/model";

export type AuthoredFamilyMemberInput = {
  balls: Ball3;
  targetBall?: TargetBall;
  entry: StrategyEntry;
};

export type ExistingFamilyMemberLineage = {
  identity: FamilySymmetryIdentity;
  memberId: string;
  authoringStrategyId?: string;
};

export type FourTrackMember = {
  balls: Ball3;
  positionId: string;
  targetBall?: TargetBall;
  track: FamilyTrack;
  /** null = AUTHORED identity (no persisted symmetryOp). */
  symmetryOp: SymmetryOp | null;
  entry: StrategyEntry;
};

export type FourTrackMemberSet = {
  familyId: string;
  authoredMemberId: string;
  authoredTrack: FamilyTrack;
  authored: FourTrackMember;
  symmetry: Record<SymmetryOp, FourTrackMember>;
  members: FourTrackMember[];
};

export type GenerateFourTrackResult =
  | { ok: true; set: FourTrackMemberSet }
  | { ok: false; reason: string };

const SYMMETRY_OPS: readonly SymmetryOp[] = ["H", "V", "RPI"];

function cloneJson<T>(value: T): T {
  if (value == null || typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function cloneExtensions(
  payload: StrategyEntry["trajectoryExtensions"]
): TrajectoryExtensionPayload | undefined {
  if (!payload || !Array.isArray(payload.items) || payload.items.length === 0) {
    return undefined;
  }
  return cloneJson(payload) as TrajectoryExtensionPayload;
}

function lineageMap(
  existing: ExistingFamilyMemberLineage[] | undefined
): Map<FamilySymmetryIdentity, ExistingFamilyMemberLineage> {
  const map = new Map<FamilySymmetryIdentity, ExistingFamilyMemberLineage>();
  for (const row of existing ?? []) {
    if (!map.has(row.identity)) map.set(row.identity, row);
  }
  return map;
}

/**
 * Copy Family-common payload for current PositionRecord consumers.
 *
 * TEMPORARY_COMPATIBILITY_DUPLICATION — not Family Master SSOT.
 * hpT is the AUTHORED canonical snapshot (not handedness-mirrored).
 * reflectionOverride is Member-specific and omitted.
 * trajectoryExtensions are NOT in this common blob — applied per-member via transform.
 */
function copyTemporaryCommonPayload(source: StrategyEntry): Pick<
  StrategyEntry,
  | "signature"
  | "sysInputs"
  | "corrections"
  | "correctionsStored"
  | "ai"
  | "str"
  | "hpT"
> {
  void FAMILY_MASTER_MIGRATION_DEBT;
  void TEMPORARY_COMPATIBILITY_DUPLICATION;
  return {
    signature: cloneJson(source.signature),
    sysInputs: { ...(source.sysInputs ?? {}) },
    ...(source.corrections ? { corrections: cloneJson(source.corrections) } : {}),
    ...(source.correctionsStored != null
      ? { correctionsStored: source.correctionsStored }
      : {}),
    ...(source.ai !== undefined ? { ai: cloneJson(source.ai) } : {}),
    ...(source.str !== undefined ? { str: cloneJson(source.str) } : {}),
    ...(source.hpT !== undefined ? { hpT: cloneJson(source.hpT) } : {}),
  };
}

function memberIdsFor(
  identity: FamilySymmetryIdentity,
  existing: Map<FamilySymmetryIdentity, ExistingFamilyMemberLineage>
): { memberId: string; authoringStrategyId: string } {
  const found = existing.get(identity);
  if (found?.memberId) {
    return {
      memberId: found.memberId,
      authoringStrategyId:
        found.authoringStrategyId && found.authoringStrategyId.trim()
          ? found.authoringStrategyId
          : mintAuthoringStrategyId(),
    };
  }
  return {
    memberId: mintMemberId(),
    authoringStrategyId: mintAuthoringStrategyId(),
  };
}

export function generateFourTrackMembers(
  authored: AuthoredFamilyMemberInput,
  options?: { existingMembers?: ExistingFamilyMemberLineage[] }
): GenerateFourTrackResult {
  const identity = readPersistedFamilyIdentity(authored.entry, {
    authoringStrategyId: authored.entry.authoringStrategyId,
    positionId: createPositionId(authored.balls),
  });
  if (!identity?.familyId || !identity.memberId) {
    return { ok: false, reason: "authored member is not Family-aware" };
  }
  if (identity.memberOrigin && identity.memberOrigin !== "AUTHORED") {
    return {
      ok: false,
      reason: "generator requires an AUTHORED Member (SYMMETRY → SYMMETRY forbidden)",
    };
  }
  if (identity.symmetryOp) {
    return { ok: false, reason: "AUTHORED member must not carry symmetryOp" };
  }

  const authoredTrack = parseFamilyTrack(authored.entry.track);
  if (!authoredTrack) {
    return {
      ok: false,
      reason: "authored track is not a FamilyTrack (system routes are not Family tracks)",
    };
  }

  const authoredInvalid = validateBall3Centers(authored.balls);
  if (authoredInvalid) {
    return { ok: false, reason: `authored ${authoredInvalid}` };
  }

  const existing = lineageMap(options?.existingMembers);
  const authoredLineage = existing.get("IDENTITY");
  const authoredMemberId = authoredLineage?.memberId ?? identity.memberId;
  const authoredAsid =
    authoredLineage?.authoringStrategyId?.trim() ||
    authored.entry.authoringStrategyId?.trim() ||
    mintAuthoringStrategyId();

  const authoredBalls = cloneBall3(authored.balls);
  const authoredPositionId = createPositionId(authoredBalls);
  const common = copyTemporaryCommonPayload(authored.entry);
  const targetBall = authored.targetBall;
  const authoredExtensions = cloneExtensions(authored.entry.trajectoryExtensions);

  const authoredEntry: StrategyEntry = {
    slot: authored.entry.slot,
    ...common,
    track: authoredTrack,
    familyId: identity.familyId,
    memberId: authoredMemberId,
    memberOrigin: "AUTHORED",
    authoringStrategyId: authoredAsid,
    meta: cloneJson(authored.entry.meta),
    ...(authoredExtensions ? { trajectoryExtensions: authoredExtensions } : {}),
  };

  const authoredMember: FourTrackMember = {
    balls: authoredBalls,
    positionId: authoredPositionId,
    ...(targetBall === "yellow" || targetBall === "red" ? { targetBall } : {}),
    track: authoredTrack,
    symmetryOp: null,
    entry: authoredEntry,
  };

  const symmetry = {} as Record<SymmetryOp, FourTrackMember>;

  for (const op of SYMMETRY_OPS) {
    const transformed = transformBall3(op, authoredBalls);
    const invalid = validateBall3Centers(transformed);
    if (invalid) {
      return { ok: false, reason: `${op} ${invalid}` };
    }
    const ids = memberIdsFor(op, existing);
    const track = mapFamilyTrack(authoredTrack, op);
    const positionId = createPositionId(transformed);
    const mirroredExtensions =
      authoredExtensions != null
        ? transformTrajectoryExtensions(op, authoredExtensions)
        : undefined;
    const entry: StrategyEntry = {
      slot: authored.entry.slot,
      ...copyTemporaryCommonPayload(authored.entry),
      track,
      familyId: identity.familyId,
      memberId: ids.memberId,
      memberOrigin: "SYMMETRY",
      generatedFromMemberId: authoredMemberId,
      symmetryOp: op,
      authoringStrategyId: ids.authoringStrategyId,
      meta: transformStrategyMeta(op, authored.entry.meta, transformed),
      ...(mirroredExtensions ? { trajectoryExtensions: mirroredExtensions } : {}),
    };

    symmetry[op] = {
      balls: transformed,
      positionId,
      ...(targetBall === "yellow" || targetBall === "red" ? { targetBall } : {}),
      track,
      symmetryOp: op,
      entry,
    };
  }

  return {
    ok: true,
    set: {
      familyId: identity.familyId,
      authoredMemberId,
      authoredTrack,
      authored: authoredMember,
      symmetry,
      members: [authoredMember, symmetry.H, symmetry.V, symmetry.RPI],
    },
  };
}

export function existingLineageFromEntries(
  entries: Array<Pick<StrategyEntry, "memberId" | "authoringStrategyId" | "memberOrigin" | "symmetryOp">>
): ExistingFamilyMemberLineage[] {
  const out: ExistingFamilyMemberLineage[] = [];
  for (const entry of entries) {
    const identity = familySymmetryIdentity(entry);
    if (!identity || !entry.memberId) continue;
    out.push({
      identity,
      memberId: entry.memberId,
      ...(entry.authoringStrategyId
        ? { authoringStrategyId: entry.authoringStrategyId }
        : {}),
    });
  }
  return out;
}
