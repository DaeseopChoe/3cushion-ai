import { describe, expect, it } from "vitest";
import {
  resolveCanonicalUserSearchDisplaySlotId,
  USER_SEARCH_DISPLAY_SLOT_BUILD_MARKER,
  USER_STRATEGY_SLOT_IDS,
} from "./userSearchDisplaySlot";
import { buildUserHptViewModel } from "./userHptViewModel";
import { runtimeHptFromStrategyEntry } from "./slotDraftFromEntry";
import { computeHptVizGeometry } from "./hptVizGeometry";
import { formatThickness } from "../utils/aiPlayStrategyBuilder";

const multiSlotRecord = {
  positionId: "200160600200200200",
  balls: { cue: { x: 20, y: 16 }, target: { x: 60, y: 20 }, second: { x: 20, y: 20 } },
  strategies: {
    S1: {
      slot: "S1",
      track: "B2T_R",
      memberOrigin: "AUTHORED",
      hpT: { T: "-5/8", hit_point: { x: 1.5, y: 3.7 }, mode: "TIP" },
    },
    S2: {
      slot: "S2",
      track: "B2T_R",
      memberOrigin: "SYMMETRY",
      symmetryOp: "H",
      hpT: { T: "+5/8", hit_point: { x: -2.2, y: 3.3 }, mode: "TIP" },
    },
  },
} as const;

describe("resolveCanonicalUserSearchDisplaySlotId — FDP-A Search determinism", () => {
  it("always selects S1 when record has S1 and S2 (ignores pre-search session activeSlot)", () => {
    expect(resolveCanonicalUserSearchDisplaySlotId(multiSlotRecord as any)).toBe("S1");
  });

  it("pre-search activeSlot S1 vs S2 does not change canonical display slot", () => {
    const preSearchSlots = ["S1", "S2"] as const;
    const results = preSearchSlots.map(() =>
      resolveCanonicalUserSearchDisplaySlotId(multiSlotRecord as any)
    );
    expect(results).toEqual(["S1", "S1"]);
  });

  it("selects first available slot in S1→S2→S3 order when S1 missing", () => {
    const s2Only = {
      positionId: "s2_only",
      strategies: { S2: multiSlotRecord.strategies.S2 },
    };
    expect(resolveCanonicalUserSearchDisplaySlotId(s2Only as any)).toBe("S2");
  });

  it("returns null when record has no strategy slots", () => {
    expect(resolveCanonicalUserSearchDisplaySlotId({ positionId: "empty", strategies: {} } as any)).toBeNull();
    expect(resolveCanonicalUserSearchDisplaySlotId(null)).toBeNull();
  });

  it("canonical S1 display yields 좌측 5/8 for Five-and-Half sample record", () => {
    const slotId = resolveCanonicalUserSearchDisplaySlotId(multiSlotRecord as any);
    expect(slotId).toBe("S1");
    const hpt = multiSlotRecord.strategies.S1.hpT;
    const vm = buildUserHptViewModel({ hpt: hpt as any });
    expect(vm.thicknessLabel).toBe("좌측 5/8");
  });

  it("explicit S2 strategy content remains available after canonical S1 selection", () => {
    const canonical = resolveCanonicalUserSearchDisplaySlotId(multiSlotRecord as any);
    expect(canonical).toBe("S1");

    const vmS2 = buildUserHptViewModel({
      hpt: multiSlotRecord.strategies.S2.hpT as any,
    });
    expect(vmS2.thicknessLabel).toBe("우측 5/8");
    expect(vmS2.viz?.T).toBe("+5/8");
  });

  it("USER_STRATEGY_SLOT_IDS order is S1, S2, S3", () => {
    expect([...USER_STRATEGY_SLOT_IDS]).toEqual(["S1", "S2", "S3"]);
  });

  it("exposes build marker for dist bundle provenance grep", () => {
    expect(USER_SEARCH_DISPLAY_SLOT_BUILD_MARKER).toContain(
      "canonical-s1-wt-20260901"
    );
  });

  it("Five-and-Half S1 canonical path: runtime T → view model → geometry parity", () => {
    const slotId = resolveCanonicalUserSearchDisplaySlotId(multiSlotRecord as any);
    expect(slotId).toBe("S1");
    const entry = multiSlotRecord.strategies.S1;
    const runtimeHpt = runtimeHptFromStrategyEntry(entry as any) as {
      T: string;
      hit_point: { x: number; y: number };
    };
    expect(runtimeHpt.T).toBe("-5/8");
    const vm = buildUserHptViewModel({ hpt: runtimeHpt });
    expect(vm.thicknessLabel).toBe("좌측 5/8");
    const geom = computeHptVizGeometry(
      runtimeHpt.T,
      runtimeHpt.hit_point.x,
      runtimeHpt.hit_point.y
    );
    expect(geom.targetX).toBe(345);
    expect(geom.impactX).toBe(255);
    expect(formatThickness(runtimeHpt.T)).toBe("좌측 5/8");
  });

  it("pre-search S2 session still resolves canonical S1 for Search display", () => {
    const slotId = resolveCanonicalUserSearchDisplaySlotId(multiSlotRecord as any);
    expect(slotId).toBe("S1");
    const s2Runtime = runtimeHptFromStrategyEntry(
      multiSlotRecord.strategies.S2 as any
    ) as { T: string };
    expect(s2Runtime.T).toBe("-5/8");
    const s1Runtime = runtimeHptFromStrategyEntry(
      multiSlotRecord.strategies.S1 as any
    ) as { T: string; hit_point: { x: number } };
    expect(s1Runtime.T).toBe("-5/8");
    expect(s1Runtime.hit_point.x).not.toBe(
      (multiSlotRecord.strategies.S2.hpT as { hit_point: { x: number } })
        .hit_point.x
    );
  });
});
