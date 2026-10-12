import type { WorkHistoryIndexEntry, WorkHistorySnapshot } from "./workHistoryModel";

export const WORK_HISTORY_API_PATH = "/api/work-history";

export const WORK_HISTORY_HOST_UNAVAILABLE_MESSAGE =
  "작업 History를 사용할 수 없습니다. 관리자 컴퓨터에서 실행하세요.";

export type WorkHistoryApiFailure = { ok: false; code: string; message: string };

export type WorkHistoryApi = {
  list(): Promise<{ ok: true; entries: WorkHistoryIndexEntry[] } | WorkHistoryApiFailure>;
  read(
    snapshotId: string,
  ): Promise<{ ok: true; entry: WorkHistoryIndexEntry; snapshot: WorkHistorySnapshot } | WorkHistoryApiFailure>;
  createPending(input: unknown): Promise<{ ok: true; entry: WorkHistoryIndexEntry } | WorkHistoryApiFailure>;
  createApproved(input: unknown): Promise<{ ok: true; entry: WorkHistoryIndexEntry } | WorkHistoryApiFailure>;
  approve(input: unknown): Promise<{ ok: true; entry: WorkHistoryIndexEntry } | WorkHistoryApiFailure>;
  markPublished(input: unknown): Promise<{ ok: true; entries: WorkHistoryIndexEntry[] } | WorkHistoryApiFailure>;
  remove(input: unknown): Promise<{ ok: true; removed: string[] } | WorkHistoryApiFailure>;
  cancelPending(input: unknown): Promise<{ ok: true; removed: string[] } | WorkHistoryApiFailure>;
  importSnapshots(
    input: unknown,
  ): Promise<{ ok: true; imported: string[]; existing: string[] } | WorkHistoryApiFailure>;
};

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body: string }) => Promise<{
  json(): Promise<unknown>;
}>;

function hostUnavailable(): WorkHistoryApiFailure {
  return { ok: false, code: "HOST_UNAVAILABLE", message: WORK_HISTORY_HOST_UNAVAILABLE_MESSAGE };
}

export function createWorkHistoryHttpApi(fetchFn?: FetchLike): WorkHistoryApi {
  const doFetch: FetchLike | undefined =
    fetchFn ?? (typeof fetch === "function" ? (fetch as unknown as FetchLike) : undefined);

  async function call(op: string, input: unknown): Promise<any> {
    if (!doFetch) return hostUnavailable();
    try {
      const res = await doFetch(WORK_HISTORY_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ op, input: input ?? null }),
      });
      const body = (await res.json()) as any;
      if (!body || typeof body !== "object" || typeof body.ok !== "boolean") return hostUnavailable();
      if (body.ok === false) {
        return {
          ok: false,
          code: typeof body.code === "string" ? body.code : "INTERNAL",
          message: typeof body.message === "string" ? body.message : WORK_HISTORY_HOST_UNAVAILABLE_MESSAGE,
        };
      }
      return body;
    } catch {
      return hostUnavailable();
    }
  }

  return {
    list: () => call("list", null),
    read: (snapshotId) => call("read", { snapshotId }),
    createPending: (input) => call("createPending", input),
    createApproved: (input) => call("createApproved", input),
    approve: (input) => call("approve", input),
    markPublished: (input) => call("markPublished", input),
    remove: (input) => call("remove", input),
    cancelPending: (input) => call("cancelPending", input),
    importSnapshots: (input) => call("importSnapshots", input),
  };
}

let defaultApi: WorkHistoryApi | null = null;

export function getWorkHistoryApi(): WorkHistoryApi {
  if (!defaultApi) defaultApi = createWorkHistoryHttpApi();
  return defaultApi;
}
