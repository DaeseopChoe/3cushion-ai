/**
 * Phase 3A-359H — C3+ 4-track atomic consistency + review/approval.
 * Run: npx vitest run src/domain/family/c3PlusDerivedReview.test.ts
 */

import { describe, expect, it } from "vitest";
import type { Ball3, Point, StrategyEntry } from "../positionSearchEngine";
import type { TrajectoryExtensionPayload } from "../trajectoryExtension/model";
import {
  writeFamilyMembers,
  writeFourTrackFamilyMembers,
} from "./familyAwareWriter";
import {
  approveC3PlusDerivedReview,
  createC3PlusDerivedReview,
  isC3PlusDerivedReviewSession,
  prepareC3PlusFourTrackSources,
} from "./c3PlusDerivedReview";
import {
  validateC3PlusFourTrackConsistency,
  type C3PlusPreparedTrackSource,
} from "./c3PlusFourTrackConsistency";
import {
  C3_PLUS_DERIVED_RULE,
  C3_PLUS_MEMBER_ORIGIN,
} from "./generateC3PlusScoringDerivedMembers";
import { createCueImpactDerivedReview } from "./cueImpactDerivedReview";
import { CUE_IMPACT_MEMBER_ORIGIN } from "./generateCueImpactDerivedMembers";
import {
  FAMILY_TRACKS,
  transformPoint,
  type FamilyTrack,
} from "./trackSymmetry";
import { migratePositionRecordsToFamilyParts } from "./migratePositionRecordsToFamilyParts";
import { rematerializeFamilyPartsToPositionRecords } from "./rematerializeFamilyPartsToPositionRecords";
import { resolveTrajectoryHitTolerance } from "../trajectory/hitToleranceRg";

const HIT = resolveTrajectoryHitTolerance();

function pt(x: number, y: number): Point {
  return { x, y };
}

/** CO..C6; null after last mark → variable Origin. */
function pathNodesThrough(
  marks: Array<{ id: string; p: Point }>
): Array<Point | null> {
  const defaults: Point[] = [
    pt(10, 0),
    pt(40, 40),
    pt(80, 20),
    pt(40, 0),
    pt(0, 20),
    pt(40, 40),
    pt(80, 20),
  ];
  const map: Record<string, number> = { C3: 3, C4: 4, C5: 5, C6: 6 };
  let last = 3;
  for (const m of marks) {
    const i = map[m.id];
    if (i != null) {
      defaults[i] = m.p;
      last = Math.max(last, i);
    }
  }
  const nodes: Array<Point | null> = defaults.map((p) => ({ ...p }));
  for (let i = last + 1; i <= 6; i += 1) nodes[i] = null;
  return nodes;
}

function extPayload(e1?: Point, e2?: Point): TrajectoryExtensionPayload {
  const items: TrajectoryExtensionPayload["items"] = [];
  if (e1) {
    items.push({
      id: "EXT-S1-01",
      index: 1,
      endpoint: e1,
      userEdited: true,
      createdAt: "t0",
      updatedAt: "t0",
    });
  }
  if (e2) {
    items.push({
      id: "EXT-S1-02",
      index: 2,
      endpoint: e2,
      userEdited: true,
      createdAt: "t0",
      updatedAt: "t0",
    });
  }
  return {
    extensionSchemaVersion: 1,
    origin: { kind: "path_node", source: "corrected" },
    items,
  };
}

function authoredEntry(overrides: Partial<StrategyEntry> = {}): StrategyEntry {
  return {
    slot: "S1",
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
    authoringStrategyId: "as_authored",
    familyId: "fm_c3h",
    memberId: "mb_authored",
    memberOrigin: "AUTHORED",
    track: "B2T_L",
    hpT: {
      T: "8/8",
      hit_point: { x: -2, y: 1.5 },
      mode: "TIP",
      tipCount: 2,
    },
    str: { speed: 2.5 },
    meta: {
      impact: pt(12, 9),
      final: pt(50, 5),
      angle_ci: 0.1,
      angle_fs: 0.2,
    },
    ...overrides,
  };
}

/** Balls with Second Ball on C3→C4 horizontal segment. */
function ballsSbOnC3C4(): Ball3 {
  return {
    cue: pt(10, 8),
    target: pt(30, 12),
    second: pt(40, 0), // on C3(40,0)–C4 will vary; for C3(40,0)–C4(0,20) place carefully
  };
}

