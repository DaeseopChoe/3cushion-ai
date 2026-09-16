/**
 * Phase 3-C1 — PublishOperation + History/Export operation contracts.
 */

import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { DatasetExportPayload } from "./datasetExport";
import type { PositionRecord, StrategyEntry } from "./positionSearchEngine";
import {
  buildPublishedFamilyExportCandidate,
} from "./publishedFamilyPublish";
import { countFamilyMembersInRecords } from "./publishedFamilyReplace";
import {
  buildPublishOperationFromSave,
  readPublishOperationFromSnapshot,
  validatePublishOperation,
  type PublishOperation,
} from "./publishOperation";

const balls = {
  cue: { x: 10, y: 10 },
  target: { x: 50, y: 25 },
  second: { x: 40, y: 20 },
};

let seq = 0;
function mb(): string {
  seq += 1;
  return `mb_c1_${seq}`;
}

function entry(
  slot: "S1" | "S2" | "S3",
  opts: {
    familyId?: string;
    memberId?: string;
    marker?: string;
  } = {}
): StrategyEntry {
  const e: StrategyEntry = {
    slot,
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
  };
  if (opts.familyId) {
    e.familyId = opts.familyId;
    e.memberId = opts.memberId ?? mb();
    e.memberOrigin = "AUTHORED";
  }
  if (opts.marker) e.ai = { text: opts.marker };
  return e;
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
    exportedAt: "2026-09-17T00:00:00.000Z",
    records,
  };
}

function markers(records: PositionRecord[], familyId: string): string[] {
  const out: string[] = [];
  for (const rec of records) {
    for (const slot of ["S1", "S2", "S3"] as const) {
      const e = rec.strategies[slot];
      if (!e || e.familyId !== familyId) continue;
      out.push(e.ai?.text ?? `${rec.positionId}:${slot}`);
    }
  }
  return out.sort();
}

describe("publishOperation — schema + SAVE mapping", () => {
  it("T1/T2 — UPDATE: source from session, destination preserved, equal on normal path", () => {
    const op = buildPublishOperationFromSave({
      saveIntent: "UPDATE",
      editingPublishedFamilyId: "fm_src_update",
      destinationFamilyId: "fm_src_update",
    });
    expect(op).not.toBeNull();
    expect(op!.intent).toBe("UPDATE");
    expect(op!.sourceFamilyId).toBe("fm_src_update");
    expect(op!.destinationFamilyId).toBe("fm_src_update");
    expect(op!.sourceFamilyId).toBe(op!.destinationFamilyId);
    expect(validatePublishOperation(op!).ok).toBe(true);
  });

  it("T3 — CREATE: source null, destination minted", () => {
    const op = buildPublishOperationFromSave({
      saveIntent: "CREATE",
      editingPublishedFamilyId: "fm_should_ignore",
      destinationFamilyId: "fm_new_create",
    });
    expect(op).toEqual({
      schemaVersion: 1,
      intent: "CREATE",
      sourceFamilyId: null,
      destinationFamilyId: "fm_new_create",
    });
  });

  it("T11 — CREATE with sourceFamilyId invalid", () => {
    const bad: PublishOperation = {
      schemaVersion: 1,
      intent: "CREATE",
      sourceFamilyId: "fm_oops",
      destinationFamilyId: "fm_new",
    };
    const v = validatePublishOperation(bad);
    expect(v.ok).toBe(false);
  });

  it("LEGACY save → null operation", () => {
    expect(
      buildPublishOperationFromSave({
        saveIntent: "LEGACY",
        destinationFamilyId: "fm_x",
      })
    ).toBeNull();
  });
});

