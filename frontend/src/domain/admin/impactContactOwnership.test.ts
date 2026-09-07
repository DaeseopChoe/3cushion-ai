/**
 * ADMIN Impact CONTACT ownership + nearest-trajectory snap contracts (T1–T16 design).
 */
import { describe, expect, it } from "vitest";
import { calcImpactBall } from "../../data/system/calculator";
import { DEFAULT_SCALE } from "../../utils/physics/ImpactEngine";
import {
  projectImpactOntoNearestTrajectory,
  resolveContactImpactRg,
  resolveImpactPointToCanonicalThickness,
  stripAuthoredImpactBall,
} from "./impactContactOwnership";
import { collectDisplayProjectionSegments } from "../trajectoryExtension/projectionSegments";

const cue = { x: 20, y: 16 };
const target = { x: 40, y: 20 };

describe("impactContactOwnership", () => {
  it("T1: CONTACT relation from cue+target+T", () => {
    const impact = resolveContactImpactRg({
      cue,
      target,
      T: "8/8",
      calcImpactBall,
    });
    expect(impact).not.toBeNull();
    const direct = calcImpactBall(cue, target, "8/8");
    expect(impact).toEqual(direct);
  });

  it("T2/T3: stripAuthoredImpact removes stale FREE ownership", () => {
    const balls = {
      cue,
      target,
      second: { x: 60, y: 20 },
      impact: { x: 1, y: 1 },
    };
    const stripped = stripAuthoredImpactBall(balls);
    expect(stripped).toEqual({
      cue,
      target,
      second: { x: 60, y: 20 },
    });
    expect((stripped as any).impact).toBeUndefined();
  });

  it("T5: contact recompute after target move ignores stale impact", () => {
    const stale = { x: 1, y: 1 };
    const movedTarget = { x: 50, y: 22 };
    const contact = resolveContactImpactRg({
      cue,
      target: movedTarget,
      T: "-3/8",
      calcImpactBall,
    });
    expect(contact).not.toEqual(stale);
    expect(contact).toEqual(calcImpactBall(cue, movedTarget, "-3/8"));
  });

  it("T7/T8: nearest trajectory picks minimum-distance segment", () => {
    const segments = collectDisplayProjectionSegments({
      calculatedPath: [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
      revealPath: null,
      extensionSegments: null,
    });
    const impact = { x: 10.1, y: 5 };
    const proj = projectImpactOntoNearestTrajectory({ impact, segments });
    expect(proj).not.toBeNull();
    expect(proj!.point.x).toBeCloseTo(10, 5);
    expect(proj!.point.y).toBeCloseTo(5, 5);
    expect(proj!.segment.source).toBe("calculated");
  });

  it("T9: snap→thickness is not target-center reset", () => {
    const contact = calcImpactBall(cue, target, "8/8")!;
    const offOrbit = { x: contact.x + 2, y: contact.y + 1 };
    const resolved = resolveImpactPointToCanonicalThickness({
      cue,
      target,
      impactCandidate: offOrbit,
      scale: DEFAULT_SCALE,
    });
    expect(resolved).not.toBeNull();
    expect(resolved!.orbitImpact).not.toEqual(target);
    expect(resolved!.thickness.legacyT).toBeTruthy();
  });

  it("T10: dashed cue→impact guide is not in collectDisplayProjectionSegments", () => {
    const segs = collectDisplayProjectionSegments({
      calculatedPath: [
        { x: 0, y: 0 },
        { x: 5, y: 0 },
      ],
      revealPath: null,
      extensionSegments: null,
    });
    expect(segs.every((s) => s.source !== "guide")).toBe(true);
    expect(segs.some((s) => s.source === "calculated")).toBe(true);
  });

  it("T4: impact drag candidate updates canonical T via thickness helper", () => {
    const contact = calcImpactBall(cue, target, "8/8")!;
    const nudged = { x: contact.x + 0.5, y: contact.y };
    const resolved = resolveImpactPointToCanonicalThickness({
      cue,
      target,
      impactCandidate: nudged,
      scale: DEFAULT_SCALE,
    });
    expect(resolved).not.toBeNull();
    const recomputed = calcImpactBall(cue, target, resolved!.thickness.legacyT);
    expect(recomputed).not.toBeNull();
  });
});
