/**
 * Phase 4-B — Git-enabled Publish orchestration.
 *
 * Git preflight → Phase 4-A verified repo write → stage/commit/push.
 * Keeps 4-A write owner separate from Git owner.
 */

import path from "node:path";
import { DATASET_ROOT_DIR } from "../datasetPath";
import type { PublishFamilyPayload } from "../publishFamilyPayload";
import type { PublishOperation } from "../publishOperation";
import {
  rejectClientPathOrCommandFields,
  publishDatasetBatchToRepo,
  type LocalPublishBatchItem,
  type LocalPublishBatchItemResult,
} from "./publishDatasetToRepo";
import { resolvePublishedLeafAbsolutePath } from "./resolveRepoLeafPath";
import {
  buildGitCommitMessage,
  runGitPreflight,
  stageCommitAndPush,
  validateGitTargetPaths,
  verifyPostWriteWorkingTree,
} from "./gitPublish";
import {
  verifyProductionDatasetLeaves,
  type ProductionVerifyPollConfig,
  type ProductionVerifyResult,
} from "./productionVerify";
import { CANONICAL_PRODUCTION_ORIGIN } from "./productionOrigin";

export type GitPublishItem = {
  snapshotId: string;
  shotType: string;
  systemId: string;
  publishOperation: PublishOperation;
  publishFamilyPayload: PublishFamilyPayload;
};

export type GitPublishOrchestrationOk = {
  ok: true;
  /** Git outcome; PRODUCTION_VERIFIED when Production read-back also passes. */
  status: "PUSHED" | "VERIFIED_NO_CHANGE" | "PRODUCTION_VERIFIED";
  /** Underlying Git status before Production verify (unchanged 4-B semantics). */
  gitStatus: "PUSHED" | "VERIFIED_NO_CHANGE";
  results: LocalPublishBatchItemResult[];
  changedTargets: string[];
  commit?: string;
  production?: ProductionVerifyResult;
};

export type GitPublishOrchestrationFail = {
  ok: false;
  reason: string;
  issues: string[];
  status?: string;
  results?: LocalPublishBatchItemResult[];
  localCommit?: string;
  /** Disk may have been written when Git failed after write. */
  repoWritten?: boolean;
  /** Present when Git succeeded but Production verify did not. */
  gitStatus?: "PUSHED" | "VERIFIED_NO_CHANGE";
  commit?: string;
  production?: ProductionVerifyResult;
};

export type GitPublishOrchestrationResult =
  | GitPublishOrchestrationOk
  | GitPublishOrchestrationFail;

function resolveExpectedGitTargets(
  repoRoot: string,
  datasetRoot: string,
  items: GitPublishItem[]
): { ok: true; targets: string[] } | GitPublishOrchestrationFail {
  const targets: string[] = [];
  for (const item of items) {
    const resolved = resolvePublishedLeafAbsolutePath(
      datasetRoot,
      item.shotType,
      item.systemId
    );
    if (!resolved.ok) {
      return {
        ok: false,
        reason: resolved.reason,
        issues: resolved.issues,
        status: "TARGET_RESOLVE_FAILED",
      };
    }
    // repo-relative: dataset/{shot}/{system}/positions.json
    targets.push(`${DATASET_ROOT_DIR}/${resolved.relativePosix}`);
  }
  const validated = validateGitTargetPaths(repoRoot, datasetRoot, targets);
  if (!validated.ok) {
    return {
      ok: false,
      reason: validated.reason,
      issues: validated.issues,
      status: validated.status,
    };
  }
  return { ok: true, targets: validated.targets };
}

function uniqueLeafInputs(items: GitPublishItem[]): {
  shotType: string;
  systemId: string;
}[] {
  const map = new Map<string, { shotType: string; systemId: string }>();
  for (const it of items) {
    const shotType = String(it.shotType ?? "").trim();
    const systemId = String(it.systemId ?? "").trim();
    if (!shotType || !systemId) continue;
    map.set(`${shotType}\0${systemId}`, { shotType, systemId });
  }
  return [...map.values()];
}

