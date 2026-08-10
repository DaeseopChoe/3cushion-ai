/**
 * Phase 5 Mission 01 — Real Interpolation unit tests.
 * Run: npx vitest run src/domain/realInterpolation/realInterpolation.test.ts
 *   or: npx tsx --test (if configured)
 */

import { describe, expect, it } from "vitest";
import {
  mintAuthoringStrategyId,
  resolveAuthoringStrategyIdForSave,
} from "../authoringStrategyId";
import type { Ball3, PositionRecord, StrategyEntry } from "../positionSearchEngine";
import { selectBracket } from "./bracket";
import { computeConfidence } from "./confidence";
import { runRealInterpolationSearch } from "./engine";
import { buildEnvelopeIndex } from "./envelopeJoin";
import { passesCueTargetGeometryGate } from "./geometryGate";
import { pointToSegmentDistance } from "./geometryMath";
import { buildKnotIndex, projectKnot } from "./knotCorpus";
import { migrateAuthoringStrategyIds } from "./migration";
import { SECOND_SCORE_TOLERANCE_RG } from "./policy";
import { selectTopStrategyResults } from "./selectTop3";
import { passesSecondScoringGate } from "./secondScoring";
import { interpolateSysInputs } from "./sysInterpolate";
import type { InterpolationKnotView } from "./types";

function pt(x: number, y: number) {
  return { x, y };
}

function makeEntry(
  slot: "S1" | "S2" | "S3",
  asid: string | undefined,
  sys: Record<string, number>,
  shotType = "뒤돌리기"
): StrategyEntry {
  return {
    slot,
    signature: {
      systemId: "5_half_system",
      formulaHash: "C1_f = CO_f - C3_r",
      shotType,
    },
    authoringStrategyId: asid,
    track: "B2T_R",
    sysInputs: sys,
    meta: {
      impact: pt(20, 18),
      final: pt(70, 40),
      angle_ci: 1,
      angle_fs: -2,
    },
    hpT: { T: "8/8" },
    str: { speed: 2 },
    ai: { text: "lesson" },
  };
}

function makeKnot(
  asid: string,
  positionId: string,
  balls: Ball3,
  sys: Record<string, number>
): InterpolationKnotView {
  const entry = makeEntry("S1", asid, sys);
  return {
    authoringStrategyId: asid,
    strategyRef: `${positionId}.S1`,
    positionId,
    slot: "S1",
    balls,
    sysInputs: sys,
    signature: entry.signature,
    hpT: entry.hpT,
    str: entry.str,
    ai: entry.ai,
    entry,
  };
}

describe("authoringStrategyId identity", () => {
  it("mints as_ prefix", () => {
    const id = mintAuthoringStrategyId();
    expect(id.startsWith("as_")).toBe(true);
  });

  it("inherits on Edit Source Exact Target+Second", () => {
    const asid = "as_parent";
    const balls: Ball3 = {
      cue: pt(21, 16),
      target: pt(20, 20),
      second: pt(60, 20),
    };
    const id = resolveAuthoringStrategyIdForSave({
      editSource: {
        snapshotId: "snap1",
        positionId: "p0",
        balls: { cue: pt(20, 16), target: pt(20, 20), second: pt(60, 20) },
        cueCandidates: [pt(20, 16)],
      },
      balls,
      slotId: "S1",
      editSourceSlotEntry: makeEntry("S1", asid, { CO_f: 30 }),
    });
    expect(id).toBe(asid);
  });

  it("mints new when forceNew", () => {
    const id = resolveAuthoringStrategyIdForSave({
      editSource: null,
      balls: { cue: pt(1, 1), target: pt(2, 2), second: pt(3, 3) },
      slotId: "S1",
      forceNew: true,
    });
    expect(id.startsWith("as_")).toBe(true);
  });
});

