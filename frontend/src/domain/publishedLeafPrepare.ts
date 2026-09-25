/**
 * Phase D-2 — Single owner: existing leaf (v2|v3|absent) → D-1 mutation → v3 candidate.
 *
 * No filesystem / Git / UI. Fail-closed on invalid v2 conversion (no silent drop).
 */

import {
  normalizeDatasetExport,
  type DatasetExportPayload,
} from "./datasetExport";
import {
  DATASET_EXPORT_SCHEMA_VERSION,
  systemIdToFolderLabel,
} from "./datasetPath";
import {
  composeNormalizedDatasetEnvelope,
  isFlatLegacyDataset,
  isNormalizedDataset,
  parseNormalizedDatasetEnvelope,
  type NormalizedDatasetEnvelope,
  type NormalizedDatasetIssue,
} from "./dataset/normalizedDatasetEnvelope";
import { migratePositionRecordsToFamilyParts } from "./family/migratePositionRecordsToFamilyParts";
import { repairLegacyV2MissingMeta } from "./family/legacyV2MetaRepair";
import { validatePublishedExportCandidate } from "./publishedFamilyPublish";
import {
  applyPublishFamilyToNormalizedLeaf,
  createEmptyNormalizedPublishedLeaf,
  type NormalizedLeafMeta,
  type PublishNormalizedLeafFailCode,
} from "./publishedNormalizedLeafMutation";
import {
  remapPublishFamilyPayloadFamilyId,
  type PublishFamilyPayload,
} from "./publishFamilyPayload";
import type { PublishOperation } from "./publishOperation";
import {
  classifyResolvablePublishOverwrite,
  type ResolvablePublishOverwriteConflict,
} from "./publishOccupancy";

export type PublishedLeafKind = "absent" | "v2" | "v3" | "invalid";

/** Execution-time confirmed overwrite (History snapshot unchanged). */
export type ConfirmedPublishOverwrite = {
  targetFamilyId: string;
  expectedLeafRevision: string;
};

export type PrepareNormalizedPublishFail = {
  ok: false;
  code:
    | PublishNormalizedLeafFailCode
    | "EXISTING_LEAF_INVALID"
    | "V2_CONVERSION_FAILED"
    | "RESOLVABLE_PUBLISH_OVERWRITE"
    | "STALE_LEAF_REVISION"
    | "CONFIRMED_OVERWRITE_INVALID";
  reason: string;
  issues: string[];
  validationIssues?: NormalizedDatasetIssue[];
  /** Present when CREATE occupancy is user-confirmable Family replacement. */
  conflict?: ResolvablePublishOverwriteConflict;
  /** SHA-256 of current leaf file bytes (or empty leaf sentinel). */
  leafRevision?: string;
};

export type PrepareNormalizedPublishOk = {
  ok: true;
  candidate: NormalizedDatasetEnvelope;
  existingKind: PublishedLeafKind;
  createRetryReplaced: boolean;
  purgedFamilyIds: string[];
  insertedFamilyId: string;
  /** True when execution used confirmed Family replacement remap. */
  confirmedOverwriteApplied?: boolean;
};

export type PrepareNormalizedPublishResult =
  | PrepareNormalizedPublishOk
  | PrepareNormalizedPublishFail;

