/**
 * Cue-Only Edit Snap & Exact Position Replacement — unit tests.
 */
import { describe, expect, it } from "vitest";
import {
  CUE_EDIT_SNAP_TOLERANCE_RG,
  applyCueEditSnap,
  ballsExactEqual,
  buildEditSourceContext,
  collectLineageCueCandidates,
  euclideanDistanceRg,
  pointExactEqual,
} from "./cueEditSnap";
import { createPositionId } from "./positionId";
import { upsertPositionRecord } from "./positionMergeEngine";
import type { Ball3, PositionRecord, StrategyEntry } from "./positionSearchEngine";

function balls(
  cue: [number, number],
  target: [number, number] = [40, 20],
  second: [number, number] = [60, 15]
): Ball3 {
  return {
    cue: { x: cue[0], y: cue[1] },
    target: { x: target[0], y: target[1] },
    second: { x: second[0], y: second[1] },
  };
}

function stubStrategy(slot: "S1" | "S2" | "S3" = "S1", tag = "v1"): StrategyEntry {
  return {
    slot,
    signature: {
      systemId: "5_half_system",
      formulaHash: "h",
      shotType: "뒤돌리기",
    },
    sysInputs: { tag },
    meta: {},
  } as StrategyEntry;
}

function record(b: Ball3, tag = "old"): PositionRecord {
  return {
    positionId: createPositionId(b),
    balls: b,
    strategies: { S1: stubStrategy("S1", tag) },
  };
}

describe("cueEditSnap", () => {
  const sourceBalls = balls([10, 10]);
  const lineage = [
    record(balls([10, 10]), "center"),
    record(balls([11.5, 10]), "neighbor"), // same T/S, different cue
  ];
  const editSource = buildEditSourceContext("snap-1", sourceBalls, lineage);

  it("Case 1: d < 0.5 → SNAP", () => {
    const current = balls([10.3, 10.1]);
    const out = applyCueEditSnap(current, editSource);
    expect(out.reason).toBe("snapped");
    expect(out.didSnap).toBe(true);
    expect(out.balls.cue).toEqual({ x: 10, y: 10 });
    expect(pointExactEqual(out.balls.target, sourceBalls.target)).toBe(true);
  });

  it("Case 2: d == 0.5 → SNAP (inclusive)", () => {
    const current = balls([10.5, 10]);
    expect(euclideanDistanceRg(current.cue, sourceBalls.cue)).toBe(
      CUE_EDIT_SNAP_TOLERANCE_RG
    );
    const out = applyCueEditSnap(current, editSource);
    expect(out.reason).toBe("snapped");
    expect(out.balls.cue).toEqual({ x: 10, y: 10 });
  });

  it("Case 3: d > 0.5 → no snap (new position coords kept)", () => {
    const current = balls([10.51, 10]);
    const out = applyCueEditSnap(current, editSource);
    expect(out.reason).toBe("beyond_tolerance");
    expect(out.didSnap).toBe(false);
    expect(out.balls.cue).toEqual({ x: 10.51, y: 10 });
  });

  it("Case 4: Target changed → no snap", () => {
    const current = balls([10.2, 10], [41, 20], [60, 15]);
    const out = applyCueEditSnap(current, editSource);
    expect(out.reason).toBe("target_changed");
    expect(out.didSnap).toBe(false);
    expect(out.balls.cue).toEqual({ x: 10.2, y: 10 });
  });

  it("Case 5: Second changed → no snap", () => {
    const current = balls([10.2, 10], [40, 20], [61, 15]);
    const out = applyCueEditSnap(current, editSource);
    expect(out.reason).toBe("second_changed");
    expect(out.didSnap).toBe(false);
  });

  it("Case 6: no Edit Source + near existing cue → no snap", () => {
    const current = balls([10.2, 10]);
    const out = applyCueEditSnap(current, null);
    expect(out.reason).toBe("no_edit_source");
    expect(out.didSnap).toBe(false);
    expect(out.balls.cue).toEqual({ x: 10.2, y: 10 });
  });

  it("lineage candidates are Authoring cues with Exact T/S only", () => {
    const ds = [
      record(balls([10, 10])),
      record(balls([12, 10])),
      record(balls([10, 10], [99, 99], [60, 15])), // different target
    ];
    const cands = collectLineageCueCandidates(ds, sourceBalls);
    expect(cands).toEqual([
      { x: 10, y: 10 },
      { x: 12, y: 10 },
    ]);
  });
});

