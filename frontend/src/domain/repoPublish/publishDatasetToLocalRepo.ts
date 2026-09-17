/**
 * Phase 4-A — Browser client for local repo-relative Publish.
 * Dev-only endpoint. Never sends filesystem paths or shell commands.
 */

import type { PublishFamilyPayload } from "../publishFamilyPayload";
import type { PublishOperation } from "../publishOperation";

export const LOCAL_PUBLISH_ENDPOINT = "/api/publish-dataset";

export type LocalPublishClientItem = {
  snapshotId: string;
  shotType: string;
  systemId: string;
  publishOperation: PublishOperation;
  publishFamilyPayload: PublishFamilyPayload;
};

export type LocalPublishClientLeafResult =
  | {
      ok: true;
      snapshotId: string;
      status: "REPO_WRITTEN" | "NO_CHANGE";
      changed: boolean;
      leaf?: {
        shotType: string;
        systemId: string;
        systemLabel?: string;
        relativePosix?: string;
      };
    }
  | {
      ok: false;
      snapshotId: string;
      reason: string;
      issues?: string[];
      restored?: boolean;
      restoreFailed?: boolean;
    };

export type LocalPublishClientResult =
  | {
      ok: true;
      hostAvailable: true;
      results: LocalPublishClientLeafResult[];
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
      results?: LocalPublishClientLeafResult[];
    };

function isLocalDevRuntime(): boolean {
  if (typeof window === "undefined") return false;
  const host = window.location.hostname;
  return host === "localhost" || host === "127.0.0.1" || host === "[::1]";
}

/**
 * Publish C2 History artifacts to local repo via Vite dev middleware.
 * Does not open folder picker. Does not fall back to Export.
 */
export async function publishDatasetToLocalRepo(
  items: LocalPublishClientItem[],
  fetchFn: typeof fetch = fetch
): Promise<LocalPublishClientResult> {
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
        "Repo Publish는 로컬 Vite 개발 서버(localhost)에서만 사용할 수 있습니다. Export(폴더 선택)를 사용하세요.",
    };
  }

  let response: Response;
  try {
    response = await fetchFn(LOCAL_PUBLISH_ENDPOINT, {
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
          : "로컬 Publish host에 연결할 수 없습니다.",
    };
  }

  if (response.status === 404) {
    return {
      ok: false,
      hostAvailable: false,
      reason: "LOCAL_PUBLISH_HOST_UNAVAILABLE",
      message: "로컬 Publish endpoint가 없습니다 (Vite middleware).",
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
  if (Array.isArray(body.results)) {
    const results: LocalPublishClientLeafResult[] = body.results.map(
      (r: Record<string, unknown>) => {
        const snapshotId = String(r.snapshotId ?? "");
        if (r.ok === true) {
          return {
            ok: true,
            snapshotId,
            status: (r.status === "NO_CHANGE" ? "NO_CHANGE" : "REPO_WRITTEN") as
              | "REPO_WRITTEN"
              | "NO_CHANGE",
            changed: r.changed === true,
            leaf:
              r.leaf && typeof r.leaf === "object"
                ? (r.leaf as LocalPublishClientLeafResult & {
                    ok: true;
                  })["leaf"]
                : undefined,
          };
        }
        return {
          ok: false,
          snapshotId,
          reason: String(r.reason ?? "publish-failed"),
          issues: Array.isArray(r.issues)
            ? r.issues.map(String)
            : undefined,
          restored: r.restored === true,
          restoreFailed: r.restoreFailed === true,
        };
      }
    );
    const anyOk = results.some((r) => r.ok);
    if (anyOk) {
      return { ok: true, hostAvailable: true, results };
    }
    return {
      ok: false,
      hostAvailable: true,
      reason: String(body.reason ?? "publish-failed"),
      issues: Array.isArray(body.issues) ? body.issues.map(String) : undefined,
      results,
    };
  }

  // Single-result shape
  if (body.ok === true) {
    return {
      ok: true,
      hostAvailable: true,
      results: [
        {
          ok: true,
          snapshotId: String(
            items[0]?.snapshotId ?? body.snapshotId ?? ""
          ),
          status: (body.status === "NO_CHANGE" ? "NO_CHANGE" : "REPO_WRITTEN") as
            | "REPO_WRITTEN"
            | "NO_CHANGE",
          changed: body.changed === true,
        },
      ],
    };
  }

  return {
    ok: false,
    hostAvailable: true,
    reason: String(body.reason ?? "publish-failed"),
    issues: Array.isArray(body.issues) ? body.issues.map(String) : undefined,
  };
}
