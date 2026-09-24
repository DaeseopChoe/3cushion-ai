import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPublishedLeafUrl,
  fetchPublishedLeaf,
  parsePublishedLeafPayload,
} from "./datasetLoader";
import {
  __clearPublishedDatasetStoreForTests,
  getOrLoadPublishedLeaf,
  getPublishedLeafCacheEntry,
  refreshPublishedDataset,
} from "./publishedDatasetStore";
import { createPositionId } from "./positionId";
import type { Ball3, PositionRecord, StrategyEntry } from "./positionSearchEngine";
import { convertFlatDatasetExportToNormalizedLeaf } from "./publishedLeafPrepare";
import { NORMALIZED_DATASET_SCHEMA_VERSION } from "./dataset/normalizedDatasetEnvelope";

const sampleBalls: Ball3 = {
  cue: { x: 10, y: 10 },
  target: { x: 50, y: 25 },
  second: { x: 40, y: 20 },
};

const FM = "fm_e1load-0000-4000-8000-000000000001";
const MB = "mb_e1load_1";

function migratableStrategy(
  overrides: Partial<StrategyEntry> = {}
): StrategyEntry {
  return {
    slot: "S1",
    signature: {
      systemId: "5_half_system",
      formulaHash: "h",
      shotType: "옆돌리기",
    },
    sysInputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
    corrections: {
      slide: 0,
      curve_ratio: 0,
      draw: 0,
      departure: 0,
      spin: 0,
    },
    correctionsStored: true,
    meta: {
      impact: { x: 0, y: 0 },
      final: { x: 0, y: 0 },
      angle_ci: 0,
      angle_fs: 0,
    },
    ai: { text: "lesson" },
    str: { speed: 2.5 },
    hpT: { T: "8/8", hit_point: { x: 0, y: 0 }, mode: "TIP", tipCount: 0 },
    thickness: "8/8",
    authoringStrategyId: "as_e1load_1",
    familyId: FM,
    memberId: MB,
    memberOrigin: "AUTHORED",
    track: "B2T_L",
    ...overrides,
  };
}

function v2Leaf(records: PositionRecord[]) {
  return {
    schemaVersion: 2 as const,
    shotType: "옆돌리기",
    systemId: "5_half_system",
    systemLabel: "파이브앤하프",
    records,
  };
}

function sampleRecord(): PositionRecord {
  return {
    positionId: createPositionId(sampleBalls),
    balls: sampleBalls,
    strategies: { S1: migratableStrategy() },
    schemaVersion: 1,
  };
}

describe("datasetLoader", () => {
  it("buildPublishedLeafUrl encodes shotType and system folder", () => {
    const url = buildPublishedLeafUrl("뒤돌리기 대회전", "5_half_system");
    expect(url).toContain("/dataset/");
    expect(url).toContain(encodeURIComponent("뒤돌리기 대회전"));
    expect(url).toContain(encodeURIComponent("파이브앤하프"));
    expect(url.endsWith("/positions.json")).toBe(true);
  });

  it("parsePublishedLeafPayload returns empty for zero records", () => {
    const result = parsePublishedLeafPayload(
      {
        schemaVersion: 2,
        shotType: "옆돌리기",
        systemId: "5_half_system",
        records: [],
      },
      "/dataset/x/y/positions.json"
    );
    expect(result.kind).toBe("empty");
  });

  it("fetchPublishedLeaf maps 404 to empty", async () => {
    const fetchFn = vi.fn().mockResolvedValue({ status: 404, ok: false });
    const result = await fetchPublishedLeaf("옆돌리기", "5_half_system", fetchFn);
    expect(result.kind).toBe("empty");
  });

  it("fetchPublishedLeaf maps JSON parse failure to error", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => {
        throw new Error("bad json");
      },
    });
    const result = await fetchPublishedLeaf("옆돌리기", "5_half_system", fetchFn);
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.message).toContain("JSON parse failed");
    }
  });

  it("fetchPublishedLeaf returns normalized authority without whole-leaf records", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => v2Leaf([sampleRecord()]),
    });
    const result = await fetchPublishedLeaf("옆돌리기", "5_half_system", fetchFn);
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.envelope.schemaVersion).toBe(
        NORMALIZED_DATASET_SCHEMA_VERSION
      );
      expect(result.familyMembers.length).toBeGreaterThan(0);
      expect(result.familyMasters.length).toBeGreaterThan(0);
      expect(result.masterByFamilyId.get(FM)?.familyId).toBe(FM);
      expect(result.sourceSchemaVersion).toBe(2);
      expect(result.familyMembers[0]!.familyId).toBe(FM);
      expect("records" in result).toBe(false);
    }
  });

  it("invalid v2 with non-migratable slots fails closed", () => {
    const result = parsePublishedLeafPayload(
      {
        schemaVersion: 2,
        shotType: "옆돌리기",
        systemId: "5_half_system",
        systemLabel: "파이브앤하프",
        records: [
          {
            positionId: "p1",
            balls: sampleBalls,
            strategies: {
              S1: {
                slot: "S1",
                signature: {
                  systemId: "5_half_system",
                  formulaHash: "h",
                  shotType: "옆돌리기",
                },
                sysInputs: {},
                meta: {
                  impact: { x: 0, y: 0 },
                  final: { x: 0, y: 0 },
                  angle_ci: 0,
                  angle_fs: 0,
                },
                // no familyId → skippedLegacySlots → fail closed
              },
            },
          },
        ],
      },
      "/dataset/x/y/positions.json"
    );
    expect(result.kind).toBe("error");
    if (result.kind === "error") {
      expect(result.message).toMatch(/conversion failed|legacy/i);
    }
  });

  it("invalid v3 fails closed with no flat fallback", () => {
    const result = parsePublishedLeafPayload(
      {
        schemaVersion: 3,
        shotType: "옆돌리기",
        systemId: "5_half_system",
        systemLabel: "파이브앤하프",
        familyMasters: "not-an-array",
        familyMembers: [],
      },
      "/dataset/x/y/positions.json"
    );
    expect(result.kind).toBe("error");
  });
});

