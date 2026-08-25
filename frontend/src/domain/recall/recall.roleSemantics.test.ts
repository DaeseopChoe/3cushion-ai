/**
 * Phase 4 / 7C — Search / Recall Role Ball3 semantics (direct Role match).
 * Run: npx vitest run src/domain/recall/recall.roleSemantics.test.ts
 */

import { describe, expect, it } from "vitest";
import type { Ball3, PositionRecord, StrategyEntry } from "../positionSearchEngine";
import { normalizeBallsToBall3 } from "../../admin/slotAutoRecommend";
import {
  getRecallProfile,
  RECALL_PROFILES,
} from "./recallProfiles";
import { runSpatialRecall } from "./recallEngine";
import {
  ball3EuclideanSum,
  ball3L1Sum,
  rankRecordsForRecall,
} from "./recallCompare";
import type { CompareProfileId } from "./recallTypes";

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

function rec(
  balls: Ball3,
  positionId: string,
  targetBall?: "red" | "yellow"
): PositionRecord {
  return {
    positionId,
    balls,
    strategies: { S1: entry() },
    ...(targetBall ? { targetBall } : {}),
  };
}

const cue = { x: 20, y: 16 };
const yellowPos = { x: 20, y: 20 };
const redPos = { x: 60, y: 20 };

/** CASE A: physical Target = red */
const roleRed: Ball3 = {
  cue,
  target: redPos,
  second: yellowPos,
};

/** CASE B: physical Target = yellow — same physical points, Roles swapped */
const roleYellow: Ball3 = {
  cue,
  target: yellowPos,
  second: redPos,
};

describe("Phase 7C profile contract — Role direct only", () => {
  it("F — every Search profile exists without permutation API", () => {
    for (const id of Object.keys(RECALL_PROFILES) as CompareProfileId[]) {
      const p = getRecallProfile(id);
      expect(p).toBeTruthy();
      expect(
        Object.prototype.hasOwnProperty.call(p, "allowTargetSecondPermutation")
      ).toBe(false);
    }
  });
});

describe("Phase 7C Exact Search Role match", () => {
  it("A — Exact Search target red → MATCH", () => {
    const r = runSpatialRecall({
      dataset: [rec(roleRed, "a-red", "red")],
      query: { balls: roleRed, targetBall: "red" },
      profile: "adminStrict",
    });
    expect(r.kind).toBe("match");
    if (r.kind !== "match") return;
    expect(r.record.balls.target).toEqual(redPos);
    expect(r.record.balls.second).toEqual(yellowPos);
  });

  it("B — Exact Search target yellow → MATCH", () => {
    const r = runSpatialRecall({
      dataset: [rec(roleYellow, "b-yellow", "yellow")],
      query: { balls: roleYellow, targetBall: "yellow" },
      profile: "adminStrict",
    });
    expect(r.kind).toBe("match");
    if (r.kind !== "match") return;
    expect(r.record.balls.target).toEqual(yellowPos);
    expect(r.record.balls.second).toEqual(redPos);
  });
});

describe("Phase 7C Near Search Role match", () => {
  it("C — Near Search target red → MATCH (adminSearch)", () => {
    const nearQuery: Ball3 = {
      cue: { x: cue.x + 1, y: cue.y },
      target: redPos,
      second: yellowPos,
    };
    const r = runSpatialRecall({
      dataset: [rec(roleRed, "near-red", "red")],
      query: { balls: nearQuery, targetBall: "red" },
      profile: "adminSearch",
    });
    expect(r.kind).toBe("match");
    if (r.kind === "match") {
      expect(r.distance).toBeCloseTo(1, 6);
    }
  });

  it("D — Near Search target yellow → MATCH (adminSearch)", () => {
    const nearQuery: Ball3 = {
      cue,
      target: { x: yellowPos.x + 1, y: yellowPos.y },
      second: redPos,
    };
    const r = runSpatialRecall({
      dataset: [rec(roleYellow, "near-yellow", "yellow")],
      query: { balls: nearQuery, targetBall: "yellow" },
      profile: "adminSearch",
    });
    expect(r.kind).toBe("match");
  });
});

describe("Phase 7C wrong-role negative", () => {
  it("E — CASE A query vs Role-swapped candidate → NO MATCH", () => {
    const r = runSpatialRecall({
      dataset: [rec(roleYellow, "wrong-roles", "yellow")],
      query: { balls: roleRed, targetBall: "red" },
      profile: "adminSearch",
    });
    expect(r.kind).toBe("no-match");
  });

  it("E2 — CASE B query vs Role-swapped candidate → NO MATCH", () => {
    const r = runSpatialRecall({
      dataset: [rec(roleRed, "wrong-b", "red")],
      query: { balls: roleYellow, targetBall: "yellow" },
      profile: "adminSearch",
    });
    expect(r.kind).toBe("no-match");
  });

  it("E3 — userStrict rejects wrong Roles", () => {
    const r = runSpatialRecall({
      dataset: [rec(roleYellow, "wrong-user", "yellow")],
      query: { balls: roleRed },
      profile: "userStrict",
    });
    expect(r.kind).toBe("no-match");
  });

  it("E4 — userRelaxed rejects wrong Roles (over Role distance / cap)", () => {
    const r = runSpatialRecall({
      dataset: [rec(roleYellow, "wrong-relaxed", "yellow")],
      query: { balls: roleRed },
      profile: "userRelaxed",
    });
    expect(r.kind).toBe("no-match");
  });

  it("E5 — passiveHint ranks Role-direct distance (not zero via swap)", () => {
    const r = runSpatialRecall({
      dataset: [rec(roleYellow, "wrong-hint", "yellow")],
      query: { balls: roleRed },
      profile: "passiveHint",
    });
    // requireCoarsePass=false may still surface ranked rows; distance must be Role-direct
    if (r.kind === "hints") {
      expect(r.candidates[0]!.distance).toBe(ball3L1Sum(roleRed, roleYellow));
      expect(r.candidates[0]!.distance).toBeGreaterThan(0);
    } else if (r.kind === "match") {
      expect(r.distance).toBeGreaterThan(0);
    } else {
      expect(r.kind).toBe("no-match");
    }
  });

  it("F2 — ranking prefers direct Role over swapped shape when both present", () => {
    const rows = rankRecordsForRecall(
      [
        rec(roleYellow, "swapped", "yellow"),
        rec(roleRed, "direct", "red"),
      ],
      roleRed,
      {
        coarsePerBall: 2.0,
        targetBall: "red",
        distanceMetric: "euclidean",
      }
    );
    expect(rows[0]!.record.positionId).toBe("direct");
    expect(rows[0]!.distance).toBe(0);
    expect(rows.find((row) => row.record.positionId === "swapped")!.distance).toBeGreaterThan(
      0
    );
  });
});