describe("knot corpus + migration", () => {
  it("excludes legacy without authoringStrategyId", () => {
    const rec: PositionRecord = {
      positionId: "p1",
      balls: { cue: pt(20, 16), target: pt(20, 20), second: pt(60, 20) },
      strategies: { S1: makeEntry("S1", undefined, { CO_f: 30 }) },
    };
    expect(projectKnot(rec, "S1")).toBeNull();
  });

  it("does not auto-group unresolved legacy", () => {
    const recs: PositionRecord[] = [
      {
        positionId: "p1",
        balls: { cue: pt(20, 16), target: pt(20, 20), second: pt(60, 20) },
        strategies: { S1: makeEntry("S1", undefined, { CO_f: 30 }) },
      },
    ];
    const { report } = migrateAuthoringStrategyIds(recs, {}, { dryRun: true });
    expect(report.unresolved).toContain("p1.S1");
    expect(buildKnotIndex(recs).size).toBe(0);
  });

  it("applies explicit mapping only", () => {
    const recs: PositionRecord[] = [
      {
        positionId: "p1",
        balls: { cue: pt(20, 16), target: pt(20, 20), second: pt(60, 20) },
        strategies: { S1: makeEntry("S1", undefined, { CO_f: 30 }) },
      },
    ];
    const { records, report } = migrateAuthoringStrategyIds(
      recs,
      { "p1.S1": "as_mapped" },
      { dryRun: false }
    );
    expect(report.applied[0].authoringStrategyId).toBe("as_mapped");
    expect(records[0].strategies.S1?.authoringStrategyId).toBe("as_mapped");
  });
});

describe("second scoring", () => {
  it("passes on polyline and rejects beyond 1.73", () => {
    const poly = [pt(0, 0), pt(10, 0)];
    const on = passesSecondScoringGate(pt(5, 0), poly);
    expect(on.pass).toBe(true);
    expect(on.dScore).toBeCloseTo(0);

    const edge = passesSecondScoringGate(
      pt(5, SECOND_SCORE_TOLERANCE_RG),
      poly
    );
    expect(edge.pass).toBe(true);

    const out = passesSecondScoringGate(
      pt(5, SECOND_SCORE_TOLERANCE_RG + 0.01),
      poly
    );
    expect(out.pass).toBe(false);
  });

  it("empty secondSet fails", () => {
    expect(passesSecondScoringGate(pt(1, 1), []).pass).toBe(false);
  });

  it("segment distance at endpoint", () => {
    expect(pointToSegmentDistance(pt(0, 1), pt(0, 0), pt(2, 0))).toBeCloseTo(1);
  });
});

describe("geometry gate", () => {
  it("rejects opposite relative vector within pos tol", () => {
    // Cue/target endpoints within POS_TOL=2, but Vq=(2,0) vs Vc=(-2,0) → E_shape=4.
    const opp = passesCueTargetGeometryGate({
      queryCue: pt(20, 16),
      queryTarget: pt(22, 16),
      candidateCue: pt(22, 16),
      candidateTarget: pt(20, 16),
    });
    expect(opp.pass).toBe(false);
    expect(opp.reason).toBe("shape");
  });

  it("passes near parallel shift", () => {
    const r = passesCueTargetGeometryGate({
      queryCue: pt(20, 16),
      queryTarget: pt(30, 20),
      candidateCue: pt(19, 15.5),
      candidateTarget: pt(29, 19.5),
    });
    expect(r.pass).toBe(true);
  });
});

