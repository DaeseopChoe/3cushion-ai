/**
 * Localhost-only work History file store: <repoRoot>/.workspace-data
 *
 *   history-index.json            list metadata (commit point of the ledger)
 *   history/snapshot-<id>.json    one work item (screen state + Family graph)
 *
 * Loaded only by the Vite dev middleware (ssrLoadModule) and tests; never
 * bundled for Production. Requests never carry paths: the folder is fixed to
 * repoRoot, snapshotIds are strictly validated, and error bodies carry short
 * codes and messages only.
 *
 * Consistency: every file write is temp file + rename. Snapshot files are
 * written first, then the index; a failed index write restores the previous
 * snapshot bytes. A snapshot is used only when its revision and status match
 * its index entry, so leftovers (temp files, files without an index entry,
 * half-restored snapshots) are never read as the ledger.
 */

import nodeFs from "node:fs";
import path from "node:path";
import { buildSnapshotName } from "../workspaceHistory";
import { systemIdToFolderLabel } from "../datasetPath";
import { validatePublishOperation, type PublishOperation } from "../publishOperation";
import {
  countPublishFamilyGraphDerivedMembers,
  crossValidateOperationAndGraph,
  isDerivedMemberOrigin,
  validatePublishFamilyGraph,
  type PublishFamilyGraph,
} from "../publishFamilyGraph";
import { buildPublishClientItemFromSnapshot } from "../historyPublishInput";
import {
  buildWorkHistoryIndexEntry,
  deriveWorkHistoryStatus,
  isValidWorkHistorySnapshotId,
  newWorkHistorySnapshotId,
  WORK_HISTORY_SCHEMA_VERSION,
  type WorkHistoryIndex,
  type WorkHistoryIndexEntry,
  type WorkHistoryPathNode,
  type WorkHistorySnapshot,
  type WorkHistoryStatus,
} from "./workHistoryModel";

export const WORK_HISTORY_DIR_NAME = ".workspace-data";
const INDEX_FILE = "history-index.json";
const SNAPSHOT_DIR = "history";
const MAX_PATH_NODES = 64;
const MAX_LABEL_LENGTH = 80;

export type WorkHistoryIo = {
  readFileSync(p: string, encoding: BufferEncoding): string;
  writeFileSync(p: string, data: string): void;
  renameSync(from: string, to: string): void;
  unlinkSync(p: string): void;
  existsSync(p: string): boolean;
  mkdirSync(p: string, options: { recursive: true }): void;
};

const NODE_IO: WorkHistoryIo = {
  readFileSync: (p, encoding) => nodeFs.readFileSync(p, encoding),
  writeFileSync: (p, data) => nodeFs.writeFileSync(p, data, "utf8"),
  renameSync: (from, to) => nodeFs.renameSync(from, to),
  unlinkSync: (p) => nodeFs.unlinkSync(p),
  existsSync: (p) => nodeFs.existsSync(p),
  mkdirSync: (p, options) => {
    nodeFs.mkdirSync(p, options);
  },
};

export type WorkHistoryErrorCode =
  | "INVALID_ID"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "NOT_PENDING"
  | "NOT_APPROVED"
  | "FAMILY_MISMATCH"
  | "GRAPH_INVALID"
  | "INDEX_UNREADABLE"
  | "SNAPSHOT_UNREADABLE"
  | "SNAPSHOT_MISMATCH"
  | "WRITE_FAILED"
  | "UNKNOWN_OP"
  | "INTERNAL";

export const WORK_HISTORY_ERROR_MESSAGES: Record<WorkHistoryErrorCode, string> = {
  INVALID_ID: "잘못된 History 항목입니다.",
  INVALID_INPUT: "History에 저장할 작업 내용이 올바르지 않습니다.",
  NOT_FOUND: "History 항목을 찾을 수 없습니다.",
  NOT_PENDING: "파생 승인 전 작업이 아닙니다.",
  NOT_APPROVED: "승인되지 않은 작업은 Published로 표시할 수 없습니다.",
  FAMILY_MISMATCH: "History 항목의 Family가 이번 작업과 다릅니다.",
  GRAPH_INVALID: "승인할 Family 내용이 저장된 작업과 맞지 않습니다.",
  INDEX_UNREADABLE: "History 목록을 읽을 수 없습니다.",
  SNAPSHOT_UNREADABLE: "History 작업 내용을 읽을 수 없습니다.",
  SNAPSHOT_MISMATCH: "History 기록이 서로 맞지 않아 이 작업을 사용할 수 없습니다.",
  WRITE_FAILED: "History에 저장하지 못했습니다.",
  UNKNOWN_OP: "지원하지 않는 요청입니다.",
  INTERNAL: "History를 처리하지 못했습니다.",
};

