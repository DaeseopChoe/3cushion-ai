/**
 * Phase A/B-1 — Canonical Normalized Dataset Leaf Envelope + Validator.
 *
 * Local WRITE SSOT (Phase B-1): localStorage `normalized_dataset`
 * Future Production leaf (filename still positions.json):
 *   familyMasters[] + familyMembers[]
 *
 * Flat DatasetExportPayload.records[] remains LIVE export/publish until Phase D.
 * Flat positions_dataset is Local compatibility projection only (not WRITE authority).
 *
 * Storage ≠ Runtime: PositionRecord/StrategyEntry are hydrate projections only.
 *
 * Phase C-0 occupancy invariant (validator):
 *   (createPositionId(member.balls), sourceSlot) → at most one familyId
 * One Position supports at most three Strategies (S1/S2/S3); each slot ≤ 1 Family.
 * This is an occupancy constraint — not a Family ID rule (familyId remains fm_<uuid>).
 */

import {
  DATASET_EXPORT_SCHEMA_VERSION,
  systemIdToFolderLabel,
} from "../datasetPath";
import { createPositionId } from "../positionId";
import {
  genericFamilyMemberIdentityKey,
  isValidMemberId,
  resolveGenericFamilyMemberIdentity,
  type FamilyIdentityFields,
} from "../family/familyIdentity";
import {
  FAMILY_MASTER_COMMON_FIELD_KEYS,
  FAMILY_NORMALIZED_SCHEMA_VERSION,
  isFamilySourceSlot,
  memberHasForbiddenCommonPayload,
  type FamilyMaster,
  type FamilyMastersEnvelope,
  type FamilyMember,
  type FamilyMembersEnvelope,
} from "../family/familyNormalizedSchema";
import {
  normalizeFamilyMaster,
  normalizeFamilyMember,
} from "../family/familyNormalizedStore";
import { parseFamilyTrack, validateBall3Centers } from "../family/trackSymmetry";

/**
 * Normalized leaf envelope schemaVersion.
 * Distinct from flat DatasetExportPayload (DATASET_EXPORT_SCHEMA_VERSION = 2).
 * PublishOperation.schemaVersion remains a separate contract.
 */
export const NORMALIZED_DATASET_SCHEMA_VERSION = 3 as const;

export type NormalizedDatasetEnvelope = {
  schemaVersion: typeof NORMALIZED_DATASET_SCHEMA_VERSION;
  shotType: string;
  systemId: string;
  systemLabel: string;
  exportedAt?: string;
  sourceSnapshotId?: string;
  familyMasters: FamilyMaster[];
  familyMembers: FamilyMember[];
};

export type NormalizedDatasetIssueCode =
  | "INVALID_TOP_LEVEL"
  | "INVALID_SCHEMA_VERSION"
  | "LEGACY_FLAT_SHAPE"
  | "DUPLICATE_FAMILY_ID"
  | "DUPLICATE_MEMBER_ID"
  | "ORPHAN_MEMBER"
  | "MASTER_WITHOUT_MEMBERS"
  | "NO_AUTHORED_MEMBER"
  | "MULTIPLE_AUTHORED_MEMBERS"
  | "FORBIDDEN_MEMBER_COMMON_PAYLOAD"
  | "INVALID_MASTER"
  | "INVALID_MEMBER"
  | "INVALID_BALLS"
  | "INVALID_TRACK"
  | "INVALID_SOURCE_SLOT"
  | "INVALID_PROVENANCE"
  | "DUPLICATE_LOGICAL_MEMBER"
  | "DANGLING_GENERATED_FROM"
  | "FK_MISMATCH"
  /** Phase C-0: (positionId, sourceSlot) may belong to at most one familyId. */
  | "POSITION_STRATEGY_SLOT_CONFLICT";

export type NormalizedDatasetIssue = {
  code: NormalizedDatasetIssueCode;
  reason: string;
  familyId?: string;
  memberId?: string;
  field?: string;
  path?: string;
  positionId?: string;
  sourceSlot?: string;
  conflictingFamilyIds?: string[];
};

