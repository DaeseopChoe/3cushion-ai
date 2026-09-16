/**
 * Phase 3-C2 — Snapshot-bound Publish Family Payload contracts (T1–T20).
 */

import { describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildDatasetExport,
  normalizeDatasetExport,
} from "./datasetExport";
import {
  buildPublishFamilyPayload,
  crossValidateOperationAndPayload,
  extractFamilyScopedRecords,
  readPublishFamilyPayloadFromSnapshot,
  validatePublishFamilyPayload,
  type PublishFamilyPayload,
} from "./publishFamilyPayload";
import {
  buildPublishedFamilyExportCandidate,
} from "./publishedFamilyPublish";
import type { PublishOperation } from "./publishOperation";
import type { PositionRecord, StrategyEntry } from "./positionSearchEngine";
import {
  loadWorkspaceHistory,
  saveWorkspaceHistory,
  WORKSPACE_HISTORY_KEY,
  type WorkspaceSnapshot,
} from "./workspaceHistory";

const balls = {
  cue: { x: 10, y: 10 },
  target: { x: 50, y: 25 },
  second: { x: 40, y: 20 },
};

const ballsAlt = {
  cue: { x: 12, y: 12 },
  target: { x: 52, y: 27 },
  second: { x: 42, y: 22 },
};

let seq = 0;
function mb(): string {
  seq += 1;
  return `mb_c2_${seq}`;
}

function entry(
  slot: "S1" | "S2" | "S3",
  opts: {
    familyId?: string;
    memberId?: string;
    marker?: string;
    memberOrigin?: StrategyEntry["memberOrigin"];
    generatedFromMemberId?: string;
    derivedRule?: StrategyEntry["derivedRule"];
    derivedStep?: string;
    track?: string;
    sysValue?: number;
  } = {}
): StrategyEntry {
  const e: StrategyEntry = {
    slot,
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: opts.sysValue ?? 40 },
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
    e.memberOrigin = opts.memberOrigin ?? "AUTHORED";
  }
  if (opts.generatedFromMemberId) {
    e.generatedFromMemberId = opts.generatedFromMemberId;
  }
  if (opts.derivedRule) e.derivedRule = opts.derivedRule;
  if (opts.derivedStep) e.derivedStep = opts.derivedStep;
  if (opts.track) e.track = opts.track;
  if (opts.marker) e.ai = { text: opts.marker };
  return e;
}

function position(
  positionId: string,
  slots: Partial<Record<"S1" | "S2" | "S3", StrategyEntry>>,
  ballSet = balls
): PositionRecord {
  return {
    positionId,
    balls: ballSet,
    strategies: slots,
    schemaVersion: 1,
  };
}

function op(
  intent: "CREATE" | "UPDATE",
  destinationFamilyId: string,
  sourceFamilyId: string | null = intent === "UPDATE" ? destinationFamilyId : null
): PublishOperation {
  return {
    schemaVersion: 1,
    intent,
    sourceFamilyId,
    destinationFamilyId,
  };
}