describe("bracket + SYS hard gate", () => {
  const as1 = "as_001";
  const as2 = "as_002";

  it("allows same authoringStrategyId interpolated", () => {
    const family = [
      makeKnot(as1, "pA", {
        cue: pt(10, 16),
        target: pt(20, 20),
        second: pt(60, 20),
      }, { CO_f: 20, C3_r: 10 }),
      makeKnot(as1, "pB", {
        cue: pt(30, 16),
        target: pt(20, 20),
        second: pt(60, 20),
      }, { CO_f: 40, C3_r: 30 }),
    ];
    const q: Ball3 = {
      cue: pt(20, 16),
      target: pt(20, 20),
      second: pt(60, 20),
    };
    const b = selectBracket(q, family);
    expect(b.kind).toBe("interpolated");
    if (b.kind === "interpolated") {
      const sys = interpolateSysInputs(b.knotA, b.knotB, b.lambda);
      expect(sys.ok).toBe(true);
      if (sys.ok) {
        expect(sys.sysInputs.CO_f).toBeCloseTo(30, 5);
      }
    }
  });

  it("never pairs different authoringStrategyId in one family list", () => {
    // Engine groups by id — bracket only sees one family.
    const familyA = [
      makeKnot(as1, "pA", {
        cue: pt(10, 16),
        target: pt(20, 20),
        second: pt(60, 20),
      }, { CO_f: 20 }),
    ];
    const familyB = [
      makeKnot(as2, "pB", {
        cue: pt(30, 16),
        target: pt(20, 20),
        second: pt(60, 20),
      }, { CO_f: 40 }),
    ];
    expect(selectBracket({ cue: pt(20, 16), target: pt(20, 20), second: pt(60, 20) }, familyA).kind).toBe("nearest");
    expect(familyA[0].authoringStrategyId).not.toBe(familyB[0].authoringStrategyId);
  });

  it("no extrapolation outside bracket", () => {
    const family = [
      makeKnot(as1, "pA", {
        cue: pt(10, 16),
        target: pt(20, 20),
        second: pt(60, 20),
      }, { CO_f: 20 }),
      makeKnot(as1, "pB", {
        cue: pt(30, 16),
        target: pt(20, 20),
        second: pt(60, 20),
      }, { CO_f: 40 }),
    ];
    const b = selectBracket(
      { cue: pt(40, 16), target: pt(20, 20), second: pt(60, 20) },
      family
    );
    expect(b.kind).toBe("nearest");
  });

  it("exact balls → exact", () => {
    const balls: Ball3 = {
      cue: pt(10, 16),
      target: pt(20, 20),
      second: pt(60, 20),
    };
    const family = [makeKnot(as1, "pA", balls, { CO_f: 20 })];
    expect(selectBracket(balls, family).kind).toBe("exact");
  });
});

describe("confidence + top3", () => {
  it("exact forces 100", () => {
    expect(
      computeConfidence({
        matchType: "exact",
        dScore: 1,
        dCue: 1,
        dTarget: 1,
        eShape: 1,
      })
    ).toBe(100);
  });

  it("keeps three same shot-name families", () => {
    const mk = (id: string, conf: number) => ({
      authoringStrategyId: id,
      strategyRef: `${id}.S1`,
      matchType: "nearest" as const,
      confidence: conf,
      sysInputs: { CO_f: 1 },
      ballsQuery: {
        cue: pt(0, 0),
        target: pt(1, 1),
        second: pt(2, 2),
      },
      sourceKnotRefs: [`${id}.S1`],
      primaryEntry: makeEntry("S1", id, { CO_f: 1 }, "뒤돌리기"),
    });
    const top = selectTopStrategyResults([
      mk("as_a", 96),
      mk("as_b", 91),
      mk("as_c", 84),
      mk("as_d", 50),
    ]);
    expect(top).toHaveLength(3);
    expect(top.map((t) => t.authoringStrategyId)).toEqual([
      "as_a",
      "as_b",
      "as_c",
    ]);
  });
});

