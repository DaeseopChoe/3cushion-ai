/**
 * Phase 3A-359C — Manual Extension C7/C8 geometry helper tests.
 */

import { describe, expect, it } from "vitest";
import {
  MANUAL_EXTENSION_DIRECTION_EPS_RG,
  deriveManualExtensionCushions,
  deriveManualExtensionCushionsFromPayload,
} from "./deriveManualExtensionCushions";
import type { TrajectoryExtensionPayload } from "./model";

const BOTTOM_E1 = { x: 40, y: 0 };
const TOP_NEAR = { x: 25, y: 40 - 0.5 }; // within EPS_RAIL=3
const INTERIOR = { x: 40, y: 20 };
const OUT_OF_TABLE = { x: 100, y: 50 };

function expectExactRailPoint(
  p: { x: number; y: number },
  rail: "TOP" | "BOTTOM" | "LEFT" | "RIGHT"
) {
  if (rail === "TOP") expect(p.y).toBe(40);
  if (rail === "BOTTOM") expect(p.y).toBe(0);
  if (rail === "LEFT") expect(p.x).toBe(0);
  if (rail === "RIGHT") expect(p.x).toBe(80);
}

describe("deriveManualExtensionCushions — C7", () => {
  it("C7-1: E1 on rail → C7 = normalized E1", () => {
    const result = deriveManualExtensionCushions({ e1: BOTTOM_E1 });
    expect(result.c7Reason).toBe("ok");
    expect(result.c7).not.toBeNull();
    expect(result.c7!.rail).toBe("BOTTOM");
    expect(result.c7!.point).toEqual({ x: 40, y: 0 });
    expect(result.c8).toBeNull();
    expect(result.c8Reason).toBe("missing_e2");
  });

  it("C7-2: near-rail E1 snaps/normalizes to rail", () => {
    const result = deriveManualExtensionCushions({ e1: TOP_NEAR });
    expect(result.c7Reason).toBe("ok");
    expect(result.c7).not.toBeNull();
    expect(result.c7!.rail).toBe("TOP");
    expect(result.c7!.point.y).toBe(40);
    expect(result.c7!.point.x).toBeCloseTo(25, 6);
    expectExactRailPoint(result.c7!.point, "TOP");
  });

  it("C7-3: interior E1 → fail-closed (no invented C7)", () => {
    const result = deriveManualExtensionCushions({ e1: INTERIOR });
    expect(result.c7).toBeNull();
    expect(result.c8).toBeNull();
    expect(result.c7Reason).toBe("e1_not_on_rail");
  });

  it("C7-4: out-of-table E1 → fail-closed", () => {
    const result = deriveManualExtensionCushions({ e1: OUT_OF_TABLE });
    expect(result.c7).toBeNull();
    expect(result.c7Reason).toBe("e1_out_of_table");
  });

  it("missing / invalid E1 → fail-closed", () => {
    expect(deriveManualExtensionCushions({}).c7Reason).toBe("missing_e1");
    expect(
      deriveManualExtensionCushions({ e1: { x: NaN, y: 0 } }).c7Reason
    ).toBe("invalid_e1");
  });
});

