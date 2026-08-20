/**
 * Phase 3A-321 Phase A — Normalized FamilyMaster / FamilyMember physical schemas.
 *
 * These types are the writable SSOT shape for the new stores.
 * They are NOT yet wired into SAVE / Approval / Search (feature flag off).
 * StrategyEntry common-payload duplication remains TEMPORARY_COMPATIBILITY_DUPLICATION
 * until later phases activate dual-write and strip member copies.
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

/** Envelope + row schema version for family_masters / family_members. */
export const FAMILY_NORMALIZED_SCHEMA_VERSION = 1;

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

/**
 * FamilyMember delta — one row per memberId.
 * Owns balls + track + provenance only (no family-common writable payload).
 */
export type FamilyMember = {
  schemaVersion: number;
  memberId: string;
  familyId: string;
  balls: Ball3;
  targetBall?: TargetBall;
  track: string;
  memberOrigin: MemberOrigin;
  generatedFromMemberId?: string;
  symmetryOp?: SymmetryOp;
  derivedRule?: DerivedRule;
  derivedStep?: DerivedStep;
  reflectionOverride?: StrategyEntry["reflectionOverride"];
  trajectoryExtensions?: StrategyEntry["trajectoryExtensions"];
  authoringStrategyId?: string;
};

export type FamilyMastersEnvelope = {
  schemaVersion: number;
  masters: Record<string, FamilyMaster>;
};

export type FamilyMembersEnvelope = {
  schemaVersion: number;
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