export type WorkHistoryFailure = { ok: false; code: WorkHistoryErrorCode; message: string };

function fail(code: WorkHistoryErrorCode): WorkHistoryFailure {
  return { ok: false, code, message: WORK_HISTORY_ERROR_MESSAGES[code] };
}

export type CreatePendingInput = {
  state: unknown;
  publishOperation: PublishOperation;
  pendingFamilyGraph: PublishFamilyGraph;
  authoredPathNodes?: WorkHistoryPathNode[];
  shotType: string;
  systemId: string;
};

export type CreateApprovedInput = {
  mode: "OVERWRITE_PRESERVED" | "IMMEDIATE";
  state: unknown;
  publishOperation: PublishOperation | null;
  graph: PublishFamilyGraph | null;
  shotType: string;
  systemId: string;
};

type EntryResult = { ok: true; entry: WorkHistoryIndexEntry } | WorkHistoryFailure;

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function cleanLabel(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t && t.length <= MAX_LABEL_LENGTH ? t : null;
}

function cleanPathNodes(v: unknown): WorkHistoryPathNode[] | null {
  if (v == null) return [];
  if (!Array.isArray(v) || v.length > MAX_PATH_NODES) return null;
  const out: WorkHistoryPathNode[] = [];
  for (const p of v) {
    if (p === null) {
      out.push(null);
      continue;
    }
    if (!isPlainObject(p)) return null;
    const { x, y } = p as { x?: unknown; y?: unknown };
    if (typeof x !== "number" || !Number.isFinite(x) || typeof y !== "number" || !Number.isFinite(y)) {
      return null;
    }
    out.push({ x, y });
  }
  return out;
}