describe("deriveManualExtensionCushions — C8", () => {
  it("C8-1: valid C7→E2 → first next cushion = C8", () => {
    // C7 on BOTTOM at (40,0); E2 above-right → should hit TOP or RIGHT
    const e2 = { x: 55, y: 15 };
    const result = deriveManualExtensionCushions({ e1: BOTTOM_E1, e2 });
    expect(result.c7Reason).toBe("ok");
    expect(result.c8Reason).toBe("ok");
    expect(result.c8).not.toBeNull();
    expect(result.c8!.rail).not.toBe("BOTTOM"); // same-rail excluded
    expectExactRailPoint(result.c8!.point, result.c8!.rail);
  });

  it("C8-2: E2 absent → C7 only", () => {
    const result = deriveManualExtensionCushions({ e1: BOTTOM_E1 });
    expect(result.c7).not.toBeNull();
    expect(result.c8).toBeNull();
    expect(result.c8Reason).toBe("missing_e2");
  });

  it("C8-3: E2 ≈ C7 → degenerate direction, no C8", () => {
    const e2 = {
      x: BOTTOM_E1.x + MANUAL_EXTENSION_DIRECTION_EPS_RG / 2,
      y: BOTTOM_E1.y,
    };
    const result = deriveManualExtensionCushions({ e1: BOTTOM_E1, e2 });
    expect(result.c7).not.toBeNull();
    expect(result.c8).toBeNull();
    expect(result.c8Reason).toBe("degenerate_direction");
  });

  it("C8-4: bad outward direction → no invented C8", () => {
    // From BOTTOM (40,0) pointing further downward (out of table)
    const e2 = { x: 40, y: -5 };
    const result = deriveManualExtensionCushions({ e1: BOTTOM_E1, e2 });
    expect(result.c7).not.toBeNull();
    expect(result.c8).toBeNull();
    expect(result.c8Reason).toBe("no_next_cushion");
  });

  it("C8-5: same-rail immediate re-hit prevented (C8 ≠ C7 rail)", () => {
    // Direction almost along BOTTOM toward RIGHT — next hit should be RIGHT, not BOTTOM
    const e2 = { x: 70, y: 0.01 };
    const result = deriveManualExtensionCushions({
      e1: BOTTOM_E1,
      e2,
    });
    expect(result.c7!.rail).toBe("BOTTOM");
    expect(result.c8Reason).toBe("ok");
    expect(result.c8).not.toBeNull();
    expect(result.c8!.rail).toBe("RIGHT");
    expect(result.c8!.point.x).toBe(80);
  });

  it("C8-6: corner-ish direction follows existing primitive (no new corner physics)", () => {
    // From LEFT (0, 20) toward upper-right corner region
    const e1 = { x: 0, y: 20 };
    const e2 = { x: 10, y: 30 };
    const result = deriveManualExtensionCushions({ e1, e2 });
    expect(result.c7Reason).toBe("ok");
    expect(result.c7!.rail).toBe("LEFT");
    // Existing findNextCushionHit: first valid among non-LEFT rails
    if (result.c8Reason === "ok") {
      expect(result.c8).not.toBeNull();
      expect(result.c8!.rail).not.toBe("LEFT");
      expectExactRailPoint(result.c8!.point, result.c8!.rail);
    } else {
      expect(result.c8).toBeNull();
    }
  });
});

describe("deriveManualExtensionCushions — durability / purity", () => {
  it("SAVE/Recall payload endpoints → same C7/C8", () => {
    const e1 = { x: 10, y: 40 };
    const e2 = { x: 30, y: 25 };
    const payload: TrajectoryExtensionPayload = {
      extensionSchemaVersion: 1,
      origin: { kind: "path_node", source: "corrected" },
      items: [
        {
          id: "EXT-S1-01",
          index: 1,
          endpoint: { ...e1 },
          userEdited: true,
          createdAt: "2026-08-24T00:00:00.000Z",
          updatedAt: "2026-08-24T00:00:00.000Z",
        },
        {
          id: "EXT-S1-02",
          index: 2,
          endpoint: { ...e2 },
          userEdited: true,
          createdAt: "2026-08-24T00:00:00.000Z",
          updatedAt: "2026-08-24T00:00:00.000Z",
        },
      ],
    };

    const fromPayload = deriveManualExtensionCushionsFromPayload(payload);
    const fromPoints = deriveManualExtensionCushions({ e1, e2 });
    expect(fromPayload).toEqual(fromPoints);
    expect(fromPayload.c7Reason).toBe("ok");
    expect(fromPayload.c8Reason).toBe("ok");
  });

  it("does not mutate trajectoryExtensions / endpoint input", () => {
    const e1 = { x: 40, y: 0 };
    const e2 = { x: 50, y: 10 };
    const payload: TrajectoryExtensionPayload = {
      extensionSchemaVersion: 1,
      origin: { kind: "path_node", source: "corrected" },
      items: [
        {
          id: "EXT-S1-01",
          index: 1,
          endpoint: e1,
          userEdited: false,
          createdAt: "t0",
          updatedAt: "t0",
        },
        {
          id: "EXT-S1-02",
          index: 2,
          endpoint: e2,
          userEdited: false,
          createdAt: "t0",
          updatedAt: "t0",
        },
      ],
    };
    const e1Before = { ...e1 };
    const e2Before = { ...e2 };
    const itemsBefore = JSON.stringify(payload.items);

    const result = deriveManualExtensionCushionsFromPayload(payload);
    expect(result.c7).not.toBeNull();

    expect(e1).toEqual(e1Before);
    expect(e2).toEqual(e2Before);
    expect(JSON.stringify(payload.items)).toBe(itemsBefore);
    // Returned points are clones
    if (result.c7) {
      result.c7.point.x = -999;
      expect(payload.items[0]!.endpoint.x).toBe(e1Before.x);
    }
  });
});
