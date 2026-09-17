/**
 * Phase 4-B/C — Browser client for Git-enabled local Publish + Production verify.
 * Dev-only. Never sends paths, branch, remote, git commands, URLs, or commit SHA.
 */

import type { LocalPublishClientItem } from "./publishDatasetToLocalRepo";

export const LOCAL_GIT_PUBLISH_ENDPOINT = "/api/publish-dataset-git";
export const LOCAL_PRODUCTION_VERIFY_ENDPOINT =
  "/api/verify-production-dataset";

export type ProductionClientLeaf = {
  shotType: string;
  systemId: string;
  attempts: number;
  verified: boolean;
  lastKind?: string;
  lastHttpStatus?: number;
};

export type ProductionClientResult = {
  ok: boolean;
  status: string;
  commitSha?: string;
  reason?: string;
  issues?: string[];
  leaves?: ProductionClientLeaf[];
};

export type GitPublishClientResult =
  | {
      ok: true;
      hostAvailable: true;
      status: "PUSHED" | "VERIFIED_NO_CHANGE" | "PRODUCTION_VERIFIED";
      gitStatus?: "PUSHED" | "VERIFIED_NO_CHANGE";
      results: Array<
        | {
            ok: true;
            snapshotId: string;
            status: "REPO_WRITTEN" | "NO_CHANGE";
            changed: boolean;
          }
        | {
            ok: false;
            snapshotId: string;
            reason: string;
            issues?: string[];
          }
      >;
      changedTargets?: string[];
      commit?: string;
      production?: ProductionClientResult;
    }
  | {
      ok: false;
      hostAvailable: false;
      reason: "LOCAL_PUBLISH_HOST_UNAVAILABLE";
      message: string;
    }
  | {
      ok: false;
      hostAvailable: true;
      reason: string;
      issues?: string[];
      status?: string;
      results?: unknown[];
      localCommit?: string;
      repoWritten?: boolean;
      gitStatus?: "PUSHED" | "VERIFIED_NO_CHANGE";
      commit?: string;
      production?: ProductionClientResult;
    };

function isLocalDevRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

function parseProduction(
  raw: unknown
): ProductionClientResult | undefined {
  if (!raw || typeof raw !== "object") return undefined;
  const p = raw as Record<string, unknown>;
  return {
    ok: p.ok === true,
    status: typeof p.status === "string" ? p.status : "UNKNOWN",
    commitSha: typeof p.commitSha === "string" ? p.commitSha : undefined,
    reason: typeof p.reason === "string" ? p.reason : undefined,
    issues: Array.isArray(p.issues) ? p.issues.map(String) : undefined,
    leaves: Array.isArray(p.leaves)
      ? (p.leaves as ProductionClientLeaf[])
      : undefined,
  };
}

/**
 * Git-enabled Publish (preflight → repo write → commit → push → Production verify).
 * Does not open folder picker. Does not fall back to Export or repo-only.
 */
export async function publishDatasetToLocalRepoWithGit(
  items: LocalPublishClientItem[],
  fetchFn: typeof fetch = fetch
): Promise<GitPublishClientResult> {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      ok: false,
      hostAvailable: true,
      reason: "empty-items",
      issues: ["items:empty"],
    };
  }

  if (!isLocalDevRuntime()) {
    return {
      ok: false,
      hostAvailable: false,
      reason: "LOCAL_PUBLISH_HOST_UNAVAILABLE",
      message:
        "Git Publish는 로컬 Vite 개발 서버(localhost)에서만 사용할 수 있습니다.",
    };
  }

  let response: Response;
  try {
    response = await fetchFn(LOCAL_GIT_PUBLISH_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
      },
      body: JSON.stringify({
        items: items.map((it) => ({
          snapshotId: it.snapshotId,
          shotType: it.shotType,
          systemId: it.systemId,
          publishOperation: it.publishOperation,
          publishFamilyPayload: it.publishFamilyPayload,
        })),
      }),
    });
  } catch (e) {
    return {
      ok: false,
      hostAvailable: false,
      reason: "LOCAL_PUBLISH_HOST_UNAVAILABLE",
      message:
        e instanceof Error
          ? e.message
          : "로컬 Git Publish host에 연결할 수 없습니다.",
    };
  }

  if (response.status === 404) {
    return {
      ok: false,
      hostAvailable: false,
      reason: "LOCAL_PUBLISH_HOST_UNAVAILABLE",
      message: "로컬 Git Publish endpoint가 없습니다 (Vite middleware).",
    };
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch (e) {
    return {
      ok: false,
      hostAvailable: true,
      reason: "host-response-invalid",
      issues: [e instanceof Error ? e.message : String(e)],
    };
  }

  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      hostAvailable: true,
      reason: "host-response-invalid",
      issues: ["response:not-object"],
    };
  }

  const body = raw as Record<string, unknown>;
  const production = parseProduction(body.production);
  const gitStatus =
    body.gitStatus === "VERIFIED_NO_CHANGE"
      ? "VERIFIED_NO_CHANGE"
      : body.gitStatus === "PUSHED"
        ? "PUSHED"
        : undefined;

  if (body.ok === true) {
    const status =
      body.status === "PRODUCTION_VERIFIED"
        ? "PRODUCTION_VERIFIED"
        : body.status === "VERIFIED_NO_CHANGE"
          ? "VERIFIED_NO_CHANGE"
          : "PUSHED";
    return {
      ok: true,
      hostAvailable: true,
      status,
      gitStatus,
      results: Array.isArray(body.results)
        ? (body.results as GitPublishClientResult & { ok: true })["results"]
        : [],
      changedTargets: Array.isArray(body.changedTargets)
        ? body.changedTargets.map(String)
        : undefined,
      commit: typeof body.commit === "string" ? body.commit : undefined,
      production,
    };
  }

  return {
    ok: false,
    hostAvailable: true,
    reason: String(body.reason ?? "git-publish-failed"),
    issues: Array.isArray(body.issues) ? body.issues.map(String) : undefined,
    status: typeof body.status === "string" ? body.status : undefined,
    results: Array.isArray(body.results) ? body.results : undefined,
    localCommit:
      typeof body.localCommit === "string" ? body.localCommit : undefined,
    repoWritten: body.repoWritten === true,
    gitStatus,
    commit: typeof body.commit === "string" ? body.commit : undefined,
    production,
  };
}

