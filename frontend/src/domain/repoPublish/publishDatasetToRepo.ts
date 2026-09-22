/**
 * Phase 4-A / D-2 — Local repo-relative Publish service (Host / Node / Vitest).
 *
 * Pipeline:
 *   existing leaf (v2|v3|absent)
 *   → prepareNormalizedPublishCandidate (D-1 mutation)
 *   → verified FS write of NormalizedDatasetEnvelope v3
 *
 * No Git. No client filesystem paths. No shell.
 */

import fs from "node:fs";
import { systemIdToFolderLabel } from "../datasetPath";
import type { NormalizedDatasetEnvelope } from "../dataset/normalizedDatasetEnvelope";
import {
  prepareNormalizedPublishCandidate,
  resolveExistingNormalizedLeafBase,
} from "../publishedLeafPrepare";
import { normalizedPublishedLeavesSemanticallyEqual } from "../publishedNormalizedLeafMutation";
import {
  crossValidateOperationAndPayload,
  validatePublishFamilyPayload,
  type PublishFamilyPayload,
} from "../publishFamilyPayload";
import {
  validatePublishOperation,
  type PublishOperation,
} from "../publishOperation";
import { resolvePublishedLeafAbsolutePath } from "./resolveRepoLeafPath";
import { writeVerifiedPublishedLeafFs } from "./writeVerifiedPublishedLeafFs";

export const LOCAL_PUBLISH_MAX_BODY_BYTES = 1_000_000;

export type LocalPublishLeafRequest = {
  shotType: string;
  systemId: string;
  publishOperation: PublishOperation;
  publishFamilyPayload: PublishFamilyPayload;
  /** Optional correlation id (History snapshot). Never written to disk. */
  snapshotId?: string;
};

export type LocalPublishLeafOk = {
  ok: true;
  status: "REPO_WRITTEN" | "NO_CHANGE";
  changed: boolean;
  leaf: {
    shotType: string;
    systemId: string;
    systemLabel: string;
    relativePosix: string;
    absolutePath: string;
  };
  purgedFamilyIds: string[];
  replaceFamilyIds: string[];
};

export type LocalPublishLeafFail = {
  ok: false;
  reason: string;
  issues: string[];
  restored?: boolean;
  restoreFailed?: boolean;
};

export type LocalPublishLeafResult = LocalPublishLeafOk | LocalPublishLeafFail;

export type LocalPublishBatchItem = LocalPublishLeafRequest & {
  snapshotId: string;
};

export type LocalPublishBatchItemResult = {
  snapshotId: string;
} & LocalPublishLeafResult;

function trimStr(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

function stripVolatile(
  env: NormalizedDatasetEnvelope
): NormalizedDatasetEnvelope {
  const next: NormalizedDatasetEnvelope = {
    schemaVersion: env.schemaVersion,
    shotType: env.shotType,
    systemId: env.systemId,
    systemLabel: env.systemLabel,
    familyMasters: env.familyMasters,
    familyMembers: env.familyMembers,
  };
  return next;
}

function semanticLeafEqual(
  a: NormalizedDatasetEnvelope,
  b: NormalizedDatasetEnvelope
): boolean {
  return normalizedPublishedLeavesSemanticallyEqual(
    stripVolatile(a),
    stripVolatile(b)
  );
}

function readExistingLeafRaw(
  absolutePath: string
):
  | { ok: true; raw: unknown | null; originalText: string | null }
  | { ok: false; reason: string; issues: string[] } {
  if (!fs.existsSync(absolutePath)) {
    return { ok: true, raw: null, originalText: null };
  }
  let originalText: string;
  try {
    originalText = fs.readFileSync(absolutePath, "utf8");
  } catch (e) {
    return {
      ok: false,
      reason: "existing-leaf-read-failed",
      issues: [e instanceof Error ? e.message : String(e)],
    };
  }
  if (!originalText.trim()) {
    return { ok: true, raw: null, originalText };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(originalText);
  } catch (e) {
    return {
      ok: false,
      reason: "existing-leaf-json-invalid",
      issues: [e instanceof Error ? e.message : String(e)],
    };
  }
  return { ok: true, raw, originalText };
}

/**
 * Reject request objects that smuggle filesystem / command fields.
 */
export function rejectClientPathOrCommandFields(
  body: Record<string, unknown>
): string[] {
  const forbidden = [
    "path",
    "absolutePath",
    "relativePath",
    "repoRoot",
    "targetPath",
    "datasetRoot",
    "shellCommand",
    "gitCommand",
    "command",
  ];
  const issues: string[] = [];
  for (const key of forbidden) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      issues.push(`forbidden-field:${key}`);
    }
  }
  return issues;
}

