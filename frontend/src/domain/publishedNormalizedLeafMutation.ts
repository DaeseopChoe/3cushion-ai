/**
 * Phase D-1 — Pure normalized whole-leaf Publish mutation.
 *
 * existing NormalizedDatasetEnvelope
 *   + PublishOperation
 *   + PublishFamilyPayload (flat snapshot-bound family slice)
 * → validated candidate NormalizedDatasetEnvelope
 *
 * Does NOT write filesystem, Git, Vite, History UI, or Published Search.
 * Does NOT re-read Local DB — Family comes from snapshot-bound payload only.
 */

import { systemIdToFolderLabel } from "./datasetPath";
import {
  NORMALIZED_DATASET_SCHEMA_VERSION,
  composeNormalizedDatasetEnvelope,
  parseNormalizedDatasetEnvelope,
  type NormalizedDatasetEnvelope,
  type NormalizedDatasetIssue,
} from "./dataset/normalizedDatasetEnvelope";
import { migratePositionRecordsToFamilyParts } from "./family/migratePositionRecordsToFamilyParts";
import type { FamilyMaster, FamilyMember } from "./family/familyNormalizedSchema";
import { rematerializeFamilyPartsToPositionRecords } from "./family/rematerializeFamilyPartsToPositionRecords";
import {
  validatePublishOperation,
  type PublishOperation,
} from "./publishOperation";
import {
  crossValidateOperationAndPayload,
  validatePublishFamilyPayload,
  type PublishFamilyPayload,
} from "./publishFamilyPayload";
import type { PositionRecord } from "./positionSearchEngine";

export type NormalizedLeafMeta = {
  shotType: string;
  systemId: string;
  systemLabel?: string;
};

export type PublishNormalizedLeafFailCode =
  | "INVALID_EXISTING_LEAF"
  | "INVALID_PUBLISH_OPERATION"
  | "INVALID_FAMILY_PAYLOAD"
  | "OPERATION_PAYLOAD_MISMATCH"
  | "FAMILY_CONVERSION_FAILED"
  | "LEAF_META_REQUIRED"
  | "LEAF_META_CONFLICT"
  | "UPDATE_SOURCE_NOT_FOUND"
  | "DESTINATION_FAMILY_CONFLICT"
  | "POSITION_STRATEGY_SLOT_CONFLICT"
  | "CANDIDATE_VALIDATION_FAILED";

export type PublishNormalizedLeafFail = {
  ok: false;
  code: PublishNormalizedLeafFailCode;
  reason: string;
  issues: string[];
  validationIssues?: NormalizedDatasetIssue[];
};

export type PublishNormalizedLeafOk = {
  ok: true;
  envelope: NormalizedDatasetEnvelope;
  /** CREATE with destination already present → idempotent full replacement. */
  createRetryReplaced: boolean;
  purgedFamilyIds: string[];
  insertedFamilyId: string;
};

export type PublishNormalizedLeafResult =
  | PublishNormalizedLeafOk
  | PublishNormalizedLeafFail;

export type ConvertPublishFamilyPayloadOk = {
  ok: true;
  master: FamilyMaster;
  members: FamilyMember[];
};

export type ConvertPublishFamilyPayloadFail = {
  ok: false;
  code: "INVALID_FAMILY_PAYLOAD" | "FAMILY_CONVERSION_FAILED";
  reason: string;
  issues: string[];
};

export type ConvertPublishFamilyPayloadResult =
  | ConvertPublishFamilyPayloadOk
  | ConvertPublishFamilyPayloadFail;