/**
 * Production read-back only (retry after timeout). No write / commit / push.
 * Host resolves HEAD + commit blob. Client cannot send URL/host/path/SHA.
 */
export async function verifyProductionDatasetLocal(
  items: Array<{ shotType: string; systemId: string }>,
  fetchFn: typeof fetch = fetch
): Promise<
  | {
      ok: true;
      hostAvailable: true;
      status: "PRODUCTION_VERIFIED";
      commitSha?: string;
      leaves?: ProductionClientLeaf[];
    }
  | {
      ok: false;
      hostAvailable: false;
      reason: "LOCAL_PUBLISH_HOST_UNAVAILABLE";
      message: string;
    }
  | {
      ok: false;
      hostAvailable: true;
      reason: string;
      status?: string;
      issues?: string[];
      commitSha?: string;
      leaves?: ProductionClientLeaf[];
    }
> {
  if (!Array.isArray(items) || items.length === 0) {
    return {
      ok: false,
      hostAvailable: true,
      reason: "empty-items",
      issues: ["items:empty"],
    };
  }
  if (!isLocalDevRuntime()) {
    return {
      ok: false,
      hostAvailable: false,
      reason: "LOCAL_PUBLISH_HOST_UNAVAILABLE",
      message:
        "Production verify는 로컬 Vite 개발 서버(localhost)에서만 사용할 수 있습니다.",
    };
  }

  let response: Response;
  try {
    response = await fetchFn(LOCAL_PRODUCTION_VERIFY_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        Accept: "application/json",
      },
      body: JSON.stringify({
        items: items.map((it) => ({
          shotType: it.shotType,
          systemId: it.systemId,
        })),
      }),
    });
  } catch (e) {
    return {
      ok: false,
      hostAvailable: false,
      reason: "LOCAL_PUBLISH_HOST_UNAVAILABLE",
      message:
        e instanceof Error
          ? e.message
          : "로컬 Production verify host에 연결할 수 없습니다.",
    };
  }

  if (response.status === 404) {
    return {
      ok: false,
      hostAvailable: false,
      reason: "LOCAL_PUBLISH_HOST_UNAVAILABLE",
      message: "로컬 Production verify endpoint가 없습니다.",
    };
  }

  let raw: unknown;
  try {
    raw = await response.json();
  } catch (e) {
    return {
      ok: false,
      hostAvailable: true,
      reason: "host-response-invalid",
      issues: [e instanceof Error ? e.message : String(e)],
    };
  }
  if (!raw || typeof raw !== "object") {
    return {
      ok: false,
      hostAvailable: true,
      reason: "host-response-invalid",
      issues: ["response:not-object"],
    };
  }
  const body = raw as Record<string, unknown>;
  const leaves = Array.isArray(body.leaves)
    ? (body.leaves as ProductionClientLeaf[])
    : undefined;
  if (body.ok === true) {
    return {
      ok: true,
      hostAvailable: true,
      status: "PRODUCTION_VERIFIED",
      commitSha:
        typeof body.commitSha === "string" ? body.commitSha : undefined,
      leaves,
    };
  }
  return {
    ok: false,
    hostAvailable: true,
    reason: String(body.reason ?? "production-verify-failed"),
    status: typeof body.status === "string" ? body.status : undefined,
    issues: Array.isArray(body.issues) ? body.issues.map(String) : undefined,
    commitSha: typeof body.commitSha === "string" ? body.commitSha : undefined,
    leaves,
  };
}
