/**
 * USER table display thickness SSOT — coaching / trajectory parity.
 * Run: npx vitest run src/domain/displayHptCoaching.test.ts
 */

import { describe, expect, it } from "vitest";
import type { StrategyEntry } from "./positionSearchEngine";
import { buildUserHptViewModel } from "./userHptViewModel";
import { buildUserInfoPanel } from "./userInfoPanelModel";
import {
  runtimeHptFromStrategyEntry,
  displayHptFromStrategyEntry,
} from "./slotDraftFromEntry";
import { resolveFamilyHpt } from "./family/hptResolver";
import { FAMILY_TRACKS, type FamilyTrack } from "./family/trackSymmetry";
import {
  resolveCoachingThicknessT,
  resolveUserTableDisplayThicknessT,
  resolveAdminThicknessForCalc,
} from "./displayHptCoaching";
import { calcImpactBall } from "../data/system/calculator";
import { calculateImpact } from "../utils/physics/impact";
import { buildTrajectory } from "./trajectory/trajectoryBuilder";

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

const CUE = { x: 20, y: 16 };
const TARGET = { x: 60, y: 20 };

function displayLayers(track: FamilyTrack) {
  const entry = familyEntryForTrack(track);
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
  const tableDisplayT = resolveUserTableDisplayThicknessT({
    userDisplayHptT: displayHpt.T,
    userTableDisplaySlotId: "S1",
    slots: {
      S1: { draft: { displayHpt, hpt: runtimeHpt } },
      S2: {
        draft: {
          displayHpt: { T: "-5/8" },
          hpt: { T: "-5/8" },
        },
      },
    },
    viewUiHptT: "-3/8",
    viewDisplayThickness: "3/8",
  });
  const infoPanel = buildUserInfoPanel({
    hpt: displayHpt,
    slotRenderSys: { shotType: "옆돌리기", systemId: "5_half_system", track },
  });
  return { runtimeHpt, displayHpt, vm, coachingT, tableDisplayT, infoPanel };
}

