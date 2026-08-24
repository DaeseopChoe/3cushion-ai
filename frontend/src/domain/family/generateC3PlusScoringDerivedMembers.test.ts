/**
 * Phase 3A-359F — C3+ scoring path / hybrid sampling / derived generator tests.
 */

import { describe, expect, it } from "vitest";
import { writeFamilyMembers } from "./familyAwareWriter";
import {
  assembleC3PlusCandidatePath,
  resolveC3PlusScoringLine,
} from "./c3PlusScoringPath";
import {
  C3_PLUS_MAX_SAMPLE_SPACING,
  C3_PLUS_MIN_SAMPLE_COUNT,
  sampleC3PlusScoringLine,
} from "./sampleC3PlusScoringLine";
import {
  C3_PLUS_DERIVED_RULE,
  C3_PLUS_MEMBER_ORIGIN,
  generateC3PlusScoringDerivedMembers,
} from "./generateC3PlusScoringDerivedMembers";
import { CUE_IMPACT_VALID_FRACTION } from "./generateCueImpactDerivedMembers";
import { resolveTrajectoryHitTolerance } from "../trajectory/hitToleranceRg";
import type { TrajectoryExtensionPayload } from "../trajectoryExtension/model";
import type { Ball3, StrategyEntry } from "../positionSearchEngine";
import { createPositionId } from "../positionId";
import { rematerializeFamilyPartsToPositionRecords } from "./rematerializeFamilyPartsToPositionRecords";
import { migratePositionRecordsToFamilyParts } from "./migratePositionRecordsToFamilyParts";

const HIT = resolveTrajectoryHitTolerance();

function pt(x: number, y: number) {
  return { x, y };
}

/** CO..C6 pathNodes; consecutive nodes on alternating rails (avoid same-rail Origin cut). */
function pathNodesThrough(
  marks: Array<{ id: string; p: { x: number; y: number } }>
): Array<{ x: number; y: number } | null> {
  const defaults: Array<{ x: number; y: number }> = [
    pt(10, 0), // CO BOTTOM
    pt(40, 40), // C1 TOP
    pt(80, 20), // C2 RIGHT
    pt(40, 0), // C3 BOTTOM
    pt(0, 20), // C4 LEFT
    pt(40, 40), // C5 TOP
    pt(80, 20), // C6 RIGHT
  ];
  const map: Record<string, number> = {
    C3: 3,
    C4: 4,
    C5: 5,
    C6: 6,
  };
  let last = 3;
  for (const m of marks) {
    const i = map[m.id];
    if (i != null) {
      defaults[i] = m.p;
      last = Math.max(last, i);
    }
  }
  const nodes: Array<{ x: number; y: number } | null> = defaults.map((p) => ({
    ...p,
  }));
  for (let i = last + 1; i <= 6; i += 1) {
    nodes[i] = null;
  }
  return nodes;
}

