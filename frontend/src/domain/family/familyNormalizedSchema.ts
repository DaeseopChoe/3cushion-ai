/**
 * Phase 3A-321 Phase A — Normalized FamilyMaster / FamilyMember physical schemas.
 *
 * Shadow stores (`family_masters` / `family_members`) are dual-written from
 * positions_dataset (SAVE / Approval / Import). WRITE SSOT remains positions_dataset.
 * Phase 3A-349: gated production READ may use rematerialized projection when eligible.
 * StrategyEntry common-payload duplication remains TEMPORARY_COMPATIBILITY_DUPLICATION.
 * SearchIndex is not required for normalized READ.
 */

import type {
  Ball3,
  StrategyEntry,
  StrategySignature,
  StrategySysCorrections,
  TargetBall,
} from "../positionSearchEngine";
import type {
  DerivedRule,
  DerivedStep,
  MemberOrigin,
  SymmetryOp,
} from "./familyIdentity";

/**
 * Envelope + row schema version for family_masters / family_members.
 * v2 (Phase 3A-345): FamilyMember.sourceSlot required for Exact-ball rematerialization.
 */
export const FAMILY_NORMALIZED_SCHEMA_VERSION = 2;

export const FAMILY_MASTERS_STORAGE_KEY = "family_masters";
export const FAMILY_MEMBERS_STORAGE_KEY = "family_members";

/**
 * Family-common writable fields — authoritative owner is FamilyMaster only.
 * Must not be persisted as Member long-term SSOT.
 */
export const FAMILY_MASTER_COMMON_FIELD_KEYS = [
  "signature",
  "sysInputs",
  "corrections",
  "correctionsStored",
  "ai",
  "str",
  "hpT",
] as const;

export type FamilyMasterCommonFieldKey =
  (typeof FAMILY_MASTER_COMMON_FIELD_KEYS)[number];

/**
 * Canonical FamilyMaster — one row per familyId.
 * hpT is AUTHORED canonical only (no handedness mirror copies).
 */
export type FamilyMaster = {
  schemaVersion: number;
  familyId: string;
  signature: StrategySignature;
  sysInputs: Record<string, number>;
  corrections?: StrategySysCorrections;
  correctionsStored?: boolean;
  ai?: unknown;
  str?: unknown;
  /** Canonical AUTHORED hpT snapshot — resolvers mirror at runtime. */
  hpT?: unknown;
};

/** Slot key on PositionRecord.strategies — packing provenance only (not UI activeSlot). */
export type FamilySourceSlot = StrategyEntry["slot"];

/**
 * FamilyMember delta — one row per memberId.
 * Owns balls + track + provenance + packing provenance (sourceSlot).
 * No family-common writable payload.
 */
export type FamilyMember = {
  schemaVersion: number;
  memberId: string;
  familyId: string;
  balls: Ball3;
  targetBall?: TargetBall;
  track: string;
  memberOrigin: MemberOrigin;
  /**
   * Phase 3A-345 — which PositionRecord.strategies slot this member occupied
   * on positions_dataset at dual-write time. Required for invertible rematerialize.
   * Not UI activeSlot; not inferred from memberOrigin/order.
   */
  sourceSlot: FamilySourceSlot;
  generatedFromMemberId?: string;
  symmetryOp?: SymmetryOp;
  derivedRule?: DerivedRule;
  derivedStep?: DerivedStep;
  reflectionOverride?: StrategyEntry["reflectionOverride"];
  trajectoryExtensions?: StrategyEntry["trajectoryExtensions"];
  authoringStrategyId?: string;
};

export function isFamilySourceSlot(value: unknown): value is FamilySourceSlot {
  return value === "S1" || value === "S2" || value === "S3";
}

export type FamilyMastersEnvelope = {
  schemaVersion: number;
  /** Shared with positions_dataset_meta + family_members when shadow is fresh. */
  corpusGeneration?: number;
  masters: Record<string, FamilyMaster>;
};

export type FamilyMembersEnvelope = {
  schemaVersion: number;
  /** Shared with positions_dataset_meta + family_masters when shadow is fresh. */
  corpusGeneration?: number;
  members: Record<string, FamilyMember>;
};

export function emptyFamilyMastersEnvelope(): FamilyMastersEnvelope {
  return {
    schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
    masters: {},
  };
}

export function emptyFamilyMembersEnvelope(): FamilyMembersEnvelope {
  return {
    schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
    members: {},
  };
}

/** True when a Member-shaped object still carries forbidden common keys. */
export function memberHasForbiddenCommonPayload(
  member: Record<string, unknown> | null | undefined
): boolean {
  if (!member || typeof member !== "object") return false;
  return FAMILY_MASTER_COMMON_FIELD_KEYS.some((key) =>
    Object.prototype.hasOwnProperty.call(member, key)
  );
}
