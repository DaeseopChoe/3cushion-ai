/**
 * Phase 3A-360 — LocalDB ADMIN Search Euclidean 2Rg nearest-Ball3.
 * Run: npx vitest run src/domain/recall/adminSearchEuclidean2rg.test.ts
 */

import { describe, expect, it } from "vitest";
import type { Ball3, PositionRecord, StrategyEntry } from "../positionSearchEngine";
import {
  ball3EuclideanSum,
  perBallEuclidean,
  rankRecordsForRecall,
} from "./recallCompare";
import { runSpatialRecall } from "./recallEngine";
import { getRecallProfile } from "./recallProfiles";

const SIG = {
  systemId: "5_half_system",
  formulaHash: "v1",
  shotType: "뒤돌리기",
} as const;

function entry(slot: "S1" | "S2" | "S3" = "S1"): StrategyEntry {
  return {
    slot,
    signature: { ...SIG },
    sysInputs: {},
    meta: {
      impact: { x: 0, y: 0 },
      final: { x: 0, y: 0 },
      angle_ci: 0,
      angle_fs: 0,
    },
  };
}

function rec(balls: Ball3, positionId: string): PositionRecord {
  return {
    positionId,
    balls,
    strategies: { S1: entry() },
  };
}

const base: Ball3 = {
  cue: { x: 10, y: 10 },
  target: { x: 50, y: 25 },
  second: { x: 40, y: 20 },
};

function offsetCue(d: number, axis: "x" | "y" = "x"): Ball3 {
  return {
    ...base,
    cue: axis === "x" ? { x: base.cue.x + d, y: base.cue.y } : { x: base.cue.x, y: base.cue.y + d },
  };
}

function offsetTarget(d: number): Ball3 {
  return { ...base, target: { x: base.target.x + d, y: base.target.y } };
}

function offsetSecond(d: number): Ball3 {
  return { ...base, second: { x: base.second.x + d, y: base.second.y } };
}

describe("adminSearch profile contract", () => {
  it("uses Euclidean 2.0 per-ball; no aggregate cap", () => {
    const p = getRecallProfile("adminSearch");
    expect(p.distanceMetric).toBe("euclidean");
    expect(p.coarsePerBall).toBe(2.0);
    expect(p.totalDistanceCap).toBeNull();
    expect(p.requireCoarsePass).toBe(true);
  });
});

