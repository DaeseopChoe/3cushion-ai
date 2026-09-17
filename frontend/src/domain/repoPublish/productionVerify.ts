/**
 * Phase 4-C — Production Published dataset read-back verification.
 *
 * Observes Production only (no Git rewrite, no Vercel API/CLI/token).
 * Expected state = pushed commit blob (not working tree).
 */

import type { DatasetExportPayload } from "../datasetExport";
import { normalizeDatasetExport } from "../datasetExport";
import { buildPublishedLeafUrl } from "../datasetLoader";
import { DATASET_ROOT_DIR } from "../datasetPath";
import { validatePublishedExportCandidate } from "../publishedFamilyPublish";
import { verifyPublishedReadBack } from "../publishedWrite";
import {
  readCommittedBlobText,
  resolveHeadCommitSha,
  validateGitTargetPaths,
} from "./gitPublish";
import {
  CANONICAL_PRODUCTION_ORIGIN,
  isAllowedProductionFinalUrl,
  validateProductionOrigin,
  type ProductionOriginOk,
} from "./productionOrigin";
import { resolvePublishedLeafAbsolutePath } from "./resolveRepoLeafPath";
import { rejectClientPathOrCommandFields } from "./publishDatasetToRepo";

export type ProductionVerifyLeafInput = {
  shotType: string;
  systemId: string;
};

export type ProductionLeafAttemptKind =
  | "network_error"
  | "http_error"
  | "not_found"
  | "invalid_json"
  | "validation_failed"
  | "semantic_mismatch"
  | "verified"
  | "fatal";

export type ProductionLeafResult = {
  shotType: string;
  systemId: string;
  attempts: number;
  verified: boolean;
  lastKind?: ProductionLeafAttemptKind;
  lastHttpStatus?: number;
  issues?: string[];
};

export type ProductionVerifyStatus =
  | "PRODUCTION_VERIFIED"
  | "PRODUCTION_VERIFY_TIMEOUT"
  | "PRODUCTION_VERIFY_FAILED"
  | "PARTIAL_PRODUCTION_VERIFICATION"
  | "PRODUCTION_PENDING";

export type ProductionVerifyOk = {
  ok: true;
  status: "PRODUCTION_VERIFIED";
  commitSha: string;
  leaves: ProductionLeafResult[];
};

export type ProductionVerifyFail = {
  ok: false;
  status:
    | "PRODUCTION_VERIFY_TIMEOUT"
    | "PRODUCTION_VERIFY_FAILED"
    | "PARTIAL_PRODUCTION_VERIFICATION";
  commitSha?: string;
  reason: string;
  issues: string[];
  leaves?: ProductionLeafResult[];
};

export type ProductionVerifyResult = ProductionVerifyOk | ProductionVerifyFail;

export type ProductionVerifyPollConfig = {
  initialDelayMs: number;
  intervalMs: number;
  overallTimeoutMs: number;
  perRequestTimeoutMs: number;
  maxResponseBytes: number;
};