function persistFourTrack(args: {
  balls: Ball3;
  extensions?: TrajectoryExtensionPayload;
}) {
  const written = writeFourTrackFamilyMembers([], {
    balls: args.balls,
    entry: authoredEntry(
      args.extensions ? { trajectoryExtensions: args.extensions } : {}
    ),
  });
  if (!written.ok) throw new Error(written.reason);
  return written;
}

function prepareFromDataset(
  dataset: ReturnType<typeof persistFourTrack>["dataset"],
  authoredPathNodes: Array<Point | null>
) {
  const review = createC3PlusDerivedReview({
    dataset,
    familyId: "fm_c3h",
    authoredPathNodes,
    hitTolerance: HIT,
  });
  return review;
}

describe("generateFourTrackMembers — trajectoryExtensions mirror", () => {
  it("copies transformed extensions onto all SYMMETRY tracks", () => {
    const e1 = pt(80, 30);
    const written = persistFourTrack({
      balls: {
        cue: pt(10, 8),
        target: pt(40, 20),
        second: pt(62, 12),
      },
      extensions: extPayload(e1),
    });
    const entries = written.dataset.flatMap((r) =>
      Object.values(r.strategies ?? {}).filter(Boolean)
    ) as StrategyEntry[];
    const byTrack = Object.fromEntries(
      entries
        .filter((e) => e.familyId === "fm_c3h")
        .map((e) => [e.track, e])
    ) as Record<string, StrategyEntry>;
    for (const track of FAMILY_TRACKS) {
      expect(byTrack[track]?.trajectoryExtensions?.items?.length).toBe(1);
    }
    const authoredE1 = byTrack.B2T_L!.trajectoryExtensions!.items[0]!.endpoint;
    const hE1 = byTrack.B2T_R!.trajectoryExtensions!.items[0]!.endpoint;
    expect(hE1).toEqual(transformPoint("H", authoredE1));
  });
});

