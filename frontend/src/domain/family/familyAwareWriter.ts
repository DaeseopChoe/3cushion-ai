/**
 * Family-aware PositionRecord writer.
 *
 * Does NOT use upsertPositionRecord. Exact coordinates are not Family identity.
 * Slot S1–S3 = max 3 strategies per Exact position, not Family / track / Member.
 *
 * Phase 3A-2:
 * - generic logical Family Member write plan
 * - compatibility StrategyEntry projection kept as a thin boundary
 * - 4-track writer remains a thin adapter over the generic writer
 */

import { ballsExactEqual } from "../cueEditSnap";
import { createPositionId } from "../positionId";
import type {
  Ball3,
  PositionRecord,
  StrategyEntry,
  TargetBall,
} from "../positionSearchEngine";
import {
  genericFamilyMemberIdentityKey,
  isDerivedMemberOrigin,
  readPersistedFamilyIdentity,
  resolveGenericFamilyMemberIdentity,
  validateFamilyProvenance,
} from "./familyIdentity";
import {
  FAMILY_MASTER_MIGRATION_DEBT,
  TEMPORARY_COMPATIBILITY_DUPLICATION,
} from "./familyMigrationDebt";
import {
  collectFamilySourceRefsFromDataset,
  sourceRefFromIdentityFields,
  validateDerivedSourceMember,
} from "./familyDerivedSource";
import { createFamilyPositionKey } from "./familyPositionKey";
import {
  existingLineageFromEntries,
  generateFourTrackMembers,
  type AuthoredFamilyMemberInput,
  type FourTrackMember,
  type FourTrackMemberSet,
  type GenerateFourTrackResult,
} from "./generateFourTrackMembers";
import { cloneBall3 } from "./trackSymmetry";

export type FamilyWriteOptions = {
  /** AUTHORED insert prefers this slot when empty or already ours. */
  preferredAuthoredSlot?: StrategyEntry["slot"];
};

const SLOTS: StrategyEntry["slot"][] = ["S1", "S2", "S3"];

function resolveInsertSlot(args: {
  isAuthored: boolean;
  destRecord: PositionRecord | undefined;
  available: StrategyEntry["slot"][];
  preferredAuthoredSlot?: StrategyEntry["slot"];
  familyId: string;
  identityKey: string;
}): { ok: true; slot: StrategyEntry["slot"] } | { ok: false } {
  const { isAuthored, destRecord, available, preferredAuthoredSlot, familyId, identityKey } = args;
  if (!destRecord) {
    return {
      ok: true,
      slot:
        isAuthored && preferredAuthoredSlot
          ? preferredAuthoredSlot
          : "S1",
    };
  }
  if (isAuthored && preferredAuthoredSlot) {
    const occupant = destRecord.strategies[preferredAuthoredSlot];
    if (!occupant) return { ok: true, slot: preferredAuthoredSlot };
    const occ = entryIdentity(occupant, destRecord.positionId);
    if (occ?.familyId === familyId && occ.identityKey === identityKey) {
      return { ok: true, slot: preferredAuthoredSlot };
    }
  }
  if (available[0]) return { ok: true, slot: available[0] };
  return { ok: false };
}

export type FamilyMemberLocation = {
  recordIndex: number;
  slot: StrategyEntry["slot"];
  entry: StrategyEntry;
  balls: Ball3;
  positionId: string;
  positionKey: string | null;
  identityKey: string | null;
};

export type FamilyWriteFailureCode =
  | "NOT_FAMILY_AWARE"
  | "INVALID_PROVENANCE"
  | "DUPLICATE_LOGICAL_IDENTITY"
  | "GENERATE_FAILED"
  | "SLOT_CAPACITY"
  | "CROSS_FAMILY_COLLISION";

export type FamilyCompatibilityPayload = Pick<
  StrategyEntry,
  | "signature"
  | "sysInputs"
  | "corrections"
  | "correctionsStored"
  | "ai"
  | "str"
  | "hpT"
>;

export type LogicalFamilyMemberCandidate = {
  familyId: string;
  memberId: string;
  memberOrigin: NonNullable<StrategyEntry["memberOrigin"]>;
  generatedFromMemberId?: string;
  symmetryOp?: StrategyEntry["symmetryOp"];
  derivedRule?: StrategyEntry["derivedRule"];
  derivedStep?: StrategyEntry["derivedStep"];
  authoringStrategyId?: string;
  track: string;
  balls: Ball3;
  targetBall?: TargetBall;
  meta?: StrategyEntry["meta"];
  compatibility: FamilyCompatibilityPayload;
  /** C3+ reconstruction input — COPY from source (Cue→Impact omits). */
  trajectoryExtensions?: StrategyEntry["trajectoryExtensions"];
  reflectionOverride?: StrategyEntry["reflectionOverride"];
};

