/**
 * Phase 4-A — Local repo-relative Publish service (Host / Node / Vitest).
 *
 * Reuses Phase 3 domain: PublishOperation + PublishFamilyPayload →
 * buildPublishedFamilyExportCandidate → verified FS write.
 *
 * No Git. No client filesystem paths. No shell.
 */

import fs from "node:fs";
import type { DatasetExportPayload } from "../datasetExport";
import {
  DATASET_EXPORT_SCHEMA_VERSION,
  normalizeDatasetExport,
} from "../datasetExport";
import { systemIdToFolderLabel } from "../datasetPath";
import {
  buildPublishedFamilyExportCandidate,
  validatePublishedExportCandidate,
} from "../publishedFamilyPublish";
import {
  crossValidateOperationAndPayload,
  validatePublishFamilyPayload,
  type PublishFamilyPayload,
} from "../publishFamilyPayload";
import {
  validatePublishOperation,
  type PublishOperation,
} from "../publishOperation";
import { publishedExportSemanticEqual } from "../publishedWrite";
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

function semanticLeafEqual(
  a: DatasetExportPayload,
  b: DatasetExportPayload
): boolean {
  try {
    return publishedExportSemanticEqual(
      {
        ...normalizeDatasetExport(a),
        exportedAt: "COMPARE",
        sourceSnapshotId: undefined,
      },
      {
        ...normalizeDatasetExport(b),
        exportedAt: "COMPARE",
        sourceSnapshotId: undefined,
      }
    );
  } catch {
    return false;
  }
}

function buildIncomingEnvelope(
  shotType: string,
  systemId: string,
  payload: PublishFamilyPayload
): DatasetExportPayload {
  return normalizeDatasetExport({
    schemaVersion: DATASET_EXPORT_SCHEMA_VERSION,
    shotType,
    systemId,
    systemLabel: systemIdToFolderLabel(systemId),
    exportedAt: new Date().toISOString(),
    records: payload.records,
  });
}

function readExistingLeaf(
  absolutePath: string
):
  | { ok: true; payload: DatasetExportPayload | null; originalText: string | null }
  | { ok: false; reason: string; issues: string[] } {
  if (!fs.existsSync(absolutePath)) {
    return { ok: true, payload: null, originalText: null };
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
    return { ok: true, payload: null, originalText };
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
  if (raw == null || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      ok: false,
      reason: "existing-leaf-validation-failed",
      issues: ["existing:not-object"],
    };
  }
  const rawObj = raw as Record<string, unknown>;
  if (
    Object.prototype.hasOwnProperty.call(rawObj, "records") &&
    rawObj.records != null &&
    !Array.isArray(rawObj.records)
  ) {
    return {
      ok: false,
      reason: "existing-leaf-validation-failed",
      issues: ["existing.records:not-array"],
    };
  }
  let normalized: DatasetExportPayload;
  try {
    normalized = normalizeDatasetExport(raw as DatasetExportPayload);
  } catch (e) {
    return {
      ok: false,
      reason: "existing-leaf-normalize-failed",
      issues: [e instanceof Error ? e.message : String(e)],
    };
  }
  const validated = validatePublishedExportCandidate(normalized);
  if (!validated.ok) {
    return {
      ok: false,
      reason: "existing-leaf-validation-failed",
      issues: validated.issues,
    };
  }
  return { ok: true, payload: normalized, originalText };
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

  const existing = readExistingLeaf(resolved.absolutePath);
  if (!existing.ok) {
    return {
      ok: false,
      reason: existing.reason,
      issues: existing.issues,
    };
  }

  const incoming = buildIncomingEnvelope(
    shotType,
    systemId,
    payloadResult.payload
  );
  const candidateResult = buildPublishedFamilyExportCandidate(
    existing.payload,
    incoming,
    opResult.operation
  );
  if (!candidateResult.ok) {
    return {
      ok: false,
      reason: candidateResult.reason,
      issues: candidateResult.issues,
    };
  }

  const candidate = candidateResult.payload;
  // Guard: no command metadata on envelope
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

  if (
    existing.payload &&
    semanticLeafEqual(existing.payload, candidate)
  ) {
    return {
      ok: true,
      status: "NO_CHANGE",
      changed: false,
      leaf: {
        shotType,
        systemId,
        systemLabel: systemIdToFolderLabel(systemId),
        relativePosix: resolved.relativePosix,
        absolutePath: resolved.absolutePath,
      },
      purgedFamilyIds: candidateResult.purgedFamilyIds,
      replaceFamilyIds: candidateResult.replaceFamilyIds,
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
      systemLabel: systemIdToFolderLabel(systemId),
      relativePosix: resolved.relativePosix,
      absolutePath: resolved.absolutePath,
    },
    purgedFamilyIds: candidateResult.purgedFamilyIds,
    replaceFamilyIds: candidateResult.replaceFamilyIds,
  };
}