async function attachProductionVerification(args: {
  repoRoot: string;
  datasetRoot: string;
  items: GitPublishItem[];
  gitStatus: "PUSHED" | "VERIFIED_NO_CHANGE";
  commitSha: string;
  results: LocalPublishBatchItemResult[];
  changedTargets: string[];
  verifyProduction?: boolean;
  productionOrigin?: string;
  productionPoll?: Partial<ProductionVerifyPollConfig>;
  productionFetchFn?: typeof fetch;
}): Promise<GitPublishOrchestrationResult> {
  if (args.verifyProduction === false) {
    return {
      ok: true,
      status: args.gitStatus,
      gitStatus: args.gitStatus,
      results: args.results,
      changedTargets: args.changedTargets,
      commit: args.commitSha,
    };
  }

  const production = await verifyProductionDatasetLeaves({
    repoRoot: args.repoRoot,
    datasetRoot: args.datasetRoot,
    commitSha: args.commitSha,
    leaves: uniqueLeafInputs(args.items),
    productionOrigin: args.productionOrigin ?? CANONICAL_PRODUCTION_ORIGIN,
    poll: args.productionPoll,
    fetchFn: args.productionFetchFn,
  });

  if (production.ok) {
    return {
      ok: true,
      status: "PRODUCTION_VERIFIED",
      gitStatus: args.gitStatus,
      results: args.results,
      changedTargets: args.changedTargets,
      commit: args.commitSha,
      production,
    };
  }

  // Git succeeded; Production observation incomplete — not a Git rollback.
  return {
    ok: false,
    reason: production.reason,
    issues: production.issues,
    status: production.status,
    results: args.results,
    gitStatus: args.gitStatus,
    commit: args.commitSha,
    production,
    repoWritten: args.changedTargets.length > 0,
  };
}

/**
 * Full Git-enabled Publish (fail-closed for commit: all writes must succeed).
 * Phase 4-C: after PUSHED or VERIFIED_NO_CHANGE, Production read-back verify.
 */