export function publishDatasetLeafToRepo(args: {
  datasetRoot: string;
  request: LocalPublishLeafRequest;
}): LocalPublishLeafResult {
  const { datasetRoot, request } = args;
  const shotType = trimStr(request.shotType);
  const systemId = trimStr(request.systemId);
  const systemLabel = systemIdToFolderLabel(systemId);

  if (!shotType || !systemId) {
    return {
      ok: false,
      reason: "identity-missing",
      issues: [
        !shotType ? "shotType:empty" : "",
        !systemId ? "systemId:empty" : "",
      ].filter(Boolean),
    };
  }

  const opResult = validatePublishOperation(request.publishOperation);
  if (!opResult.ok) {
    return {
      ok: false,
      reason: opResult.reason,
      issues: opResult.issues,
    };
  }
  const payloadResult = validatePublishFamilyPayload(
    request.publishFamilyPayload
  );
  if (!payloadResult.ok) {
    return {
      ok: false,
      reason: payloadResult.reason,
      issues: payloadResult.issues,
    };
  }
  const cross = crossValidateOperationAndPayload(
    opResult.operation,
    payloadResult.payload
  );
  if (!cross.ok) {
    return { ok: false, reason: cross.reason, issues: cross.issues };
  }

  const resolved = resolvePublishedLeafAbsolutePath(
    datasetRoot,
    shotType,
    systemId
  );
  if (!resolved.ok) {
    return {
      ok: false,
      reason: resolved.reason,
      issues: resolved.issues,
    };
  }

  const existing = readExistingLeafRaw(resolved.absolutePath);
  if (!existing.ok) {
    return {
      ok: false,
      reason: existing.reason,
      issues: existing.issues,
    };
  }

  const leafMeta = { shotType, systemId, systemLabel };
  const prepared = prepareNormalizedPublishCandidate({
    existingRaw: existing.raw,
    operation: opResult.operation,
    payload: payloadResult.payload,
    leafMeta,
    exportedAt: new Date().toISOString(),
    sourceSnapshotId: request.snapshotId,
  });
  if (!prepared.ok) {
    return {
      ok: false,
      reason: prepared.reason,
      issues: prepared.issues,
    };
  }

  const candidate = prepared.candidate;
  for (const key of [
    "publishOperation",
    "publishFamilyPayload",
    "sourceFamilyId",
    "intent",
    "snapshotId",
  ]) {
    if (Object.prototype.hasOwnProperty.call(candidate as object, key)) {
      return {
        ok: false,
        reason: "command-metadata-leak",
        issues: [`candidate-has:${key}`],
      };
    }
  }

  const replaceFamilyIds = prepared.purgedFamilyIds.length
    ? prepared.purgedFamilyIds
    : prepared.insertedFamilyId
      ? [prepared.insertedFamilyId]
      : [];

  const base = resolveExistingNormalizedLeafBase({
    raw: existing.raw,
    leafMeta,
  });
  if (
    base.ok &&
    semanticLeafEqual(base.envelope, candidate)
  ) {
    return {
      ok: true,
      status: "NO_CHANGE",
      changed: false,
      leaf: {
        shotType,
        systemId,
        systemLabel,
        relativePosix: resolved.relativePosix,
        absolutePath: resolved.absolutePath,
      },
      purgedFamilyIds: prepared.purgedFamilyIds,
      replaceFamilyIds,
    };
  }

  const writeResult = writeVerifiedPublishedLeafFs({
    absoluteTargetPath: resolved.absolutePath,
    candidate,
    originalText: existing.originalText,
    revalidate: false,
  });
  if (!writeResult.ok) {
    return {
      ok: false,
      reason: writeResult.reason,
      issues: writeResult.issues,
      restored: writeResult.restored,
      restoreFailed: writeResult.restoreFailed,
    };
  }

  return {
    ok: true,
    status: "REPO_WRITTEN",
    changed: true,
    leaf: {
      shotType,
      systemId,
      systemLabel,
      relativePosix: resolved.relativePosix,
      absolutePath: resolved.absolutePath,
    },
    purgedFamilyIds: prepared.purgedFamilyIds,
    replaceFamilyIds,
  };
}