export type ParseNormalizedDatasetResult =
  | { ok: true; envelope: NormalizedDatasetEnvelope }
  | { ok: false; issues: NormalizedDatasetIssue[] };

function trimStr(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function isFinitePoint(p: unknown): p is { x: number; y: number } {
  if (!p || typeof p !== "object") return false;
  const o = p as { x?: unknown; y?: unknown };
  return typeof o.x === "number" && Number.isFinite(o.x) && typeof o.y === "number" && Number.isFinite(o.y);
}

function isBall3Shape(balls: unknown): boolean {
  if (!balls || typeof balls !== "object") return false;
  const b = balls as { cue?: unknown; target?: unknown; second?: unknown };
  return isFinitePoint(b.cue) && isFinitePoint(b.target) && isFinitePoint(b.second);
}

/**
 * Flat legacy leaf discriminator (DatasetExportPayload shape).
 * Does not validate records contents — shape only.
 */
export function isFlatLegacyDataset(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.records)) return false;
  // Explicit normalized arrays → not flat, even if records accidentally present
  if (Array.isArray(o.familyMasters) || Array.isArray(o.familyMembers)) {
    return false;
  }
  const ver = o.schemaVersion;
  if (ver === DATASET_EXPORT_SCHEMA_VERSION || ver === 1 || ver === 2) {
    return true;
  }
  // records[] without normalized arrays is treated as legacy flat shape
  return true;
}

/**
 * Normalized leaf discriminator (schemaVersion + masters/members arrays).
 * Does not fully validate — use parseNormalizedDatasetEnvelope.
 */
export function isNormalizedDataset(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  if (o.schemaVersion !== NORMALIZED_DATASET_SCHEMA_VERSION) return false;
  if (!Array.isArray(o.familyMasters) || !Array.isArray(o.familyMembers)) {
    return false;
  }
  return true;
}

function issue(
  code: NormalizedDatasetIssueCode,
  reason: string,
  extra?: Partial<NormalizedDatasetIssue>
): NormalizedDatasetIssue {
  return { code, reason, ...extra };
}

/**
 * Fail-closed parse + validate of a canonical normalized leaf envelope.
 * Never silently migrates flat records[].
 */
