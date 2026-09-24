/**
 * Phase 3-B2 contract — verified Published write + read-back + restore.
 * Uses in-memory FileHandle mocks (never touches real dataset/).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { DatasetExportPayload } from "./datasetExport";
import type { PositionRecord, StrategyEntry } from "./positionSearchEngine";
import {
  publishedExportSemanticEqual,
  serializePublishedCandidate,
  verifyPublishedReadBack,
  writeVerifiedPublishedFile,
  type PublishedFileHandleLike,
} from "./publishedWrite";

const balls = {
  cue: { x: 10, y: 10 },
  target: { x: 50, y: 25 },
  second: { x: 40, y: 20 },
};

let memberSeq = 0;
function nextMemberId(): string {
  memberSeq += 1;
  return `mb_w${memberSeq}`;
}

function entry(
  slot: "S1" | "S2" | "S3",
  opts: {
    familyId?: string;
    memberId?: string;
    marker?: string;
    CO_f?: number;
  } = {}
): StrategyEntry {
  const base: StrategyEntry = {
    slot,
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: opts.CO_f ?? 40 },
    corrections: {
      departure: 0,
      spin: 0,
      slide: 0,
      draw: 0,
      curve_ratio: 0,
    },
    meta: {
      impact: { x: 0, y: 0 },
      final: { x: 0, y: 0 },
      angle_ci: 0,
      angle_fs: 0,
    },
  };
  if (opts.familyId != null) {
    base.familyId = opts.familyId;
    base.memberId = opts.memberId ?? nextMemberId();
    base.memberOrigin = "AUTHORED";
  }
  if (opts.marker) base.ai = { text: opts.marker };
  return base;
}

function position(
  positionId: string,
  slots: Partial<Record<"S1" | "S2" | "S3", StrategyEntry>>
): PositionRecord {
  return { positionId, balls, strategies: slots, schemaVersion: 1 };
}

function envelope(records: PositionRecord[]): DatasetExportPayload {
  return {
    schemaVersion: 2,
    shotType: "뒤돌리기",
    systemId: "5_half_system",
    systemLabel: "파이브앤하프",
    exportedAt: "2026-09-16T12:00:00.000Z",
    sourceSnapshotId: "snap-1",
    records,
  };
}

function validCandidate(): DatasetExportPayload {
  return envelope([
    position("p1", {
      S1: entry("S1", {
        familyId: "fm_write",
        memberId: "mb_write1",
        marker: "ok",
      }),
    }),
  ]);
}

type MemHandle = PublishedFileHandleLike & {
  content: string | null;
  writes: string[];
  createWritableFail?: boolean;
  writeFail?: boolean;
  closeFail?: boolean;
  getFileFail?: boolean;
  corruptAfterClose?: (written: string) => string;
};

function createMemoryHandle(initial: string | null = null): MemHandle {
  const handle: MemHandle = {
    content: initial,
    writes: [],
    async getFile() {
      if (handle.getFileFail) throw new Error("getFile-failed");
      const text = handle.content ?? "";
      return {
        size: text.length,
        async text() {
          return text;
        },
      };
    },
    async createWritable() {
      if (handle.createWritableFail) throw new Error("createWritable-failed");
      let buffer = "";
      return {
        async write(data: string) {
          if (handle.writeFail) throw new Error("write-failed");
          buffer = data;
          handle.writes.push(data);
        },
        async close() {
          if (handle.closeFail) throw new Error("close-failed");
          const final = handle.corruptAfterClose
            ? handle.corruptAfterClose(buffer)
            : buffer;
          handle.content = final;
          // Corrupt only the first successful close (candidate write), not restore.
          handle.corruptAfterClose = undefined;
        },
        async abort() {
          /* discard buffer */
        },
      };
    },
  };
  return handle;
}

