/**
 * Phase 3A-3E — Cue→Impact Derived preview / approval boundary.
 * Run: npx vitest run src/domain/family/cueImpactDerivedReview.test.ts
 */

import { describe, expect, it } from "vitest";
import { DEFAULT_SCALE } from "../../utils/physics/ImpactEngine";
import type { Ball3, StrategyEntry } from "../positionSearchEngine";
import {
  reconstructFamilyMembers,
  writeFourTrackFamilyMembers,
} from "./familyAwareWriter";
import {
  approveCueImpactDerivedReview,
  createCueImpactDerivedReview,
  cueImpactReviewPreviewMarkers,
  DERIVED_REVIEW_MARKER_HIT_RADIUS_RG,
  dismissCueImpactDerivedReview,
  familySourceMemberForTrack,
  fingerprintCueImpactCandidateSet,
  frozenReviewSourceForTrack,
  hitTestDerivedReviewMarker,
  persistedCueImpactDerivedCount,
  resolveReviewDisplayedSourceMemberId,
  reviewCandidatesCollinearWithFrozenSource,
  reviewImpactMatchesFrozenSource,
  sameCueImpactCandidateSet,
} from "./cueImpactDerivedReview";
import { FAMILY_TRACKS } from "./trackSymmetry";
import { calcImpactBall } from "../../data/system/calculator";
import { toPx } from "../../utils/geometry/coords";
import { CUE_IMPACT_DERIVED_RULE, CUE_IMPACT_MEMBER_ORIGIN, resolvePhysicalTarget } from "./generateCueImpactDerivedMembers";
import { FAMILY_MASTER_MIGRATION_DEBT } from "./familyMigrationDebt";
import { createFamilyPositionKey } from "./familyPositionKey";
import { genericFamilyMemberIdentityKey, resolveGenericFamilyMemberIdentity } from "./familyIdentity";

const canonicalHpt = {
  T: "8/8",
  hit_point: { x: -2, y: 1.5 },
  mode: "TIP",
  tipCount: 2,
};

function collinearBalls(distance = 20): Ball3 {
  return {
    cue: { x: 8, y: 16 },
    target: { x: 8 + distance + DEFAULT_SCALE.BALL_DIAMETER_RG, y: 16 },
    second: { x: 62, y: 12 },
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
    familyId: "fm_family1",
    memberId: "mb_authored",
    memberOrigin: "AUTHORED",
    track: "B2T_L",
    hpT: canonicalHpt,
    str: { speed: 2.5 },
    ai: { text: "keep" },
    meta: {
      impact: { x: 12, y: 9 },
      final: { x: 50, y: 5 },
      angle_ci: 0.1,
      angle_fs: 0.2,
    },
    ...overrides,
  };
}

function persistFourTrack() {
  const written = writeFourTrackFamilyMembers([], {
    balls: collinearBalls(20),
    entry: authoredEntry(),
  });
  if (!written.ok) throw new Error(written.reason);
  return written;
}