describe("publishedDatasetStore Phase E-3", () => {
  afterEach(() => {
    __clearPublishedDatasetStoreForTests();
  });

  it("getOrLoadPublishedLeaf caches successful loads with envelope authority only", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => v2Leaf([sampleRecord()]),
    });

    const first = await getOrLoadPublishedLeaf("옆돌리기", "5_half_system", {
      fetchFn,
    });
    const second = await getOrLoadPublishedLeaf("옆돌리기", "5_half_system", {
      fetchFn,
    });
    expect(first.kind).toBe("ok");
    expect(first.fromCache).toBe(false);
    expect(second.fromCache).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(1);
    if (first.kind === "ok") {
      expect(first.envelope.familyMasters.length).toBeGreaterThan(0);
      expect(first.familyMembers.length).toBeGreaterThan(0);
      expect("records" in first).toBe(false);
    }
    const entry = getPublishedLeafCacheEntry("옆돌리기", "5_half_system");
    expect(entry?.status).toBe("ready");
    expect(entry?.envelope?.schemaVersion).toBe(
      NORMALIZED_DATASET_SCHEMA_VERSION
    );
    expect(entry?.masterByFamilyId?.get(FM)?.familyId).toBe(FM);
    expect(entry?.familyMembers?.length).toBeGreaterThan(0);
    expect(entry && "records" in entry).toBe(false);
  });

  it("refresh clears normalized authority", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => v2Leaf([sampleRecord()]),
    });
    await getOrLoadPublishedLeaf("옆돌리기", "5_half_system", { fetchFn });
    expect(getPublishedLeafCacheEntry("옆돌리기", "5_half_system")?.status).toBe(
      "ready"
    );
    refreshPublishedDataset("옆돌리기", "5_half_system");
    expect(getPublishedLeafCacheEntry("옆돌리기", "5_half_system")).toBeUndefined();
  });

  it("v2→normalized authority parity with convertFlat (no eager records)", () => {
    const leaf = v2Leaf([sampleRecord()]);
    const converted = convertFlatDatasetExportToNormalizedLeaf(leaf);
    expect(converted.ok).toBe(true);
    if (!converted.ok) return;
    const parsed = parsePublishedLeafPayload(leaf, "/x");
    expect(parsed.kind).toBe("ok");
    if (parsed.kind !== "ok") return;
    expect(parsed.envelope.familyMasters.map((m) => m.familyId)).toEqual(
      converted.envelope.familyMasters.map((m) => m.familyId)
    );
    expect(parsed.familyMembers[0]!.familyId).toBe(FM);
    expect(parsed.familyMembers[0]!.memberId).toBe(MB);
    expect(parsed.familyMembers[0]!.track).toBe("B2T_L");
    expect(parsed.sourceSchemaVersion).toBe(2);
    expect("records" in parsed).toBe(false);
  });
});
