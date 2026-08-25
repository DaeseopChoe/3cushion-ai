/**
 * Phase 1B — Family Identity & Compatibility Foundation.
 *
 * This module is NOT the final Family DB / Master table.
 * Persistence remains PositionRecord + StrategyEntry.
 * FamilyMasterView is a compatibility projection of existing StrategyEntry
 * payload, not physical Master ownership.
 *
 * Identity aliases are forbidden:
 *   familyId != authoringStrategyId
 *   memberId != positionId
 *   slot != Family != Member != track
 *   coordinates equality != family identity
 */

import type {
  Ball3,
  PositionRecord,
  StrategyEntry,
} from "../positionSearchEngine";

export const FAMILY_ID_PREFIX = "fm_";
export const MEMBER_ID_PREFIX = "mb_";

/**
 * Origin / generation lineage (persisted on native members).
 * Separate axis from storage compatibility (LEGACY vs FAMILY_NATIVE).
 * Phase 1B writes AUTHORED. Phase 2B writes SYMMETRY.
 * Phase 3A-3D writes DERIVED_CUE_IMPACT. Phase 3A-359 writes DERIVED_C3_PLUS.
 * Phase 3A-360 writes DERIVED_CUE_C3_PRODUCT (Track × Cue × C3+ Cartesian).
 */
export type MemberOrigin =
  | "AUTHORED"
  | "SYMMETRY"
  | "DERIVED_CUE_IMPACT"
  | "DERIVED_C3_PLUS"
  | "DERIVED_CUE_C3_PRODUCT";

/**
 * Coordinate symmetry operator used to generate a SYMMETRY Member.
 * AUTHORED Members omit this field — do not persist IDENTITY.
 */
export type SymmetryOp = "H" | "V" | "RPI";
export type DerivedRule =
  | "CUE_IMPACT_FIRST_30PCT"
  | "C3_PLUS_SCORING_LINE_v1"
  /** Withdrawn placeholder — parse-compatible only; not product sampling law. */
  | "C3_PLUS_2RG"
  | "CUE_C3_CARTESIAN_PRODUCT_V1";
export type DerivedStep = string;

const SYMMETRY_OPS: ReadonlySet<string> = new Set(["H", "V", "RPI"]);
const DERIVED_RULES: ReadonlySet<string> = new Set([
  "CUE_IMPACT_FIRST_30PCT",
  "C3_PLUS_SCORING_LINE_v1",
  "C3_PLUS_2RG",
  "CUE_C3_CARTESIAN_PRODUCT_V1",
]);

const MEMBER_ORIGINS: ReadonlySet<string> = new Set([
  "AUTHORED",
  "SYMMETRY",
  "DERIVED_CUE_IMPACT",
  "DERIVED_C3_PLUS",
  "DERIVED_CUE_C3_PRODUCT",
]);

/**
 * View-only compatibility generation.
 * LEGACY is never written onto corpus (no eager migration).
 */
export type FamilyStorageGeneration = "LEGACY" | "FAMILY_NATIVE";

/** Additive persisted identity on StrategyEntry (optional on legacy). */
export type FamilyIdentityFields = {
  familyId?: string;
  memberId?: string;
  memberOrigin?: MemberOrigin;
  /**
   * SYMMETRY (and later DERIVED) lineage. AUTHORED omits this.
   * Always the AUTHORED memberId for Phase 2 SYMMETRY Members.
   */
  generatedFromMemberId?: string;
  /** SYMMETRY operator. AUTHORED omits this (no IDENTITY sentinel). */
  symmetryOp?: SymmetryOp;
  /** Derived generation rule. Present only on Derived Members. */
  derivedRule?: DerivedRule;
  /** Stable source-domain key for Derived Members. */
  derivedStep?: DerivedStep;
};

export type FamilyIdentitySource = FamilyIdentityFields & {
  authoringStrategyId?: string;
};

export type FamilySaveIntent = "UPDATE" | "CREATE";

export type FamilyMasterView = {
  familyId: string | null;
  storageGeneration: FamilyStorageGeneration;
  signature: StrategyEntry["signature"];
  /**
   * Compatibility copy of current StrategyEntry payload.
   * NOT a transfer of persistence ownership. sysInputs stay on StrategyEntry.
   */
  sysInputs: Record<string, number>;
  corrections?: StrategyEntry["corrections"];
  hpT?: unknown;
  str?: unknown;
  ai?: unknown;
};