function trimStr(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function fail(
  code: PublishNormalizedLeafFailCode,
  reason: string,
  issues: string[] = [],
  validationIssues?: NormalizedDatasetIssue[]
): PublishNormalizedLeafFail {
  return { ok: false, code, reason, issues, validationIssues };
}

function sortMasters(masters: FamilyMaster[]): FamilyMaster[] {
  return [...masters].sort((a, b) => a.familyId.localeCompare(b.familyId));
}

function sortMembers(members: FamilyMember[]): FamilyMember[] {
  return [...members].sort((a, b) => a.memberId.localeCompare(b.memberId));
}

function collectFamilyIds(envelope: NormalizedDatasetEnvelope): Set<string> {
  const ids = new Set<string>();
  for (const m of envelope.familyMasters) ids.add(m.familyId);
  for (const m of envelope.familyMembers) ids.add(m.familyId);
  return ids;
}

function resolveSystemLabel(meta: NormalizedLeafMeta): string {
  const systemId = trimStr(meta.systemId);
  return trimStr(meta.systemLabel) || (systemId ? systemIdToFolderLabel(systemId) : "");
}

/**
 * Pure empty normalized published leaf (zero Families).
 * No filesystem access.
 */
export function createEmptyNormalizedPublishedLeaf(
  meta: NormalizedLeafMeta
): PublishNormalizedLeafResult {
  const shotType = trimStr(meta.shotType);
  const systemId = trimStr(meta.systemId);
  const systemLabel = resolveSystemLabel(meta);
  if (!shotType || !systemId || !systemLabel) {
    return fail("LEAF_META_REQUIRED", "leaf-meta-incomplete", [
      !shotType ? "shotType:empty" : "",
      !systemId ? "systemId:empty" : "",
      !systemLabel ? "systemLabel:empty" : "",
    ].filter(Boolean));
  }
  const raw = composeNormalizedDatasetEnvelope({
    shotType,
    systemId,
    systemLabel,
    masters: [],
    members: [],
  });
  const parsed = parseNormalizedDatasetEnvelope(raw);
  if (!parsed.ok) {
    return fail(
      "CANDIDATE_VALIDATION_FAILED",
      "empty-leaf-validation-failed",
      parsed.issues.map((i) => `${i.code}:${i.reason}`),
      parsed.issues
    );
  }
  return {
    ok: true,
    envelope: parsed.envelope,
    createRetryReplaced: false,
    purgedFamilyIds: [],
    insertedFamilyId: "",
  };
}

/**
 * Snapshot-bound PublishFamilyPayload → exactly one FamilyMaster + Members.
 * Reuses migratePositionRecordsToFamilyParts (no duplicate migration logic).
 * Does not mutate input payload.
 */
export function convertPublishFamilyPayloadToNormalizedFamily(
  payload: PublishFamilyPayload
): ConvertPublishFamilyPayloadResult {
  const validated = validatePublishFamilyPayload(payload);
  if (!validated.ok) {
    return {
      ok: false,
      code: "INVALID_FAMILY_PAYLOAD",
      reason: validated.reason,
      issues: validated.issues,
    };
  }

  const migrated = migratePositionRecordsToFamilyParts(
    validated.payload.records
  );
  if (!migrated.ok) {
    return {
      ok: false,
      code: "FAMILY_CONVERSION_FAILED",
      reason: "migrate-position-records-failed",
      issues: migrated.issues.map(
        (i) => `${i.code}:${i.reason}${i.familyId ? `:${i.familyId}` : ""}`
      ),
    };
  }

  if (migrated.masters.length !== 1) {
    return {
      ok: false,
      code: "FAMILY_CONVERSION_FAILED",
      reason: "expected-exactly-one-family",
      issues: [
        `masters:${migrated.masters.length}`,
        ...migrated.masters.map((m) => `family:${m.familyId}`),
      ],
    };
  }

  const master = deepClone(migrated.masters[0]!);
  const members = deepClone(migrated.members);
  const expectedFamilyId = validated.payload.familyId;

  if (master.familyId !== expectedFamilyId) {
    return {
      ok: false,
      code: "FAMILY_CONVERSION_FAILED",
      reason: "master-familyId-mismatch",
      issues: [`master:${master.familyId}`, `payload:${expectedFamilyId}`],
    };
  }

  for (const member of members) {
    if (member.familyId !== expectedFamilyId) {
      return {
        ok: false,
        code: "FAMILY_CONVERSION_FAILED",
        reason: "mixed-family-members",
        issues: [
          `member:${member.memberId}`,
          `family:${member.familyId}`,
          `expected:${expectedFamilyId}`,
        ],
      };
    }
  }

  if (members.length === 0) {
    return {
      ok: false,
      code: "FAMILY_CONVERSION_FAILED",
      reason: "no-members-after-migrate",
      issues: [`family:${expectedFamilyId}`],
    };
  }

  return { ok: true, master, members };
}

function resolveExistingLeaf(
  existing: NormalizedDatasetEnvelope | null | undefined,
  leafMeta?: NormalizedLeafMeta | null
):
  | { ok: true; envelope: NormalizedDatasetEnvelope }
  | PublishNormalizedLeafFail {
  if (existing == null) {
    if (!leafMeta) {
      return fail("LEAF_META_REQUIRED", "empty-leaf-requires-meta", [
        "leafMeta:missing",
      ]);
    }
    const empty = createEmptyNormalizedPublishedLeaf(leafMeta);
    if (!empty.ok) return empty;
    return { ok: true, envelope: empty.envelope };
  }

  const parsed = parseNormalizedDatasetEnvelope(deepClone(existing));
  if (!parsed.ok) {
    return fail(
      "INVALID_EXISTING_LEAF",
      "existing-leaf-invalid",
      parsed.issues.map((i) => `${i.code}:${i.reason}`),
      parsed.issues
    );
  }

  if (leafMeta) {
    const shotType = trimStr(leafMeta.shotType);
    const systemId = trimStr(leafMeta.systemId);
    const systemLabel = resolveSystemLabel(leafMeta);
    const env = parsed.envelope;
    if (
      (shotType && shotType !== env.shotType) ||
      (systemId && systemId !== env.systemId) ||
      (systemLabel && systemLabel !== env.systemLabel)
    ) {
      return fail("LEAF_META_CONFLICT", "leaf-meta-conflicts-with-existing", [
        `existing:${env.shotType}/${env.systemId}/${env.systemLabel}`,
        `provided:${shotType}/${systemId}/${systemLabel}`,
      ]);
    }
  }

  return { ok: true, envelope: parsed.envelope };
}

function buildCandidateEnvelope(
  base: NormalizedDatasetEnvelope,
  masters: FamilyMaster[],
  members: FamilyMember[],
  opts?: { exportedAt?: string; sourceSnapshotId?: string }
): PublishNormalizedLeafResult {
  const raw = composeNormalizedDatasetEnvelope({
    shotType: base.shotType,
    systemId: base.systemId,
    systemLabel: base.systemLabel,
    exportedAt: opts?.exportedAt ?? base.exportedAt,
    sourceSnapshotId: opts?.sourceSnapshotId ?? base.sourceSnapshotId,
    masters: sortMasters(masters),
    members: sortMembers(members),
  });
  const parsed = parseNormalizedDatasetEnvelope(raw);
  if (!parsed.ok) {
    const occupancy = parsed.issues.some(
      (i) => i.code === "POSITION_STRATEGY_SLOT_CONFLICT"
    );
    return fail(
      occupancy
        ? "POSITION_STRATEGY_SLOT_CONFLICT"
        : "CANDIDATE_VALIDATION_FAILED",
      occupancy
        ? "position-strategy-slot-conflict"
        : "candidate-validation-failed",
      parsed.issues.map((i) => `${i.code}:${i.reason}`),
      parsed.issues
    );
  }
  return {
    ok: true,
    envelope: parsed.envelope,
    createRetryReplaced: false,
    purgedFamilyIds: [],
    insertedFamilyId: "",
  };
}

/**
 * Apply snapshot-bound PublishOperation + PublishFamilyPayload onto an
 * existing (or empty) normalized whole leaf. Pure — no input mutation.
 */
export function applyPublishFamilyToNormalizedLeaf(args: {
  existing?: NormalizedDatasetEnvelope | null;
  operation: PublishOperation;
  payload: PublishFamilyPayload;
  /** Required when existing is null/undefined. Optional consistency check otherwise. */
  leafMeta?: NormalizedLeafMeta | null;
  exportedAt?: string;
  sourceSnapshotId?: string;
}): PublishNormalizedLeafResult {
  const opResult = validatePublishOperation(args.operation);
  if (!opResult.ok) {
    return fail(
      "INVALID_PUBLISH_OPERATION",
      opResult.reason,
      opResult.issues
    );
  }
  const operation = opResult.operation;

  const payloadResult = validatePublishFamilyPayload(args.payload);
  if (!payloadResult.ok) {
    return fail(
      "INVALID_FAMILY_PAYLOAD",
      payloadResult.reason,
      payloadResult.issues
    );
  }
  const payload = payloadResult.payload;

  const cross = crossValidateOperationAndPayload(operation, payload);
  if (!cross.ok) {
    return fail(
      "OPERATION_PAYLOAD_MISMATCH",
      cross.reason,
      cross.issues
    );
  }

  const converted = convertPublishFamilyPayloadToNormalizedFamily(payload);
  if (!converted.ok) {
    return fail(converted.code, converted.reason, converted.issues);
  }

  const existingResolved = resolveExistingLeaf(args.existing, args.leafMeta);
  if (!existingResolved.ok) return existingResolved;
  const base = existingResolved.envelope;
  const existingFamilyIds = collectFamilyIds(base);

  const dest = operation.destinationFamilyId;
  let purgeIds: string[] = [];
  let createRetryReplaced = false;

  if (operation.intent === "CREATE") {
    // Allowed: same destinationFamilyId → idempotent CREATE retry replacement.
    // Forbidden: different familyId + same Position+Slot → occupancy conflict (validator).
    if (existingFamilyIds.has(dest)) {
      purgeIds = [dest];
      createRetryReplaced = true;
    } else {
      purgeIds = [];
    }
  } else {
    // UPDATE
    const source = operation.sourceFamilyId!;
    if (!existingFamilyIds.has(source)) {
      return fail(
        "UPDATE_SOURCE_NOT_FOUND",
        "update-source-missing",
        [`sourceFamilyId-not-in-leaf:${source}`]
      );
    }
    if (source !== dest && existingFamilyIds.has(dest)) {
      // Destination already occupied by an unrelated Family — fail-closed.
      return fail(
        "DESTINATION_FAMILY_CONFLICT",
        "update-destination-already-present",
        [
          `source:${source}`,
          `destination:${dest}`,
          "destination-family-already-in-leaf",
        ]
      );
    }
    purgeIds = source === dest ? [source] : [source];
    // When source !== dest, only purge source; dest is new.
    // When source === dest, purge then re-insert same id (full replacement).
  }

  const purgeSet = new Set(purgeIds);
  const remainingMasters = base.familyMasters.filter(
    (m) => !purgeSet.has(m.familyId)
  );
  const remainingMembers = base.familyMembers.filter(
    (m) => !purgeSet.has(m.familyId)
  );

  const nextMasters = [
    ...remainingMasters.map((m) => deepClone(m)),
    deepClone(converted.master),
  ];
  const nextMembers = [
    ...remainingMembers.map((m) => deepClone(m)),
    ...converted.members.map((m) => deepClone(m)),
  ];

  const candidate = buildCandidateEnvelope(base, nextMasters, nextMembers, {
    exportedAt: args.exportedAt,
    sourceSnapshotId: args.sourceSnapshotId,
  });
  if (!candidate.ok) return candidate;

  return {
    ok: true,
    envelope: candidate.envelope,
    createRetryReplaced,
    purgedFamilyIds: purgeIds.filter((id) => existingFamilyIds.has(id)),
    insertedFamilyId: dest,
  };
}

/**
 * Semantic equality for normalized published leaves (D-2 readback prep).
 * Parses both sides; compares deterministic JSON after stable Master/Member sort.
 * Includes exportedAt / sourceSnapshotId when present (written leaf must round-trip).
 */
export function normalizedPublishedLeavesSemanticallyEqual(
  a: unknown,
  b: unknown
): boolean {
  const pa = parseNormalizedDatasetEnvelope(
    typeof a === "object" && a != null ? deepClone(a) : a
  );
  const pb = parseNormalizedDatasetEnvelope(
    typeof b === "object" && b != null ? deepClone(b) : b
  );
  if (!pa.ok || !pb.ok) return false;

  const normalize = (env: NormalizedDatasetEnvelope) => {
    const raw = composeNormalizedDatasetEnvelope({
      shotType: env.shotType,
      systemId: env.systemId,
      systemLabel: env.systemLabel,
      exportedAt: env.exportedAt,
      sourceSnapshotId: env.sourceSnapshotId,
      masters: sortMasters(env.familyMasters),
      members: sortMembers(env.familyMembers),
    });
    return JSON.stringify(raw);
  };

  return normalize(pa.envelope) === normalize(pb.envelope);
}

/**
 * Rematerialize a converted family for flat↔normalized parity checks (tests / D-2 prep).
 */
export function rematerializeNormalizedFamilyForParity(args: {
  master: FamilyMaster;
  members: FamilyMember[];
}):
  | { ok: true; records: PositionRecord[] }
  | { ok: false; reason: string; issues: string[] } {
  const remat = rematerializeFamilyPartsToPositionRecords({
    masters: [args.master],
    members: args.members,
  });
  if (!remat.ok) {
    return {
      ok: false,
      reason: "rematerialize-failed",
      issues: remat.issues.map((i) => `${i.code}:${i.reason}`),
    };
  }
  return { ok: true, records: remat.dataset };
}

export { NORMALIZED_DATASET_SCHEMA_VERSION };
