/**
 * userSearchRolePermutation.contract.test.ts
 *
 * Contract tests for USER Search:
 * 1. Root Cause A: Published Dataset Deployment & Artifact URL parity
 * 2. Root Cause B: USER Target/Second Role Permutation & Winning Role Mapping Preservation
 *    - Tracked Record (188080204306345016)
 *    - T1: Yellow Target (Physical: White=W, Yellow=T, Red=S -> logical target=Yellow, second=Red)
 *    - T2: Red Target (Physical: White=W, Red=T, Yellow=S -> logical target=Red, second=Yellow)
 *    - T3: Cue ball role is invariant (never permuted with object balls)
 *    - T4: Winning Mapping Return (runUserSearch returns matchedBalls equal to winning queryBalls)
 *    - T5: Best Record / matchedBalls Pair Identity
 *    - T6: Red Target Trajectory (resolveTrajectoryTargetBall receives Red physical coordinate)
 *    - T7: Yellow Target Trajectory (resolveTrajectoryTargetBall receives Yellow physical coordinate)
 *    - T8: Search 실패 (no-match returns null and leaves ballsState unchanged)
 *    - T9: Published Search Regression (HTTP loading)
 *    - T10: userStrict recall profile invariants preserved (coarse=3.0, total=8.0, manhattan)
 *    - T11: ADMIN Regression
 */

import { describe, expect, it, vi } from "vitest";
import { runUserSearch, type UserSearchFlowContext } from "./userSearchFlow";
import { getOrLoadPublishedLeaf, refreshPublishedDataset } from "../../domain/publishedDatasetStore";
import type { PositionRecord } from "../../domain/positionSearchEngine";
import { resolveTrajectoryTargetBall, resolveTrajectorySecondBall } from "../../domain/trajectory/trajectoryBuilder";
import { hydrateBallsStateForUi } from "../../admin/slotAutoRecommend";
import { runSpatialRecall } from "../../domain/recall/recallEngine";
import fs from "node:fs";
import path from "node:path";

const trackedRecord: PositionRecord = {
  positionId: "188080204306345016",
  familyId: "fm_a726ed32-4572-43e4-aac5-aed61e990c2b",
  memberId: "mb_a497d3cc-6d3e-4b64-8e24-17679d1abbfc",
  memberOrigin: "DERIVED_CUE_C3_PRODUCT",
  balls: {
    cue: { x: 18.788, y: 7.952 },
    target: { x: 20.375, y: 30.625 }, // Stored Target role (Red physical in real table or Yellow)
    second: { x: 34.461, y: 1.602 },  // Stored Second role
  },
  targetBall: "red",
  schemaVersion: 1,
  strategies: {
    S1: {
      slot: "S1",
      signature: {
        systemId: "5_half_system",
        formulaHash: "test_formula",
        shotType: "옆돌리기",
      },
      sysInputs: {},
      hpT: { T: "8/8" },
      str: "MEDIUM",
      ai: "AI",
      track: "B2T_L",
    },
  },
};

const yellowTargetRecord: PositionRecord = {
  positionId: "pos_yellow_target_001",
  familyId: "fam_yellow",
  memberId: "mb_yellow",
  memberOrigin: "AUTHORED",
  balls: {
    cue: { x: 18.788, y: 7.952 },
    target: { x: 34.461, y: 1.602 },  // Stored Target role is Yellow physical ball
    second: { x: 20.375, y: 30.625 }, // Stored Second role is Red physical ball
  },
  targetBall: "yellow",
  schemaVersion: 1,
  strategies: {
    S1: {
      slot: "S1",
      signature: {
        systemId: "5_half_system",
        formulaHash: "test_formula",
        shotType: "옆돌리기",
      },
      sysInputs: {},
      hpT: { T: "8/8" },
      str: "MEDIUM",
      ai: "AI",
      track: "B2T_L",
    },
  },
};

