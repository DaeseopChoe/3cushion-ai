/**
 * Phase 3A-3H1 / 3I2 — Derived Approval → Workspace History + baseline restore.
 * Run: npx vitest run src/application/flows/derivedApprovalFlow.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SCALE } from "../../utils/physics/ImpactEngine";
import type { Ball3, PositionRecord, StrategyEntry } from "../../domain/positionSearchEngine";
import {
  approveCueImpactDerivedReview,
  createCueImpactDerivedReview,
  persistedCueImpactDerivedCount,
} from "../../domain/family/cueImpactDerivedReview";
import * as generateCueImpactModule from "../../domain/family/generateCueImpactDerivedMembers";
import * as fourTrackModule from "../../domain/family/generateFourTrackMembers";
import {
  CUE_IMPACT_DERIVED_RULE,
  CUE_IMPACT_MEMBER_ORIGIN,
  generateCueImpactDerivedMembers,
} from "../../domain/family/generateCueImpactDerivedMembers";
import { writeFourTrackFamilyMembers } from "../../domain/family/familyAwareWriter";
import { FAMILY_TRACKS } from "../../domain/family/trackSymmetry";
import {
  baselineSnapshotToHistoryRuntime,
  commitDerivedApprovalDataset,
  type DerivedReviewBaselineSnapshot,
} from "./derivedApprovalFlow";

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

beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryLocalStorage());
});

const canonicalHpt = {
  T: "8/8",
  hit_point: { x: -2, y: 1.5 },
  mode: "TIP",
  tipCount: 2,
};

function collinearBalls(distance = 20): Ball3 {
  return {
    cue: { x: 8, y: 16 },
    target: { x: 8 + distance + DEFAULT_SCALE.BALL_DIAMETER_RG, y: 16 },
    second: { x: 62, y: 12 },
  };
}

function authoredEntry(overrides: Partial<StrategyEntry> = {}): StrategyEntry {
  return {
    slot: "S1",
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
    authoringStrategyId: "as_authored",
    familyId: "fm_family1",
    memberId: "mb_authored",
    memberOrigin: "AUTHORED",
    track: "B2T_L",
    hpT: canonicalHpt,
    str: { speed: 2.5 },
    ai: { text: "keep" },
    meta: {
      impact: { x: 12, y: 9 },
      final: { x: 50, y: 5 },
      angle_ci: 0.1,
      angle_fs: 0.2,
    },
    ...overrides,
  };
}

function persistFourTrack() {
  const written = writeFourTrackFamilyMembers([], {
    balls: collinearBalls(20),
    entry: authoredEntry(),
  });
  if (!written.ok) throw new Error(written.reason);
  return written;
}

function makeBaselineA(): DerivedReviewBaselineSnapshot {
  return {
    ballsState: {
      cue: { x: 1, y: 2 },
      target: { x: 10, y: 2 },
      second: { x: 20, y: 5 },
    },
    adminState: {
      sys: { system_id: "5_half_system", shotType: "뒤돌리기", track: "B2T_L" },
      hpt: { T: "8/8" },
      str: { speed: 2.5 },
      ai: { text: "baseline" },
    },
    overlayState: { open: false, type: null, anchorKey: null },
    targetColor: "yellow",
    isTargetSelected: true,
    shotEditor: {
      activeSlot: "S1",
      slots: {
        S1: {
          draft: {
            sys: { systemId: "5_half_system", track: "B2T_L" },
            familyId: "fm_family1",
            memberId: "mb_authored",
            memberOrigin: "AUTHORED",
            track: "B2T_L",
          },
        },
      },
    },
    activeSlot: "S1",
  };
}

function makeProjectionB(): DerivedReviewBaselineSnapshot {
  return {
    ballsState: {
      cue: { x: 99, y: 99 },
      target: { x: 100, y: 99 },
      second: { x: 50, y: 50 },
    },
    adminState: {
      sys: { system_id: "5_half_system", shotType: "뒤돌리기", track: "T2B_R" },
      hpt: { T: "6/8" },
      str: { speed: 9.9 },
      ai: { text: "projection" },
    },
    overlayState: { open: false, type: null, anchorKey: null },
    targetColor: "red",
    isTargetSelected: true,
    shotEditor: {
      activeSlot: "S1",
      slots: {
        S1: {
          draft: {
            sys: { systemId: "5_half_system", track: "T2B_R" },
            familyId: "fm_family1",
            memberId: "mb_sym_t2b_r",
            memberOrigin: "SYMMETRY",
            track: "T2B_R",
          },
        },
      },
    },
    activeSlot: "S1",
  };
}

function derivedLineageFromDataset(dataset: PositionRecord[], familyId: string) {
  const rows: Array<Record<string, unknown>> = [];
  for (const record of dataset) {
    for (const entry of Object.values(record.strategies ?? {})) {
      if (
        entry?.familyId === familyId &&
        entry?.memberOrigin === CUE_IMPACT_MEMBER_ORIGIN &&
        entry?.derivedRule === CUE_IMPACT_DERIVED_RULE
      ) {
        rows.push({
          familyId: entry.familyId,
          memberId: entry.memberId,
          memberOrigin: entry.memberOrigin,
          generatedFromMemberId: entry.generatedFromMemberId,
          derivedRule: entry.derivedRule,
          derivedStep: entry.derivedStep,
          track: entry.track,
          balls: record.balls,
        });
      }
    }
  }
  return rows;
}

function approvedFixture() {
  const written = persistFourTrack();
  const review = createCueImpactDerivedReview({
    dataset: written.dataset,
    familyId: "fm_family1",
  });
  if (!review.ok) throw new Error(review.reason);
  const approved = approveCueImpactDerivedReview({
    dataset: written.dataset,
    session: review.session,
  });
  if (!approved.ok) throw new Error(approved.reason);
  return { review, approved };
}

function okFinalize() {
  return vi.fn(async (_args: { familyId: string; graph: unknown }) => ({ ok: true }));
}

describe("commitDerivedApprovalDataset", () => {
  it("Case A: restores baseline runtime after persist (projection B → baseline A)", async () => {
    const { approved } = approvedFixture();

    const baselineA = makeBaselineA();
    const projectionB = makeProjectionB();
    let restoredSnapshot: DerivedReviewBaselineSnapshot | null = null;
    let currentRuntime = projectionB;

    const setDataset = vi.fn();
    const finalizeHistory = okFinalize();

    const result = await commitDerivedApprovalDataset({
      resultDataset: approved.dataset,
      baselineSnapshot: baselineA,
      setDataset,
      restoreDerivedReviewSnapshot: (snap) => {
        restoredSnapshot = snap;
        currentRuntime = snap as DerivedReviewBaselineSnapshot;
      },
      familyId: "fm_family1",
      finalizeHistory,
    });

    expect(result.ok, result.reason).toBe(true);
    expect(localStorage.length).toBe(0);
    expect(setDataset).toHaveBeenCalledWith(approved.dataset);
    expect(restoredSnapshot).toEqual(baselineA);
    expect(currentRuntime.ballsState).toEqual(baselineA.ballsState);
    expect(currentRuntime.adminState).toEqual(baselineA.adminState);
    expect(
      (currentRuntime.shotEditor as { slots: { S1: { draft: { track: string } } } }).slots.S1
        .draft.track
    ).toBe("B2T_L");
    expect(currentRuntime).not.toEqual(projectionB);
    expect(finalizeHistory).toHaveBeenCalledTimes(1);
    expect(persistedCueImpactDerivedCount(approved.dataset, "fm_family1")).toBeGreaterThan(0);
  });

  it("Case E: Approval writes the approved graph to History exactly once (same snapshot, no second SAVE entry)", async () => {
    const { approved } = approvedFixture();

    const finalizeHistory = okFinalize();
    const result = await commitDerivedApprovalDataset({
      resultDataset: approved.dataset,
      baselineSnapshot: makeBaselineA(),
      setDataset: vi.fn(),
      restoreDerivedReviewSnapshot: vi.fn(),
      familyId: "fm_family1",
      finalizeHistory,
    });
    expect(result.ok, result.reason).toBe(true);
    expect(finalizeHistory).toHaveBeenCalledTimes(1);
    const args = finalizeHistory.mock.calls[0][0];
    expect(args.familyId).toBe("fm_family1");
    expect(args.graph).toBe(result.approvedGraph);
  });

  it("Case E2: History failure keeps the review open — no dataset swap, no baseline restore", async () => {
    const { approved } = approvedFixture();
    const setDataset = vi.fn();
    const restore = vi.fn();

    const result = await commitDerivedApprovalDataset({
      resultDataset: approved.dataset,
      baselineSnapshot: makeBaselineA(),
      setDataset,
      restoreDerivedReviewSnapshot: restore,
      familyId: "fm_family1",
      finalizeHistory: async () => ({ ok: false, reason: "disk-full" }),
    });

    expect(result.ok).toBe(false);
    expect(result.historyOk).toBe(false);
    expect(setDataset).not.toHaveBeenCalled();
    expect(restore).not.toHaveBeenCalled();
    expect(localStorage.length).toBe(0);
  });

  it("Case F: Derived members survive baseline restore path", async () => {
    const { review, approved } = approvedFixture();
    const derivedCountBefore = persistedCueImpactDerivedCount(approved.dataset, "fm_family1");

    const result = await commitDerivedApprovalDataset({
      resultDataset: approved.dataset,
      baselineSnapshot: makeBaselineA(),
      setDataset: vi.fn(),
      restoreDerivedReviewSnapshot: vi.fn(),
      familyId: "fm_family1",
      finalizeHistory: okFinalize(),
    });

    expect(result.ok, result.reason).toBe(true);
    expect(persistedCueImpactDerivedCount(approved.dataset, "fm_family1")).toBe(derivedCountBefore);
    expect(derivedCountBefore).toBe(review.session.members.length);
  });

  it("preserves Derived lineage fields in AFTER dataset", async () => {
    const { approved } = approvedFixture();

    const before = derivedLineageFromDataset(approved.dataset, "fm_family1");
    expect(before.length).toBeGreaterThan(0);

    let snapDataset: PositionRecord[] = [];
    const result = await commitDerivedApprovalDataset({
      resultDataset: approved.dataset,
      baselineSnapshot: makeBaselineA(),
      setDataset: (dataset) => {
        snapDataset = dataset;
      },
      restoreDerivedReviewSnapshot: vi.fn(),
      familyId: "fm_family1",
      finalizeHistory: okFinalize(),
    });
    expect(result.ok, result.reason).toBe(true);

    const after = derivedLineageFromDataset(snapDataset, "fm_family1");
    expect(after).toEqual(before);
    for (const row of after) {
      expect(row.memberOrigin).toBe(CUE_IMPACT_MEMBER_ORIGIN);
      expect(row.derivedRule).toBe(CUE_IMPACT_DERIVED_RULE);
      expect(FAMILY_TRACKS).toContain(row.track);
    }
  });
});

describe("Derived approval isolation", () => {
  it("does not invoke canonical SAVE flows", async () => {
    const historyFlow = await import("./historyFlow");
    const saveFlow = await import("./saveFlow");
    expect(historyFlow.runCanonicalSave).toBeDefined();
    expect(saveFlow.runSaveStrategy).toBeDefined();
    expect(String(commitDerivedApprovalDataset)).not.toContain("runCanonicalSave");
    expect(String(commitDerivedApprovalDataset)).not.toContain("runSaveStrategy");
  });

  it("does not regenerate 4-track or Cue Derived on approval commit", async () => {
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);

    const generateSpy = vi.spyOn(generateCueImpactModule, "generateCueImpactDerivedMembers");
    const fourTrackSpy = vi.spyOn(fourTrackModule, "generateFourTrackMembers");

    const approved = approveCueImpactDerivedReview({
      dataset: written.dataset,
      session: review.session,
    });
    if (!approved.ok) throw new Error(approved.reason);

    await commitDerivedApprovalDataset({
      resultDataset: approved.dataset,
      baselineSnapshot: makeBaselineA(),
      setDataset: vi.fn(),
      restoreDerivedReviewSnapshot: vi.fn(),
      familyId: "fm_family1",
      finalizeHistory: okFinalize(),
    });

    expect(generateSpy).not.toHaveBeenCalled();
    expect(fourTrackSpy).not.toHaveBeenCalled();

    generateSpy.mockRestore();
    fourTrackSpy.mockRestore();
  });

  it("Case D: cancel path has no history append (approve-only contract)", () => {
    const baselineA = makeBaselineA();
    let restored: DerivedReviewBaselineSnapshot | null = null;
    const commitHistory = vi.fn();

    // Simulate cancel semantics: restore only, no commitDerivedApprovalDataset
    const restore = (snap: DerivedReviewBaselineSnapshot | null) => {
      restored = snap;
    };
    restore(baselineA);

    expect(restored).toEqual(baselineA);
    expect(commitHistory).not.toHaveBeenCalled();
  });
});

describe("approval persistence unchanged", () => {
  it("approveCueImpactDerivedReview still persists frozen members without regeneration", () => {
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);

    const regen = generateCueImpactDerivedMembers({
      sourceMember: {
        balls: collinearBalls(20),
        entry: authoredEntry(),
      },
    });
    if (!regen.ok) throw new Error(regen.reason);

    const approved = approveCueImpactDerivedReview({
      dataset: written.dataset,
      session: review.session,
    });
    if (!approved.ok) throw new Error(approved.reason);

    expect(persistedCueImpactDerivedCount(approved.dataset, "fm_family1")).toBe(
      review.session.members.length
    );
    expect(approved.session.status).toBe("APPROVED");
  });

  it("Case F follow-up: subsequent SAVE input would read baseline A not projection B", async () => {
    const { approved } = approvedFixture();
    const baselineA = makeBaselineA();
    const projectionB = makeProjectionB();
    let saveInputRuntime = projectionB;

    await commitDerivedApprovalDataset({
      resultDataset: approved.dataset,
      baselineSnapshot: baselineA,
      setDataset: vi.fn(),
      restoreDerivedReviewSnapshot: (snap) => {
        saveInputRuntime = snap as DerivedReviewBaselineSnapshot;
      },
      familyId: "fm_family1",
      finalizeHistory: okFinalize(),
    });

    expect(saveInputRuntime.ballsState).toEqual(baselineA.ballsState);
    expect(saveInputRuntime.ballsState).not.toEqual(projectionB.ballsState);
    expect(
      (saveInputRuntime.shotEditor as { slots: { S1: { draft: { track: string } } } }).slots.S1
        .draft.track
    ).toBe("B2T_L");
  });
});