describe("publishOperation — History immutability / Export wiring", () => {
  it("T4 — snapshot stores publishOperation; T5 live clear does not mutate stored op", () => {
    const stored: PublishOperation = {
      schemaVersion: 1,
      intent: "UPDATE",
      sourceFamilyId: "fm_hist",
      destinationFamilyId: "fm_hist",
    };
    const snapshot = {
      id: "snap-1",
      publishOperation: JSON.parse(JSON.stringify(stored)),
    };
    let liveEditing: string | null = "fm_hist";
    liveEditing = null; // simulate ball move / clear
    expect(liveEditing).toBeNull();
    expect(readPublishOperationFromSnapshot(snapshot)).toEqual(stored);
  });

  it("T6 — Export uses History operation without live session", () => {
    const op: PublishOperation = {
      schemaVersion: 1,
      intent: "UPDATE",
      sourceFamilyId: "fm_a",
      destinationFamilyId: "fm_a",
    };
    const existing = envelope([
      position("p1", {
        S1: entry("S1", { familyId: "fm_a", marker: "old" }),
      }),
      position("p2", {
        S1: entry("S1", { familyId: "fm_b", marker: "keep-b" }),
      }),
    ]);
    const incoming = envelope([
      position("p1", {
        S1: entry("S1", { familyId: "fm_a", marker: "new" }),
      }),
      // working corpus noise — other family must not be exported with operation
      position("noise", {
        S1: entry("S1", { familyId: "fm_noise", marker: "noise" }),
      }),
    ]);
    const result = buildPublishedFamilyExportCandidate(
      existing,
      incoming,
      op
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(markers(result.payload.records, "fm_a")).toEqual(["new"]);
    expect(markers(result.payload.records, "fm_b")).toEqual(["keep-b"]);
    expect(countFamilyMembersInRecords(result.payload.records, "fm_noise")).toBe(
      0
    );
  });
});

describe("publishOperation — explicit CREATE/UPDATE publish", () => {
  it("T7 — UPDATE purges source and inserts destination", () => {
    const op: PublishOperation = {
      schemaVersion: 1,
      intent: "UPDATE",
      sourceFamilyId: "fm_a",
      destinationFamilyId: "fm_a",
    };
    const existing = envelope([
      position("p1", {
        S1: entry("S1", { familyId: "fm_a", marker: "stale" }),
      }),
      position("p-stale", {
        S1: entry("S1", { familyId: "fm_a", marker: "stale2" }),
      }),
    ]);
    const incoming = envelope([
      position("p1", {
        S1: entry("S1", { familyId: "fm_a", marker: "fresh" }),
      }),
    ]);
    const result = buildPublishedFamilyExportCandidate(
      existing,
      incoming,
      op
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(markers(result.payload.records, "fm_a")).toEqual(["fresh"]);
  });

  it("T8 — CREATE appends new family", () => {
    const op: PublishOperation = {
      schemaVersion: 1,
      intent: "CREATE",
      sourceFamilyId: null,
      destinationFamilyId: "fm_new",
    };
    const existing = envelope([
      position("p-old", {
        S1: entry("S1", { familyId: "fm_old", marker: "old" }),
      }),
    ]);
    const incoming = envelope([
      position("p-new", {
        S1: entry("S1", { familyId: "fm_new", marker: "created" }),
      }),
    ]);
    const result = buildPublishedFamilyExportCandidate(
      existing,
      incoming,
      op
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.purgedFamilyIds).toEqual([]);
    expect(markers(result.payload.records, "fm_old")).toEqual(["old"]);
    expect(markers(result.payload.records, "fm_new")).toEqual(["created"]);
  });

  it("T9 — destination/incoming mismatch blocks", () => {
    const op: PublishOperation = {
      schemaVersion: 1,
      intent: "UPDATE",
      sourceFamilyId: "fm_a",
      destinationFamilyId: "fm_a",
    };
    const existing = envelope([
      position("p1", {
        S1: entry("S1", { familyId: "fm_a", marker: "old" }),
      }),
    ]);
    const incoming = envelope([
      position("p1", {
        S1: entry("S1", { familyId: "fm_other", marker: "wrong" }),
      }),
    ]);
    const result = buildPublishedFamilyExportCandidate(
      existing,
      incoming,
      op
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("incoming-destination-family-missing");
  });

  it("T10 — UPDATE source missing from existing blocks (no CREATE fallback)", () => {
    const op: PublishOperation = {
      schemaVersion: 1,
      intent: "UPDATE",
      sourceFamilyId: "fm_missing",
      destinationFamilyId: "fm_missing",
    };
    const existing = envelope([
      position("p1", {
        S1: entry("S1", { familyId: "fm_other", marker: "x" }),
      }),
    ]);
    const incoming = envelope([
      position("p1", {
        S1: entry("S1", { familyId: "fm_missing", marker: "y" }),
      }),
    ]);
    const result = buildPublishedFamilyExportCandidate(
      existing,
      incoming,
      op
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toBe("update-source-missing");
  });

  it("T12 — CREATE retry idempotent replace same destination", () => {
    const op: PublishOperation = {
      schemaVersion: 1,
      intent: "CREATE",
      sourceFamilyId: null,
      destinationFamilyId: "fm_retry",
    };
    const existing = envelope([
      position("p1", {
        S1: entry("S1", { familyId: "fm_retry", marker: "v1" }),
      }),
      position("p2", {
        S1: entry("S1", { familyId: "fm_retry", marker: "v1-extra" }),
      }),
    ]);
    const incoming = envelope([
      position("p1", {
        S1: entry("S1", { familyId: "fm_retry", marker: "v2" }),
      }),
    ]);
    const result = buildPublishedFamilyExportCandidate(
      existing,
      incoming,
      op
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.purgedFamilyIds).toEqual(["fm_retry"]);
    expect(markers(result.payload.records, "fm_retry")).toEqual(["v2"]);
    expect(countFamilyMembersInRecords(result.payload.records, "fm_retry")).toBe(
      1
    );
  });

  it("T13 — legacy History without operation keeps inference", () => {
    const existing = envelope([
      position("p1", {
        S1: entry("S1", { familyId: "fm_a", marker: "old" }),
      }),
    ]);
    const incoming = envelope([
      position("p1", {
        S1: entry("S1", { familyId: "fm_a", marker: "new" }),
      }),
    ]);
    const result = buildPublishedFamilyExportCandidate(existing, incoming, null);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(markers(result.payload.records, "fm_a")).toEqual(["new"]);
  });

  it("T14 — multi-snapshot operations stay independent", () => {
    const existing = envelope([
      position("pa", {
        S1: entry("S1", { familyId: "fm_a", marker: "a-old" }),
      }),
      position("pb", {
        S1: entry("S1", { familyId: "fm_b", marker: "b-keep" }),
      }),
    ]);
    const opA: PublishOperation = {
      schemaVersion: 1,
      intent: "UPDATE",
      sourceFamilyId: "fm_a",
      destinationFamilyId: "fm_a",
    };
    const opB: PublishOperation = {
      schemaVersion: 1,
      intent: "CREATE",
      sourceFamilyId: null,
      destinationFamilyId: "fm_c",
    };
    const afterA = buildPublishedFamilyExportCandidate(
      existing,
      envelope([
        position("pa", {
          S1: entry("S1", { familyId: "fm_a", marker: "a-new" }),
        }),
      ]),
      opA
    );
    expect(afterA.ok).toBe(true);
    if (!afterA.ok) return;
    const afterB = buildPublishedFamilyExportCandidate(
      afterA.payload,
      envelope([
        position("pc", {
          S1: entry("S1", { familyId: "fm_c", marker: "c-new" }),
        }),
      ]),
      opB
    );
    expect(afterB.ok).toBe(true);
    if (!afterB.ok) return;
    expect(markers(afterB.payload.records, "fm_a")).toEqual(["a-new"]);
    expect(markers(afterB.payload.records, "fm_b")).toEqual(["b-keep"]);
    expect(markers(afterB.payload.records, "fm_c")).toEqual(["c-new"]);
  });

  it("T15 — candidate envelope has no publishOperation / sourceFamilyId command keys", () => {
    const op: PublishOperation = {
      schemaVersion: 1,
      intent: "CREATE",
      sourceFamilyId: null,
      destinationFamilyId: "fm_clean",
    };
    const result = buildPublishedFamilyExportCandidate(
      envelope([]),
      envelope([
        position("p1", {
          S1: entry("S1", { familyId: "fm_clean", marker: "x" }),
        }),
      ]),
      op
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(
      Object.prototype.hasOwnProperty.call(
        result.payload as object,
        "publishOperation"
      )
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(
        result.payload as object,
        "sourceFamilyId"
      )
    ).toBe(false);
    expect(
      Object.prototype.hasOwnProperty.call(
        result.payload as object,
        "publishIntent"
      )
    ).toBe(false);
  });
});

describe("publishOperation — wiring", () => {
  it("useSettings reads History publishOperation into Export candidate", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "../hooks/useSettings.js"), "utf8");
    expect(src).toContain("readPublishOperationFromSnapshot");
    expect(src).toContain("publishOperation");
    expect(src).toContain("buildPublishedFamilyExportCandidate");
  });

  it("historyFlow forwards SaveFlowResult.publishOperation", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(
      join(here, "../application/flows/historyFlow.ts"),
      "utf8"
    );
    expect(src).toContain("r.publishOperation");
  });
});