export type FamilyMemberView = {
  familyId: string | null;
  memberId: string | null;
  storageGeneration: FamilyStorageGeneration;
  memberOrigin?: MemberOrigin;
  generatedFromMemberId?: string;
  symmetryOp?: SymmetryOp;
  positionId: string;
  slot: StrategyEntry["slot"];
  track: string;
  balls: Ball3;
  targetBall?: PositionRecord["targetBall"];
};

export type FamilyAwareEntryView = {
  storageGeneration: FamilyStorageGeneration;
  master: FamilyMasterView;
  member: FamilyMemberView;
};

function mintUuidFragment(): string {
  if (typeof globalThis.crypto?.randomUUID === "function") {
    return globalThis.crypto.randomUUID();
  }
  return `${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
}

export function mintFamilyId(): string {
  return `${FAMILY_ID_PREFIX}${mintUuidFragment()}`;
}

export function mintMemberId(): string {
  return `${MEMBER_ID_PREFIX}${mintUuidFragment()}`;
}

export function isValidFamilyId(id: unknown): id is string {
  return typeof id === "string" && id.startsWith(FAMILY_ID_PREFIX) && id.length > FAMILY_ID_PREFIX.length;
}

export function isValidMemberId(id: unknown): id is string {
  return typeof id === "string" && id.startsWith(MEMBER_ID_PREFIX) && id.length > MEMBER_ID_PREFIX.length;
}

export function parseMemberOrigin(raw: unknown): MemberOrigin | undefined {
  if (typeof raw !== "string") return undefined;
  return MEMBER_ORIGINS.has(raw) ? (raw as MemberOrigin) : undefined;
}

export function parseSymmetryOp(raw: unknown): SymmetryOp | undefined {
  if (typeof raw !== "string") return undefined;
  return SYMMETRY_OPS.has(raw) ? (raw as SymmetryOp) : undefined;
}

export function parseDerivedRule(raw: unknown): DerivedRule | undefined {
  if (typeof raw !== "string") return undefined;
  return DERIVED_RULES.has(raw) ? (raw as DerivedRule) : undefined;
}

export function normalizeDerivedStep(raw: unknown): DerivedStep | undefined {
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  return trimmed ? trimmed : undefined;
}

export function isDerivedMemberOrigin(
  origin: MemberOrigin | null | undefined
): origin is "DERIVED_CUE_IMPACT" | "DERIVED_C3_PLUS" | "DERIVED_CUE_C3_PRODUCT" {
  return (
    origin === "DERIVED_CUE_IMPACT" ||
    origin === "DERIVED_C3_PLUS" ||
    origin === "DERIVED_CUE_C3_PRODUCT"
  );
}

export function expectedDerivedRuleForOrigin(
  origin: MemberOrigin | null | undefined
): DerivedRule | null {
  if (origin === "DERIVED_CUE_IMPACT") return "CUE_IMPACT_FIRST_30PCT";
  if (origin === "DERIVED_C3_PLUS") return "C3_PLUS_SCORING_LINE_v1";
  if (origin === "DERIVED_CUE_C3_PRODUCT") return "CUE_C3_CARTESIAN_PRODUCT_V1";
  return null;
}

/** Canonical Product derivedStep: cue:{cueStep}|c3:{c3Step} */
export function encodeCueC3ProductDerivedStep(
  cueStep: string,
  c3Step: string
): DerivedStep {
  const cue = typeof cueStep === "string" ? cueStep.trim() : "";
  const c3 = typeof c3Step === "string" ? c3Step.trim() : "";
  return `cue:${cue}|c3:${c3}`;
}

export function parseCueC3ProductDerivedStep(
  derivedStep: string | null | undefined
): { cueStep: string; c3Step: string } | null {
  if (typeof derivedStep !== "string") return null;
  const raw = derivedStep.trim();
  const m = /^cue:(.+)\|c3:(.+)$/.exec(raw);
  if (!m) return null;
  const cueStep = m[1]?.trim() ?? "";
  const c3Step = m[2]?.trim() ?? "";
  if (!cueStep || !c3Step) return null;
  return { cueStep, c3Step };
}

/**
 * Idempotency key axis: familyId + symmetry identity.
 * AUTHORED is the IDENTITY bucket (no persisted symmetryOp).
 */
export type FamilySymmetryIdentity = SymmetryOp | "IDENTITY";

export function familySymmetryIdentity(
  entry: Pick<FamilyIdentityFields, "memberOrigin" | "symmetryOp"> | null | undefined
): FamilySymmetryIdentity | null {
  if (!entry) return null;
  const op = parseSymmetryOp(entry.symmetryOp);
  if (op) return op;
  const origin = parseMemberOrigin(entry.memberOrigin);
  if (origin === "SYMMETRY") return null;
  if (origin === "AUTHORED" || origin == null) return "IDENTITY";
  return null;
}

function trimId(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * True when persisted identity is complete and does not alias other ids.
 * Incomplete / aliased identity is treated as absent (mint on SAVE).
 */
export function readPersistedFamilyIdentity(
  entry: FamilyIdentitySource | null | undefined,
  args?: { authoringStrategyId?: string; positionId?: string }
): FamilyIdentityFields | null {
  if (!entry) return null;
  const familyId = trimId(entry.familyId);
  const memberId = trimId(entry.memberId);
  if (!isValidFamilyId(familyId) || !isValidMemberId(memberId)) return null;

  const authoringStrategyId = trimId(
    args?.authoringStrategyId ?? entry.authoringStrategyId
  );
  if (authoringStrategyId && familyId === authoringStrategyId) return null;

  const positionId = trimId(args?.positionId);
  if (positionId && memberId === positionId) return null;
  if (familyId === memberId) return null;

  const memberOrigin = parseMemberOrigin(entry.memberOrigin);
  const generatedFromRaw = trimId(entry.generatedFromMemberId);
  const generatedFromMemberId =
    isValidMemberId(generatedFromRaw) && generatedFromRaw !== memberId
      ? generatedFromRaw
      : undefined;
  const symmetryOp = parseSymmetryOp(entry.symmetryOp);
  const derivedRule = parseDerivedRule(entry.derivedRule);
  const derivedStep = normalizeDerivedStep(entry.derivedStep);

  const lineage: Pick<
    FamilyIdentityFields,
    "generatedFromMemberId" | "symmetryOp" | "derivedRule" | "derivedStep"
  > =
    memberOrigin === "AUTHORED"
      ? {}
      : {
          ...(generatedFromMemberId ? { generatedFromMemberId } : {}),
          ...(symmetryOp ? { symmetryOp } : {}),
          ...(derivedRule ? { derivedRule } : {}),
          ...(derivedStep ? { derivedStep } : {}),
        };

  return {
    familyId,
    memberId,
    ...(memberOrigin ? { memberOrigin } : {}),
    ...lineage,
  };
}

export function deriveStorageGeneration(
  identity: FamilyIdentityFields | null | undefined
): FamilyStorageGeneration {
  if (
    identity &&
    isValidFamilyId(identity.familyId) &&
    isValidMemberId(identity.memberId)
  ) {
    return "FAMILY_NATIVE";
  }
  return "LEGACY";
}

export function resolveExplicitFamilyIdentityForUpdate(
  identity: FamilyIdentitySource | null | undefined,
  args?: { authoringStrategyId?: string; positionId?: string }
): (Required<Pick<FamilyIdentityFields, "familyId" | "memberId">> &
  Pick<FamilyIdentityFields, "memberOrigin">) | null {
  const existing = readPersistedFamilyIdentity(identity, args);
  if (!existing?.familyId) return null;
  if (existing.memberOrigin !== "AUTHORED" && existing.generatedFromMemberId) {
    return {
      familyId: existing.familyId,
      memberId: existing.generatedFromMemberId,
      memberOrigin: "AUTHORED",
    };
  }
  if (existing.memberId) {
    return {
      familyId: existing.familyId,
      memberId: existing.memberId,
      memberOrigin: "AUTHORED",
    };
  }
  return null;
}

export type ValidateFamilyProvenanceResult =
  | { ok: true }
  | { ok: false; reason: string };

export function validateFamilyProvenance(
  entry: Pick<
    FamilyIdentityFields,
    | "memberOrigin"
    | "generatedFromMemberId"
    | "symmetryOp"
    | "derivedRule"
    | "derivedStep"
  > | null | undefined
): ValidateFamilyProvenanceResult {
  if (!entry) return { ok: true };
  const origin = parseMemberOrigin(entry.memberOrigin);
  const generatedFrom = trimId(entry.generatedFromMemberId);
  const symmetryOp = parseSymmetryOp(entry.symmetryOp);
  const derivedRule = parseDerivedRule(entry.derivedRule);
  const derivedStep = normalizeDerivedStep(entry.derivedStep);

  if (origin === "AUTHORED" || origin == null) {
    if (generatedFrom || symmetryOp || derivedRule || derivedStep) {
      return { ok: false, reason: "AUTHORED must not carry derived/symmetry lineage" };
    }
    return { ok: true };
  }

  if (origin === "SYMMETRY") {
    if (!generatedFrom || !symmetryOp) {
      return { ok: false, reason: "SYMMETRY requires generatedFromMemberId + symmetryOp" };
    }
    if (derivedRule || derivedStep) {
      return { ok: false, reason: "SYMMETRY must not carry derivedRule/derivedStep" };
    }
    return { ok: true };
  }

  if (isDerivedMemberOrigin(origin)) {
    if (!generatedFrom) {
      return { ok: false, reason: `${origin} requires generatedFromMemberId` };
    }
    if (!derivedRule) {
      return { ok: false, reason: `${origin} requires derivedRule` };
    }
    if (!derivedStep) {
      return { ok: false, reason: `${origin} requires derivedStep` };
    }
    if (symmetryOp) {
      return { ok: false, reason: `${origin} must not carry symmetryOp` };
    }
    const expected = expectedDerivedRuleForOrigin(origin);
    if (expected && derivedRule !== expected) {
      return {
        ok: false,
        reason: `${origin} expects derivedRule ${expected}`,
      };
    }
  }

  return { ok: true };
}

export type GenericFamilyMemberIdentity =
  | { kind: "AUTHORED"; familyId: string }
  | { kind: "SYMMETRY"; familyId: string; symmetryOp: SymmetryOp }
  | {
      kind: "DERIVED";
      familyId: string;
      generatedFromMemberId: string;
      derivedRule: DerivedRule;
      derivedStep: DerivedStep;
    };

export function resolveGenericFamilyMemberIdentity(
  entry: FamilyIdentitySource | null | undefined,
  args?: { authoringStrategyId?: string; positionId?: string }
): GenericFamilyMemberIdentity | null {
  const identity = readPersistedFamilyIdentity(entry, args);
  if (!identity?.familyId) return null;
  const provenance = validateFamilyProvenance(identity);
  if (!provenance.ok) return null;
  if (identity.memberOrigin === "SYMMETRY" && identity.symmetryOp) {
    return {
      kind: "SYMMETRY",
      familyId: identity.familyId,
      symmetryOp: identity.symmetryOp,
    };
  }
  if (
    isDerivedMemberOrigin(identity.memberOrigin) &&
    identity.generatedFromMemberId &&
    identity.derivedRule &&
    identity.derivedStep
  ) {
    return {
      kind: "DERIVED",
      familyId: identity.familyId,
      generatedFromMemberId: identity.generatedFromMemberId,
      derivedRule: identity.derivedRule,
      derivedStep: identity.derivedStep,
    };
  }
  return {
    kind: "AUTHORED",
    familyId: identity.familyId,
  };
}

export function genericFamilyMemberIdentityKey(
  identity: GenericFamilyMemberIdentity | null | undefined
): string | null {
  if (!identity) return null;
  if (identity.kind === "AUTHORED") {
    return `family:${identity.familyId}|base:AUTHORED`;
  }
  if (identity.kind === "SYMMETRY") {
    return `family:${identity.familyId}|sym:${identity.symmetryOp}`;
  }
  return [
    `family:${identity.familyId}`,
    `src:${identity.generatedFromMemberId}`,
    `rule:${identity.derivedRule}`,
    `step:${identity.derivedStep}`,
  ].join("|");
}

export function resolveFamilyIdentityForSave(args: {
  saveIntent?: FamilySaveIntent;
  explicitIdentity?: FamilyIdentitySource | null;
  authoringStrategyId?: string;
  positionId?: string;
}): (Required<Pick<FamilyIdentityFields, "familyId" | "memberId">> &
  Pick<FamilyIdentityFields, "memberOrigin">) | null {
  if (args.saveIntent === "UPDATE") {
    return resolveExplicitFamilyIdentityForUpdate(args.explicitIdentity, {
      authoringStrategyId: args.authoringStrategyId,
      positionId: args.positionId,
    });
  }
  return {
    familyId: mintFamilyId(),
    memberId: mintMemberId(),
    memberOrigin: "AUTHORED",
  };
}

export function familyIdentityPersistPatch(
  identity: FamilyIdentitySource | null | undefined,
  positionId?: string
): FamilyIdentityFields {
  const complete = readPersistedFamilyIdentity(identity, {
    authoringStrategyId: identity?.authoringStrategyId,
    positionId,
  });
  if (!complete) return {};
  return {
    familyId: complete.familyId,
    memberId: complete.memberId,
    ...(complete.memberOrigin ? { memberOrigin: complete.memberOrigin } : {}),
    ...(complete.generatedFromMemberId
      ? { generatedFromMemberId: complete.generatedFromMemberId }
      : {}),
    ...(complete.symmetryOp ? { symmetryOp: complete.symmetryOp } : {}),
    ...(complete.derivedRule ? { derivedRule: complete.derivedRule } : {}),
    ...(complete.derivedStep ? { derivedStep: complete.derivedStep } : {}),
  };
}

/**
 * Dual-read adapter: native identity → FAMILY_NATIVE view;
 * missing identity → LEGACY view with null ids (no invented grouping).
 */
export function projectFamilyAwareView(
  record: PositionRecord,
  slot: StrategyEntry["slot"]
): FamilyAwareEntryView | null {
  const entry = record.strategies?.[slot];
  if (!entry) return null;

  const identity = readPersistedFamilyIdentity(entry, {
    authoringStrategyId: entry.authoringStrategyId,
    positionId: record.positionId,
  });
  const storageGeneration = deriveStorageGeneration(identity);
  const familyId = identity?.familyId ?? null;
  const memberId = identity?.memberId ?? null;
  const track = entry.track && String(entry.track).trim() ? String(entry.track) : "B2T_L";

  return {
    storageGeneration,
    master: {
      familyId,
      storageGeneration,
      signature: entry.signature,
      sysInputs: { ...(entry.sysInputs ?? {}) },
      corrections: entry.corrections,
      hpT: entry.hpT,
      str: entry.str,
      ai: entry.ai,
    },
    member: {
      familyId,
      memberId,
      storageGeneration,
      ...(identity?.memberOrigin ? { memberOrigin: identity.memberOrigin } : {}),
      ...(identity?.generatedFromMemberId
        ? { generatedFromMemberId: identity.generatedFromMemberId }
        : {}),
      ...(identity?.symmetryOp ? { symmetryOp: identity.symmetryOp } : {}),
      positionId: record.positionId,
      slot,
      track,
      balls: record.balls,
      ...(record.targetBall === "yellow" || record.targetBall === "red"
        ? { targetBall: record.targetBall }
        : {}),
    },
  };
}

export function projectFamilyAwareViewsForRecord(
  record: PositionRecord
): FamilyAwareEntryView[] {
  const out: FamilyAwareEntryView[] = [];
  for (const slot of ["S1", "S2", "S3"] as const) {
    const view = projectFamilyAwareView(record, slot);
    if (view) out.push(view);
  }
  return out;
}

/** Test / guard helper — identities must stay distinct. */
export function assertDistinctFamilyIdentities(args: {
  familyId: string;
  memberId: string;
  authoringStrategyId?: string;
  positionId?: string;
  slot?: StrategyEntry["slot"];
}): void {
  const { familyId, memberId, authoringStrategyId, positionId, slot } = args;
  if (!isValidFamilyId(familyId)) {
    throw new Error("invalid familyId");
  }
  if (!isValidMemberId(memberId)) {
    throw new Error("invalid memberId");
  }
  if (familyId === memberId) {
    throw new Error("familyId must not equal memberId");
  }
  if (authoringStrategyId && familyId === authoringStrategyId) {
    throw new Error("familyId must not equal authoringStrategyId");
  }
  if (positionId && memberId === positionId) {
    throw new Error("memberId must not equal positionId");
  }
  if (positionId && slot) {
    const strategyRef = `${positionId}.${slot}`;
    if (familyId === strategyRef || memberId === strategyRef) {
      throw new Error("family/member id must not equal strategyRef");
    }
  }
}
