/**
 * D-drive work History store (<repoRoot>/.workspace-data) — sole work ledger.
 *
 * A1  SAVE → PENDING snapshot file + index entry (index stays light)
 * A2  Approve → same snapshot APPROVED with the full Family graph
 * A3  Graph stays normalized: 1 FamilyMaster + FamilyMember list, stored once
 * A4  Opening the list reads the index only
 * A5  Recall / Publish read exactly one snapshot file
 * A6  Snapshot write failure → old file + index kept, no success
 * A7  Index write failure → snapshot never exposed as publishable
 * A8  Delete removes index entry + snapshot; Published dataset untouched
 * A9  PENDING cancel removes only that snapshot and blocks Publish
 * S   snapshotId validation, fixed folder, no path leaks, orphan temp files ignored
 * M   import is all-or-nothing and never duplicates
 *
 * Temp folders under os.tmpdir() only; the real .workspace-data is never used.
 */

import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createWorkHistoryFileStore,
  handleWorkHistoryHttpBody,
  WORK_HISTORY_DIR_NAME,
  type WorkHistoryIo,
} from "./workHistoryFileStore";
import { isValidWorkHistorySnapshotId } from "./workHistoryModel";
import { buildPublishClientItemFromSnapshot } from "../historyPublishInput";
import {
  buildSampleWork,
  makeTempRepoRoot,
  removeTempRepoRoots,
  SAMPLE_STATE,
} from "./workHistoryTestFixtures";

afterEach(() => removeTempRepoRoots());

const sample = buildSampleWork();

function dataDir(repoRoot: string) {
  return path.join(repoRoot, WORK_HISTORY_DIR_NAME);
}
function indexPath(repoRoot: string) {
  return path.join(dataDir(repoRoot), "history-index.json");
}
function snapshotPath(repoRoot: string, id: string) {
  return path.join(dataDir(repoRoot), "history", `snapshot-${id}.json`);
}

function pendingInput() {
  return {
    state: SAMPLE_STATE,
    publishOperation: sample.publishOperation,
    pendingFamilyGraph: sample.pendingGraph,
    authoredPathNodes: [{ x: 1, y: 2 }, null],
    shotType: "뒤돌리기",
    systemId: "5_half_system",
  };
}

function makeStore(repoRoot: string, io?: Partial<WorkHistoryIo>) {
  return createWorkHistoryFileStore({ repoRoot, io });
}

function createPending(repoRoot: string) {
  const r = makeStore(repoRoot).createPending(pendingInput());
  if (!r.ok) throw new Error(r.code);
  return r.entry.snapshotId;
}

/** io wrapper counting reads and failing chosen operations. */
function trackingIo(opts: { failRenameTo?: (to: string) => boolean; failWrite?: (p: string) => boolean } = {}) {
  const reads: string[] = [];
  const io: Partial<WorkHistoryIo> = {
    readFileSync: ((p: string, enc: BufferEncoding) => {
      reads.push(path.basename(p));
      return fs.readFileSync(p, enc);
    }) as WorkHistoryIo["readFileSync"],
    renameSync: (from: string, to: string) => {
      if (opts.failRenameTo?.(to)) throw new Error(`EPERM rename ${to}`);
      fs.renameSync(from, to);
    },
    writeFileSync: ((p: string, data: string) => {
      if (opts.failWrite?.(p)) throw new Error(`ENOSPC write ${p}`);
      fs.writeFileSync(p, data, "utf8");
    }) as WorkHistoryIo["writeFileSync"],
  };
  return { io, reads };
}

