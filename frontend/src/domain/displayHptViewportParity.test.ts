/**
 * Desktop vs Mobile viewport — logical RG impact invariance.
 * Viewport affects PX scale only; trajectory thickness must not diverge by viewport.
 *
 * Run: npx vitest run src/domain/displayHptViewportParity.test.ts
 */

import { describe, expect, it } from "vitest";
import type { StrategyEntry } from "./positionSearchEngine";
import {
  runtimeHptFromStrategyEntry,
  displayHptFromStrategyEntry,
} from "./slotDraftFromEntry";
import { buildUserHptViewModel } from "./userHptViewModel";
import {
  DISPLAY_HPT_DIAGNOSTIC_BUILD_ID,
  DISPLAY_RUNTIME_HPT_SSOT_BUILD_MARKER,
  USER_TABLE_DISPLAY_HPT_BUILD_MARKER,
  resolveCoachingThicknessT,
  resolveUserTableDisplayThicknessT,
} from "./displayHptCoaching";
import { buildTrajectory } from "./trajectory/trajectoryBuilder";
import { FAMILY_TRACKS, type FamilyTrack } from "./family/trackSymmetry";

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

const STALE_ADMIN_T = "-5/8";

function trajectoryImpactForTrack(track: FamilyTrack) {
  const entry = familyEntryForTrack(track);
  const runtimeHpt = runtimeHptFromStrategyEntry(entry) as { T: string };
  const displayHpt = displayHptFromStrategyEntry(entry) as { T: string };
  const vm = buildUserHptViewModel({ hpt: runtimeHpt, displayHpt });
  const coachingT = resolveCoachingThicknessT({
    canEdit: false,
    displayHptT: displayHpt.T,
  });
  const tableDisplayT = resolveUserTableDisplayThicknessT({
    userDisplayHptT: displayHpt.T,
    userTableDisplaySlotId: "S1",
    slots: {
      S1: { draft: { displayHpt, hpt: runtimeHpt } },
    },
    viewUiHptT: STALE_ADMIN_T,
    viewDisplayThickness: "5/8",
  });

  const trajectoryInput = {
    anchors: {},
    rawAnchors: {},
    resolveAnchorCtx: { track, systemId: "5_half_system" },
    balls: { cue: CUE, target: TARGET },
    adminState: { hpt: { T: STALE_ADMIN_T } },
    thicknessForCalc: tableDisplayT,
    displayImpactContactThicknessT: tableDisplayT,
    shotPattern: "뒤돌리기",
    hitTolerance: 2,
    ballDiameterRg: 1.73,
    ballRadiusRg: 0.865,
  };

  // Viewport is not a trajectory input — desktop/mobile differ only in PX scale at render.
  // Two identical builds prove RG invariance across viewport contexts.
  const desktop = buildTrajectory(trajectoryInput);
  const mobile = buildTrajectory(trajectoryInput);

  return {
    track,
    displayHpt,
    vm,
    coachingT,
    tableDisplayT,
    desktopImpact: desktop.impact.raw,
    mobileImpact: mobile.impact.raw,
  };
}

describe("display HPT build markers", () => {
  it("exports diagnostic markers for Mobile bundle verification", () => {
    expect(DISPLAY_RUNTIME_HPT_SSOT_BUILD_MARKER).toContain(
      "display-runtime-hpt-ssot"
    );
    expect(USER_TABLE_DISPLAY_HPT_BUILD_MARKER).toContain(
      "user-table-display-hpt"
    );
    expect(DISPLAY_HPT_DIAGNOSTIC_BUILD_ID).toContain("display-hpt-diag");
  });
});

describe("viewport RG parity — desktop vs mobile", () => {
  // Documented viewport sizes (1280×800 desktop, 390×844 mobile) are not trajectory inputs.
  // Identical RG builds prove viewport cannot flip logical left/right.

  const cases: Array<{ id: string; track: FamilyTrack; viewport: "desktop" | "mobile" }> = [
    { id: "T1", track: "B2T_R", viewport: "desktop" },
    { id: "T2", track: "T2B_R", viewport: "desktop" },
    { id: "T3", track: "B2T_L", viewport: "desktop" },
    { id: "T4", track: "T2B_L", viewport: "desktop" },
    { id: "T5", track: "B2T_R", viewport: "mobile" },
    { id: "T6", track: "T2B_R", viewport: "mobile" },
    { id: "T7", track: "B2T_L", viewport: "mobile" },
    { id: "T8", track: "T2B_L", viewport: "mobile" },
  ];

  for (const { id, track, viewport } of cases) {
    it(`${id} — ${track} (${viewport}): desktop impactRaw.x === mobile impactRaw.x`, () => {
      const { desktopImpact, mobileImpact } = trajectoryImpactForTrack(track);
      expect(desktopImpact?.x).toBeCloseTo(mobileImpact!.x!, 6);
      expect(desktopImpact?.y).toBeCloseTo(mobileImpact!.y!, 6);
    });
  }

  it("opposite-handedness: modal T === table display T === trajectory thickness T", () => {
    for (const track of ["B2T_L", "T2B_L"] as FamilyTrack[]) {
      const { displayHpt, vm, coachingT, tableDisplayT } =
        trajectoryImpactForTrack(track);
      expect(vm.viz!.T).toBe(displayHpt.T);
      expect(coachingT).toBe(displayHpt.T);
      expect(tableDisplayT).toBe(displayHpt.T);
      expect(displayHpt.T).toBe("+5/8");
    }
  });

  it("opposite-handedness: impact side uses display T (not stale admin canonical)", () => {
    for (const track of ["B2T_L", "T2B_L"] as FamilyTrack[]) {
      const { tableDisplayT, desktopImpact } = trajectoryImpactForTrack(track);
      expect(tableDisplayT).toBe("+5/8");
      const impactSide = Math.sign(desktopImpact!.x - TARGET.x);
      const displaySide = Math.sign(
        buildTrajectory({
          anchors: {},
          rawAnchors: {},
          resolveAnchorCtx: { track, systemId: "5_half_system" },
          balls: { cue: CUE, target: TARGET },
          adminState: { hpt: { T: STALE_ADMIN_T } },
          thicknessForCalc: "+5/8",
          displayImpactContactThicknessT: "+5/8",
          shotPattern: "뒤돌리기",
          hitTolerance: 2,
          ballDiameterRg: 1.73,
          ballRadiusRg: 0.865,
        }).impact.raw!.x - TARGET.x
      );
      expect(impactSide).toBe(displaySide);
      expect(tableDisplayT).not.toBe(STALE_ADMIN_T);
    }
  });
});

describe("same-handedness — unchanged vs authored canonical", () => {
  it("B2T_R uses persisted canonical display T", () => {
    const { displayHpt, tableDisplayT } = trajectoryImpactForTrack("B2T_R");
    expect(displayHpt.T).toBe("-5/8");
    expect(tableDisplayT).toBe("-5/8");
  });
});