describe("Exact upsert / Latest Write Wins (no MERGE_EPSILON)", () => {
  it("Case 6/A/B: no proximity — near positions both preserved", () => {
    const a = balls([10, 10]);
    const b = balls([10.4, 10]); // < 0.5 away, formerly merged
    let ds = upsertPositionRecord([], a, stubStrategy("S1", "A"));
    ds = upsertPositionRecord(ds, b, stubStrategy("S1", "B"));
    expect(ds).toHaveLength(2);
    expect(ballsExactEqual(ds[0].balls, a) || ballsExactEqual(ds[1].balls, a)).toBe(
      true
    );
    expect(ballsExactEqual(ds[0].balls, b) || ballsExactEqual(ds[1].balls, b)).toBe(
      true
    );
  });

  it("Case 7: independent near positions all preserved", () => {
    const positions = [balls([20, 20]), balls([20.3, 20]), balls([20.6, 20])];
    let ds: PositionRecord[] = [];
    for (const p of positions) {
      ds = upsertPositionRecord(ds, p, stubStrategy("S1", String(p.cue.x)));
    }
    expect(ds).toHaveLength(3);
  });

  it("Case 8: Exact duplicate → single record Latest Write Wins", () => {
    const p = balls([15, 15]);
    let ds = upsertPositionRecord([], p, stubStrategy("S1", "old"));
    ds = upsertPositionRecord(ds, p, stubStrategy("S1", "new"));
    expect(ds).toHaveLength(1);
    expect((ds[0].strategies.S1?.sysInputs as { tag?: string })?.tag).toBe("new");
  });

  it("Case 8b: Exact duplicate removes stale duplicate rows", () => {
    const p = balls([16, 16]);
    const stale: PositionRecord[] = [
      record(p, "dup1"),
      { ...record(p, "dup2"), strategies: { S1: stubStrategy("S1", "dup2") } },
    ];
    const ds = upsertPositionRecord(stale, p, stubStrategy("S1", "fresh"));
    expect(ds).toHaveLength(1);
    expect((ds[0].strategies.S1?.sysInputs as { tag?: string })?.tag).toBe(
      "fresh"
    );
  });

  it("Case 1+8: snap then Exact replace keeps one valid position", () => {
    const center = balls([10, 10]);
    const lineage = [record(center, "center")];
    const editSource = buildEditSourceContext("snap-x", center, lineage);
    const dragged = balls([10.2, 10]);
    const snapped = applyCueEditSnap(dragged, editSource);
    expect(snapped.didSnap).toBe(true);
    let ds = lineage;
    ds = upsertPositionRecord(ds, snapped.balls, stubStrategy("S1", "replaced"));
    expect(ds).toHaveLength(1);
    expect(ds[0].balls.cue).toEqual({ x: 10, y: 10 });
    expect((ds[0].strategies.S1?.sysInputs as { tag?: string })?.tag).toBe(
      "replaced"
    );
  });

  it("Case 10: positionId recomputed from Exact snapped balls", () => {
    const center = balls([10, 10]);
    const editSource = buildEditSourceContext("s", center, [record(center)]);
    const snapped = applyCueEditSnap(balls([10.4, 10]), editSource);
    const ds = upsertPositionRecord([], snapped.balls, stubStrategy());
    expect(ds[0].positionId).toBe(createPositionId(center));
    expect(ds[0].positionId).toBe(createPositionId(snapped.balls));
  });

  it("regression C: Edit Source + 0.49 → snap", () => {
    const center = balls([30, 10]);
    const es = buildEditSourceContext("s", center, [record(center)]);
    const out = applyCueEditSnap(balls([30.49, 10]), es);
    expect(out.didSnap).toBe(true);
    expect(out.balls.cue).toEqual({ x: 30, y: 10 });
  });

  it("regression D: Edit Source + 0.51 → no snap", () => {
    const center = balls([30, 10]);
    const es = buildEditSourceContext("s", center, [record(center)]);
    const out = applyCueEditSnap(balls([30.51, 10]), es);
    expect(out.reason).toBe("beyond_tolerance");
    expect(out.didSnap).toBe(false);
  });

  it("regression E: tiny Target delta blocks snap", () => {
    const center = balls([30, 10]);
    const es = buildEditSourceContext("s", center, [record(center)]);
    const out = applyCueEditSnap(balls([30.2, 10], [40.0001, 20], [60, 15]), es);
    expect(out.reason).toBe("target_changed");
  });

  it("preserves other slots on Exact Position Latest Write Wins", () => {
    const p = balls([22, 11]);
    let ds = upsertPositionRecord([], p, stubStrategy("S1", "s1"));
    ds = upsertPositionRecord(ds, p, stubStrategy("S2", "s2"));
    expect(ds).toHaveLength(1);
    expect(ds[0].strategies.S1).toBeTruthy();
    expect(ds[0].strategies.S2).toBeTruthy();
    expect((ds[0].strategies.S2?.sysInputs as { tag?: string })?.tag).toBe("s2");
  });
});