const redTargetRecord: PositionRecord = {
  positionId: "pos_red_target_001",
  familyId: "fam_red",
  memberId: "mb_red",
  memberOrigin: "AUTHORED",
  balls: {
    cue: { x: 25.0, y: 15.0 },
    target: { x: 45.0, y: 35.0 }, // Physical Red ball is Target
    second: { x: 65.0, y: 10.0 }, // Physical Yellow ball is Second
  },
  targetBall: "red",
  schemaVersion: 1,
  strategies: {
    S1: {
      slot: "S1",
      signature: {
        systemId: "5_half_system",
        formulaHash: "test_formula",
        shotType: "옆돌리기",
      },
      sysInputs: {},
      hpT: { T: "8/8" },
      str: "MEDIUM",
      ai: "AI",
      track: "B2T_L",
    },
  },
};

function createMockSearchContext(overrides: Partial<UserSearchFlowContext> = {}): {
  ctx: UserSearchFlowContext;
  appliedRecords: PositionRecord[];
  toasts: string[];
} {
  const appliedRecords: PositionRecord[] = [];
  const toasts: string[] = [];
  let userLastSearchRecord: PositionRecord | null = null;
  let userPublishedContext: { shotType: string; systemId: string } | null = null;

  const ctx: UserSearchFlowContext = {
    ballsState: {
      cue: { x: 18.788, y: 7.952 },
      target: { x: 20.375, y: 30.625 },
      second: { x: 34.461, y: 1.602 },
    },
    adminState: { sys: { systemId: "5_half_system" } },
    activeSlot: "S1",
    slots: { S1: { draft: null, applied: null } },
    targetColor: null, // USER mode: Target = NONE
    userPublishedSearchContext: null,
    setUserLastSearchRecord: (r) => { userLastSearchRecord = r; },
    setUserPublishedSearchContext: (c) => { userPublishedContext = c; },
    applyUserSearchRecall: (r) => { appliedRecords.push(r); },
    clearSearchSlotDrafts: vi.fn(),
    clearUserSearchDisplayRuntime: vi.fn(),
    resetUserSearchTargetSelection: vi.fn(),
    showToast: (msg) => { toasts.push(msg); },
    ...overrides,
  };

  return { ctx, appliedRecords, toasts };
}

