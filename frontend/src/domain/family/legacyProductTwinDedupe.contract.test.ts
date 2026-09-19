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
  EXPECTED_APPLY,
  isSafeTwinDedupeApplyCandidate,
  matchesCanonicalProductGeometry,
  prepareProductTwinDedupeApply,
  PRODUCT_TWIN_DEDUPE_APPLY_TARGET,
  verifyProductTwinDedupeReadBack,
  writeProductTwinDedupeLeafFs,
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
  it("D1–D15/D22–D28 — post-apply: 0 twins, identity preserved, meta gaps remain", () => {
    const payload = loadSideLeaf();
    const before = JSON.stringify(payload);
    const r = dryRunProductTwinDedupe({
      relativePosix: PRODUCT_TWIN_DEDUPE_APPLY_TARGET,
      sourceState: "HEAD_MATCH",
      payload,
      enforceExpectedBaseline: false,
    });

    // Post-apply leaf: twins already removed
    expect(r.recordsBefore).toBe(EXPECTED_APPLY.recordsAfter);
    expect(r.productEntriesBefore).toBe(EXPECTED_APPLY.productAfter);
    expect(r.duplicateGroupsBefore).toBe(0);
    expect(r.duplicateErrorsBefore).toBe(0);
    expect(r.canonicalKeep).toBe(0);
    expect(r.nonCanonicalRemove).toBe(0);
    expect(r.ambiguousGroups).toBe(0);
    expect(r.uniqueIdentitiesBefore).toBe(EXPECTED_APPLY.uniqueIdentities);
    expect(r.idRegeneration).toBe(false);
    expect(r.ballRewrite).toBe(false);
    expect(r.metaRebuildExecuted).toBe(false);
    expect(r.sourceMutated).toBe(false);
    expect(JSON.stringify(payload)).toBe(before);
    expect(r.result).toBe("UNAFFECTED");

    // Remaining meta gaps (separate from dedupe)
    const metaMissing = (payload.records ?? []).reduce((n, rec) => {
      const e = rec.strategies?.S1;
      if (e?.memberOrigin === CUE_C3_PRODUCT_MEMBER_ORIGIN && e.meta == null) {
        return n + 1;
      }
      return n;
    }, 0);
    expect(metaMissing).toBe(EXPECTED_APPLY.remainingMetaMissing);
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

describe("legacyProductTwinDedupe — apply gates (A1–A17)", () => {
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

  it("A1/A2/A3/A4/A5/A6/A7/A8/A9/A10/A17 — live baseline + prepare gate (pre-apply)", () => {
    const payload = loadSideLeaf();
    const beforeBalls = JSON.stringify(payload.records?.map((r) => r.balls));
    const beforeSys = JSON.stringify(
      payload.records?.map((r) => r.strategies?.S1?.sysInputs)
    );
    const beforeCorr = JSON.stringify(
      payload.records?.map((r) => r.strategies?.S1?.corrections)
    );
    const beforeIds = JSON.stringify(
      payload.records?.map((r) => ({
        positionId: r.positionId,
        familyId: r.strategies?.S1?.familyId,
        memberId: r.strategies?.S1?.memberId,
      }))
    );

    // Skip if already applied (post-dedupe leaf)
    if ((payload.records ?? []).length === EXPECTED_APPLY.recordsAfter) {
      const r = dryRunProductTwinDedupe({
        relativePosix: PRODUCT_TWIN_DEDUPE_APPLY_TARGET,
        sourceState: "HEAD_MATCH",
        payload,
        enforceExpectedBaseline: false,
      });
      expect(r.duplicateGroupsBefore).toBe(0);
      expect(r.metaRebuildExecuted).toBe(false);
      return;
    }

    const prepared = prepareProductTwinDedupeApply({
      relativePosix: PRODUCT_TWIN_DEDUPE_APPLY_TARGET,
      sourceState: "HEAD_MATCH",
      payload,
    });
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;

    expect(isSafeTwinDedupeApplyCandidate(prepared.dryRun)).toBe(true);
    expect(prepared.dryRun.duplicateGroupsBefore).toBe(252);
    expect(prepared.dryRun.duplicateErrorsAfter).toBe(0);
    expect(prepared.dryRun.recordsBefore).toBe(508);
    expect(prepared.dryRun.recordsAfter).toBe(256);
    expect(prepared.dryRun.productEntriesBefore).toBe(504);
    expect(prepared.dryRun.productEntriesAfter).toBe(252);
    expect(prepared.dryRun.identitySetPreserved).toBe(true);
    expect(prepared.dryRun.idRegeneration).toBe(false);
    expect(prepared.dryRun.ballRewrite).toBe(false);
    expect(prepared.dryRun.metaRebuildExecuted).toBe(false);
    expect(prepared.dryRun.nonTargetEntriesChanged).toBe(0);

    // Kept entries: balls/sys/corrections/ids unchanged vs source keep records
    expect(JSON.stringify(payload.records?.map((r) => r.balls))).toBe(beforeBalls);
    expect(
      JSON.stringify(payload.records?.map((r) => r.strategies?.S1?.sysInputs))
    ).toBe(beforeSys);
    expect(
      JSON.stringify(payload.records?.map((r) => r.strategies?.S1?.corrections))
    ).toBe(beforeCorr);
    expect(
      JSON.stringify(
        payload.records?.map((r) => ({
          positionId: r.positionId,
          familyId: r.strategies?.S1?.familyId,
          memberId: r.strategies?.S1?.memberId,
        }))
      )
    ).toBe(beforeIds);

    for (const g of prepared.dryRun.groups) {
      if (g.status !== "REPAIRABLE") continue;
      const keep = g.occurrences.find((o) => o.matchesCanonical)!;
      const src = payload.records![keep.recordIndex]!;
      const cand = prepared.candidate.records!.find(
        (r) => r.positionId === keep.positionId
      )!;
      expect(JSON.stringify(cand.balls)).toBe(JSON.stringify(src.balls));
      expect(JSON.stringify(cand.strategies?.S1)).toBe(
        JSON.stringify(src.strategies?.S1)
      );
    }
  });

  it("A11/A12 — other slot / ambiguous blocks write", () => {
    const base = baseRecord();
    const good: Ball3 = {
      cue: { ...base.balls.cue },
      target: { ...base.balls.target },
      second: { x: 32, y: 0.5 },
    };
    const entry = productEntry();
    const goodRec: PositionRecord = {
      positionId: createPositionId(good),
      balls: good,
      strategies: { S1: entry },
      schemaVersion: 1,
    };
    const badRec: PositionRecord = {
      positionId: "999999999999999999",
      balls: {
        cue: { x: 1, y: 1 },
        target: { ...base.balls.target },
        second: { x: 32, y: 0.5 },
      },
      strategies: {
        S1: { ...entry },
        S2: { ...entry, slot: "S2", memberId: "mb_other" },
      },
      schemaVersion: 1,
    };
    const payload = envelope([base, goodRec, badRec]);
    const prepared = prepareProductTwinDedupeApply({
      relativePosix: PRODUCT_TWIN_DEDUPE_APPLY_TARGET,
      sourceState: "HEAD_MATCH",
      payload,
    });
    expect(prepared.ok).toBe(false);
  });

  it("A13 — source-state change blocks write", () => {
    const payload = loadSideLeaf();
    const prepared = prepareProductTwinDedupeApply({
      relativePosix: PRODUCT_TWIN_DEDUPE_APPLY_TARGET,
      sourceState: "DIRTY_WORKTREE",
      payload,
    });
    expect(prepared.ok).toBe(false);
    expect(prepared.reason).toBe("SOURCE_STATE_CHANGED");
  });

  it("A14 — wrong target path blocks write", () => {
    const payload = loadSideLeaf();
    const prepared = prepareProductTwinDedupeApply({
      relativePosix: "dataset/뒤돌리기/파이브앤하프/positions.json",
      sourceState: "HEAD_MATCH",
      payload,
    });
    expect(prepared.ok).toBe(false);
    expect(prepared.reason).toBe("APPLY_TARGET_NOT_ALLOWED");
  });

  it("A15/A16 — temp-file write + read-back + idempotence (never touches real leaf)", () => {
    const payload = loadSideLeaf();
    if ((payload.records ?? []).length !== EXPECTED_APPLY.recordsBefore) {
      // Already applied on disk — verify idempotent dry-run only
      const r = dryRunProductTwinDedupe({
        relativePosix: PRODUCT_TWIN_DEDUPE_APPLY_TARGET,
        sourceState: "HEAD_MATCH",
        payload,
        enforceExpectedBaseline: false,
      });
      expect(r.duplicateGroupsBefore).toBe(0);
      expect(r.canonicalKeep).toBe(0);
      return;
    }

    const tmpDir = fs.mkdtempSync(path.join(REPO_ROOT, "frontend", ".tmp-twin-"));
    const tmpLeaf = path.join(tmpDir, "positions.json");
    try {
      const originalText = fs.readFileSync(SIDE_LEAF, "utf8");
      fs.writeFileSync(tmpLeaf, originalText, "utf8");
      const write = writeProductTwinDedupeLeafFs({
        absoluteTargetPath: tmpLeaf,
        relativePosix: PRODUCT_TWIN_DEDUPE_APPLY_TARGET,
        sourceState: "HEAD_MATCH",
        originalText,
        payload: JSON.parse(originalText),
      });
      expect(write.ok).toBe(true);
      if (!write.ok) return;
      expect(write.readBack.ok).toBe(true);
      expect(write.readBack.records).toBe(256);
      expect(write.readBack.duplicateErrors).toBe(0);
      expect(write.readBack.idempotent).toBe(true);
      expect(write.dryRun.metaRebuildExecuted).toBe(false);

      const again = dryRunProductTwinDedupe({
        relativePosix: PRODUCT_TWIN_DEDUPE_APPLY_TARGET,
        sourceState: "HEAD_MATCH",
        payload: JSON.parse(fs.readFileSync(tmpLeaf, "utf8")),
        enforceExpectedBaseline: false,
      });
      expect(again.duplicateGroupsBefore).toBe(0);
      expect(again.nonCanonicalRemove).toBe(0);

      // Real leaf must remain untouched
      const live = JSON.parse(fs.readFileSync(SIDE_LEAF, "utf8"));
      expect(live.records.length).toBe(508);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  });

  it("A17 — verify read-back helper reports meta gaps without unexpected issues", () => {
    const payload = loadSideLeaf();
    const r = dryRunProductTwinDedupe({
      relativePosix: PRODUCT_TWIN_DEDUPE_APPLY_TARGET,
      sourceState: "HEAD_MATCH",
      payload,
      enforceExpectedBaseline: (payload.records ?? []).length === 508,
    });
    if (!r.repairedPayload) {
      // post-apply leaf
      const keys = new Set(
        (payload.records ?? [])
          .flatMap((rec) =>
            (["S1", "S2", "S3"] as const).map((slot) => {
              const e = rec.strategies?.[slot];
              if (!e?.familyId || !e?.memberId) return null;
              return `${e.familyId}::${e.memberId}`;
            })
          )
          .filter(Boolean) as string[]
      );
      const rb = verifyProductTwinDedupeReadBack({
        payload,
        removedPositionIds: [],
        keptIdentityKeys: keys,
      });
      expect(rb.duplicateErrors).toBe(0);
      expect(rb.remainingMetaMissing).toBe(252);
      expect(rb.unexpectedIssues).toEqual([]);
      return;
    }
    const beforeKeys = new Set(
      (payload.records ?? [])
        .flatMap((rec) =>
          (["S1", "S2", "S3"] as const).map((slot) => {
            const e = rec.strategies?.[slot];
            if (!e?.familyId || !e?.memberId) return null;
            return `${e.familyId}::${e.memberId}`;
          })
        )
        .filter(Boolean) as string[]
    );
    const rb = verifyProductTwinDedupeReadBack({
      payload: r.repairedPayload,
      removedPositionIds: r.removedPositionIds,
      keptIdentityKeys: beforeKeys,
    });
    expect(rb.ok).toBe(true);
    expect(rb.remainingMetaMissing).toBe(252);
    expect(rb.unexpectedIssues).toEqual([]);
    expect(r.metaRebuildExecuted).toBe(false);
  });
});
