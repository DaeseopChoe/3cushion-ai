/**
 * Phase 3A-321 Phase A — physical FamilyMaster / FamilyMember localStorage store.
 *
 * Keys: family_masters / family_members.
 * Does not touch positions_dataset or workspace_history.
 * Dual-write from SAVE/Approval is gated by isFamilyNormalizedStorageEnabled().
 */

import {
  isValidFamilyId,
  isValidMemberId,
  parseMemberOrigin,
  validateFamilyProvenance,
} from "./familyIdentity";
import {
  emptyFamilyMastersEnvelope,
  emptyFamilyMembersEnvelope,
  FAMILY_MASTERS_STORAGE_KEY,
  FAMILY_MEMBERS_STORAGE_KEY,
  FAMILY_NORMALIZED_SCHEMA_VERSION,
  memberHasForbiddenCommonPayload,
  type FamilyMaster,
  type FamilyMastersEnvelope,
  type FamilyMember,
  type FamilyMembersEnvelope,
} from "./familyNormalizedSchema";

export type FamilyStoreValidationOk = {
  ok: true;
  masterCount: number;
  memberCount: number;
  orphanCount: number;
  duplicateMemberIdCount: number;
};

export type FamilyStoreValidationFail = {
  ok: false;
  reason: string;
  code:
    | "ORPHAN_MEMBER"
    | "MISSING_MASTER"
    | "DUPLICATE_MEMBER"
    | "INVALID_IDENTITY"
    | "FORBIDDEN_COMMON_PAYLOAD"
    | "INVALID_PROVENANCE"
    | "FK_MISMATCH"
    | "INVALID_BALLS"
    | "CORRUPT_ENVELOPE";
};

export type FamilyStoreValidationResult =
  | FamilyStoreValidationOk
  | FamilyStoreValidationFail;

function cloneJson<T>(value: T): T {
  if (value == null || typeof value !== "object") return value;
  return JSON.parse(JSON.stringify(value)) as T;
}

function isPoint(v: unknown): v is { x: number; y: number } {
  return (
    !!v &&
    typeof v === "object" &&
    typeof (v as { x?: unknown }).x === "number" &&
    Number.isFinite((v as { x: number }).x) &&
    typeof (v as { y?: unknown }).y === "number" &&
    Number.isFinite((v as { y: number }).y)
  );
}

function isValidBalls(balls: unknown): balls is FamilyMember["balls"] {
  if (!balls || typeof balls !== "object") return false;
  const b = balls as Record<string, unknown>;
  return isPoint(b.cue) && isPoint(b.target) && isPoint(b.second);
}

