/**
 * C3+ 뒷공 파생 범위 = 전체 득점선 (C3 → system tail → EXT1 → EXT2).
 * 원본 뒷공이 처음 닿는 구간은 샘플 범위의 종료점이 아니다.
 * Run: npx vitest run src/domain/family/c3PlusFullScoringLine.test.ts
 */

import { describe, expect, it } from "vitest";
import type { Ball3, Point, StrategyEntry } from "../positionSearchEngine";
import type { TrajectoryExtensionPayload } from "../trajectoryExtension/model";
import { writeFourTrackFamilyMembers } from "./familyAwareWriter";
import { resolveC3PlusScoringLine } from "./c3PlusScoringPath";
import {
  C3_PLUS_DERIVED_RULE,
  C3_PLUS_MEMBER_ORIGIN,
  generateC3PlusScoringDerivedMembers,
} from "./generateC3PlusScoringDerivedMembers";
import {
  CUE_IMPACT_DERIVED_RULE,
  CUE_IMPACT_MEMBER_ORIGIN,
} from "./generateCueImpactDerivedMembers";
import {
  CUE_C3_PRODUCT_DERIVED_RULE,
  CUE_C3_PRODUCT_MEMBER_ORIGIN,
} from "./buildCueC3ProductMembers";
import {
  approveUnifiedDerivedReview,
  createUnifiedDerivedReview,
} from "./unifiedDerivedReview";
import { migratePositionRecordsToFamilyParts } from "./migratePositionRecordsToFamilyParts";
import { rematerializeFamilyPartsToPositionRecords } from "./rematerializeFamilyPartsToPositionRecords";
import {
  FAMILY_TRACKS,
  transformPoint,
  type FamilyTrack,
  type SymmetryOp,
} from "./trackSymmetry";
import { resolveTrajectoryHitTolerance } from "../trajectory/hitToleranceRg";
import { DEFAULT_SCALE } from "../../utils/physics/ImpactEngine";

const HIT = resolveTrajectoryHitTolerance();
const FAMILY_ID = "fm_full";

function pt(x: number, y: number): Point {
  return { x, y };
}