function randomSuffix(): string {
  return `${process.pid}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function nextVersion(entries: WorkHistoryIndexEntry[], systemId: string, shotType: string): number {
  let max = 0;
  for (const e of entries) {
    if (e.systemId === systemId && e.shotType === shotType && e.version > max) max = e.version;
  }
  return max + 1;
}

function isIndexEntry(v: unknown): v is WorkHistoryIndexEntry {
  if (!isPlainObject(v)) return false;
  const e = v as Record<string, unknown>;
  return (
    isValidWorkHistorySnapshotId(e.snapshotId) &&
    typeof e.name === "string" &&
    typeof e.revision === "number" &&
    (e.status === "PENDING" || e.status === "APPROVED" || e.status === "PUBLISHED")
  );
}

export function createWorkHistoryFileStore(args: {
  repoRoot: string;
  io?: Partial<WorkHistoryIo>;
  now?: () => string;
}) {
  const io: WorkHistoryIo = { ...NODE_IO, ...(args.io ?? {}) };
  const clock = args.now ?? (() => new Date().toISOString());
  const dataDir = path.join(path.resolve(args.repoRoot), WORK_HISTORY_DIR_NAME);
  const indexFile = path.join(dataDir, INDEX_FILE);
  const snapshotDir = path.join(dataDir, SNAPSHOT_DIR);

  function snapshotFile(id: string): string {
    const file = path.join(snapshotDir, `snapshot-${id}.json`);
    if (path.dirname(file) !== snapshotDir) throw new Error("snapshot path escaped");
    return file;
  }

  function writeAtomic(file: string, text: string): void {
    const tmp = `${file}.tmp-${randomSuffix()}`;
    try {
      io.writeFileSync(tmp, text);
      io.renameSync(tmp, file);
    } catch (e) {
      try {
        if (io.existsSync(tmp)) io.unlinkSync(tmp);
      } catch {
        /* temp leftovers are never read */
      }
      throw e;
    }
  }

  function tryUnlink(file: string): void {
    try {
      if (io.existsSync(file)) io.unlinkSync(file);
    } catch {
      /* leftover files without an index entry are never read */
    }
  }

  function readIndex(): { ok: true; entries: WorkHistoryIndexEntry[] } | WorkHistoryFailure {
    if (!io.existsSync(indexFile)) return { ok: true, entries: [] };
    let parsed: unknown;
    try {
      parsed = JSON.parse(io.readFileSync(indexFile, "utf8"));
    } catch {
      return fail("INDEX_UNREADABLE");
    }
    if (
      !isPlainObject(parsed) ||
      parsed.schemaVersion !== WORK_HISTORY_SCHEMA_VERSION ||
      !Array.isArray(parsed.entries) ||
      !parsed.entries.every(isIndexEntry)
    ) {
      return fail("INDEX_UNREADABLE");
    }
    return { ok: true, entries: parsed.entries as WorkHistoryIndexEntry[] };
  }

  function writeIndex(entries: WorkHistoryIndexEntry[]): void {
    io.mkdirSync(snapshotDir, { recursive: true });
    const index: WorkHistoryIndex = { schemaVersion: WORK_HISTORY_SCHEMA_VERSION, entries };
    writeAtomic(indexFile, JSON.stringify(index, null, 2));
  }

  function readSnapshot(
    entry: WorkHistoryIndexEntry
  ): { ok: true; snapshot: WorkHistorySnapshot; raw: string } | WorkHistoryFailure {
    let raw: string;
    let parsed: unknown;
    try {
      raw = io.readFileSync(snapshotFile(entry.snapshotId), "utf8");
      parsed = JSON.parse(raw);
    } catch {
      return fail("SNAPSHOT_UNREADABLE");
    }
    if (!isPlainObject(parsed)) return fail("SNAPSHOT_UNREADABLE");
    const snap = parsed as unknown as WorkHistorySnapshot;
    if (snap.id !== entry.snapshotId || snap.revision !== entry.revision || snap.status !== entry.status) {
      return fail("SNAPSHOT_MISMATCH");
    }
    return { ok: true, snapshot: snap, raw };
  }

  function loadForUpdate(
    snapshotId: unknown
  ):
    | { ok: true; entries: WorkHistoryIndexEntry[]; entry: WorkHistoryIndexEntry; snapshot: WorkHistorySnapshot; raw: string }
    | WorkHistoryFailure {
    if (!isValidWorkHistorySnapshotId(snapshotId)) return fail("INVALID_ID");
    const idx = readIndex();
    if (!idx.ok) return idx;
    const entry = idx.entries.find((e) => e.snapshotId === snapshotId);
    if (!entry) return fail("NOT_FOUND");
    const snap = readSnapshot(entry);
    if (!snap.ok) return snap;
    return { ok: true, entries: idx.entries, entry, snapshot: snap.snapshot, raw: snap.raw };
  }

  /** Snapshot files first, then the index; any failure puts the previous bytes back. */
  function commitUpdates(
    updates: Array<{ next: WorkHistorySnapshot; previousRaw: string | null }>,
    entries: WorkHistoryIndexEntry[]
  ): { ok: true } | WorkHistoryFailure {
    const written: typeof updates = [];
    const restore = () => {
      for (const u of written) {
        const file = snapshotFile(u.next.id);
        if (u.previousRaw == null) {
          tryUnlink(file);
        } else {
          try {
            writeAtomic(file, u.previousRaw);
          } catch {
            /* revision check keeps a half-restored snapshot out of use */
          }
        }
      }
    };
    try {
      io.mkdirSync(snapshotDir, { recursive: true });
      for (const u of updates) {
        writeAtomic(snapshotFile(u.next.id), JSON.stringify(u.next));
        written.push(u);
      }
    } catch {
      restore();
      return fail("WRITE_FAILED");
    }
    try {
      writeIndex(entries);
    } catch {
      restore();
      return fail("WRITE_FAILED");
    }
    return { ok: true };
  }

  function replaceEntry(entries: WorkHistoryIndexEntry[], next: WorkHistoryIndexEntry) {
    return entries.map((e) => (e.snapshotId === next.snapshotId ? next : e));
  }

  function validateLeaf(shotType: unknown, systemId: unknown) {
    const s = cleanLabel(shotType);
    const y = cleanLabel(systemId);
    return s && y ? { shotType: s, systemId: y } : null;
  }

  function newSnapshotBase(args: {
    entries: WorkHistoryIndexEntry[];
    shotType: string;
    systemId: string;
    state: unknown;
  }) {
    let id = newWorkHistorySnapshotId();
    while (args.entries.some((e) => e.snapshotId === id)) id = newWorkHistorySnapshotId();
    const ts = clock();
    const version = nextVersion(args.entries, args.systemId, args.shotType);
    return {
      schemaVersion: WORK_HISTORY_SCHEMA_VERSION,
      id,
      name: buildSnapshotName(args.shotType, args.systemId, version, ts),
      systemId: args.systemId,
      pattern: args.shotType,
      systemLabel: systemIdToFolderLabel(args.systemId),
      version,
      timestamp: ts,
      createdAt: ts,
      updatedAt: ts,
      revision: 1,
      exported: false,
      published: null,
      state: args.state as WorkHistorySnapshot["state"],
    };
  }

  function appendNew(entries: WorkHistoryIndexEntry[], snap: WorkHistorySnapshot): EntryResult {
    const entry = buildWorkHistoryIndexEntry(snap);
    const committed = commitUpdates([{ next: snap, previousRaw: null }], [...entries, entry]);
    return committed.ok ? { ok: true, entry } : committed;
  }

  const store = {
    list(): { ok: true; entries: WorkHistoryIndexEntry[] } | WorkHistoryFailure {
      return readIndex();
    },

    read(
      snapshotId: unknown
    ): { ok: true; entry: WorkHistoryIndexEntry; snapshot: WorkHistorySnapshot } | WorkHistoryFailure {
      const loaded = loadForUpdate(snapshotId);
      if (!loaded.ok) return loaded;
      return { ok: true, entry: loaded.entry, snapshot: loaded.snapshot };
    },

    createPending(input: CreatePendingInput): EntryResult {
      if (!isPlainObject(input) || !isPlainObject(input.state)) return fail("INVALID_INPUT");
      const leaf = validateLeaf(input.shotType, input.systemId);
      const op = validatePublishOperation(input.publishOperation);
      const graph = validatePublishFamilyGraph(input.pendingFamilyGraph);
      const nodes = cleanPathNodes(input.authoredPathNodes);
      if (!leaf || !op.ok || !graph.ok || nodes == null) return fail("INVALID_INPUT");
      if (!crossValidateOperationAndGraph(op.operation, graph.graph).ok) return fail("INVALID_INPUT");
      if (countPublishFamilyGraphDerivedMembers(graph.graph) !== 0) return fail("INVALID_INPUT");
      const idx = readIndex();
      if (!idx.ok) return idx;
      const snap: WorkHistorySnapshot = {
        ...newSnapshotBase({ entries: idx.entries, ...leaf, state: input.state }),
        status: "PENDING",
        publishOperation: op.operation,
        derivedApproval: { status: "PENDING", derivedCount: 0 },
        pendingFamilyGraph: graph.graph,
        authoredPathNodes: nodes,
      };
      return appendNew(idx.entries, snap);
    },

    createApproved(input: CreateApprovedInput): EntryResult {
      if (!isPlainObject(input) || !isPlainObject(input.state)) return fail("INVALID_INPUT");
      const leaf = validateLeaf(input.shotType, input.systemId);
      if (!leaf || (input.mode !== "OVERWRITE_PRESERVED" && input.mode !== "IMMEDIATE")) {
        return fail("INVALID_INPUT");
      }
      let operation: PublishOperation | null = null;
      let graph: PublishFamilyGraph | null = null;
      if (input.publishOperation != null) {
        const op = validatePublishOperation(input.publishOperation);
        const g = validatePublishFamilyGraph(input.graph);
        if (!op.ok || !g.ok || !crossValidateOperationAndGraph(op.operation, g.graph).ok) {
          return fail("INVALID_INPUT");
        }
        operation = op.operation;
        graph = g.graph;
      } else if (input.mode === "OVERWRITE_PRESERVED" || input.graph != null) {
        return fail("INVALID_INPUT");
      }
      const idx = readIndex();
      if (!idx.ok) return idx;
      const base = newSnapshotBase({ entries: idx.entries, ...leaf, state: input.state });
      const snap: WorkHistorySnapshot = {
        ...base,
        status: "APPROVED",
        ...(operation ? { publishOperation: operation } : {}),
        ...(graph ? { publishFamilyGraph: graph } : {}),
        ...(input.mode === "OVERWRITE_PRESERVED" && graph
          ? {
              derivedApproval: {
                status: "APPROVED" as const,
                derivedCount: countPublishFamilyGraphDerivedMembers(graph),
                source: "OVERWRITE_PRESERVED" as const,
                approvedAt: base.createdAt,
              },
            }
          : {}),
      };
      return appendNew(idx.entries, snap);
    },

    approve(input: { snapshotId: string; graph: PublishFamilyGraph }): EntryResult {
      const loaded = loadForUpdate(input?.snapshotId);
      if (!loaded.ok) return loaded;
      const { snapshot, entries, raw } = loaded;
      if (snapshot.status !== "PENDING") return fail("NOT_PENDING");
      const graph = validatePublishFamilyGraph(input.graph);
      if (!graph.ok) return fail("GRAPH_INVALID");
      const op = validatePublishOperation(snapshot.publishOperation);
      if (!op.ok || !crossValidateOperationAndGraph(op.operation, graph.graph).ok) {
        return fail("GRAPH_INVALID");
      }
      const base = snapshot.pendingFamilyGraph;
      if (base) {
        const ids = new Set(graph.graph.members.map((m) => m.memberId));
        const baseMembers = base.members.filter((m) => !isDerivedMemberOrigin(m.memberOrigin));
        if (base.familyId !== graph.graph.familyId || !baseMembers.every((m) => ids.has(m.memberId))) {
          return fail("GRAPH_INVALID");
        }
      }
      const ts = clock();
      const next: WorkHistorySnapshot = {
        ...snapshot,
        revision: snapshot.revision + 1,
        status: "APPROVED",
        updatedAt: ts,
        publishFamilyGraph: graph.graph,
        derivedApproval: {
          status: "APPROVED",
          derivedCount: countPublishFamilyGraphDerivedMembers(graph.graph),
          source: "SAVE_APPROVE",
          approvedAt: ts,
        },
      };
      delete next.pendingFamilyGraph;
      delete next.publishFamilyPayload;
      const entry = buildWorkHistoryIndexEntry(next);
      const committed = commitUpdates([{ next, previousRaw: raw }], replaceEntry(entries, entry));
      return committed.ok ? { ok: true, entry } : committed;
    },

    markPublished(input: {
      snapshotIds: string[];
      commit?: string | null;
    }): { ok: true; entries: WorkHistoryIndexEntry[] } | WorkHistoryFailure {
      const ids = Array.isArray(input?.snapshotIds) ? input.snapshotIds : [];
      if (ids.length === 0) return fail("INVALID_INPUT");
      if (!ids.every(isValidWorkHistorySnapshotId)) return fail("INVALID_ID");
      const idx = readIndex();
      if (!idx.ok) return idx;
      const commit = typeof input.commit === "string" && /^[0-9a-f]{4,64}$/i.test(input.commit) ? input.commit : null;
      const ts = clock();
      const updates: Array<{ next: WorkHistorySnapshot; previousRaw: string }> = [];
      let entries = idx.entries;
      for (const id of ids) {
        const entry = entries.find((e) => e.snapshotId === id);
        if (!entry) return fail("NOT_FOUND");
        if (entry.status === "PENDING" || !entry.publishable) return fail("NOT_APPROVED");
        const snap = readSnapshot(entry);
        if (!snap.ok) return snap;
        if (!buildPublishClientItemFromSnapshot(snap.snapshot).ok) return fail("NOT_APPROVED");
        const next: WorkHistorySnapshot = {
          ...snap.snapshot,
          revision: snap.snapshot.revision + 1,
          status: "PUBLISHED",
          exported: true,
          updatedAt: ts,
          published: { publishedAt: ts, commit },
        };
        updates.push({ next, previousRaw: snap.raw });
        entries = replaceEntry(entries, buildWorkHistoryIndexEntry(next));
      }
      const committed = commitUpdates(updates, entries);
      if (!committed.ok) return committed;
      const touched = new Set(ids);
      return { ok: true, entries: entries.filter((e) => touched.has(e.snapshotId)) };
    },

    remove(input: { snapshotIds: string[] }): { ok: true; removed: string[] } | WorkHistoryFailure {
      const ids = Array.isArray(input?.snapshotIds) ? input.snapshotIds : [];
      if (ids.length === 0) return fail("INVALID_INPUT");
      if (!ids.every(isValidWorkHistorySnapshotId)) return fail("INVALID_ID");
      const idx = readIndex();
      if (!idx.ok) return idx;
      const targets = idx.entries.filter((e) => ids.includes(e.snapshotId));
      if (targets.length === 0) return { ok: true, removed: [] };
      const moved: Array<{ file: string; trash: string }> = [];
      const moveBack = () => {
        for (const m of moved) {
          try {
            io.renameSync(m.trash, m.file);
          } catch {
            /* index still lists the entry; read reports it unreadable */
          }
        }
      };
      try {
        for (const e of targets) {
          const file = snapshotFile(e.snapshotId);
          if (!io.existsSync(file)) continue;
          const trash = `${file}.deleted-${randomSuffix()}`;
          io.renameSync(file, trash);
          moved.push({ file, trash });
        }
      } catch {
        moveBack();
        return fail("WRITE_FAILED");
      }
      const removedIds = new Set(targets.map((e) => e.snapshotId));
      try {
        writeIndex(idx.entries.filter((e) => !removedIds.has(e.snapshotId)));
      } catch {
        moveBack();
        return fail("WRITE_FAILED");
      }
      for (const m of moved) tryUnlink(m.trash);
      return { ok: true, removed: [...removedIds] };
    },

    cancelPending(input: {
      snapshotId: string;
      familyId: string;
    }): { ok: true; removed: string[] } | WorkHistoryFailure {
      if (!isValidWorkHistorySnapshotId(input?.snapshotId)) return fail("INVALID_ID");
      const idx = readIndex();
      if (!idx.ok) return idx;
      const entry = idx.entries.find((e) => e.snapshotId === input.snapshotId);
      if (!entry) return fail("NOT_FOUND");
      if (entry.status !== "PENDING") return fail("NOT_PENDING");
      if (entry.familyId !== input.familyId) return fail("FAMILY_MISMATCH");
      return store.remove({ snapshotIds: [input.snapshotId] });
    },

    /** Legacy migration: all-or-nothing; ids already in the index are left as they are. */
    importSnapshots(input: {
      snapshots: unknown[];
    }): { ok: true; imported: string[]; existing: string[] } | WorkHistoryFailure {
      const list = Array.isArray(input?.snapshots) ? input.snapshots : null;
      if (!list) return fail("INVALID_INPUT");
      const idx = readIndex();
      if (!idx.ok) return idx;
      const known = new Set(idx.entries.map((e) => e.snapshotId));
      const seen = new Set<string>();
      const existing: string[] = [];
      const fresh: WorkHistorySnapshot[] = [];
      const ts = clock();
      for (const raw of list) {
        if (!isPlainObject(raw)) return fail("INVALID_INPUT");
        const s = raw as unknown as WorkHistorySnapshot;
        if (!isValidWorkHistorySnapshotId(s.id)) return fail("INVALID_ID");
        if (seen.has(s.id)) return fail("INVALID_INPUT");
        seen.add(s.id);
        if (known.has(s.id)) {
          existing.push(s.id);
          continue;
        }
        const leaf = validateLeaf(s.pattern, s.systemId);
        if (!leaf || typeof s.name !== "string" || !s.name) return fail("INVALID_INPUT");
        if (s.state != null && !isPlainObject(s.state)) return fail("INVALID_INPUT");
        for (const g of [s.publishFamilyGraph, s.pendingFamilyGraph]) {
          if (g !== undefined && !validatePublishFamilyGraph(g).ok) return fail("INVALID_INPUT");
        }
        const nodes = cleanPathNodes(s.authoredPathNodes);
        if (nodes == null) return fail("INVALID_INPUT");
        const status: WorkHistoryStatus = deriveWorkHistoryStatus(s);
        const createdAt = typeof s.timestamp === "string" && s.timestamp ? s.timestamp : ts;
        fresh.push({
          ...s,
          schemaVersion: WORK_HISTORY_SCHEMA_VERSION,
          pattern: leaf.shotType,
          systemId: leaf.systemId,
          systemLabel: systemIdToFolderLabel(leaf.systemId),
          version: typeof s.version === "number" && Number.isFinite(s.version) ? s.version : 1,
          timestamp: createdAt,
          createdAt,
          updatedAt: ts,
          revision: 1,
          status,
          exported: status === "PUBLISHED",
          published: status === "PUBLISHED" ? { publishedAt: createdAt, commit: null } : null,
          ...(nodes.length > 0 ? { authoredPathNodes: nodes } : {}),
        });
      }
      if (fresh.length === 0) return { ok: true, imported: [], existing };
      const entries = [...idx.entries, ...fresh.map(buildWorkHistoryIndexEntry)];
      const committed = commitUpdates(
        fresh.map((next) => ({ next, previousRaw: null })),
        entries
      );
      if (!committed.ok) return committed;
      return { ok: true, imported: fresh.map((s) => s.id), existing };
    },
  };
  return store;
}

export type WorkHistoryFileStore = ReturnType<typeof createWorkHistoryFileStore>;

const STATUS_BY_CODE: Partial<Record<WorkHistoryErrorCode, number>> = {
  INVALID_ID: 400,
  INVALID_INPUT: 400,
  UNKNOWN_OP: 400,
  NOT_FOUND: 404,
  NOT_PENDING: 409,
  NOT_APPROVED: 409,
  FAMILY_MISMATCH: 409,
  GRAPH_INVALID: 409,
  SNAPSHOT_MISMATCH: 409,
};

/** Dev middleware entry. Only `op` and `input` are read from the body. */
export function handleWorkHistoryHttpBody(args: {
  repoRoot: string;
  body: unknown;
  io?: Partial<WorkHistoryIo>;
}): { statusCode: number; body: { ok: boolean; [k: string]: unknown } } {
  const body = isPlainObject(args.body) ? args.body : {};
  const op = typeof body.op === "string" ? body.op : "";
  const input = (isPlainObject(body.input) ? body.input : {}) as Record<string, unknown>;
  try {
    const store = createWorkHistoryFileStore({ repoRoot: args.repoRoot, io: args.io });
    let result: { ok: boolean; code?: WorkHistoryErrorCode };
    switch (op) {
      case "list":
        result = store.list();
        break;
      case "read":
        result = store.read(input.snapshotId);
        break;
      case "createPending":
        result = store.createPending(input as unknown as CreatePendingInput);
        break;
      case "createApproved":
        result = store.createApproved(input as unknown as CreateApprovedInput);
        break;
      case "approve":
        result = store.approve(input as unknown as { snapshotId: string; graph: PublishFamilyGraph });
        break;
      case "markPublished":
        result = store.markPublished(input as unknown as { snapshotIds: string[]; commit?: string | null });
        break;
      case "remove":
        result = store.remove(input as unknown as { snapshotIds: string[] });
        break;
      case "cancelPending":
        result = store.cancelPending(input as unknown as { snapshotId: string; familyId: string });
        break;
      case "importSnapshots":
        result = store.importSnapshots(input as unknown as { snapshots: unknown[] });
        break;
      default:
        result = fail("UNKNOWN_OP");
    }
    const statusCode = result.ok ? 200 : STATUS_BY_CODE[result.code as WorkHistoryErrorCode] ?? 500;
    return { statusCode, body: result as { ok: boolean } };
  } catch {
    console.warn("[work-history] request failed", op);
    return { statusCode: 500, body: fail("INTERNAL") };
  }
}