function leafKey(shotType: string, systemId: string): string {
  return `${trimStr(shotType)}::${trimStr(systemId)}`;
}

/**
 * Multi-snapshot publish: group by leaf, apply ops in order, one write per leaf.
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
    // Sequential apply within leaf: each op reads disk after previous write.
    for (const item of group) {
      const r = publishDatasetLeafToRepo({
        datasetRoot,
        request: item,
      });
      results.push({ snapshotId: item.snapshotId, ...r });
      if (!r.ok) {
        // Stop remaining items on same leaf; mark them as not-attempted? Spec says
        // stop-on-first-failure style for export — mark subsequent same-leaf as skipped.
        const idx = group.indexOf(item);
        for (let i = idx + 1; i < group.length; i++) {
          results.push({
            snapshotId: group[i].snapshotId,
            ok: false,
            reason: "same-leaf-prior-failure",
            issues: [`blocked-by:${item.snapshotId}`],
          });
        }
        break;
      }
    }
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

  // Batch form: { items: [...] }
  if (Array.isArray(raw.items)) {
    const items: LocalPublishBatchItem[] = [];
    for (const it of raw.items) {
      if (!it || typeof it !== "object") {
        return {
          statusCode: 400,
          body: {
            ok: false,
            reason: "batch-item-invalid",
            issues: ["items:entry-not-object"],
          },
        };
      }
      const entry = it as Record<string, unknown>;
      const entryForbidden = rejectClientPathOrCommandFields(entry);
      if (entryForbidden.length > 0) {
        return {
          statusCode: 400,
          body: {
            ok: false,
            reason: "forbidden-client-fields",
            issues: entryForbidden,
          },
        };
      }
      const snapshotId = trimStr(entry.snapshotId);
      if (!snapshotId) {
        return {
          statusCode: 400,
          body: {
            ok: false,
            reason: "snapshotId-missing",
            issues: ["snapshotId:empty"],
          },
        };
      }
      items.push({
        snapshotId,
        shotType: trimStr(entry.shotType),
        systemId: trimStr(entry.systemId),
        publishOperation: entry.publishOperation as PublishOperation,
        publishFamilyPayload:
          entry.publishFamilyPayload as PublishFamilyPayload,
      });
    }
    const results = publishDatasetBatchToRepo({
      datasetRoot: args.datasetRoot,
      items,
    }).map(sanitizePublishResultForClient);
    const anyOk = results.some((r) => r.ok);
    return {
      statusCode: anyOk || results.length === 0 ? 200 : 422,
      body: { ok: anyOk, results },
    };
  }

  // Single leaf form
  const result = sanitizePublishResultForClient(
    publishDatasetLeafToRepo({
      datasetRoot: args.datasetRoot,
      request: {
        shotType: trimStr(raw.shotType),
        systemId: trimStr(raw.systemId),
        publishOperation: raw.publishOperation as PublishOperation,
        publishFamilyPayload: raw.publishFamilyPayload as PublishFamilyPayload,
        snapshotId: trimStr(raw.snapshotId) || undefined,
      },
    })
  );
  return {
    statusCode: result.ok ? 200 : 422,
    body: result,
  };
}

/** Never send absolute filesystem paths to the browser. */
function sanitizePublishResultForClient<
  T extends LocalPublishLeafResult | LocalPublishBatchItemResult,
>(result: T): T {
  if (!result.ok) return result;
  const leaf = { ...result.leaf };
  delete (leaf as { absolutePath?: string }).absolutePath;
  return { ...result, leaf };
}