describe("A — D History store", () => {
  it("A1 — createPending writes a PENDING snapshot file and a light index entry", () => {
    const repoRoot = makeTempRepoRoot();
    const r = makeStore(repoRoot).createPending(pendingInput());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const id = r.entry.snapshotId;
    expect(isValidWorkHistorySnapshotId(id)).toBe(true);
    expect(fs.existsSync(snapshotPath(repoRoot, id))).toBe(true);

    const index = JSON.parse(fs.readFileSync(indexPath(repoRoot), "utf8"));
    expect(index.entries).toHaveLength(1);
    const entry = index.entries[0];
    expect(entry).toMatchObject({
      snapshotId: id,
      status: "PENDING",
      shotType: "뒤돌리기",
      systemId: "5_half_system",
      systemLabel: "파이브앤하프",
      derivedCount: 0,
      familyId: sample.familyId,
      publishable: false,
      published: null,
    });
    expect(typeof entry.name).toBe("string");
    expect(typeof entry.createdAt).toBe("string");
    expect(typeof entry.updatedAt).toBe("string");
    // Index holds list metadata only — never the graph or the screen state.
    const indexText = fs.readFileSync(indexPath(repoRoot), "utf8");
    expect(indexText).not.toContain("familyMembers");
    expect(indexText).not.toContain('"members"');
    expect(indexText).not.toContain('"master"');
    expect(indexText).not.toContain("ballsState");

    const snap = JSON.parse(fs.readFileSync(snapshotPath(repoRoot, id), "utf8"));
    expect(snap.status).toBe("PENDING");
    expect(snap.derivedApproval).toEqual({ status: "PENDING", derivedCount: 0 });
    expect(snap.pendingFamilyGraph.familyId).toBe(sample.familyId);
    expect(snap.publishFamilyGraph).toBeUndefined();
    expect(snap.authoredPathNodes).toEqual([{ x: 1, y: 2 }, null]);
    expect(buildPublishClientItemFromSnapshot(snap).ok).toBe(false);
  });

  it("A2/A3 — approve turns the same snapshot APPROVED with one normalized graph", () => {
    const repoRoot = makeTempRepoRoot();
    const id = createPending(repoRoot);
    const r = makeStore(repoRoot).approve({ snapshotId: id, graph: sample.approvedGraph });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.entry.snapshotId).toBe(id);
    expect(r.entry.status).toBe("APPROVED");
    expect(r.entry.derivedCount).toBe(sample.derivedCount);
    expect(sample.derivedCount).toBeGreaterThan(0);
    expect(r.entry.publishable).toBe(true);

    const text = fs.readFileSync(snapshotPath(repoRoot, id), "utf8");
    const snap = JSON.parse(text);
    expect(snap.id).toBe(id);
    expect(snap.status).toBe("APPROVED");
    expect(snap.pendingFamilyGraph).toBeUndefined();
    expect(snap.derivedApproval).toMatchObject({
      status: "APPROVED",
      derivedCount: sample.derivedCount,
      source: "SAVE_APPROVE",
    });
    const graph = snap.publishFamilyGraph;
    expect(graph.familyId).toBe(sample.familyId);
    expect(graph.master.familyId).toBe(sample.familyId);
    expect(graph.members.map((m: { memberId: string }) => m.memberId).sort()).toEqual(
      sample.approvedGraph.members.map((m) => m.memberId).sort()
    );
    // Stored once: exactly one Master; Family common values never copied onto Members.
    expect(text.split('"master"').length - 1).toBe(1);
    for (const m of graph.members) {
      expect(m).not.toHaveProperty("sysInputs");
      expect(m).not.toHaveProperty("signature");
      expect(m).not.toHaveProperty("hpT");
    }
    const item = buildPublishClientItemFromSnapshot(snap);
    expect(item.ok).toBe(true);

    const index = JSON.parse(fs.readFileSync(indexPath(repoRoot), "utf8"));
    expect(index.entries).toHaveLength(1);
    expect(index.entries[0].status).toBe("APPROVED");
  });

  it("A2 — approve refuses a graph that drops the saved base Members", () => {
    const repoRoot = makeTempRepoRoot();
    const id = createPending(repoRoot);
    const foreign = buildSampleWork("fm_sample", "mb_other");
    const r = makeStore(repoRoot).approve({ snapshotId: id, graph: foreign.approvedGraph });
    expect(r.ok).toBe(false);
    expect(makeStore(repoRoot).read(id)).toMatchObject({ ok: true, entry: { status: "PENDING" } });
  });

  it("A4 — list reads history-index.json only", () => {
    const repoRoot = makeTempRepoRoot();
    createPending(repoRoot);
    createPending(repoRoot);
    const third = createPending(repoRoot);
    makeStore(repoRoot).approve({ snapshotId: third, graph: sample.approvedGraph });

    const { io, reads } = trackingIo();
    const listed = makeStore(repoRoot, io).list();
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;
    expect(listed.entries).toHaveLength(3);
    expect(reads).toEqual(["history-index.json"]);
  });

  it("A5 — read opens the index and exactly one snapshot file", () => {
    const repoRoot = makeTempRepoRoot();
    createPending(repoRoot);
    const id = createPending(repoRoot);
    createPending(repoRoot);
    const { io, reads } = trackingIo();
    const r = makeStore(repoRoot, io).read(id);
    expect(r.ok).toBe(true);
    expect(reads.sort()).toEqual(["history-index.json", `snapshot-${id}.json`].sort());
  });

  it("A6 — snapshot write failure keeps the old snapshot and index, no success", () => {
    const repoRoot = makeTempRepoRoot();
    const id = createPending(repoRoot);
    const snapBefore = fs.readFileSync(snapshotPath(repoRoot, id), "utf8");
    const indexBefore = fs.readFileSync(indexPath(repoRoot), "utf8");

    const { io } = trackingIo({ failRenameTo: (to) => to.endsWith(`snapshot-${id}.json`) });
    const r = makeStore(repoRoot, io).approve({ snapshotId: id, graph: sample.approvedGraph });
    expect(r.ok).toBe(false);
    expect(fs.readFileSync(snapshotPath(repoRoot, id), "utf8")).toBe(snapBefore);
    expect(fs.readFileSync(indexPath(repoRoot), "utf8")).toBe(indexBefore);
    const read = makeStore(repoRoot).read(id);
    expect(read).toMatchObject({ ok: true, entry: { status: "PENDING" } });
  });

  it("A7 — index write failure never exposes the snapshot as publishable", () => {
    const repoRoot = makeTempRepoRoot();
    const id = createPending(repoRoot);
    const snapBefore = fs.readFileSync(snapshotPath(repoRoot, id), "utf8");

    const { io } = trackingIo({ failRenameTo: (to) => to.endsWith("history-index.json") });
    const r = makeStore(repoRoot, io).approve({ snapshotId: id, graph: sample.approvedGraph });
    expect(r.ok).toBe(false);
    // Snapshot rolled back to the PENDING bytes.
    expect(fs.readFileSync(snapshotPath(repoRoot, id), "utf8")).toBe(snapBefore);
    const read = makeStore(repoRoot).read(id);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.entry.status).toBe("PENDING");
    expect(buildPublishClientItemFromSnapshot(read.snapshot).ok).toBe(false);
  });

  it("A7 — index failure + rollback failure → snapshot/index mismatch is refused, never used", () => {
    const repoRoot = makeTempRepoRoot();
    const id = createPending(repoRoot);
    let snapshotRenames = 0;
    const { io } = trackingIo({
      failRenameTo: (to) => {
        if (to.endsWith("history-index.json")) return true;
        if (to.endsWith(`snapshot-${id}.json`)) {
          snapshotRenames += 1;
          return snapshotRenames > 1; // approve write succeeds, rollback fails
        }
        return false;
      },
    });
    const r = makeStore(repoRoot, io).approve({ snapshotId: id, graph: sample.approvedGraph });
    expect(r.ok).toBe(false);
    const listed = makeStore(repoRoot).list();
    expect(listed.ok && listed.entries[0].status).toBe("PENDING");
    const read = makeStore(repoRoot).read(id);
    expect(read.ok).toBe(false);
    if (read.ok) return;
    expect(read.code).toBe("SNAPSHOT_MISMATCH");
  });

  it("A8 — remove deletes index entry + snapshot file; Published dataset untouched", () => {
    const repoRoot = makeTempRepoRoot();
    const leaf = path.join(repoRoot, "dataset", "뒤돌리기", "파이브앤하프", "positions.json");
    fs.mkdirSync(path.dirname(leaf), { recursive: true });
    fs.writeFileSync(leaf, '{"familyMasters":[{"familyId":"fm_sample"}]}', "utf8");
    const keep = createPending(repoRoot);
    const id = createPending(repoRoot);
    makeStore(repoRoot).approve({ snapshotId: id, graph: sample.approvedGraph });
    makeStore(repoRoot).markPublished({ snapshotIds: [id], commit: "abc1234" });

    const r = makeStore(repoRoot).remove({ snapshotIds: [id] });
    expect(r.ok).toBe(true);
    expect(fs.existsSync(snapshotPath(repoRoot, id))).toBe(false);
    const listed = makeStore(repoRoot).list();
    expect(listed.ok && listed.entries.map((e) => e.snapshotId)).toEqual([keep]);
    expect(makeStore(repoRoot).read(id)).toMatchObject({ ok: false, code: "NOT_FOUND" });
    expect(fs.readFileSync(leaf, "utf8")).toBe('{"familyMasters":[{"familyId":"fm_sample"}]}');
  });

  it("A8 — file delete failure keeps the index entry and reports failure", () => {
    const repoRoot = makeTempRepoRoot();
    const id = createPending(repoRoot);
    const indexBefore = fs.readFileSync(indexPath(repoRoot), "utf8");
    const { io } = trackingIo({ failRenameTo: (to) => to.includes(".deleted-") });
    const r = makeStore(repoRoot, io).remove({ snapshotIds: [id] });
    expect(r.ok).toBe(false);
    expect(fs.readFileSync(indexPath(repoRoot), "utf8")).toBe(indexBefore);
    expect(makeStore(repoRoot).read(id).ok).toBe(true);
  });

  it("A8 — index write failure on delete restores the snapshot file", () => {
    const repoRoot = makeTempRepoRoot();
    const id = createPending(repoRoot);
    const { io } = trackingIo({ failRenameTo: (to) => to.endsWith("history-index.json") });
    const r = makeStore(repoRoot, io).remove({ snapshotIds: [id] });
    expect(r.ok).toBe(false);
    expect(makeStore(repoRoot).read(id).ok).toBe(true);
  });

  it("A9 — cancelPending removes only that PENDING snapshot; APPROVED is refused", () => {
    const repoRoot = makeTempRepoRoot();
    const approvedId = createPending(repoRoot);
    makeStore(repoRoot).approve({ snapshotId: approvedId, graph: sample.approvedGraph });
    const pendingId = createPending(repoRoot);

    expect(
      makeStore(repoRoot).cancelPending({ snapshotId: pendingId, familyId: "fm_other" })
    ).toMatchObject({ ok: false, code: "FAMILY_MISMATCH" });
    expect(
      makeStore(repoRoot).cancelPending({ snapshotId: approvedId, familyId: sample.familyId })
    ).toMatchObject({ ok: false, code: "NOT_PENDING" });

    const r = makeStore(repoRoot).cancelPending({ snapshotId: pendingId, familyId: sample.familyId });
    expect(r.ok).toBe(true);
    const listed = makeStore(repoRoot).list();
    expect(listed.ok && listed.entries.map((e) => e.snapshotId)).toEqual([approvedId]);
    expect(makeStore(repoRoot).read(pendingId)).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });

  it("markPublished sets PUBLISHED only on success; index failure keeps APPROVED", () => {
    const repoRoot = makeTempRepoRoot();
    const id = createPending(repoRoot);
    makeStore(repoRoot).approve({ snapshotId: id, graph: sample.approvedGraph });
    const { io } = trackingIo({ failRenameTo: (to) => to.endsWith("history-index.json") });
    expect(makeStore(repoRoot, io).markPublished({ snapshotIds: [id], commit: "abc" }).ok).toBe(false);
    expect(makeStore(repoRoot).read(id)).toMatchObject({ ok: true, entry: { status: "APPROVED" } });

    const r = makeStore(repoRoot).markPublished({ snapshotIds: [id], commit: "abc1234" });
    expect(r.ok).toBe(true);
    const read = makeStore(repoRoot).read(id);
    expect(read).toMatchObject({
      ok: true,
      entry: { status: "PUBLISHED", published: { commit: "abc1234" } },
    });
    if (read.ok) {
      expect(read.snapshot.exported).toBe(true);
      expect(read.snapshot.publishFamilyGraph).toEqual(sample.approvedGraph);
    }
  });

  it("PENDING can never be marked PUBLISHED", () => {
    const repoRoot = makeTempRepoRoot();
    const id = createPending(repoRoot);
    expect(makeStore(repoRoot).markPublished({ snapshotIds: [id] }).ok).toBe(false);
    expect(makeStore(repoRoot).read(id)).toMatchObject({ ok: true, entry: { status: "PENDING" } });
  });
});