function readEnvelopeRaw(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function writeEnvelopeRaw(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
}

export function loadFamilyMastersEnvelope(): FamilyMastersEnvelope {
  const parsed = readEnvelopeRaw(FAMILY_MASTERS_STORAGE_KEY);
  if (!parsed || typeof parsed !== "object") return emptyFamilyMastersEnvelope();
  const env = parsed as Partial<FamilyMastersEnvelope>;
  if (!env.masters || typeof env.masters !== "object") {
    return emptyFamilyMastersEnvelope();
  }
  return {
    schemaVersion:
      typeof env.schemaVersion === "number"
        ? env.schemaVersion
        : FAMILY_NORMALIZED_SCHEMA_VERSION,
    masters: { ...env.masters },
  };
}

export function loadFamilyMembersEnvelope(): FamilyMembersEnvelope {
  const parsed = readEnvelopeRaw(FAMILY_MEMBERS_STORAGE_KEY);
  if (!parsed || typeof parsed !== "object") return emptyFamilyMembersEnvelope();
  const env = parsed as Partial<FamilyMembersEnvelope>;
  if (!env.members || typeof env.members !== "object") {
    return emptyFamilyMembersEnvelope();
  }
  return {
    schemaVersion:
      typeof env.schemaVersion === "number"
        ? env.schemaVersion
        : FAMILY_NORMALIZED_SCHEMA_VERSION,
    members: { ...env.members },
  };
}

function saveMastersEnvelope(env: FamilyMastersEnvelope): void {
  writeEnvelopeRaw(FAMILY_MASTERS_STORAGE_KEY, env);
}

function saveMembersEnvelope(env: FamilyMembersEnvelope): void {
  writeEnvelopeRaw(FAMILY_MEMBERS_STORAGE_KEY, env);
}

export function normalizeFamilyMaster(
  input: FamilyMaster
): { ok: true; master: FamilyMaster } | FamilyStoreValidationFail {
  const familyId =
    typeof input.familyId === "string" ? input.familyId.trim() : "";
  if (!isValidFamilyId(familyId)) {
    return {
      ok: false,
      code: "INVALID_IDENTITY",
      reason: `invalid familyId: ${String(input.familyId)}`,
    };
  }
  if (!input.signature || typeof input.signature !== "object") {
    return {
      ok: false,
      code: "INVALID_IDENTITY",
      reason: "FamilyMaster.signature required",
    };
  }
  if (!input.sysInputs || typeof input.sysInputs !== "object") {
    return {
      ok: false,
      code: "INVALID_IDENTITY",
      reason: "FamilyMaster.sysInputs required",
    };
  }
  const master: FamilyMaster = {
    schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
    familyId,
    signature: cloneJson(input.signature),
    sysInputs: { ...input.sysInputs },
  };
  if (input.corrections) master.corrections = cloneJson(input.corrections);
  if (input.correctionsStored != null) {
    master.correctionsStored = !!input.correctionsStored;
  }
  if (input.ai !== undefined) master.ai = cloneJson(input.ai);
  if (input.str !== undefined) master.str = cloneJson(input.str);
  if (input.hpT !== undefined) master.hpT = cloneJson(input.hpT);
  return { ok: true, master };
}

export function normalizeFamilyMember(
  input: FamilyMember
): { ok: true; member: FamilyMember } | FamilyStoreValidationFail {
  if (memberHasForbiddenCommonPayload(input as unknown as Record<string, unknown>)) {
    return {
      ok: false,
      code: "FORBIDDEN_COMMON_PAYLOAD",
      reason:
        "FamilyMember must not carry signature/sysInputs/corrections/ai/str/hpT",
    };
  }
  const memberId =
    typeof input.memberId === "string" ? input.memberId.trim() : "";
  const familyId =
    typeof input.familyId === "string" ? input.familyId.trim() : "";
  if (!isValidMemberId(memberId)) {
    return {
      ok: false,
      code: "INVALID_IDENTITY",
      reason: `invalid memberId: ${String(input.memberId)}`,
    };
  }
  if (!isValidFamilyId(familyId)) {
    return {
      ok: false,
      code: "INVALID_IDENTITY",
      reason: `invalid familyId: ${String(input.familyId)}`,
    };
  }
  if (familyId === memberId) {
    return {
      ok: false,
      code: "INVALID_IDENTITY",
      reason: "familyId must not equal memberId",
    };
  }
  if (!isValidBalls(input.balls)) {
    return {
      ok: false,
      code: "INVALID_BALLS",
      reason: "FamilyMember.balls requires cue/target/second points",
    };
  }
  const track = typeof input.track === "string" ? input.track.trim() : "";
  if (!track) {
    return {
      ok: false,
      code: "INVALID_IDENTITY",
      reason: "FamilyMember.track required",
    };
  }
  const memberOrigin = parseMemberOrigin(input.memberOrigin);
  if (!memberOrigin) {
    return {
      ok: false,
      code: "INVALID_IDENTITY",
      reason: "FamilyMember.memberOrigin required",
    };
  }
  const provenance = validateFamilyProvenance({
    memberOrigin,
    generatedFromMemberId: input.generatedFromMemberId,
    symmetryOp: input.symmetryOp,
    derivedRule: input.derivedRule,
    derivedStep: input.derivedStep,
  });
  if (!provenance.ok) {
    return {
      ok: false,
      code: "INVALID_PROVENANCE",
      reason: provenance.reason,
    };
  }

  const member: FamilyMember = {
    schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
    memberId,
    familyId,
    balls: {
      cue: { x: input.balls.cue.x, y: input.balls.cue.y },
      target: { x: input.balls.target.x, y: input.balls.target.y },
      second: { x: input.balls.second.x, y: input.balls.second.y },
    },
    track,
    memberOrigin,
  };
  if (input.targetBall === "yellow" || input.targetBall === "red") {
    member.targetBall = input.targetBall;
  }
  if (input.generatedFromMemberId) {
    member.generatedFromMemberId = input.generatedFromMemberId;
  }
  if (input.symmetryOp) member.symmetryOp = input.symmetryOp;
  if (input.derivedRule) member.derivedRule = input.derivedRule;
  if (input.derivedStep) member.derivedStep = input.derivedStep;
  if (input.reflectionOverride) {
    member.reflectionOverride = cloneJson(input.reflectionOverride);
  }
  if (input.trajectoryExtensions) {
    member.trajectoryExtensions = cloneJson(input.trajectoryExtensions);
  }
  if (input.authoringStrategyId && input.authoringStrategyId.trim()) {
    member.authoringStrategyId = input.authoringStrategyId.trim();
  }
  return { ok: true, member };
}

export function validateFamilyStore(
  mastersEnv: FamilyMastersEnvelope = loadFamilyMastersEnvelope(),
  membersEnv: FamilyMembersEnvelope = loadFamilyMembersEnvelope()
): FamilyStoreValidationResult {
  if (
    !mastersEnv ||
    typeof mastersEnv !== "object" ||
    !mastersEnv.masters ||
    typeof mastersEnv.masters !== "object"
  ) {
    return {
      ok: false,
      code: "CORRUPT_ENVELOPE",
      reason: "family_masters envelope corrupt",
    };
  }
  if (
    !membersEnv ||
    typeof membersEnv !== "object" ||
    !membersEnv.members ||
    typeof membersEnv.members !== "object"
  ) {
    return {
      ok: false,
      code: "CORRUPT_ENVELOPE",
      reason: "family_members envelope corrupt",
    };
  }

  const masterIds = new Set<string>();
  for (const [key, master] of Object.entries(mastersEnv.masters)) {
    const normalized = normalizeFamilyMaster(master);
    if (!normalized.ok) return normalized;
    if (key !== normalized.master.familyId) {
      return {
        ok: false,
        code: "FK_MISMATCH",
        reason: `master map key ${key} !== familyId ${normalized.master.familyId}`,
      };
    }
    if (masterIds.has(normalized.master.familyId)) {
      return {
        ok: false,
        code: "INVALID_IDENTITY",
        reason: `duplicate FamilyMaster familyId ${normalized.master.familyId}`,
      };
    }
    masterIds.add(normalized.master.familyId);
  }

  const memberIds = new Set<string>();
  let orphanCount = 0;
  for (const [key, member] of Object.entries(membersEnv.members)) {
    const normalized = normalizeFamilyMember(member);
    if (!normalized.ok) return normalized;
    if (key !== normalized.member.memberId) {
      return {
        ok: false,
        code: "FK_MISMATCH",
        reason: `member map key ${key} !== memberId ${normalized.member.memberId}`,
      };
    }
    if (memberIds.has(normalized.member.memberId)) {
      return {
        ok: false,
        code: "DUPLICATE_MEMBER",
        reason: `duplicate memberId ${normalized.member.memberId}`,
      };
    }
    memberIds.add(normalized.member.memberId);
    if (!mastersEnv.masters[normalized.member.familyId]) {
      orphanCount += 1;
      return {
        ok: false,
        code: "ORPHAN_MEMBER",
        reason: `orphan FamilyMember ${normalized.member.memberId} → missing master ${normalized.member.familyId}`,
      };
    }
  }

  return {
    ok: true,
    masterCount: masterIds.size,
    memberCount: memberIds.size,
    orphanCount,
    duplicateMemberIdCount: 0,
  };
}

export function readFamilyMaster(familyId: string): FamilyMaster | null {
  const id = typeof familyId === "string" ? familyId.trim() : "";
  if (!isValidFamilyId(id)) return null;
  const master = loadFamilyMastersEnvelope().masters[id];
  if (!master) return null;
  const normalized = normalizeFamilyMaster(master);
  return normalized.ok ? normalized.master : null;
}

export function readFamilyMember(memberId: string): FamilyMember | null {
  const id = typeof memberId === "string" ? memberId.trim() : "";
  if (!isValidMemberId(id)) return null;
  const member = loadFamilyMembersEnvelope().members[id];
  if (!member) return null;
  const normalized = normalizeFamilyMember(member);
  return normalized.ok ? normalized.member : null;
}

export function readFamilyMembersByFamilyId(familyId: string): FamilyMember[] {
  const id = typeof familyId === "string" ? familyId.trim() : "";
  if (!isValidFamilyId(id)) return [];
  const out: FamilyMember[] = [];
  for (const member of Object.values(loadFamilyMembersEnvelope().members)) {
    if (member.familyId !== id) continue;
    const normalized = normalizeFamilyMember(member);
    if (normalized.ok) out.push(normalized.member);
  }
  return out;
}

export function upsertFamilyMaster(
  input: FamilyMaster
): { ok: true; master: FamilyMaster } | FamilyStoreValidationFail {
  const normalized = normalizeFamilyMaster(input);
  if (!normalized.ok) return normalized;
  const env = loadFamilyMastersEnvelope();
  env.schemaVersion = FAMILY_NORMALIZED_SCHEMA_VERSION;
  env.masters[normalized.master.familyId] = normalized.master;
  saveMastersEnvelope(env);
  return { ok: true, master: normalized.master };
}

/**
 * Deterministic upsert by memberId. Rejects orphan (missing master)
 * and forbidden common payload.
 */
export function upsertFamilyMember(
  input: FamilyMember
): { ok: true; member: FamilyMember } | FamilyStoreValidationFail {
  const normalized = normalizeFamilyMember(input);
  if (!normalized.ok) return normalized;
  const masters = loadFamilyMastersEnvelope();
  if (!masters.masters[normalized.member.familyId]) {
    return {
      ok: false,
      code: "ORPHAN_MEMBER",
      reason: `cannot upsert member ${normalized.member.memberId}: master ${normalized.member.familyId} missing`,
    };
  }
  const env = loadFamilyMembersEnvelope();
  env.schemaVersion = FAMILY_NORMALIZED_SCHEMA_VERSION;
  env.members[normalized.member.memberId] = normalized.member;
  saveMembersEnvelope(env);
  return { ok: true, member: normalized.member };
}

/**
 * Atomic logical transaction: one master + N members for that family.
 * Validates full candidate set before writing either envelope.
 */
export function commitFamilyMasterWithMembers(args: {
  master: FamilyMaster;
  members: FamilyMember[];
}):
  | {
      ok: true;
      master: FamilyMaster;
      members: FamilyMember[];
      validation: FamilyStoreValidationOk;
    }
  | FamilyStoreValidationFail {
  const masterNorm = normalizeFamilyMaster(args.master);
  if (!masterNorm.ok) return masterNorm;

  const memberNorms: FamilyMember[] = [];
  const seenMemberIds = new Set<string>();
  for (const raw of args.members) {
    const memberNorm = normalizeFamilyMember(raw);
    if (!memberNorm.ok) return memberNorm;
    if (memberNorm.member.familyId !== masterNorm.master.familyId) {
      return {
        ok: false,
        code: "FK_MISMATCH",
        reason: `member ${memberNorm.member.memberId} familyId !== master ${masterNorm.master.familyId}`,
      };
    }
    if (seenMemberIds.has(memberNorm.member.memberId)) {
      return {
        ok: false,
        code: "DUPLICATE_MEMBER",
        reason: `duplicate memberId in transaction: ${memberNorm.member.memberId}`,
      };
    }
    seenMemberIds.add(memberNorm.member.memberId);
    memberNorms.push(memberNorm.member);
  }

  const mastersEnv = loadFamilyMastersEnvelope();
  const membersEnv = loadFamilyMembersEnvelope();

  // Replace this family's members atomically within the in-memory envelopes.
  mastersEnv.schemaVersion = FAMILY_NORMALIZED_SCHEMA_VERSION;
  mastersEnv.masters[masterNorm.master.familyId] = masterNorm.master;

  membersEnv.schemaVersion = FAMILY_NORMALIZED_SCHEMA_VERSION;
  for (const [mid, existing] of Object.entries(membersEnv.members)) {
    if (existing.familyId === masterNorm.master.familyId) {
      delete membersEnv.members[mid];
    }
  }
  for (const member of memberNorms) {
    membersEnv.members[member.memberId] = member;
  }

  const validation = validateFamilyStore(mastersEnv, membersEnv);
  if (!validation.ok) return validation;

  saveMastersEnvelope(mastersEnv);
  saveMembersEnvelope(membersEnv);
  return {
    ok: true,
    master: masterNorm.master,
    members: memberNorms,
    validation,
  };
}

/**
 * Persist a full validated migration result into family_masters / family_members.
 * Replaces the entire normalized envelopes with the provided masters+members.
 * Does NOT touch positions_dataset or workspace_history.
 *
 * Atomicity note (Phase B): two localStorage keys cannot be updated in one
 * browser transaction. We validate the full replacement envelopes in memory
 * first; if a crash occurs between the two setItem calls, validateFamilyStore
 * detects orphans/FK issues and the incomplete stores are safely ignorable
 * while legacy positions_dataset remains SSOT (feature flag OFF).
 */
export function persistMigratedFamilyParts(args: {
  masters: FamilyMaster[];
  members: FamilyMember[];
}):
  | {
      ok: true;
      validation: FamilyStoreValidationOk;
    }
  | FamilyStoreValidationFail {
  const mastersEnv = emptyFamilyMastersEnvelope();
  const membersEnv = emptyFamilyMembersEnvelope();

  for (const raw of args.masters) {
    const normalized = normalizeFamilyMaster(raw);
    if (!normalized.ok) return normalized;
    if (mastersEnv.masters[normalized.master.familyId]) {
      return {
        ok: false,
        code: "INVALID_IDENTITY",
        reason: `duplicate FamilyMaster familyId ${normalized.master.familyId}`,
      };
    }
    mastersEnv.masters[normalized.master.familyId] = normalized.master;
  }

  for (const raw of args.members) {
    const normalized = normalizeFamilyMember(raw);
    if (!normalized.ok) return normalized;
    if (membersEnv.members[normalized.member.memberId]) {
      return {
        ok: false,
        code: "DUPLICATE_MEMBER",
        reason: `duplicate memberId ${normalized.member.memberId}`,
      };
    }
    if (!mastersEnv.masters[normalized.member.familyId]) {
      return {
        ok: false,
        code: "ORPHAN_MEMBER",
        reason: `orphan FamilyMember ${normalized.member.memberId} → missing master ${normalized.member.familyId}`,
      };
    }
    membersEnv.members[normalized.member.memberId] = normalized.member;
  }

  const validation = validateFamilyStore(mastersEnv, membersEnv);
  if (!validation.ok) return validation;

  saveMastersEnvelope(mastersEnv);
  saveMembersEnvelope(membersEnv);
  return { ok: true, validation };
}

/** Test / diagnostics helper — does not clear positions_dataset or workspace_history. */
export function clearFamilyNormalizedStoresForTests(): void {
  try {
    localStorage.removeItem(FAMILY_MASTERS_STORAGE_KEY);
    localStorage.removeItem(FAMILY_MEMBERS_STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