describe("Cue→Impact derived review lifecycle", () => {
  it("generates candidates without mutating dataset", () => {
    const written = persistFourTrack();
    const before = structuredClone(written.dataset);
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    expect(review.ok).toBe(true);
    if (!review.ok) return;
    expect(review.dataset).toEqual(before);
    expect(written.dataset).toEqual(before);
    expect(persistedCueImpactDerivedCount(written.dataset, "fm_family1")).toBe(0);
    expect(review.session.status).toBe("PENDING");
    expect(review.session.policy).toBe("REVIEW_REQUIRED");
    expect(review.session.authoredTrack).toBe("B2T_L");
    expect(review.session.members.length).toBeGreaterThan(0);
    expect(
      review.session.members.every((m) => m.memberOrigin === CUE_IMPACT_MEMBER_ORIGIN)
    ).toBe(true);
  });

  it("dismisses preview without persistence", () => {
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);
    const dismissed = dismissCueImpactDerivedReview(review.session);
    expect(dismissed.status).toBe("DISMISSED");
    expect(persistedCueImpactDerivedCount(written.dataset, "fm_family1")).toBe(0);
    const closed = cueImpactReviewPreviewMarkers(dismissed);
    expect(closed).toHaveLength(0);
  });

  it("builds each track from its own source memberId", () => {
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);
    const bases = reconstructFamilyMembers(written.dataset, "fm_family1").filter(
      (row) => row.entry.memberOrigin !== "DERIVED_CUE_IMPACT"
    );
    expect(bases.length).toBe(4);
    for (const base of bases) {
      const derived = review.session.members.filter(
        (m) => m.generatedFromMemberId === base.entry.memberId
      );
      expect(derived.length).toBeGreaterThan(0);
      expect(derived.every((m) => m.track === base.entry.track)).toBe(true);
      expect(derived.every((m) => m.symmetryOp == null)).toBe(true);
    }
  });

  it("persists the exact reviewed Candidate Set and does not regenerate", () => {
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);
    const frozen = structuredClone(review.session.members);
    const approved = approveCueImpactDerivedReview({
      dataset: written.dataset,
      session: review.session,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(sameCueImpactCandidateSet(frozen, approved.session.members)).toBe(true);
    expect(approved.session.reviewedFingerprint).toBe(
      fingerprintCueImpactCandidateSet(frozen)
    );

    const persisted = reconstructFamilyMembers(approved.dataset, "fm_family1").filter(
      (row) => row.entry.memberOrigin === CUE_IMPACT_MEMBER_ORIGIN
    );
    expect(persisted).toHaveLength(frozen.length);
    for (const candidate of frozen) {
      const row = persisted.find((loc) => loc.entry.memberId === candidate.memberId);
      expect(row).toBeTruthy();
      expect(row?.entry.familyId).toBe(candidate.familyId);
      expect(row?.entry.generatedFromMemberId).toBe(candidate.generatedFromMemberId);
      expect(row?.entry.track).toBe(candidate.track);
      expect(row?.entry.derivedRule).toBe(CUE_IMPACT_DERIVED_RULE);
      expect(row?.entry.derivedStep).toBe(candidate.derivedStep);
      expect(row?.balls).toEqual(candidate.balls);
      expect(row?.identityKey).toBe(
        genericFamilyMemberIdentityKey(resolveGenericFamilyMemberIdentity(candidate))
      );
      expect(row?.positionKey).toBe(
        createFamilyPositionKey(candidate.track, candidate.balls)
      );
      expect(row?.positionKey).not.toBe(row?.identityKey);
    }
    expect(FAMILY_MASTER_MIGRATION_DEBT).toContain("TEMPORARY");
  });

  it("refuses approval if the reviewed Candidate Set was mutated", () => {
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);
    const tampered = {
      ...review.session,
      members: review.session.members.map((m, i) =>
        i === 0
          ? { ...m, balls: { ...m.balls, cue: { x: m.balls.cue.x + 1, y: m.balls.cue.y } } }
          : m
      ),
    };
    const before = structuredClone(written.dataset);
    const approved = approveCueImpactDerivedReview({
      dataset: written.dataset,
      session: tampered,
    });
    expect(approved.ok).toBe(false);
    if (approved.ok) return;
    expect(approved.code).toBe("CANDIDATE_SET_CHANGED");
    expect(approved.dataset).toEqual(before);
    expect(persistedCueImpactDerivedCount(approved.dataset, "fm_family1")).toBe(0);
  });

  it("keeps zero mutation when writer preflight fails", () => {
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);
    const orphan = {
      ...review.session,
      members: review.session.members.map((m) => ({
        ...m,
        generatedFromMemberId: "mb_missing",
      })),
    };
    orphan.reviewedFingerprint = fingerprintCueImpactCandidateSet(orphan.members);
    const before = structuredClone(written.dataset);
    const approved = approveCueImpactDerivedReview({
      dataset: written.dataset,
      session: orphan,
    });
    expect(approved.ok).toBe(false);
    if (approved.ok) return;
    expect(approved.code).toBe("INVALID_PROVENANCE");
    expect(approved.dataset).toEqual(before);
  });

  it("re-approves the same Candidate Set without duplicating logical identity", () => {
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);
    const first = approveCueImpactDerivedReview({
      dataset: written.dataset,
      session: review.session,
    });
    if (!first.ok) throw new Error(first.reason);
    const countAfterFirst = persistedCueImpactDerivedCount(first.dataset, "fm_family1");
    const second = approveCueImpactDerivedReview({
      dataset: first.dataset,
      session: first.session,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(persistedCueImpactDerivedCount(second.dataset, "fm_family1")).toBe(
      countAfterFirst
    );
    const ids = reconstructFamilyMembers(second.dataset, "fm_family1")
      .filter((row) => row.entry.memberOrigin === CUE_IMPACT_MEMBER_ORIGIN)
      .map((row) => row.identityKey);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("preview markers stay on the first 30% and last t is 0.30", () => {
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);
    const markers = cueImpactReviewPreviewMarkers(review.session);
    expect(markers.length).toBe(review.session.members.length);
    for (const marker of markers) {
      expect(marker.target).toEqual(
        review.session.members.find((m) => m.memberId === marker.memberId)?.balls.target
      );
      expect(marker.second).toEqual(
        review.session.members.find((m) => m.memberId === marker.memberId)?.balls.second
      );
      const t = Number(marker.tLabel);
      expect(t).toBeGreaterThan(0);
      expect(t).toBeLessThanOrEqual(0.3 + 1e-9);
    }
    for (const sourceId of new Set(markers.map((m) => m.generatedFromMemberId))) {
      const sourceMarkers = markers.filter((m) => m.generatedFromMemberId === sourceId);
      expect(sourceMarkers.at(-1)?.tLabel).toBe("0.30");
    }
  });

  it("does not use CO/C1 sys values as Cue coordinates", () => {
    const firstWrite = persistFourTrack();
    const secondWrite = writeFourTrackFamilyMembers([], {
      balls: collinearBalls(20),
      entry: authoredEntry({
        familyId: "fm_family2",
        memberId: "mb_authored2",
        authoringStrategyId: "as_authored2",
        sysInputs: { CO_f: 55, C1_f: 1, C3_r: 20 },
      }),
    });
    if (!secondWrite.ok) throw new Error(secondWrite.reason);
    const a = createCueImpactDerivedReview({
      dataset: firstWrite.dataset,
      familyId: "fm_family1",
    });
    const b = createCueImpactDerivedReview({
      dataset: secondWrite.dataset,
      familyId: "fm_family2",
    });
    if (!a.ok || !b.ok) throw new Error("review failed");
    const authoredA = a.session.members.filter((m) => m.track === "B2T_L");
    const authoredB = b.session.members.filter((m) => m.track === "B2T_L");
    expect(authoredA.map((m) => m.balls.cue)).toEqual(authoredB.map((m) => m.balls.cue));
  });

  it("freezes per-track source snapshots at session creation", () => {
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);
    for (const track of FAMILY_TRACKS) {
      const frozen = frozenReviewSourceForTrack(review.session, track);
      expect(frozen).toBeTruthy();
      if (!frozen) continue;
      expect(frozen.track).toBe(track);
      expect(frozen.memberId).toBeTruthy();
      expect(frozen.runtimeT).toBeTruthy();
      const ambient = familySourceMemberForTrack(written.dataset, "fm_family1", track);
      expect(ambient?.entry.memberId).toBe(frozen.memberId);
      expect(ambient?.balls).toEqual(frozen.balls);
    }
  });

  it.each(FAMILY_TRACKS)(
    "keeps %s derived markers collinear with frozen source Cue→Impact",
    (track) => {
      const written = persistFourTrack();
      const review = createCueImpactDerivedReview({
        dataset: written.dataset,
        familyId: "fm_family1",
      });
      if (!review.ok) throw new Error(review.reason);
      expect(reviewCandidatesCollinearWithFrozenSource(review.session, track)).toBe(true);
      expect(reviewImpactMatchesFrozenSource(review.session, track)).toBe(true);
    }
  );

  it("binds generatedFromMemberId to frozen same-track source memberId", () => {
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);
    for (const track of FAMILY_TRACKS) {
      const sourceId = resolveReviewDisplayedSourceMemberId(review.session, track);
      expect(sourceId).toBeTruthy();
      const trackMembers = review.session.members.filter((m) => m.track === track);
      expect(trackMembers.length).toBeGreaterThan(0);
      expect(trackMembers.every((m) => m.generatedFromMemberId === sourceId)).toBe(true);
    }
  });

  it("uses frozen review source even when ambient dataset drifts", () => {
    const written = persistFourTrack();
    const reviewDataset = structuredClone(written.dataset);
    const ambientDataset = structuredClone(written.dataset);
    const authored = reconstructFamilyMembers(reviewDataset, "fm_family1").find(
      (row) => row.entry.memberOrigin === "AUTHORED"
    );
    if (!authored) throw new Error("missing authored");
    reviewDataset[authored.recordIndex] = {
      ...reviewDataset[authored.recordIndex],
      balls: {
        ...reviewDataset[authored.recordIndex].balls,
        cue: { x: 12, y: 16 },
      },
    };
    ambientDataset[authored.recordIndex] = {
      ...ambientDataset[authored.recordIndex],
      balls: {
        ...ambientDataset[authored.recordIndex].balls,
        cue: { x: 8, y: 16 },
      },
    };

    const review = createCueImpactDerivedReview({
      dataset: reviewDataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);

    const frozen = frozenReviewSourceForTrack(review.session, "B2T_L");
    expect(frozen?.balls.cue.x).toBe(12);
    const ambient = familySourceMemberForTrack(ambientDataset, "fm_family1", "B2T_L");
    expect(ambient?.balls.cue.x).toBe(8);
    expect(resolveReviewDisplayedSourceMemberId(review.session, "B2T_L")).toBe(
      authored.entry.memberId
    );
    expect(reviewCandidatesCollinearWithFrozenSource(review.session, "B2T_L")).toBe(true);
    expect(reviewImpactMatchesFrozenSource(review.session, "B2T_L")).toBe(true);
  });

  it("Review guideline uses Physical Target from frozen targetBall (yellow)", () => {
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);
    for (const track of FAMILY_TRACKS) {
      const frozen = frozenReviewSourceForTrack(review.session, track);
      expect(frozen).toBeTruthy();
      if (!frozen) continue;
      const physicalTarget = resolvePhysicalTarget(frozen.balls, frozen.targetBall);
      expect(physicalTarget).toEqual(frozen.balls.target);
      const impact = calcImpactBall(frozen.balls.cue, physicalTarget, frozen.runtimeT);
      expect(impact).toBeTruthy();
      if (!impact) continue;
      const candidates = review.session.members.filter((m) => m.track === track);
      for (const c of candidates) {
        const cross =
          (impact.x - frozen.balls.cue.x) * (c.balls.cue.y - frozen.balls.cue.y) -
          (impact.y - frozen.balls.cue.y) * (c.balls.cue.x - frozen.balls.cue.x);
        expect(Math.abs(cross)).toBeLessThan(1e-9);
      }
    }
  });

  it("red-target: generator and review use balls.second as Physical Target", () => {
    const balls = collinearBalls(20);
    const redBalls: Ball3 = {
      cue: { x: 8, y: 16 },
      target: { x: 62, y: 12 },
      second: { x: 8 + 20 + DEFAULT_SCALE.BALL_DIAMETER_RG, y: 16 },
    };
    const written = writeFourTrackFamilyMembers([], {
      balls: redBalls,
      targetBall: "red",
      entry: authoredEntry({ familyId: "fm_red1", memberId: "mb_red1", authoringStrategyId: "as_red1" }),
    });
    if (!written.ok) throw new Error(written.reason);
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_red1",
    });
    if (!review.ok) throw new Error(review.reason);
    const frozen = frozenReviewSourceForTrack(review.session, "B2T_L");
    expect(frozen).toBeTruthy();
    if (!frozen) return;
    expect(frozen.targetBall).toBe("red");
    const physicalTarget = resolvePhysicalTarget(frozen.balls, frozen.targetBall);
    expect(physicalTarget).toEqual(frozen.balls.second);
    expect(physicalTarget).not.toEqual(frozen.balls.target);
    const impact = calcImpactBall(frozen.balls.cue, physicalTarget, frozen.runtimeT);
    expect(impact).toBeTruthy();
    if (!impact) return;
    expect(reviewCandidatesCollinearWithFrozenSource(review.session, "B2T_L")).toBe(true);
    expect(reviewImpactMatchesFrozenSource(review.session, "B2T_L")).toBe(true);
    const candidates = review.session.members.filter((m) => m.track === "B2T_L");
    for (const c of candidates) {
      const cross =
        (impact.x - frozen.balls.cue.x) * (c.balls.cue.y - frozen.balls.cue.y) -
        (impact.y - frozen.balls.cue.y) * (c.balls.cue.x - frozen.balls.cue.x);
      expect(Math.abs(cross)).toBeLessThan(1e-9);
    }
    const wrongImpact = calcImpactBall(frozen.balls.cue, frozen.balls.target, frozen.runtimeT);
    if (wrongImpact && impact) {
      expect(Math.hypot(wrongImpact.x - impact.x, wrongImpact.y - impact.y)).toBeGreaterThan(0.1);
    }
  });

  it("frozen targetBall identity is preserved across track switch", () => {
    const redBalls: Ball3 = {
      cue: { x: 8, y: 16 },
      target: { x: 62, y: 12 },
      second: { x: 8 + 20 + DEFAULT_SCALE.BALL_DIAMETER_RG, y: 16 },
    };
    const written = writeFourTrackFamilyMembers([], {
      balls: redBalls,
      targetBall: "red",
      entry: authoredEntry({ familyId: "fm_red2", memberId: "mb_red2", authoringStrategyId: "as_red2" }),
    });
    if (!written.ok) throw new Error(written.reason);
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_red2",
    });
    if (!review.ok) throw new Error(review.reason);
    const fp = review.session.reviewedFingerprint;
    for (const track of FAMILY_TRACKS) {
      const frozen = frozenReviewSourceForTrack(review.session, track);
      expect(frozen).toBeTruthy();
      if (!frozen) continue;
      expect(frozen.targetBall).toBe("red");
      expect(reviewCandidatesCollinearWithFrozenSource(review.session, track)).toBe(true);
      expect(review.session.reviewedFingerprint).toBe(fp);
    }
  });

  it("screen-space marker lies on Physical Target Cue→Impact line", () => {
    const SCALE = 10;
    const TABLE_H = 400;
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);
    for (const track of FAMILY_TRACKS) {
      const frozen = frozenReviewSourceForTrack(review.session, track);
      if (!frozen) continue;
      const physicalTarget = resolvePhysicalTarget(frozen.balls, frozen.targetBall);
      const impact = calcImpactBall(frozen.balls.cue, physicalTarget, frozen.runtimeT);
      if (!impact) continue;
      const cuePx = toPx(frozen.balls.cue, SCALE, TABLE_H);
      const impactPx = toPx(impact, SCALE, TABLE_H);
      const markers = cueImpactReviewPreviewMarkers(review.session, track);
      for (const marker of markers) {
        const markerPx = toPx(marker.cue, SCALE, TABLE_H);
        const cross =
          (impactPx.x - cuePx.x) * (markerPx.y - cuePx.y) -
          (impactPx.y - cuePx.y) * (markerPx.x - cuePx.x);
        expect(Math.abs(cross)).toBeLessThan(1e-6);
      }
    }
  });

  it("marker hit radius matches visible circle radius", () => {
    const BALL_DIAMETER_RG = 61.5 / 35.55;
    const BALL_RADIUS_RG = BALL_DIAMETER_RG / 2;
    expect(DERIVED_REVIEW_MARKER_HIT_RADIUS_RG).toBeCloseTo(BALL_RADIUS_RG, 6);
  });

  it("hit at visible edge succeeds, just outside misses", () => {
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);
    const candidates = review.session.members.filter((m) => m.track === "B2T_L");
    const candidate = candidates[0];
    expect(candidate).toBeTruthy();
    const anchor = candidate.balls.cue;
    const edgeInside = {
      x: anchor.x + DERIVED_REVIEW_MARKER_HIT_RADIUS_RG - 0.001,
      y: anchor.y,
    };
    const edgeExact = {
      x: anchor.x + DERIVED_REVIEW_MARKER_HIT_RADIUS_RG,
      y: anchor.y,
    };
    const edgeOutside = {
      x: anchor.x + DERIVED_REVIEW_MARKER_HIT_RADIUS_RG + 0.001,
      y: anchor.y,
    };
    expect(hitTestDerivedReviewMarker({
      pointerRg: edgeInside,
      candidates,
    })).toBeTruthy();
    expect(hitTestDerivedReviewMarker({
      pointerRg: edgeExact,
      candidates,
    })).toBeTruthy();
    expect(hitTestDerivedReviewMarker({
      pointerRg: edgeOutside,
      candidates,
    })).toBeNull();
  });
});
