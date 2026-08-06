/**
 * productExportRequest — unit tests (Mission 01 Authoring Adapter input).
 */
import { describe, expect, it } from "vitest";
import {
  buildProductExportRequestFromSnapshot,
  mergeProductExportRequests,
} from "./productExportRequest";

describe("productExportRequest", () => {
  it("builds strategies from snapshot dataset", () => {
    const snapshot = {
      id: "snap-1",
      name: "t",
      systemId: "5_half_system",
      pattern: "뒤돌리기",
      version: 1,
      timestamp: "2026-08-06T00:00:00.000Z",
      state: {
        adminState: {},
        ballsState: null,
        shotEditor: { activeSlot: "S1", slots: {} },
        dataset: [
          {
            positionId: "pos-1",
            balls: {
              cue: { x: 20, y: 10 },
              target: { x: 40, y: 20 },
              second: { x: 60, y: 15 },
            },
            strategies: {
              S1: {
                slot: "S1",
                signature: {
                  systemId: "5_half_system",
                  formulaHash: "x",
                  shotType: "뒤돌리기",
                },
                sysInputs: {},
                meta: {
                  impact: { x: 30, y: 15 },
                  final: { x: 50, y: 0 },
                  angle_ci: 0,
                  angle_fs: 0,
                },
              },
            },
          },
        ],
      },
    };

    const req = buildProductExportRequestFromSnapshot(snapshot, "2026-08-06T00:00:00.000Z");
    expect(req.sourceSnapshotIds).toEqual(["snap-1"]);
    expect(req.strategies).toHaveLength(1);
    expect(req.strategies[0].strategyRef).toBe("pos-1.S1");
    expect(req.strategies[0].cue).toEqual({ x: 20, y: 10 });
  });

  it("merges snapshot requests", () => {
    const a = {
      sourceSnapshotIds: ["a"],
      exportedAt: "t1",
      generatorBuildIdentity: "product-export-pipeline-v1",
      strategies: [
        {
          strategyRef: "p1.S1",
          positionId: "p1",
          slot: "S1",
          cue: { x: 1, y: 1 },
          target: { x: 2, y: 2 },
          second: { x: 3, y: 3 },
        },
      ],
    };
    const b = {
      sourceSnapshotIds: ["b"],
      exportedAt: "t2",
      generatorBuildIdentity: "product-export-pipeline-v1",
      strategies: [
        {
          strategyRef: "p2.S1",
          positionId: "p2",
          slot: "S1",
          cue: { x: 4, y: 4 },
          target: { x: 5, y: 5 },
          second: { x: 6, y: 6 },
        },
      ],
    };
    const merged = mergeProductExportRequests([a, b]);
    expect(merged.sourceSnapshotIds).toEqual(["a", "b"]);
    expect(merged.strategies).toHaveLength(2);
  });
});
