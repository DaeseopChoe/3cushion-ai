/**
 * Phase 3A-360A — Product coverage display SSOT (persisted Product balls).
 * Run: npx vitest run src/domain/family/productCoverageFromDataset.test.ts
 */

import { describe, expect, it } from "vitest";
import type { Ball3, Point, PositionRecord, StrategyEntry } from "../positionSearchEngine";
import { createPositionId } from "../positionId";
import { runSpatialRecall } from "../recall/recallEngine";
import {
  productCoverageFromDataset,
  productCoveragePreviewMarkers,
} from "./productCoverageFromDataset";
import { CUE_C3_PRODUCT_MEMBER_ORIGIN } from "./buildCueC3ProductMembers";
import { FAMILY_TRACKS, type FamilyTrack } from "./trackSymmetry";

function pt(x: number, y: number): Point {
  return { x, y };
}

function productRecord(args: {
  familyId: string;
  track: FamilyTrack;
  memberId: string;
  derivedStep: string;
  balls: Ball3;
}): PositionRecord {
  const entry: StrategyEntry = {
    slot: "S1",
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: 30, C3_r: 20 },
    authoringStrategyId: `as_${args.memberId}`,
    familyId: args.familyId,
    memberId: args.memberId,
    memberOrigin: CUE_C3_PRODUCT_MEMBER_ORIGIN,
    generatedFromMemberId: "mb_base",
    derivedRule: "CUE_C3_CARTESIAN_PRODUCT_V1",
    derivedStep: args.derivedStep,
    track: args.track,
    meta: {
      impact: pt(12, 9),
      final: pt(50, 5),
      angle_ci: 0,
      angle_fs: 0,
    },
  };
  return {
    positionId: createPositionId(args.balls),
    balls: {
      cue: { ...args.balls.cue },
      target: { ...args.balls.target },
      second: { ...args.balls.second },
    },
    targetBall: "red",
    schemaVersion: 1,
    strategies: { S1: entry },
  };
}

function sampleDataset(): PositionRecord[] {
  const familyId = "fm_cov";
  const target = pt(40, 16);
  const rows: PositionRecord[] = [];

  // B2T_L: 2 cue × 2 second = 4 products
  const cueL = [pt(10, 16), pt(13, 16)];
  const secondL = [pt(20, 8), pt(24, 8)];
  let n = 0;
  for (let i = 0; i < cueL.length; i += 1) {
    for (let j = 0; j < secondL.length; j += 1) {
      n += 1;
      rows.push(
        productRecord({
          familyId,
          track: "B2T_L",
          memberId: `mb_L_${n}`,
          derivedStep: `cue:cue_impact:t:0.${i + 1}00000|c3:c3plus:seg:0:t:0.${j + 1}00000`,
          balls: { cue: cueL[i]!, target, second: secondL[j]! },
        })
      );
    }
  }

  // B2T_R: different coords — must not leak into B2T_L coverage
  rows.push(
    productRecord({
      familyId,
      track: "B2T_R",
      memberId: "mb_R_1",
      derivedStep: "cue:cue_impact:t:0.100000|c3:c3plus:v:C3",
      balls: {
        cue: pt(70, 16),
        target: pt(50, 16),
        second: pt(60, 8),
      },
    })
  );

  // Other family — must not leak
  rows.push(
    productRecord({
      familyId: "fm_other",
      track: "B2T_L",
      memberId: "mb_other",
      derivedStep: "cue:cue_impact:t:0.100000|c3:c3plus:v:C3",
      balls: {
        cue: pt(1, 1),
        target: pt(2, 2),
        second: pt(3, 3),
      },
    })
  );

  // AUTHORED (non-product) — ignored
  rows.push({
    positionId: createPositionId({
      cue: pt(10, 16),
      target,
      second: pt(20, 30),
    }),
    balls: { cue: pt(10, 16), target, second: pt(20, 30) },
    targetBall: "red",
    schemaVersion: 1,
    strategies: {
      S1: {
        slot: "S1",
        signature: {
          systemId: "5_half_system",
          formulaHash: "h1",
          shotType: "뒤돌리기",
        },
        sysInputs: { CO_f: 30, C3_r: 20 },
        authoringStrategyId: "as_auth",
        familyId,
        memberId: "mb_auth",
        memberOrigin: "AUTHORED",
        track: "B2T_L",
        meta: {
          impact: pt(12, 9),
          final: pt(50, 5),
          angle_ci: 0,
          angle_fs: 0,
        },
      },
    },
  });

  return rows;
}

