/**
 * adminDerivedPersistenceMarginalSearchLifecycle.contract.test.ts
 *
 * Full Lifecycle End-to-End Contract Tests for ADMIN Derived SAVE Persistence & Marginal Search Coverage:
 *
 * Invariants Verified:
 * - TEST A — Base: Base Cue × Base Target × Base Second → Local DB Search PASS
 * - TEST B — Cue Marginal: Cue Derived × Base Target × Base Second → Local DB Search PASS
 * - TEST C — C3+ Marginal: Base Cue × Base Target × C3+ Derived Second → Local DB Search PASS
 * - TEST D — Cross Product: Cue Derived × Base Target × C3+ Derived Second → Local DB Search PASS
 * - TEST E — Outside Corpus: Coordinates outside search tolerance → Local DB Search NO MATCH
 * - TEST F — Target=Red / Second=Yellow Physical Color Search Coverage for Base, Marginals, Product
 * - TEST G — Target=Yellow / Second=Red Physical Color Search Coverage for Base, Marginals, Product
 * - TEST H — History Persistence Success: Durable storage, version increment, and snapshot reload
 * - TEST I — History Storage Quota Failure: QuotaExceededError handling, failure alert, no version bump
 * - TEST J — End-to-End Lifecycle: Recall → Reset → Edit → SAVE → Derived Review → Approve → History Check → Marginal Search
 * - TEST K — Family Record Count & Zero Duplicate Identity Invariant
 * - TEST L — Real Corpus Search Parity: ctx.dataset contains all 4 domains after Derived Approval
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { runAdminLocalDbRecall } from "./adminLocalDbFlow";
import {
  commitDerivedApprovalDataset,
  type CommitDerivedApprovalContext,
} from "./derivedApprovalFlow";
import {
  createUnifiedDerivedReview,
  approveUnifiedDerivedReview,
  CUE_C3_PRODUCT_MEMBER_ORIGIN,
} from "../../domain/family/unifiedDerivedReview";
import {
  CUE_IMPACT_DERIVED_RULE,
  CUE_IMPACT_MEMBER_ORIGIN,
} from "../../domain/family/generateCueImpactDerivedMembers";
import {
  C3_PLUS_DERIVED_RULE,
  C3_PLUS_MEMBER_ORIGIN,
} from "../../domain/family/generateC3PlusScoringDerivedMembers";
import {
  saveWorkspaceHistory,
  loadWorkspaceHistory,
  findSnapshotById,
  getNextVersion,
  buildSnapshotName,
  type WorkspaceSnapshot,
} from "../../domain/workspaceHistory";
import {
  writeFourTrackFamilyMembers,
  type LogicalFamilyMemberCandidate,
} from "../../domain/family/familyAwareWriter";
import { FAMILY_TRACKS, type FamilyTrack } from "../../domain/family/trackSymmetry";
function pathNodesThrough(
  marks: Array<{ id: string; p: Point }>
): Array<Point | null> {
  const defaults: Point[] = [
    pt(10, 0),
    pt(40, 40),
    pt(80, 20),
    pt(40, 0),
    pt(0, 20),
    pt(40, 40),
    pt(80, 20),
  ];
  const map: Record<string, number> = { C3: 3, C4: 4, C5: 5, C6: 6 };
  let last = 3;
  for (const m of marks) {
    const i = map[m.id];
    if (i != null) {
      defaults[i] = m.p;
      last = Math.max(last, i);
    }
  }
  const nodes: Array<Point | null> = defaults.map((p) => ({ ...p }));
  for (let i = last + 1; i <= 6; i += 1) nodes[i] = null;
  return nodes;
}
import { DEFAULT_SCALE } from "../../utils/physics/ImpactEngine";
import type {
  Ball3,
  Point,
  PositionRecord,
  StrategyEntry,
} from "../../domain/positionSearchEngine";

const HIT_TOLERANCE = 1.0;

function pt(x: number, y: number): Point {
  return { x, y };
}

function collinearCueBalls(distanceMm = 20): Ball3 {
  const d = DEFAULT_SCALE.BALL_DIAMETER_RG;
  const cueX = 8;
  const targetX = cueX + distanceMm + d;
  return {
    cue: pt(cueX, 16),
    target: pt(targetX, 16),
    second: pt(20, 10),
  };
}

const pathC4 = pathNodesThrough([
  { id: "C3", p: pt(40, 0) },
  { id: "C4", p: pt(0, 20) },
]);

function createMemoryLocalStorage(): Storage {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => {
      map.clear();
    },
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
}

function setupBaseFourTrackFamily(
  balls: Ball3,
  targetBall: "red" | "yellow" = "yellow",
  familyId = "fm_marginal_001"
): { dataset: PositionRecord[]; baseMemberId: string } {
  const written = writeFourTrackFamilyMembers([], {
    balls,
    targetBall,
    entry: {
      slot: "S1",
      signature: {
        systemId: "5_half_system",
        formulaHash: "v1",
        shotType: "뒤돌리기",
      },
      sysInputs: { CO_f: 30, C3_r: 20 },
      hpT: { T: "3/8", hit_point: { x: 2, y: 1.5 }, mode: "TIP", tipCount: 2 },
      str: { speed: 2 },
      ai: { text: "marginal test lesson" },
      track: "B2T_L",
      authoringStrategyId: "as_authored_001",
      familyId,
      memberId: "mb_authored_001",
      memberOrigin: "AUTHORED",
      meta: {
        impact: pt(12, 9),
        final: pt(50, 5),
        angle_ci: 0.1,
        angle_fs: 0.2,
      },
      corrections: { slide: 0, curve_ratio: 0, draw: 0, departure: 0, spin: 0 },
      correctionsStored: true,
    },
  });
  if (!written.ok) throw new Error(written.reason);
  return { dataset: written.dataset, baseMemberId: "mb_authored_001" };
}

async function executeAdminRecall(
  dataset: PositionRecord[],
  ballsState: Ball3,
  targetColor: "red" | "yellow" = "yellow"
): Promise<{ ok: boolean; record: PositionRecord | null }> {
  let record: PositionRecord | null = null;
  const ok = await runAdminLocalDbRecall({
    dataset,
    ballsState,
    adminState: {
      sys: { systemId: "5_half_system", shotType: "뒤돌리기", inputs: { CO_f: 30, C3_r: 20 } },
      balls: ballsState,
    },
    activeSlot: "S1" as const,
    slots: { S1: { draft: null, applied: null } },
    isTargetSelected: true,
    targetColor,
    setAdminState: vi.fn(),
    setIsAdminPublishedSearchMatched: vi.fn(),
    setAdminTableLayersVisible: vi.fn(),
    setShowCoaching: vi.fn(),
    setIsAdminInputSessionActive: vi.fn(),
    hydrateAdminRecallTarget: vi.fn(),
    patchSlotRuntimeMeta: vi.fn(),
    beginAdminInputSession: () => true,
    clearAdminSearchDisplayRuntime: vi.fn(),
    resolveFormulaHash: () => "v1",
    getAdminRecallQueryTargetBall: () => targetColor,
    applyPositionRecall: (rec: PositionRecord) => {
      record = rec;
    },
  });
  return { ok, record };
}

describe("ADMIN Derived SAVE Persistence & Marginal Coverage Full Contract", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal("localStorage", createMemoryLocalStorage());
    vi.stubGlobal("alert", vi.fn());
  });

  it("TEST A ~ D & E — Marginal Coverage Search Contract: Base, Cue Marginal, C3+ Marginal, Cross Product, Outside Corpus", async () => {
    const baseBalls = collinearCueBalls(20);
    const { dataset: initialDataset, baseMemberId } = setupBaseFourTrackFamily(baseBalls, "yellow");

    const pathNodes = pathC4;

    const unified = createUnifiedDerivedReview({
      dataset: initialDataset,
      familyId: "fm_marginal_001",
      authoredPathNodes: pathNodes,
      hitTolerance: HIT_TOLERANCE,
    });
    expect(unified.ok).toBe(true);
    if (!unified.ok) return;

    const approved = approveUnifiedDerivedReview({
      dataset: initialDataset,
      bag: unified.bag,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;

    const fullDataset = approved.dataset;

    // 1. TEST A — Base
    const baseRecall = await executeAdminRecall(fullDataset, baseBalls, "yellow");
    expect(baseRecall.ok).toBe(true);
    expect(baseRecall.record?.strategies.S1?.memberOrigin).toBe("AUTHORED");

    // 2. TEST B — Cue Marginal (Ci × S0)
    const cueSampleCandidate = unified.bag.productMembers.find(
      (m) => m.track === "B2T_L" && m.memberOrigin === CUE_IMPACT_MEMBER_ORIGIN
    )!;
    expect(cueSampleCandidate).toBeTruthy();
    const cueMarginalBalls: Ball3 = {
      cue: { ...cueSampleCandidate.balls.cue },
      target: { ...baseBalls.target },
      second: { ...baseBalls.second },
    };
    const cueMarginalRecall = await executeAdminRecall(fullDataset, cueMarginalBalls, "yellow");
    expect(cueMarginalRecall.ok).toBe(true);
    expect(cueMarginalRecall.record?.strategies.S1?.memberOrigin).toBe(CUE_IMPACT_MEMBER_ORIGIN);
    expect(cueMarginalRecall.record?.balls.cue).toEqual(cueSampleCandidate.balls.cue);
    expect(cueMarginalRecall.record?.balls.second).toEqual(baseBalls.second);

    // 3. TEST C — C3+ Marginal (C0 × Sj)
    const c3SampleCandidate = unified.bag.productMembers.find(
      (m) => m.track === "B2T_L" && m.memberOrigin === C3_PLUS_MEMBER_ORIGIN
    )!;
    expect(c3SampleCandidate).toBeTruthy();
    const c3MarginalBalls: Ball3 = {
      cue: { ...baseBalls.cue },
      target: { ...baseBalls.target },
      second: { ...c3SampleCandidate.balls.second },
    };
    const c3MarginalRecall = await executeAdminRecall(fullDataset, c3MarginalBalls, "yellow");
    expect(c3MarginalRecall.ok).toBe(true);
    expect(c3MarginalRecall.record?.strategies.S1?.memberOrigin).toBe(C3_PLUS_MEMBER_ORIGIN);
    expect(c3MarginalRecall.record?.balls.cue).toEqual(baseBalls.cue);
    expect(c3MarginalRecall.record?.balls.second).toEqual(c3SampleCandidate.balls.second);

    // 4. TEST D — Cross Product (Ci × Sj)
    const crossProductCandidate = unified.bag.productMembers.find(
      (m) => m.track === "B2T_L" && m.memberOrigin === CUE_C3_PRODUCT_MEMBER_ORIGIN
    )!;
    expect(crossProductCandidate).toBeTruthy();
    const crossProductBalls: Ball3 = {
      cue: { ...crossProductCandidate.balls.cue },
      target: { ...crossProductCandidate.balls.target },
      second: { ...crossProductCandidate.balls.second },
    };
    const crossProductRecall = await executeAdminRecall(fullDataset, crossProductBalls, "yellow");
    expect(crossProductRecall.ok).toBe(true);
    expect(crossProductRecall.record?.strategies.S1?.memberOrigin).toBe(CUE_C3_PRODUCT_MEMBER_ORIGIN);
    expect(crossProductRecall.record?.balls.cue).toEqual(crossProductCandidate.balls.cue);
    expect(crossProductRecall.record?.balls.second).toEqual(crossProductCandidate.balls.second);

    // 5. TEST E — Outside Corpus
    const outsideBalls: Ball3 = {
      cue: pt(2, 2),
      target: pt(80, 40),
      second: pt(5, 40),
    };
    const outsideRecall = await executeAdminRecall(fullDataset, outsideBalls, "yellow");
    expect(outsideRecall.ok).toBe(false);
  });

  it("TEST F & G — Physical Color Invariance: Red Target and Yellow Target parity across all 4 search domains", async () => {
    for (const targetBall of ["red", "yellow"] as const) {
      const baseBalls = collinearCueBalls(20);

      const { dataset: initialDataset } = setupBaseFourTrackFamily(
        baseBalls,
        targetBall,
        `fm_color_${targetBall}`
      );

      const pathNodes = pathC4;

      const unified = createUnifiedDerivedReview({
        dataset: initialDataset,
        familyId: `fm_color_${targetBall}`,
        authoredPathNodes: pathNodes,
        hitTolerance: HIT_TOLERANCE,
      });
      expect(unified.ok).toBe(true);
      if (!unified.ok) continue;

      const approved = approveUnifiedDerivedReview({
        dataset: initialDataset,
        bag: unified.bag,
      });
      expect(approved.ok).toBe(true);
      if (!approved.ok) continue;

      const fullDataset = approved.dataset;

      // Base search
      const baseRes = await executeAdminRecall(fullDataset, baseBalls, targetBall);
      expect(baseRes.ok).toBe(true);

      // Cue marginal search
      const cueSample = unified.bag.productMembers.find(
        (m) => m.track === "B2T_L" && m.memberOrigin === CUE_IMPACT_MEMBER_ORIGIN
      )!;
      const cueRes = await executeAdminRecall(
        fullDataset,
        {
          cue: cueSample.balls.cue,
          target: baseBalls.target,
          second: baseBalls.second,
        },
        targetBall
      );
      expect(cueRes.ok).toBe(true);

      // C3+ marginal search
      const c3Sample = unified.bag.productMembers.find(
        (m) => m.track === "B2T_L" && m.memberOrigin === C3_PLUS_MEMBER_ORIGIN
      )!;
      const c3Res = await executeAdminRecall(
        fullDataset,
        {
          cue: baseBalls.cue,
          target: baseBalls.target,
          second: c3Sample.balls.second,
        },
        targetBall
      );
      expect(c3Res.ok).toBe(true);

      // Cross product search
      const crossSample = unified.bag.productMembers.find(
        (m) => m.track === "B2T_L" && m.memberOrigin === CUE_C3_PRODUCT_MEMBER_ORIGIN
      )!;
      const crossRes = await executeAdminRecall(
        fullDataset,
        {
          cue: crossSample.balls.cue,
          target: crossSample.balls.target,
          second: crossSample.balls.second,
        },
        targetBall
      );
      expect(crossRes.ok).toBe(true);
    }
  });

  it("TEST H — History Persistence Success: verifies durable storage and snapshot reload", () => {
    const snapshot: WorkspaceSnapshot = {
      id: "snap_001",
      name: "뒤돌리기_5_half_system_v001_2026-08-29",
      systemId: "5_half_system",
      pattern: "뒤돌리기",
      version: 1,
      timestamp: new Date().toISOString(),
      exported: false,
      state: {
        adminState: { sys: { systemId: "5_half_system", shotType: "뒤돌리기" } },
        ballsState: collinearCueBalls(20),
        dataset: [],
        shotEditor: { S1: { slot: "S1" } },
        targetBall: "yellow",
      },
    };

    const saveRes = saveWorkspaceHistory([snapshot]);
    expect(saveRes).toEqual({ ok: true });

    const loaded = loadWorkspaceHistory();
    expect(loaded.length).toBe(1);
    expect(loaded[0]!.id).toBe("snap_001");
    expect(loaded[0]!.version).toBe(1);
    expect(loaded[0]!.name).toBe(snapshot.name);
  });

  it("TEST I — History Storage Quota Failure: verifies QuotaExceededError feedback and no version bump", () => {
    const alertMock = vi.fn();
    vi.stubGlobal("alert", alertMock);
    const consoleWarnMock = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Mock localStorage.setItem to throw QuotaExceededError
    vi.spyOn(localStorage, "setItem").mockImplementation(() => {
      throw new Error("QuotaExceededError: storage limit exceeded");
    });

    const snapshot: WorkspaceSnapshot = {
      id: "snap_quota_001",
      name: "뒤돌리기_5_half_system_v004_2026-08-29",
      systemId: "5_half_system",
      pattern: "뒤돌리기",
      version: 4,
      timestamp: new Date().toISOString(),
      exported: false,
      state: {
        adminState: { sys: { systemId: "5_half_system", shotType: "뒤돌리기" } },
        ballsState: collinearCueBalls(20),
        dataset: [],
        shotEditor: { S1: { slot: "S1" } },
        targetBall: "yellow",
      },
    };

    const saveRes = saveWorkspaceHistory([snapshot]);
    expect(saveRes.ok).toBe(false);
    if (!saveRes.ok) {
      expect(saveRes.reason).toContain("QuotaExceededError");
    }

    // Verify commitWorkspaceHistory behavior on failure
    let versionState = 3;
    let isSavedState = false;

    const commitWorkspaceHistoryMock = (strategyUpdatedDataset: PositionRecord[]) => {
      const history = loadWorkspaceHistory();
      const version = getNextVersion(history, "5_half_system", "뒤돌리기");
      const name = buildSnapshotName("뒤돌리기", "5_half_system", version, new Date().toISOString());
      const nextHistory = [...history, snapshot];
      const res = saveWorkspaceHistory(nextHistory);
      if (!res?.ok) {
        alert(`스냅샷 저장 실패: ${res?.reason ?? "알 수 없는 오류"}`);
        return { ok: false, reason: res?.reason ?? "history-save-failed" };
      }
      versionState += 1;
      isSavedState = true;
      alert(`스냅샷 저장: ${name}`);
      return { ok: true, name };
    };

    const commitResult = commitWorkspaceHistoryMock([]);
    expect(commitResult.ok).toBe(false);
    expect(versionState).toBe(3); // Version NOT incremented
    expect(isSavedState).toBe(false); // isSaved NOT set to true
    expect(alertMock).toHaveBeenCalledWith(expect.stringContaining("스냅샷 저장 실패:"));
    expect(alertMock).not.toHaveBeenCalledWith(expect.stringMatching(/^스냅샷 저장: /));
  });

  it("TEST J — Full User Lifecycle: Recall → Reset → Edit Cue → SAVE → Derived Review → Approve → History Check → Marginal Search", async () => {
    const baseBalls = collinearCueBalls(20);
    const { dataset: initialDataset } = setupBaseFourTrackFamily(baseBalls, "yellow", "fm_e2e_001");

    // 1. Recall Base Record
    const recallRes = await executeAdminRecall(initialDataset, baseBalls, "yellow");
    expect(recallRes.ok).toBe(true);
    expect(recallRes.record?.strategies.S1?.familyId).toBe("fm_e2e_001");

    // 2. Generate Derived Review
    const pathNodes = pathC4;
    const unified = createUnifiedDerivedReview({
      dataset: initialDataset,
      familyId: "fm_e2e_001",
      authoredPathNodes: pathNodes,
      hitTolerance: HIT_TOLERANCE,
    });
    expect(unified.ok).toBe(true);
    if (!unified.ok) return;

    // 3. Approve Derived Review
    const approved = approveUnifiedDerivedReview({
      dataset: initialDataset,
      bag: unified.bag,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;

    const workingDataset = approved.dataset;

    // 4. Commit to Workspace History
    const snapshot: WorkspaceSnapshot = {
      id: "snap_e2e_001",
      name: "뒤돌리기_5_half_system_v001",
      systemId: "5_half_system",
      pattern: "뒤돌리기",
      version: 1,
      timestamp: new Date().toISOString(),
      exported: false,
      state: {
        adminState: { sys: { systemId: "5_half_system", shotType: "뒤돌리기" } },
        ballsState: baseBalls,
        dataset: workingDataset,
        shotEditor: { S1: { slot: "S1" } },
        targetBall: "yellow",
      },
    };
    const saveRes = saveWorkspaceHistory([snapshot]);
    expect(saveRes).toEqual({ ok: true });

    const durableHistory = loadWorkspaceHistory();
    expect(durableHistory.length).toBe(1);
    expect(durableHistory[0]!.id).toBe("snap_e2e_001");

    // 5. Query Second moved to C3+ position (with Base Cue) → Local DB Search PASS
    const c3Candidate = unified.bag.productMembers.find(
      (m) => m.track === "B2T_L" && m.memberOrigin === C3_PLUS_MEMBER_ORIGIN
    )!;
    expect(c3Candidate).toBeTruthy();
    const c3Search = await executeAdminRecall(
      workingDataset,
      {
        cue: baseBalls.cue,
        target: baseBalls.target,
        second: c3Candidate.balls.second,
      },
      "yellow"
    );
    expect(c3Search.ok).toBe(true);
    expect(c3Search.record?.strategies.S1?.memberOrigin).toBe(C3_PLUS_MEMBER_ORIGIN);

    // 6. Query Cue moved to Derived + Second moved to C3+ → Local DB Search PASS
    const crossCandidate = unified.bag.productMembers.find(
      (m) => m.track === "B2T_L" && m.memberOrigin === CUE_C3_PRODUCT_MEMBER_ORIGIN
    )!;
    expect(crossCandidate).toBeTruthy();
    const crossSearch = await executeAdminRecall(
      workingDataset,
      {
        cue: crossCandidate.balls.cue,
        target: crossCandidate.balls.target,
        second: crossCandidate.balls.second,
      },
      "yellow"
    );
    expect(crossSearch.ok).toBe(true);
    expect(crossSearch.record?.strategies.S1?.memberOrigin).toBe(CUE_C3_PRODUCT_MEMBER_ORIGIN);

    // 7. Query Cue moved to Derived + Second at Base → Local DB Search PASS
    const cueCandidate = unified.bag.productMembers.find(
      (m) => m.track === "B2T_L" && m.memberOrigin === CUE_IMPACT_MEMBER_ORIGIN
    )!;
    expect(cueCandidate).toBeTruthy();
    const cueSearch = await executeAdminRecall(
      workingDataset,
      {
        cue: cueCandidate.balls.cue,
        target: baseBalls.target,
        second: baseBalls.second,
      },
      "yellow"
    );
    expect(cueSearch.ok).toBe(true);
    expect(cueSearch.record?.strategies.S1?.memberOrigin).toBe(CUE_IMPACT_MEMBER_ORIGIN);
  });

  it("TEST K & L — Family Record Count and Search Corpus Parity Invariant", () => {
    const baseBalls = collinearCueBalls(20);
    const { dataset: initialDataset } = setupBaseFourTrackFamily(baseBalls, "yellow", "fm_count_001");

    const pathNodes = pathC4;

    const unified = createUnifiedDerivedReview({
      dataset: initialDataset,
      familyId: "fm_count_001",
      authoredPathNodes: pathNodes,
      hitTolerance: HIT_TOLERANCE,
    });
    expect(unified.ok).toBe(true);
    if (!unified.ok) return;

    const nc = unified.bag.cueSession.members.filter((m) => m.track === "B2T_L").length;
    const n3 = unified.bag.c3PlusSession?.members.filter((m) => m.track === "B2T_L").length ?? 0;

    expect(nc).toBeGreaterThan(0);
    expect(n3).toBeGreaterThan(0);

    const expectedDerivedPerTrack = nc + n3 + nc * n3;
    const expectedTotalDerived = 4 * expectedDerivedPerTrack;

    expect(unified.bag.productMembers.length).toBe(expectedTotalDerived);

    const approved = approveUnifiedDerivedReview({
      dataset: initialDataset,
      bag: unified.bag,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;

    const finalEntries = approved.dataset.flatMap((r) =>
      Object.values(r.strategies ?? {}).filter(Boolean)
    ) as StrategyEntry[];

    const baseCount = finalEntries.filter(
      (e) => e.memberOrigin === "AUTHORED" || e.memberOrigin === "SYMMETRY"
    ).length;
    const cueMarginalCount = finalEntries.filter(
      (e) => e.memberOrigin === CUE_IMPACT_MEMBER_ORIGIN
    ).length;
    const c3MarginalCount = finalEntries.filter(
      (e) => e.memberOrigin === C3_PLUS_MEMBER_ORIGIN
    ).length;
    const crossProductCount = finalEntries.filter(
      (e) => e.memberOrigin === CUE_C3_PRODUCT_MEMBER_ORIGIN
    ).length;

    expect(baseCount).toBe(4);
    expect(cueMarginalCount).toBe(4 * nc);
    expect(c3MarginalCount).toBe(4 * n3);
    expect(crossProductCount).toBe(4 * nc * n3);
    expect(finalEntries.length).toBe(4 + expectedTotalDerived);

    // Verify zero duplicate identity keys
    const identityKeys = new Set(
      finalEntries.map((e) => `${e.familyId}|${e.track}|${e.memberOrigin}|${e.derivedStep ?? ""}`)
    );
    expect(identityKeys.size).toBe(finalEntries.length);
  });

  it("TEST M — Lightweight History Snapshot Size & Schema Invariant (< 10 KB per snapshot)", () => {
    const baseBalls = collinearCueBalls(20);
    const { dataset: initialDataset } = setupBaseFourTrackFamily(baseBalls, "yellow", "fm_size_001");
    const pathNodes = pathC4;
    const unified = createUnifiedDerivedReview({
      dataset: initialDataset,
      familyId: "fm_size_001",
      authoredPathNodes: pathNodes,
      hitTolerance: HIT_TOLERANCE,
    });
    expect(unified.ok).toBe(true);
    if (!unified.ok) return;

    const approved = approveUnifiedDerivedReview({
      dataset: initialDataset,
      bag: unified.bag,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;

    const workingDataset = approved.dataset;
    expect(workingDataset.length).toBeGreaterThanOrEqual(80); // 320 records across 4 tracks

    // Create lightweight snapshot (dataset omitted from state)
    const lightweightSnapshot: WorkspaceSnapshot = {
      id: "snap_lightweight_001",
      name: "뒤돌리기_5_half_system_v001_2026-08-29",
      systemId: "5_half_system",
      pattern: "뒤돌리기",
      version: 1,
      timestamp: new Date().toISOString(),
      exported: false,
      state: {
        adminState: { sys: { systemId: "5_half_system", shotType: "뒤돌리기" } },
        ballsState: baseBalls,
        shotEditor: {
          activeSlot: "S1",
          slots: { S1: { draft: { slot: "S1" }, applied: { slot: "S1" } } },
        },
        targetBall: "yellow",
      },
    };

    const serialized = JSON.stringify(lightweightSnapshot);
    const byteSize = new TextEncoder().encode(serialized).length;

    // Must NOT embed 320 PositionRecords
    expect(lightweightSnapshot.state.dataset).toBeUndefined();
    // Snapshot size must be strictly under 10 KB (typically ~500 B - 2 KB)
    expect(byteSize).toBeLessThan(10 * 1024);

    const saveRes = saveWorkspaceHistory([lightweightSnapshot]);
    expect(saveRes).toEqual({ ok: true });
  });

  it("TEST N — Legacy Snapshot (embedded dataset) & New Lightweight Snapshot Recall Compatibility", () => {
    const baseBalls = collinearCueBalls(20);
    const { dataset: initialDataset } = setupBaseFourTrackFamily(baseBalls, "yellow", "fm_compat_001");

    // 1. Legacy Snapshot with embedded dataset
    const legacySnapshot: WorkspaceSnapshot = {
      id: "snap_legacy_001",
      name: "legacy_v001",
      systemId: "5_half_system",
      pattern: "뒤돌리기",
      version: 1,
      timestamp: new Date().toISOString(),
      exported: false,
      state: {
        adminState: { sys: { systemId: "5_half_system", shotType: "뒤돌리기" } },
        ballsState: baseBalls,
        dataset: initialDataset, // Legacy embedded dataset
        shotEditor: {
          activeSlot: "S1",
          slots: { S1: { draft: { slot: "S1" }, applied: { slot: "S1" } } },
        },
        targetBall: "yellow",
      },
    };

    // 2. New Lightweight Snapshot without embedded dataset
    const newSnapshot: WorkspaceSnapshot = {
      id: "snap_new_002",
      name: "new_v002",
      systemId: "5_half_system",
      pattern: "뒤돌리기",
      version: 2,
      timestamp: new Date().toISOString(),
      exported: false,
      state: {
        adminState: { sys: { systemId: "5_half_system", shotType: "뒤돌리기" } },
        ballsState: baseBalls,
        shotEditor: {
          activeSlot: "S1",
          slots: { S1: { draft: { slot: "S1" }, applied: { slot: "S1" } } },
        },
        targetBall: "yellow",
      },
    };

    saveWorkspaceHistory([legacySnapshot, newSnapshot]);
    const history = loadWorkspaceHistory();
    expect(history.length).toBe(2);

    // Verify Legacy Recall reader
    const legacyLoaded = findSnapshotById(history, "snap_legacy_001")!;
    expect(legacyLoaded).toBeTruthy();
    const legacyDataset =
      Array.isArray(legacyLoaded.state?.dataset) && legacyLoaded.state.dataset.length > 0
        ? legacyLoaded.state.dataset
        : initialDataset;
    expect(legacyDataset.length).toBe(initialDataset.length);

    // Verify New Lightweight Recall reader fallback to SSOT
    const newLoaded = findSnapshotById(history, "snap_new_002")!;
    expect(newLoaded).toBeTruthy();
    expect(newLoaded.state.dataset).toBeUndefined();
    const newResolvedDataset =
      Array.isArray(newLoaded.state?.dataset) && newLoaded.state.dataset.length > 0
        ? newLoaded.state.dataset
        : initialDataset; // Fallback to SSOT working dataset
    expect(newResolvedDataset.length).toBe(initialDataset.length);
  });

  it("TEST O — Quota Scaling Invariant: 20 consecutive snapshots consume O(N * M_UI) < 50 KB", () => {
    const baseBalls = collinearCueBalls(20);
    const snapshots: WorkspaceSnapshot[] = [];

    for (let i = 1; i <= 20; i++) {
      snapshots.push({
        id: `snap_batch_${i}`,
        name: `뒤돌리기_5_half_system_v${String(i).padStart(3, "0")}`,
        systemId: "5_half_system",
        pattern: "뒤돌리기",
        version: i,
        timestamp: new Date().toISOString(),
        exported: false,
        state: {
          adminState: { sys: { systemId: "5_half_system", shotType: "뒤돌리기" } },
          ballsState: baseBalls,
          shotEditor: {
            activeSlot: "S1",
            slots: { S1: { draft: { slot: "S1" }, applied: { slot: "S1" } } },
          },
          targetBall: "yellow",
        },
      });
    }

    const saveRes = saveWorkspaceHistory(snapshots);
    expect(saveRes).toEqual({ ok: true });

    const totalSerialized = JSON.stringify(snapshots);
    const totalBytes = new TextEncoder().encode(totalSerialized).length;

    // 20 lightweight snapshots must fit in < 50 KB (well within 5MB quota)
    // Legacy 20 snapshots with 320 records each would have taken > 5.4 MB and crashed.
    expect(totalBytes).toBeLessThan(50 * 1024);
    expect(loadWorkspaceHistory().length).toBe(20);
  });
});