describe("publishedWrite — serialize / semantic / read-back", () => {
  it("E1 — identical candidate write/read-back semantic PASS", () => {
    const c = validCandidate();
    const ser = serializePublishedCandidate(c);
    expect(ser.ok).toBe(true);
    if (!ser.ok) return;
    const verified = verifyPublishedReadBack(c, ser.text);
    expect(verified.ok).toBe(true);
  });

  it("E7 — whitespace/order differences still semantic PASS after normalize", () => {
    const c = validCandidate();
    const compact = JSON.stringify(c);
    const verified = verifyPublishedReadBack(c, compact);
    expect(verified.ok).toBe(true);
  });

  it("E2 — missing family member → FAIL", () => {
    const c = validCandidate();
    const mutated = structuredClone(c);
    mutated.records = [];
    const text = JSON.stringify(mutated, null, 2);
    const verified = verifyPublishedReadBack(c, text);
    expect(verified.ok).toBe(false);
    if (verified.ok) return;
    expect(verified.reason).toBe("read-back-mismatch");
  });

  it("E3 — familyId change → FAIL", () => {
    const c = validCandidate();
    const mutated = structuredClone(c);
    mutated.records[0].strategies.S1!.familyId = "fm_other";
    mutated.records[0].strategies.S1!.memberId = "mb_other1";
    const verified = verifyPublishedReadBack(
      c,
      JSON.stringify(mutated, null, 2)
    );
    expect(verified.ok).toBe(false);
  });

  it("E4 — memberId change → FAIL", () => {
    const c = validCandidate();
    const mutated = structuredClone(c);
    mutated.records[0].strategies.S1!.memberId = "mb_changed99";
    const verified = verifyPublishedReadBack(
      c,
      JSON.stringify(mutated, null, 2)
    );
    expect(verified.ok).toBe(false);
  });

  it("E5 — system value change → FAIL", () => {
    const c = validCandidate();
    const mutated = structuredClone(c);
    mutated.records[0].strategies.S1!.sysInputs = { CO_f: 99 };
    const verified = verifyPublishedReadBack(
      c,
      JSON.stringify(mutated, null, 2)
    );
    expect(verified.ok).toBe(false);
  });

  it("E6 — ball coordinate change → FAIL", () => {
    const c = validCandidate();
    const mutated = structuredClone(c);
    mutated.records[0].balls = {
      ...mutated.records[0].balls,
      cue: { x: 99, y: 99 },
    };
    const verified = verifyPublishedReadBack(
      c,
      JSON.stringify(mutated, null, 2)
    );
    expect(verified.ok).toBe(false);
  });

  it("publishedExportSemanticEqual true for normalize-equivalent payloads", () => {
    const a = validCandidate();
    const b = JSON.parse(JSON.stringify(a)) as DatasetExportPayload;
    expect(publishedExportSemanticEqual(a, b)).toBe(true);
  });
});