function snapshotBase(
  overrides: Partial<WorkspaceSnapshot> = {}
): WorkspaceSnapshot {
  return {
    id: "snap-c2",
    name: "test",
    systemId: "5_half_system",
    pattern: "뒤돌리기",
    version: 1,
    timestamp: "2026-09-17T00:00:00.000Z",
    state: {
      adminState: {},
      ballsState: null,
      shotEditor: { activeSlot: "S1", slots: {} },
    },
    ...overrides,
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

describe("publishFamilyPayload — extraction + schema", () => {
  it("T1 — SAVE-time destination family extraction", () => {
    const dataset = [
      position("p1", {
        S1: entry("S1", { familyId: "fm_a", marker: "a1" }),
      }),
      position("p2", {
        S1: entry("S1", { familyId: "fm_b", marker: "b1" }),
      }),
    ];
    const built = buildPublishFamilyPayload(dataset, "fm_a");
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.payload.familyId).toBe("fm_a");
    expect(built.payload.records).toHaveLength(1);
    expect(markers(built.payload.records, "fm_a")).toEqual(["a1"]);
  });

  it("T2/T3 — only destination slots; same PositionRecord unrelated family excluded", () => {
    const dataset = [
      position("p_multi", {
        S1: entry("S1", { familyId: "fm_a", marker: "a" }),
        S2: entry("S2", { familyId: "fm_b", marker: "b" }),
      }),
    ];
    const scoped = extractFamilyScopedRecords(dataset, "fm_a");
    expect(scoped).toHaveLength(1);
    expect(scoped[0].strategies.S1?.familyId).toBe("fm_a");
    expect(scoped[0].strategies.S2).toBeUndefined();
    expect(scoped[0].strategies.S1?.ai?.text).toBe("a");
  });

  it("T4 — immutable deep-copied payload", () => {
    const shared = position("p1", {
      S1: entry("S1", { familyId: "fm_a", marker: "orig", sysValue: 40 }),
    });
    const built = buildPublishFamilyPayload([shared], "fm_a");
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    shared.strategies.S1!.sysInputs = { CO_f: 99 };
    shared.strategies.S1!.ai = { text: "mutated" };
    expect(built.payload.records[0].strategies.S1?.sysInputs?.CO_f).toBe(40);
    expect(built.payload.records[0].strategies.S1?.ai?.text).toBe("orig");
  });

  it("T5 — operation.destination == payload.familyId", () => {
    const payload: PublishFamilyPayload = {
      schemaVersion: 1,
      familyId: "fm_a",
      records: [
        position("p1", {
          S1: entry("S1", { familyId: "fm_a" }),
        }),
      ],
    };
    expect(crossValidateOperationAndPayload(op("CREATE", "fm_a"), payload).ok).toBe(
      true
    );
    expect(
      crossValidateOperationAndPayload(op("CREATE", "fm_other"), payload).ok
    ).toBe(false);
  });

  it("F1/F2 — invalid destination / empty family blocks build", () => {
    expect(buildPublishFamilyPayload([], "not-a-family").ok).toBe(false);
    expect(
      buildPublishFamilyPayload(
        [
          position("p1", {
            S1: entry("S1", { familyId: "fm_other" }),
          }),
        ],
        "fm_missing"
      ).ok
    ).toBe(false);
  });

  it("F3/F4 — unrelated slot / duplicate memberId validation fail", () => {
    const unrelated = validatePublishFamilyPayload({
      schemaVersion: 1,
      familyId: "fm_a",
      records: [
        position("p1", {
          S1: entry("S1", { familyId: "fm_a" }),
          S2: entry("S2", { familyId: "fm_b" }),
        }),
      ],
    });
    expect(unrelated.ok).toBe(false);

    const dupMid = "mb_dup_same";
    const dup = validatePublishFamilyPayload({
      schemaVersion: 1,
      familyId: "fm_a",
      records: [
        position("p1", {
          S1: entry("S1", { familyId: "fm_a", memberId: dupMid }),
        }),
        position("p2", {
          S1: entry("S1", { familyId: "fm_a", memberId: dupMid }),
        }, ballsAlt),
      ],
    });
    expect(dup.ok).toBe(false);
  });
});

describe("publishFamilyPayload — Export source priority + immutability", () => {
  it("T6 — SAVE then current family mutation leaves History payload unchanged", () => {
    const saveTime = [
      position("p1", {
        S1: entry("S1", {
          familyId: "fm_a",
          marker: "save-time",
          sysValue: 40,
        }),
      }),
    ];
    const built = buildPublishFamilyPayload(saveTime, "fm_a");
    expect(built.ok).toBe(true);
    if (!built.ok) return;

    const snap = snapshotBase({
      publishOperation: op("UPDATE", "fm_a"),
      publishFamilyPayload: built.payload,
    });

    // Mutate "current" corpus after SAVE.
    const currentWorking = [
      position("p1", {
        S1: entry("S1", {
          familyId: "fm_a",
          marker: "mutated-now",
          sysValue: 77,
        }),
      }),
    ];
    const loadWorking = vi.fn(() => currentWorking);
    const result = buildDatasetExport(snap, "2026-09-17T01:00:00.000Z", {
      loadWorking,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe("SNAPSHOT_PAYLOAD");
    expect(markers(result.payload.records, "fm_a")).toEqual(["save-time"]);
    expect(result.payload.records[0].strategies.S1?.sysInputs?.CO_f).toBe(40);
    expect(loadWorking).not.toHaveBeenCalled();
  });

  it("T7 — SAVE then current family delete → Export still succeeds", () => {
    const built = buildPublishFamilyPayload(
      [
        position("p1", {
          S1: entry("S1", { familyId: "fm_a", marker: "kept" }),
        }),
      ],
      "fm_a"
    );
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const snap = snapshotBase({
      publishOperation: op("CREATE", "fm_a"),
      publishFamilyPayload: built.payload,
    });
    const loadWorking = vi.fn(() => []);
    const result = buildDatasetExport(snap, undefined, { loadWorking });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe("SNAPSHOT_PAYLOAD");
    expect(markers(result.payload.records, "fm_a")).toEqual(["kept"]);
    expect(loadWorking).not.toHaveBeenCalled();
  });

  it("T8 — SAVE then unrelated family create → old Export unaffected", () => {
    const built = buildPublishFamilyPayload(
      [
        position("p1", {
          S1: entry("S1", { familyId: "fm_a", marker: "only-a" }),
        }),
      ],
      "fm_a"
    );
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const snap = snapshotBase({
      publishOperation: op("CREATE", "fm_a"),
      publishFamilyPayload: built.payload,
    });
    const currentWithB = [
      position("p1", {
        S1: entry("S1", { familyId: "fm_a", marker: "changed-a" }),
      }),
      position("p2", {
        S1: entry("S1", { familyId: "fm_b", marker: "new-b" }),
      }, ballsAlt),
    ];
    const result = buildDatasetExport(snap, undefined, {
      loadWorking: () => currentWithB,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(markers(result.payload.records, "fm_a")).toEqual(["only-a"]);
    expect(collectFamilyIds(result.payload.records)).toEqual(["fm_a"]);
  });

  it("T9 — new snapshot Export does not call loadWorkingDataset", () => {
    const built = buildPublishFamilyPayload(
      [
        position("p1", {
          S1: entry("S1", { familyId: "fm_a" }),
        }),
      ],
      "fm_a"
    );
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const loadWorking = vi.fn(() => {
      throw new Error("must-not-call");
    });
    const result = buildDatasetExport(
      snapshotBase({
        publishOperation: op("CREATE", "fm_a"),
        publishFamilyPayload: built.payload,
      }),
      undefined,
      { loadWorking }
    );
    expect(result.ok).toBe(true);
    expect(loadWorking).not.toHaveBeenCalled();
  });
});

describe("publishFamilyPayload — CREATE/UPDATE/retry + multi-snapshot", () => {
  it("T10/T11/T12 — CREATE / UPDATE / CREATE retry use snapshot payload", () => {
    const payloadA = buildPublishFamilyPayload(
      [
        position("p1", {
          S1: entry("S1", { familyId: "fm_a", marker: "snap-a" }),
        }),
      ],
      "fm_a"
    );
    expect(payloadA.ok).toBe(true);
    if (!payloadA.ok) return;

    const createIncoming = buildDatasetExport(
      snapshotBase({
        id: "snap-create",
        publishOperation: op("CREATE", "fm_a"),
        publishFamilyPayload: payloadA.payload,
      })
    );
    expect(createIncoming.ok).toBe(true);
    if (!createIncoming.ok) return;

    const createOnce = buildPublishedFamilyExportCandidate(
      null,
      createIncoming.payload,
      op("CREATE", "fm_a")
    );
    expect(createOnce.ok).toBe(true);
    if (!createOnce.ok) return;
    expect(markers(createOnce.payload.records, "fm_a")).toEqual(["snap-a"]);

    // UPDATE with newer snapshot payload value
    const payloadUpdated = buildPublishFamilyPayload(
      [
        position("p1", {
          S1: entry("S1", { familyId: "fm_a", marker: "snap-a-updated" }),
        }),
      ],
      "fm_a"
    );
    expect(payloadUpdated.ok).toBe(true);
    if (!payloadUpdated.ok) return;
    const updateIncoming = buildDatasetExport(
      snapshotBase({
        id: "snap-update",
        publishOperation: op("UPDATE", "fm_a"),
        publishFamilyPayload: payloadUpdated.payload,
      })
    );
    expect(updateIncoming.ok).toBe(true);
    if (!updateIncoming.ok) return;
    const updated = buildPublishedFamilyExportCandidate(
      createOnce.payload,
      updateIncoming.payload,
      op("UPDATE", "fm_a")
    );
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(markers(updated.payload.records, "fm_a")).toEqual(["snap-a-updated"]);

    // CREATE retry uses same original snapshot A payload (idempotent replace)
    const retry = buildPublishedFamilyExportCandidate(
      updated.payload,
      createIncoming.payload,
      op("CREATE", "fm_a")
    );
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    expect(markers(retry.payload.records, "fm_a")).toEqual(["snap-a"]);
  });

  it("T13/T19 — multi-snapshot independent payloads after corpus mutation", () => {
    const buildSnap = (fid: string, marker: string) => {
      const built = buildPublishFamilyPayload(
        [
          position(`p_${fid}`, {
            S1: entry("S1", { familyId: fid, marker }),
          }, {
            cue: { x: 10 + fid.charCodeAt(3), y: 10 },
            target: { x: 50, y: 25 },
            second: { x: 40, y: 20 },
          }),
        ],
        fid
      );
      expect(built.ok).toBe(true);
      if (!built.ok) throw new Error("build failed");
      return snapshotBase({
        id: `snap_${fid}`,
        publishOperation: op("CREATE", fid),
        publishFamilyPayload: built.payload,
      });
    };
    const snapA = buildSnap("fm_a", "payload-a");
    const snapB = buildSnap("fm_b", "payload-b");
    const snapC = buildSnap("fm_c", "payload-c");

    const mutatedCorpus = [
      position("noise", {
        S1: entry("S1", { familyId: "fm_noise", marker: "noise" }),
      }),
    ];
    const loadWorking = vi.fn(() => mutatedCorpus);

    for (const [snap, expected] of [
      [snapA, "payload-a"],
      [snapB, "payload-b"],
      [snapC, "payload-c"],
    ] as const) {
      const r = buildDatasetExport(snap, undefined, { loadWorking });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.source).toBe("SNAPSHOT_PAYLOAD");
      expect(r.payload.records[0].strategies.S1?.ai?.text).toBe(expected);
    }
    expect(loadWorking).not.toHaveBeenCalled();
  });

  it("T14 — malformed new payload fail-closed (no working fallback)", () => {
    const loadWorking = vi.fn(() => [
      position("p1", {
        S1: entry("S1", { familyId: "fm_a", marker: "fallback-would-be-wrong" }),
      }),
    ]);
    const result = buildDatasetExport(
      snapshotBase({
        publishOperation: op("CREATE", "fm_a"),
        publishFamilyPayload: {
          schemaVersion: 1,
          familyId: "fm_a",
          records: [],
        },
      }),
      undefined,
      { loadWorking }
    );
    expect(result.ok).toBe(false);
    expect(loadWorking).not.toHaveBeenCalled();
  });

  it("T15 — C1 snapshot without payload → C1 working fallback", () => {
    const loadWorking = vi.fn(() => [
      position("p1", {
        S1: entry("S1", { familyId: "fm_a", marker: "c1-working" }),
      }),
    ]);
    const result = buildDatasetExport(
      snapshotBase({
        publishOperation: op("UPDATE", "fm_a"),
        // no publishFamilyPayload
      }),
      undefined,
      { loadWorking }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe("C1_WORKING_FALLBACK");
    expect(loadWorking).toHaveBeenCalledTimes(1);
    expect(markers(result.payload.records, "fm_a")).toEqual(["c1-working"]);
  });

  it("T16 — legacy snapshot → legacy inference / state.dataset", () => {
    const result = buildDatasetExport(
      snapshotBase({
        state: {
          adminState: {},
          ballsState: null,
          shotEditor: { activeSlot: "S1", slots: {} },
          dataset: [
            position("p1", {
              S1: entry("S1", { familyId: "fm_legacy", marker: "from-state" }),
            }),
          ],
        },
      }),
      undefined,
      {
        loadWorking: () => {
          throw new Error("should-use-state-dataset");
        },
      }
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe("STATE_DATASET");
    expect(markers(result.payload.records, "fm_legacy")).toEqual(["from-state"]);
  });
});

describe("publishFamilyPayload — provenance + persistence hygiene", () => {
  it("T17 — command metadata not on positions.json candidate envelope", () => {
    const built = buildPublishFamilyPayload(
      [
        position("p1", {
          S1: entry("S1", { familyId: "fm_a", marker: "x" }),
        }),
      ],
      "fm_a"
    );
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const exportResult = buildDatasetExport(
      snapshotBase({
        publishOperation: op("CREATE", "fm_a"),
        publishFamilyPayload: built.payload,
      })
    );
    expect(exportResult.ok).toBe(true);
    if (!exportResult.ok) return;
    const candidate = buildPublishedFamilyExportCandidate(
      null,
      exportResult.payload,
      op("CREATE", "fm_a")
    );
    expect(candidate.ok).toBe(true);
    if (!candidate.ok) return;
    const json = JSON.stringify(candidate.payload);
    expect(json).not.toContain("publishOperation");
    expect(json).not.toContain("publishFamilyPayload");
    expect(json).not.toContain("sourceFamilyId");
    expect(Object.prototype.hasOwnProperty.call(candidate.payload, "intent")).toBe(
      false
    );
  });

  it("T18 — memberId/familyId/provenance/track preserved", () => {
    const authoredMid = "mb_authored_keep";
    const derivedMid = "mb_derived_keep";
    const dataset = [
      position("p1", {
        S1: entry("S1", {
          familyId: "fm_a",
          memberId: authoredMid,
          track: "B2T_L",
          marker: "authored",
        }),
      }),
      position("p2", {
        S1: entry("S1", {
          familyId: "fm_a",
          memberId: derivedMid,
          memberOrigin: "DERIVED_CUE_C3_PRODUCT",
          generatedFromMemberId: authoredMid,
          derivedRule: "CUE_C3_CARTESIAN_PRODUCT_V1",
          derivedStep: "cue+0.5|c3+1",
          track: "B2T_L",
          marker: "derived",
        }),
      }, ballsAlt),
    ];
    const built = buildPublishFamilyPayload(dataset, "fm_a");
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const byMid = new Map<string, StrategyEntry>();
    for (const rec of built.payload.records) {
      for (const slot of ["S1", "S2", "S3"] as const) {
        const e = rec.strategies[slot];
        if (e?.memberId) byMid.set(e.memberId, e);
      }
    }
    expect(byMid.get(authoredMid)?.familyId).toBe("fm_a");
    expect(byMid.get(authoredMid)?.track).toBe("B2T_L");
    expect(byMid.get(authoredMid)?.memberOrigin).toBe("AUTHORED");
    expect(byMid.get(derivedMid)?.generatedFromMemberId).toBe(authoredMid);
    expect(byMid.get(derivedMid)?.derivedRule).toBe("CUE_C3_CARTESIAN_PRODUCT_V1");
  });

  it("T20 — History deserialize retains payload", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => {
        store.set(k, String(v));
      },
      removeItem: (k: string) => {
        store.delete(k);
      },
      clear: () => store.clear(),
      key: (i: number) => [...store.keys()][i] ?? null,
      get length() {
        return store.size;
      },
    });

    const built = buildPublishFamilyPayload(
      [
        position("p1", {
          S1: entry("S1", { familyId: "fm_a", marker: "persist" }),
        }),
      ],
      "fm_a"
    );
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const snap = snapshotBase({
      id: "snap-persist",
      publishOperation: op("CREATE", "fm_a"),
      publishFamilyPayload: built.payload,
    });
    const saveRes = saveWorkspaceHistory([snap]);
    expect(saveRes.ok).toBe(true);
    const loaded = loadWorkspaceHistory();
    expect(loaded).toHaveLength(1);
    const read = readPublishFamilyPayloadFromSnapshot(loaded[0]);
    expect(read.ok).toBe(true);
    if (!read.ok || !("payload" in read) || read.payload == null) return;
    expect(read.payload.familyId).toBe("fm_a");
    expect(markers(read.payload.records, "fm_a")).toEqual(["persist"]);
    localStorage.removeItem(WORKSPACE_HISTORY_KEY);
    vi.unstubAllGlobals();
  });

  it("source≠destination UPDATE: payload familyId is destination", () => {
    const built = buildPublishFamilyPayload(
      [
        position("p1", {
          S1: entry("S1", { familyId: "fm_dest", marker: "dest-only" }),
        }),
      ],
      "fm_dest"
    );
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const cross = crossValidateOperationAndPayload(
      op("UPDATE", "fm_dest", "fm_source"),
      built.payload
    );
    expect(cross.ok).toBe(true);

    const existing = normalizeDatasetExport({
      schemaVersion: 2,
      shotType: "뒤돌리기",
      systemId: "5_half_system",
      systemLabel: "파이브앤하프",
      exportedAt: "2026-09-17T00:00:00.000Z",
      records: [
        position("old", {
          S1: entry("S1", { familyId: "fm_source", marker: "old-source" }),
        }),
        position("keep", {
          S1: entry("S1", { familyId: "fm_other", marker: "keep" }),
        }, ballsAlt),
      ],
    });
    const incoming = buildDatasetExport(
      snapshotBase({
        publishOperation: op("UPDATE", "fm_dest", "fm_source"),
        publishFamilyPayload: built.payload,
      })
    );
    expect(incoming.ok).toBe(true);
    if (!incoming.ok) return;
    const published = buildPublishedFamilyExportCandidate(
      existing,
      incoming.payload,
      op("UPDATE", "fm_dest", "fm_source")
    );
    expect(published.ok).toBe(true);
    if (!published.ok) return;
    expect(collectFamilyIds(published.payload.records).sort()).toEqual([
      "fm_dest",
      "fm_other",
    ]);
    expect(markers(published.payload.records, "fm_dest")).toEqual(["dest-only"]);
  });

  it("History size impact — representative family payload is bounded", () => {
    const members: PositionRecord[] = [];
    for (let i = 0; i < 8; i++) {
      members.push(
        position(
          `p_${i}`,
          {
            S1: entry("S1", {
              familyId: "fm_size",
              memberId: `mb_size_${i}`,
              marker: `m${i}`,
              track: "B2T_L",
            }),
          },
          {
            cue: { x: 10 + i, y: 10 },
            target: { x: 50 + i, y: 25 },
            second: { x: 40 + i, y: 20 },
          }
        )
      );
    }
    const built = buildPublishFamilyPayload(members, "fm_size");
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const bytes = JSON.stringify(built.payload).length;
    // Family-scoped (not full corpus): expect well under 200KB for 8 members.
    expect(bytes).toBeLessThan(200_000);
    // Report for project log (typical fixture ~ few KB).
    expect(bytes).toBeGreaterThan(500);
  });
});

describe("publishFamilyPayload — wiring", () => {
  it("useSettings builds payload from strategyUpdatedDataset at commit", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "../hooks/useSettings.js"), "utf8");
    expect(src).toContain("buildPublishFamilyPayload");
    expect(src).toContain("strategyUpdatedDataset");
    expect(src).toContain("publishFamilyPayload");
    expect(src).toContain("crossValidateOperationAndPayload");
  });

  it("historyFlow fails closed when history commit returns ok:false", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(join(here, "../application/flows/historyFlow.ts"), "utf8");
    expect(src).toContain("commitResult.ok === false");
    expect(src).toContain("history-commit-failed");
  });

  it("normalizeDatasetExport does not attach payload/operation keys", () => {
    const norm = normalizeDatasetExport({
      schemaVersion: 2,
      shotType: "뒤돌리기",
      systemId: "5_half_system",
      systemLabel: "파이브앤하프",
      exportedAt: "2026-09-17T00:00:00.000Z",
      records: [
        position("p1", {
          S1: entry("S1", { familyId: "fm_a" }),
        }),
      ],
    });
    expect(Object.keys(norm).sort()).toEqual(
      [
        "exportedAt",
        "records",
        "schemaVersion",
        "shotType",
        "systemId",
        "systemLabel",
      ].sort()
    );
  });
});

function collectFamilyIds(records: PositionRecord[]): string[] {
  const ids = new Set<string>();
  for (const rec of records) {
    for (const slot of ["S1", "S2", "S3"] as const) {
      const fid = rec.strategies[slot]?.familyId;
      if (typeof fid === "string" && fid.trim()) ids.add(fid.trim());
    }
  }
  return [...ids];
}
