/**
 * Phase F-3C.2 — C2 reflectionOverride H/V/RPI projection.
 *
 * {rail, t}: TOP/BOTTOM t runs LEFT(0) → RIGHT(1); LEFT/RIGHT t runs BOTTOM(0) → TOP(1).
 * Projection = decode to the table point, apply the Family transformPoint, re-encode on the
 * explicitly mapped rail (never re-detected from the point).
 */
import { describe, expect, it } from "vitest";
import type { Rail } from "../reflectionEngine";
import {
  C2_RAIL_EDGE_EPS,
  railPointFromT,
  railTBounds,
  type ReflectionOverride,
} from "../trajectory/c2ReflectionOverride";
import {
  FAMILY_TRACKS,
  mapFamilyTrack,
  symmetryOpBetweenTracks,
  transformPoint,
  transformReflectionOverride,
} from "./trackSymmetry";
import type { SymmetryOp } from "./familyIdentity";

const OPS: SymmetryOp[] = ["H", "V", "RPI"];
const RAILS: Rail[] = ["TOP", "BOTTOM", "LEFT", "RIGHT"];
const T = 0.3;

const TABLE: Record<SymmetryOp, Record<Rail, [Rail, "t" | "1-t"]>> = {
  H: { TOP: ["TOP", "1-t"], BOTTOM: ["BOTTOM", "1-t"], LEFT: ["RIGHT", "t"], RIGHT: ["LEFT", "t"] },
  V: { TOP: ["BOTTOM", "t"], BOTTOM: ["TOP", "t"], LEFT: ["LEFT", "1-t"], RIGHT: ["RIGHT", "1-t"] },
  RPI: { TOP: ["BOTTOM", "1-t"], BOTTOM: ["TOP", "1-t"], LEFT: ["RIGHT", "1-t"], RIGHT: ["LEFT", "1-t"] },
};

function expectOverride(actual: ReflectionOverride | null, rail: Rail, t: number) {
  expect(actual).not.toBeNull();
  expect(actual!.rail).toBe(rail);
  expect(actual!.t).toBeCloseTo(t, 12);
}

describe("transformReflectionOverride — 12 mappings", () => {
  for (const op of OPS) {
    for (const rail of RAILS) {
      const [toRail, rule] = TABLE[op][rail];
      it(`${op}: ${rail} → ${toRail} / ${rule}`, () => {
        const out = transformReflectionOverride(op, { rail, t: T });
        expectOverride(out, toRail, rule === "t" ? T : 1 - T);
        // Same point as the Family ball transform of the decoded rail point.
        const p = transformPoint(op, railPointFromT(rail, T));
        const q = railPointFromT(out!.rail, out!.t);
        expect(q.x).toBeCloseTo(p.x, 10);
        expect(q.y).toBeCloseTo(p.y, 10);
      });
    }
  }
});

describe("transformReflectionOverride — group properties", () => {
  const samples: ReflectionOverride[] = RAILS.flatMap((rail) =>
    [0.1, 0.25, 0.5, 0.73].map((t) => ({ rail, t }))
  );

  it("H² = V² = RPI² = identity", () => {
    for (const op of OPS) {
      for (const s of samples) {
        const back = transformReflectionOverride(op, transformReflectionOverride(op, s));
        expectOverride(back, s.rail, s.t);
      }
    }
  });

  it("H∘V = V∘H = RPI", () => {
    for (const s of samples) {
      const rpi = transformReflectionOverride("RPI", s)!;
      const hv = transformReflectionOverride("H", transformReflectionOverride("V", s));
      const vh = transformReflectionOverride("V", transformReflectionOverride("H", s));
      expectOverride(hv, rpi.rail, rpi.t);
      expectOverride(vh, rpi.rail, rpi.t);
    }
  });

  it("dyadic t round-trips exactly", () => {
    for (const op of OPS) {
      for (const rail of RAILS) {
        const s = { rail, t: 0.25 };
        expect(transformReflectionOverride(op, transformReflectionOverride(op, s))).toEqual(s);
      }
    }
  });

  it("source track → destination track → source track recovers C2 (any AUTHORED track)", () => {
    for (const from of FAMILY_TRACKS) {
      for (const op of OPS) {
        const to = mapFamilyTrack(from, op);
        expect(symmetryOpBetweenTracks(to, from)).toBe(op);
        for (const s of samples) {
          const projected = transformReflectionOverride(symmetryOpBetweenTracks(from, to)!, s);
          const back = transformReflectionOverride(symmetryOpBetweenTracks(to, from)!, projected);
          expectOverride(back, s.rail, s.t);
        }
      }
    }
  });
});

describe("transformReflectionOverride — edges / rail ownership", () => {
  it("near-edge t stays inside the clamp band and round-trips", () => {
    for (const rail of RAILS) {
      const { tMin, tMax } = railTBounds(rail);
      for (const t of [tMin, tMax]) {
        for (const op of OPS) {
          const out = transformReflectionOverride(op, { rail, t })!;
          const b = railTBounds(out.rail);
          expect(out.t).toBeGreaterThanOrEqual(b.tMin - 1e-12);
          expect(out.t).toBeLessThanOrEqual(b.tMax + 1e-12);
          expectOverride(transformReflectionOverride(op, out), rail, t);
        }
      }
    }
  });

  it("rail is mapped explicitly — a near-corner point keeps its side/long rail family", () => {
    // RIGHT rail right below the TOP-RIGHT corner: re-detection could pick TOP.
    const nearCorner = { rail: "RIGHT" as Rail, t: 1 - C2_RAIL_EDGE_EPS / 40 };
    expect(transformReflectionOverride("H", nearCorner)!.rail).toBe("LEFT");
    expect(transformReflectionOverride("V", nearCorner)!.rail).toBe("RIGHT");
    expect(transformReflectionOverride("RPI", nearCorner)!.rail).toBe("LEFT");
    // TOP rail right next to the TOP-LEFT corner stays a long rail.
    const nearCornerTop = { rail: "TOP" as Rail, t: C2_RAIL_EDGE_EPS / 80 };
    expect(transformReflectionOverride("H", nearCornerTop)!.rail).toBe("TOP");
    expect(transformReflectionOverride("V", nearCornerTop)!.rail).toBe("BOTTOM");
  });

  it("invalid payload → null", () => {
    expect(transformReflectionOverride("H", null)).toBeNull();
    expect(transformReflectionOverride("H", { rail: "long", t: 0.4 } as never)).toBeNull();
    expect(transformReflectionOverride("V", { rail: "TOP", t: Number.NaN })).toBeNull();
  });
});
