/**
 * Display Runtime HPT SSOT — Browser-grounded regression.
 * Run: npx vitest run src/domain/family/hptDisplayRuntime.test.ts
 */

import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import type { StrategyEntry } from "../positionSearchEngine";
import { buildUserHptViewModel } from "../userHptViewModel";
import { buildUserInfoPanel } from "../userInfoPanelModel";
import {
  runtimeHptFromStrategyEntry,
  displayHptFromStrategyEntry,
} from "../slotDraftFromEntry";
import { computeHptVizGeometry } from "../hptVizGeometry";
import { resolveFamilyHpt } from "./hptResolver";
import { FAMILY_TRACKS, type FamilyTrack } from "./trackSymmetry";
import { resolveCoachingThicknessT } from "../displayHptCoaching";
import { computeCoachingState } from "../../hooks/useCoachingController";
import { calcImpactBall } from "../../data/system/calculator";
import { applyAdminRecallTargetLockHydrate } from "../system/adminEditSessionContract";
import { runAdminSearch, type AdminSearchFlowContext } from "../../application/flows/adminSearchFlow";
import type { PositionRecord } from "../positionSearchEngine";
import { __clearPublishedDatasetStoreForTests } from "../publishedDatasetStore";

const canonicalHpt = {
  T: "-5/8",
  hit_point: { x: -2, y: 1.5 },
  mode: "TIP",
  tipCount: 2,
} as const;

const AUTHORED_TRACK: FamilyTrack = "B2T_R";

const SYMMETRY_OP_BY_TRACK: Record<FamilyTrack, "identity" | "H" | "V" | "RPI"> = {
  B2T_R: "identity",
  B2T_L: "H",
  T2B_L: "V",
  T2B_R: "RPI",
};

function familyEntryForTrack(track: FamilyTrack): StrategyEntry {
  const op = SYMMETRY_OP_BY_TRACK[track];
  const authored = track === AUTHORED_TRACK;
  return {
    slot: "S1",
    track,
    familyId: "fm_test_4track",
    memberOrigin: authored ? "AUTHORED" : "SYMMETRY",
    ...(authored ? {} : { symmetryOp: op === "identity" ? "H" : op }),
    hpT: { ...canonicalHpt, hit_point: { ...canonicalHpt.hit_point } },
  } as StrategyEntry;
}

function thicknessMagnitude(T: string): number {
  if (T === "8/8" || T === "BANK") return 8;
  const match = T.match(/^([+-]?)(\d+)\/8$/);
  if (!match) return 0;
  return parseInt(match[2], 10);
}

function lateralSignFromT(T: string): number {
  const geom = computeHptVizGeometry(T, 0, 0);
  return Math.sign(geom.impactX - geom.targetX);
}

function displayLayersFromEntry(entry: StrategyEntry) {
  const runtimeHpt = runtimeHptFromStrategyEntry(entry) as {
    T: string;
    hit_point: { x: number; y: number };
  };
  const displayHpt = displayHptFromStrategyEntry(entry) as {
    T: string;
    hit_point: { x: number; y: number };
  };
  const vm = buildUserHptViewModel({ hpt: runtimeHpt, displayHpt });
  const coachingT = resolveCoachingThicknessT({
    canEdit: false,
    displayHptT: displayHpt.T,
    viewUiHptT: "-3/8",
    viewDisplayThickness: "3/8",
  });
  const infoPanel = buildUserInfoPanel({
    hpt: displayHpt,
    slotRenderSys: { shotType: "옆돌리기", systemId: "5_half_system", track: entry.track },
  });
  return { runtimeHpt, displayHpt, vm, coachingT, infoPanel };
}

const CUE = { x: 20, y: 16 };
const TARGET = { x: 60, y: 20 };