export async function publishDatasetBatchWithGit(args: {
  repoRoot: string;
  datasetRoot: string;
  items: GitPublishItem[];
  fetchRemote?: boolean;
  /** Default true. Set false in Git-only unit tests. */
  verifyProduction?: boolean;
  productionOrigin?: string;
  productionPoll?: Partial<ProductionVerifyPollConfig>;
  productionFetchFn?: typeof fetch;
}): Promise<GitPublishOrchestrationResult> {
  const { repoRoot, datasetRoot, items } = args;
  const fetchRemote = args.fetchRemote !== false;

  if (!Array.isArray(items) || items.length === 0) {
    return {
      ok: false,
      reason: "empty-items",
      issues: ["items:empty"],
    };
  }

  const expected = resolveExpectedGitTargets(repoRoot, datasetRoot, items);
  if (!expected.ok) return expected;

  const preflight = await runGitPreflight({
    repoRoot,
    datasetRoot,
    expectedTargets: expected.targets,
    fetchRemote,
  });
  if (!preflight.ok) {
    return {
      ok: false,
      reason: preflight.reason,
      issues: preflight.issues,
      status: preflight.status,
    };
  }

  // Phase 4-A writes (only after Git preflight)
  const batchItems: LocalPublishBatchItem[] = items.map((it) => ({
    snapshotId: it.snapshotId,
    shotType: it.shotType,
    systemId: it.systemId,
    publishOperation: it.publishOperation,
    publishFamilyPayload: it.publishFamilyPayload,
  }));
  const results = publishDatasetBatchToRepo({
    datasetRoot,
    items: batchItems,
  });

  const anyFail = results.some((r) => !r.ok);
  if (anyFail) {
    return {
      ok: false,
      reason: "repo-write-partial-or-failed",
      issues: results
        .filter((r) => !r.ok)
        .map((r) =>
          r.ok === false ? `${r.snapshotId}:${r.reason}` : ""
        )
        .filter(Boolean),
      status: "REPO_WRITE_FAILED",
      results,
      repoWritten: results.some((r) => r.ok && r.changed),
    };
  }

  const changedTargets: string[] = [];
  for (const r of results) {
    if (r.ok && r.changed && r.leaf?.relativePosix) {
      changedTargets.push(`${DATASET_ROOT_DIR}/${r.leaf.relativePosix}`);
    }
  }
  const uniqueChanged = [
    ...new Set(changedTargets.map((p) => p.replace(/\\/g, "/"))),
  ].sort();

  if (uniqueChanged.length === 0) {
    // NO_CHANGE: still verify Production vs current HEAD blob (recommended).
    return attachProductionVerification({
      repoRoot,
      datasetRoot,
      items,
      gitStatus: "VERIFIED_NO_CHANGE",
      commitSha: preflight.head,
      results,
      changedTargets: [],
      verifyProduction: args.verifyProduction,
      productionOrigin: args.productionOrigin,
      productionPoll: args.productionPoll,
      productionFetchFn: args.productionFetchFn,
    });
  }

  const post = await verifyPostWriteWorkingTree({
    repoRoot,
    baselineDirtyPaths: preflight.baselineDirtyPaths,
    changedTargets: uniqueChanged,
  });
  if (!post.ok) {
    return {
      ok: false,
      reason: post.reason,
      issues: post.issues,
      status: post.status,
      results,
      repoWritten: true,
    };
  }

  const gitResult = await stageCommitAndPush({
    repoRoot,
    datasetRoot,
    changedTargets: uniqueChanged,
    commitMessage: buildGitCommitMessage({ changedTargets: uniqueChanged }),
    fetchRemote,
  });

  if (!gitResult.ok) {
    return {
      ok: false,
      reason: gitResult.reason,
      issues: gitResult.issues,
      status: gitResult.status,
      results,
      repoWritten: true,
      localCommit: gitResult.localCommit,
    };
  }

  return attachProductionVerification({
    repoRoot,
    datasetRoot,
    items,
    gitStatus: "PUSHED",
    commitSha: gitResult.commit,
    results,
    changedTargets: uniqueChanged,
    verifyProduction: args.verifyProduction,
    productionOrigin: args.productionOrigin,
    productionPoll: args.productionPoll,
    productionFetchFn: args.productionFetchFn,
  });
}

/** HTTP body handler for `/api/publish-dataset-git`. */
export async function handleGitPublishHttpBody(args: {
  repoRoot: string;
  datasetRoot: string;
  body: unknown;
  fetchRemote?: boolean;
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
  // Extra Git injection fields
  for (const key of [
    "branch",
    "remote",
    "gitCommand",
    "commitMessage",
    "commitArgs",
    "productionUrl",
    "verificationUrl",
    "host",
    "origin",
    "url",
    "commitSha",
    "path",
  ]) {
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

  const items: GitPublishItem[] = [];
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
    for (const key of ["branch", "remote", "gitCommand", "path", "repoRoot"]) {
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
    const snapshotId =
      typeof entry.snapshotId === "string" ? entry.snapshotId.trim() : "";
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
      shotType:
        typeof entry.shotType === "string" ? entry.shotType.trim() : "",
      systemId:
        typeof entry.systemId === "string" ? entry.systemId.trim() : "",
      publishOperation: entry.publishOperation as PublishOperation,
      publishFamilyPayload:
        entry.publishFamilyPayload as PublishFamilyPayload,
    });
  }

  const result = await publishDatasetBatchWithGit({
    repoRoot: args.repoRoot,
    datasetRoot: args.datasetRoot,
    items,
    fetchRemote: args.fetchRemote,
  });

  // Never leak absolute paths in response
  const sanitized = { ...result } as Record<string, unknown>;
  if (Array.isArray(result.results)) {
    sanitized.results = result.results.map((r) => {
      if (!r.ok) return r;
      const leaf = { ...r.leaf };
      delete (leaf as { absolutePath?: string }).absolutePath;
      return { ...r, leaf };
    });
  }

  return {
    statusCode: result.ok ? 200 : 422,
    body: sanitized,
  };
}

export function resolveRepoRootFromDatasetRoot(datasetRoot: string): string {
  return path.resolve(datasetRoot, "..");
}
