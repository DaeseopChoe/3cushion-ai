/**
 * Phase 3A-3F — Derived Review UX domain helpers.
 * Run: npx vitest run src/domain/family/cueImpactDerivedReviewUx.test.ts
 */

import { describe, expect, it } from "vitest";
import type { Ball3, StrategyEntry } from "../positionSearchEngine";
import { writeFourTrackFamilyMembers } from "./familyAwareWriter";
import {
  approveCueImpactDerivedReview,
  createCueImpactDerivedReview,
  cueImpactReviewPreviewMarkers,
  fingerprintCueImpactCandidateSet,
  frozenReviewSourceForTrack,
  getVisibleReviewCandidates,
  hitTestDerivedReviewMarker,
  resolveAuthoredTrackForReview,
  resolveDerivedPreviewBall,
  resolveReviewDisplayedSourceMemberId,
  reviewCandidatesCollinearWithFrozenSource,
} from "./cueImpactDerivedReview";
import { FAMILY_TRACKS } from "./trackSymmetry";
import { projectDerivedCandidateToRuntimeView, projectFamilySourceMemberToRuntimeView } from "./projectDerivedCandidateToRuntimeView";
import { DEFAULT_SCALE } from "../../utils/physics/ImpactEngine";
import { hydrateBallsStateForUi } from "../../admin/slotAutoRecommend";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
    hpT: { T: "8/8", hit_point: { x: -2, y: 1.5 }, mode: "TIP", tipCount: 2 },
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

describe("Derived Review UX domain", () => {
  it("sets authoredTrack on session and fail-closes without AUTHORED", () => {
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    expect(review.ok).toBe(true);
    if (!review.ok) return;
    expect(review.session.authoredTrack).toBe("B2T_L");
    expect(resolveAuthoredTrackForReview(written.dataset, "fm_family1")).toBe("B2T_L");

    const missing = createCueImpactDerivedReview({
      dataset: [],
      familyId: "fm_missing",
    });
    expect(missing.ok).toBe(false);
  });

  it("filters visible markers by viewingTrack without changing members", () => {
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);
    const fp = review.session.reviewedFingerprint;
    const all = review.session.members.length;

    const b2t = getVisibleReviewCandidates(review.session, "B2T_L");
    const t2b = getVisibleReviewCandidates(review.session, "T2B_R");
    expect(b2t.length).toBeGreaterThan(0);
    expect(t2b.length).toBeGreaterThan(0);
    expect(b2t.every((m) => m.track === "B2T_L")).toBe(true);
    expect(t2b.every((m) => m.track === "T2B_R")).toBe(true);
    expect(b2t.length + t2b.length).toBeLessThan(all * 2);

    const markersB2t = cueImpactReviewPreviewMarkers(review.session, "B2T_L");
    expect(markersB2t.every((m) => m.track === "B2T_L")).toBe(true);
    expect(review.session.reviewedFingerprint).toBe(fp);
    expect(review.session.members).toHaveLength(all);
  });

  it("hit-tests exact frozen candidate by cue anchor", () => {
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);
    const candidate = getVisibleReviewCandidates(review.session, "B2T_L")[0];
    const hit = hitTestDerivedReviewMarker({
      pointerRg: { ...candidate.balls.cue },
      candidates: [candidate],
    });
    expect(hit?.memberId).toBe(candidate.memberId);
    expect(hit?.derivedStep).toBe(candidate.derivedStep);
  });

  it("approves full session.members regardless of viewingTrack filter", () => {
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);
    const visible = getVisibleReviewCandidates(review.session, "T2B_L");
    expect(visible.length).toBeGreaterThan(0);
    expect(visible.length).toBeLessThan(review.session.members.length);

    const approved = approveCueImpactDerivedReview({
      dataset: written.dataset,
      session: review.session,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.session.members).toHaveLength(review.session.members.length);
  });

  it("projects derived candidate runtime HPT for symmetry track without persisting mirror", () => {
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);
    const candidate = review.session.members.find((m) => m.track === "B2T_R");
    expect(candidate).toBeTruthy();
    if (!candidate) return;

    const projection = projectDerivedCandidateToRuntimeView({
      dataset: written.dataset,
      familyId: "fm_family1",
      candidate,
      slot: "S1",
    });
    const canonicalX = (written.dataset[0].strategies.S1.hpT as { hit_point?: { x?: number } })
      ?.hit_point?.x;
    const runtimeX = (projection.entry.hpT as { hit_point?: { x?: number } })?.hit_point?.x;
    expect(typeof canonicalX).toBe("number");
    expect(typeof runtimeX).toBe("number");
    expect(runtimeX).toBe(-(canonicalX as number));
    expect(projection.balls).toEqual(candidate.balls);
  });

  it("track switch filters display only and keeps session fingerprint unchanged", () => {
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);
    const fp = review.session.reviewedFingerprint;
    const membersRef = review.session.members;
    const allCount = membersRef.length;

    for (const track of FAMILY_TRACKS) {
      const visible = getVisibleReviewCandidates(review.session, track);
      expect(visible.length).toBeGreaterThan(0);
      expect(visible.every((m) => m.track === track)).toBe(true);
      expect(review.session.reviewedFingerprint).toBe(fp);
      expect(review.session.members).toBe(membersRef);
      expect(review.session.members).toHaveLength(allCount);
      expect(frozenReviewSourceForTrack(review.session, track)).toBeTruthy();
      expect(resolveReviewDisplayedSourceMemberId(review.session, track)).toBeTruthy();
      expect(reviewCandidatesCollinearWithFrozenSource(review.session, track)).toBe(true);
    }
  });

  it("preview marker anchor uses raw candidate cue coordinates", () => {
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);
    const candidate = getVisibleReviewCandidates(review.session, "B2T_L")[0];
    const anchor = resolveDerivedPreviewBall(candidate);
    expect(anchor).toEqual(candidate.balls.cue);
    const marker = cueImpactReviewPreviewMarkers(review.session, "B2T_L")[0];
    expect(marker.cue).toEqual(candidate.balls.cue);
  });

  it("approval persists full session.members with zero pre-approval mutation", () => {
    const written = persistFourTrack();
    const beforeCount = written.dataset.length;
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);
    expect(written.dataset).toHaveLength(beforeCount);
    const approved = approveCueImpactDerivedReview({
      dataset: written.dataset,
      session: review.session,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    expect(approved.session.members).toHaveLength(review.session.members.length);
  });
});