describe("Display Runtime HPT — 4-track Browser contract", () => {
  it("T1 — B2T_R same-handedness: display matches canonical/runtime", () => {
    const { runtimeHpt, displayHpt, vm, coachingT } = displayLayersFromEntry(
      familyEntryForTrack("B2T_R")
    );
    expect(displayHpt.T).toBe("-5/8");
    expect(displayHpt.hit_point.x).toBe(-2);
    expect(runtimeHpt.T).toBe("-5/8");
    expect(vm.thicknessLabel).toBe("좌측 5/8");
    expect(vm.viz!.T).toBe("-5/8");
    expect(coachingT).toBe("-5/8");
    expect(lateralSignFromT(displayHpt.T)).toBe(-1);
  });

  it("T2 — T2B_R same-handedness: display matches canonical/runtime", () => {
    const { displayHpt, vm, coachingT } = displayLayersFromEntry(
      familyEntryForTrack("T2B_R")
    );
    expect(displayHpt.T).toBe("-5/8");
    expect(vm.viz!.T).toBe("-5/8");
    expect(coachingT).toBe("-5/8");
    expect(lateralSignFromT(displayHpt.T)).toBe(-1);
  });

  it("T3 — B2T_L opposite-handedness: coupled T + hit.x transform", () => {
    const { runtimeHpt, displayHpt, vm, coachingT } = displayLayersFromEntry(
      familyEntryForTrack("B2T_L")
    );
    expect(runtimeHpt.T).toBe("+5/8");
    expect(runtimeHpt.hit_point.x).toBe(2);
    expect(displayHpt.T).toBe("+5/8");
    expect(displayHpt.hit_point.x).toBe(2);
    expect(displayHpt.T.startsWith("+")).toBe(displayHpt.hit_point.x > 0);
    expect(vm.thicknessLabel).toBe("우측 5/8");
    expect(vm.viz!.T).toBe("+5/8");
    expect(coachingT).toBe("+5/8");
    expect(lateralSignFromT(displayHpt.T)).toBe(1);
  });

  it("T4 — T2B_L opposite-handedness: coupled T + hit.x transform", () => {
    const { displayHpt, vm, coachingT } = displayLayersFromEntry(
      familyEntryForTrack("T2B_L")
    );
    expect(displayHpt.T).toBe("+5/8");
    expect(displayHpt.hit_point.x).toBe(2);
    expect(vm.viz!.T).toBe("+5/8");
    expect(coachingT).toBe("+5/8");
    expect(lateralSignFromT(displayHpt.T)).toBe(1);
  });

  it("T5 — magnitude preserved across 4 tracks", () => {
    for (const track of FAMILY_TRACKS) {
      const { displayHpt } = displayLayersFromEntry(familyEntryForTrack(track));
      expect(thicknessMagnitude(displayHpt.T)).toBe(5);
    }
  });

  it("T6 — physics runtime mirror contract preserved", () => {
    const opposite = resolveFamilyHpt({
      authoredTrack: AUTHORED_TRACK,
      requestedTrack: "B2T_L",
      canonicalHpt,
    });
    expect(opposite.mirrored).toBe(true);
    const hpt = opposite.hpt as { T: string; hit_point: { x: number } };
    expect(hpt.T).toBe("+5/8");
    expect(hpt.hit_point.x).toBe(2);
  });

  it("T7 — modal label T === modal SVG T === table coaching T", () => {
    for (const track of FAMILY_TRACKS) {
      const { displayHpt, vm, coachingT } = displayLayersFromEntry(
        familyEntryForTrack(track)
      );
      expect(vm.viz!.T).toBe(displayHpt.T);
      expect(coachingT).toBe(displayHpt.T);
      expect(vm.thicknessLabel).toContain("5/8");
    }
  });

  it("T8 — Mobile-equivalent path uses same display contract", () => {
    const entry = familyEntryForTrack("B2T_L");
    const displayHpt = displayHptFromStrategyEntry(entry) as { T: string };
    const vm = buildUserHptViewModel({
      hpt: runtimeHptFromStrategyEntry(entry) as any,
      displayHpt: displayHpt as any,
    });
    const coachingT = resolveCoachingThicknessT({
      canEdit: false,
      displayHptT: displayHpt.T,
      viewUiHptT: "-3/8",
    });
    expect(vm.viz!.T).toBe("+5/8");
    expect(coachingT).toBe("+5/8");
  });

  it("T9 — AI panel displayed T === HPT modal displayed T", () => {
    for (const track of FAMILY_TRACKS) {
      const { displayHpt, vm, infoPanel } = displayLayersFromEntry(
        familyEntryForTrack(track)
      );
      expect(infoPanel.trajectorySummary.thickness).toContain("5/8");
      expect(infoPanel.hpPreview.thickness).toContain("5/8");
      const modalSide = vm.thicknessLabel.includes("좌측") ? "좌측" : "우측";
      expect(infoPanel.trajectorySummary.thickness).toContain(modalSide);
      expect(displayHpt.T).toBe(vm.viz!.T);
    }
  });

  it("T10 — after recall, coaching uses Display HPT not static view.ui", () => {
    const entry = familyEntryForTrack("B2T_L");
    const displayHpt = displayHptFromStrategyEntry(entry) as { T: string };
    const coachingT = resolveCoachingThicknessT({
      canEdit: false,
      displayHptT: displayHpt.T,
      viewUiHptT: undefined,
      viewDisplayThickness: "3/8",
    });
    expect(coachingT).toBe("+5/8");
    expect(coachingT).not.toBe("-3/8");
  });

  it("T11 — view.ui fallback only when no display HPT", () => {
    const coachingT = resolveCoachingThicknessT({
      canEdit: false,
      displayHptT: undefined,
      viewUiHptT: undefined,
      viewDisplayThickness: "3/8",
    });
    expect(coachingT).toBe("-3/8");
  });

  it("T12 — coaching path: modal T === calcImpactBall T via computeCoachingState", () => {
    const entry = familyEntryForTrack("B2T_L");
    const displayHpt = displayHptFromStrategyEntry(entry) as { T: string };
    const vm = buildUserHptViewModel({
      hpt: runtimeHptFromStrategyEntry(entry) as any,
      displayHpt: displayHpt as any,
    });
    const coachingT = resolveCoachingThicknessT({
      canEdit: false,
      displayHptT: displayHpt.T,
    });
    expect(vm.viz!.T).toBe(coachingT);

    const coaching = computeCoachingState({
      appMode: "USER",
      showCoaching: true,
      canEdit: false,
      T: coachingT,
      impactMode: "CONTACT",
      balls: { cue: CUE, target: TARGET },
      calcImpactBall,
      SCALE: 10,
      TABLE_H: 40,
      PADDING: 0,
      RENDER_RADIUS_RG: 1.5,
      BALL_RADIUS_RG: 1.5,
    });
    expect(coaching.impactBallPx).not.toBeNull();
    const staticWrong = calcImpactBall(CUE, TARGET, "-5/8");
    const displayCorrect = calcImpactBall(CUE, TARGET, coachingT);
    expect(displayCorrect).not.toEqual(staticWrong);
  });

  it("opposite-handedness lateral sign differs from same-handedness", () => {
    const r = displayLayersFromEntry(familyEntryForTrack("B2T_R"));
    const l = displayLayersFromEntry(familyEntryForTrack("B2T_L"));
    expect(lateralSignFromT(r.displayHpt.T)).not.toBe(
      lateralSignFromT(l.displayHpt.T)
    );
  });
});