export type FamilyMemberCandidateSet = {
  familyId: string;
  members: LogicalFamilyMemberCandidate[];
};

export type FamilyMemberWritePlan = {
  identityKey: string;
  memberId: string;
  action: "insert" | "replace";
  slot: StrategyEntry["slot"];
  destPositionId: string;
  positionKey: string | null;
  removeFrom?: { recordIndex: number; slot: StrategyEntry["slot"] };
};

export type GenericFamilyWritePreflight =
  | { ok: true; plans: FamilyMemberWritePlan[]; set: FamilyMemberCandidateSet }
  | {
      ok: false;
      code: FamilyWriteFailureCode;
      reason: string;
      set?: FamilyMemberCandidateSet;
    };

export type GenericFamilyWriteResult =
  | {
      ok: true;
      dataset: PositionRecord[];
      set: FamilyMemberCandidateSet;
      plans: FamilyMemberWritePlan[];
    }
  | {
      ok: false;
      code: FamilyWriteFailureCode;
      reason: string;
      dataset: PositionRecord[];
      set?: FamilyMemberCandidateSet;
    };

export type FamilyWritePreflight =
  | { ok: true; plans: FamilyMemberWritePlan[]; set: FourTrackMemberSet }
  | {
      ok: false;
      code: FamilyWriteFailureCode;
      reason: string;
      set?: FourTrackMemberSet;
    };

export type FamilyWriteResult =
  | {
      ok: true;
      dataset: PositionRecord[];
      set: FourTrackMemberSet;
      plans: FamilyMemberWritePlan[];
    }
  | {
      ok: false;
      code: FamilyWriteFailureCode;
      reason: string;
      dataset: PositionRecord[];
      set?: FourTrackMemberSet;
    };

function cloneRecord(record: PositionRecord): PositionRecord {
  return {
    ...record,
    balls: cloneBall3(record.balls),
    strategies: { ...record.strategies },
  };
}

function cloneDataset(dataset: PositionRecord[]): PositionRecord[] {
  return dataset.map(cloneRecord);
}

function occupiedSlots(record: PositionRecord | undefined): StrategyEntry["slot"][] {
  if (!record) return [];
  return SLOTS.filter((slot) => record.strategies[slot] != null);
}

function emptySlots(record: PositionRecord | undefined): StrategyEntry["slot"][] {
  if (!record) return [...SLOTS];
  return SLOTS.filter((slot) => record.strategies[slot] == null);
}

function entryIdentity(
  entry: StrategyEntry,
  positionId: string
): { familyId: string; identityKey: string } | null {
  const family = readPersistedFamilyIdentity(entry, {
    authoringStrategyId: entry.authoringStrategyId,
    positionId,
  });
  if (!family?.familyId) return null;
  const identityKey = genericFamilyMemberIdentityKey(
    resolveGenericFamilyMemberIdentity(entry, {
      authoringStrategyId: entry.authoringStrategyId,
      positionId,
    })
  );
  if (!identityKey) return null;
  return { familyId: family.familyId, identityKey };
}

export function listFamilyMemberLocations(
  dataset: PositionRecord[],
  familyId: string
): FamilyMemberLocation[] {
  const out: FamilyMemberLocation[] = [];
  dataset.forEach((record, recordIndex) => {
    for (const slot of SLOTS) {
      const entry = record.strategies[slot];
      if (!entry) continue;
      const family = readPersistedFamilyIdentity(entry, {
        authoringStrategyId: entry.authoringStrategyId,
        positionId: record.positionId,
      });
      if (family?.familyId !== familyId) continue;
      out.push({
        recordIndex,
        slot,
        entry,
        balls: record.balls,
        positionId: record.positionId,
        positionKey: createFamilyPositionKey(entry.track ?? "", record.balls),
        identityKey: genericFamilyMemberIdentityKey(
          resolveGenericFamilyMemberIdentity(entry, {
            authoringStrategyId: entry.authoringStrategyId,
            positionId: record.positionId,
          })
        ),
      });
    }
  });
  return out;
}

