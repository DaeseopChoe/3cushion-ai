/**
 * Phase 3-C2 — Snapshot-bound Publish Family Payload.
 *
 * SAVE-time destination-family PositionRecords (slot-scoped) stored on History.
 * Not written into positions.json. Not full working-corpus embed.
 */

import { normalizeDatasetFromStorage } from "./positionMergeEngine";
import { validateCanonicalDataset } from "./canonicalPersistAudit";
import {
  isValidFamilyId,
  isValidMemberId,
  validateFamilyProvenance,
} from "./family/familyIdentity";
import type { PublishOperation } from "./publishOperation";
import { validatePublishOperation } from "./publishOperation";
import type { PositionRecord, StrategyEntry } from "./positionSearchEngine";

export const PUBLISH_FAMILY_PAYLOAD_SCHEMA_VERSION = 1 as const;

export type PublishFamilyPayload = {
  schemaVersion: typeof PUBLISH_FAMILY_PAYLOAD_SCHEMA_VERSION;
  familyId: string;
  records: PositionRecord[];
};

export type BuildPublishFamilyPayloadResult =
  | { ok: true; payload: PublishFamilyPayload }
  | { ok: false; reason: string; issues: string[] };

export type ValidatePublishFamilyPayloadResult =
  | { ok: true; payload: PublishFamilyPayload }
  | { ok: false; reason: string; issues: string[] };

const SLOT_IDS = ["S1", "S2", "S3"] as const;

