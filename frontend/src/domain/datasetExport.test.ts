import { describe, expect, it, vi } from "vitest";
import {
  buildDatasetExport,
  filterRecordsForDatasetExport,
  normalizeDatasetExport,
} from "./datasetExport";
import type { WorkspaceSnapshot } from "./workspaceHistory";

const sampleBalls = {
  cue: { x: 10, y: 10 },
  target: { x: 50, y: 25 },
  second: { x: 40, y: 20 },
};

describe("datasetExport", () => {
  it("buildDatasetExport filters by systemId and shotType", () => {
    const snapshot: WorkspaceSnapshot = {
      id: "snap-1",
      name: "test",
      systemId: "5_half_system",
      pattern: "뒤돌리기",
      version: 1,
      timestamp: "2026-06-05T00:00:00.000Z",
      state: {
        adminState: {},
        ballsState: null,
        shotEditor: { activeSlot: "S1", slots: {} },
        dataset: [
          {
            positionId: "p1",
            balls: sampleBalls,
            strategies: {
              S1: {
                slot: "S1",
                signature: {
                  systemId: "5_half_system",
                  formulaHash: "abc",
                  shotType: "뒤돌리기",
                },
                sysInputs: { CO_f: 40 },
                meta: {
                  impact: { x: 1, y: 1 },
                  final: { x: 2, y: 2 },
                  angle_ci: 0,
                  angle_fs: 0,
                },
              },
            },
          },
          {
            positionId: "p2",
            balls: sampleBalls,
            strategies: {
              S1: {
                slot: "S1",
                signature: {
                  systemId: "plus2_system",
                  formulaHash: "xyz",
                  shotType: "뒤돌리기",
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
      },
    };

    const result = buildDatasetExport(snapshot, "2026-06-05T12:00:00.000Z");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.source).toBe("STATE_DATASET");
    expect(result.payload.schemaVersion).toBe(2);
    expect(result.payload.shotType).toBe("뒤돌리기");
    expect(result.payload.systemId).toBe("5_half_system");
    expect(result.payload.systemLabel).toBe("파이브앤하프");
    expect(result.payload.sourceSnapshotId).toBe("snap-1");
    expect(result.payload.records).toHaveLength(1);
    expect(result.payload.records[0].positionId).toBe("p1");
  });

  it("normalizeDatasetExport re-normalizes records", () => {
    const built = buildDatasetExport(
      {
        id: "x",
        name: "n",
        systemId: "5_half_system",
        pattern: "옆돌리기",
        version: 1,
        timestamp: "",
        state: {
          adminState: {},
          ballsState: null,
          shotEditor: { activeSlot: "S1", slots: {} },
          dataset: [],
        },
      },
      new Date().toISOString(),
      { loadWorking: () => [] }
    );
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const norm = normalizeDatasetExport(built.payload);
    expect(norm.schemaVersion).toBe(2);
    expect(Array.isArray(norm.records)).toBe(true);
  });

  it("filterRecordsForDatasetExport excludes mismatched shotType", () => {
    const rows = filterRecordsForDatasetExport(
      [
        {
          positionId: "a",
          balls: sampleBalls,
          strategies: {
            S1: {
              slot: "S1",
              signature: {
                systemId: "5_half_system",
                formulaHash: "h",
                shotType: "횡단샷",
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
      "5_half_system",
      "뒤돌리기"
    );
    expect(rows).toHaveLength(0);
  });

  it("malformed publishFamilyPayload fails closed without loadWorking", () => {
    const loadWorking = vi.fn(() => [
      {
        positionId: "should-not-use",
        balls: sampleBalls,
        strategies: {
          S1: {
            slot: "S1",
            signature: {
              systemId: "5_half_system",
              formulaHash: "h",
              shotType: "뒤돌리기",
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
    ]);
    const result = buildDatasetExport(
      {
        id: "bad",
        name: "n",
        systemId: "5_half_system",
        pattern: "뒤돌리기",
        version: 1,
        timestamp: "",
        publishOperation: {
          schemaVersion: 1,
          intent: "CREATE",
          sourceFamilyId: null,
          destinationFamilyId: "fm_dest",
        },
        publishFamilyPayload: {
          schemaVersion: 1,
          familyId: "fm_dest",
          records: [],
        },
        state: {
          adminState: {},
          ballsState: null,
          shotEditor: { activeSlot: "S1", slots: {} },
        },
      },
      "2026-09-17T00:00:00.000Z",
      { loadWorking }
    );
    expect(result.ok).toBe(false);
    expect(loadWorking).not.toHaveBeenCalled();
  });
});