function extPayload(
  e1?: { x: number; y: number },
  e2?: { x: number; y: number }
): TrajectoryExtensionPayload {
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

function sourceEntry(partial?: Partial<StrategyEntry>): StrategyEntry {
  return {
    slot: "S1",
    signature: {
      systemId: "5_half_system",
      formulaHash: "h",
      shotType: "뒤돌리기",
    },
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

const balls: Ball3 = {
  cue: pt(5, 5),
  target: pt(15, 15),
  second: pt(50, 20),
};

describe("assembleC3PlusCandidatePath — variable system tail", () => {
  it("supports Origin at C4 with E1", () => {
    const nodes = pathNodesThrough([
      { id: "C3", p: pt(40, 0) },
      { id: "C4", p: pt(80, 10) },
    ]);
    // null C5/C6 → Origin at C4 via chain break
    const r = assembleC3PlusCandidatePath({
      pathNodes: nodes,
      extensions: extPayload(pt(80, 30)),
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.origin.index).toBe(4);
    expect(r.nodes.map((n) => n.id)).toEqual(["C3", "C4", "EXT1"]);
  });

  it("supports Origin at C5 and C6", () => {
    const c5 = assembleC3PlusCandidatePath({
      pathNodes: pathNodesThrough([
        { id: "C3", p: pt(40, 0) },
        { id: "C4", p: pt(80, 10) },
        { id: "C5", p: pt(60, 40) },
      ]),
      extensions: extPayload(pt(20, 40)),
    });
    expect(c5.ok && c5.origin.index).toBe(5);

    const c6 = assembleC3PlusCandidatePath({
      pathNodes: pathNodesThrough([
        { id: "C3", p: pt(40, 0) },
        { id: "C4", p: pt(80, 10) },
        { id: "C5", p: pt(60, 40) },
        { id: "C6", p: pt(0, 20) },
      ]),
      extensions: extPayload(pt(0, 5)),
    });
    expect(c6.ok && c6.origin.index).toBe(6);
  });
});

describe("resolveC3PlusScoringLine — SB first-hit segment", () => {
  it("1: SB on C3→C4 → end C4", () => {
    const path = pathNodesThrough([
      { id: "C3", p: pt(0, 20) },
      { id: "C4", p: pt(80, 20) },
    ]);
    const second = pt(40, 20); // on segment
    const r = resolveC3PlusScoringLine({
      pathNodes: path,
      secondBall: second,
      hitTolerance: HIT,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.scoringLine.map((n) => n.id)).toEqual(["C3", "C4"]);
    expect(r.hitSegment.to.id).toBe("C4");
  });

  it("2: system tail C4 + SB on C4→E1 → end E1", () => {
    const path = pathNodesThrough([
      { id: "C3", p: pt(0, 10) },
      { id: "C4", p: pt(40, 0) },
    ]);
    const e1 = pt(80, 0);
    const second = pt(60, 0);
    const r = resolveC3PlusScoringLine({
      pathNodes: path,
      extensions: extPayload(e1),
      secondBall: second,
      hitTolerance: HIT,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.scoringLine.map((n) => n.id)).toEqual(["C3", "C4", "EXT1"]);
    expect(r.hitSegment.to.id).toBe("EXT1");
  });

  it("3–4: C5/C6 tails + SB on last→E1", () => {
    for (const tail of [
      [
        { id: "C3", p: pt(0, 20) },
        { id: "C4", p: pt(40, 0) },
        { id: "C5", p: pt(80, 20) },
      ],
      [
        { id: "C3", p: pt(0, 20) },
        { id: "C4", p: pt(40, 0) },
        { id: "C5", p: pt(80, 20) },
        { id: "C6", p: pt(60, 40) },
      ],
    ] as const) {
      const last = tail[tail.length - 1]!;
      const e1 = pt(20, 40);
      const mid = {
        x: (last.p.x + e1.x) / 2,
        y: (last.p.y + e1.y) / 2,
      };
      const r = resolveC3PlusScoringLine({
        pathNodes: pathNodesThrough([...tail]),
        extensions: extPayload(e1),
        secondBall: mid,
        hitTolerance: HIT,
      });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.hitSegment.to.id).toBe("EXT1");
      expect(r.scoringLine[r.scoringLine.length - 1]!.id).toBe("EXT1");
    }
  });

  it("5: SB on E1→E2 → end E2 Handle (not projected cushion)", () => {
    const path = pathNodesThrough([
      { id: "C3", p: pt(0, 20) },
      { id: "C4", p: pt(40, 0) },
    ]);
    const e1 = pt(80, 10);
    const e2 = pt(50, 20); // free handle interior
    const second = pt(65, 15); // on E1→E2
    const r = resolveC3PlusScoringLine({
      pathNodes: path,
      extensions: extPayload(e1, e2),
      secondBall: second,
      hitTolerance: HIT,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.scoringLine.map((n) => n.id)).toEqual(["C3", "C4", "EXT1", "EXT2"]);
    expect(r.hitSegment.from.id).toBe("EXT1");
    expect(r.hitSegment.to.id).toBe("EXT2");
  });

  it("6: E2 present but SB earlier → E2 excluded", () => {
    const path = pathNodesThrough([
      { id: "C3", p: pt(0, 20) },
      { id: "C4", p: pt(80, 20) },
    ]);
    const e1 = pt(80, 5);
    const e2 = pt(40, 5);
    const second = pt(40, 20); // on C3→C4
    const r = resolveC3PlusScoringLine({
      pathNodes: path,
      extensions: extPayload(e1, e2),
      secondBall: second,
      hitTolerance: HIT,
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.scoringLine.map((n) => n.id)).toEqual(["C3", "C4"]);
    expect(r.scoringLine.some((n) => n.id === "EXT2")).toBe(false);
  });

  it("7: No SB hit → fail", () => {
    const path = pathNodesThrough([
      { id: "C3", p: pt(0, 20) },
      { id: "C4", p: pt(80, 20) },
    ]);
    const r = resolveC3PlusScoringLine({
      pathNodes: path,
      secondBall: pt(40, 35), // far from segment
      hitTolerance: HIT,
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.code).toBe("NO_SB_HIT");
  });
});

describe("sampleC3PlusScoringLine — hybrid", () => {
  it("preserves mandatory vertices and densifies long segments", () => {
    const line = [
      { id: "C3", kind: "system" as const, point: pt(0, 0), systemIndex: 3 },
      { id: "C4", kind: "system" as const, point: pt(30, 0), systemIndex: 4 },
      { id: "EXT1", kind: "ext1" as const, point: pt(30, 40) },
    ];
    const r = sampleC3PlusScoringLine(line);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const ids = r.samples.filter((s) => s.kind === "vertex").map((s) => s.nodeId);
    expect(ids).toEqual(["C3", "C4", "EXT1"]);
    expect(r.samples.length).toBeGreaterThanOrEqual(C3_PLUS_MIN_SAMPLE_COUNT);
    // C4→EXT1 length 40 → interiors with spacing 3
    const interiors = r.samples.filter((s) => s.kind === "interior");
    expect(interiors.length).toBeGreaterThan(0);
    for (let i = 1; i < r.samples.length; i += 1) {
      const g = Math.hypot(
        r.samples[i]!.point.x - r.samples[i - 1]!.point.x,
        r.samples[i]!.point.y - r.samples[i - 1]!.point.y
      );
      expect(g).toBeLessThanOrEqual(C3_PLUS_MAX_SAMPLE_SPACING + 1e-6);
    }
  });

  it("does not use Cue→Impact VALID_FRACTION 0.30", () => {
    expect(CUE_IMPACT_VALID_FRACTION).toBe(0.3);
    // Full line of length 10 must still be fully sampled (vertices at ends),
    // not truncated to 30%.
    const line = [
      { id: "C3", kind: "system" as const, point: pt(0, 0), systemIndex: 3 },
      { id: "C4", kind: "system" as const, point: pt(10, 0), systemIndex: 4 },
    ];
    const r = sampleC3PlusScoringLine(line);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const last = r.samples[r.samples.length - 1]!;
    expect(last.point).toEqual(pt(10, 0));
    expect(last.nodeId).toBe("C4");
  });

  it("SB closest-point is not forced as a sample", () => {
    const line = [
      { id: "C3", kind: "system" as const, point: pt(0, 0), systemIndex: 3 },
      { id: "C4", kind: "system" as const, point: pt(9, 0), systemIndex: 4 },
    ];
    const sb = pt(4.5, 0);
    const r = sampleC3PlusScoringLine(line);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const hasExactSb = r.samples.some(
      (s) => Math.hypot(s.point.x - sb.x, s.point.y - sb.y) < 1e-9
    );
    // May coincidentally land near SB with densify — assert no dedicated step
    expect(r.samples.every((s) => !s.derivedStep.includes("sb"))).toBe(true);
    void hasExactSb;
  });
});

describe("generateC3PlusScoringDerivedMembers", () => {
  it("generates members with lineage, extensions COPY, hybrid cues", () => {
    const path = pathNodesThrough([
      { id: "C3", p: pt(0, 20) },
      { id: "C4", p: pt(80, 20) },
    ]);
    const extensions = extPayload(pt(80, 0));
    const entry = sourceEntry({ trajectoryExtensions: extensions });
    const result = generateC3PlusScoringDerivedMembers({
      sourceMember: {
        balls: { ...balls, second: pt(40, 20) },
        targetBall: "yellow",
        entry,
      },
      pathNodes: path,
      hitTolerance: HIT,
    });
    expect(result).toMatchObject({ ok: true });
    if (!result.ok) return;
    expect(result.hitSegment).toEqual({ fromId: "C3", toId: "C4" });
    expect(result.members.length).toBeGreaterThanOrEqual(2);
    for (const m of result.members) {
      expect(m.memberOrigin).toBe(C3_PLUS_MEMBER_ORIGIN);
      expect(m.derivedRule).toBe(C3_PLUS_DERIVED_RULE);
      expect(m.generatedFromMemberId).toBe("mb_src");
      expect(m.trajectoryExtensions).toEqual(extensions);
      expect(m.balls.target).toEqual(balls.target);
      expect(m.balls.second).toEqual(pt(40, 20));
      expect(m.derivedStep.startsWith("c3plus:")).toBe(true);
    }
  });

  it("NO_SB_HIT skips generation", () => {
    const path = pathNodesThrough([
      { id: "C3", p: pt(0, 20) },
      { id: "C4", p: pt(80, 20) },
    ]);
    const result = generateC3PlusScoringDerivedMembers({
      sourceMember: {
        balls: { ...balls, second: pt(10, 35) },
        entry: sourceEntry(),
      },
      pathNodes: path,
      hitTolerance: HIT,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("NO_SB_HIT");
  });

  it("repeat generation reuses memberId for same derivedStep (idempotency)", () => {
    const path = pathNodesThrough([
      { id: "C3", p: pt(0, 20) },
      { id: "C4", p: pt(80, 20) },
    ]);
    const entry = sourceEntry();
    const args = {
      sourceMember: {
        balls: { ...balls, second: pt(40, 20) },
        entry,
      },
      pathNodes: path,
      hitTolerance: HIT,
    };
    const first = generateC3PlusScoringDerivedMembers(args);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const existing = first.members.map((m) => ({
      derivedStep: m.derivedStep!,
      memberId: m.memberId,
      authoringStrategyId: m.authoringStrategyId,
      generatedFromMemberId: m.generatedFromMemberId,
    }));
    const second = generateC3PlusScoringDerivedMembers({
      ...args,
      existingMembers: existing,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.members.map((m) => m.memberId)).toEqual(
      first.members.map((m) => m.memberId)
    );
  });

  it("writeFamilyMembers preserves trajectoryExtensions + sourceSlot rematerialize", () => {
    const path = pathNodesThrough([
      { id: "C3", p: pt(0, 20) },
      { id: "C4", p: pt(80, 20) },
    ]);
    const extensions = extPayload(pt(80, 5));
    const entry = sourceEntry({
      trajectoryExtensions: extensions,
      slot: "S2",
    });
    // Prefer packing into empty dataset via writer after generation
    const generated = generateC3PlusScoringDerivedMembers({
      sourceMember: {
        balls: { ...balls, second: pt(40, 20) },
        entry,
      },
      pathNodes: path,
      hitTolerance: HIT,
    });
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;

    const authoredRecord = {
      positionId: createPositionId(balls),
      balls,
      targetBall: "yellow" as const,
      strategies: { S2: entry },
      schemaVersion: 1,
    };

    const written = writeFamilyMembers([authoredRecord], {
      familyId: "fm_c3p",
      members: generated.members.slice(0, 2),
    });
    expect(written.ok).toBe(true);
    if (!written.ok) return;

    const derivedRec = written.dataset.find((r) =>
      Object.values(r.strategies).some(
        (e) => e?.memberOrigin === C3_PLUS_MEMBER_ORIGIN
      )
    );
    expect(derivedRec).toBeTruthy();
    const derivedEntry = Object.values(derivedRec!.strategies).find(
      (e) => e?.memberOrigin === C3_PLUS_MEMBER_ORIGIN
    )!;
    expect(derivedEntry.trajectoryExtensions).toEqual(extensions);
    expect(derivedEntry.derivedRule).toBe(C3_PLUS_DERIVED_RULE);

    const migrated = migratePositionRecordsToFamilyParts(written.dataset);
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;
    const remat = rematerializeFamilyPartsToPositionRecords({
      masters: migrated.masters,
      members: migrated.members,
    });
    expect(remat.ok).toBe(true);
    if (!remat.ok) return;
    const rematEntry = remat.dataset
      .flatMap((r) => Object.values(r.strategies))
      .find((e) => e?.memberOrigin === C3_PLUS_MEMBER_ORIGIN);
    expect(rematEntry?.trajectoryExtensions).toEqual(extensions);
    expect(rematEntry?.slot).toBeDefined();
  });

  it("samples past SB through final segment endpoint", () => {
    const path = pathNodesThrough([
      { id: "C3", p: pt(0, 0) },
      { id: "C4", p: pt(30, 0) },
    ]);
    // long E1 segment with SB near start of C4→E1
    const e1 = pt(30, 40);
    const second = pt(30, 5);
    const result = generateC3PlusScoringDerivedMembers({
      sourceMember: {
        balls: { ...balls, second },
        entry: sourceEntry({ trajectoryExtensions: extPayload(e1) }),
      },
      pathNodes: path,
      hitTolerance: HIT,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.scoringLineIds).toEqual(["C3", "C4", "EXT1"]);
    const cues = result.members.map((m) => m.balls.cue);
    const reachedE1 = cues.some(
      (c) => Math.abs(c.x - e1.x) < 0.6 && Math.abs(c.y - 39.5) < 0.1
    );
    expect(reachedE1).toBe(true);
  });

  it("malformed C3 fail-closed", () => {
    const path = [
      pt(0, 0),
      pt(1, 0),
      pt(2, 0),
      null,
      pt(80, 0),
    ];
    const result = generateC3PlusScoringDerivedMembers({
      sourceMember: { balls, entry: sourceEntry() },
      pathNodes: path,
      hitTolerance: HIT,
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.code).toBe("PATH_FAILED");
  });
});