describe("USER table display thickness SSOT", () => {
  it("T1 — B2T_R: modal T == coaching T == table display T", () => {
    const { displayHpt, vm, coachingT, tableDisplayT } = displayLayers("B2T_R");
    expect(displayHpt.T).toBe("-5/8");
    expect(vm.viz!.T).toBe("-5/8");
    expect(coachingT).toBe("-5/8");
    expect(tableDisplayT).toBe("-5/8");
  });

  it("T2 — T2B_R: modal T == coaching T == table display T", () => {
    const { displayHpt, vm, coachingT, tableDisplayT } = displayLayers("T2B_R");
    expect(displayHpt.T).toBe("-5/8");
    expect(vm.viz!.T).toBe(coachingT);
    expect(tableDisplayT).toBe(coachingT);
  });

  it("T3 — B2T_L: Display T = +5/8; table impact matches coaching, not canonical", () => {
    const { displayHpt, coachingT, tableDisplayT } = displayLayers("B2T_L");
    expect(displayHpt.T).toBe("+5/8");
    expect(coachingT).toBe("+5/8");
    expect(tableDisplayT).toBe("+5/8");
    const displayImpact = calcImpactBall(CUE, TARGET, tableDisplayT);
    const coachingImpact = calcImpactBall(CUE, TARGET, coachingT);
    const canonicalWrong = calcImpactBall(CUE, TARGET, "-5/8");
    expect(displayImpact).toEqual(coachingImpact);
    expect(displayImpact).not.toEqual(canonicalWrong);
  });

  it("T4 — T2B_L: Display T = +5/8; table display matches coaching", () => {
    const { coachingT, tableDisplayT } = displayLayers("T2B_L");
    expect(tableDisplayT).toBe("+5/8");
    expect(tableDisplayT).toBe(coachingT);
  });

  it("T5 — Display hit_point.x mirrors with T sign across opposite tracks", () => {
    for (const track of FAMILY_TRACKS) {
      const { displayHpt } = displayLayers(track);
      expect(displayHpt.T.startsWith("+")).toBe(displayHpt.hit_point.x > 0);
      expect(displayHpt.T.startsWith("-")).toBe(displayHpt.hit_point.x < 0);
    }
  });

  it("T6 — AI panel thickness == modal thickness", () => {
    for (const track of FAMILY_TRACKS) {
      const { vm, infoPanel } = displayLayers(track);
      expect(infoPanel.hpPreview.thickness).toContain("5/8");
      const modalSide = vm.thicknessLabel!.includes("좌측") ? "좌측" : "우측";
      expect(infoPanel.trajectorySummary.thickness).toContain(modalSide);
    }
  });

  it("T7 — static view.ui thickness does not override Display Runtime HPT", () => {
    const displayHpt = displayHptFromStrategyEntry(
      familyEntryForTrack("B2T_L")
    ) as { T: string };
    const tableT = resolveUserTableDisplayThicknessT({
      userDisplayHptT: displayHpt.T,
      userTableDisplaySlotId: "S1",
      slots: { S1: { draft: { displayHpt } } },
      viewUiHptT: "-3/8",
      viewDisplayThickness: "3/8",
    });
    expect(tableT).toBe("+5/8");
    expect(tableT).not.toBe("-3/8");
  });

  it("T8 — userTableDisplaySlotId S2 used when activeSlot would be S1", () => {
    const displayS2 = displayHptFromStrategyEntry(
      familyEntryForTrack("B2T_L")
    ) as { T: string };
    const displayS1 = displayHptFromStrategyEntry(
      familyEntryForTrack("B2T_R")
    ) as { T: string };
    const tableT = resolveUserTableDisplayThicknessT({
      userDisplayHptT: undefined,
      userTableDisplaySlotId: "S2",
      slots: {
        S1: { draft: { displayHpt: displayS1 } },
        S2: { draft: { displayHpt: displayS2 } },
      },
      viewUiHptT: "-3/8",
    });
    expect(tableT).toBe("+5/8");
    expect(tableT).not.toBe("-5/8");
  });

  it("T9 — PC/Mobile parity: same display payload → same table display T", () => {
    const entry = familyEntryForTrack("B2T_L");
    const displayHpt = displayHptFromStrategyEntry(entry) as { T: string };
    const slots = {
      S1: {
        draft: {
          displayHpt,
          hpt: runtimeHptFromStrategyEntry(entry),
        },
      },
    };
    const a = resolveUserTableDisplayThicknessT({
      userDisplayHptT: displayHpt.T,
      userTableDisplaySlotId: "S1",
      slots,
    });
    const b = resolveUserTableDisplayThicknessT({
      userDisplayHptT: displayHpt.T,
      userTableDisplaySlotId: "S1",
      slots,
    });
    expect(a).toBe(b);
    expect(a).toBe("+5/8");
  });

  it("T10 — Physics Runtime HPT resolver unchanged", () => {
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

  it("T11 — trajectory impactRaw uses display thickness when wired", () => {
    const displayT = "+5/8";
    const physicsT = "-5/8";
    const impactDisplay = calculateImpact(
      CUE,
      TARGET,
      CUE,
      TARGET,
      displayT,
      "뒤돌리기",
      1.73,
      0.865
    );
    const impactPhysics = calculateImpact(
      CUE,
      TARGET,
      CUE,
      TARGET,
      physicsT,
      "뒤돌리기",
      1.73,
      0.865
    );
    expect(impactDisplay).not.toEqual(impactPhysics);
    const coachingImpact = calcImpactBall(CUE, TARGET, displayT);
    expect(impactDisplay?.x).toBeCloseTo(coachingImpact!.x, 3);
    expect(impactDisplay?.y).toBeCloseTo(coachingImpact!.y, 3);
  });

  it("T12 — buildTrajectory displayImpactContactThicknessT overrides stale adminState", () => {
    const displayT = "+5/8";
    const staleAdminT = "-5/8";
    const minimalInput = {
      anchors: {},
      rawAnchors: {},
      resolveAnchorCtx: { track: "B2T_L", systemId: "5_half_system" },
      balls: { cue: CUE, target: TARGET },
      adminState: { hpt: { T: staleAdminT } },
      thicknessForCalc: displayT,
      displayImpactContactThicknessT: displayT,
      shotPattern: "뒤돌리기",
      hitTolerance: 2,
      ballDiameterRg: 1.73,
      ballRadiusRg: 0.865,
    };
    const result = buildTrajectory(minimalInput);
    const expected = calcImpactBall(CUE, TARGET, displayT);
    expect(result.impact.contactRg?.x).toBeCloseTo(expected!.x, 3);
    expect(result.impact.contactRg?.y).toBeCloseTo(expected!.y, 3);
    expect(result.impact.raw?.x).toBeCloseTo(expected!.x, 3);
  });
});

describe("ADMIN thicknessForCalc — physics path preserved", () => {
  it("uses adminState.hpt.T first", () => {
    expect(
      resolveAdminThicknessForCalc({
        adminStateHptT: "-5/8",
        activeSlot: "S1",
        slots: { S1: { draft: { hpt: { T: "+5/8" } } } },
      })
    ).toBe("-5/8");
  });
});