function trimId(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function deepCloneRecords(records: PositionRecord[]): PositionRecord[] {
  return JSON.parse(JSON.stringify(records)) as PositionRecord[];
}

/**
 * Extract destination-family Strategy slots only (familyId field match).
 * Unrelated family slots on the same PositionRecord are excluded.
 */
export function extractFamilyScopedRecords(
  dataset: PositionRecord[] | null | undefined,
  familyId: string
): PositionRecord[] {
  const target = trimId(familyId);
  if (!isValidFamilyId(target) || !Array.isArray(dataset)) return [];

  const normalized = normalizeDatasetFromStorage(dataset);
  const out: PositionRecord[] = [];

  for (const rec of normalized) {
    const strategies: PositionRecord["strategies"] = {};
    let n = 0;
    for (const slot of SLOT_IDS) {
      const entry = rec.strategies?.[slot];
      if (!entry) continue;
      if (trimId(entry.familyId) === target) {
        strategies[slot] = entry;
        n += 1;
      }
    }
    if (n > 0) {
      out.push({ ...rec, strategies });
    }
  }
  return deepCloneRecords(out);
}

export function buildPublishFamilyPayload(
  dataset: PositionRecord[] | null | undefined,
  destinationFamilyId: string
): BuildPublishFamilyPayloadResult {
  const familyId = trimId(destinationFamilyId);
  if (!isValidFamilyId(familyId)) {
    return {
      ok: false,
      reason: "destination-family-invalid",
      issues: ["destinationFamilyId:invalid"],
    };
  }

  const records = extractFamilyScopedRecords(dataset, familyId);
  if (records.length === 0) {
    return {
      ok: false,
      reason: "destination-family-empty",
      issues: [`no-members-for:${familyId}`],
    };
  }

  const payload: PublishFamilyPayload = {
    schemaVersion: PUBLISH_FAMILY_PAYLOAD_SCHEMA_VERSION,
    familyId,
    records,
  };
  return validatePublishFamilyPayload(payload);
}

export function validatePublishFamilyPayload(
  raw: unknown
): ValidatePublishFamilyPayloadResult {
  if (raw == null || typeof raw !== "object") {
    return {
      ok: false,
      reason: "publish-family-payload-missing",
      issues: ["payload:not-object"],
    };
  }
  const p = raw as Record<string, unknown>;
  const issues: string[] = [];

  if (p.schemaVersion !== PUBLISH_FAMILY_PAYLOAD_SCHEMA_VERSION) {
    issues.push("schemaVersion:invalid");
  }
  const familyId = trimId(p.familyId);
  if (!isValidFamilyId(familyId)) {
    issues.push("familyId:invalid");
  }
  if (!Array.isArray(p.records)) {
    issues.push("records:not-array");
    return { ok: false, reason: "publish-family-payload-invalid", issues };
  }
  if (p.records.length === 0) {
    issues.push("records:empty");
  }

  let normalized: PositionRecord[] = [];
  try {
    normalized = normalizeDatasetFromStorage(p.records);
  } catch (e) {
    return {
      ok: false,
      reason: "publish-family-payload-normalize-failed",
      issues: [e instanceof Error ? e.message : String(e)],
    };
  }

  const canonical = validateCanonicalDataset(normalized);
  if (!canonical.ok) {
    for (const issue of canonical.issues.slice(0, 30)) {
      issues.push(`${issue.path}:${issue.kind}`);
    }
  }

  const memberKeys = new Map<string, string>();
  let memberCount = 0;
  normalized.forEach((rec, ri) => {
    for (const slot of SLOT_IDS) {
      const entry = rec.strategies?.[slot] as StrategyEntry | undefined;
      if (!entry) continue;
      memberCount += 1;
      const fid = trimId(entry.familyId);
      if (fid !== familyId) {
        issues.push(
          `records[${ri}].strategies.${slot}:unrelated-family:${fid || "none"}`
        );
      }
      const mid = trimId(entry.memberId);
      if (mid && !isValidMemberId(mid)) {
        issues.push(`records[${ri}].strategies.${slot}.memberId:invalid`);
      }
      if (isValidFamilyId(fid) && isValidMemberId(mid)) {
        const key = `${fid}::${mid}`;
        if (memberKeys.has(key)) {
          issues.push(
            `records[${ri}].strategies.${slot}:duplicate-member-identity`
          );
        } else {
          memberKeys.set(key, `${ri}.${slot}`);
        }
      }
      const provenance = validateFamilyProvenance(entry);
      if (!provenance.ok) {
        issues.push(
          `records[${ri}].strategies.${slot}.provenance:${provenance.reason}`
        );
      }
    }
  });

  if (memberCount === 0) {
    issues.push("records:no-family-members");
  }

  if (issues.length > 0) {
    return { ok: false, reason: "publish-family-payload-invalid", issues };
  }

  return {
    ok: true,
    payload: {
      schemaVersion: PUBLISH_FAMILY_PAYLOAD_SCHEMA_VERSION,
      familyId,
      records: deepCloneRecords(normalized),
    },
  };
}

/** Fail-closed when field is present but invalid. */
export function readPublishFamilyPayloadFromSnapshot(
  snapshot: { publishFamilyPayload?: unknown } | null | undefined
): ValidatePublishFamilyPayloadResult | { ok: true; payload: null; absent: true } {
  if (
    !snapshot ||
    !Object.prototype.hasOwnProperty.call(snapshot, "publishFamilyPayload")
  ) {
    return { ok: true, payload: null, absent: true };
  }
  if (snapshot.publishFamilyPayload == null) {
    return {
      ok: false,
      reason: "publish-family-payload-null",
      issues: ["publishFamilyPayload:null"],
    };
  }
  return validatePublishFamilyPayload(snapshot.publishFamilyPayload);
}

export function crossValidateOperationAndPayload(
  operation: PublishOperation,
  payload: PublishFamilyPayload
): { ok: true } | { ok: false; reason: string; issues: string[] } {
  const op = validatePublishOperation(operation);
  if (!op.ok) {
    return { ok: false, reason: op.reason, issues: op.issues };
  }
  const pl = validatePublishFamilyPayload(payload);
  if (!pl.ok) {
    return { ok: false, reason: pl.reason, issues: pl.issues };
  }
  if (op.operation.destinationFamilyId !== pl.payload.familyId) {
    return {
      ok: false,
      reason: "operation-payload-family-mismatch",
      issues: [
        `destination:${op.operation.destinationFamilyId}`,
        `payload:${pl.payload.familyId}`,
      ],
    };
  }
  return { ok: true };
}