export function parseNormalizedDatasetEnvelope(
  raw: unknown
): ParseNormalizedDatasetResult {
  const issues: NormalizedDatasetIssue[] = [];

  if (raw == null || typeof raw !== "object") {
    return {
      ok: false,
      issues: [
        issue("INVALID_TOP_LEVEL", "normalized envelope must be a non-null object"),
      ],
    };
  }

  const o = raw as Record<string, unknown>;

  if (isFlatLegacyDataset(raw) && !isNormalizedDataset(raw)) {
    return {
      ok: false,
      issues: [
        issue(
          "LEGACY_FLAT_SHAPE",
          "flat DatasetExportPayload.records[] is not a normalized envelope; no silent migration",
          { field: "records" }
        ),
      ],
    };
  }

  if (o.schemaVersion !== NORMALIZED_DATASET_SCHEMA_VERSION) {
    issues.push(
      issue(
        "INVALID_SCHEMA_VERSION",
        `expected schemaVersion ${NORMALIZED_DATASET_SCHEMA_VERSION}, got ${String(o.schemaVersion)}`,
        { field: "schemaVersion" }
      )
    );
  }

  const shotType = trimStr(o.shotType);
  const systemId = trimStr(o.systemId);
  if (!shotType) {
    issues.push(issue("INVALID_TOP_LEVEL", "shotType required", { field: "shotType" }));
  }
  if (!systemId) {
    issues.push(issue("INVALID_TOP_LEVEL", "systemId required", { field: "systemId" }));
  }

  let systemLabel = trimStr(o.systemLabel);
  if (!systemLabel && systemId) {
    systemLabel = systemIdToFolderLabel(systemId);
  }
  if (!systemLabel) {
    issues.push(
      issue("INVALID_TOP_LEVEL", "systemLabel required", { field: "systemLabel" })
    );
  }

  if (!Array.isArray(o.familyMasters)) {
    issues.push(
      issue("INVALID_TOP_LEVEL", "familyMasters must be an array", {
        field: "familyMasters",
      })
    );
  }
  if (!Array.isArray(o.familyMembers)) {
    issues.push(
      issue("INVALID_TOP_LEVEL", "familyMembers must be an array", {
        field: "familyMembers",
      })
    );
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const mastersRaw = o.familyMasters as unknown[];
  const membersRaw = o.familyMembers as unknown[];
  const masters: FamilyMaster[] = [];
  const members: FamilyMember[] = [];
  const masterById = new Map<string, FamilyMaster>();
  const memberById = new Map<string, FamilyMember>();

  for (let i = 0; i < mastersRaw.length; i += 1) {
    const row = mastersRaw[i];
    const path = `familyMasters[${i}]`;
    if (!row || typeof row !== "object") {
      issues.push(
        issue("INVALID_MASTER", "FamilyMaster must be an object", { path })
      );
      continue;
    }
    const candidate = {
      ...(row as FamilyMaster),
      schemaVersion:
        typeof (row as FamilyMaster).schemaVersion === "number"
          ? (row as FamilyMaster).schemaVersion
          : FAMILY_NORMALIZED_SCHEMA_VERSION,
    };
    const normalized = normalizeFamilyMaster(candidate);
    if (!normalized.ok) {
      issues.push(
        issue("INVALID_MASTER", normalized.reason, {
          familyId: trimStr((row as { familyId?: unknown }).familyId) || undefined,
          path,
          field: normalized.code,
        })
      );
      continue;
    }
    const familyId = normalized.master.familyId;
    if (masterById.has(familyId)) {
      issues.push(
        issue("DUPLICATE_FAMILY_ID", `duplicate familyId ${familyId}`, {
          familyId,
          path,
        })
      );
      continue;
    }
    if (
      !normalized.master.signature ||
      typeof normalized.master.signature !== "object"
    ) {
      issues.push(
        issue("INVALID_MASTER", "signature required", {
          familyId,
          path,
          field: "signature",
        })
      );
      continue;
    }
    if (
      !normalized.master.sysInputs ||
      typeof normalized.master.sysInputs !== "object"
    ) {
      issues.push(
        issue("INVALID_MASTER", "sysInputs required", {
          familyId,
          path,
          field: "sysInputs",
        })
      );
      continue;
    }
    masterById.set(familyId, normalized.master);
    masters.push(normalized.master);
  }

  for (let i = 0; i < membersRaw.length; i += 1) {
    const row = membersRaw[i];
    const path = `familyMembers[${i}]`;
    if (!row || typeof row !== "object") {
      issues.push(
        issue("INVALID_MEMBER", "FamilyMember must be an object", { path })
      );
      continue;
    }
    const rec = row as Record<string, unknown>;

    if (memberHasForbiddenCommonPayload(rec)) {
      const forbidden = FAMILY_MASTER_COMMON_FIELD_KEYS.find((k) =>
        Object.prototype.hasOwnProperty.call(rec, k)
      );
      issues.push(
        issue(
          "FORBIDDEN_MEMBER_COMMON_PAYLOAD",
          `FamilyMember must not carry Master field ${String(forbidden)}`,
          {
            memberId: trimStr(rec.memberId) || undefined,
            familyId: trimStr(rec.familyId) || undefined,
            path,
            field: String(forbidden ?? "commonPayload"),
          }
        )
      );
      continue;
    }

    if (!isBall3Shape(rec.balls)) {
      issues.push(
        issue("INVALID_BALLS", "balls requires finite cue/target/second", {
          memberId: trimStr(rec.memberId) || undefined,
          familyId: trimStr(rec.familyId) || undefined,
          path,
          field: "balls",
        })
      );
      continue;
    }
    const centers = validateBall3Centers(
      rec.balls as FamilyMember["balls"]
    );
    if (centers) {
      issues.push(
        issue("INVALID_BALLS", centers, {
          memberId: trimStr(rec.memberId) || undefined,
          familyId: trimStr(rec.familyId) || undefined,
          path,
          field: "balls",
        })
      );
      continue;
    }

    if (!isFamilySourceSlot(rec.sourceSlot)) {
      issues.push(
        issue("INVALID_SOURCE_SLOT", "sourceSlot must be S1|S2|S3", {
          memberId: trimStr(rec.memberId) || undefined,
          familyId: trimStr(rec.familyId) || undefined,
          path,
          field: "sourceSlot",
        })
      );
      continue;
    }

    const trackParsed = parseFamilyTrack(rec.track);
    if (!trackParsed) {
      issues.push(
        issue("INVALID_TRACK", "track must be a FamilyTrack", {
          memberId: trimStr(rec.memberId) || undefined,
          familyId: trimStr(rec.familyId) || undefined,
          path,
          field: "track",
        })
      );
      continue;
    }

    const candidate = {
      ...(row as FamilyMember),
      schemaVersion:
        typeof (row as FamilyMember).schemaVersion === "number"
          ? (row as FamilyMember).schemaVersion
          : FAMILY_NORMALIZED_SCHEMA_VERSION,
      track: trackParsed,
    };
    const normalized = normalizeFamilyMember(candidate);
    if (!normalized.ok) {
      const code: NormalizedDatasetIssueCode =
        normalized.code === "FORBIDDEN_COMMON_PAYLOAD"
          ? "FORBIDDEN_MEMBER_COMMON_PAYLOAD"
          : normalized.code === "INVALID_PROVENANCE"
            ? "INVALID_PROVENANCE"
            : normalized.code === "INVALID_BALLS"
              ? "INVALID_BALLS"
              : "INVALID_MEMBER";
      issues.push(
        issue(code, normalized.reason, {
          memberId: trimStr(rec.memberId) || undefined,
          familyId: trimStr(rec.familyId) || undefined,
          path,
        })
      );
      continue;
    }

    const member = normalized.member;
    if (memberById.has(member.memberId)) {
      issues.push(
        issue(
          "DUPLICATE_MEMBER_ID",
          `duplicate memberId ${member.memberId}`,
          { memberId: member.memberId, familyId: member.familyId, path }
        )
      );
      continue;
    }
    if (!masterById.has(member.familyId)) {
      issues.push(
        issue(
          "ORPHAN_MEMBER",
          `member ${member.memberId} references missing master ${member.familyId}`,
          { memberId: member.memberId, familyId: member.familyId, path }
        )
      );
      continue;
    }

    memberById.set(member.memberId, member);
    members.push(member);
  }

  // Family-scoped logical identity uniqueness
  const logicalKeys = new Map<string, string>(); // key → memberId
  for (const member of members) {
    const identityFields: FamilyIdentityFields = {
      familyId: member.familyId,
      memberId: member.memberId,
      memberOrigin: member.memberOrigin,
      generatedFromMemberId: member.generatedFromMemberId,
      symmetryOp: member.symmetryOp,
      derivedRule: member.derivedRule,
      derivedStep: member.derivedStep,
    };
    const resolved = resolveGenericFamilyMemberIdentity(identityFields);
    const key = genericFamilyMemberIdentityKey(resolved);
    if (!key) {
      issues.push(
        issue(
          "INVALID_PROVENANCE",
          `member ${member.memberId} logical identity unresolved`,
          { memberId: member.memberId, familyId: member.familyId }
        )
      );
      continue;
    }
    const prev = logicalKeys.get(key);
    if (prev && prev !== member.memberId) {
      issues.push(
        issue(
          "DUPLICATE_LOGICAL_MEMBER",
          `duplicate logical identity ${key}`,
          {
            memberId: member.memberId,
            familyId: member.familyId,
            field: "logicalIdentity",
          }
        )
      );
    } else {
      logicalKeys.set(key, member.memberId);
    }
  }

  // Phase C-0: Position × Strategy Slot occupancy
  // (positionId, sourceSlot) → at most one familyId (not a Family-ID rule).
  // Same familyId occupying the same key twice is not a cross-Family conflict
  // (logical Member uniqueness handles same-Family duplicates).
  const occupancy = new Map<
    string,
    { familyId: string; memberId: string; positionId: string; sourceSlot: string }
  >();
  for (const member of members) {
    if (!isBall3Shape(member.balls) || !isFamilySourceSlot(member.sourceSlot)) {
      continue;
    }
    const positionId = createPositionId(member.balls);
    const sourceSlot = member.sourceSlot;
    const occKey = `${positionId}|${sourceSlot}`;
    const prev = occupancy.get(occKey);
    if (prev && prev.familyId !== member.familyId) {
      issues.push(
        issue(
          "POSITION_STRATEGY_SLOT_CONFLICT",
          `Position ${positionId} slot ${sourceSlot} already occupied by family ${prev.familyId}; cannot also assign family ${member.familyId}`,
          {
            memberId: member.memberId,
            familyId: member.familyId,
            positionId,
            sourceSlot,
            field: "sourceSlot",
            conflictingFamilyIds: [prev.familyId, member.familyId],
          }
        )
      );
    } else if (!prev) {
      occupancy.set(occKey, {
        familyId: member.familyId,
        memberId: member.memberId,
        positionId,
        sourceSlot,
      });
    }
  }

  // generatedFromMemberId referential integrity within envelope
  for (const member of members) {
    const from = trimStr(member.generatedFromMemberId);
    if (!from) continue;
    if (!isValidMemberId(from)) {
      issues.push(
        issue(
          "DANGLING_GENERATED_FROM",
          `invalid generatedFromMemberId ${from}`,
          { memberId: member.memberId, familyId: member.familyId }
        )
      );
      continue;
    }
    const source = memberById.get(from);
    if (!source) {
      issues.push(
        issue(
          "DANGLING_GENERATED_FROM",
          `generatedFromMemberId ${from} not present in envelope`,
          { memberId: member.memberId, familyId: member.familyId }
        )
      );
      continue;
    }
    if (source.familyId !== member.familyId) {
      issues.push(
        issue(
          "FK_MISMATCH",
          `generatedFromMemberId ${from} belongs to different family`,
          { memberId: member.memberId, familyId: member.familyId }
        )
      );
    }
  }

  // Per-family: ≥1 member, exactly one AUTHORED
  for (const master of masters) {
    const familyMembers = members.filter((m) => m.familyId === master.familyId);
    if (familyMembers.length === 0) {
      issues.push(
        issue(
          "MASTER_WITHOUT_MEMBERS",
          `FamilyMaster ${master.familyId} has no Members`,
          { familyId: master.familyId }
        )
      );
      continue;
    }
    const authored = familyMembers.filter((m) => m.memberOrigin === "AUTHORED");
    if (authored.length === 0) {
      issues.push(
        issue(
          "NO_AUTHORED_MEMBER",
          `family ${master.familyId} requires exactly one AUTHORED Member`,
          { familyId: master.familyId }
        )
      );
    } else if (authored.length > 1) {
      issues.push(
        issue(
          "MULTIPLE_AUTHORED_MEMBERS",
          `family ${master.familyId} has ${authored.length} AUTHORED Members`,
          { familyId: master.familyId }
        )
      );
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }

  const envelope: NormalizedDatasetEnvelope = {
    schemaVersion: NORMALIZED_DATASET_SCHEMA_VERSION,
    shotType,
    systemId,
    systemLabel,
    familyMasters: masters,
    familyMembers: members,
  };
  const exportedAt = trimStr(o.exportedAt);
  if (exportedAt) envelope.exportedAt = exportedAt;
  const sourceSnapshotId = trimStr(o.sourceSnapshotId);
  if (sourceSnapshotId) envelope.sourceSnapshotId = sourceSnapshotId;

  return { ok: true, envelope };
}

export type ComposeNormalizedDatasetArgs = {
  shotType: string;
  systemId: string;
  systemLabel?: string;
  exportedAt?: string;
  sourceSnapshotId?: string;
  masters: FamilyMastersEnvelope | FamilyMaster[] | Record<string, FamilyMaster>;
  members: FamilyMembersEnvelope | FamilyMember[] | Record<string, FamilyMember>;
};

function mastersToArray(
  masters: ComposeNormalizedDatasetArgs["masters"]
): FamilyMaster[] {
  if (Array.isArray(masters)) return masters;
  if (masters && typeof masters === "object" && "masters" in masters) {
    return Object.values((masters as FamilyMastersEnvelope).masters ?? {});
  }
  return Object.values(masters as Record<string, FamilyMaster>);
}

function membersToArray(
  members: ComposeNormalizedDatasetArgs["members"]
): FamilyMember[] {
  if (Array.isArray(members)) return members;
  if (members && typeof members === "object" && "members" in members) {
    return Object.values((members as FamilyMembersEnvelope).members ?? {});
  }
  return Object.values(members as Record<string, FamilyMember>);
}

/**
 * Pure compose: shadow FamilyMasters/Members envelopes → leaf-shaped raw object.
 * Does not persist. Caller must parseNormalizedDatasetEnvelope to validate.
 */
export function composeNormalizedDatasetEnvelope(
  args: ComposeNormalizedDatasetArgs
): Record<string, unknown> {
  const systemId = trimStr(args.systemId);
  const shotType = trimStr(args.shotType);
  const systemLabel =
    trimStr(args.systemLabel) || (systemId ? systemIdToFolderLabel(systemId) : "");
  const out: Record<string, unknown> = {
    schemaVersion: NORMALIZED_DATASET_SCHEMA_VERSION,
    shotType,
    systemId,
    systemLabel,
    familyMasters: mastersToArray(args.masters).map((m) => ({ ...m })),
    familyMembers: membersToArray(args.members).map((m) => ({ ...m })),
  };
  const exportedAt = trimStr(args.exportedAt);
  if (exportedAt) out.exportedAt = exportedAt;
  const sourceSnapshotId = trimStr(args.sourceSnapshotId);
  if (sourceSnapshotId) out.sourceSnapshotId = sourceSnapshotId;
  return out;
}

/**
 * Pure decompose: validated envelope → shadow-shaped envelopes (no corpusGeneration).
 */
export function decomposeNormalizedDatasetEnvelope(
  envelope: NormalizedDatasetEnvelope
): {
  masters: FamilyMastersEnvelope;
  members: FamilyMembersEnvelope;
} {
  const masters: FamilyMastersEnvelope = {
    schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
    masters: {},
  };
  const members: FamilyMembersEnvelope = {
    schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
    members: {},
  };
  for (const m of envelope.familyMasters) {
    masters.masters[m.familyId] = { ...m };
  }
  for (const m of envelope.familyMembers) {
    members.members[m.memberId] = { ...m };
  }
  return { masters, members };
}

/** Semantic fingerprint for Master common payload (tests / verify prep). */
export function familyMasterCommonFingerprint(
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
  return JSON.stringify({
    signature: master.signature ?? null,
    sysInputs: master.sysInputs ?? null,
    corrections: master.corrections ?? null,
    correctionsStored:
      master.correctionsStored === undefined ? null : !!master.correctionsStored,
    ai: master.ai === undefined ? null : master.ai,
    str: master.str === undefined ? null : master.str,
    hpT: master.hpT === undefined ? null : master.hpT,
  });
}
