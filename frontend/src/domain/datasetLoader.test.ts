import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildPublishedLeafUrl,
  fetchPublishedLeaf,
  parsePublishedLeafPayload,
} from "./datasetLoader";
import { __clearPublishedDatasetStoreForTests } from "./publishedDatasetStore";
import { getOrLoadPublishedLeaf } from "./publishedDatasetStore";

const sampleBalls = {
  cue: { x: 10, y: 10 },
  target: { x: 50, y: 25 },
  second: { x: 40, y: 20 },
};

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

  it("fetchPublishedLeaf returns records on valid envelope", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        schemaVersion: 2,
        shotType: "옆돌리기",
        systemId: "5_half_system",
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
              },
            },
          },
        ],
      }),
    });
    const result = await fetchPublishedLeaf("옆돌리기", "5_half_system", fetchFn);
    expect(result.kind).toBe("ok");
    if (result.kind === "ok") {
      expect(result.records).toHaveLength(1);
    }
  });
});

describe("publishedDatasetStore", () => {
  afterEach(() => {
    __clearPublishedDatasetStoreForTests();
  });

  it("getOrLoadPublishedLeaf caches successful loads", async () => {
    const fetchFn = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        schemaVersion: 2,
        shotType: "옆돌리기",
        systemId: "5_half_system",
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
              },
            },
          },
        ],
      }),
    });

    const first = await getOrLoadPublishedLeaf("옆돌리기", "5_half_system", {
      fetchFn,
    });
    const second = await getOrLoadPublishedLeaf("옆돌리기", "5_half_system", {
      fetchFn,
    });
    expect(first.fromCache).toBe(false);
    expect(second.fromCache).toBe(true);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});