describe("Derived Review UI hydration boundary", () => {
  it("hydrates source-track projection Ball3.target onto ballsState.target", () => {
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
      const canonical = structuredClone(frozen.balls);
      const projection = projectFamilySourceMemberToRuntimeView({
        entry: frozen.entry,
        balls: frozen.balls,
        slot: "S1",
      });
      expect(projection.balls.target).toEqual(canonical.target);
      expect("target_center" in projection.balls).toBe(false);
      const ui = hydrateBallsStateForUi(projection.balls);
      expect(ui.target).toEqual(canonical.target);
      expect(ui.target_center).toBeUndefined();
      expect(ui.cue).toEqual(canonical.cue);
      expect(ui.second).toEqual(canonical.second);
      expect(frozen.balls).toEqual(canonical);
      expect("target_center" in frozen.balls).toBe(false);
    }
  });

  it("hydrates INSPECT candidate Ball3.target onto ballsState.target", () => {
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);
    const candidate = getVisibleReviewCandidates(review.session, "B2T_L")[0];
    const canonical = structuredClone(candidate.balls);
    const projection = projectDerivedCandidateToRuntimeView({
      dataset: written.dataset,
      familyId: "fm_family1",
      candidate,
      slot: "S1",
    });
    const ui = hydrateBallsStateForUi(projection.balls);
    expect(ui.target).toEqual(canonical.target);
    expect(ui.target_center).toBeUndefined();
    expect(ui.cue).toEqual(canonical.cue);
    expect(ui.second).toEqual(canonical.second);
    expect(candidate.balls).toEqual(canonical);
    expect("target_center" in candidate.balls).toBe(false);
  });

  it("does not write target_center into approved dataset storage balls", () => {
    const written = persistFourTrack();
    const review = createCueImpactDerivedReview({
      dataset: written.dataset,
      familyId: "fm_family1",
    });
    if (!review.ok) throw new Error(review.reason);
    const approved = approveCueImpactDerivedReview({
      dataset: written.dataset,
      session: review.session,
    });
    if (!approved.ok) throw new Error(approved.reason);
    for (const rec of approved.dataset) {
      expect(rec.balls.target).toBeTruthy();
      expect("target_center" in rec.balls).toBe(false);
    }
  });

  it("App.jsx Review/INSPECT setters use hydrateBallsStateForUi SSOT", () => {
    const appPath = join(dirname(fileURLToPath(import.meta.url)), "../../App.jsx");
    const text = readFileSync(appPath, "utf8");
    const reviewFn = text.slice(
      text.indexOf("function applyReviewSourceTrackDisplay"),
      text.indexOf("function handleEnterDerivedInspect")
    );
    const inspectFn = text.slice(
      text.indexOf("function handleEnterDerivedInspect"),
      text.indexOf("function handleExitDerivedInspect")
    );
    expect(reviewFn).toContain("setBallsState(hydrateBallsStateForUi(projection.balls))");
    expect(reviewFn).not.toContain("setBallsState({ ...projection.balls })");
    expect(inspectFn).toContain("setBallsState(hydrateBallsStateForUi(projection.balls))");
    expect(inspectFn).not.toContain("setBallsState({ ...projection.balls })");
  });
});