describe("productCoverageFromDataset", () => {
  it("A: unique Product cue points match stored balls.cue", () => {
    const dataset = sampleDataset();
    const cov = productCoverageFromDataset({
      dataset,
      familyId: "fm_cov",
      track: "B2T_L",
    });
    expect(cov).not.toBeNull();
    expect(cov!.cuePoints.map((p) => p.point)).toEqual([
      pt(10, 16),
      pt(13, 16),
    ]);
  });

  it("B: unique Product second points match stored balls.second", () => {
    const dataset = sampleDataset();
    const cov = productCoverageFromDataset({
      dataset,
      familyId: "fm_cov",
      track: "B2T_L",
    });
    expect(cov!.secondPoints.map((p) => p.point)).toEqual([
      pt(20, 8),
      pt(24, 8),
    ]);
  });

  it("C: coverage is independent of live/query balls (Cue move invariance)", () => {
    const dataset = sampleDataset();
    const a = productCoverageFromDataset({
      dataset,
      familyId: "fm_cov",
      track: "B2T_L",
    });
    // Mutating a "current balls" object must not affect coverage (helper ignores it).
    const liveBalls = { cue: pt(99, 99), target: pt(40, 16), second: pt(1, 1) };
    void liveBalls;
    const b = productCoverageFromDataset({
      dataset,
      familyId: "fm_cov",
      track: "B2T_L",
    });
    expect(b).toEqual(a);
    expect(a!.cuePoints.every((p) => p.point.x !== 99)).toBe(true);
  });

  it("D: coverage sample coords are searchable Product Exact matches (adminSearch)", () => {
    const dataset = sampleDataset();
    const cov = productCoverageFromDataset({
      dataset,
      familyId: "fm_cov",
      track: "B2T_L",
    });
    const cue = cov!.cuePoints[0]!.point;
    const second = cov!.secondPoints[0]!.point;
    const target = pt(40, 16);
    const result = runSpatialRecall({
      dataset,
      query: { balls: { cue, target, second }, targetBall: "red" },
      profile: "adminSearch",
    });
    expect(result.kind).toBe("match");
    if (result.kind !== "match") return;
    expect(result.record.balls.cue).toEqual(cue);
    expect(result.record.balls.second).toEqual(second);
    expect(result.distance).toBe(0);
  });

  it("E: track isolation — B2T_R samples not mixed into B2T_L", () => {
    const dataset = sampleDataset();
    const left = productCoverageFromDataset({
      dataset,
      familyId: "fm_cov",
      track: "B2T_L",
    });
    const right = productCoverageFromDataset({
      dataset,
      familyId: "fm_cov",
      track: "B2T_R",
    });
    expect(left!.cuePoints.some((p) => p.point.x === 70)).toBe(false);
    expect(right!.cuePoints.map((p) => p.point)).toEqual([pt(70, 16)]);
    expect(right!.secondPoints.map((p) => p.point)).toEqual([pt(60, 8)]);
  });

  it("E2: all four tracks isolate when present", () => {
    const familyId = "fm_4t";
    const dataset = FAMILY_TRACKS.map((track, i) =>
      productRecord({
        familyId,
        track,
        memberId: `mb_${track}`,
        derivedStep: `cue:cue_impact:t:0.100000|c3:c3plus:v:C3`,
        balls: {
          cue: pt(10 + i, 16),
          target: pt(40, 16),
          second: pt(20 + i, 8),
        },
      })
    );
    for (const track of FAMILY_TRACKS) {
      const cov = productCoverageFromDataset({ dataset, familyId, track });
      expect(cov!.cuePoints).toHaveLength(1);
      expect(cov!.secondPoints).toHaveLength(1);
      const expected = dataset.find(
        (r) => r.strategies.S1?.track === track
      )!;
      expect(cov!.cuePoints[0]!.point).toEqual(expected.balls.cue);
      expect(cov!.secondPoints[0]!.point).toEqual(expected.balls.second);
    }
  });

  it("F: backward compatible — Product-only dataset restores coverage", () => {
    const dataset = sampleDataset().filter(
      (r) => r.strategies.S1?.memberOrigin === CUE_C3_PRODUCT_MEMBER_ORIGIN
    );
    const cov = productCoverageFromDataset({
      dataset,
      familyId: "fm_cov",
      track: "B2T_L",
    });
    expect(cov!.cuePoints).toHaveLength(2);
    expect(cov!.secondPoints).toHaveLength(2);
  });

  it("preview markers park display points at marker.cue (layer contract)", () => {
    const dataset = sampleDataset();
    const cov = productCoverageFromDataset({
      dataset,
      familyId: "fm_cov",
      track: "B2T_L",
    });
    const markers = productCoveragePreviewMarkers(cov);
    expect(markers.length).toBe(4);
    const cueMarkers = markers.filter((m) => !String(m.derivedStep).includes("coverage:second"));
    const secondMarkers = markers.filter((m) =>
      String(m.derivedStep).includes("coverage:second")
    );
    expect(cueMarkers.map((m) => m.cue)).toEqual([pt(10, 16), pt(13, 16)]);
    expect(secondMarkers.map((m) => m.cue)).toEqual([pt(20, 8), pt(24, 8)]);
  });

  it("returns null for missing family/track/products", () => {
    const dataset = sampleDataset();
    expect(
      productCoverageFromDataset({
        dataset,
        familyId: "fm_missing",
        track: "B2T_L",
      })
    ).toBeNull();
    expect(
      productCoverageFromDataset({
        dataset,
        familyId: "fm_cov",
        track: "NOT_A_TRACK",
      })
    ).toBeNull();
  });
});
