/**
 * Phase 3A-321 Phase A — hydrate / split boundary between
 * FamilyMaster+FamilyMember and PositionRecord/StrategyEntry compatibility views.
 *
 * Does not change SAVE, Approval, Search, or History call sites.
 * Geometry / HPT resolvers are not invoked here — canonical hpT stays on Master;
 * mirrored runtime HPT remains the existing resolver responsibility at UI hydrate.
 */

import { createPositionId } from "../positionId";
import type {
  PositionRecord,
  StrategyEntry,
  StrategyMeta,
} from "../positionSearchEngine";
import {
  readPersistedFamilyIdentity,
  validateFamilyProvenance,
} from "./familyIdentity";
import type { FamilyMaster, FamilyMember } from "./familyNormalizedSchema";
import { FAMILY_NORMALIZED_SCHEMA_VERSION } from "./familyNormalizedSchema";

export type HydrateFamilyMemberOptions = {
  /** Compatibility slot for StrategyEntry (not Family identity). Default S1. */
  slot?: StrategyEntry["slot"];
  /**
   * Optional meta for consumers that require StrategyEntry.meta.
   * When omitted, a deterministic placeholder is built from balls
   * (not a geometry recompute).
   */
  meta?: StrategyMeta;
  positionId?: string;
  schemaVersion?: number;
};

export type SplitFamilyPartsResult =
  | {
      ok: true;
      master: FamilyMaster;
      member: FamilyMember;
      slot: StrategyEntry["slot"];
    }
  | { ok: false; reason: string };

