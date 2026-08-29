/**
 * Phase 3A-359L — Unified Cue→Impact + C3+ Derived Review.
 * Run: npx vitest run src/domain/family/unifiedDerivedReview.test.ts
 */

import { describe, expect, it } from "vitest";
import type { Ball3, Point, StrategyEntry } from "../positionSearchEngine";
import type { TrajectoryExtensionPayload } from "../trajectoryExtension/model";
import { writeFourTrackFamilyMembers } from "./familyAwareWriter";
import {
  approveUnifiedDerivedReview,
  createUnifiedDerivedReview,
  getUnifiedInteractiveMembers,
  getUnifiedVisibleMembers,
  unifiedReviewPreviewMarkers,
} from "./unifiedDerivedReview";
import { CUE_IMPACT_MEMBER_ORIGIN } from "./generateCueImpactDerivedMembers";
import { C3_PLUS_MEMBER_ORIGIN } from "./generateC3PlusScoringDerivedMembers";
import { CUE_C3_PRODUCT_MEMBER_ORIGIN } from "./buildCueC3ProductMembers";
import { hitTestDerivedReviewMarker } from "./cueImpactDerivedReview";
import { FAMILY_TRACKS, transformPoint } from "./trackSymmetry";
import { resolveTrajectoryHitTolerance } from "../trajectory/hitToleranceRg";
import { DEFAULT_SCALE } from "../../utils/physics/ImpactEngine";

const HIT = resolveTrajectoryHitTolerance();

function pt(x: number, y: number): Point {
  return { x, y };
}

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
    familyId: "fm_uni",
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

function collinearCueBalls(distance = 20): Ball3 {
  return {
    cue: { x: 8, y: 16 },
    target: { x: 8 + distance + DEFAULT_SCALE.BALL_DIAMETER_RG, y: 16 },
      second: { x: 20, y: 10 },
  };
}

function persistFour(balls: Ball3, extensions?: TrajectoryExtensionPayload) {
  const written = writeFourTrackFamilyMembers([], {
    balls,
    entry: authoredEntry(
      extensions ? { trajectoryExtensions: extensions } : {}
    ),
  });
  if (!written.ok) throw new Error(written.reason);
  return written;
}

const pathC4 = pathNodesThrough([
  { id: "C3", p: pt(40, 0) },
  { id: "C4", p: pt(0, 20) },
]);

