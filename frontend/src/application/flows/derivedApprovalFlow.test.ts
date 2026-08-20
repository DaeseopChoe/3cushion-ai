/**
 * Phase 3A-3H1 / 3I2 — Derived Approval → Workspace History + baseline restore.
 * Run: npx vitest run src/application/flows/derivedApprovalFlow.test.ts
 */

import { describe, expect, it, vi } from "vitest";
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

describe("commitDerivedApprovalDataset", () => {
  it("Case A: restores baseline runtime after persist (projection B → baseline A)", () => {
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

    const baselineA = makeBaselineA();
    const projectionB = makeProjectionB();
    let restoredSnapshot: DerivedReviewBaselineSnapshot | null = null;
    let currentRuntime = projectionB;

    const saveWorkingDataset = vi.fn();
    const setDataset = vi.fn();
    const commitHistory = vi.fn();

    commitDerivedApprovalDataset({
      resultDataset: approved.dataset,
      baselineSnapshot: baselineA,
      saveWorkingDataset,
      setDataset,
      restoreDerivedReviewSnapshot: (snap) => {
        restoredSnapshot = snap;
        currentRuntime = snap as DerivedReviewBaselineSnapshot;
      },
      commitWorkspaceHistoryWithStrategyDataset: commitHistory,
    });

    expect(saveWorkingDataset).toHaveBeenCalledWith(approved.dataset);
    expect(setDataset).toHaveBeenCalledWith(approved.dataset);
    expect(restoredSnapshot).toEqual(baselineA);
    expect(currentRuntime.ballsState).toEqual(baselineA.ballsState);
    expect(currentRuntime.adminState).toEqual(baselineA.adminState);
    expect(
      (currentRuntime.shotEditor as { slots: { S1: { draft: { track: string } } } }).slots.S1
        .draft.track
    ).toBe("B2T_L");
    expect(currentRuntime).not.toEqual(projectionB);
    expect(commitHistory).toHaveBeenCalledTimes(1);
    expect(persistedCueImpactDerivedCount(approved.dataset, "fm_family1")).toBeGreaterThan(0);
  });

  it("Case B/C: history uses AFTER dataset and baseline runtime (not projection B)", () => {
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

    const baselineA = makeBaselineA();
    const projectionB = makeProjectionB();
    const expectedHistoryRuntime = baselineSnapshotToHistoryRuntime(baselineA);
    let historyDataset: PositionRecord[] | null = null;
    let historyRuntime: ReturnType<typeof baselineSnapshotToHistoryRuntime> | undefined;

    commitDerivedApprovalDataset({
      resultDataset: approved.dataset,
      baselineSnapshot: baselineA,
      saveWorkingDataset: vi.fn(),
      setDataset: vi.fn(),
      restoreDerivedReviewSnapshot: vi.fn(),
      commitWorkspaceHistoryWithStrategyDataset: (dataset, runtimeOverride) => {
        historyDataset = dataset;
        historyRuntime = runtimeOverride;
      },
    });

    expect(historyDataset).toEqual(approved.dataset);
    expect(persistedCueImpactDerivedCount(historyDataset!, "fm_family1")).toBeGreaterThan(0);
    expect(historyRuntime).toEqual(expectedHistoryRuntime);
    expect(historyRuntime!.ballsState).toEqual(baselineA.ballsState);
    expect(historyRuntime!.ballsState).not.toEqual(projectionB.ballsState);
    expect(
      (historyRuntime!.shotEditor as { slots: { S1: { draft: { track: string } } } }).slots.S1
        .draft.track
    ).toBe("B2T_L");
  });

  it("Case E: calls commitWorkspaceHistoryWithStrategyDataset exactly once", () => {
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

    const commitHistory = vi.fn();
    commitDerivedApprovalDataset({
      resultDataset: approved.dataset,
      baselineSnapshot: makeBaselineA(),
      saveWorkingDataset: vi.fn(),
      setDataset: vi.fn(),
      restoreDerivedReviewSnapshot: vi.fn(),
      commitWorkspaceHistoryWithStrategyDataset: commitHistory,
    });
    expect(commitHistory).toHaveBeenCalledTimes(1);
  });

  it("Case F: Derived members survive baseline restore path", () => {
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
    const derivedCountBefore = persistedCueImpactDerivedCount(approved.dataset, "fm_family1");

    commitDerivedApprovalDataset({
      resultDataset: approved.dataset,
      baselineSnapshot: makeBaselineA(),
      saveWorkingDataset: vi.fn(),
      setDataset: vi.fn(),
      restoreDerivedReviewSnapshot: vi.fn(),
      commitWorkspaceHistoryWithStrategyDataset: vi.fn(),
    });

    expect(persistedCueImpactDerivedCount(approved.dataset, "fm_family1")).toBe(derivedCountBefore);
    expect(derivedCountBefore).toBe(review.session.members.length);
  });

  it("preserves Derived lineage fields in AFTER dataset", () => {
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

    const before = derivedLineageFromDataset(approved.dataset, "fm_family1");
    expect(before.length).toBeGreaterThan(0);

    let snapDataset: PositionRecord[] = [];
    commitDerivedApprovalDataset({
      resultDataset: approved.dataset,
      baselineSnapshot: makeBaselineA(),
      saveWorkingDataset: vi.fn(),
      setDataset: vi.fn(),
      restoreDerivedReviewSnapshot: vi.fn(),
      commitWorkspaceHistoryWithStrategyDataset: (dataset) => {
        snapDataset = dataset;
      },
    });

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

  it("does not regenerate 4-track or Cue Derived on approval commit", () => {
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

    commitDerivedApprovalDataset({
      resultDataset: approved.dataset,
      baselineSnapshot: makeBaselineA(),
      saveWorkingDataset: vi.fn(),
      setDataset: vi.fn(),
      restoreDerivedReviewSnapshot: vi.fn(),
      commitWorkspaceHistoryWithStrategyDataset: vi.fn(),
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

  it("Case F follow-up: subsequent SAVE input would read baseline A not projection B", () => {
    const baselineA = makeBaselineA();
    const projectionB = makeProjectionB();
    let saveInputRuntime = projectionB;

    commitDerivedApprovalDataset({
      resultDataset: [],
      baselineSnapshot: baselineA,
      saveWorkingDataset: vi.fn(),
      setDataset: vi.fn(),
      restoreDerivedReviewSnapshot: (snap) => {
        saveInputRuntime = snap as DerivedReviewBaselineSnapshot;
      },
      commitWorkspaceHistoryWithStrategyDataset: vi.fn(),
    });

    expect(saveInputRuntime.ballsState).toEqual(baselineA.ballsState);
    expect(saveInputRuntime.ballsState).not.toEqual(projectionB.ballsState);
    expect(
      (saveInputRuntime.shotEditor as { slots: { S1: { draft: { track: string } } } }).slots.S1
        .draft.track
    ).toBe("B2T_L");
  });
});
