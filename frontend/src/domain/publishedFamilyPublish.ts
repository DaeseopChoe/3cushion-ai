/**
 * Phase 3-B1 — Published Family Export candidate orchestrator.
 *
 * SSOT owner for: normalize → family-aware replace → pre-write validation.
 * Does NOT write disk, redesign History, or implement failure-safe/atomic I/O (Phase 3-B2).
 *
 * Publish trigger (current limitation — no History saveIntent):
 *   incoming valid fm_* familyId present in existing → REPLACE (purge+merge)
 *   otherwise → CREATE/APPEND via merge after no-op purge
 * Never invents familyId from positionId / coordinates.
 */

import type { DatasetExportPayload } from "./datasetExport";
import { normalizeDatasetExport } from "./datasetExport";
import { validateCanonicalDataset } from "./canonicalPersistAudit";
import {
  isValidFamilyId,
  isValidMemberId,
  validateFamilyProvenance,
} from "./family/familyIdentity";
import {
  collectFamilyIdsFromRecords,
  countFamilyMembersInRecords,
  replaceFamiliesInPublishedRecords,
} from "./publishedFamilyReplace";
import type { PositionRecord, StrategyEntry } from "./positionSearchEngine";

const SLOT_IDS = ["S1", "S2", "S3"] as const;

export type PublishedFamilyPublishOk = {
  ok: true;
  payload: DatasetExportPayload;
  purgedFamilyIds: string[];
  replaceFamilyIds: string[];
};

export type PublishedFamilyPublishFail = {
  ok: false;
  reason: string;
  issues: string[];
};

export type PublishedFamilyPublishResult =
  | PublishedFamilyPublishOk
  | PublishedFamilyPublishFail;