function cloneJson<T>(value: T): T {
  if (value == null || typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function placeholderMeta(balls: FamilyMember["balls"]): StrategyMeta {
  return {
    impact: { x: balls.cue.x, y: balls.cue.y },
    final: { x: balls.second.x, y: balls.second.y },
    angle_ci: 0,
    angle_fs: 0,
  };
}

/**
 * FamilyMaster + FamilyMember → PositionRecord-compatible runtime view.
 * Injects Master common payload onto StrategyEntry for existing consumers.
 */
export function hydrateFamilyMemberToPositionRecord(
  master: FamilyMaster,
  member: FamilyMember,
  options?: HydrateFamilyMemberOptions
): PositionRecord {
  if (master.familyId !== member.familyId) {
    throw new Error(
      `hydrate familyId mismatch: master ${master.familyId} vs member ${member.familyId}`
    );
  }
  const slot = options?.slot ?? member.sourceSlot;
  if (slot !== "S1" && slot !== "S2" && slot !== "S3") {
    throw new Error(
      `hydrate missing sourceSlot for member ${member.memberId} (pass options.slot or persist sourceSlot)`
    );
  }
  const balls = {
    cue: { x: member.balls.cue.x, y: member.balls.cue.y },
    target: { x: member.balls.target.x, y: member.balls.target.y },
    second: { x: member.balls.second.x, y: member.balls.second.y },
  };
  const positionId = options?.positionId ?? createPositionId(balls);

  const entry: StrategyEntry = {
    slot,
    signature: cloneJson(master.signature),
    track: member.track,
    sysInputs: { ...master.sysInputs },
    meta: options?.meta ? cloneJson(options.meta) : placeholderMeta(balls),
    familyId: member.familyId,
    memberId: member.memberId,
    memberOrigin: member.memberOrigin,
  };
  if (master.corrections) entry.corrections = cloneJson(master.corrections);
  if (master.correctionsStored != null) {
    entry.correctionsStored = master.correctionsStored;
  }
  if (master.ai !== undefined) entry.ai = cloneJson(master.ai);
  if (master.str !== undefined) entry.str = cloneJson(master.str);
  if (master.hpT !== undefined) entry.hpT = cloneJson(master.hpT);
  if (member.generatedFromMemberId) {
    entry.generatedFromMemberId = member.generatedFromMemberId;
  }
  if (member.symmetryOp) entry.symmetryOp = member.symmetryOp;
  if (member.derivedRule) entry.derivedRule = member.derivedRule;
  if (member.derivedStep) entry.derivedStep = member.derivedStep;
  if (member.authoringStrategyId) {
    entry.authoringStrategyId = member.authoringStrategyId;
  }
  if (member.reflectionOverride) {
    entry.reflectionOverride = cloneJson(member.reflectionOverride);
  }
  if (member.trajectoryExtensions) {
    entry.trajectoryExtensions = cloneJson(member.trajectoryExtensions);
  }

  const record: PositionRecord = {
    positionId,
    balls,
    strategies: { [slot]: entry },
    schemaVersion: options?.schemaVersion ?? 2,
  };
  if (member.targetBall === "yellow" || member.targetBall === "red") {
    record.targetBall = member.targetBall;
  }
  return record;
}

/**
 * PositionRecord + slot → FamilyMaster candidate + FamilyMember delta.
 * Does not merge unrelated families; requires validated persisted identity.
 */
export function splitPositionRecordToFamilyParts(
  record: PositionRecord,
  slot: StrategyEntry["slot"] = "S1"
): SplitFamilyPartsResult {
  const entry = record.strategies?.[slot];
  if (!entry) {
    return { ok: false, reason: `no StrategyEntry at slot ${slot}` };
  }
  const identity = readPersistedFamilyIdentity(entry, {
    authoringStrategyId: entry.authoringStrategyId,
    positionId: record.positionId,
  });
  if (!identity?.familyId || !identity.memberId || !identity.memberOrigin) {
    return {
      ok: false,
      reason: "missing validated Family identity on StrategyEntry",
    };
  }
  const provenance = validateFamilyProvenance(identity);
  if (!provenance.ok) {
    return { ok: false, reason: provenance.reason };
  }
  if (!entry.signature || typeof entry.signature !== "object") {
    return { ok: false, reason: "StrategyEntry.signature required for Master" };
  }
  if (!entry.sysInputs || typeof entry.sysInputs !== "object") {
    return { ok: false, reason: "StrategyEntry.sysInputs required for Master" };
  }
  if (!record.balls?.cue || !record.balls?.target || !record.balls?.second) {
    return { ok: false, reason: "PositionRecord.balls incomplete" };
  }
  const track = typeof entry.track === "string" ? entry.track.trim() : "";
  if (!track) {
    return { ok: false, reason: "StrategyEntry.track required for Member" };
  }

  const master: FamilyMaster = {
    schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
    familyId: identity.familyId,
    signature: cloneJson(entry.signature),
    sysInputs: { ...entry.sysInputs },
  };
  if (entry.corrections) master.corrections = cloneJson(entry.corrections);
  if (entry.correctionsStored != null) {
    master.correctionsStored = entry.correctionsStored;
  }
  if (entry.ai !== undefined) master.ai = cloneJson(entry.ai);
  if (entry.str !== undefined) master.str = cloneJson(entry.str);
  if (entry.hpT !== undefined) master.hpT = cloneJson(entry.hpT);

  const member: FamilyMember = {
    schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
    memberId: identity.memberId,
    familyId: identity.familyId,
    balls: {
      cue: { x: record.balls.cue.x, y: record.balls.cue.y },
      target: { x: record.balls.target.x, y: record.balls.target.y },
      second: { x: record.balls.second.x, y: record.balls.second.y },
    },
    track,
    memberOrigin: identity.memberOrigin,
    /** Packing provenance: Exact-ball rematerialize restores strategies[sourceSlot]. */
    sourceSlot: slot,
  };
  if (record.targetBall === "yellow" || record.targetBall === "red") {
    member.targetBall = record.targetBall;
  }
  if (identity.generatedFromMemberId) {
    member.generatedFromMemberId = identity.generatedFromMemberId;
  }
  if (identity.symmetryOp) member.symmetryOp = identity.symmetryOp;
  if (identity.derivedRule) member.derivedRule = identity.derivedRule;
  if (identity.derivedStep) member.derivedStep = identity.derivedStep;
  if (entry.authoringStrategyId && entry.authoringStrategyId.trim()) {
    member.authoringStrategyId = entry.authoringStrategyId.trim();
  }
  if (entry.reflectionOverride) {
    member.reflectionOverride = cloneJson(entry.reflectionOverride);
  }
  if (entry.trajectoryExtensions) {
    member.trajectoryExtensions = cloneJson(entry.trajectoryExtensions);
  }

  return { ok: true, master, member, slot };
}

/**
 * Meaningful round-trip comparison payload (excludes regenerable StrategyMeta).
 */
export function familyCompatibilityFingerprint(record: PositionRecord, slot: StrategyEntry["slot"]) {
  const entry = record.strategies[slot];
  if (!entry) return null;
  return {
    positionId: record.positionId,
    balls: record.balls,
    targetBall: record.targetBall ?? null,
    familyId: entry.familyId,
    memberId: entry.memberId,
    memberOrigin: entry.memberOrigin,
    generatedFromMemberId: entry.generatedFromMemberId,
    symmetryOp: entry.symmetryOp,
    derivedRule: entry.derivedRule,
    derivedStep: entry.derivedStep,
    track: entry.track,
    authoringStrategyId: entry.authoringStrategyId,
    signature: entry.signature,
    sysInputs: entry.sysInputs,
    corrections: entry.corrections,
    correctionsStored: entry.correctionsStored,
    ai: entry.ai,
    str: entry.str,
    hpT: entry.hpT,
    reflectionOverride: entry.reflectionOverride,
    trajectoryExtensions: entry.trajectoryExtensions,
  };
}
