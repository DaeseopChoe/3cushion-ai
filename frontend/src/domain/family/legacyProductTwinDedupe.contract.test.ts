/**
 * Product Twin Dedupe dry-run contracts (D1–D28).
 * Never writes real repo dataset positions.json files.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { DatasetExportPayload } from "../datasetExport";
import { createPositionId } from "../positionId";
import type { Ball3, PositionRecord, StrategyEntry } from "../positionSearchEngine";
import {
  CUE_C3_PRODUCT_DERIVED_RULE,
  CUE_C3_PRODUCT_MEMBER_ORIGIN,
} from "./buildCueC3ProductMembers";
import {
  dryRunProductTwinDedupe,
  EXPECTED_TWIN_GROUP_COUNT,
  matchesCanonicalProductGeometry,
} from "./legacyProductTwinDedupe";

const REPO_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../../.."
);
const SIDE_LEAF = path.join(
  REPO_ROOT,
  "dataset",
  "옆돌리기",
  "파이브앤하프",
  "positions.json"
);

function loadSideLeaf(): DatasetExportPayload {
  return JSON.parse(fs.readFileSync(SIDE_LEAF, "utf8")) as DatasetExportPayload;
}

const CORRECTIONS = {
  departure: 0,
  spin: 0,
  slide: 0,
  draw: 0,
  curve_ratio: 0,
};

function productEntry(
  overrides: Partial<StrategyEntry> = {}
): StrategyEntry {
  return {
    slot: "S1",
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "옆돌리기",
    },
    sysInputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
    corrections: { ...CORRECTIONS },
    familyId: "fm_twin",
    memberId: "mb_twin_1",
    memberOrigin: CUE_C3_PRODUCT_MEMBER_ORIGIN,
    generatedFromMemberId: "mb_base",
    derivedRule: CUE_C3_PRODUCT_DERIVED_RULE,
    derivedStep: "cue:cue_impact:t:0.100000|c3:c3plus:seg:0:t:0.050000",
    track: "B2T_L",
    hpT: { T: "8/8" },
    ...overrides,
  };
}

function baseRecord(): PositionRecord {
  return {
    positionId: "195110204306649221",
    balls: {
      cue: { x: 19.5, y: 11 },
      target: { x: 20.4, y: 30.6 },
      second: { x: 64.9, y: 22.1 },
    },
    strategies: {
      S1: {
        slot: "S1",
        signature: {
          systemId: "5_half_system",
          formulaHash: "h1",
          shotType: "옆돌리기",
        },
        sysInputs: { CO_f: 30 },
        corrections: { ...CORRECTIONS },
        familyId: "fm_twin",
        memberId: "mb_base",
        memberOrigin: "AUTHORED",
        track: "B2T_L",
        meta: {
          impact: { x: 1, y: 1 },
          final: { x: 2, y: 2 },
          angle_ci: 0,
          angle_fs: 0,
        },
      },
    },
    schemaVersion: 1,
  };
}

describe("legacyProductTwinDedupe — live clean leaf", () => {
  it("D1–D15/D22–D28 — 252 twins: keep A, remove B, identity preserved", () => {
    const payload = loadSideLeaf();
    const before = JSON.stringify(payload);
    const r = dryRunProductTwinDedupe({
      relativePosix: "dataset/옆돌리기/파이브앤하프/positions.json",
      sourceState: "HEAD_MATCH",
      payload,
      enforceExpectedBaseline: true,
    });

    expect(r.duplicateGroupsBefore).toBe(EXPECTED_TWIN_GROUP_COUNT);
    expect(r.duplicateErrorsBefore).toBe(EXPECTED_TWIN_GROUP_COUNT);
    expect(r.groups.every((g) => g.occurrences.length === 2 || g.status !== "REPAIRABLE")).toBe(
      true
    );
    expect(r.groups.filter((g) => g.status === "REPAIRABLE").every((g) => {
      const n = g.occurrences.filter((o) => o.matchesCanonical).length;
      return n === 1;
    })).toBe(true);

    expect(r.canonicalKeep).toBe(252);
    expect(r.nonCanonicalRemove).toBe(252);
    expect(r.ambiguousGroups).toBe(0);
    expect(r.duplicateErrorsAfter).toBe(0);
    expect(r.recordsBefore).toBe(508);
    expect(r.recordsAfter).toBe(256);
    expect(r.productEntriesBefore).toBe(504);
    expect(r.productEntriesAfter).toBe(252);
    expect(r.uniqueIdentitiesBefore).toBe(r.uniqueIdentitiesAfter);
    expect(r.identitySetPreserved).toBe(true);
    expect(r.idRegeneration).toBe(false);
    expect(r.ballRewrite).toBe(false);
    expect(r.metaRebuildExecuted).toBe(false);
    expect(r.nonTargetEntriesChanged).toBe(0);
    expect(r.otherSlotDataLost).toBe(false);
    expect(r.recordOrderPreserved).toBe(true);
    expect(r.sourceMutated).toBe(false);
    expect(JSON.stringify(payload)).toBe(before);
    expect(r.deterministicCheck).toBe(true);
    expect(r.idempotentCheck).toBe(true);
    expect(r.scopeGuard).toBe("PASS");
    expect(r.afterDuplicateValid).toBe(true);
    expect(r.result).toBe("SAFE_TO_APPLY");
    expect(r.remainingProductMetaMissing).toBe(252);

    // D25: keep decision is not targetBall-only — verify via geometry owner
    for (const g of r.groups) {
      if (g.status !== "REPAIRABLE") continue;
      const keep = g.occurrences.find((o) => o.matchesCanonical)!;
      const rem = g.occurrences.find((o) => !o.matchesCanonical)!;
      // Live leaf: keep has no targetBall; remove has yellow — but decision is geometry
      expect(keep.matchesCanonical).toBe(true);
      expect(rem.matchesCanonical).toBe(false);
      expect(keep.hasTargetBallField).toBe(false);
      expect(rem.hasTargetBallField).toBe(true);
    }

    // Second run on repaired = idempotent
    const r2 = dryRunProductTwinDedupe({
      relativePosix: "dataset/옆돌리기/파이브앤하프/positions.json",
      sourceState: "HEAD_MATCH",
      payload: r.repairedPayload!,
      enforceExpectedBaseline: false,
    });
    expect(r2.duplicateGroupsBefore).toBe(0);
    expect(r2.canonicalKeep).toBe(0);
  });
});

describe("legacyProductTwinDedupe — synthetic guards", () => {
  function envelope(records: PositionRecord[]): DatasetExportPayload {
    return {
      schemaVersion: 2,
      shotType: "옆돌리기",
      systemId: "5_half_system",
      systemLabel: "파이브앤하프",
      exportedAt: "2026-08-27T00:00:00.000Z",
      records,
    };
  }

  it("D18 — 0 canonical match → BLOCK", () => {
    const base = baseRecord();
    const badCue: Ball3 = {
      cue: { x: 1, y: 1 },
      target: { x: 20.4, y: 30.6 },
      second: { x: 32, y: 0.5 },
    };
    const badCue2: Ball3 = {
      cue: { x: 2, y: 2 },
      target: { x: 20.4, y: 30.6 },
      second: { x: 32, y: 0.5 },
    };
    const entry = productEntry();
    const payload = envelope([
      base,
      {
        positionId: "a",
        balls: badCue,
        strategies: { S1: { ...entry, memberId: "mb_x" } },
        schemaVersion: 1,
      },
      {
        positionId: "b",
        balls: badCue2,
        strategies: { S1: { ...entry, memberId: "mb_x" } },
        schemaVersion: 1,
      },
    ]);
    const r = dryRunProductTwinDedupe({
      relativePosix: "fixture",
      sourceState: "HEAD_MATCH",
      payload,
    });
    expect(r.groups.some((g) => g.status === "NO_CANONICAL_TWIN_MATCH")).toBe(
      true
    );
    expect(r.result).toBe("BLOCKED");
  });

  it("D19 — 2 canonical matches → BLOCK", () => {
    // Both have Exact base.target and cue on C→I near base — construct two samples on segment
    const base = baseRecord();
    const impactApprox = { x: 20.0, y: 20.0 }; // not used directly
    void impactApprox;
    // Use matchesCanonicalProductGeometry with two points that both match base.target
    // and lie on C→I — for synthetic, clone same balls twice with same geometry would be
    // MULTIPLE if both match. Use identical Product balls twice.
    const balls: Ball3 = {
      cue: { x: 19.5, y: 11 }, // Exact base cue — on segment at t=0
      target: { x: 20.4, y: 30.6 },
      second: { x: 32, y: 0.5 },
    };
    const entry = productEntry({
      derivedStep: "cue:cue_impact:t:0.000000|c3:c3plus:seg:0:t:0.050000",
    });
    expect(
      matchesCanonicalProductGeometry({
        balls,
        entry,
        baseBalls: base.balls,
      })
    ).toBe(true);

    const payload = envelope([
      base,
      {
        positionId: createPositionId(balls),
        balls,
        strategies: { S1: { ...entry, memberId: "mb_dup" } },
        schemaVersion: 1,
      },
      {
        positionId: createPositionId(balls) + "_alt",
        balls: { ...balls },
        strategies: { S1: { ...entry, memberId: "mb_dup" } },
        schemaVersion: 1,
        targetBall: "yellow",
      } as PositionRecord,
    ]);
    // Both keep createPositionId consistency for match; force second to same pid formula
    payload.records[2]!.positionId = createPositionId(balls);

    const r = dryRunProductTwinDedupe({
      relativePosix: "fixture",
      sourceState: "HEAD_MATCH",
      payload,
    });
    expect(
      r.groups.some((g) => g.status === "MULTIPLE_CANONICAL_TWIN_MATCH")
    ).toBe(true);
    expect(r.result).toBe("BLOCKED");
  });

  it("D20 — 3+ occurrences → BLOCK", () => {
    const base = baseRecord();
    const balls: Ball3 = {
      cue: { x: 19.58, y: 12.78 },
      target: { x: 20.4, y: 30.6 },
      second: { x: 32, y: 0.5 },
    };
    const entry = productEntry({ memberId: "mb_tri" });
    const payload = envelope([
      base,
      {
        positionId: "p1",
        balls,
        strategies: { S1: entry },
        schemaVersion: 1,
      },
      {
        positionId: "p2",
        balls: { ...balls, cue: { x: 1, y: 1 } },
        strategies: { S1: { ...entry } },
        schemaVersion: 1,
      },
      {
        positionId: "p3",
        balls: { ...balls, cue: { x: 2, y: 2 } },
        strategies: { S1: { ...entry } },
        schemaVersion: 1,
      },
    ]);
    const r = dryRunProductTwinDedupe({
      relativePosix: "fixture",
      sourceState: "HEAD_MATCH",
      payload,
    });
    expect(
      r.groups.some((g) => g.status === "UNSUPPORTED_DUPLICATE_CARDINALITY")
    ).toBe(true);
    expect(r.result).toBe("BLOCKED");
  });

  it("D16/D17 — other slot data blocks whole-record removal", () => {
    const base = baseRecord();
    const good: Ball3 = {
      cue: { x: 19.5, y: 11 },
      target: { x: 20.4, y: 30.6 },
      second: { x: 32, y: 0.5 },
    };
    const bad: Ball3 = {
      cue: { x: 1, y: 1 },
      target: { x: 20.375, y: 30.625 },
      second: { x: 32, y: 0.5 },
    };
    const entry = productEntry({
      memberId: "mb_slot",
      derivedStep: "cue:cue_impact:t:0.000000|c3:c3plus:seg:0:t:0.050000",
    });
    const payload = envelope([
      base,
      {
        positionId: createPositionId(good),
        balls: good,
        strategies: { S1: entry },
        schemaVersion: 1,
      },
      {
        positionId: "multi",
        balls: bad,
        strategies: {
          S1: { ...entry },
          S2: {
            ...entry,
            slot: "S2",
            memberId: "mb_other",
            memberOrigin: "AUTHORED",
            generatedFromMemberId: undefined,
            derivedRule: undefined,
            derivedStep: undefined,
            meta: {
              impact: { x: 0, y: 0 },
              final: { x: 0, y: 0 },
              angle_ci: 0,
              angle_fs: 0,
            },
          },
        },
        schemaVersion: 1,
      },
    ]);
    const r = dryRunProductTwinDedupe({
      relativePosix: "fixture",
      sourceState: "HEAD_MATCH",
      payload,
    });
    expect(r.groups.some((g) => g.reason?.includes("other-slots"))).toBe(true);
    expect(r.result).toBe("BLOCKED");
  });

  it("D21 — unexpected baseline count BLOCK with enforceExpectedBaseline", () => {
    const payload = envelope([baseRecord()]);
    const r = dryRunProductTwinDedupe({
      relativePosix: "fixture",
      sourceState: "HEAD_MATCH",
      payload,
      enforceExpectedBaseline: true,
    });
    expect(r.blockers.some((b) => b.includes("UNEXPECTED_DUPLICATE_BASELINE"))).toBe(
      true
    );
    expect(r.result).toBe("BLOCKED");
  });
});