function trimId(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function collectMemberIdsForFamily(
  records: PositionRecord[],
  familyId: string
): Set<string> {
  const target = trimId(familyId);
  const out = new Set<string>();
  if (!target) return out;
  for (const rec of records) {
    for (const slot of SLOT_IDS) {
      const entry = rec.strategies?.[slot];
      if (!entry) continue;
      if (trimId(entry.familyId) !== target) continue;
      const memberId = trimId(entry.memberId);
      if (memberId) out.add(memberId);
    }
  }
  return out;
}

function forEachStrategyEntry(
  records: PositionRecord[],
  visit: (entry: StrategyEntry, path: string) => void
): void {
  records.forEach((rec, ri) => {
    for (const slot of SLOT_IDS) {
      const entry = rec.strategies?.[slot];
      if (!entry) continue;
      visit(entry, `records[${ri}].strategies.${slot}`);
    }
  });
}

/**
 * Pre-write validation gate for a Published export candidate.
 * Reuses existing validators; does not invent 4-track completeness rules.
 */
export function validatePublishedExportCandidate(
  payload: DatasetExportPayload,
  args?: {
    /** Incoming records before replace — used for stale-member checks. */
    incomingRecords?: PositionRecord[];
    replaceFamilyIds?: string[];
  }
): { ok: true } | { ok: false; issues: string[] } {
  const issues: string[] = [];

  if (!payload || typeof payload !== "object") {
    return { ok: false, issues: ["payload:missing"] };
  }
  if (!Array.isArray(payload.records)) {
    return { ok: false, issues: ["payload.records:not-array"] };
  }
  if (!String(payload.shotType ?? "").trim()) {
    issues.push("payload.shotType:missing");
  }
  if (!String(payload.systemId ?? "").trim()) {
    issues.push("payload.systemId:missing");
  }

  const canonical = validateCanonicalDataset(payload.records);
  if (!canonical.ok) {
    for (const issue of canonical.issues.slice(0, 40)) {
      issues.push(`${issue.path}:${issue.kind}`);
    }
  }

  const memberKeys = new Map<string, string>();
  forEachStrategyEntry(payload.records, (entry, path) => {
    const familyId = trimId(entry.familyId);
    if (familyId && !isValidFamilyId(familyId)) {
      issues.push(`${path}.familyId:invalid`);
    }
    const memberId = trimId(entry.memberId);
    if (memberId && !isValidMemberId(memberId)) {
      issues.push(`${path}.memberId:invalid`);
    }
    if (isValidFamilyId(familyId) && isValidMemberId(memberId)) {
      const key = `${familyId}::${memberId}`;
      const prev = memberKeys.get(key);
      if (prev) {
        issues.push(`${path}:duplicate-member-identity(${key})`);
      } else {
        memberKeys.set(key, path);
      }
    }

    const provenance = validateFamilyProvenance(entry);
    if (!provenance.ok) {
      issues.push(`${path}.provenance:${provenance.reason}`);
    }
  });

  const incoming = args?.incomingRecords;
  const replaceIds = args?.replaceFamilyIds ?? [];
  if (incoming && replaceIds.length > 0) {
    for (const familyId of replaceIds) {
      const incomingMembers = collectMemberIdsForFamily(incoming, familyId);
      const candidateMembers = collectMemberIdsForFamily(
        payload.records,
        familyId
      );
      for (const memberId of candidateMembers) {
        if (incomingMembers.size > 0 && !incomingMembers.has(memberId)) {
          issues.push(
            `stale-family-member:${familyId}::${memberId}`
          );
        }
      }
      // If incoming had familyId members, candidate must retain that family (non-empty).
      if (
        countFamilyMembersInRecords(incoming, familyId) > 0 &&
        countFamilyMembersInRecords(payload.records, familyId) === 0
      ) {
        issues.push(`missing-incoming-family-after-replace:${familyId}`);
      }
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues };
  }
  return { ok: true };
}

/**
 * Build validated Published export candidate:
 * normalize → family replace (incoming fm_* ids) → validate → envelope.
 *
 * @param existing Published leaf payload, or null/undefined when leaf is new.
 * @param incoming Export payload from buildDatasetExport (may be pre-normalized).
 */
export function buildPublishedFamilyExportCandidate(
  existing: DatasetExportPayload | null | undefined,
  incoming: DatasetExportPayload
): PublishedFamilyPublishResult {
  if (incoming == null || typeof incoming !== "object") {
    return {
      ok: false,
      reason: "incoming-malformed",
      issues: ["incoming:not-object"],
    };
  }
  if (
    Object.prototype.hasOwnProperty.call(incoming, "records") &&
    incoming.records != null &&
    !Array.isArray(incoming.records)
  ) {
    return {
      ok: false,
      reason: "incoming-malformed-records",
      issues: ["incoming.records:not-array"],
    };
  }

  let incomingNorm: DatasetExportPayload;
  try {
    incomingNorm = normalizeDatasetExport(incoming);
  } catch (e) {
    return {
      ok: false,
      reason: "incoming-normalize-failed",
      issues: [e instanceof Error ? e.message : String(e)],
    };
  }

  if (!Array.isArray(incomingNorm.records)) {
    return {
      ok: false,
      reason: "incoming-malformed-records",
      issues: ["incoming.records:not-array"],
    };
  }

  // Empty existing → CREATE path (incoming only), still validate before write.
  if (existing == null) {
    const validatedEmpty = validatePublishedExportCandidate(incomingNorm, {
      incomingRecords: incomingNorm.records,
      replaceFamilyIds: collectFamilyIdsFromRecords(incomingNorm.records),
    });
    if (!validatedEmpty.ok) {
      return {
        ok: false,
        reason: "candidate-validation-failed",
        issues: validatedEmpty.issues,
      };
    }
    return {
      ok: true,
      payload: incomingNorm,
      purgedFamilyIds: [],
      replaceFamilyIds: collectFamilyIdsFromRecords(incomingNorm.records),
    };
  }

  if (
    Object.prototype.hasOwnProperty.call(existing, "records") &&
    existing.records != null &&
    !Array.isArray(existing.records)
  ) {
    return {
      ok: false,
      reason: "existing-malformed-records",
      issues: ["existing.records:not-array"],
    };
  }

  let existingNorm: DatasetExportPayload;
  try {
    existingNorm = normalizeDatasetExport(existing);
  } catch (e) {
    return {
      ok: false,
      reason: "existing-normalize-failed",
      issues: [e instanceof Error ? e.message : String(e)],
    };
  }

  const replaceFamilyIds = collectFamilyIdsFromRecords(incomingNorm.records);
  const replaced = replaceFamiliesInPublishedRecords(
    existingNorm.records,
    incomingNorm.records,
    replaceFamilyIds
  );

  // Envelope: same policy as mergePublishedExport — incoming metadata + merged records.
  const candidate: DatasetExportPayload = {
    ...incomingNorm,
    records: replaced.records,
  };

  const validated = validatePublishedExportCandidate(candidate, {
    incomingRecords: incomingNorm.records,
    replaceFamilyIds: replaced.replaceFamilyIds,
  });
  if (!validated.ok) {
    return {
      ok: false,
      reason: "candidate-validation-failed",
      issues: validated.issues,
    };
  }

  return {
    ok: true,
    payload: candidate,
    purgedFamilyIds: replaced.purgedFamilyIds,
    replaceFamilyIds: replaced.replaceFamilyIds,
  };
}