describe("Phase 7C near swapped-closer negative", () => {
  it("swapped Role candidate must not win even if Role-swap distance would be 0", () => {
    // Direct Role distance query↔roleYellow > 0; swap would be 0 — must NOT match
    expect(ball3EuclideanSum(roleRed, roleYellow)).toBeGreaterThan(0);
    const swappedShape = {
      cue: roleYellow.cue,
      target: roleYellow.second,
      second: roleYellow.target,
    };
    expect(ball3EuclideanSum(roleRed, swappedShape)).toBe(0);

    const r = runSpatialRecall({
      dataset: [rec(roleYellow, "only-swapped-shape", "yellow")],
      query: { balls: roleRed },
      profile: "adminSearch",
    });
    expect(r.kind).toBe("no-match");
  });
});

describe("Phase 7C query / candidate normalization identity", () => {
  it("I — Search query normalization preserves Role fields", () => {
    const ui = {
      cue,
      target: redPos,
      second: yellowPos,
    };
    const query = normalizeBallsToBall3(ui);
    expect(query.target).toEqual(redPos);
    expect(query.second).toEqual(yellowPos);
  });

  it("J — Candidate normalization preserves Role fields", () => {
    const candidate = normalizeBallsToBall3({
      cue,
      target: yellowPos,
      second: redPos,
    });
    expect(candidate.target).toEqual(yellowPos);
    expect(candidate.second).toEqual(redPos);
  });
});

describe("Phase 7C Recall Role preservation", () => {
  function simulateAdminRecallApply(
    queryBalls: Ball3,
    queryTargetColor: "red" | "yellow",
    match: PositionRecord
  ) {
    const uiBallsAfter = { ...queryBalls };
    const draftTargetBall =
      match.targetBall === "red" || match.targetBall === "yellow"
        ? match.targetBall
        : null;
    const slotTargetBall = queryTargetColor;
    return {
      uiBallsAfter,
      draftTargetBall,
      slotTargetBall,
      matchBalls: match.balls,
    };
  }

  it("G — Recall red Target → Role preserved", () => {
    const match = rec(roleRed, "recall-red", "red");
    const hit = runSpatialRecall({
      dataset: [match],
      query: { balls: roleRed, targetBall: "red" },
      profile: "adminSearch",
    });
    expect(hit.kind).toBe("match");
    if (hit.kind !== "match") return;
    const applied = simulateAdminRecallApply(roleRed, "red", hit.record);
    expect(applied.uiBallsAfter.target).toEqual(redPos);
    expect(applied.uiBallsAfter.second).toEqual(yellowPos);
    expect(applied.matchBalls.target).toEqual(redPos);
    expect(applied.slotTargetBall).toBe("red");
  });

  it("H — Recall yellow Target → Role preserved", () => {
    const match = rec(roleYellow, "recall-yellow", "yellow");
    const hit = runSpatialRecall({
      dataset: [match],
      query: { balls: roleYellow, targetBall: "yellow" },
      profile: "adminSearch",
    });
    expect(hit.kind).toBe("match");
    if (hit.kind !== "match") return;
    const applied = simulateAdminRecallApply(roleYellow, "yellow", hit.record);
    expect(applied.uiBallsAfter.target).toEqual(yellowPos);
    expect(applied.uiBallsAfter.second).toEqual(redPos);
    expect(applied.slotTargetBall).toBe("yellow");
  });
});

describe("Phase 7C targetColor metadata policy (no field swap)", () => {
  it("same Role coords + different targetBall still geometry-match under adminSearch rankOnly", () => {
    const r = runSpatialRecall({
      dataset: [rec(roleRed, "geom-red-meta-yellow", "yellow")],
      query: { balls: roleRed, targetBall: "red" },
      profile: "adminSearch",
    });
    expect(r.kind).toBe("match");
    if (r.kind === "match") {
      expect(r.record.balls.target).toEqual(redPos);
    }
  });

  it("adminStrict prefers same targetBall bucket when available", () => {
    const r = runSpatialRecall({
      dataset: [
        rec(roleRed, "bucket-yellow-meta", "yellow"),
        rec(roleRed, "bucket-red-meta", "red"),
      ],
      query: { balls: roleRed, targetBall: "red" },
      profile: "adminStrict",
    });
    expect(r.kind).toBe("match");
    if (r.kind === "match") {
      expect(r.positionId).toBe("bucket-red-meta");
    }
  });

  it("direct Role L1 identity", () => {
    expect(ball3L1Sum(roleRed, roleRed)).toBe(0);
    expect(ball3L1Sum(roleRed, roleYellow)).toBeGreaterThan(0);
  });
});