describe("USER Search Deployment & Role Permutation Contract Tests", () => {
  it("Static build artifact contains published positions.json", () => {
    refreshPublishedDataset();
    const leafRelPath = path.join("dataset", "옆돌리기", "파이브앤하프", "positions.json");
    const sourceFilePath = path.resolve(__dirname, "../../../../", leafRelPath);
    
    expect(fs.existsSync(sourceFilePath)).toBe(true);
    const content = JSON.parse(fs.readFileSync(sourceFilePath, "utf8"));
    expect(content.schemaVersion).toBe(2);
    expect(content.shotType).toBe("옆돌리기");
    expect(content.systemId).toBe("5_half_system");
    expect(Array.isArray(content.records)).toBe(true);
    expect(content.records.length).toBeGreaterThan(0);

    // Tracked record existence check in published leaf
    const found = content.records.find((r: any) => r.positionId === "188080204306345016");
    expect(found).toBeDefined();
    expect(found.positionId).toBe("188080204306345016");
    expect(found.balls.cue.x).toBeCloseTo(18.788, 2);
    expect(found.balls.target.x).toBeCloseTo(20.375, 2);
    expect(found.balls.second.x).toBeCloseTo(34.461, 2);
  });

  it("T1: Yellow Target — UI places Yellow at target(34.461, 1.602), Red at second(20.375, 30.625) -> logical target=Yellow, second=Red", async () => {
    refreshPublishedDataset();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes(encodeURIComponent("옆돌리기"))) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            schemaVersion: 2,
            shotType: "옆돌리기",
            systemId: "5_half_system",
            records: [yellowTargetRecord],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    // Physical balls: White=(18.788, 7.952), Yellow=(34.461, 1.602), Red=(20.375, 30.625)
    // Default UI has Yellow in ballsState.target, Red in ballsState.second
    const { ctx, appliedRecords } = createMockSearchContext({
      ballsState: {
        cue: { x: 18.788, y: 7.952 },
        target: { x: 34.461, y: 1.602 },  // Yellow
        second: { x: 20.375, y: 30.625 }, // Red
      },
    });

    const match = await runUserSearch(ctx);
    expect(match).not.toBeNull();
    expect(match?.record.positionId).toBe("pos_yellow_target_001");
    expect(match?.matchedBalls.target.x).toBeCloseTo(34.461, 2);
    expect(match?.matchedBalls.second.x).toBeCloseTo(20.375, 2);

    // UI synchronization keeps physical balls unchanged
    const nextBallsState = hydrateBallsStateForUi(match?.matchedBalls);
    expect(nextBallsState.target?.x).toBeCloseTo(34.461, 2); // Yellow ball stays at Yellow coord
    expect(nextBallsState.second?.x).toBeCloseTo(20.375, 2); // Red ball stays at Red coord

    vi.unstubAllGlobals();
  });

  it("T2: Red Target — UI places Yellow at target(65, 10), Red at second(45, 35) -> logical target=Red, second=Yellow", async () => {
    refreshPublishedDataset();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes(encodeURIComponent("옆돌리기"))) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            schemaVersion: 2,
            shotType: "옆돌리기",
            systemId: "5_half_system",
            records: [redTargetRecord],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    // Physical balls: White=(25, 15), Yellow=(65, 10), Red=(45, 35)
    // In UI initial state: target=Yellow(65,10), second=Red(45,35)
    const { ctx, appliedRecords } = createMockSearchContext({
      ballsState: {
        cue: { x: 25.0, y: 15.0 },
        target: { x: 65.0, y: 10.0 }, // Yellow
        second: { x: 45.0, y: 35.0 }, // Red
      },
    });

    const match = await runUserSearch(ctx);
    expect(match).not.toBeNull();
    expect(match?.record.positionId).toBe("pos_red_target_001");
    // Winner permutation mapped target to Red physical ball (45, 35) and second to Yellow physical ball (65, 10)
    expect(match?.matchedBalls.target.x).toBe(45.0);
    expect(match?.matchedBalls.target.y).toBe(35.0);
    expect(match?.matchedBalls.second.x).toBe(65.0);
    expect(match?.matchedBalls.second.y).toBe(10.0);

    // UI synchronization: ballsState.target is now (45, 35).
    // When targetColor becomes "red", target role renders as RED at (45, 35) (Red ball position).
    // second role renders as YELLOW at (65, 10) (Yellow ball position).
    // Physical ball positions on screen do NOT swap!
    const nextBallsState = hydrateBallsStateForUi(match?.matchedBalls);
    expect(nextBallsState.target?.x).toBe(45.0);
    expect(nextBallsState.second?.x).toBe(65.0);

    vi.unstubAllGlobals();
  });

  it("T3: Cue ball role is invariant (never permuted with object balls)", async () => {
    refreshPublishedDataset();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes(encodeURIComponent("옆돌리기"))) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            schemaVersion: 2,
            shotType: "옆돌리기",
            systemId: "5_half_system",
            records: [trackedRecord],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    // If cue is placed at wrong position (e.g. swapped with target), search must reject
    const { ctx, appliedRecords, toasts } = createMockSearchContext({
      ballsState: {
        cue: { x: 20.375, y: 30.625 }, // Swapped with target
        target: { x: 18.788, y: 7.952 }, // Swapped with cue
        second: { x: 34.461, y: 1.602 },
      },
    });

    const match = await runUserSearch(ctx);
    expect(match).toBeNull();
    expect(appliedRecords.length).toBe(0);
    expect(toasts).toContain("일치하는 포지션이 없습니다.");

    vi.unstubAllGlobals();
  });

  it("T4: Winning Mapping Return — matchedBalls is exactly equal to the winning queryBalls", async () => {
    refreshPublishedDataset();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes(encodeURIComponent("옆돌리기"))) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            schemaVersion: 2,
            shotType: "옆돌리기",
            systemId: "5_half_system",
            records: [redTargetRecord],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { ctx } = createMockSearchContext({
      ballsState: {
        cue: { x: 25.0, y: 15.0 },
        target: { x: 65.0, y: 10.0 }, // UI Yellow
        second: { x: 45.0, y: 35.0 }, // UI Red
      },
    });

    const result = await runUserSearch(ctx);
    expect(result).not.toBeNull();
    expect(result?.matchedBalls).toEqual({
      cue: { x: 25.0, y: 15.0 },
      target: { x: 45.0, y: 35.0 }, // Red is winning target
      second: { x: 65.0, y: 10.0 }, // Yellow is winning second
    });

    vi.unstubAllGlobals();
  });

  it("T5: Best Record / matchedBalls Pair Identity — record and matchedBalls are from the exact same match", async () => {
    refreshPublishedDataset();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes(encodeURIComponent("옆돌리기"))) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            schemaVersion: 2,
            shotType: "옆돌리기",
            systemId: "5_half_system",
            records: [trackedRecord, redTargetRecord],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { ctx } = createMockSearchContext({
      ballsState: {
        cue: { x: 25.0, y: 15.0 },
        target: { x: 65.0, y: 10.0 },
        second: { x: 45.0, y: 35.0 },
      },
    });

    const result = await runUserSearch(ctx);
    expect(result).not.toBeNull();
    expect(result?.record.positionId).toBe("pos_red_target_001");
    // Pair identity: matchedBalls matches pos_red_target_001, not trackedRecord
    expect(result?.matchedBalls.target).toEqual(redTargetRecord.balls.target);
    expect(result?.matchedBalls.second).toEqual(redTargetRecord.balls.second);

    vi.unstubAllGlobals();
  });

  it("T6: Red Target Trajectory — resolveTrajectoryTargetBall receives Red physical coordinate", async () => {
    refreshPublishedDataset();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes(encodeURIComponent("옆돌리기"))) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            schemaVersion: 2,
            shotType: "옆돌리기",
            systemId: "5_half_system",
            records: [redTargetRecord],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { ctx } = createMockSearchContext({
      ballsState: {
        cue: { x: 25.0, y: 15.0 },
        target: { x: 65.0, y: 10.0 },
        second: { x: 45.0, y: 35.0 },
      },
    });

    const result = await runUserSearch(ctx);
    expect(result).not.toBeNull();

    const synchronizedBallsState = hydrateBallsStateForUi(result!.matchedBalls);
    const trajTarget = resolveTrajectoryTargetBall(synchronizedBallsState as any);
    const trajSecond = resolveTrajectorySecondBall(synchronizedBallsState as any);

    // Trajectory engine receives the actual Red physical ball as Target
    expect(trajTarget).toEqual({ x: 45.0, y: 35.0 });
    // Trajectory engine receives the actual Yellow physical ball as Second
    expect(trajSecond).toEqual({ x: 65.0, y: 10.0 });

    vi.unstubAllGlobals();
  });

  it("T7: Yellow Target Trajectory — resolveTrajectoryTargetBall receives Yellow physical coordinate", async () => {
    refreshPublishedDataset();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes(encodeURIComponent("옆돌리기"))) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            schemaVersion: 2,
            shotType: "옆돌리기",
            systemId: "5_half_system",
            records: [yellowTargetRecord],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { ctx } = createMockSearchContext({
      ballsState: {
        cue: { x: 18.788, y: 7.952 },
        target: { x: 34.461, y: 1.602 },
        second: { x: 20.375, y: 30.625 },
      },
    });

    const result = await runUserSearch(ctx);
    expect(result).not.toBeNull();

    const synchronizedBallsState = hydrateBallsStateForUi(result!.matchedBalls);
    const trajTarget = resolveTrajectoryTargetBall(synchronizedBallsState as any);
    const trajSecond = resolveTrajectorySecondBall(synchronizedBallsState as any);

    expect(trajTarget).toEqual({ x: 34.461, y: 1.602 });
    expect(trajSecond).toEqual({ x: 20.375, y: 30.625 });

    vi.unstubAllGlobals();
  });

  it("T8: Search 실패 — no-match returns null and appliedRecords is empty", async () => {
    refreshPublishedDataset();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes(encodeURIComponent("옆돌리기"))) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            schemaVersion: 2,
            shotType: "옆돌리기",
            systemId: "5_half_system",
            records: [trackedRecord],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const initialBalls = {
      cue: { x: 10.0, y: 10.0 },
      target: { x: 90.0, y: 90.0 },
      second: { x: 80.0, y: 80.0 },
    };
    const { ctx, appliedRecords } = createMockSearchContext({
      ballsState: initialBalls,
    });

    const result = await runUserSearch(ctx);
    expect(result).toBeNull();
    expect(appliedRecords.length).toBe(0);

    vi.unstubAllGlobals();
  });

  it("T9: Published Search Regression — HTTP loading and cache invalidation", async () => {
    refreshPublishedDataset();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        schemaVersion: 2,
        shotType: "옆돌리기",
        systemId: "5_half_system",
        records: [trackedRecord],
      }),
    });

    const res1 = await getOrLoadPublishedLeaf("옆돌리기", "5_half_system", { fetchFn: fetchMock as any });
    expect(res1.kind).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    // Cache hit
    const res2 = await getOrLoadPublishedLeaf("옆돌리기", "5_half_system", { fetchFn: fetchMock as any });
    expect(res2.kind).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    refreshPublishedDataset();
    const res3 = await getOrLoadPublishedLeaf("옆돌리기", "5_half_system", { fetchFn: fetchMock as any });
    expect(res3.kind).toBe("ok");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("T10: userStrict recall profile invariants are preserved", async () => {
    refreshPublishedDataset();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes(encodeURIComponent("옆돌리기"))) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            schemaVersion: 2,
            shotType: "옆돌리기",
            systemId: "5_half_system",
            records: [trackedRecord],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    // Within 2.0 Rg (coarsePerBall <= 3, total <= 8) -> PASS
    const { ctx: ctxPass } = createMockSearchContext({
      ballsState: {
        cue: { x: 18.788 + 1.0, y: 7.952 + 0.5 },
        target: { x: 20.375 + 0.5, y: 30.625 + 0.5 },
        second: { x: 34.461 + 0.5, y: 1.602 + 0.5 },
      },
    });
    const matchPass = await runUserSearch(ctxPass);
    expect(matchPass?.record.positionId).toBe("188080204306345016");

    // Beyond coarsePerBall (> 3.0 Rg on cue) -> FAIL
    const { ctx: ctxFail } = createMockSearchContext({
      ballsState: {
        cue: { x: 18.788 + 4.0, y: 7.952 },
        target: { x: 20.375, y: 30.625 },
        second: { x: 34.461, y: 1.602 },
      },
    });
    const matchFail = await runUserSearch(ctxFail);
    expect(matchFail).toBeNull();

    vi.unstubAllGlobals();
  });

  it("T11: ADMIN Regression — runSpatialRecall under adminSearch profile is untouched", () => {
    const adminResult = runSpatialRecall({
      dataset: [trackedRecord],
      query: { balls: trackedRecord.balls, targetBall: null },
      profile: "adminSearch",
    });
    expect(adminResult.kind).toBe("match");
    if (adminResult.kind === "match") {
      expect(adminResult.record.positionId).toBe("188080204306345016");
      expect(adminResult.distance).toBe(0);
    }
  });

  it("Tracked Record (188080204306345016) E2E verification: Red=Target in DB is matched when USER UI places Yellow at target and Red at second", async () => {
    refreshPublishedDataset();
    const fetchMock = vi.fn().mockImplementation((url: string) => {
      if (url.includes(encodeURIComponent("옆돌리기"))) {
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({
            schemaVersion: 2,
            shotType: "옆돌리기",
            systemId: "5_half_system",
            records: [trackedRecord],
          }),
        });
      }
      return Promise.resolve({ ok: false, status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    // USER UI places:
    // White at (18.788, 7.952)
    // Red ball at (20.375, 30.625) -> stored in ballsState.second in UI
    // Yellow ball at (34.461, 1.602) -> stored in ballsState.target in UI
    const { ctx, appliedRecords } = createMockSearchContext({
      ballsState: {
        cue: { x: 18.788, y: 7.952 },
        target: { x: 34.461, y: 1.602 },  // Yellow
        second: { x: 20.375, y: 30.625 }, // Red
      },
    });

    const match = await runUserSearch(ctx);
    expect(match).not.toBeNull();
    expect(match?.record.positionId).toBe("188080204306345016");
    expect(appliedRecords.length).toBe(1);

    // Winning query mapping identified that Red ball (20.375, 30.625) is Target, Yellow ball (34.461, 1.602) is Second!
    expect(match?.matchedBalls.target.x).toBeCloseTo(20.375, 2);
    expect(match?.matchedBalls.second.x).toBeCloseTo(34.461, 2);

    // Trajectory input verification:
    const synchronizedBalls = hydrateBallsStateForUi(match?.matchedBalls);
    const targetCoord = resolveTrajectoryTargetBall(synchronizedBalls as any);
    expect(targetCoord).toEqual({ x: 20.375, y: 30.625 });

    vi.unstubAllGlobals();
  });
});
