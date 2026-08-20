/**
 * Phase 3A-323 Phase B1–B4 — pure legacy PositionRecord[] → FamilyMaster/Member migration.
 *
 * Does NOT write localStorage.
 * Does NOT read workspace_history.
 * Does NOT wire App / SAVE / Approval / Search.
 * Feature flag remains OFF elsewhere — this module is infrastructure only.
 */

import type { PositionRecord, StrategyEntry } from "../positionSearchEngine";
import {
  genericFamilyMemberIdentityKey,
  readPersistedFamilyIdentity,
  resolveGenericFamilyMemberIdentity,
  validateFamilyProvenance,
  type FamilyIdentityFields,
} from "./familyIdentity";
import { splitPositionRecordToFamilyParts } from "./familyHydrate";
import {
  FAMILY_MASTER_COMMON_FIELD_KEYS,
  FAMILY_NORMALIZED_SCHEMA_VERSION,
  memberHasForbiddenCommonPayload,
  type FamilyMaster,
  type FamilyMember,
} from "./familyNormalizedSchema";
import { normalizeFamilyMaster, normalizeFamilyMember } from "./familyNormalizedStore";

const SLOTS: StrategyEntry["slot"][] = ["S1", "S2", "S3"];

export type FamilyMigrationIssueCode =
  | "NO_AUTHORED_SEED"
  | "MULTIPLE_AUTHORED_SEEDS"
  | "COMMON_PAYLOAD_CONFLICT"
  | "DUPLICATE_MEMBER_ID"
  | "LOGICAL_IDENTITY_COLLISION"
  | "MEMBER_PAYLOAD_CONFLICT"
  | "INVALID_IDENTITY"
  | "INVALID_PROVENANCE"
  | "INVALID_MEMBER"
  | "INVALID_MASTER"
  | "FK_MISMATCH"
  | "FORBIDDEN_COMMON_PAYLOAD";

export type FamilyMigrationIssue = {
  code: FamilyMigrationIssueCode;
  reason: string;
  familyId?: string;
  memberId?: string;
  field?: string;
  conflictingMemberIds?: string[];
  logicalIdentityKey?: string;
};

export type MigratePositionRecordsSuccess = {
  ok: true;
  masters: FamilyMaster[];
  members: FamilyMember[];
  familyCount: number;
  memberCount: number;
  skippedLegacySlots: number;
};

export type MigratePositionRecordsFailure = {
  ok: false;
  issues: FamilyMigrationIssue[];
};

export type MigratePositionRecordsResult =
  | MigratePositionRecordsSuccess
  | MigratePositionRecordsFailure;

type ExtractedSlot = {
  recordIndex: number;
  slot: StrategyEntry["slot"];
  master: FamilyMaster;
  member: FamilyMember;
  identityKey: string;
  identity: FamilyIdentityFields;
};