describe("createUnifiedDerivedReview", () => {
  it("A: Cue OK + C3+ OK → both sessions; markers from both origins", () => {
    const written = persistFour(collinearCueBalls(20));
    const before = structuredClone(written.dataset);
    const unified = createUnifiedDerivedReview({
      dataset: written.dataset,
      familyId: "fm_uni",
      authoredPathNodes: pathC4,
      hitTolerance: HIT,
    });
    expect(unified.ok).toBe(true);
    if (!unified.ok) return;
    expect(written.dataset).toEqual(before);
    expect(unified.bag.kind).toBe("UNIFIED");
    expect(unified.bag.status).toBe("PENDING");
    expect(unified.bag.cueSession.members.length).toBeGreaterThan(0);
    expect(unified.bag.c3PlusSession?.members.length).toBeGreaterThan(0);
    expect(
      unified.bag.cueSession.members.every(
        (m) => m.memberOrigin === CUE_IMPACT_MEMBER_ORIGIN
      )
    ).toBe(true);
    expect(
      unified.bag.c3PlusSession!.members.every(
        (m) => m.memberOrigin === C3_PLUS_MEMBER_ORIGIN
      )
    ).toBe(true);

    const markers = unifiedReviewPreviewMarkers(unified.bag, "B2T_L");
    const origins = new Set(
      markers.map((m) =>
        m.derivedRule?.startsWith("C3_PLUS") ? "C3" : "CUE"
      )
    );
    expect(origins.has("CUE")).toBe(true);
    expect(origins.has("C3")).toBe(true);
  });

  it("B/C: interactive = Cue only; C3+ not hit-testable", () => {
    const written = persistFour(collinearCueBalls(20));
    const unified = createUnifiedDerivedReview({
      dataset: written.dataset,
      familyId: "fm_uni",
      authoredPathNodes: pathC4,
      hitTolerance: HIT,
    });
    if (!unified.ok) throw new Error(unified.reason);
    const visible = getUnifiedVisibleMembers(unified.bag, "B2T_L");
    const interactive = getUnifiedInteractiveMembers(unified.bag, "B2T_L");
    expect(visible.some((m) => m.memberOrigin === C3_PLUS_MEMBER_ORIGIN)).toBe(
      true
    );
    expect(
      interactive.every((m) => m.memberOrigin === CUE_IMPACT_MEMBER_ORIGIN)
    ).toBe(true);
    expect(interactive.some((m) => m.memberOrigin === C3_PLUS_MEMBER_ORIGIN)).toBe(
      false
    );

    const c3 = visible.find((m) => m.memberOrigin === C3_PLUS_MEMBER_ORIGIN)!;
    const miss = hitTestDerivedReviewMarker({
      pointerRg: c3.balls.cue,
      candidates: interactive,
    });
    expect(miss).toBeNull();

    const cue = interactive[0]!;
    const hit = hitTestDerivedReviewMarker({
      pointerRg: cue.balls.cue,
      candidates: interactive,
    });
    expect(hit?.memberId).toBe(cue.memberId);
  });

  it("D: ALL NO_SB → Cue-only bag; C3+ feedback skip", () => {
    const written = persistFour({
      cue: { x: 8, y: 16 },
      target: { x: 8 + 20 + DEFAULT_SCALE.BALL_DIAMETER_RG, y: 16 },
      second: { x: 70, y: 35 },
    });
    const unified = createUnifiedDerivedReview({
      dataset: written.dataset,
      familyId: "fm_uni",
      authoredPathNodes: pathC4,
      hitTolerance: HIT,
    });
    expect(unified.ok).toBe(true);
    if (!unified.ok) return;
    expect(unified.bag.c3PlusSession).toBeNull();
    expect(unified.bag.c3PlusFeedback?.kind).toBe("skip_no_sb");
    expect(unified.bag.cueSession.members.length).toBeGreaterThan(0);
  });

  it("E: asymmetric extensions → inconsistent C3+; Cue-only; no C3 members", () => {
    const written = persistFour(collinearCueBalls(20));
    const dataset = structuredClone(written.dataset);
    for (const r of dataset) {
      for (const e of Object.values(r.strategies ?? {})) {
        if (e?.track === "B2T_L") {
          e.trajectoryExtensions = extPayload(pt(80, 30));
        }
      }
    }
    const unified = createUnifiedDerivedReview({
      dataset,
      familyId: "fm_uni",
      authoredPathNodes: pathC4,
      hitTolerance: HIT,
    });
    expect(unified.ok).toBe(true);
    if (!unified.ok) return;
    expect(unified.bag.c3PlusSession).toBeNull();
    expect(unified.bag.c3PlusFeedback?.kind).toBe("error");
    expect(unified.bag.c3PlusFeedback?.code).toBe("FOUR_TRACK_INCONSISTENT");
    expect(unified.bag.cueSession.members.length).toBeGreaterThan(0);
  });

  it("F/G: Cancel leaves dataset; Approve writes Product-only (not Cue∪C3 union)", () => {
    const written = persistFour(collinearCueBalls(20));
    const before = structuredClone(written.dataset);
    const unified = createUnifiedDerivedReview({
      dataset: written.dataset,
      familyId: "fm_uni",
      authoredPathNodes: pathC4,
      hitTolerance: HIT,
    });
    if (!unified.ok) throw new Error(unified.reason);
    expect(written.dataset).toEqual(before);
    expect(unified.bag.productBuildError).toBeNull();
    expect(unified.bag.productMembers.length).toBeGreaterThan(0);
    expect(unified.bag.productCardinality?.expected).toBe(
      unified.bag.productMembers.length
    );

    const approved = approveUnifiedDerivedReview({
      dataset: written.dataset,
      bag: unified.bag,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    const entries = approved.dataset.flatMap((r) =>
      Object.values(r.strategies ?? {}).filter(Boolean)
    ) as StrategyEntry[];
    const productN = entries.filter(
      (e) => e.memberOrigin === CUE_C3_PRODUCT_MEMBER_ORIGIN
    ).length;
    const cueDurable = entries.filter(
      (e) => e.memberOrigin === CUE_IMPACT_MEMBER_ORIGIN
    ).length;
    const c3Durable = entries.filter(
      (e) => e.memberOrigin === C3_PLUS_MEMBER_ORIGIN
    ).length;
    expect(productN + cueDurable + c3Durable).toBe(unified.bag.productMembers.length);
    expect(cueDurable).toBeGreaterThan(0);
    expect(c3Durable).toBeGreaterThan(0);
    expect(productN).toBeGreaterThan(0);

    const sample = unified.bag.productMembers.find(
      (m) => m.memberOrigin === CUE_C3_PRODUCT_MEMBER_ORIGIN
    )!;
    const persisted = entries.find((e) => e.memberId === sample.memberId)!;
    const rec = approved.dataset.find((r) =>
      Object.values(r.strategies ?? {}).some((e) => e?.memberId === sample.memberId)
    )!;
    expect(rec.balls.cue).toEqual(sample.balls.cue);
    expect(rec.balls.second).toEqual(sample.balls.second);
    expect(rec.balls.target).toEqual(sample.balls.target);
    expect(persisted.memberOrigin).toBe(CUE_C3_PRODUCT_MEMBER_ORIGIN);
    expect(persisted.derivedRule).toBe("CUE_C3_CARTESIAN_PRODUCT_V1");

    const cueSample = unified.bag.productMembers.find(
      (m) => m.memberOrigin === CUE_IMPACT_MEMBER_ORIGIN
    )!;
    const cuePersisted = entries.find((e) => e.memberId === cueSample.memberId)!;
    expect(cuePersisted.memberOrigin).toBe(CUE_IMPACT_MEMBER_ORIGIN);
    expect(cuePersisted.derivedRule).toBe("CUE_IMPACT_FIRST_30PCT");

    const c3Sample = unified.bag.productMembers.find(
      (m) => m.memberOrigin === C3_PLUS_MEMBER_ORIGIN
    )!;
    const c3Persisted = entries.find((e) => e.memberId === c3Sample.memberId)!;
    expect(c3Persisted.memberOrigin).toBe(C3_PLUS_MEMBER_ORIGIN);
    expect(c3Persisted.derivedRule).toBe("C3_PLUS_SCORING_LINE_v1");
  });

  it("ALL NO_SB Approve: Product write 0; dataset unchanged", () => {
    const written = persistFour({
      cue: { x: 8, y: 16 },
      target: { x: 8 + 20 + DEFAULT_SCALE.BALL_DIAMETER_RG, y: 16 },
      second: { x: 70, y: 35 },
    });
    const before = structuredClone(written.dataset);
    const unified = createUnifiedDerivedReview({
      dataset: written.dataset,
      familyId: "fm_uni",
      authoredPathNodes: pathC4,
      hitTolerance: HIT,
    });
    if (!unified.ok) throw new Error(unified.reason);
    expect(unified.bag.productMembers.length).toBe(0);
    const approved = approveUnifiedDerivedReview({
      dataset: written.dataset,
      bag: unified.bag,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.dataset).toEqual(before);
  });

  it("NO Cue-derived as C3+ source: sources remain AUTHORED/SYMMETRY only", () => {
    const written = persistFour(collinearCueBalls(20));
    const unified = createUnifiedDerivedReview({
      dataset: written.dataset,
      familyId: "fm_uni",
      authoredPathNodes: pathC4,
      hitTolerance: HIT,
    });
    if (!unified.ok || !unified.bag.c3PlusSession) throw new Error("need both");
    for (const m of unified.bag.c3PlusSession.members) {
      expect(m.generatedFromMemberId).toBeTruthy();
      const cueDerivedIds = new Set(
        unified.bag.cueSession.members.map((c) => c.memberId)
      );
      expect(cueDerivedIds.has(m.generatedFromMemberId!)).toBe(false);
    }
    for (const m of unified.bag.productMembers) {
      const cueDerivedIds = new Set(
        unified.bag.cueSession.members.map((c) => c.memberId)
      );
      expect(cueDerivedIds.has(m.generatedFromMemberId!)).toBe(false);
      expect([
        CUE_C3_PRODUCT_MEMBER_ORIGIN,
        CUE_IMPACT_MEMBER_ORIGIN,
        C3_PLUS_MEMBER_ORIGIN,
      ]).toContain(m.memberOrigin);
    }
  });

  it("Product cardinality = 4 × (cuePerTrack + c3PerTrack + cuePerTrack × c3PerTrack)", () => {
    const written = persistFour(collinearCueBalls(20));
    const unified = createUnifiedDerivedReview({
      dataset: written.dataset,
      familyId: "fm_uni",
      authoredPathNodes: pathC4,
      hitTolerance: HIT,
    });
    if (!unified.ok || !unified.bag.c3PlusSession) throw new Error("need both");
    const cueN = unified.bag.cueSession.members.filter(
      (m) => m.track === "B2T_L"
    ).length;
    const c3N = unified.bag.c3PlusSession.members.filter(
      (m) => m.track === "B2T_L"
    ).length;
    const expectedPerTrack = cueN + c3N + cueN * c3N;
    expect(unified.bag.productMembers.length).toBe(4 * expectedPerTrack);
    expect(unified.bag.productCardinality?.expected).toBe(4 * expectedPerTrack);
  });
});

describe("unified extension mirror still intact", () => {
  it("four-track with extensions still transforms endpoints", () => {
    const e1 = pt(80, 30);
    const written = persistFour(collinearCueBalls(20), extPayload(e1));
    const entries = written.dataset.flatMap((r) =>
      Object.values(r.strategies ?? {}).filter((e) => e?.familyId === "fm_uni")
    ) as StrategyEntry[];
    const byTrack = Object.fromEntries(entries.map((e) => [e.track, e]));
    expect(byTrack.B2T_R?.trajectoryExtensions?.items?.[0]?.endpoint).toEqual(
      transformPoint("H", e1)
    );
    expect(FAMILY_TRACKS.every((t) => byTrack[t]?.trajectoryExtensions)).toBe(
      true
    );
  });
});