/**
 * Apply multiple ops for one leaf in-memory, then a single verified write.
 */
function publishSameLeafGroupInMemory(args: {
  datasetRoot: string;
  group: LocalPublishBatchItem[];
}): LocalPublishBatchItemResult[] {
  const { datasetRoot, group } = args;
  if (group.length === 0) return [];

  const first = group[0]!;
  const shotType = trimStr(first.shotType);
  const systemId = trimStr(first.systemId);
  const systemLabel = systemIdToFolderLabel(systemId);
  const leafMeta = { shotType, systemId, systemLabel };

  const resolved = resolvePublishedLeafAbsolutePath(
    datasetRoot,
    shotType,
    systemId
  );
  if (!resolved.ok) {
    return group.map((item) => ({
      snapshotId: item.snapshotId,
      ok: false as const,
      reason: resolved.reason,
      issues: resolved.issues,
    }));
  }

  const existing = readExistingLeafRaw(resolved.absolutePath);
  if (!existing.ok) {
    return group.map((item) => ({
      snapshotId: item.snapshotId,
      ok: false as const,
      reason: existing.reason,
      issues: existing.issues,
    }));
  }

  let currentRaw: unknown | null = existing.raw;
  const itemOkMeta: Array<{
    snapshotId: string;
    purgedFamilyIds: string[];
    replaceFamilyIds: string[];
  }> = [];

  for (const item of group) {
    const opResult = validatePublishOperation(item.publishOperation);
    if (!opResult.ok) {
      const failIdx = group.indexOf(item);
      const out: LocalPublishBatchItemResult[] = itemOkMeta.map((m) => ({
        snapshotId: m.snapshotId,
        ok: false,
        reason: "same-leaf-later-failure-rolled-prep",
        issues: [`blocked-by:${item.snapshotId}`],
      }));
      // Actually we haven't written yet — prior prep successes aren't on disk.
      // Report current fail + subsequent blocked; earlier items in group that
      // prepared ok are also not written → mark them blocked by this failure.
      const results: LocalPublishBatchItemResult[] = [];
      for (let i = 0; i < failIdx; i++) {
        results.push({
          snapshotId: group[i]!.snapshotId,
          ok: false,
          reason: "same-leaf-batch-aborted-before-write",
          issues: [`blocked-by:${item.snapshotId}`],
        });
      }
      results.push({
        snapshotId: item.snapshotId,
        ok: false,
        reason: opResult.reason,
        issues: opResult.issues,
      });
      for (let i = failIdx + 1; i < group.length; i++) {
        results.push({
          snapshotId: group[i]!.snapshotId,
          ok: false,
          reason: "same-leaf-prior-failure",
          issues: [`blocked-by:${item.snapshotId}`],
        });
      }
      return results;
    }

    const payloadResult = validatePublishFamilyPayload(
      item.publishFamilyPayload
    );
    if (!payloadResult.ok) {
      const failIdx = group.indexOf(item);
      const results: LocalPublishBatchItemResult[] = [];
      for (let i = 0; i < failIdx; i++) {
        results.push({
          snapshotId: group[i]!.snapshotId,
          ok: false,
          reason: "same-leaf-batch-aborted-before-write",
          issues: [`blocked-by:${item.snapshotId}`],
        });
      }
      results.push({
        snapshotId: item.snapshotId,
        ok: false,
        reason: payloadResult.reason,
        issues: payloadResult.issues,
      });
      for (let i = failIdx + 1; i < group.length; i++) {
        results.push({
          snapshotId: group[i]!.snapshotId,
          ok: false,
          reason: "same-leaf-prior-failure",
          issues: [`blocked-by:${item.snapshotId}`],
        });
      }
      return results;
    }

    const prepared = prepareNormalizedPublishCandidate({
      existingRaw: currentRaw,
      operation: opResult.operation,
      payload: payloadResult.payload,
      leafMeta,
      exportedAt: new Date().toISOString(),
      sourceSnapshotId: item.snapshotId,
    });
    if (!prepared.ok) {
      const failIdx = group.indexOf(item);
      const results: LocalPublishBatchItemResult[] = [];
      for (let i = 0; i < failIdx; i++) {
        results.push({
          snapshotId: group[i]!.snapshotId,
          ok: false,
          reason: "same-leaf-batch-aborted-before-write",
          issues: [`blocked-by:${item.snapshotId}`],
        });
      }
      results.push({
        snapshotId: item.snapshotId,
        ok: false,
        reason: prepared.reason,
        issues: prepared.issues,
      });
      for (let i = failIdx + 1; i < group.length; i++) {
        results.push({
          snapshotId: group[i]!.snapshotId,
          ok: false,
          reason: "same-leaf-prior-failure",
          issues: [`blocked-by:${item.snapshotId}`],
        });
      }
      return results;
    }

    currentRaw = prepared.candidate;
    itemOkMeta.push({
      snapshotId: item.snapshotId,
      purgedFamilyIds: prepared.purgedFamilyIds,
      replaceFamilyIds: prepared.purgedFamilyIds.length
        ? prepared.purgedFamilyIds
        : prepared.insertedFamilyId
          ? [prepared.insertedFamilyId]
          : [],
    });
  }

  const finalCandidate = currentRaw as NormalizedDatasetEnvelope;
  const base = resolveExistingNormalizedLeafBase({
    raw: existing.raw,
    leafMeta,
  });
  if (base.ok && semanticLeafEqual(base.envelope, finalCandidate)) {
    return itemOkMeta.map((m) => ({
      snapshotId: m.snapshotId,
      ok: true as const,
      status: "NO_CHANGE" as const,
      changed: false,
      leaf: {
        shotType,
        systemId,
        systemLabel,
        relativePosix: resolved.relativePosix,
        absolutePath: resolved.absolutePath,
      },
      purgedFamilyIds: m.purgedFamilyIds,
      replaceFamilyIds: m.replaceFamilyIds,
    }));
  }

  const writeResult = writeVerifiedPublishedLeafFs({
    absoluteTargetPath: resolved.absolutePath,
    candidate: finalCandidate,
    originalText: existing.originalText,
    revalidate: true,
  });
  if (!writeResult.ok) {
    return itemOkMeta.map((m) => ({
      snapshotId: m.snapshotId,
      ok: false as const,
      reason: writeResult.reason,
      issues: writeResult.issues,
      restored: writeResult.restored,
      restoreFailed: writeResult.restoreFailed,
    }));
  }

  return itemOkMeta.map((m) => ({
    snapshotId: m.snapshotId,
    ok: true as const,
    status: "REPO_WRITTEN" as const,
    changed: true,
    leaf: {
      shotType,
      systemId,
      systemLabel,
      relativePosix: resolved.relativePosix,
      absolutePath: resolved.absolutePath,
    },
    purgedFamilyIds: m.purgedFamilyIds,
    replaceFamilyIds: m.replaceFamilyIds,
  }));
}