describe("engine e2e gates", () => {
  it("runs search with envelope join and same-family interp", () => {
    const asid = "as_family";
    // Cue span must keep both Envelope cueSet[0] within POS_TOL of query
    // so Geometry Gate can admit ≥2 knots for Cue-1D INTERPOLATED.
    const records: PositionRecord[] = [
      {
        positionId: "pA",
        balls: {
          cue: pt(19, 16),
          target: pt(20, 20),
          second: pt(60, 20),
        },
        strategies: {
          S1: makeEntry("S1", asid, { CO_f: 20, C3_r: 10 }),
        },
      },
      {
        positionId: "pB",
        balls: {
          cue: pt(21, 16),
          target: pt(20, 20),
          second: pt(60, 20),
        },
        strategies: {
          S1: makeEntry("S1", asid, { CO_f: 40, C3_r: 30 }),
        },
      },
    ];
    const envelopeDataset = {
      records: [
        {
          strategyRef: "pA.S1",
          target: pt(20, 20),
          cueSet: [pt(19, 16)],
          secondSet: [pt(50, 20), pt(70, 20)],
        },
        {
          strategyRef: "pB.S1",
          target: pt(20, 20),
          cueSet: [pt(21, 16)],
          secondSet: [pt(50, 20), pt(70, 20)],
        },
      ],
    };
    expect(buildEnvelopeIndex(envelopeDataset).size).toBe(2);

    const results = runRealInterpolationSearch({
      query: {
        cue: pt(20, 16),
        target: pt(20, 20),
        second: pt(60, 20),
      },
      positionRecords: records,
      envelopeDataset,
    });
    expect(results.length).toBe(1);
    expect(results[0].authoringStrategyId).toBe(asid);
    expect(results[0].matchType).toBe("interpolated");
    expect(results[0].sysInputs.CO_f).toBeCloseTo(30, 5);
    expect(results[0].primaryEntry.ai).toEqual({ text: "lesson" });
  });

  it("rejects cross-family by producing separate results not blended", () => {
    const records: PositionRecord[] = [
      {
        positionId: "p1",
        balls: {
          cue: pt(20, 16),
          target: pt(20, 20),
          second: pt(60, 20),
        },
        strategies: {
          S1: makeEntry("S1", "as_a", { CO_f: 30 }, "뒤돌리기"),
        },
      },
      {
        positionId: "p2",
        balls: {
          cue: pt(21, 16),
          target: pt(20, 20),
          second: pt(60, 20),
        },
        strategies: {
          S1: makeEntry("S1", "as_b", { CO_f: 35 }, "뒤돌리기"),
        },
      },
    ];
    const envelopeDataset = {
      records: [
        {
          strategyRef: "p1.S1",
          target: pt(20, 20),
          cueSet: [pt(20, 16)],
          secondSet: [pt(50, 20), pt(70, 20)],
        },
        {
          strategyRef: "p2.S1",
          target: pt(20, 20),
          cueSet: [pt(21, 16)],
          secondSet: [pt(50, 20), pt(70, 20)],
        },
      ],
    };
    const results = runRealInterpolationSearch({
      query: {
        cue: pt(20.5, 16),
        target: pt(20, 20),
        second: pt(60, 20),
      },
      positionRecords: records,
      envelopeDataset,
    });
    expect(results.length).toBe(2);
    expect(new Set(results.map((r) => r.authoringStrategyId))).toEqual(
      new Set(["as_a", "as_b"])
    );
    expect(results.every((r) => r.matchType !== "interpolated" || r.sourceKnotRefs.length === 2)).toBe(true);
    // Each family has 1 knot → nearest/exact only
    expect(results.every((r) => r.matchType === "nearest" || r.matchType === "exact")).toBe(true);
  });
});

describe("architecture invariants", () => {
  it("does not mutate PublishedDataset / position records", () => {
    const records: PositionRecord[] = [
      {
        positionId: "p1",
        balls: {
          cue: pt(20, 16),
          target: pt(20, 20),
          second: pt(60, 20),
        },
        strategies: {
          S1: makeEntry("S1", "as_x", { CO_f: 30 }),
        },
      },
    ];
    const envelopeDataset = {
      records: [
        {
          strategyRef: "p1.S1",
          target: pt(20, 20),
          cueSet: [pt(20, 16)],
          secondSet: [pt(50, 20), pt(70, 20)],
        },
      ],
    };
    const snapRec = JSON.stringify(records);
    const snapEnv = JSON.stringify(envelopeDataset);
    runRealInterpolationSearch({
      query: {
        cue: pt(20, 16),
        target: pt(20, 20),
        second: pt(60, 20),
      },
      positionRecords: records,
      envelopeDataset,
    });
    expect(JSON.stringify(records)).toBe(snapRec);
    expect(JSON.stringify(envelopeDataset)).toBe(snapEnv);
  });
});
