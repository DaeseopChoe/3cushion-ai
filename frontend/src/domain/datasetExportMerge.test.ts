import { describe, expect, it } from "vitest";
import {
  mergePositionRecord,
  mergePositionStrategies,
  mergePublishedExport,
  mergePublishedRecords,
} from "./datasetExportMerge";
import type { DatasetExportPayload } from "./datasetExport";
import type { PositionRecord } from "./positionSearchEngine";

const balls = {
  cue: { x: 10, y: 10 },
  target: { x: 50, y: 25 },
  second: { x: 40, y: 20 },
};

function strategy(
  slot: "S1" | "S2" | "S3",
  systemId: string,
  extra?: { ai?: { text?: string } }
) {
  return {
    slot,
    signature: {
      systemId,
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: 40 },
    meta: {
      impact: { x: 0, y: 0 },
      final: { x: 0, y: 0 },
      angle_ci: 0,
      angle_fs: 0,
    },
    ...extra,
  };
}

function position(
  positionId: string,
  slots: Partial<Record<"S1" | "S2" | "S3", ReturnType<typeof strategy>>>
): PositionRecord {
  return { positionId, balls, strategies: slots };
}

function envelope(records: PositionRecord[]): DatasetExportPayload {
  return {
    schemaVersion: 2,
    shotType: "뒤돌리기",
    systemId: "5_half_system",
    systemLabel: "파이브앤하프",
    exportedAt: "2026-06-11T00:00:00.000Z",
    records,
  };
}

describe("datasetExportMerge", () => {
  it("Case 1: same position — S1 export then S2 export → S1 + S2", () => {
    const existing = [position("pos-a", { S1: strategy("S1", "5_half_system") })];
    const incoming = [position("pos-a", { S2: strategy("S2", "plus2_system") })];
    const merged = mergePublishedRecords(existing, incoming);
    expect(merged).toHaveLength(1);
    expect(merged[0].positionId).toBe("pos-a");
    expect(merged[0].strategies.S1?.signature.systemId).toBe("5_half_system");
    expect(merged[0].strategies.S2?.signature.systemId).toBe("plus2_system");
    expect(merged[0].strategies.S3).toBeUndefined();
  });

  it("Case 2: same position + same slot — incoming updates slot content", () => {
    const existing = [
      position("pos-a", {
        S1: strategy("S1", "5_half_system", { ai: { text: "두께 3팁" } }),
      }),
    ];
    const incoming = [
      position("pos-a", {
        S1: strategy("S1", "5_half_system", { ai: { text: "두께 2팁" } }),
      }),
    ];
    const merged = mergePublishedRecords(existing, incoming);
    expect(merged[0].strategies.S1?.ai).toEqual({ text: "두께 2팁" });
  });

  it("Case 3: multiple positions — A+B then C → A + B + C", () => {
    const existing = [
      position("pos-a", { S1: strategy("S1", "5_half_system") }),
      position("pos-b", { S1: strategy("S1", "5_half_system") }),
    ];
    const incoming = [position("pos-c", { S1: strategy("S1", "5_half_system") })];
    const merged = mergePublishedRecords(existing, incoming);
    expect(merged.map((r) => r.positionId)).toEqual(["pos-a", "pos-b", "pos-c"]);
  });

  it("Case 4: existing published data preserved when new export adds records", () => {
    const existing = [
      position("pos-a", { S1: strategy("S1", "5_half_system") }),
      position("pos-b", { S1: strategy("S1", "5_half_system") }),
    ];
    const incoming = [position("pos-c", { S1: strategy("S1", "5_half_system") })];
    const result = mergePublishedExport(envelope(existing), envelope(incoming));
    expect(result.records).toHaveLength(3);
    expect(result.records.map((r) => r.positionId)).toEqual([
      "pos-a",
      "pos-b",
      "pos-c",
    ]);
  });

  it("does not wipe sibling slots when merging same positionId", () => {
    const existing = position("pos-a", {
      S1: strategy("S1", "5_half_system"),
      S2: strategy("S2", "plus2_system"),
    });
    const incoming = position("pos-a", {
      S1: strategy("S1", "5_half_system", { ai: { text: "updated" } }),
    });
    const merged = mergePositionRecord(existing, incoming);
    expect(merged.strategies.S1?.ai).toEqual({ text: "updated" });
    expect(merged.strategies.S2?.signature.systemId).toBe("plus2_system");
  });

  it("mergePositionStrategies appends new slot only", () => {
    const merged = mergePositionStrategies(
      { S1: strategy("S1", "5_half_system") },
      { S2: strategy("S2", "plus2_system") }
    );
    expect(merged.S1).toBeDefined();
    expect(merged.S2).toBeDefined();
  });
});