function pathNodesThrough(marks: Array<{ id: string; p: Point }>): Array<Point | null> {
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
    familyId: FAMILY_ID,
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

function sourceEntry(partial?: Partial<StrategyEntry>): StrategyEntry {
  return {
    slot: "S1",
    signature: { systemId: "5_half_system", formulaHash: "h", shotType: "뒤돌리기" },
    authoringStrategyId: "as_src",
    familyId: "fm_c3p",
    memberId: "mb_src",
    memberOrigin: "AUTHORED",
    track: "B2T_L",
    sysInputs: { CO_f: 30, C3_r: 20 },
    corrections: { slide: 0, draw: 0, curve_ratio: 0, departure: 0, spin: 0 },
    meta: { impact: pt(1, 1), final: pt(2, 2), angle_ci: 0, angle_fs: 0 },
    ...partial,
  };
}

/** 내공 → 앞공 collinear (Cue review OK); 뒷공 on C3(40,0)→C4(0,20). */
function authoredBalls(): Ball3 {
  return {
    cue: pt(8, 16),
    target: pt(8 + 20 + DEFAULT_SCALE.BALL_DIAMETER_RG, 16),
    second: pt(20, 10),
  };
}

function persistFour(balls: Ball3, extensions?: TrajectoryExtensionPayload) {
  const written = writeFourTrackFamilyMembers([], {
    balls,
    entry: authoredEntry(extensions ? { trajectoryExtensions: extensions } : {}),
  });
  if (!written.ok) throw new Error(written.reason);
  return written;
}

/** C3 → C4 → C5 → C6 on alternating rails (Origin = C6). */
const pathC6 = pathNodesThrough([
  { id: "C3", p: pt(40, 0) },
  { id: "C4", p: pt(0, 20) },
  { id: "C5", p: pt(40, 40) },
  { id: "C6", p: pt(80, 20) },
]);

const pathC4 = pathNodesThrough([
  { id: "C3", p: pt(40, 0) },
  { id: "C4", p: pt(0, 20) },
]);

const OP_FROM_AUTHORED: Record<FamilyTrack, SymmetryOp | "identity"> = {
  B2T_L: "identity",
  B2T_R: "H",
  T2B_R: "V",
  T2B_L: "RPI",
};

function mapFromAuthored(track: FamilyTrack, p: Point): Point {
  const op = OP_FROM_AUTHORED[track];
  return op === "identity" ? { ...p } : transformPoint(op, p);
}

function near(a: Point, b: Point, eps = 1e-6): boolean {
  return Math.hypot(a.x - b.x, a.y - b.y) <= eps;
}

function segIndexOf(step: string | undefined): number | null {
  const m = /^c3plus:seg:(\d+):t:/.exec(step ?? "");
  return m ? Number(m[1]) : null;
}

function baseRecordForTrack(
  dataset: ReturnType<typeof persistFour>["dataset"],
  track: FamilyTrack
): { balls: Ball3; entry: StrategyEntry } {
  for (const r of dataset) {
    for (const e of Object.values(r.strategies ?? {})) {
      if (
        e?.familyId === FAMILY_ID &&
        e.track === track &&
        (e.memberOrigin === "AUTHORED" || e.memberOrigin === "SYMMETRY")
      ) {
        return { balls: r.balls, entry: e };
      }
    }
  }
  throw new Error(`base for ${track} not found`);
}

describe("C3+ full scoring line — resolver / generator", () => {
  it("1: C3→C4 only path → samples cover the whole C3→C4 segment", () => {
    const r = resolveC3PlusScoringLine({
      pathNodes: pathC4,
      secondBall: pt(20, 10),
      hitTolerance: HIT,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.scoringLine.map((n) => n.id)).toEqual(["C3", "C4"]);

    const gen = generateC3PlusScoringDerivedMembers({
      sourceMember: { balls: authoredBalls(), entry: sourceEntry() },
      pathNodes: pathC4,
      hitTolerance: HIT,
    });
    expect(gen.ok).toBe(true);
    if (!gen.ok) return;
    const steps = gen.members.map((m) => m.derivedStep);
    expect(steps).toContain("c3plus:v:C3");
    expect(steps).toContain("c3plus:v:C4");
  });

  it("2: SB on C3→C4 but path runs to C6 → scoring line and samples reach C6", () => {
    const r = resolveC3PlusScoringLine({
      pathNodes: pathC6,
      secondBall: pt(20, 10),
      hitTolerance: HIT,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.hitSegment.from.id).toBe("C3");
    expect(r.hitSegment.to.id).toBe("C4");
    expect(r.scoringLine.map((n) => n.id)).toEqual(["C3", "C4", "C5", "C6"]);

    const gen = generateC3PlusScoringDerivedMembers({
      sourceMember: { balls: authoredBalls(), entry: sourceEntry() },
      pathNodes: pathC6,
      hitTolerance: HIT,
    });
    expect(gen.ok).toBe(true);
    if (!gen.ok) return;
    expect(gen.scoringLineIds).toEqual(["C3", "C4", "C5", "C6"]);
    const steps = gen.members.map((m) => m.derivedStep ?? "");
    const segs = new Set(steps.map(segIndexOf).filter((s) => s != null));
    expect([...segs].sort()).toEqual([0, 1, 2]);
    expect(steps).toContain("c3plus:v:C5");
    expect(steps).toContain("c3plus:v:C6");
    // C6(80,20) clamped to the ball-center contract.
    expect(gen.members.some((m) => near(m.balls.cue, pt(79.5, 20)))).toBe(true);
  });

  it("3a: valid EXT1 + EXT2 → samples extend through EXT2 even when SB is on C3→C4", () => {
    const path = pathNodesThrough([
      { id: "C3", p: pt(0, 20) },
      { id: "C4", p: pt(80, 20) },
    ]);
    const extensions = extPayload(pt(80, 5), pt(40, 5));
    const r = resolveC3PlusScoringLine({
      pathNodes: path,
      extensions,
      secondBall: pt(40, 20),
      hitTolerance: HIT,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.scoringLine.map((n) => n.id)).toEqual(["C3", "C4", "EXT1", "EXT2"]);

    const gen = generateC3PlusScoringDerivedMembers({
      sourceMember: {
        balls: { ...authoredBalls(), second: pt(40, 20) },
        entry: sourceEntry({ trajectoryExtensions: extensions }),
      },
      pathNodes: path,
      hitTolerance: HIT,
    });
    expect(gen.ok).toBe(true);
    if (!gen.ok) return;
    expect(gen.scoringLineIds).toEqual(["C3", "C4", "EXT1", "EXT2"]);
    const steps = gen.members.map((m) => m.derivedStep ?? "");
    expect(steps).toContain("c3plus:v:EXT1");
    expect(steps).toContain("c3plus:v:EXT2");
    expect(gen.members.some((m) => near(m.balls.cue, pt(40, 5)))).toBe(true);
    const segs = new Set(steps.map(segIndexOf).filter((s) => s != null));
    expect(segs.has(1)).toBe(true);
    expect(segs.has(2)).toBe(true);
  });

  it("3b: no extensions → samples stop at the system tail", () => {
    const path = pathNodesThrough([
      { id: "C3", p: pt(0, 20) },
      { id: "C4", p: pt(80, 20) },
    ]);
    const gen = generateC3PlusScoringDerivedMembers({
      sourceMember: {
        balls: { ...authoredBalls(), second: pt(40, 20) },
        entry: sourceEntry(),
      },
      pathNodes: path,
      hitTolerance: HIT,
    });
    expect(gen.ok).toBe(true);
    if (!gen.ok) return;
    expect(gen.scoringLineIds).toEqual(["C3", "C4"]);
    expect(gen.members.every((m) => Math.abs(m.balls.cue.y - 20) < 1e-9)).toBe(true);
    expect(gen.members.some((m) => near(m.balls.cue, pt(79.5, 20)))).toBe(true);
  });

  it("6: fail-safe — missing C3 / break after C3 / zero-length tail → no members", () => {
    const missingC3 = [pt(10, 0), pt(40, 40), pt(80, 20), null, pt(0, 20)];
    const brokenAfterC3 = [pt(10, 0), pt(40, 40), pt(80, 20), pt(40, 0), null, pt(40, 40)];
    const zeroLength = [pt(10, 0), pt(40, 40), pt(80, 20), pt(40, 0), pt(40, 0)];
    for (const pathNodes of [missingC3, brokenAfterC3, zeroLength]) {
      const gen = generateC3PlusScoringDerivedMembers({
        sourceMember: { balls: authoredBalls(), entry: sourceEntry() },
        pathNodes,
        hitTolerance: HIT,
      });
      expect(gen.ok).toBe(false);
      if (gen.ok) continue;
      expect(gen.code).toBe("PATH_FAILED");
    }
  });
});

describe("C3+ full scoring line — Unified review Product (4 tracks)", () => {
  it("1: C3→C4 path → C3+-only rows carry sample on balls.second; cue/target original", () => {
    const written = persistFour(authoredBalls());
    const unified = createUnifiedDerivedReview({
      dataset: written.dataset,
      familyId: FAMILY_ID,
      authoredPathNodes: pathC4,
      hitTolerance: HIT,
    });
    if (!unified.ok || !unified.bag.c3PlusSession) throw new Error("need both sessions");
    for (const track of FAMILY_TRACKS) {
      const base = baseRecordForTrack(written.dataset, track);
      const samples = unified.bag.c3PlusSession.members
        .filter((m) => m.track === track)
        .map((m) => m.balls.cue);
      const c3Only = unified.bag.productMembers.filter(
        (m) => m.track === track && m.memberOrigin === C3_PLUS_MEMBER_ORIGIN
      );
      expect(c3Only.length).toBe(samples.length);
      for (const m of c3Only) {
        expect(m.balls.cue).toEqual(base.balls.cue);
        expect(m.balls.target).toEqual(base.balls.target);
        expect(samples.some((s) => near(s, m.balls.second))).toBe(true);
      }
    }
  });

  it("2/4/5: C3→C6 path, SB on C3→C4 → every track samples all segments; Product = Nc + Ns + Nc×Ns", () => {
    const written = persistFour(authoredBalls());
    const unified = createUnifiedDerivedReview({
      dataset: written.dataset,
      familyId: FAMILY_ID,
      authoredPathNodes: pathC6,
      hitTolerance: HIT,
    });
    expect(unified.ok).toBe(true);
    if (!unified.ok || !unified.bag.c3PlusSession) throw new Error("need both sessions");
    expect(unified.bag.productBuildError).toBeNull();

    const c3Members = unified.bag.c3PlusSession.members;
    const cueMembers = unified.bag.cueSession.members;
    const authoredC3 = c3Members
      .filter((m) => m.track === "B2T_L")
      .map((m) => ({ step: m.derivedStep, p: m.balls.cue }));

    let total = 0;
    for (const track of FAMILY_TRACKS) {
      const base = baseRecordForTrack(written.dataset, track);
      const c3 = c3Members.filter((m) => m.track === track);
      const cue = cueMembers.filter((m) => m.track === track);
      const nc = cue.length;
      const ns = c3.length;
      expect(nc).toBeGreaterThan(0);

      // 2: coverage past the first SB-hit segment
      const steps = c3.map((m) => m.derivedStep ?? "");
      const segs = new Set(steps.map(segIndexOf).filter((s) => s != null));
      expect([...segs].sort()).toEqual([0, 1, 2]);
      expect(steps).toContain("c3plus:v:C5");
      expect(steps).toContain("c3plus:v:C6");

      // 5: track-independent geometry (mirror of B2T_L, not a copy)
      expect(c3.map((m) => m.derivedStep)).toEqual(authoredC3.map((a) => a.step));
      for (let i = 0; i < c3.length; i += 1) {
        expect(near(c3[i]!.balls.cue, mapFromAuthored(track, authoredC3[i]!.p), 1e-6)).toBe(
          true
        );
      }
      if (track !== "B2T_L") {
        expect(
          c3.every((m, i) => near(m.balls.cue, authoredC3[i]!.p))
        ).toBe(false);
      }

      // 4: Product cardinality + ball roles
      const rows = unified.bag.productMembers.filter((m) => m.track === track);
      expect(rows.length).toBe(nc + ns + nc * ns);
      total += rows.length;
      const cueOnly = rows.filter((m) => m.memberOrigin === CUE_IMPACT_MEMBER_ORIGIN);
      const c3Only = rows.filter((m) => m.memberOrigin === C3_PLUS_MEMBER_ORIGIN);
      const product = rows.filter((m) => m.memberOrigin === CUE_C3_PRODUCT_MEMBER_ORIGIN);
      expect(cueOnly.length).toBe(nc);
      expect(c3Only.length).toBe(ns);
      expect(product.length).toBe(nc * ns);

      const cuePts = cue.map((m) => m.balls.cue);
      const c3Pts = c3.map((m) => m.balls.cue);
      for (const m of cueOnly) {
        expect(m.derivedRule).toBe(CUE_IMPACT_DERIVED_RULE);
        expect(cuePts.some((p) => near(p, m.balls.cue))).toBe(true);
        expect(m.balls.second).toEqual(base.balls.second);
        expect(m.balls.target).toEqual(base.balls.target);
      }
      for (const m of c3Only) {
        expect(m.derivedRule).toBe(C3_PLUS_DERIVED_RULE);
        expect(m.balls.cue).toEqual(base.balls.cue);
        expect(m.balls.target).toEqual(base.balls.target);
        expect(c3Pts.some((p) => near(p, m.balls.second))).toBe(true);
      }
      for (const m of product) {
        expect(m.derivedRule).toBe(CUE_C3_PRODUCT_DERIVED_RULE);
        expect(cuePts.some((p) => near(p, m.balls.cue))).toBe(true);
        expect(c3Pts.some((p) => near(p, m.balls.second))).toBe(true);
        expect(m.balls.target).toEqual(base.balls.target);
      }
      for (const m of rows) {
        expect(m.generatedFromMemberId).toBe(base.entry.memberId);
        expect(m.track).toBe(track);
        expect(m.familyId).toBe(FAMILY_ID);
      }
      // C3+ samples on C5→C6 exist in Product second balls
      const lastSeg = c3.filter((m) => segIndexOf(m.derivedStep) === 2);
      expect(lastSeg.length).toBeGreaterThan(0);
      expect(
        product.some((m) => lastSeg.some((s) => near(s.balls.cue, m.balls.second)))
      ).toBe(true);
    }
    expect(unified.bag.productCardinality?.expected).toBe(total);
    expect(unified.bag.productMembers.length).toBe(total);
  });

  it("5/6: approve keeps base tracks untouched and Family graph valid", () => {
    const written = persistFour(authoredBalls());
    const before = structuredClone(written.dataset);
    const unified = createUnifiedDerivedReview({
      dataset: written.dataset,
      familyId: FAMILY_ID,
      authoredPathNodes: pathC6,
      hitTolerance: HIT,
    });
    if (!unified.ok) throw new Error(unified.reason);
    const approved = approveUnifiedDerivedReview({
      dataset: written.dataset,
      bag: unified.bag,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;

    for (const track of FAMILY_TRACKS) {
      const b = baseRecordForTrack(before, track);
      const a = baseRecordForTrack(approved.dataset, track);
      expect(a.balls).toEqual(b.balls);
      expect(a.entry.memberId).toBe(b.entry.memberId);
      expect(a.entry.memberOrigin).toBe(b.entry.memberOrigin);
      expect(a.entry.hpT).toEqual(b.entry.hpT);
      expect(a.entry.symmetryOp).toEqual(b.entry.symmetryOp);
      expect(a.entry.generatedFromMemberId).toEqual(b.entry.generatedFromMemberId);
    }

    const entries = approved.dataset.flatMap((r) =>
      Object.values(r.strategies ?? {}).filter((e) => e?.familyId === FAMILY_ID)
    ) as StrategyEntry[];
    const derived = entries.filter(
      (e) => e.memberOrigin !== "AUTHORED" && e.memberOrigin !== "SYMMETRY"
    );
    expect(derived.length).toBe(unified.bag.productMembers.length);
    for (const e of derived) {
      expect(e.sourceSlot ?? e.slot).toBeTruthy();
      expect(e.derivedStep).toBeTruthy();
      expect(e.generatedFromMemberId).toBeTruthy();
    }

    const migrated = migratePositionRecordsToFamilyParts(approved.dataset);
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;
    const remat = rematerializeFamilyPartsToPositionRecords(migrated);
    expect(remat.ok).toBe(true);
  });
});