export const DEFAULT_PRODUCTION_VERIFY_POLL: ProductionVerifyPollConfig = {
  initialDelayMs: 3_000,
  intervalMs: 4_000,
  overallTimeoutMs: 90_000,
  perRequestTimeoutMs: 8_000,
  maxResponseBytes: 5_000_000,
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function trimStr(raw: unknown): string {
  return typeof raw === "string" ? raw.trim() : "";
}

/**
 * Build Production dataset URL from canonical origin + datasetLoader path SSOT.
 * Optional verify query for cache-busting (does not change path semantics).
 */
export function buildCanonicalProductionDatasetUrl(args: {
  productionOrigin: string;
  shotType: string;
  systemId: string;
  verifyToken?: string;
}):
  | { ok: true; url: string; path: string; origin: ProductionOriginOk }
  | { ok: false; reason: string; issues: string[] } {
  const originCheck = validateProductionOrigin(args.productionOrigin);
  if (!originCheck.ok) return originCheck;
  const shotType = trimStr(args.shotType);
  const systemId = trimStr(args.systemId);
  if (!shotType || !systemId) {
    return {
      ok: false,
      reason: "leaf-identity-missing",
      issues: [
        !shotType ? "shotType:empty" : "",
        !systemId ? "systemId:empty" : "",
      ].filter(Boolean),
    };
  }
  const leafPath = buildPublishedLeafUrl(shotType, systemId);
  if (!leafPath.startsWith(`/${DATASET_ROOT_DIR}/`)) {
    return {
      ok: false,
      reason: "leaf-path-invalid",
      issues: [`path:${leafPath}`],
    };
  }
  let url: URL;
  try {
    url = new URL(leafPath, originCheck.origin);
  } catch {
    return {
      ok: false,
      reason: "production-url-build-failed",
      issues: ["url:build"],
    };
  }
  const token = trimStr(args.verifyToken);
  if (token) {
    // Safe cache-bust only — never alters dataset path.
    url.searchParams.set("verify", token.slice(0, 12));
  }
  return {
    ok: true,
    url: url.toString(),
    path: leafPath,
    origin: originCheck,
  };
}

export function repoRelativePublishedLeafPath(
  datasetRoot: string,
  shotType: string,
  systemId: string
):
  | { ok: true; repoRelativePath: string }
  | { ok: false; reason: string; issues: string[] } {
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
  return {
    ok: true,
    repoRelativePath: `${DATASET_ROOT_DIR}/${resolved.relativePosix}`,
  };
}

type AttemptOutcome = {
  kind: ProductionLeafAttemptKind;
  httpStatus?: number;
  issues?: string[];
  retryable: boolean;
};

async function readResponseTextLimited(
  response: Response,
  maxBytes: number
): Promise<{ ok: true; text: string } | { ok: false; reason: string }> {
  const reader = response.body?.getReader?.();
  if (!reader) {
    const text = await response.text();
    if (text.length > maxBytes) {
      return { ok: false, reason: "response-too-large" };
    }
    return { ok: true, text };
  }
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        try {
          await reader.cancel();
        } catch {
          /* ignore */
        }
        return { ok: false, reason: "response-too-large" };
      }
      chunks.push(value);
    }
  }
  const merged = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    merged.set(c, offset);
    offset += c.byteLength;
  }
  return { ok: true, text: new TextDecoder("utf-8").decode(merged) };
}

/**
 * Single Production fetch attempt → classify outcome.
 */