function trimStr(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function fail(
  code: PrepareNormalizedPublishFail["code"],
  reason: string,
  issues: string[] = [],
  validationIssues?: NormalizedDatasetIssue[],
  extra?: {
    conflict?: ResolvablePublishOverwriteConflict;
    leafRevision?: string;
  }
): PrepareNormalizedPublishFail {
  return {
    ok: false,
    code,
    reason,
    issues,
    validationIssues,
    ...(extra?.conflict ? { conflict: extra.conflict } : {}),
    ...(extra?.leafRevision != null ? { leafRevision: extra.leafRevision } : {}),
  };
}

/**
 * Canonical leaf shape detection (single SSOT for publisher + reader).
 * schemaVersion 3 with masters/members → v3 (never interpret as flat).
 */
export function detectPublishedLeafKind(raw: unknown): PublishedLeafKind {
  if (raw == null) return "absent";
  if (typeof raw !== "object" || Array.isArray(raw)) return "invalid";
  if (isNormalizedDataset(raw)) return "v3";
  if (isFlatLegacyDataset(raw)) return "v2";
  return "invalid";
}

/**
 * Fail-closed flat DatasetExportPayload → NormalizedDatasetEnvelope.
 * Silent skip of legacy StrategyEntries is rejected (skippedLegacySlots > 0).
 *
 * Phase F-2B: EXISTING legacy v2 only — repair missing-but-derivable StrategyEntry.meta
 * via rebuildCanonicalMemberMeta BEFORE strict flat validation. New payloads that
 * never enter this converter remain subject to strict meta-required validation.
 */
export function convertFlatDatasetExportToNormalizedLeaf(
  flat: DatasetExportPayload
):
  | { ok: true; envelope: NormalizedDatasetEnvelope }
  | PrepareNormalizedPublishFail {
  let normalized: DatasetExportPayload;
  try {
    normalized = normalizeDatasetExport(flat);
  } catch (e) {
    return fail("V2_CONVERSION_FAILED", "flat-normalize-failed", [
      e instanceof Error ? e.message : String(e),
    ]);
  }

  // Migration boundary only: repair historical meta omission deterministically.
  const repaired = repairLegacyV2MissingMeta(normalized);
  if (!repaired.ok) {
    return fail("V2_CONVERSION_FAILED", repaired.reason, repaired.issues);
  }
  normalized = repaired.payload;

  const validated = validatePublishedExportCandidate(normalized);
  if (!validated.ok) {
    return fail(
      "V2_CONVERSION_FAILED",
      "flat-leaf-validation-failed",
      validated.issues
    );
  }

  const shotType = trimStr(normalized.shotType);
  const systemId = trimStr(normalized.systemId);
  const systemLabel =
    trimStr(normalized.systemLabel) ||
    (systemId ? systemIdToFolderLabel(systemId) : "");
  if (!shotType || !systemId || !systemLabel) {
    return fail("V2_CONVERSION_FAILED", "flat-leaf-meta-incomplete", [
      !shotType ? "shotType:empty" : "",
      !systemId ? "systemId:empty" : "",
      !systemLabel ? "systemLabel:empty" : "",
    ].filter(Boolean));
  }

  const records = Array.isArray(normalized.records) ? normalized.records : [];
  if (records.length === 0) {
    const empty = createEmptyNormalizedPublishedLeaf({
      shotType,
      systemId,
      systemLabel,
    });
    if (!empty.ok) {
      return fail(empty.code, empty.reason, empty.issues, empty.validationIssues);
    }
    const withMeta: NormalizedDatasetEnvelope = {
      ...empty.envelope,
      ...(normalized.exportedAt
        ? { exportedAt: normalized.exportedAt }
        : {}),
      ...(normalized.sourceSnapshotId
        ? { sourceSnapshotId: normalized.sourceSnapshotId }
        : {}),
    };
    const parsed = parseNormalizedDatasetEnvelope(withMeta);
    if (!parsed.ok) {
      return fail(
        "V2_CONVERSION_FAILED",
        "empty-converted-leaf-invalid",
        parsed.issues.map((i) => `${i.code}:${i.reason}`),
        parsed.issues
      );
    }
    return { ok: true, envelope: parsed.envelope };
  }

  const migrated = migratePositionRecordsToFamilyParts(records);
  if (!migrated.ok) {
    return fail(
      "V2_CONVERSION_FAILED",
      "flat-migrate-failed",
      migrated.issues.map(
        (i) => `${i.code}:${i.reason}${i.familyId ? `:${i.familyId}` : ""}`
      )
    );
  }

  // Fail-closed: no silent drop of StrategyEntries that could not migrate.
  if (migrated.skippedLegacySlots > 0) {
    return fail("V2_CONVERSION_FAILED", "flat-legacy-slots-not-migratable", [
      `skippedLegacySlots:${migrated.skippedLegacySlots}`,
      "silent-drop-forbidden",
    ]);
  }

  if (migrated.masters.length === 0 && migrated.members.length === 0) {
    // Records existed but produced zero families without skips — still unsafe.
    return fail("V2_CONVERSION_FAILED", "flat-migrate-produced-empty-family-set", [
      `records:${records.length}`,
    ]);
  }

  const raw = composeNormalizedDatasetEnvelope({
    shotType,
    systemId,
    systemLabel,
    exportedAt: normalized.exportedAt,
    sourceSnapshotId: normalized.sourceSnapshotId,
    masters: migrated.masters,
    members: migrated.members,
  });
  const parsed = parseNormalizedDatasetEnvelope(raw);
  if (!parsed.ok) {
    return fail(
      "V2_CONVERSION_FAILED",
      "converted-leaf-validation-failed",
      parsed.issues.map((i) => `${i.code}:${i.reason}`),
      parsed.issues
    );
  }
  return { ok: true, envelope: parsed.envelope };
}

/**
 * Resolve existing raw JSON into a validated normalized base leaf.
 */
export function resolveExistingNormalizedLeafBase(args: {
  raw: unknown | null | undefined;
  leafMeta: NormalizedLeafMeta;
}):
  | {
      ok: true;
      envelope: NormalizedDatasetEnvelope;
      kind: PublishedLeafKind;
    }
  | PrepareNormalizedPublishFail {
  const kind =
    args.raw == null || args.raw === undefined
      ? "absent"
      : detectPublishedLeafKind(args.raw);

  if (kind === "absent") {
    const empty = createEmptyNormalizedPublishedLeaf(args.leafMeta);
    if (!empty.ok) {
      return fail(empty.code, empty.reason, empty.issues, empty.validationIssues);
    }
    return { ok: true, envelope: empty.envelope, kind: "absent" };
  }

  if (kind === "invalid") {
    return fail("EXISTING_LEAF_INVALID", "existing-leaf-kind-invalid", [
      "leaf:unrecognized-schema",
    ]);
  }

  if (kind === "v3") {
    const parsed = parseNormalizedDatasetEnvelope(deepClone(args.raw));
    if (!parsed.ok) {
      return fail(
        "EXISTING_LEAF_INVALID",
        "existing-v3-invalid",
        parsed.issues.map((i) => `${i.code}:${i.reason}`),
        parsed.issues
      );
    }
    const env = parsed.envelope;
    const shotType = trimStr(args.leafMeta.shotType);
    const systemId = trimStr(args.leafMeta.systemId);
    const systemLabel =
      trimStr(args.leafMeta.systemLabel) ||
      (systemId ? systemIdToFolderLabel(systemId) : "");
    if (
      env.shotType !== shotType ||
      env.systemId !== systemId ||
      (systemLabel && env.systemLabel !== systemLabel)
    ) {
      return fail("EXISTING_LEAF_INVALID", "existing-v3-meta-mismatch", [
        `existing:${env.shotType}/${env.systemId}/${env.systemLabel}`,
        `target:${shotType}/${systemId}/${systemLabel}`,
      ]);
    }
    return { ok: true, envelope: env, kind: "v3" };
  }

  // v2
  let flat: DatasetExportPayload;
  try {
    flat = normalizeDatasetExport(args.raw as DatasetExportPayload);
  } catch (e) {
    return fail("EXISTING_LEAF_INVALID", "existing-v2-normalize-failed", [
      e instanceof Error ? e.message : String(e),
    ]);
  }

  // Ensure schemaVersion stamp for convert path
  if (
    flat.schemaVersion !== DATASET_EXPORT_SCHEMA_VERSION &&
    flat.schemaVersion !== 1 &&
    flat.schemaVersion !== 2
  ) {
    // normalizeDatasetExport usually sets version; still fail-closed if weird
  }

  const shotType = trimStr(args.leafMeta.shotType);
  const systemId = trimStr(args.leafMeta.systemId);
  const systemLabel =
    trimStr(args.leafMeta.systemLabel) ||
    (systemId ? systemIdToFolderLabel(systemId) : "");
  if (
    trimStr(flat.shotType) !== shotType ||
    trimStr(flat.systemId) !== systemId
  ) {
    return fail("EXISTING_LEAF_INVALID", "existing-v2-meta-mismatch", [
      `existing:${flat.shotType}/${flat.systemId}`,
      `target:${shotType}/${systemId}`,
    ]);
  }

  // Prefer path/systemLabel from leafMeta when flat label differs only by folder map
  const converted = convertFlatDatasetExportToNormalizedLeaf({
    ...flat,
    shotType,
    systemId,
    systemLabel: systemLabel || flat.systemLabel,
  });
  if (!converted.ok) return converted;
  return { ok: true, envelope: converted.envelope, kind: "v2" };
}

/**
 * Full prepare: existing raw + PublishOperation + PublishFamilyPayload → v3 candidate.
 *
 * Phase F-2E:
 * - CREATE with resolvable same-slot occupancy → RESOLVABLE_PUBLISH_OVERWRITE (no write)
 * - confirmedOverwrite → remap to existing familyId + UPDATE, with stale revision guard
 */
export function prepareNormalizedPublishCandidate(args: {
  existingRaw: unknown | null | undefined;
  operation: PublishOperation;
  payload: PublishFamilyPayload;
  leafMeta: NormalizedLeafMeta;
  exportedAt?: string;
  sourceSnapshotId?: string;
  /** SHA-256 of current leaf file bytes; required for conflict token / stale check. */
  leafRevision?: string;
  /** User-confirmed Family replacement (History snapshot not mutated). */
  confirmedOverwrite?: ConfirmedPublishOverwrite | null;
}): PrepareNormalizedPublishResult {
  const base = resolveExistingNormalizedLeafBase({
    raw: args.existingRaw,
    leafMeta: args.leafMeta,
  });
  if (!base.ok) return base;

  const leafRevision = trimStr(args.leafRevision);

  // Confirmed overwrite path: execution-time UPDATE against surviving familyId.
  if (args.confirmedOverwrite) {
    const targetFamilyId = trimStr(args.confirmedOverwrite.targetFamilyId);
    const expected = trimStr(args.confirmedOverwrite.expectedLeafRevision);
    if (!targetFamilyId || !expected) {
      return fail("CONFIRMED_OVERWRITE_INVALID", "confirmed-overwrite-incomplete", [
        !targetFamilyId ? "targetFamilyId:empty" : "",
        !expected ? "expectedLeafRevision:empty" : "",
      ].filter(Boolean));
    }
    if (!leafRevision || leafRevision !== expected) {
      return fail(
        "STALE_LEAF_REVISION",
        "leaf-revision-mismatch",
        [
          `expected:${expected}`,
          `actual:${leafRevision || "missing"}`,
        ],
        undefined,
        { leafRevision: leafRevision || undefined }
      );
    }

    // Re-classify against CURRENT base before write.
    const classified = classifyResolvablePublishOverwrite({
      base: base.envelope,
      operation: args.operation,
      payload: args.payload,
    });
    if (classified.kind !== "RESOLVABLE_PUBLISH_OVERWRITE") {
      return fail(
        "CONFIRMED_OVERWRITE_INVALID",
        "confirmed-overwrite-no-longer-resolvable",
        [
          `classify:${classified.kind}`,
          classified.kind === "HARD_OCCUPANCY_CONFLICT"
            ? `reason:${classified.reason}`
            : "no-cross-family-conflict",
        ],
        undefined,
        { leafRevision }
      );
    }
    if (classified.conflict.existingFamilyId !== targetFamilyId) {
      return fail(
        "STALE_LEAF_REVISION",
        "overwrite-target-family-changed",
        [
          `expected-target:${targetFamilyId}`,
          `actual-target:${classified.conflict.existingFamilyId}`,
        ],
        undefined,
        { leafRevision, conflict: classified.conflict }
      );
    }

    const remapped = remapPublishFamilyPayloadFamilyId(
      args.payload,
      targetFamilyId
    );
    if (!remapped.ok) {
      return fail(
        "CONFIRMED_OVERWRITE_INVALID",
        remapped.reason,
        remapped.issues,
        undefined,
        { leafRevision }
      );
    }

    const updateOperation: PublishOperation = {
      schemaVersion: 1,
      intent: "UPDATE",
      sourceFamilyId: targetFamilyId,
      destinationFamilyId: targetFamilyId,
    };

    const applied = applyPublishFamilyToNormalizedLeaf({
      existing: base.envelope,
      operation: updateOperation,
      payload: remapped.payload,
      leafMeta: args.leafMeta,
      exportedAt: args.exportedAt,
      sourceSnapshotId: args.sourceSnapshotId,
    });
    if (!applied.ok) {
      return fail(
        applied.code,
        applied.reason,
        applied.issues,
        applied.validationIssues,
        { leafRevision }
      );
    }

    return {
      ok: true,
      candidate: applied.envelope,
      existingKind: base.kind,
      createRetryReplaced: applied.createRetryReplaced,
      purgedFamilyIds: applied.purgedFamilyIds,
      insertedFamilyId: applied.insertedFamilyId,
      confirmedOverwriteApplied: true,
    };
  }

  const applied = applyPublishFamilyToNormalizedLeaf({
    existing: base.envelope,
    operation: args.operation,
    payload: args.payload,
    leafMeta: args.leafMeta,
    exportedAt: args.exportedAt,
    sourceSnapshotId: args.sourceSnapshotId,
  });
  if (!applied.ok) {
    if (
      applied.code === "POSITION_STRATEGY_SLOT_CONFLICT" &&
      args.operation.intent === "CREATE"
    ) {
      const classified = classifyResolvablePublishOverwrite({
        base: base.envelope,
        operation: args.operation,
        payload: args.payload,
      });
      if (classified.kind === "RESOLVABLE_PUBLISH_OVERWRITE") {
        return fail(
          "RESOLVABLE_PUBLISH_OVERWRITE",
          "resolvable-publish-overwrite",
          [
            `existingFamilyId:${classified.conflict.existingFamilyId}`,
            `incomingFamilyId:${classified.conflict.incomingFamilyId}`,
            `authored:${classified.conflict.authoredPositionId}|${classified.conflict.authoredSourceSlot}`,
            `conflicts:${classified.conflict.conflictCount}`,
          ],
          applied.validationIssues,
          {
            conflict: classified.conflict,
            leafRevision: leafRevision || undefined,
          }
        );
      }
    }
    return fail(
      applied.code,
      applied.reason,
      applied.issues,
      applied.validationIssues,
      { leafRevision: leafRevision || undefined }
    );
  }

  return {
    ok: true,
    candidate: applied.envelope,
    existingKind: base.kind,
    createRetryReplaced: applied.createRetryReplaced,
    purgedFamilyIds: applied.purgedFamilyIds,
    insertedFamilyId: applied.insertedFamilyId,
  };
}