describe("adminSearch Euclidean 2Rg gates", () => {
  it("A1: exact → match distance 0", () => {
    const r = runSpatialRecall({
      dataset: [rec(base, "exact")],
      query: { balls: base },
      profile: "adminSearch",
    });
    expect(r.kind).toBe("match");
    if (r.kind !== "match") return;
    expect(r.distance).toBe(0);
    expect(r.positionId).toBe("exact");
  });

  it("B2–B4: cue offset 1.0 / 1.9 / 2.0 → match", () => {
    for (const d of [1.0, 1.9, 2.0]) {
      const r = runSpatialRecall({
        dataset: [rec(base, "stored")],
        query: { balls: offsetCue(d) },
        profile: "adminSearch",
      });
      expect(r.kind).toBe("match");
      if (r.kind === "match") {
        expect(r.distance).toBeCloseTo(d, 6);
      }
    }
  });

  it("B5: cue offset > 2.0 → reject", () => {
    const r = runSpatialRecall({
      dataset: [rec(base, "stored")],
      query: { balls: offsetCue(2.01) },
      profile: "adminSearch",
    });
    expect(r.kind).toBe("no-match");
    if (r.kind === "no-match") expect(r.reason).toBe("coarse-empty");
  });

  it("C6–C7: second 1.9 match; >2 reject", () => {
    const ok = runSpatialRecall({
      dataset: [rec(base, "stored")],
      query: { balls: offsetSecond(1.9) },
      profile: "adminSearch",
    });
    expect(ok.kind).toBe("match");

    const bad = runSpatialRecall({
      dataset: [rec(base, "stored")],
      query: { balls: offsetSecond(2.01) },
      profile: "adminSearch",
    });
    expect(bad.kind).toBe("no-match");
  });

  it("D8–D9: target 1.9 match; >2 reject", () => {
    expect(
      runSpatialRecall({
        dataset: [rec(base, "stored")],
        query: { balls: offsetTarget(1.9) },
        profile: "adminSearch",
      }).kind
    ).toBe("match");
    expect(
      runSpatialRecall({
        dataset: [rec(base, "stored")],
        query: { balls: offsetTarget(2.01) },
        profile: "adminSearch",
      }).kind
    ).toBe("no-match");
  });

  it("E10: dx=1.5 dy=1.5 Euclidean≈2.121 MUST reject (not Manhattan)", () => {
    const query: Ball3 = {
      ...base,
      cue: { x: base.cue.x + 1.5, y: base.cue.y + 1.5 },
    };
    expect(perBallEuclidean(query.cue, base.cue)).toBeCloseTo(Math.SQRT2 * 1.5, 6);
    expect(perBallEuclidean(query.cue, base.cue)).toBeGreaterThan(2.0);
    // Manhattan would be 3 — old contract would still pass coarse@5; Euclidean must fail.
    const r = runSpatialRecall({
      dataset: [rec(base, "stored")],
      query: { balls: query },
      profile: "adminSearch",
    });
    expect(r.kind).toBe("no-match");
    if (r.kind === "no-match") expect(r.reason).toBe("coarse-empty");
  });

  it("F11–F13: all three balls must pass; one failure rejects", () => {
    const qOk: Ball3 = {
      cue: { x: base.cue.x + 1, y: base.cue.y },
      target: { x: base.target.x + 1, y: base.target.y },
      second: { x: base.second.x + 1, y: base.second.y },
    };
    expect(
      runSpatialRecall({
        dataset: [rec(base, "stored")],
        query: { balls: qOk },
        profile: "adminSearch",
      }).kind
    ).toBe("match");

    const qBadTarget: Ball3 = {
      ...qOk,
      target: { x: base.target.x + 2.5, y: base.target.y },
    };
    expect(
      runSpatialRecall({
        dataset: [rec(base, "stored")],
        query: { balls: qBadTarget },
        profile: "adminSearch",
      }).kind
    ).toBe("no-match");
  });

  it("G14–G16: nearest Euclidean sum wins; order-independent; tie-break positionId", () => {
    const near = rec(
      {
        cue: { x: 10.5, y: 10 },
        target: { x: 50, y: 25 },
        second: { x: 40, y: 20 },
      },
      "pos_near"
    );
    const far = rec(
      {
        cue: { x: 11.5, y: 10 },
        target: { x: 50, y: 25 },
        second: { x: 40, y: 20 },
      },
      "pos_far"
    );
    const query = base;
    const a = runSpatialRecall({
      dataset: [far, near],
      query: { balls: query },
      profile: "adminSearch",
    });
    const b = runSpatialRecall({
      dataset: [near, far],
      query: { balls: query },
      profile: "adminSearch",
    });
    expect(a.kind).toBe("match");
    expect(b.kind).toBe("match");
    if (a.kind === "match" && b.kind === "match") {
      expect(a.positionId).toBe("pos_near");
      expect(b.positionId).toBe("pos_near");
      expect(a.distance).toBeCloseTo(0.5, 6);
    }

    const tieA = rec(base, "aaa");
    const tieB = rec(base, "zzz");
    const tie = runSpatialRecall({
      dataset: [tieB, tieA],
      query: { balls: base },
      profile: "adminSearch",
    });
    expect(tie.kind).toBe("match");
    if (tie.kind === "match") expect(tie.positionId).toBe("aaa");
  });

  it("ranking distance equals Euclidean Ball3 sum", () => {
    const stored = base;
    const query = offsetCue(1.2);
    const rows = rankRecordsForRecall([rec(stored, "s")], query, {
      coarsePerBall: 2.0,
      allowPermutation: false,
      distanceMetric: "euclidean",
    });
    expect(rows[0]!.coarsePass).toBe(true);
    expect(rows[0]!.distance).toBeCloseTo(ball3EuclideanSum(query, stored), 10);
  });
});