describe("publishedWrite — failure matrix (mock handle)", () => {
  it("F1 — pre-write validation failure: write 0회", async () => {
    const handle = createMemoryHandle(null);
    const bad = envelope([
      position("p1", {
        S1: entry("S1", {
          familyId: "fm_bad",
          memberOrigin: "SYMMETRY" as StrategyEntry["memberOrigin"],
          // missing lineage → provenance fail when revalidate true
        }),
      }),
    ]);
    // Force invalid provenance
    bad.records[0].strategies.S1!.memberOrigin = "SYMMETRY";
    delete bad.records[0].strategies.S1!.generatedFromMemberId;
    delete bad.records[0].strategies.S1!.symmetryOp;

    const result = await writeVerifiedPublishedFile({
      fileHandle: handle,
      candidate: bad,
      revalidate: true,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("pre-write-validation-failed");
    expect(handle.writes).toHaveLength(0);
    expect(handle.content).toBeNull();
  });

  it("F2 — serialization failure blocks write", async () => {
    const handle = createMemoryHandle(null);
    const circular = validCandidate() as DatasetExportPayload & {
      self?: unknown;
    };
    circular.self = circular;
    const result = await writeVerifiedPublishedFile({
      fileHandle: handle,
      candidate: circular as DatasetExportPayload,
      revalidate: false,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("serialize-failed");
    expect(handle.writes).toHaveLength(0);
  });

  it("F3 — createWritable failure", async () => {
    const handle = createMemoryHandle("ORIGINAL");
    handle.createWritableFail = true;
    const result = await writeVerifiedPublishedFile({
      fileHandle: handle,
      candidate: validCandidate(),
      originalText: "ORIGINAL",
      revalidate: false,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("write-failed");
    expect(handle.content).toBe("ORIGINAL");
  });

  it("F4 — write failure", async () => {
    const handle = createMemoryHandle("ORIGINAL");
    handle.writeFail = true;
    const result = await writeVerifiedPublishedFile({
      fileHandle: handle,
      candidate: validCandidate(),
      originalText: "ORIGINAL",
      revalidate: false,
    });
    expect(result.ok).toBe(false);
    expect(handle.content).toBe("ORIGINAL");
  });

  it("F5 — close failure", async () => {
    const handle = createMemoryHandle("ORIGINAL");
    handle.closeFail = true;
    const result = await writeVerifiedPublishedFile({
      fileHandle: handle,
      candidate: validCandidate(),
      originalText: "ORIGINAL",
      revalidate: false,
    });
    expect(result.ok).toBe(false);
    expect(handle.content).toBe("ORIGINAL");
  });

  it("F6 — read-back getFile failure → restore attempted", async () => {
    const original = JSON.stringify({ keep: true });
    const handle = createMemoryHandle(original);
    const candidate = validCandidate();
    let getFileCalls = 0;
    handle.getFile = async () => {
      getFileCalls += 1;
      if (getFileCalls === 1) throw new Error("getFile-failed");
      const text = handle.content ?? "";
      return {
        size: text.length,
        async text() {
          return text;
        },
      };
    };
    // After write, content is candidate; getFile fails once then restore writes original.
    // writeVerified reads once after close — fail that; restore uses createWritable.
    handle.getFile = async () => {
      throw new Error("getFile-failed");
    };

    const result = await writeVerifiedPublishedFile({
      fileHandle: handle,
      candidate,
      originalText: original,
      revalidate: false,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("read-back-io-failed");
    expect(result.restored).toBe(true);
    expect(handle.content).toBe(original);
  });

  it("F7 — read-back JSON parse failure → restore", async () => {
    const original = JSON.stringify({ keep: "orig" });
    const handle = createMemoryHandle(original);
    handle.corruptAfterClose = () => "NOT_JSON{{{";
    const result = await writeVerifiedPublishedFile({
      fileHandle: handle,
      candidate: validCandidate(),
      originalText: original,
      revalidate: false,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("read-back-parse-failed");
    expect(result.restored).toBe(true);
    expect(handle.content).toBe(original);
  });

  it("F8 — read-back validation failure → restore", async () => {
    const original = JSON.stringify({ keep: "orig" });
    const handle = createMemoryHandle(original);
    handle.corruptAfterClose = () =>
      JSON.stringify({
        schemaVersion: 2,
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        systemLabel: "파이브앤하프",
        exportedAt: "2026-09-16T12:00:00.000Z",
        records: [
          {
            positionId: "p1",
            balls,
            schemaVersion: 1,
            strategies: {
              S1: {
                slot: "S1",
                signature: {
                  systemId: "5_half_system",
                  formulaHash: "h1",
                  shotType: "뒤돌리기",
                },
                sysInputs: { CO_f: 40 },
                corrections: {
                  departure: 0,
                  spin: 0,
                  slide: 0,
                  draw: 0,
                  curve_ratio: 0,
                },
                meta: {
                  impact: { x: 0, y: 0 },
                  final: { x: 0, y: 0 },
                  angle_ci: 0,
                  angle_fs: 0,
                },
                familyId: "fm_bad",
                memberId: "mb_bad1",
                memberOrigin: "SYMMETRY",
                // missing generatedFrom + symmetryOp
              },
            },
          },
        ],
      });
    const result = await writeVerifiedPublishedFile({
      fileHandle: handle,
      candidate: validCandidate(),
      originalText: original,
      revalidate: false,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(
      result.reason === "read-back-validation-failed" ||
        result.reason === "read-back-mismatch"
    ).toBe(true);
    expect(result.restored).toBe(true);
    expect(handle.content).toBe(original);
  });

  it("F9 — candidate/read-back mismatch → restore", async () => {
    const original = JSON.stringify({ keep: "orig" });
    const handle = createMemoryHandle(original);
    const other = validCandidate();
    other.records[0].strategies.S1!.ai = { text: "tampered" };
    other.records[0].strategies.S1!.memberId = "mb_tampered";
    handle.corruptAfterClose = () => JSON.stringify(other, null, 2);
    const result = await writeVerifiedPublishedFile({
      fileHandle: handle,
      candidate: validCandidate(),
      originalText: original,
      revalidate: false,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("read-back-mismatch");
    expect(result.restored).toBe(true);
    expect(handle.content).toBe(original);
  });

  it("F10 — verified success", async () => {
    const handle = createMemoryHandle(null);
    const candidate = validCandidate();
    const result = await writeVerifiedPublishedFile({
      fileHandle: handle,
      candidate,
      originalText: null,
      revalidate: false,
    });
    expect(result.ok).toBe(true);
    expect(handle.content).toBeTruthy();
    const verified = verifyPublishedReadBack(candidate, handle.content!);
    expect(verified.ok).toBe(true);
  });
});

describe("publishedWrite — restore contracts", () => {
  it("R1 — invalid read-back restores original", async () => {
    const original = JSON.stringify({ v: 1 });
    const handle = createMemoryHandle(original);
    handle.corruptAfterClose = () => "{bad";
    const result = await writeVerifiedPublishedFile({
      fileHandle: handle,
      candidate: validCandidate(),
      originalText: original,
      revalidate: false,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.restored).toBe(true);
    expect(handle.content).toBe(original);
  });

  it("R2 — restore itself fails → restoreFailed", async () => {
    const original = JSON.stringify({ v: 1 });
    const handle = createMemoryHandle(original);
    handle.corruptAfterClose = () => "{bad";
    let writableCalls = 0;
    const baseCreate = handle.createWritable.bind(handle);
    handle.createWritable = async () => {
      writableCalls += 1;
      if (writableCalls === 1) return baseCreate();
      throw new Error("restore-create-failed");
    };
    const result = await writeVerifiedPublishedFile({
      fileHandle: handle,
      candidate: validCandidate(),
      originalText: original,
      revalidate: false,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.restoreFailed).toBe(true);
    expect(result.restored).toBe(false);
  });

  it("R3 — verified success does not restore", async () => {
    const original = JSON.stringify({ v: 1 });
    const handle = createMemoryHandle(original);
    const spyWrite = vi.fn();
    const baseCreate = handle.createWritable.bind(handle);
    handle.createWritable = async () => {
      const w = await baseCreate();
      return {
        write: async (data: string) => {
          spyWrite(data);
          await w.write(data);
        },
        close: () => w.close(),
        abort: () => w.abort?.(),
      };
    };
    const candidate = validCandidate();
    const result = await writeVerifiedPublishedFile({
      fileHandle: handle,
      candidate,
      originalText: original,
      revalidate: false,
    });
    expect(result.ok).toBe(true);
    // Only one write (candidate), not a second restore write of original.
    expect(spyWrite).toHaveBeenCalledTimes(1);
    expect(spyWrite.mock.calls[0][0]).not.toBe(original);
  });
});

describe("publishedWrite — multi-snapshot sequencing (orchestration unit)", () => {
  /**
   * Historical Manual Export policy mirrored here as a pure sequencing unit.
   * Production owner is History Publish (PRODUCTION_VERIFIED → successfulIds).
   */
  async function runBatch(
    snaps: { id: string; pass: boolean }[]
  ): Promise<{ successfulExportIds: string[]; attempted: string[] }> {
    const successfulExportIds: string[] = [];
    const attempted: string[] = [];
    for (const snap of snaps) {
      attempted.push(snap.id);
      if (!snap.pass) break;
      successfulExportIds.push(snap.id);
    }
    return { successfulExportIds, attempted };
  }

  it("CASE M1 — A/B SUCCESS → both exported ids", async () => {
    const r = await runBatch([
      { id: "A", pass: true },
      { id: "B", pass: true },
    ]);
    expect(r.successfulExportIds).toEqual(["A", "B"]);
  });

  it("CASE M2 — A SUCCESS B FAIL → only A", async () => {
    const r = await runBatch([
      { id: "A", pass: true },
      { id: "B", pass: false },
      { id: "C", pass: true },
    ]);
    expect(r.successfulExportIds).toEqual(["A"]);
    expect(r.attempted).toEqual(["A", "B"]);
  });

  it("CASE M3 — A FAIL first → none exported; later not attempted", async () => {
    const r = await runBatch([
      { id: "A", pass: false },
      { id: "B", pass: true },
    ]);
    expect(r.successfulExportIds).toEqual([]);
    expect(r.attempted).toEqual(["A"]);
  });

  it("CASE M4 — stop-on-fail: C not attempted after B fail", async () => {
    const r = await runBatch([
      { id: "A", pass: true },
      { id: "B", pass: false },
      { id: "C", pass: true },
    ]);
    expect(r.successfulExportIds).toEqual(["A"]);
    expect(r.attempted).not.toContain("C");
  });
});

describe("publishedWrite — useSettings wiring", () => {
  it("Publish owner marks exported only after PRODUCTION_VERIFIED (no Manual Export write)", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "../hooks/useSettings.js"), "utf8");
    expect(src).toContain("handlePublishSnapshots");
    expect(src).toContain("publishDatasetToLocalRepoWithGit");
    expect(src).toContain('result.status === "PRODUCTION_VERIFIED"');
    expect(src).toContain("updateSnapshotsExported(successfulIds)");
    expect(src).not.toContain("writeVerifiedPublishedFile");
    expect(src).not.toContain("handleExportSnapshots");
    expect(src).not.toContain("saveDatasetExportToFile");
    // Must not set exported from full selected ids blindly after unverified write.
    expect(src).not.toMatch(/updateSnapshotsExported\(\s*ids\s*\)/);
  });
});
