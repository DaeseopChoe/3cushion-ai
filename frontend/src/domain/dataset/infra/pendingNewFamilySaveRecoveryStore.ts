/**
 * Recovery record for a new-Family SAVE whose Derived Approval is not finished.
 *
 * Written when the Derived Review opens; removed on Approve, on cancel, on
 * review-start failure (never written), by manual local delete, or when the
 * PENDING History row it points at no longer exists.
 *
 * Holds only what an exact revert / review rebuild needs. The new Family itself
 * stays in LocalDB (normalized_dataset); it is never duplicated here.
 * Separate from AI sentence, Published and user-setting keys. Never clear().
 */

export const PENDING_NEW_FAMILY_SAVE_RECOVERY_KEY = "pending_new_family_save_recovery_v1";

export type RecoveryPathNode = { x: number; y: number } | null;

export type PendingNewFamilySaveRecoveryRecord = {
  schemaVersion: 1;
  kind: "PENDING_NEW_FAMILY_SAVE";
  historySnapshotId: string;
  familyId: string;
  /** normalized_dataset bytes right before SAVE (null = key was absent). */
  localDbRawBefore: string | null;
  /** digestCanonicalCorpusRaw() of the bytes that SAVE wrote. */
  localDbAfterSaveDigest: string;
  /** C3+ authored extension path at review start (C3+ candidates are rebuilt from it). */
  authoredPathNodes: RecoveryPathNode[];
  createdAt: string;
};

export type ReadPendingNewFamilySaveRecoveryResult =
  | { ok: true; present: false }
  | { ok: true; present: true; record: PendingNewFamilySaveRecoveryRecord }
  | {
      ok: false;
      code: "STORAGE_UNAVAILABLE" | "UNREADABLE" | "UNKNOWN_SCHEMA" | "INCOMPLETE";
      reason: string;
      /** Best-effort ids from a damaged record (for messages only). */
      historySnapshotId: string | null;
      familyId: string | null;
    };

function nonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isPathNode(v: unknown): v is RecoveryPathNode {
  if (v === null) return true;
  if (!v || typeof v !== "object") return false;
  const p = v as { x?: unknown; y?: unknown };
  return (
    typeof p.x === "number" && Number.isFinite(p.x) && typeof p.y === "number" && Number.isFinite(p.y)
  );
}

function hasLocalStorage(): boolean {
  return typeof localStorage !== "undefined" && localStorage != null;
}

export function readPendingNewFamilySaveRecovery(): ReadPendingNewFamilySaveRecoveryResult {
  if (!hasLocalStorage()) {
    return {
      ok: false,
      code: "STORAGE_UNAVAILABLE",
      reason: "localStorage is not available",
      historySnapshotId: null,
      familyId: null,
    };
  }
  let raw: string | null;
  try {
    raw = localStorage.getItem(PENDING_NEW_FAMILY_SAVE_RECOVERY_KEY);
  } catch (e) {
    return {
      ok: false,
      code: "STORAGE_UNAVAILABLE",
      reason: e instanceof Error ? e.message : String(e),
      historySnapshotId: null,
      familyId: null,
    };
  }
  if (raw == null) return { ok: true, present: false };

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (e) {
    return {
      ok: false,
      code: "UNREADABLE",
      reason: e instanceof Error ? e.message : String(e),
      historySnapshotId: null,
      familyId: null,
    };
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    return { ok: false, code: "UNREADABLE", reason: "not an object", historySnapshotId: null, familyId: null };
  }
  const r = parsed as Record<string, unknown>;
  const ids = {
    historySnapshotId: nonEmptyString(r.historySnapshotId) ? r.historySnapshotId : null,
    familyId: nonEmptyString(r.familyId) ? r.familyId : null,
  };
  if (r.schemaVersion !== 1 || r.kind !== "PENDING_NEW_FAMILY_SAVE") {
    return {
      ok: false,
      code: "UNKNOWN_SCHEMA",
      reason: `schemaVersion:${String(r.schemaVersion)} kind:${String(r.kind)}`,
      ...ids,
    };
  }
  const missing: string[] = [];
  if (!ids.historySnapshotId) missing.push("historySnapshotId");
  if (!ids.familyId) missing.push("familyId");
  if (!("localDbRawBefore" in r) || !(r.localDbRawBefore === null || typeof r.localDbRawBefore === "string")) {
    missing.push("localDbRawBefore");
  }
  if (!nonEmptyString(r.localDbAfterSaveDigest)) missing.push("localDbAfterSaveDigest");
  if (!Array.isArray(r.authoredPathNodes) || !r.authoredPathNodes.every(isPathNode)) {
    missing.push("authoredPathNodes");
  }
  if (missing.length > 0) {
    return { ok: false, code: "INCOMPLETE", reason: `missing:${missing.join(",")}`, ...ids };
  }
  return {
    ok: true,
    present: true,
    record: {
      schemaVersion: 1,
      kind: "PENDING_NEW_FAMILY_SAVE",
      historySnapshotId: ids.historySnapshotId!,
      familyId: ids.familyId!,
      localDbRawBefore: r.localDbRawBefore as string | null,
      localDbAfterSaveDigest: r.localDbAfterSaveDigest as string,
      authoredPathNodes: (r.authoredPathNodes as RecoveryPathNode[]).map((p) =>
        p ? { x: p.x, y: p.y } : null
      ),
      createdAt: typeof r.createdAt === "string" ? r.createdAt : "",
    },
  };
}