describe("S — security and failure hygiene", () => {
  const BAD_IDS = [
    "../x0000000",
    "..\\x0000000",
    "C:\\Windows\\x",
    "/etc/passwd0",
    "abc/def12345",
    "abc\\def1234",
    "abcd1234;rm",
    "abcd 12345",
    "abcd$(ls)12",
    "abcd`ls`123",
    "",
    ".",
    "..",
    "a".repeat(200),
  ];

  it("rejects snapshotIds with traversal, separators, drives or shell characters", () => {
    for (const bad of BAD_IDS) expect(isValidWorkHistorySnapshotId(bad)).toBe(false);
    const repoRoot = makeTempRepoRoot();
    const store = makeStore(repoRoot);
    for (const bad of BAD_IDS) {
      expect(store.read(bad)).toMatchObject({ ok: false, code: "INVALID_ID" });
      expect(store.remove({ snapshotIds: [bad] })).toMatchObject({ ok: false, code: "INVALID_ID" });
      expect(store.approve({ snapshotId: bad, graph: sample.approvedGraph })).toMatchObject({
        ok: false,
        code: "INVALID_ID",
      });
    }
  });

  it("HTTP body paths are ignored — the store only uses <repoRoot>/.workspace-data", () => {
    const repoRoot = makeTempRepoRoot();
    const elsewhere = makeTempRepoRoot("work-history-elsewhere-");
    const res = handleWorkHistoryHttpBody({
      repoRoot,
      body: {
        op: "createPending",
        repoRoot: elsewhere,
        path: elsewhere,
        dir: elsewhere,
        input: pendingInput(),
      },
    });
    expect(res.statusCode).toBe(200);
    expect(fs.existsSync(indexPath(repoRoot))).toBe(true);
    expect(fs.readdirSync(elsewhere)).toEqual([]);
    expect(handleWorkHistoryHttpBody({ repoRoot, body: { op: "exec", cmd: "rm -rf /" } }).statusCode).toBe(400);
  });

  it("error bodies never leak absolute paths or system details", () => {
    const repoRoot = makeTempRepoRoot();
    fs.mkdirSync(dataDir(repoRoot), { recursive: true });
    fs.writeFileSync(indexPath(repoRoot), "{broken", "utf8");
    for (const body of [
      { op: "list" },
      { op: "read", input: { snapshotId: "abcdef12-0000" } },
      { op: "createPending", input: pendingInput() },
    ]) {
      const res = handleWorkHistoryHttpBody({ repoRoot, body });
      expect(res.body.ok).toBe(false);
      const text = JSON.stringify(res.body);
      expect(text).not.toContain(repoRoot);
      expect(text).not.toContain(path.basename(repoRoot));
      expect(text).not.toMatch(/[A-Za-z]:\\/);
      expect(text).not.toMatch(/ENOENT|EPERM|stack|git /i);
    }
    // A broken index is never overwritten by a write attempt.
    expect(fs.readFileSync(indexPath(repoRoot), "utf8")).toBe("{broken");
  });

  it("orphan temp files are never read as the ledger", () => {
    const repoRoot = makeTempRepoRoot();
    const id = createPending(repoRoot);
    fs.writeFileSync(`${indexPath(repoRoot)}.tmp-999-orphan`, '{"entries":[{"snapshotId":"x"}]}', "utf8");
    fs.writeFileSync(`${snapshotPath(repoRoot, id)}.tmp-999-orphan`, '{"status":"APPROVED"}', "utf8");
    fs.writeFileSync(snapshotPath(repoRoot, "orphan0000-no-index"), '{"status":"APPROVED"}', "utf8");
    const listed = makeStore(repoRoot).list();
    expect(listed.ok && listed.entries.map((e) => e.snapshotId)).toEqual([id]);
    expect(makeStore(repoRoot).read(id)).toMatchObject({ ok: true, entry: { status: "PENDING" } });
    expect(makeStore(repoRoot).read("orphan0000-no-index")).toMatchObject({ ok: false, code: "NOT_FOUND" });
  });

  it("createPending with a failing index write leaves no listed or readable snapshot", () => {
    const repoRoot = makeTempRepoRoot();
    const { io } = trackingIo({ failRenameTo: (to) => to.endsWith("history-index.json") });
    const r = makeStore(repoRoot, io).createPending(pendingInput());
    expect(r.ok).toBe(false);
    const listed = makeStore(repoRoot).list();
    expect(listed.ok && listed.entries).toEqual([]);
  });

  it("a fresh repo (no folder yet) lists an empty ledger without writing", () => {
    const repoRoot = makeTempRepoRoot();
    expect(makeStore(repoRoot).list()).toEqual({ ok: true, entries: [] });
    expect(fs.existsSync(dataDir(repoRoot))).toBe(false);
  });
});