describe("C3+ 4-track atomic consistency", () => {
  const pathC4 = pathNodesThrough([
    { id: "C3", p: pt(40, 0) },
    { id: "C4", p: pt(0, 20) },
  ]);
  /** SB on C3→C4 (midpoint-ish). */
  const ballsHit = {
    cue: pt(10, 8),
    target: pt(30, 12),
    second: pt(20, 10),
  };

  it("A: C4 system tail + system segment SB → 4-track generate", () => {
    const written = persistFourTrack({ balls: ballsHit });
    const review = prepareFromDataset(written.dataset, pathC4);
    expect(review.ok).toBe(true);
    if (!review.ok || review.skipped) throw new Error("expected session");
    expect(isC3PlusDerivedReviewSession(review.session)).toBe(true);
    expect(review.session.kind).toBe("C3_PLUS");
    const tracks = new Set(review.session.members.map((m) => m.track));
    expect([...tracks].sort()).toEqual([...FAMILY_TRACKS].sort());
    expect(
      review.session.members.every((m) => m.memberOrigin === C3_PLUS_MEMBER_ORIGIN)
    ).toBe(true);
    expect(
      review.session.members.every((m) => m.derivedRule === C3_PLUS_DERIVED_RULE)
    ).toBe(true);
    expect(review.fingerprints.every((fp) => fp.systemTailId === "C4")).toBe(true);
    expect(review.fingerprints.every((fp) => fp.scoringEndpointId === "C4")).toBe(
      true
    );
  });

  it("B: C4/C5 tail + EXT1 scoring", () => {
    const path = pathNodesThrough([
      { id: "C3", p: pt(40, 0) },
      { id: "C4", p: pt(80, 10) },
      { id: "C5", p: pt(60, 40) },
    ]);
    const e1 = pt(20, 40);
    // SB on C5→EXT1: place second near midpoint of C5(60,40)–E1(20,40) inset from rail
    const balls = {
      cue: pt(10, 8),
      target: pt(30, 12),
      second: pt(40, 39),
    };
    const written = persistFourTrack({ balls, extensions: extPayload(e1) });
    const review = prepareFromDataset(written.dataset, path);
    expect(review.ok && !review.skipped).toBe(true);
    if (!review.ok || review.skipped) return;
    expect(review.fingerprints.every((fp) => fp.systemTailId === "C5")).toBe(true);
    expect(review.fingerprints.every((fp) => fp.scoringEndpointId === "EXT1")).toBe(
      true
    );
    expect(review.fingerprints.every((fp) => fp.extensionMask === "e1")).toBe(true);
    expect(
      review.session.members.every((m) => m.trajectoryExtensions?.items?.length === 1)
    ).toBe(true);
  });

  it("C: C6 tail + EXT1 scoring", () => {
    const path = pathNodesThrough([
      { id: "C3", p: pt(40, 0) },
      { id: "C4", p: pt(80, 10) },
      { id: "C5", p: pt(60, 40) },
      { id: "C6", p: pt(0, 20) },
    ]);
    const e1 = pt(0, 5);
    const balls = {
      cue: pt(10, 8),
      target: pt(30, 12),
      second: pt(0.5, 12), // on C6→EXT1, inset for ball-center contract
    };
    const written = persistFourTrack({ balls, extensions: extPayload(e1) });
    const review = prepareFromDataset(written.dataset, path);
    expect(review.ok && !review.skipped).toBe(true);
    if (!review.ok || review.skipped) return;
    expect(review.fingerprints.every((fp) => fp.systemTailId === "C6")).toBe(true);
    expect(review.fingerprints.every((fp) => fp.scoringEndpointId === "EXT1")).toBe(
      true
    );
  });

  it("D: EXT1→EXT2 SB → endpoint EXT2 handle (no C8)", () => {
    const path = pathNodesThrough([
      { id: "C3", p: pt(40, 0) },
      { id: "C4", p: pt(80, 10) },
      { id: "C5", p: pt(60, 40) },
      { id: "C6", p: pt(0, 20) },
    ]);
    const e1 = pt(0, 5);
    const e2 = pt(40, 5);
    const balls = {
      cue: pt(10, 8),
      target: pt(30, 12),
      second: pt(20, 5), // on EXT1→EXT2
    };
    const written = persistFourTrack({ balls, extensions: extPayload(e1, e2) });
    const review = prepareFromDataset(written.dataset, path);
    expect(review.ok && !review.skipped).toBe(true);
    if (!review.ok || review.skipped) return;
    expect(review.fingerprints.every((fp) => fp.scoringEndpointId === "EXT2")).toBe(
      true
    );
    expect(review.fingerprints.every((fp) => fp.scoringEndpointKind === "ext2")).toBe(
      true
    );
    expect(
      review.fingerprints.every((fp) => !fp.scoringLineIds.includes("C8"))
    ).toBe(true);
  });

  it("E: all four tracks NO_SB → skip (no session)", () => {
    const written = persistFourTrack({
      balls: {
        cue: pt(10, 8),
        target: pt(30, 12),
        second: pt(70, 35), // far from path
      },
    });
    const review = prepareFromDataset(written.dataset, pathC4);
    expect(review.ok).toBe(true);
    if (!review.ok) return;
    expect(review.skipped).toBe(true);
    expect("session" in review && review.session).toBeFalsy();
  });

  it("F: one track NO_SB → FOUR_TRACK_INCONSISTENT (no members)", () => {
    const written = persistFourTrack({ balls: ballsHit });
    const sources = written.dataset.flatMap((r) => {
      const out: C3PlusPreparedTrackSource[] = [];
      for (const e of Object.values(r.strategies ?? {})) {
        if (!e?.familyId || e.familyId !== "fm_c3h") continue;
        if (e.memberOrigin !== "AUTHORED" && e.memberOrigin !== "SYMMETRY") continue;
        const track = e.track as FamilyTrack;
        out.push({
          balls: r.balls,
          entry: e,
          track,
          pathNodes: pathC4,
          extensions: null,
        });
      }
      return out;
    });
    // Rebuild properly via prepare helper then mutate one second ball.
    const baseSources = sources.length
      ? null
      : null;
    void baseSources;
    const fromPrepare = prepareC3PlusFourTrackSources({
      sources: written.dataset.flatMap((r) =>
        Object.values(r.strategies ?? {})
          .filter(
            (e): e is StrategyEntry =>
              !!e &&
              e.familyId === "fm_c3h" &&
              (e.memberOrigin === "AUTHORED" || e.memberOrigin === "SYMMETRY")
          )
          .map((e) => ({
            balls: r.balls,
            entry: e,
            ...(r.targetBall === "yellow" || r.targetBall === "red"
              ? { targetBall: r.targetBall }
              : {}),
          }))
      ),
      authoredTrack: "B2T_L",
      authoredPathNodes: pathC4,
    });
    expect(fromPrepare.ok).toBe(true);
    if (!fromPrepare.ok) return;
    const prepared = fromPrepare.prepared.map((s) =>
      s.track === "T2B_L"
        ? {
            ...s,
            balls: { ...s.balls, second: pt(75, 38) },
          }
        : s
    );
    const consistency = validateC3PlusFourTrackConsistency(prepared, {
      hitTolerance: HIT,
    });
    expect(consistency.ok).toBe(false);
    if (consistency.ok) return;
    expect(consistency.code).toBe("FOUR_TRACK_INCONSISTENT");

    // create path must also fail closed (no partial session)
    // Force inconsistency by writing a broken second only on one Exact record — hard;
    // validate above is the gate create uses.
  });

  it("G: one track missing trajectoryExtensions → CONSISTENCY FAILURE", () => {
    const path = pathNodesThrough([
      { id: "C3", p: pt(40, 0) },
      { id: "C4", p: pt(80, 10) },
      { id: "C5", p: pt(60, 40) },
    ]);
    const e1 = pt(20, 40);
    const balls = {
      cue: pt(10, 8),
      target: pt(30, 12),
      second: pt(40, 39),
    };
    const written = persistFourTrack({ balls, extensions: extPayload(e1) });
    const prep = prepareC3PlusFourTrackSources({
      sources: written.dataset.flatMap((r) =>
        Object.values(r.strategies ?? {})
          .filter(
            (e): e is StrategyEntry =>
              !!e &&
              e.familyId === "fm_c3h" &&
              (e.memberOrigin === "AUTHORED" || e.memberOrigin === "SYMMETRY")
          )
          .map((e) => ({ balls: r.balls, entry: e }))
      ),
      authoredTrack: "B2T_L",
      authoredPathNodes: path,
    });
    if (!prep.ok) throw new Error(prep.reason);
    const broken = prep.prepared.map((s) =>
      s.track === "B2T_R" ? { ...s, extensions: null } : s
    );
    const consistency = validateC3PlusFourTrackConsistency(broken, {
      hitTolerance: HIT,
    });
    expect(consistency.ok).toBe(false);
    if (consistency.ok) return;
    expect(consistency.reason).toMatch(/trajectoryExtensions/i);
  });

  it("H/I: EXT structure / endpoint semantic mismatch → CONSISTENCY FAILURE", () => {
    const path = pathNodesThrough([
      { id: "C3", p: pt(40, 0) },
      { id: "C4", p: pt(80, 10) },
      { id: "C5", p: pt(60, 40) },
      { id: "C6", p: pt(0, 20) },
    ]);
    const balls = {
      cue: pt(10, 8),
      target: pt(30, 12),
      second: pt(20, 5),
    };
    const written = persistFourTrack({
      balls,
      extensions: extPayload(pt(0, 5), pt(40, 5)),
    });
    const prep = prepareC3PlusFourTrackSources({
      sources: written.dataset.flatMap((r) =>
        Object.values(r.strategies ?? {})
          .filter(
            (e): e is StrategyEntry =>
              !!e &&
              e.familyId === "fm_c3h" &&
              (e.memberOrigin === "AUTHORED" || e.memberOrigin === "SYMMETRY")
          )
          .map((e) => ({ balls: r.balls, entry: e }))
      ),
      authoredTrack: "B2T_L",
      authoredPathNodes: path,
    });
    if (!prep.ok) throw new Error(prep.reason);
    // Drop E2 on one track only → mask e1 vs e1e2
    const broken = prep.prepared.map((s) =>
      s.track === "T2B_R"
        ? { ...s, extensions: extPayload(pt(0, 5)) }
        : s
    );
    const consistency = validateC3PlusFourTrackConsistency(broken, {
      hitTolerance: HIT,
    });
    expect(consistency.ok).toBe(false);
  });
});