function findRecordIndexByBalls(
  dataset: PositionRecord[],
  balls: Ball3
): number {
  return dataset.findIndex((record) => ballsExactEqual(record.balls, balls));
}

function withSlot(entry: StrategyEntry, slot: StrategyEntry["slot"]): StrategyEntry {
  return { ...entry, slot };
}

function withTargetBall(
  record: PositionRecord,
  targetBall: TargetBall | undefined,
  fallback: PositionRecord | undefined
): PositionRecord {
  if (targetBall === "yellow" || targetBall === "red") {
    return { ...record, targetBall };
  }
  if (fallback?.targetBall === "yellow" || fallback?.targetBall === "red") {
    return { ...record, targetBall: fallback.targetBall };
  }
  return record;
}

function dropEmptyRecords(dataset: PositionRecord[]): PositionRecord[] {
  return dataset.filter((record) => occupiedSlots(record).length > 0);
}

function cloneJson<T>(value: T): T {
  if (value == null || typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

export function extractTemporaryCompatibilityPayload(
  source: StrategyEntry
): FamilyCompatibilityPayload {
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

export function familyWriteCandidateFromEntry(args: {
  balls: Ball3;
  targetBall?: TargetBall;
  entry: StrategyEntry;
}): LogicalFamilyMemberCandidate | null {
  const identity = readPersistedFamilyIdentity(args.entry, {
    authoringStrategyId: args.entry.authoringStrategyId,
    positionId: createPositionId(args.balls),
  });
  if (!identity?.familyId || !identity.memberId || !identity.memberOrigin) return null;
  const provenance = validateFamilyProvenance(identity);
  if (!provenance.ok) return null;
  const track = typeof args.entry.track === "string" ? args.entry.track.trim() : "";
  if (!track) return null;
  return {
    familyId: identity.familyId,
    memberId: identity.memberId,
    memberOrigin: identity.memberOrigin,
    ...(identity.generatedFromMemberId
      ? { generatedFromMemberId: identity.generatedFromMemberId }
      : {}),
    ...(identity.symmetryOp ? { symmetryOp: identity.symmetryOp } : {}),
    ...(identity.derivedRule ? { derivedRule: identity.derivedRule } : {}),
    ...(identity.derivedStep ? { derivedStep: identity.derivedStep } : {}),
    ...(args.entry.authoringStrategyId ? { authoringStrategyId: args.entry.authoringStrategyId } : {}),
    track,
    balls: cloneBall3(args.balls),
    ...(args.targetBall === "yellow" || args.targetBall === "red"
      ? { targetBall: args.targetBall }
      : {}),
    ...(args.entry.meta ? { meta: cloneJson(args.entry.meta) } : {}),
    compatibility: extractTemporaryCompatibilityPayload(args.entry),
  };
}

export function projectFamilyMemberToCompatibilityEntry(
  member: LogicalFamilyMemberCandidate,
  slot: StrategyEntry["slot"]
): StrategyEntry {
  const compatibility: FamilyCompatibilityPayload = {
    signature: cloneJson(member.compatibility.signature),
    sysInputs: { ...(member.compatibility.sysInputs ?? {}) },
    ...(member.compatibility.corrections
      ? { corrections: cloneJson(member.compatibility.corrections) }
      : {}),
    ...(member.compatibility.correctionsStored != null
      ? { correctionsStored: member.compatibility.correctionsStored }
      : {}),
    ...(member.compatibility.ai !== undefined
      ? { ai: cloneJson(member.compatibility.ai) }
      : {}),
    ...(member.compatibility.str !== undefined
      ? { str: cloneJson(member.compatibility.str) }
      : {}),
    ...(member.compatibility.hpT !== undefined
      ? { hpT: cloneJson(member.compatibility.hpT) }
      : {}),
  };
  return {
    slot,
    ...compatibility,
    ...(member.authoringStrategyId ? { authoringStrategyId: member.authoringStrategyId } : {}),
    track: member.track,
    familyId: member.familyId,
    memberId: member.memberId,
    memberOrigin: member.memberOrigin,
    ...(member.generatedFromMemberId
      ? { generatedFromMemberId: member.generatedFromMemberId }
      : {}),
    ...(member.symmetryOp ? { symmetryOp: member.symmetryOp } : {}),
    ...(member.derivedRule ? { derivedRule: member.derivedRule } : {}),
    ...(member.derivedStep ? { derivedStep: member.derivedStep } : {}),
    ...(member.meta ? { meta: cloneJson(member.meta) } : {}),
    ...(member.trajectoryExtensions
      ? { trajectoryExtensions: cloneJson(member.trajectoryExtensions) }
      : {}),
    ...(member.reflectionOverride
      ? { reflectionOverride: cloneJson(member.reflectionOverride) }
      : {}),
  };
}

function candidateIdentityKey(member: LogicalFamilyMemberCandidate): string | null {
  return genericFamilyMemberIdentityKey(
    resolveGenericFamilyMemberIdentity({
      familyId: member.familyId,
      memberId: member.memberId,
      memberOrigin: member.memberOrigin,
      generatedFromMemberId: member.generatedFromMemberId,
      symmetryOp: member.symmetryOp,
      derivedRule: member.derivedRule,
      derivedStep: member.derivedStep,
      authoringStrategyId: member.authoringStrategyId,
    })
  );
}

function validateCandidateSet(
  set: FamilyMemberCandidateSet,
  dataset: PositionRecord[]
): { ok: true } | {
  ok: false;
  code: FamilyWriteFailureCode;
  reason: string;
} {
  const seen = new Set<string>();
  const byMemberId = new Map(set.members.map((member) => [member.memberId, member]));
  const sourceRefs = [
    ...collectFamilySourceRefsFromDataset(dataset, set.familyId),
    ...set.members
      .map((member) =>
        sourceRefFromIdentityFields({
          familyId: member.familyId,
          memberId: member.memberId,
          memberOrigin: member.memberOrigin,
          track: member.track,
        })
      )
      .filter((row): row is NonNullable<typeof row> => row != null),
  ];

  for (const member of set.members) {
    if (member.familyId !== set.familyId) {
      return {
        ok: false,
        code: "INVALID_PROVENANCE",
        reason: `candidate ${member.memberId} does not belong to family ${set.familyId}`,
      };
    }
    const provenance = validateFamilyProvenance(member);
    if (!provenance.ok) {
      return { ok: false, code: "INVALID_PROVENANCE", reason: provenance.reason };
    }
    if (typeof member.track !== "string" || !member.track.trim()) {
      return {
        ok: false,
        code: "INVALID_PROVENANCE",
        reason: `candidate ${member.memberId} is missing track`,
      };
    }
    const identityKey = candidateIdentityKey(member);
    if (!identityKey) {
      return {
        ok: false,
        code: "INVALID_PROVENANCE",
        reason: `candidate ${member.memberId} has unresolved logical identity`,
      };
    }
    if (seen.has(identityKey)) {
      return {
        ok: false,
        code: "DUPLICATE_LOGICAL_IDENTITY",
        reason: `duplicate logical identity ${identityKey}`,
      };
    }
    seen.add(identityKey);

    if (isDerivedMemberOrigin(member.memberOrigin)) {
      const sourceCheck = validateDerivedSourceMember({
        derived: member,
        sources: sourceRefs,
      });
      if (!sourceCheck.ok) {
        return { ok: false, code: "INVALID_PROVENANCE", reason: sourceCheck.reason };
      }
      const sameSetSource = member.generatedFromMemberId
        ? byMemberId.get(member.generatedFromMemberId)
        : undefined;
      if (sameSetSource && isDerivedMemberOrigin(sameSetSource.memberOrigin)) {
        return {
          ok: false,
          code: "INVALID_PROVENANCE",
          reason: `derived member ${member.memberId} cannot source another derived member`,
        };
      }
    }
  }

  return { ok: true };
}

export function preflightFamilyMemberWrite(
  dataset: PositionRecord[],
  set: FamilyMemberCandidateSet,
  options?: FamilyWriteOptions
): GenericFamilyWritePreflight {
  const setValidation = validateCandidateSet(set, dataset);
  if (!setValidation.ok) {
    return { ok: false, code: setValidation.code, reason: setValidation.reason, set };
  }

  const existingLocs = listFamilyMemberLocations(dataset, set.familyId);
  const existingByIdentity = new Map<string, FamilyMemberLocation[]>();
  for (const loc of existingLocs) {
    if (!loc.identityKey) continue;
    const list = existingByIdentity.get(loc.identityKey) ?? [];
    list.push(loc);
    existingByIdentity.set(loc.identityKey, list);
  }

  const working = cloneDataset(dataset);
  const plans: FamilyMemberWritePlan[] = [];

  for (const member of set.members) {
    const identityKey = candidateIdentityKey(member);
    if (!identityKey) {
      return {
        ok: false,
        code: "INVALID_PROVENANCE",
        reason: `candidate ${member.memberId} has unresolved logical identity`,
        set,
      };
    }
    const positionKey = createFamilyPositionKey(member.track, member.balls);
    const existingList = existingByIdentity.get(identityKey) ?? [];
    const keep = existingList[0];
    const extras = existingList.slice(1);

    for (const extra of extras) {
      delete working[extra.recordIndex].strategies[extra.slot];
    }

    const destIndex = findRecordIndexByBalls(working, member.balls);
    const dest = destIndex >= 0 ? working[destIndex] : undefined;

    if (keep && destIndex === keep.recordIndex && ballsExactEqual(keep.balls, member.balls)) {
      plans.push({
        identityKey,
        memberId: member.memberId,
        action: "replace",
        slot: keep.slot,
        destPositionId: createPositionId(member.balls),
        positionKey,
      });
      working[keep.recordIndex].strategies[keep.slot] = projectFamilyMemberToCompatibilityEntry(
        member,
        keep.slot
      );
      continue;
    }

    if (keep) {
      delete working[keep.recordIndex].strategies[keep.slot];
    }

    const destAfter = findRecordIndexByBalls(working, member.balls);
    const destRecord = destAfter >= 0 ? working[destAfter] : dest;
    const available = emptySlots(destRecord);
    const picked = resolveInsertSlot({
      isAuthored: member.memberOrigin === "AUTHORED",
      destRecord,
      available,
      preferredAuthoredSlot: options?.preferredAuthoredSlot,
      familyId: set.familyId,
      identityKey,
    });
    if (!picked.ok) {
      return {
        ok: false,
        code: "SLOT_CAPACITY",
        reason: `Exact position ${createPositionId(member.balls)} has no free slot for family ${set.familyId} (${identityKey})`,
        set,
      };
    }

    const slot = picked.slot;
    plans.push({
      identityKey,
      memberId: member.memberId,
      action: keep ? "replace" : "insert",
      slot,
      destPositionId: createPositionId(member.balls),
      positionKey,
      ...(keep ? { removeFrom: { recordIndex: keep.recordIndex, slot: keep.slot } } : {}),
    });

    const placed = projectFamilyMemberToCompatibilityEntry(member, slot);
    if (destAfter >= 0) {
      working[destAfter].strategies[slot] = placed;
    } else if (destIndex >= 0) {
      working[destIndex].strategies[slot] = placed;
    } else {
      working.push({
        positionId: createPositionId(member.balls),
        balls: cloneBall3(member.balls),
        strategies: { [slot]: placed },
        schemaVersion: 1,
      });
    }
  }

  return { ok: true, plans, set };
}

export function preflightFourTrackFamilyWrite(
  dataset: PositionRecord[],
  authored: AuthoredFamilyMemberInput,
  options?: FamilyWriteOptions
): FamilyWritePreflight {
  const existingLocs = (() => {
    const identity = readPersistedFamilyIdentity(authored.entry, {
      authoringStrategyId: authored.entry.authoringStrategyId,
      positionId: createPositionId(authored.balls),
    });
    if (!identity?.familyId) {
      return null;
    }
    return listFamilyMemberLocations(dataset, identity.familyId);
  })();

  if (existingLocs === null) {
    return {
      ok: false,
      code: "NOT_FAMILY_AWARE",
      reason: "authored member is not Family-aware",
    };
  }

  const generated: GenerateFourTrackResult = generateFourTrackMembers(authored, {
    existingMembers: existingLineageFromEntries(existingLocs.map((row) => row.entry)),
  });
  if (!generated.ok) {
    return { ok: false, code: "GENERATE_FAILED", reason: generated.reason };
  }

  return preflightGeneratedSet(dataset, generated.set, options);
}

export function preflightGeneratedSet(
  dataset: PositionRecord[],
  set: FourTrackMemberSet,
  options?: FamilyWriteOptions
): FamilyWritePreflight {
  const candidateSet: FamilyMemberCandidateSet = {
    familyId: set.familyId,
    members: set.members
      .map((member) =>
        familyWriteCandidateFromEntry({
          balls: member.balls,
          targetBall: member.targetBall,
          entry: member.entry,
        })
      )
      .filter((member): member is LogicalFamilyMemberCandidate => member != null),
  };
  const preflight = preflightFamilyMemberWrite(dataset, candidateSet, options);
  if (!preflight.ok) {
    return { ok: false, code: preflight.code, reason: preflight.reason, set };
  }
  return { ok: true, plans: preflight.plans, set };
}

function applyPlans(
  dataset: PositionRecord[],
  set: FamilyMemberCandidateSet,
  plans: FamilyMemberWritePlan[]
): PositionRecord[] {
  let working = cloneDataset(dataset);
  const byIdentity = new Map(
    set.members
      .map((member) => {
        const identityKey = candidateIdentityKey(member);
        return identityKey ? [identityKey, member] : null;
      })
      .filter(
        (row): row is [string, LogicalFamilyMemberCandidate] => Array.isArray(row)
      )
  );

  for (const plan of plans) {
    const member = byIdentity.get(plan.identityKey);
    if (!member) continue;

    const existingLocs = listFamilyMemberLocations(working, set.familyId).filter(
      (loc) => loc.identityKey === plan.identityKey
    );
    for (const loc of existingLocs) {
      delete working[loc.recordIndex].strategies[loc.slot];
    }
    working = dropEmptyRecords(working);

    const destIndex = findRecordIndexByBalls(working, member.balls);
    const placed = projectFamilyMemberToCompatibilityEntry(member, plan.slot);
    if (destIndex >= 0) {
      const dest = working[destIndex];
      if (dest.strategies[plan.slot]) {
        const occupant = dest.strategies[plan.slot];
        const occ = occupant
          ? entryIdentity(occupant, dest.positionId)
          : null;
        if (occ && occ.familyId !== set.familyId) {
          throw new Error("family-aware writer refused to overwrite another Family");
        }
      }
      dest.strategies[plan.slot] = placed;
      working[destIndex] = withTargetBall(dest, member.targetBall, dest);
    } else {
      working.push(
        withTargetBall(
          {
            positionId: createPositionId(member.balls),
            balls: cloneBall3(member.balls),
            strategies: { [plan.slot]: placed },
            schemaVersion: 1,
          },
          member.targetBall,
          undefined
        )
      );
    }
  }

  return dropEmptyRecords(working);
}

export function writeFamilyMembers(
  dataset: PositionRecord[],
  set: FamilyMemberCandidateSet,
  options?: FamilyWriteOptions
): GenericFamilyWriteResult {
  const base = Array.isArray(dataset) ? dataset : [];
  const preflight = preflightFamilyMemberWrite(base, set, options);
  if (!preflight.ok) {
    return {
      ok: false,
      code: preflight.code,
      reason: preflight.reason,
      dataset: base,
      ...(preflight.set ? { set: preflight.set } : {}),
    };
  }
  try {
    const next = applyPlans(base, preflight.set, preflight.plans);
    return {
      ok: true,
      dataset: next,
      set: preflight.set,
      plans: preflight.plans,
    };
  } catch {
    return {
      ok: false,
      code: "CROSS_FAMILY_COLLISION",
      reason: "refused to overwrite an unrelated Family",
      dataset: base,
      set: preflight.set,
    };
  }
}

export function writeFourTrackFamilyMembers(
  dataset: PositionRecord[],
  authored: AuthoredFamilyMemberInput,
  options?: FamilyWriteOptions
): FamilyWriteResult {
  const base = Array.isArray(dataset) ? dataset : [];
  const preflight = preflightFourTrackFamilyWrite(base, authored, options);
  if (!preflight.ok) {
    return {
      ok: false,
      code: preflight.code,
      reason: preflight.reason,
      dataset: base,
      ...(preflight.set ? { set: preflight.set } : {}),
    };
  }
  try {
    const genericSet: FamilyMemberCandidateSet = {
      familyId: preflight.set.familyId,
      members: preflight.set.members
        .map((member) =>
          familyWriteCandidateFromEntry({
            balls: member.balls,
            targetBall: member.targetBall,
            entry: member.entry,
          })
        )
        .filter((member): member is LogicalFamilyMemberCandidate => member != null),
    };
    const next = applyPlans(base, genericSet, preflight.plans);
    return {
      ok: true,
      dataset: next,
      set: preflight.set,
      plans: preflight.plans,
    };
  } catch {
    return {
      ok: false,
      code: "CROSS_FAMILY_COLLISION",
      reason: "refused to overwrite an unrelated Family",
      dataset: base,
      set: preflight.set,
    };
  }
}

export function reconstructFamilyMembers(
  dataset: PositionRecord[],
  familyId: string
): FamilyMemberLocation[] {
  return listFamilyMemberLocations(dataset, familyId);
}