describe("M — import (legacy migration target)", () => {
  function legacySnapshot(id: string) {
    return {
      id,
      name: `legacy_${id}`,
      systemId: "5_half_system",
      pattern: "뒤돌리기",
      version: 1,
      timestamp: "2026-09-20T00:00:00.000Z",
      exported: false,
      state: SAMPLE_STATE,
      publishOperation: sample.publishOperation,
      publishFamilyGraph: sample.approvedGraph,
      derivedApproval: {
        status: "APPROVED" as const,
        derivedCount: sample.derivedCount,
        source: "SAVE_APPROVE" as const,
      },
    };
  }

  it("imports once; a re-run reports existing ids and creates no duplicates", () => {
    const repoRoot = makeTempRepoRoot();
    const first = makeStore(repoRoot).importSnapshots({
      snapshots: [legacySnapshot("11111111-aaaa"), legacySnapshot("22222222-bbbb")],
    });
    expect(first).toMatchObject({ ok: true, imported: ["11111111-aaaa", "22222222-bbbb"], existing: [] });
    const second = makeStore(repoRoot).importSnapshots({
      snapshots: [legacySnapshot("11111111-aaaa"), legacySnapshot("22222222-bbbb")],
    });
    expect(second).toMatchObject({ ok: true, imported: [], existing: ["11111111-aaaa", "22222222-bbbb"] });
    const listed = makeStore(repoRoot).list();
    expect(listed.ok && listed.entries).toHaveLength(2);
  });

  it("an index failure during import leaves the ledger unchanged and no new files", () => {
    const repoRoot = makeTempRepoRoot();
    const existingId = createPending(repoRoot);
    const { io } = trackingIo({ failRenameTo: (to) => to.endsWith("history-index.json") });
    const r = makeStore(repoRoot, io).importSnapshots({ snapshots: [legacySnapshot("33333333-cccc")] });
    expect(r.ok).toBe(false);
    const listed = makeStore(repoRoot).list();
    expect(listed.ok && listed.entries.map((e) => e.snapshotId)).toEqual([existingId]);
    expect(fs.existsSync(snapshotPath(repoRoot, "33333333-cccc"))).toBe(false);
  });
});