export async function fetchProductionLeafAttempt(args: {
  url: string;
  origin: ProductionOriginOk;
  expectedCandidate: DatasetExportPayload;
  perRequestTimeoutMs: number;
  maxResponseBytes: number;
  fetchFn?: typeof fetch;
}): Promise<AttemptOutcome> {
  const fetchFn = args.fetchFn ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(
    () => controller.abort(),
    Math.max(1, args.perRequestTimeoutMs)
  );
  let response: Response;
  try {
    response = await fetchFn(args.url, {
      method: "GET",
      redirect: "follow",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
  } catch (e) {
    clearTimeout(timer);
    const msg = e instanceof Error ? e.message : String(e);
    return {
      kind: "network_error",
      retryable: true,
      issues: [msg],
    };
  }
  clearTimeout(timer);

  const finalUrl = response.url || args.url;
  if (!isAllowedProductionFinalUrl(finalUrl, args.origin)) {
    return {
      kind: "fatal",
      httpStatus: response.status,
      retryable: false,
      issues: ["redirect-or-final-url-not-allowed"],
    };
  }

  if (response.status === 404) {
    return { kind: "not_found", httpStatus: 404, retryable: true };
  }
  if (response.status >= 500) {
    return {
      kind: "http_error",
      httpStatus: response.status,
      retryable: true,
      issues: [`http:${response.status}`],
    };
  }
  if (response.status < 200 || response.status >= 300) {
    return {
      kind: "http_error",
      httpStatus: response.status,
      retryable: response.status === 408 || response.status === 429,
      issues: [`http:${response.status}`],
    };
  }

  const body = await readResponseTextLimited(
    response,
    args.maxResponseBytes
  );
  if (!body.ok) {
    return {
      kind: "fatal",
      httpStatus: response.status,
      retryable: false,
      issues: [body.reason],
    };
  }

  // HTML / non-JSON app shell often returns 200 — classify as invalid JSON.
  let raw: unknown;
  try {
    raw = JSON.parse(body.text);
  } catch {
    return {
      kind: "invalid_json",
      httpStatus: response.status,
      retryable: true,
      issues: ["PRODUCTION_INVALID_RESPONSE"],
    };
  }

  let normalized: DatasetExportPayload;
  try {
    normalized = normalizeDatasetExport(raw as DatasetExportPayload);
  } catch (e) {
    return {
      kind: "invalid_json",
      httpStatus: response.status,
      retryable: true,
      issues: [e instanceof Error ? e.message : String(e)],
    };
  }

  const validated = validatePublishedExportCandidate(normalized);
  if (!validated.ok) {
    return {
      kind: "validation_failed",
      httpStatus: response.status,
      retryable: true,
      issues: validated.issues,
    };
  }

  const verified = verifyPublishedReadBack(args.expectedCandidate, body.text);
  if (!verified.ok) {
    if (verified.reason === "read-back-mismatch") {
      return {
        kind: "semantic_mismatch",
        httpStatus: response.status,
        retryable: true,
        issues: verified.issues,
      };
    }
    return {
      kind: "validation_failed",
      httpStatus: response.status,
      retryable: true,
      issues: verified.issues,
    };
  }

  return {
    kind: "verified",
    httpStatus: response.status,
    retryable: false,
  };
}

async function loadExpectedFromCommitBlob(args: {
  repoRoot: string;
  datasetRoot: string;
  commitSha: string;
  shotType: string;
  systemId: string;
}): Promise<
  | { ok: true; candidate: DatasetExportPayload; repoRelativePath: string }
  | { ok: false; reason: string; issues: string[]; fatal: boolean }
> {
  const leaf = repoRelativePublishedLeafPath(
    args.datasetRoot,
    args.shotType,
    args.systemId
  );
  if (!leaf.ok) {
    return { ok: false, reason: leaf.reason, issues: leaf.issues, fatal: true };
  }
  const validated = validateGitTargetPaths(args.repoRoot, args.datasetRoot, [
    leaf.repoRelativePath,
  ]);
  if (!validated.ok) {
    return {
      ok: false,
      reason: validated.reason,
      issues: validated.issues,
      fatal: true,
    };
  }
  const blob = await readCommittedBlobText({
    repoRoot: args.repoRoot,
    commitSha: args.commitSha,
    repoRelativePath: leaf.repoRelativePath,
  });
  if (!blob.ok) {
    return {
      ok: false,
      reason: blob.reason,
      issues: blob.issues,
      fatal: blob.status === "FATAL_COMMIT_SHA" || blob.status === "FATAL_BLOB_PATH",
    };
  }
  let raw: unknown;
  try {
    raw = JSON.parse(blob.text);
  } catch (e) {
    return {
      ok: false,
      reason: "expected-blob-json-invalid",
      issues: [e instanceof Error ? e.message : String(e)],
      fatal: true,
    };
  }
  // Keep raw parsed object as expected — verifyPublishedReadBack normalizes once.
  // Do not pre-normalize (normalize is not always idempotent).
  let forValidation: DatasetExportPayload;
  try {
    forValidation = normalizeDatasetExport(raw as DatasetExportPayload);
  } catch (e) {
    return {
      ok: false,
      reason: "expected-blob-normalize-failed",
      issues: [e instanceof Error ? e.message : String(e)],
      fatal: true,
    };
  }
  const v = validatePublishedExportCandidate(forValidation);
  if (!v.ok) {
    return {
      ok: false,
      reason: "expected-blob-validation-failed",
      issues: v.issues,
      fatal: true,
    };
  }
  return {
    ok: true,
    candidate: raw as DatasetExportPayload,
    repoRelativePath: leaf.repoRelativePath,
  };
}

async function verifyOneLeaf(args: {
  repoRoot: string;
  datasetRoot: string;
  commitSha: string;
  shotType: string;
  systemId: string;
  productionOrigin: string;
  poll: ProductionVerifyPollConfig;
  fetchFn?: typeof fetch;
  /** When set, skip blob read (tests inject expected candidate). */
  expectedCandidate?: DatasetExportPayload;
  skipInitialDelay?: boolean;
}): Promise<ProductionLeafResult> {
  const shotType = trimStr(args.shotType);
  const systemId = trimStr(args.systemId);
  let expected: DatasetExportPayload;
  if (args.expectedCandidate) {
    expected = args.expectedCandidate;
  } else {
    const loaded = await loadExpectedFromCommitBlob({
      repoRoot: args.repoRoot,
      datasetRoot: args.datasetRoot,
      commitSha: args.commitSha,
      shotType,
      systemId,
    });
    if (!loaded.ok) {
      return {
        shotType,
        systemId,
        attempts: 0,
        verified: false,
        lastKind: "fatal",
        issues: loaded.issues,
      };
    }
    expected = loaded.candidate;
  }

  const built = buildCanonicalProductionDatasetUrl({
    productionOrigin: args.productionOrigin,
    shotType,
    systemId,
    verifyToken: args.commitSha,
  });
  if (!built.ok) {
    return {
      shotType,
      systemId,
      attempts: 0,
      verified: false,
      lastKind: "fatal",
      issues: built.issues,
    };
  }

  if (!args.skipInitialDelay && args.poll.initialDelayMs > 0) {
    await sleep(args.poll.initialDelayMs);
  }

  const deadline = Date.now() + Math.max(0, args.poll.overallTimeoutMs);
  let attempts = 0;
  let lastKind: ProductionLeafAttemptKind | undefined;
  let lastHttpStatus: number | undefined;
  let lastIssues: string[] | undefined;

  while (true) {
    attempts += 1;
    const outcome = await fetchProductionLeafAttempt({
      url: built.url,
      origin: built.origin,
      expectedCandidate: expected,
      perRequestTimeoutMs: args.poll.perRequestTimeoutMs,
      maxResponseBytes: args.poll.maxResponseBytes,
      fetchFn: args.fetchFn,
    });
    lastKind = outcome.kind;
    lastHttpStatus = outcome.httpStatus;
    lastIssues = outcome.issues;

    if (outcome.kind === "verified") {
      return {
        shotType,
        systemId,
        attempts,
        verified: true,
        lastKind: "verified",
        lastHttpStatus,
      };
    }
    if (!outcome.retryable || outcome.kind === "fatal") {
      return {
        shotType,
        systemId,
        attempts,
        verified: false,
        lastKind,
        lastHttpStatus,
        issues: lastIssues,
      };
    }
    if (Date.now() >= deadline) {
      break;
    }
    const remaining = deadline - Date.now();
    if (remaining <= 0) break;
    await sleep(Math.min(args.poll.intervalMs, remaining));
    if (Date.now() >= deadline) break;
  }

  return {
    shotType,
    systemId,
    attempts,
    verified: false,
    lastKind,
    lastHttpStatus,
    issues: lastIssues ?? ["PRODUCTION_VERIFY_TIMEOUT"],
  };
}

/**
 * Verify one or more Published leaves against Production.
 * Expected state from commit blob unless test injects expectedCandidateByKey.
 */
export async function verifyProductionDatasetLeaves(args: {
  repoRoot: string;
  datasetRoot: string;
  /** Host-resolved pushed HEAD (or current HEAD for NO_CHANGE / retry). */
  commitSha: string;
  leaves: ProductionVerifyLeafInput[];
  productionOrigin?: string;
  poll?: Partial<ProductionVerifyPollConfig>;
  fetchFn?: typeof fetch;
  /** Test-only: map `${shotType}\0${systemId}` → expected payload (skips git blob). */
  expectedCandidateByKey?: Map<string, DatasetExportPayload>;
  skipInitialDelay?: boolean;
}): Promise<ProductionVerifyResult> {
  const leaves = Array.isArray(args.leaves) ? args.leaves : [];
  if (leaves.length === 0) {
    return {
      ok: false,
      status: "PRODUCTION_VERIFY_FAILED",
      reason: "leaves-empty",
      issues: ["leaves:empty"],
    };
  }

  const commitSha = trimStr(args.commitSha);
  if (!/^[0-9a-f]{7,40}$/i.test(commitSha)) {
    return {
      ok: false,
      status: "PRODUCTION_VERIFY_FAILED",
      reason: "commit-sha-invalid",
      issues: ["commitSha:format"],
    };
  }

  const origin = trimStr(args.productionOrigin) || CANONICAL_PRODUCTION_ORIGIN;
  const poll: ProductionVerifyPollConfig = {
    ...DEFAULT_PRODUCTION_VERIFY_POLL,
    ...args.poll,
  };

  // Deduplicate by shotType+systemId (same leaf multi-snapshot → one verify).
  const unique = new Map<string, ProductionVerifyLeafInput>();
  for (const leaf of leaves) {
    const shotType = trimStr(leaf.shotType);
    const systemId = trimStr(leaf.systemId);
    if (!shotType || !systemId) {
      return {
        ok: false,
        status: "PRODUCTION_VERIFY_FAILED",
        commitSha,
        reason: "leaf-identity-missing",
        issues: ["shotType-or-systemId:empty"],
      };
    }
    unique.set(`${shotType}\0${systemId}`, { shotType, systemId });
  }

  const uniqueLeaves = [...unique.values()];

  // Sequential leaf verification (bounded; personal Admin workflow).
  const results: ProductionLeafResult[] = [];
  for (const leaf of uniqueLeaves) {
    const key = `${leaf.shotType}\0${leaf.systemId}`;
    const injected = args.expectedCandidateByKey?.get(key);
    const result = await verifyOneLeaf({
      repoRoot: args.repoRoot,
      datasetRoot: args.datasetRoot,
      commitSha,
      shotType: leaf.shotType,
      systemId: leaf.systemId,
      productionOrigin: origin,
      poll,
      fetchFn: args.fetchFn,
      expectedCandidate: injected,
      skipInitialDelay: args.skipInitialDelay,
    });
    results.push(result);
    // Fatal without attempts → abort overall early
    if (!result.verified && result.lastKind === "fatal" && result.attempts === 0) {
      return {
        ok: false,
        status: "PRODUCTION_VERIFY_FAILED",
        commitSha,
        reason: "production-verify-fatal",
        issues: result.issues ?? ["fatal"],
        leaves: results,
      };
    }
  }

  const verifiedCount = results.filter((r) => r.verified).length;
  if (verifiedCount === results.length) {
    return {
      ok: true,
      status: "PRODUCTION_VERIFIED",
      commitSha,
      leaves: results,
    };
  }
  if (verifiedCount > 0) {
    return {
      ok: false,
      status: "PARTIAL_PRODUCTION_VERIFICATION",
      commitSha,
      reason: "partial-production-verification",
      issues: results
        .filter((r) => !r.verified)
        .map((r) => `${r.shotType}/${r.systemId}:${r.lastKind ?? "timeout"}`),
      leaves: results,
    };
  }

  const anyFatal = results.some((r) => r.lastKind === "fatal");
  return {
    ok: false,
    status: anyFatal
      ? "PRODUCTION_VERIFY_FAILED"
      : "PRODUCTION_VERIFY_TIMEOUT",
    commitSha,
    reason: anyFatal
      ? "production-verify-failed"
      : "production-verify-timeout",
    issues: [
      "Production did not reach expected dataset within verification window.",
    ],
    leaves: results,
  };
}

const VERIFY_FORBIDDEN_EXTRA = [
  "productionUrl",
  "verificationUrl",
  "host",
  "origin",
  "url",
  "commitSha",
  "commit",
  "branch",
  "remote",
  "gitCommand",
  "verifyToken",
] as const;

/**
 * HTTP body handler for POST /api/verify-production-dataset (retry / explicit verify).
 * Client may send shotType/systemId only. Host resolves HEAD + commit blob.
 */
export async function handleProductionVerifyHttpBody(args: {
  repoRoot: string;
  datasetRoot: string;
  body: unknown;
  productionOrigin?: string;
  poll?: Partial<ProductionVerifyPollConfig>;
  fetchFn?: typeof fetch;
}): Promise<{ statusCode: number; body: Record<string, unknown> }> {
  if (
    args.body == null ||
    typeof args.body !== "object" ||
    Array.isArray(args.body)
  ) {
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
  for (const key of VERIFY_FORBIDDEN_EXTRA) {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
      forbidden.push(`forbidden-field:${key}`);
    }
  }
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
  if (!Array.isArray(raw.items)) {
    return {
      statusCode: 400,
      body: {
        ok: false,
        reason: "items-required",
        issues: ["items:not-array"],
      },
    };
  }

  const leaves: ProductionVerifyLeafInput[] = [];
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
    for (const key of VERIFY_FORBIDDEN_EXTRA) {
      if (Object.prototype.hasOwnProperty.call(entry, key)) {
        entryForbidden.push(`forbidden-field:${key}`);
      }
    }
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
    leaves.push({
      shotType: trimStr(entry.shotType),
      systemId: trimStr(entry.systemId),
    });
  }

  const head = await resolveHeadCommitSha(args.repoRoot);
  if (!head.ok) {
    return {
      statusCode: 422,
      body: {
        ok: false,
        reason: head.reason,
        issues: head.issues,
        status: head.status,
      },
    };
  }

  const result = await verifyProductionDatasetLeaves({
    repoRoot: args.repoRoot,
    datasetRoot: args.datasetRoot,
    commitSha: head.commitSha,
    leaves,
    productionOrigin: args.productionOrigin,
    poll: args.poll,
    fetchFn: args.fetchFn,
  });

  return {
    statusCode: result.ok ? 200 : 422,
    body: { ...result },
  };
}