function cloneJson<T>(value: T): T {
  if (value == null || typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Stable JSON for Master common-payload equality (TEMPORARY copies must match seed). */
export function familyMasterCommonPayloadFingerprint(
  master: Pick<
    FamilyMaster,
    | "signature"
    | "sysInputs"
    | "corrections"
    | "correctionsStored"
    | "ai"
    | "str"
    | "hpT"
  >
): string {
  const payload: Record<string, unknown> = {
    signature: master.signature ?? null,
    sysInputs: master.sysInputs ?? null,
    corrections: master.corrections ?? null,
    correctionsStored:
      master.correctionsStored === undefined ? null : !!master.correctionsStored,
    ai: master.ai === undefined ? null : master.ai,
    str: master.str === undefined ? null : master.str,
    hpT: master.hpT === undefined ? null : master.hpT,
  };
  return JSON.stringify(payload);
}

function memberFingerprint(member: FamilyMember): string {
  return JSON.stringify(member);
}

/**
 * Pure migration: PositionRecord[] → FamilyMaster[] + FamilyMember[].
 * Fail-closed on any family/member conflict. Does not mutate input.
 */
export function migratePositionRecordsToFamilyParts(
  dataset: PositionRecord[] | null | undefined
): MigratePositionRecordsResult {
  const records = Array.isArray(dataset) ? dataset : [];
  const issues: FamilyMigrationIssue[] = [];
  const extracted: ExtractedSlot[] = [];
  let skippedLegacySlots = 0;

  records.forEach((record, recordIndex) => {
    for (const slot of SLOTS) {
      if (!record?.strategies?.[slot]) continue;
      const split = splitPositionRecordToFamilyParts(record, slot);
      if (!split.ok) {
        // Incomplete / LEGACY / alias-invalid identity — skip, not a hard whole-corpus fail.
        skippedLegacySlots += 1;
        continue;
      }

      const identity = readPersistedFamilyIdentity(split.member, {
        authoringStrategyId: split.member.authoringStrategyId,
        positionId: record.positionId,
      });
      if (!identity?.familyId || !identity.memberId || !identity.memberOrigin) {
        skippedLegacySlots += 1;
        continue;
      }
      const provenance = validateFamilyProvenance(identity);
      if (!provenance.ok) {
        issues.push({
          code: "INVALID_PROVENANCE",
          reason: provenance.reason,
          familyId: identity.familyId,
          memberId: identity.memberId,
        });
        continue;
      }
      const generic = resolveGenericFamilyMemberIdentity(identity, {
        authoringStrategyId: split.member.authoringStrategyId,
        positionId: record.positionId,
      });
      const identityKey = genericFamilyMemberIdentityKey(generic);
      if (!identityKey) {
        issues.push({
          code: "INVALID_IDENTITY",
          reason: "unresolved logical family member identity",
          familyId: identity.familyId,
          memberId: identity.memberId,
        });
        continue;
      }
      if (
        memberHasForbiddenCommonPayload(
          split.member as unknown as Record<string, unknown>
        )
      ) {
        issues.push({
          code: "FORBIDDEN_COMMON_PAYLOAD",
          reason: "split Member still carries family-common writable fields",
          familyId: identity.familyId,
          memberId: identity.memberId,
        });
        continue;
      }

      extracted.push({
        recordIndex,
        slot,
        master: split.master,
        member: split.member,
        identityKey,
        identity,
      });
    }
  });

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  // Group by validated familyId
  const byFamily = new Map<string, ExtractedSlot[]>();
  for (const row of extracted) {
    const list = byFamily.get(row.member.familyId) ?? [];
    list.push(row);
    byFamily.set(row.member.familyId, list);
  }

  const masters: FamilyMaster[] = [];
  const members: FamilyMember[] = [];
  const globalMemberIds = new Map<string, FamilyMember>();
  const globalLogicalKeys = new Map<string, string>(); // identityKey → memberId

  for (const [familyId, rows] of byFamily) {
    const authored = rows.filter((r) => r.member.memberOrigin === "AUTHORED");
    if (authored.length === 0) {
      issues.push({
        code: "NO_AUTHORED_SEED",
        reason: `family ${familyId} has no validated AUTHORED Master seed`,
        familyId,
        conflictingMemberIds: rows.map((r) => r.member.memberId),
      });
      continue;
    }

    // Multiple AUTHORED logical slots → conflict unless identical memberId + payload
    const authoredByMemberId = new Map<string, ExtractedSlot>();
    for (const row of authored) {
      const prev = authoredByMemberId.get(row.member.memberId);
      if (!prev) {
        authoredByMemberId.set(row.member.memberId, row);
        continue;
      }
      if (
        familyMasterCommonPayloadFingerprint(prev.master) !==
          familyMasterCommonPayloadFingerprint(row.master) ||
        memberFingerprint(prev.member) !== memberFingerprint(row.member)
      ) {
        issues.push({
          code: "MULTIPLE_AUTHORED_SEEDS",
          reason: `family ${familyId} has conflicting AUTHORED seeds for memberId ${row.member.memberId}`,
          familyId,
          memberId: row.member.memberId,
          conflictingMemberIds: [prev.member.memberId, row.member.memberId],
        });
      }
    }
    if (authoredByMemberId.size > 1) {
      // Distinct AUTHORED memberIds under one familyId — forbidden (one AUTHORED per family).
      issues.push({
        code: "MULTIPLE_AUTHORED_SEEDS",
        reason: `family ${familyId} has ${authoredByMemberId.size} distinct AUTHORED memberIds`,
        familyId,
        conflictingMemberIds: [...authoredByMemberId.keys()],
      });
      continue;
    }
    if (issues.some((i) => i.familyId === familyId)) continue;

    const seedRow = authored[0]!;
    const seedFp = familyMasterCommonPayloadFingerprint(seedRow.master);

    for (const row of rows) {
      const fp = familyMasterCommonPayloadFingerprint(row.master);
      if (fp !== seedFp) {
        const field =
          FAMILY_MASTER_COMMON_FIELD_KEYS.find((key) => {
            const a = (seedRow.master as Record<string, unknown>)[key];
            const b = (row.master as Record<string, unknown>)[key];
            return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
          }) ?? "commonPayload";
        issues.push({
          code: "COMMON_PAYLOAD_CONFLICT",
          reason: `family ${familyId} common payload conflict on ${field}`,
          familyId,
          field,
          memberId: row.member.memberId,
          conflictingMemberIds: [seedRow.member.memberId, row.member.memberId],
        });
      }
    }
    if (issues.some((i) => i.familyId === familyId && i.code === "COMMON_PAYLOAD_CONFLICT")) {
      continue;
    }

    const masterNorm = normalizeFamilyMaster(seedRow.master);
    if (!masterNorm.ok) {
      issues.push({
        code: "INVALID_MASTER",
        reason: masterNorm.reason,
        familyId,
      });
      continue;
    }

    const familyMembers: FamilyMember[] = [];
    const familyLogical = new Map<string, string>();

    for (const row of rows) {
      const memberNorm = normalizeFamilyMember(row.member);
      if (!memberNorm.ok) {
        issues.push({
          code: "INVALID_MEMBER",
          reason: memberNorm.reason,
          familyId,
          memberId: row.member.memberId,
        });
        continue;
      }
      const member = memberNorm.member;
      if (member.familyId !== familyId) {
        issues.push({
          code: "FK_MISMATCH",
          reason: `member ${member.memberId} familyId !== ${familyId}`,
          familyId,
          memberId: member.memberId,
        });
        continue;
      }

      const existingLogicalOwner = familyLogical.get(row.identityKey);
      if (existingLogicalOwner && existingLogicalOwner !== member.memberId) {
        issues.push({
          code: "LOGICAL_IDENTITY_COLLISION",
          reason: `logical identity ${row.identityKey} maps to multiple memberIds`,
          familyId,
          logicalIdentityKey: row.identityKey,
          conflictingMemberIds: [existingLogicalOwner, member.memberId],
        });
        continue;
      }
      familyLogical.set(row.identityKey, member.memberId);

      const globalLogicalOwner = globalLogicalKeys.get(row.identityKey);
      if (globalLogicalOwner && globalLogicalOwner !== member.memberId) {
        issues.push({
          code: "LOGICAL_IDENTITY_COLLISION",
          reason: `logical identity ${row.identityKey} maps to multiple memberIds`,
          familyId,
          logicalIdentityKey: row.identityKey,
          conflictingMemberIds: [globalLogicalOwner, member.memberId],
        });
        continue;
      }

      const prevSameId = globalMemberIds.get(member.memberId);
      if (prevSameId) {
        if (memberFingerprint(prevSameId) !== memberFingerprint(member)) {
          issues.push({
            code: "DUPLICATE_MEMBER_ID",
            reason: `memberId ${member.memberId} has incompatible payloads`,
            familyId,
            memberId: member.memberId,
            conflictingMemberIds: [member.memberId],
          });
          continue;
        }
        // Identical re-appearance — idempotent skip
        continue;
      }

      // Same memberId within family rows already handled via globalMemberIds
      const priorInFamily = familyMembers.find((m) => m.memberId === member.memberId);
      if (priorInFamily) {
        if (memberFingerprint(priorInFamily) !== memberFingerprint(member)) {
          issues.push({
            code: "MEMBER_PAYLOAD_CONFLICT",
            reason: `memberId ${member.memberId} conflicting payloads in family ${familyId}`,
            familyId,
            memberId: member.memberId,
          });
          continue;
        }
        continue;
      }

      familyMembers.push(member);
      globalMemberIds.set(member.memberId, member);
      globalLogicalKeys.set(row.identityKey, member.memberId);
    }

    if (issues.some((i) => i.familyId === familyId)) continue;

    masters.push(masterNorm.master);
    members.push(...familyMembers);
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  // Stable order for idempotent deep equality
  masters.sort((a, b) => a.familyId.localeCompare(b.familyId));
  members.sort((a, b) => a.memberId.localeCompare(b.memberId));

  return {
    ok: true,
    masters: cloneJson(masters),
    members: cloneJson(members),
    familyCount: masters.length,
    memberCount: members.length,
    skippedLegacySlots,
  };
}

/**
 * Stable identity snapshot for idempotency assertions (no timestamps).
 */
export function migratedFamilyPartsIdentitySnapshot(
  result: MigratePositionRecordsSuccess
): {
  familyIds: string[];
  memberIds: string[];
  masterFingerprints: string[];
  memberFingerprints: string[];
  familyCount: number;
  memberCount: number;
} {
  return {
    familyIds: result.masters.map((m) => m.familyId),
    memberIds: result.members.map((m) => m.memberId),
    masterFingerprints: result.masters.map((m) =>
      familyMasterCommonPayloadFingerprint(m)
    ),
    memberFingerprints: result.members.map((m) => memberFingerprint(m)),
    familyCount: result.familyCount,
    memberCount: result.memberCount,
  };
}

void FAMILY_NORMALIZED_SCHEMA_VERSION;
