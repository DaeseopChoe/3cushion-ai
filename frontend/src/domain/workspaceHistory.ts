/**
 * Workspace History - 스냅샷 누적 저장 및 복원
 * Position Recall 및 Export의 기반
 */

export const WORKSPACE_CURRENT_KEY = "workspace_current";
export const WORKSPACE_HISTORY_KEY = "workspace_history";

/** 전체 앱 상태 (복원 시 overwrite) */
export interface AppState {
  adminState: any;
  ballsState: any;
  dataset: any[];
  shotEditor: {
    activeSlot: "S1" | "S2" | "S3";
    slots: Record<string, { draft: any; applied: any }>;
  };
  /** 저장/데이터용 SSOT; 런타임 targetColor와 동일 값 */
  targetBall?: "yellow" | "red" | null;
}

export interface WorkspaceSnapshot {
  id: string;
  name: string;
  systemId: string;
  pattern: string;
  version: number;
  timestamp: string;
  state: AppState;
  exported?: boolean;
}

/** UUID v4 생성 */
export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/** 동일 systemId+pattern 기준 다음 버전 번호 */
export function getNextVersion(
  history: WorkspaceSnapshot[],
  systemId: string,
  pattern: string
): number {
  const sameGroup = history.filter(
    (s) => s.systemId === systemId && s.pattern === pattern
  );
  if (sameGroup.length === 0) return 1;
  const maxVer = Math.max(...sameGroup.map((s) => s.version), 0);
  return maxVer + 1;
}

/** 스냅샷 표시 이름 생성 (예: 뒤돌리기_5_half_system_v003_2026-03-19) */
export function buildSnapshotName(
  pattern: string,
  systemId: string,
  version: number,
  timestamp?: string
): string {
  const date = timestamp
    ? new Date(timestamp).toISOString().slice(0, 10).replace(/-/g, "-")
    : new Date().toISOString().slice(0, 10).replace(/-/g, "-");
  const verStr = `v${String(version).padStart(3, "0")}`;
  return `${pattern}_${systemId}_${verStr}_${date}`;
}

/** workspace_history 로드 (기존 스냅샷은 exported: false로 마이그레이션) */
export function loadWorkspaceHistory(): WorkspaceSnapshot[] {
  try {
    const raw = localStorage.getItem(WORKSPACE_HISTORY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    const arr = Array.isArray(parsed) ? parsed : [];
    return arr.map((s) => ({
      ...s,
      exported: s.exported === true,
    }));
  } catch {
    return [];
  }
}

/** workspace_history 저장 */
export function saveWorkspaceHistory(history: WorkspaceSnapshot[]): void {
  // #region agent log
  fetch("http://127.0.0.1:7608/ingest/d3b6e5e7-f840-44d2-9550-b3dacd8b3ccf", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": "a98f58",
    },
    body: JSON.stringify({
      sessionId: "a98f58",
      location: "workspaceHistory.ts:saveWorkspaceHistory",
      message: "saveWorkspaceHistory",
      data: {
        historyLength: Array.isArray(history) ? history.length : -1,
        stack: String(new Error().stack ?? "").slice(0, 3500),
      },
      timestamp: Date.now(),
      hypothesisId: "H1-H5",
    }),
  }).catch(() => {});
  // #endregion
  {
    const ts = Date.now();
    const last =
      Array.isArray(history) && history.length > 0
        ? history[history.length - 1]
        : null;
    console.group("[workspace_history save]");
    console.log("historyLength:", history?.length ?? "?");
    console.log("lastSnapshot:", last
      ? { name: last.name, version: last.version, id: last.id }
      : null);
    console.log("timestamp:", ts);
    console.trace();
    console.groupEnd();
  }
  try {
    localStorage.setItem(WORKSPACE_HISTORY_KEY, JSON.stringify(history));
  } catch (e) {
    console.warn("Failed to save workspace_history", e);
  }
}

/** ID로 스냅샷 찾기 */
export function findSnapshotById(
  history: WorkspaceSnapshot[],
  id: string
): WorkspaceSnapshot | null {
  return history.find((s) => s.id === id) ?? null;
}

/** ID로 스냅샷 삭제 */
export function deleteSnapshotById(id: string): WorkspaceSnapshot[] {
  const history = loadWorkspaceHistory();
  const next = history.filter((s) => s.id !== id);
  saveWorkspaceHistory(next);
  return next;
}

/** 최신순 정렬 기준, 가장 오래된 30개 삭제 */
export function deleteOldest30(): WorkspaceSnapshot[] {
  const history = loadWorkspaceHistory();
  const sorted = [...history].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
  const toRemoveCount = Math.min(30, sorted.length);
  if (toRemoveCount === 0) return history;
  const toRemove = sorted.slice(-toRemoveCount);
  const toRemoveIds = new Set(toRemove.map((s) => s.id));
  const next = history.filter((s) => !toRemoveIds.has(s.id));
  saveWorkspaceHistory(next);
  return next;
}

/** 선택된 스냅샷들의 exported를 true로 업데이트 */
export function updateSnapshotsExported(ids: string[]): void {
  const history = loadWorkspaceHistory();
  const idSet = new Set(ids);
  const next = history.map((s) =>
    idSet.has(s.id) ? { ...s, exported: true } : s
  );
  saveWorkspaceHistory(next);
}

/** 스냅샷을 JSON 파일로 다운로드 (새 파일 생성, 덮어쓰기 금지) */
export function downloadSnapshotAsJson(snapshot: WorkspaceSnapshot): void {
  const ts = snapshot.timestamp.replace(/[:.]/g, "-").slice(0, 19);
  const filename = `${snapshot.systemId}_${snapshot.pattern}_v${String(snapshot.version).padStart(3, "0")}_${ts}.json`;
  const data = JSON.stringify(snapshot, null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
