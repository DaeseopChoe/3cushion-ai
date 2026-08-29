/**
 * endToEndDataPipeline.contract.test.ts
 *
 * Full Lifecycle End-to-End Headless Integration Contract Test:
 * 1. Save (Authored) -> positions_dataset
 * 2. Derived Approval -> Searchable PositionRecord
 * 3. Export (buildDatasetExport) -> Published Envelope
 * 4. Published Leaf HTTP Loading & Cache Lifecycle
 * 5. USER Search with 2-way Role Permutation (Yellow Target & Red Target)
 * 6. Winning Role Mapping Preservation (matchedBalls)
 * 7. Physical Ball Screen Invariance (no visual swap)
 * 8. Trajectory 1적구 Target Input Verification
 * 9. Schema Regression Guard (R24: PositionRecord, StrategyEntry, DatasetExportPayload, SchemaVersion)
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import type {
  Ball3,
  PositionRecord,
  StrategyEntry,
  TargetBall,
} from "../../domain/positionSearchEngine";
import { createPositionId } from "../../domain/positionId";
import { persistPositionsDatasetWithGeneration } from "../../domain/dataset/infra/persistPositionsDatasetWithGeneration";
import { WORKING_DATASET_KEY } from "../../domain/dataset/infra/datasetStorage";
import {
  buildDatasetExport,
  filterRecordsForDatasetExport,
  normalizeDatasetExport,
  type DatasetExportPayload,
} from "../../domain/datasetExport";
import {
  DATASET_EXPORT_SCHEMA_VERSION,
  systemIdToFolderLabel,
} from "../../domain/datasetPath";
import {
  getOrLoadPublishedLeaf,
  refreshPublishedDataset,
} from "../../domain/publishedDatasetStore";
import { parsePublishedLeafPayload } from "../../domain/datasetLoader";
import { runUserSearch, type UserSearchFlowContext } from "./userSearchFlow";
import { hydrateBallsStateForUi } from "../../admin/slotAutoRecommend";
import {
  resolveTrajectoryTargetBall,
  resolveTrajectorySecondBall,
} from "../../domain/trajectory/trajectoryBuilder";
import { normalizePositionRecord } from "../../domain/positionMergeEngine";

function createMemoryLocalStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
}

const authoredBalls: Ball3 = {
  cue: { x: 18.788, y: 7.952 },
  target: { x: 20.375, y: 30.625 }, // Physical Red
  second: { x: 34.461, y: 1.602 },  // Physical Yellow
};

const derivedProductBalls: Ball3 = {
  cue: { x: 19.5, y: 12.0 },
  target: { x: 20.375, y: 30.625 },
  second: { x: 50.0, y: 15.0 },
};

function makeStrategy(overrides: Partial<StrategyEntry> = {}): StrategyEntry {
  return {
    slot: "S1",
    signature: {
      systemId: "5_half_system",
      formulaHash: "test_hash_v1",
      shotType: "옆돌리기",
    },
    sysInputs: { CO_f: 38.5, C1_f: 12.0, C3_r: 25.0 },
    corrections: { slide: 0, curve_ratio: 0, draw: 0, departure: 0, spin: 0 },
    correctionsStored: true,
    hpT: { T: "8/8" },
    str: "MEDIUM",
    ai: "AI",
    track: "B2T_L",
    meta: {
      impact: { x: 20.0, y: 28.0 },
      final: { x: 50.0, y: 5.0 },
      angle_ci: 1.2,
      angle_fs: -0.8,
    },
    authoringStrategyId: "as_001",
    familyId: "fam_pipeline_01",
    memberId: "mb_authored_01",
    memberOrigin: "AUTHORED",
    ...overrides,
  };
}

function makeRecord(
  balls: Ball3,
  targetBall: TargetBall,
  strategyOverrides: Partial<StrategyEntry> = {}
): PositionRecord {
  const positionId = createPositionId(balls);
  return {
    positionId,
    balls,
    targetBall,
    strategies: {
      S1: makeStrategy(strategyOverrides),
    },
    schemaVersion: 1,
  };
}

describe("Full Lifecycle End-to-End Headless Integration Contract", () => {
  let mockStorage: ReturnType<typeof createMemoryLocalStorage>;

  beforeEach(() => {
    mockStorage = createMemoryLocalStorage();
    vi.stubGlobal("localStorage", mockStorage);
    refreshPublishedDataset();
  });

  it("T1: Save Phase — saves authored record into positions_dataset and preserves exact Ball3 roles", () => {
    const authoredRecord = makeRecord(authoredBalls, "red", {
      memberOrigin: "AUTHORED",
      memberId: "mb_01",
    });

    const persistRes = persistPositionsDatasetWithGeneration([authoredRecord]);
    expect(persistRes.ok).toBe(true);

    const storedRaw = mockStorage.getItem(WORKING_DATASET_KEY);
    expect(storedRaw).not.toBeNull();
    const stored = JSON.parse(storedRaw!) as PositionRecord[];
    expect(stored.length).toBe(1);
    expect(stored[0].positionId).toBe(authoredRecord.positionId);
    expect(stored[0].balls.cue).toEqual(authoredBalls.cue);
    expect(stored[0].balls.target).toEqual(authoredBalls.target);
    expect(stored[0].balls.second).toEqual(authoredBalls.second);
    expect(stored[0].targetBall).toBe("red");
  });

  it("T2: Derived Approval Phase — approves derived product members and stores all records in searchable corpus", () => {
    const authoredRecord = makeRecord(authoredBalls, "red", {
      memberOrigin: "AUTHORED",
      memberId: "mb_01",
    });

    const derivedRecord = makeRecord(derivedProductBalls, "red", {
      memberOrigin: "DERIVED_CUE_C3_PRODUCT",
      derivedRule: "CUE_C3_CARTESIAN_PRODUCT_V1",
      derivedStep: "c_01__c3_01",
      memberId: "mb_derived_01",
    });

    const fullCorpus = [authoredRecord, derivedRecord];
    const persistRes = persistPositionsDatasetWithGeneration(fullCorpus);
    expect(persistRes.ok).toBe(true);

    const stored = JSON.parse(mockStorage.getItem(WORKING_DATASET_KEY)!) as PositionRecord[];
    expect(stored.length).toBe(2);
    expect(stored.some((r) => r.strategies.S1?.memberOrigin === "AUTHORED")).toBe(true);
    expect(stored.some((r) => r.strategies.S1?.memberOrigin === "DERIVED_CUE_C3_PRODUCT")).toBe(true);
  });

  it("T3 & T4: Export Phase & Published Leaf Envelope Shape — exports snapshot into published leaf payload", () => {
    const authoredRecord = makeRecord(authoredBalls, "red", {
      memberOrigin: "AUTHORED",
      memberId: "mb_01",
    });

    const derivedRecord = makeRecord(derivedProductBalls, "red", {
      memberOrigin: "DERIVED_CUE_C3_PRODUCT",
      derivedRule: "CUE_C3_CARTESIAN_PRODUCT_V1",
      memberId: "mb_derived_01",
    });

    const snapshot = {
      id: "snap_e2e_01",
      name: "옆돌리기_5_half_system_v001",
      systemId: "5_half_system",
      pattern: "옆돌리기",
      version: 1,
      timestamp: "2026-08-29T00:00:00.000Z",
      state: {
        adminState: {},
        ballsState: null,
        shotEditor: { activeSlot: "S1", slots: {} },
        dataset: [authoredRecord, derivedRecord],
      },
    };

    const exportPayload = buildDatasetExport(snapshot as any);
    expect(exportPayload.schemaVersion).toBe(DATASET_EXPORT_SCHEMA_VERSION);
    expect(exportPayload.schemaVersion).toBe(2);
    expect(exportPayload.shotType).toBe("옆돌리기");
    expect(exportPayload.systemId).toBe("5_half_system");
    expect(exportPayload.systemLabel).toBe(systemIdToFolderLabel("5_half_system"));
    expect(exportPayload.records.length).toBe(2);

    // Published Leaf Parser contract validation
    const parsed = parsePublishedLeafPayload(exportPayload, "/dataset/옆돌리기/파이브앤하프/positions.json");
    expect(parsed.kind).toBe("ok");
    if (parsed.kind === "ok") {
      expect(parsed.records.length).toBe(2);
      expect(parsed.records[0].balls).toEqual(authoredRecord.balls);
      expect(parsed.records[1].balls).toEqual(derivedRecord.balls);
    }
  });

  it("T5 & T6 & T7: USER Search Phase — Case A: Yellow Target match & Case B: Red Target 2-way Role Permutation", async () => {
    // Distinct Red Target record and Yellow Target record
    const redTargetBalls: Ball3 = {
      cue: { x: 25.0, y: 15.0 },
      target: { x: 45.0, y: 35.0 }, // Physical Red is Target
      second: { x: 65.0, y: 10.0 }, // Physical Yellow is Second
    };
    const redTargetRec = makeRecord(redTargetBalls, "red", {
      memberOrigin: "AUTHORED",
      memberId: "mb_red",
    });

    const yellowTargetBalls: Ball3 = {
      cue: { x: 18.788, y: 7.952 },
      target: { x: 34.461, y: 1.602 },  // Target is Yellow physical ball
      second: { x: 20.375, y: 30.625 }, // Second is Red physical ball
    };
    const yellowTargetRec = makeRecord(yellowTargetBalls, "yellow", {
      memberOrigin: "AUTHORED",
      memberId: "mb_yellow",
    });

    const publishedLeafRecords = [redTargetRec, yellowTargetRec];

    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes(encodeURIComponent("옆돌리기"))) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            schemaVersion: 2,
            shotType: "옆돌리기",
            systemId: "5_half_system",
            records: publishedLeafRecords,
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    // CASE A: User places Yellow ball at (34.461, 1.602), Red ball at (20.375, 30.625)
    // Default UI maps: target=Yellow, second=Red
    const userYellowCtx: UserSearchFlowContext = {
      ballsState: {
        cue: { x: 18.788, y: 7.952 },
        target: { x: 34.461, y: 1.602 },
        second: { x: 20.375, y: 30.625 },
      },
      adminState: { sys: { systemId: "5_half_system" } },
      activeSlot: "S1",
      slots: { S1: { draft: null, applied: null } },
      targetColor: null,
      userPublishedSearchContext: null,
      setUserLastSearchRecord: vi.fn(),
      setUserPublishedSearchContext: vi.fn(),
      applyUserSearchRecall: vi.fn(),
      clearSearchSlotDrafts: vi.fn(),
      clearUserSearchDisplayRuntime: vi.fn(),
      resetUserSearchTargetSelection: vi.fn(),
      showToast: vi.fn(),
    };

    const matchYellow = await runUserSearch(userYellowCtx);
    expect(matchYellow).not.toBeNull();
    expect(matchYellow?.record.positionId).toBe(yellowTargetRec.positionId);
    expect(matchYellow?.matchedBalls.target).toEqual(yellowTargetBalls.target);
    expect(matchYellow?.matchedBalls.second).toEqual(yellowTargetBalls.second);

    // CASE B: User places Red ball at (45, 35), Yellow ball at (65, 10), White at (25, 15)
    // Default UI maps: target=Yellow(65, 10), second=Red(45, 35)
    // 2-way Role Permutation must recognize Red as Target (45, 35) and Yellow as Second (65, 10)!
    const userRedCtx: UserSearchFlowContext = {
      ballsState: {
        cue: { x: 25.0, y: 15.0 },
        target: { x: 65.0, y: 10.0 }, // UI initial Yellow
        second: { x: 45.0, y: 35.0 }, // UI initial Red
      },
      adminState: { sys: { systemId: "5_half_system" } },
      activeSlot: "S1",
      slots: { S1: { draft: null, applied: null } },
      targetColor: null,
      userPublishedSearchContext: null,
      setUserLastSearchRecord: vi.fn(),
      setUserPublishedSearchContext: vi.fn(),
      applyUserSearchRecall: vi.fn(),
      clearSearchSlotDrafts: vi.fn(),
      clearUserSearchDisplayRuntime: vi.fn(),
      resetUserSearchTargetSelection: vi.fn(),
      showToast: vi.fn(),
    };

    const matchRed = await runUserSearch(userRedCtx);
    expect(matchRed).not.toBeNull();
    expect(matchRed?.record.positionId).toBe(redTargetRec.positionId);
    // Winning query permutation mapped target to Red physical ball (45, 35)
    expect(matchRed?.matchedBalls.target).toEqual({ x: 45.0, y: 35.0 });
    expect(matchRed?.matchedBalls.second).toEqual({ x: 65.0, y: 10.0 });

    vi.unstubAllGlobals();
  });

  it("T8 & T9: Screen Invariance & Trajectory Target Verification — preserves visual positions and routes true 1적구 to Trajectory engine", () => {
    // Red Target winning permutation scenario:
    // User placed White at (18.788, 7.952), Red at (20.375, 30.625), Yellow at (34.461, 1.602)
    const winningMatchedBalls: Ball3 = {
      cue: { x: 18.788, y: 7.952 },
      target: { x: 20.375, y: 30.625 }, // Red ball
      second: { x: 34.461, y: 1.602 },  // Yellow ball
    };

    // UI State Hydration
    const synchronizedBallsState = hydrateBallsStateForUi(winningMatchedBalls);
    expect(synchronizedBallsState.cue).toEqual({ x: 18.788, y: 7.952 });
    expect(synchronizedBallsState.target).toEqual({ x: 20.375, y: 30.625 });
    expect(synchronizedBallsState.second).toEqual({ x: 34.461, y: 1.602 });

    // Trajectory Engine Target resolution
    const trajTarget = resolveTrajectoryTargetBall(synchronizedBallsState as any);
    const trajSecond = resolveTrajectorySecondBall(synchronizedBallsState as any);
    expect(trajTarget).toEqual({ x: 20.375, y: 30.625 });
    expect(trajSecond).toEqual({ x: 34.461, y: 1.602 });
  });

  it("T10: R24 Schema Regression Guard — verifies PositionRecord shape, required fields, and normalization resilience", () => {
    const raw = {
      positionId: "188080204306345016",
      balls: authoredBalls,
      targetBall: "red",
      strategies: {
        S1: makeStrategy(),
      },
      schemaVersion: 1,
    };

    const normalized = normalizePositionRecord(raw);
    expect(normalized).not.toBeNull();
    expect(normalized?.positionId).toBe("188080204306345016");
    expect(normalized?.schemaVersion).toBe(1);
    expect(normalized?.balls.cue).toBeDefined();
    expect(normalized?.balls.target).toBeDefined();
    expect(normalized?.balls.second).toBeDefined();
    expect(normalized?.strategies.S1).toBeDefined();
    expect(normalized?.strategies.S1?.signature.shotType).toBe("옆돌리기");
    expect(normalized?.strategies.S1?.meta.impact).toBeDefined();
    expect(normalized?.strategies.S1?.meta.final).toBeDefined();

    // Incomplete balls shape must fail-closed (returns null)
    const corruptBalls = normalizePositionRecord({
      positionId: "corrupt_01",
      balls: { cue: { x: 10, y: 10 } }, // missing target & second
    });
    expect(corruptBalls).toBeNull();
  });

  it("T11: R24 Schema Regression Guard — Published Dataset payload envelope structure & fail-closed on invalid schema", () => {
    const validEnvelope: DatasetExportPayload = {
      schemaVersion: 2,
      shotType: "뒤돌리기",
      systemId: "5_half_system",
      systemLabel: "파이브앤하프",
      exportedAt: new Date().toISOString(),
      records: [makeRecord(authoredBalls, "yellow")],
    };

    const norm = normalizeDatasetExport(validEnvelope);
    expect(norm.schemaVersion).toBe(2);
    expect(norm.records.length).toBe(1);

    // Invalid manifest / non-object envelope fail-closed
    const invalidEnvelope = parsePublishedLeafPayload("corrupt_string_not_json", "/dataset/bad/url");
    expect(invalidEnvelope.kind).toBe("error");

    // Empty records envelope
    const emptyEnvelope = parsePublishedLeafPayload({ schemaVersion: 2, records: [] }, "/dataset/empty");
    expect(emptyEnvelope.kind).toBe("empty");
  });
});