describe("C3+ review cancel / approve / recall", () => {
  const pathC4 = pathNodesThrough([
    { id: "C3", p: pt(40, 0) },
    { id: "C4", p: pt(0, 20) },
  ]);
  const ballsHit = {
    cue: pt(10, 8),
    target: pt(30, 12),
    second: pt(20, 10),
  };

  it("J: cancel leaves dataset unchanged", () => {
    const written = persistFourTrack({ balls: ballsHit });
    const before = structuredClone(written.dataset);
    const review = prepareFromDataset(written.dataset, pathC4);
    expect(review.ok && !review.skipped).toBe(true);
    expect(written.dataset).toEqual(before);
  });

  it("K/L: approve → writer preserves extensions; rematerialize keeps C3+", () => {
    const path = pathNodesThrough([
      { id: "C3", p: pt(40, 0) },
      { id: "C4", p: pt(80, 10) },
      { id: "C5", p: pt(60, 40) },
    ]);
    const e1 = pt(20, 40);
    const balls = {
      cue: pt(10, 8),
      target: pt(30, 12),
      second: pt(40, 39),
    };
    const written = persistFourTrack({ balls, extensions: extPayload(e1) });
    const review = prepareFromDataset(written.dataset, path);
    if (!review.ok || review.skipped) throw new Error("expected C3+ session");
    const approved = approveC3PlusDerivedReview({
      dataset: written.dataset,
      session: review.session,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    const derived = approved.dataset.flatMap((r) =>
      Object.values(r.strategies ?? {}).filter(
        (e) => e?.memberOrigin === C3_PLUS_MEMBER_ORIGIN
      )
    );
    expect(derived.length).toBeGreaterThan(0);
    expect(derived.every((e) => e!.trajectoryExtensions?.items?.length === 1)).toBe(
      true
    );

    const migrated = migratePositionRecordsToFamilyParts(approved.dataset);
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;
    const remat = rematerializeFamilyPartsToPositionRecords(migrated);
    expect(remat.ok).toBe(true);
    if (!remat.ok) return;
    const rematDerived = remat.dataset.flatMap((r) =>
      Object.values(r.strategies ?? {}).filter(
        (e) => e?.memberOrigin === C3_PLUS_MEMBER_ORIGIN
      )
    );
    expect(rematDerived.length).toBe(derived.length);
    expect(
      rematDerived.every((e) => e!.trajectoryExtensions?.items?.length === 1)
    ).toBe(true);
  });

  it("M: Cue→Impact create remains unchanged (separate path)", () => {
    const written = persistFourTrack({
      balls: {
        cue: pt(8, 16),
        target: pt(8 + 20 + 61.5 / 35.55, 16),
        second: pt(62, 12),
      },
    });
    const cue = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_c3h",
    });
    expect(cue.ok).toBe(true);
    if (!cue.ok) return;
    expect(cue.session.kind).toBe("CUE_IMPACT");
    expect(
      cue.session.members.every((m) => m.memberOrigin === CUE_IMPACT_MEMBER_ORIGIN)
    ).toBe(true);
    expect(
      cue.session.members.every((m) => m.memberOrigin !== C3_PLUS_MEMBER_ORIGIN)
    ).toBe(true);
  });

  it("partial approve is impossible: create fails before session on inconsistency", () => {
    const written = persistFourTrack({ balls: ballsHit });
    // Strip extensions asymmetrically after four-track wrote none — inject on one only.
    const dataset = structuredClone(written.dataset);
    for (const r of dataset) {
      for (const e of Object.values(r.strategies ?? {})) {
        if (e?.track === "B2T_L") {
          e.trajectoryExtensions = extPayload(pt(80, 30));
        }
      }
    }
    const review = prepareFromDataset(dataset, pathC4);
    expect(review.ok).toBe(false);
    if (review.ok) return;
    expect(review.code).toBe("FOUR_TRACK_INCONSISTENT");
  });
});