export function writePendingNewFamilySaveRecovery(
  record: Omit<PendingNewFamilySaveRecoveryRecord, "schemaVersion" | "kind" | "createdAt"> & {
    createdAt?: string;
  }
): { ok: true } | { ok: false; reason: string } {
  if (!hasLocalStorage()) return { ok: false, reason: "localStorage is not available" };
  const full: PendingNewFamilySaveRecoveryRecord = {
    schemaVersion: 1,
    kind: "PENDING_NEW_FAMILY_SAVE",
    historySnapshotId: record.historySnapshotId,
    familyId: record.familyId,
    localDbRawBefore: record.localDbRawBefore,
    localDbAfterSaveDigest: record.localDbAfterSaveDigest,
    authoredPathNodes: record.authoredPathNodes.map((p) => (p ? { x: p.x, y: p.y } : null)),
    createdAt: record.createdAt ?? new Date().toISOString(),
  };
  const serialized = JSON.stringify(full);
  try {
    localStorage.setItem(PENDING_NEW_FAMILY_SAVE_RECOVERY_KEY, serialized);
    if (localStorage.getItem(PENDING_NEW_FAMILY_SAVE_RECOVERY_KEY) !== serialized) {
      localStorage.removeItem(PENDING_NEW_FAMILY_SAVE_RECOVERY_KEY);
      return { ok: false, reason: "recovery record readback mismatch" };
    }
    return { ok: true };
  } catch (e) {
    return { ok: false, reason: e instanceof Error ? e.message : String(e) };
  }
}

/**
 * Removes the recovery record. With `expectedSnapshotId`, removes it only when
 * it belongs to that History row (a damaged record is then left alone).
 */
export function clearPendingNewFamilySaveRecovery(expectedSnapshotId?: string): { cleared: boolean } {
  if (!hasLocalStorage()) return { cleared: false };
  try {
    if (localStorage.getItem(PENDING_NEW_FAMILY_SAVE_RECOVERY_KEY) == null) return { cleared: false };
    if (expectedSnapshotId !== undefined) {
      const read = readPendingNewFamilySaveRecovery();
      const id = read.ok ? (read.present ? read.record.historySnapshotId : null) : read.historySnapshotId;
      if (id !== expectedSnapshotId) return { cleared: false };
    }
    localStorage.removeItem(PENDING_NEW_FAMILY_SAVE_RECOVERY_KEY);
    return { cleared: localStorage.getItem(PENDING_NEW_FAMILY_SAVE_RECOVERY_KEY) == null };
  } catch {
    return { cleared: false };
  }
}