describe("ADMIN Published Search target hydration (preserved)", () => {
  beforeEach(() => {
    __clearPublishedDatasetStoreForTests();
  });

  afterEach(() => {
    __clearPublishedDatasetStoreForTests();
    vi.restoreAllMocks();
  });

  const recordWithTarget: PositionRecord = {
    positionId: "pub_target_hydrate",
    targetBall: "yellow",
    balls: {
      cue: { x: 19.5, y: 11 },
      target: { x: 20.4, y: 30.6 },
      second: { x: 64.9, y: 22.1 },
    },
    strategies: {
      S1: {
        slot: "S1",
        track: "B2T_R",
        memberOrigin: "AUTHORED",
        hpT: canonicalHpt,
        signature: { systemId: "5_half_system", formulaHash: "v1", shotType: "옆돌리기" },
      },
    },
  };

  it("hydrates target lock on Published Search with record targetBall", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        status: 200,
        ok: true,
        json: async () => ({
          schemaVersion: 2,
          shotType: "옆돌리기",
          systemId: "5_half_system",
          systemLabel: "파이브앤하프",
          records: [recordWithTarget],
        }),
      })
    );

    let hydratedTarget: string | null | undefined;
    const ctx: AdminSearchFlowContext = {
      ballsState: recordWithTarget.balls,
      adminState: { sys: { shotType: "옆돌리기", systemId: "5_half_system" } },
      activeSlot: "S1",
      slots: {},
      isTargetSelected: false,
      targetColor: null,
      userPublishedSearchContext: null,
      setAdminState: vi.fn(),
      setIsAdminPublishedSearchMatched: vi.fn(),
      setAdminTableLayersVisible: vi.fn(),
      setShowCoaching: vi.fn(),
      applyPositionRecall: vi.fn(),
      patchSlotRuntimeMeta: vi.fn(),
      hydrateAdminRecallTarget: (tb) => {
        hydratedTarget = tb;
      },
      clearAdminSearchDisplayRuntime: vi.fn(),
      beginAdminInputSession: () => true,
      getAdminRecallQueryTargetBall: () => null,
      rejectAdminRecallHydrateForMismatch: () => false,
      resolveFormulaHash: () => "v1",
    };

    const ok = await runAdminSearch(ctx);
    expect(ok).toBe(true);
    expect(hydratedTarget).toBe("yellow");
    const lock = applyAdminRecallTargetLockHydrate("yellow");
    expect(lock.isTargetSelected).toBe(true);
  });
});