describe("writeFamilyMembers idempotent C3+ re-approve lineage", () => {
  it("reuses memberIds via existing derivedStep lineage", () => {
    const path = pathNodesThrough([
      { id: "C3", p: pt(40, 0) },
      { id: "C4", p: pt(0, 20) },
    ]);
    const balls = {
      cue: pt(10, 8),
      target: pt(30, 12),
      second: pt(20, 10),
    };
    const written = persistFourTrack({ balls });
    const first = prepareFromDataset(written.dataset, path);
    if (!first.ok || first.skipped) throw new Error("first");
    const approved = approveC3PlusDerivedReview({
      dataset: written.dataset,
      session: first.session,
    });
    if (!approved.ok) throw new Error(approved.reason);
    const ids1 = approved.dataset
      .flatMap((r) => Object.values(r.strategies ?? {}))
      .filter((e) => e?.memberOrigin === C3_PLUS_MEMBER_ORIGIN)
      .map((e) => e!.memberId)
      .sort();

    const second = prepareFromDataset(approved.dataset, path);
    if (!second.ok || second.skipped) throw new Error("second");
    const ids2 = second.session.members.map((m) => m.memberId).sort();
    expect(ids2).toEqual(ids1);

    const rewritten = writeFamilyMembers(approved.dataset, {
      familyId: "fm_c3h",
      members: second.session.members,
    });
    expect(rewritten.ok).toBe(true);
  });
});