function leafKey(shotType: string, systemId: string): string {
  return `${trimStr(shotType)}::${trimStr(systemId)}`;
}

/**
 * Multi-snapshot publish: group by leaf, apply all ops in-memory, one write per leaf.
 * Failed leaf does not roll back prior successful leaves.
 */
export function publishDatasetBatchToRepo(args: {
  datasetRoot: string;
  items: LocalPublishBatchItem[];
}): LocalPublishBatchItemResult[] {
  const { datasetRoot, items } = args;
  const results: LocalPublishBatchItemResult[] = [];
  if (!Array.isArray(items) || items.length === 0) return results;

  const groups = new Map<string, LocalPublishBatchItem[]>();
  const order: string[] = [];
  for (const item of items) {
    const key = leafKey(item.shotType, item.systemId);
    if (!groups.has(key)) {
      groups.set(key, []);
      order.push(key);
    }
    groups.get(key)!.push(item);
  }

  for (const key of order) {
    const group = groups.get(key)!;
    results.push(
      ...publishSameLeafGroupInMemory({ datasetRoot, group })
    );
  }

  return results;
}

/** Host HTTP body handler (dev middleware). */
export function handleLocalPublishHttpBody(args: {
  datasetRoot: string;
  body: unknown;
}): {
  statusCode: number;
  body: Record<string, unknown>;
} {
  if (args.body == null || typeof args.body !== "object" || Array.isArray(args.body)) {
    return {
      statusCode: 400,
      body: {
        ok: false,
        reason: "body-not-object",
        issues: ["body:not-object"],
      },
    };
  }
  const raw = args.body as Record<string, unknown>;
  const forbidden = rejectClientPathOrCommandFields(raw);
  if (forbidden.length > 0) {
    return {
      statusCode: 400,
      body: {
        ok: false,
        reason: "forbidden-client-fields",
        issues: forbidden,
      },
    };
  }

  const itemsRaw = raw.items;
  if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) {
    return {
      statusCode: 400,
      body: {
        ok: false,
        reason: "items-empty",
        issues: ["items:empty"],
      },
    };
  }

  const items: LocalPublishBatchItem[] = [];
  for (const row of itemsRaw) {
    if (row == null || typeof row !== "object") {
      return {
        statusCode: 400,
        body: {
          ok: false,
          reason: "item-invalid",
          issues: ["item:not-object"],
        },
      };
    }
    const it = row as Record<string, unknown>;
    const snapshotId = trimStr(it.snapshotId);
    const shotType = trimStr(it.shotType);
    const systemId = trimStr(it.systemId);
    if (!snapshotId || !shotType || !systemId) {
      return {
        statusCode: 400,
        body: {
          ok: false,
          reason: "item-identity-missing",
          issues: ["snapshotId|shotType|systemId"],
        },
      };
    }
    items.push({
      snapshotId,
      shotType,
      systemId,
      publishOperation: it.publishOperation as PublishOperation,
      publishFamilyPayload: it.publishFamilyPayload as PublishFamilyPayload,
    });
  }

  const results = publishDatasetBatchToRepo({
    datasetRoot: args.datasetRoot,
    items,
  });
  const allOk = results.length > 0 && results.every((r) => r.ok);
  return {
    statusCode: allOk ? 200 : 400,
    body: {
      ok: allOk,
      results,
      ...(allOk
        ? {}
        : {
            reason: results.find((r) => !r.ok)?.reason ?? "batch-failed",
            issues: results
              .filter((r) => !r.ok)
              .flatMap((r) => ("issues" in r ? r.issues : [])),
          }),
    },
  };
}
