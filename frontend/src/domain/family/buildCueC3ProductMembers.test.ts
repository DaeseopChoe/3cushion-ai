/**
 * Phase 3A-360 — Cue × C3+ Cartesian Product builder tests.
 * Run: npx vitest run src/domain/family/buildCueC3ProductMembers.test.ts
 */

import { describe, expect, it } from "vitest";
import type { Ball3, Point, StrategyEntry } from "../positionSearchEngine";
import { runSpatialRecall } from "../recall/recallEngine";
import {
  writeFamilyMembers,
  writeFourTrackFamilyMembers,
  type LogicalFamilyMemberCandidate,
} from "./familyAwareWriter";
import {
  buildCueC3ProductMembers,
  fingerprintCueC3ProductMembers,
  CUE_C3_PRODUCT_MEMBER_ORIGIN,
  CUE_C3_PRODUCT_DERIVED_RULE,
} from "./buildCueC3ProductMembers";
import type { CueImpactReviewFrozenSource } from "./cueImpactDerivedReview";
import {
  encodeCueC3ProductDerivedStep,
  parseCueC3ProductDerivedStep,
} from "./familyIdentity";
import { CUE_IMPACT_MEMBER_ORIGIN } from "./generateCueImpactDerivedMembers";
import { C3_PLUS_MEMBER_ORIGIN } from "./generateC3PlusScoringDerivedMembers";
import { FAMILY_TRACKS, type FamilyTrack } from "./trackSymmetry";

function pt(x: number, y: number): Point {
  return { x, y };
}

function baseBalls(): Ball3 {
  return {
    cue: pt(10, 16),
    target: pt(40, 16),
    second: pt(20, 8),
  };
}

function baseEntry(track: FamilyTrack, memberId: string): StrategyEntry {
  return {
    slot: "S1",
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
    authoringStrategyId: `as_${track}`,
    familyId: "fm_prod",
    memberId,
    memberOrigin: track === "B2T_L" ? "AUTHORED" : "SYMMETRY",
    ...(track !== "B2T_L"
      ? { generatedFromMemberId: "mb_B2T_L", symmetryOp: "H" as const }
      : {}),
    track,
    meta: {
      impact: pt(12, 9),
      final: pt(50, 5),
      angle_ci: 0.1,
      angle_fs: 0.2,
    },
    trajectoryExtensions: {
      extensionSchemaVersion: 1,
      origin: { kind: "path_node", source: "corrected" },
      items: [
        {
          id: "EXT-S1-01",
          index: 1,
          endpoint: pt(70, 20),
          userEdited: true,
          createdAt: "t0",
          updatedAt: "t0",
        },
      ],
    },
  };
}

function trackOffset(track: FamilyTrack): number {
  return FAMILY_TRACKS.indexOf(track) * 6;
}

function frozenSources(): Partial<Record<FamilyTrack, CueImpactReviewFrozenSource>> {
  const out: Partial<Record<FamilyTrack, CueImpactReviewFrozenSource>> = {};
  for (const track of FAMILY_TRACKS) {
    const memberId = `mb_${track}`;
    const dx = trackOffset(track);
    const balls: Ball3 = {
      cue: pt(10 + dx, 16),
      target: pt(40 + dx, 16),
      second: pt(20 + dx, 8),
    };
    out[track] = {
      track,
      memberId,
      balls,
      entry: baseEntry(track, memberId),
      runtimeT: "8/8",
    };
  }
  return out;
}

function cueSample(
  track: FamilyTrack,
  t: number,
  cueX: number
): LogicalFamilyMemberCandidate {
  const base = frozenSources()[track]!;
  const dx = trackOffset(track);
  return {
    familyId: "fm_prod",
    memberId: `mb_cue_${track}_${t}`,
    memberOrigin: CUE_IMPACT_MEMBER_ORIGIN,
    generatedFromMemberId: base.memberId,
    derivedRule: "CUE_IMPACT_FIRST_30PCT",
    derivedStep: `cue_impact:t:${t.toFixed(6)}`,
    authoringStrategyId: `as_cue_${track}_${t}`,
    track,
    balls: {
      cue: pt(cueX + dx, 16),
      target: { ...base.balls.target },
      second: { ...base.balls.second },
    },
    compatibility: {
      signature: base.entry.signature,
      sysInputs: { ...(base.entry.sysInputs ?? {}) },
    },
  };
}

/** C3+ Review parks sample on balls.cue — Product maps P onto balls.second (Role). */
function c3Sample(
  track: FamilyTrack,
  index: number,
  sampleY: number
): LogicalFamilyMemberCandidate {
  const base = frozenSources()[track]!;
  const dx = trackOffset(track);
  return {
    familyId: "fm_prod",
    memberId: `mb_c3_${track}_${index}`,
    memberOrigin: C3_PLUS_MEMBER_ORIGIN,
    generatedFromMemberId: base.memberId,
    derivedRule: "C3_PLUS_SCORING_LINE_v1",
    derivedStep: `c3plus:seg:0:t:${(index / 100).toFixed(6)}`,
    authoringStrategyId: `as_c3_${track}_${index}`,
    track,
    balls: {
      cue: pt(55 + dx, sampleY),
      target: { ...base.balls.target },
      second: { ...base.balls.second },
    },
    compatibility: {
      signature: base.entry.signature,
      sysInputs: { ...(base.entry.sysInputs ?? {}) },
    },
  };
}

function synthSamples(nc: number, n3: number) {
  const cueMembers: LogicalFamilyMemberCandidate[] = [];
  const c3Members: LogicalFamilyMemberCandidate[] = [];
  for (const track of FAMILY_TRACKS) {
    for (let i = 1; i <= nc; i += 1) {
      const t = (0.3 * i) / nc;
      cueMembers.push(cueSample(track, t, 10 + i * 2));
    }
    for (let j = 0; j < n3; j += 1) {
      c3Members.push(c3Sample(track, j, 5 + j * 1.5));
    }
  }
  return { cueMembers, c3Members };
}

describe("encodeCueC3ProductDerivedStep", () => {
  it("round-trips cue and c3 steps", () => {
    const step = encodeCueC3ProductDerivedStep(
      "cue_impact:t:0.100000",
      "c3plus:v:C4"
    );
    expect(step).toBe("cue:cue_impact:t:0.100000|c3:c3plus:v:C4");
    expect(parseCueC3ProductDerivedStep(step)).toEqual({
      cueStep: "cue_impact:t:0.100000",
      c3Step: "c3plus:v:C4",
    });
  });
});

describe("buildCueC3ProductMembers", () => {
  it("1: 4 × 3 × 21 = 252 Product", () => {
    const { cueMembers, c3Members } = synthSamples(3, 21);
    const built = buildCueC3ProductMembers({
      familyId: "fm_prod",
      cueMembers,
      c3PlusMembers: c3Members,
      frozenSourcesByTrack: frozenSources(),
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    expect(built.cardinality.expected).toBe(252);
    expect(built.members.length).toBe(252);
    expect(built.cardinality.cueSamplesPerTrack).toBe(3);
    expect(built.cardinality.c3SamplesPerTrack).toBe(21);
  });

  it("2: per track Product = 63", () => {
    const { cueMembers, c3Members } = synthSamples(3, 21);
    const built = buildCueC3ProductMembers({
      familyId: "fm_prod",
      cueMembers,
      c3PlusMembers: c3Members,
      frozenSourcesByTrack: frozenSources(),
    });
    if (!built.ok) throw new Error(built.reason);
    for (const track of FAMILY_TRACKS) {
      const n = built.members.filter((m) => m.track === track).length;
      expect(n).toBe(63);
      expect(built.cardinality.perTrack[track].product).toBe(63);
    }
  });

  it("3: 252 identity unique", () => {
    const { cueMembers, c3Members } = synthSamples(3, 21);
    const built = buildCueC3ProductMembers({
      familyId: "fm_prod",
      cueMembers,
      c3PlusMembers: c3Members,
      frozenSourcesByTrack: frozenSources(),
    });
    if (!built.ok) throw new Error(built.reason);
    const keys = new Set(
      built.members.map((m) => `${m.generatedFromMemberId}|${m.derivedStep}`)
    );
    expect(keys.size).toBe(252);
  });

  it("4: deterministic regeneration (same fingerprint + memberIds)", () => {
    const { cueMembers, c3Members } = synthSamples(3, 5);
    const first = buildCueC3ProductMembers({
      familyId: "fm_prod",
      cueMembers,
      c3PlusMembers: c3Members,
      frozenSourcesByTrack: frozenSources(),
    });
    if (!first.ok) throw new Error(first.reason);
    const second = buildCueC3ProductMembers({
      familyId: "fm_prod",
      cueMembers,
      c3PlusMembers: c3Members,
      frozenSourcesByTrack: frozenSources(),
      existingMembers: first.members.map((m) => ({
        derivedStep: m.derivedStep!,
        memberId: m.memberId,
        authoringStrategyId: m.authoringStrategyId,
        generatedFromMemberId: m.generatedFromMemberId,
      })),
    });
    if (!second.ok) throw new Error(second.reason);
    expect(fingerprintCueC3ProductMembers(second.members)).toBe(
      fingerprintCueC3ProductMembers(first.members)
    );
    expect(second.members.map((m) => m.memberId).sort()).toEqual(
      first.members.map((m) => m.memberId).sort()
    );
  });

  it("5–9: balls.cue + physical-second slot + base strategy + extensions COPY", () => {
    const { cueMembers, c3Members } = synthSamples(2, 3);
    const sources = frozenSources();
    const built = buildCueC3ProductMembers({
      familyId: "fm_prod",
      cueMembers,
      c3PlusMembers: c3Members,
      frozenSourcesByTrack: sources,
    });
    if (!built.ok) throw new Error(built.reason);
    const cue0 = cueMembers.find(
      (m) => m.track === "B2T_L" && m.derivedStep?.includes("0.150000")
    )!;
    const c3_0 = c3Members.find(
      (m) => m.track === "B2T_L" && m.derivedStep?.endsWith("0.000000")
    )!;
    const product = built.members.find(
      (m) =>
        m.track === "B2T_L" &&
        m.derivedStep ===
          encodeCueC3ProductDerivedStep(cue0.derivedStep!, c3_0.derivedStep!)
    )!;
    expect(product.balls.cue).toEqual(cue0.balls.cue);
    // No targetBall on fixture → legacy: P lands on balls.second
    expect(product.balls.second).toEqual(c3_0.balls.cue);
    expect(product.balls.target).toEqual(sources.B2T_L!.balls.target);
    expect(product.compatibility.sysInputs).toEqual(
      sources.B2T_L!.entry.sysInputs
    );
    expect(product.trajectoryExtensions).toEqual(
      sources.B2T_L!.entry.trajectoryExtensions
    );
    expect(product.memberOrigin).toBe(CUE_C3_PRODUCT_MEMBER_ORIGIN);
    expect(product.derivedRule).toBe(CUE_C3_PRODUCT_DERIVED_RULE);
    expect(product.generatedFromMemberId).toBe("mb_B2T_L");
  });

  it("CASE A targetBall=red: P → balls.second; base Target preserved on balls.target", () => {
    const sources = frozenSources();
    // Role Ball3: physical Target red @ target; Second yellow @ second
    const roleRedBase = {
      cue: pt(10, 16),
      target: pt(60, 20),
      second: pt(20, 20),
    };
    for (const track of FAMILY_TRACKS) {
      sources[track] = {
        ...sources[track]!,
        targetBall: "red",
        balls: { ...roleRedBase },
      };
    }
    const { cueMembers, c3Members } = synthSamples(1, 1);
    for (const m of [...cueMembers, ...c3Members]) {
      m.targetBall = "red";
      m.balls = {
        ...m.balls,
        target: { ...roleRedBase.target },
        second: { ...roleRedBase.second },
      };
    }
    const built = buildCueC3ProductMembers({
      familyId: "fm_prod",
      cueMembers,
      c3PlusMembers: c3Members,
      frozenSourcesByTrack: sources,
    });
    if (!built.ok) throw new Error(built.reason);
    for (const product of built.members) {
      const track = product.track as FamilyTrack;
      const c3 = c3Members.find((m) => m.track === track)!;
      const base = sources[track]!;
      expect(product.targetBall).toBe("red");
      expect(product.balls.second).toEqual(c3.balls.cue);
      expect(product.balls.target).toEqual(base.balls.target);
      expect(product.balls.target).not.toEqual(c3.balls.cue);
      expect(product.balls.second).not.toEqual(base.balls.target);
    }
  });

  it("CASE B targetBall=yellow: P → balls.second; base Target preserved on balls.target", () => {
    const sources = frozenSources();
    for (const track of FAMILY_TRACKS) {
      sources[track] = { ...sources[track]!, targetBall: "yellow" };
    }
    const { cueMembers, c3Members } = synthSamples(1, 1);
    for (const m of [...cueMembers, ...c3Members]) {
      m.targetBall = "yellow";
    }
    const built = buildCueC3ProductMembers({
      familyId: "fm_prod",
      cueMembers,
      c3PlusMembers: c3Members,
      frozenSourcesByTrack: sources,
    });
    if (!built.ok) throw new Error(built.reason);
    for (const product of built.members) {
      const track = product.track as FamilyTrack;
      const c3 = c3Members.find((m) => m.track === track)!;
      const base = sources[track]!;
      expect(product.targetBall).toBe("yellow");
      expect(product.balls.second).toEqual(c3.balls.cue);
      expect(product.balls.target).toEqual(base.balls.target);
      expect(product.balls.target).not.toEqual(c3.balls.cue);
    }
  });

  it("CASE A/B Product field structure is identical (P always balls.second)", () => {
    const assertStructure = (targetBall: "red" | "yellow") => {
      const sources = frozenSources();
      const roleBase =
        targetBall === "red"
          ? { cue: pt(10, 16), target: pt(60, 20), second: pt(20, 20) }
          : { cue: pt(10, 16), target: pt(20, 20), second: pt(60, 20) };
      for (const track of FAMILY_TRACKS) {
        sources[track] = {
          ...sources[track]!,
          targetBall,
          balls: { ...roleBase },
        };
      }
      const { cueMembers, c3Members } = synthSamples(1, 1);
      for (const m of [...cueMembers, ...c3Members]) {
        m.targetBall = targetBall;
        m.balls = {
          ...m.balls,
          target: { ...roleBase.target },
          second: { ...roleBase.second },
        };
      }
      const built = buildCueC3ProductMembers({
        familyId: "fm_prod",
        cueMembers,
        c3PlusMembers: c3Members,
        frozenSourcesByTrack: sources,
      });
      if (!built.ok) throw new Error(built.reason);
      const product = built.members.find((m) => m.track === "B2T_L")!;
      const c3 = c3Members.find((m) => m.track === "B2T_L")!;
      expect(product.balls.second).toEqual(c3.balls.cue);
      expect(product.balls.target).toEqual(roleBase.target);
      expect(product.balls.target).not.toEqual(c3.balls.cue);
      return product;
    };
    const a = assertStructure("red");
    const b = assertStructure("yellow");
    // Same field roles: second holds P, target holds base Target
    expect(a.balls.second).toBeTruthy();
    expect(b.balls.second).toBeTruthy();
    expect(a.balls.target).not.toEqual(a.balls.second);
    expect(b.balls.target).not.toEqual(b.balls.second);
  });

  it("CASE A/B Search: query with physical second at P matches Product (adminSearch)", () => {
    for (const targetBall of ["red", "yellow"] as const) {
      const bases = writeFourTrackFamilyMembers([], {
        balls: baseBalls(),
        entry: baseEntry("B2T_L", "mb_B2T_L"),
        targetBall,
      });
      if (!bases.ok) throw new Error(bases.reason);

      const frozen: Partial<Record<FamilyTrack, CueImpactReviewFrozenSource>> = {};
      const cueMembers: LogicalFamilyMemberCandidate[] = [];
      const c3Members: LogicalFamilyMemberCandidate[] = [];

      for (const track of FAMILY_TRACKS) {
        const loc = bases.set.members.find((m) => m.track === track);
        if (!loc) throw new Error(`missing track ${track}`);
        frozen[track] = {
          track,
          memberId: loc.entry.memberId!,
          balls: loc.balls,
          entry: loc.entry,
          runtimeT: "8/8",
          targetBall,
        };
        const dx = FAMILY_TRACKS.indexOf(track) * 6;
        cueMembers.push({
          familyId: loc.entry.familyId!,
          memberId: `mb_cue_${track}_1`,
          memberOrigin: CUE_IMPACT_MEMBER_ORIGIN,
          generatedFromMemberId: loc.entry.memberId,
          derivedRule: "CUE_IMPACT_FIRST_30PCT",
          derivedStep: "cue_impact:t:0.100000",
          authoringStrategyId: `as_cue_${track}`,
          track,
          targetBall,
          balls: {
            cue: pt(12 + dx, 16),
            target: { ...loc.balls.target },
            second: { ...loc.balls.second },
          },
          compatibility: {
            signature: loc.entry.signature,
            sysInputs: { ...(loc.entry.sysInputs ?? {}) },
          },
        });
        c3Members.push({
          familyId: loc.entry.familyId!,
          memberId: `mb_c3_${track}_0`,
          memberOrigin: C3_PLUS_MEMBER_ORIGIN,
          generatedFromMemberId: loc.entry.memberId,
          derivedRule: "C3_PLUS_SCORING_LINE_v1",
          derivedStep: "c3plus:seg:0:t:0.000000",
          authoringStrategyId: `as_c3_${track}`,
          track,
          targetBall,
          balls: {
            cue: pt(55 + dx, 7),
            target: { ...loc.balls.target },
            second: { ...loc.balls.second },
          },
          compatibility: {
            signature: loc.entry.signature,
            sysInputs: { ...(loc.entry.sysInputs ?? {}) },
          },
        });
      }

      const built = buildCueC3ProductMembers({
        familyId: bases.set.familyId,
        cueMembers,
        c3PlusMembers: c3Members,
        frozenSourcesByTrack: frozen,
      });
      if (!built.ok) throw new Error(built.reason);

      const written = writeFamilyMembers(bases.dataset, {
        familyId: bases.set.familyId,
        members: built.members,
      });
      if (!written.ok) throw new Error(written.reason);

      const product = built.members.find((m) => m.track === "B2T_L")!;
      const hit = runSpatialRecall({
        dataset: written.dataset,
        query: { balls: product.balls, targetBall },
        profile: "adminSearch",
      });
      expect(hit.kind).toBe("match");
      if (hit.kind !== "match") return;
      expect(hit.record.balls).toEqual(product.balls);

      // Wrong color at P: swap object slots → must not Exact-match this Product layout
      const wrong: Ball3 = {
        cue: product.balls.cue,
        target: product.balls.second,
        second: product.balls.target,
      };
      const miss = runSpatialRecall({
        dataset: written.dataset,
        query: { balls: wrong, targetBall },
        profile: "adminSearch",
      });
      if (miss.kind === "match") {
        expect(miss.record.balls).not.toEqual(product.balls);
      }
    }
  });

  it("10–11: no Cue-derived as parent; generatedFrom = base", () => {
    const { cueMembers, c3Members } = synthSamples(2, 2);
    const built = buildCueC3ProductMembers({
      familyId: "fm_prod",
      cueMembers,
      c3PlusMembers: c3Members,
      frozenSourcesByTrack: frozenSources(),
    });
    if (!built.ok) throw new Error(built.reason);
    const cueIds = new Set(cueMembers.map((m) => m.memberId));
    for (const m of built.members) {
      expect(cueIds.has(m.generatedFromMemberId!)).toBe(false);
      expect(m.generatedFromMemberId).toMatch(/^mb_/);
      expect(FAMILY_TRACKS.includes(m.track as FamilyTrack)).toBe(true);
    }
  });

  it("Cue / C3 count mismatch → fail-closed", () => {
    const { cueMembers, c3Members } = synthSamples(3, 4);
    const brokenCue = cueMembers.filter(
      (m) => !(m.track === "T2B_R" && m.derivedStep?.includes("0.300000"))
    );
    const badCue = buildCueC3ProductMembers({
      familyId: "fm_prod",
      cueMembers: brokenCue,
      c3PlusMembers: c3Members,
      frozenSourcesByTrack: frozenSources(),
    });
    expect(badCue.ok).toBe(false);
    if (badCue.ok) return;
    expect(badCue.code).toBe("CUE_COUNT_MISMATCH");

    const brokenC3 = c3Members.filter(
      (m) => !(m.track === "B2T_R" && m.derivedStep?.endsWith("0.030000"))
    );
    const badC3 = buildCueC3ProductMembers({
      familyId: "fm_prod",
      cueMembers,
      c3PlusMembers: brokenC3,
      frozenSourcesByTrack: frozenSources(),
    });
    expect(badC3.ok).toBe(false);
    if (badC3.ok) return;
    expect(badC3.code).toBe("C3_COUNT_MISMATCH");
  });

  it("30: Exact packing writes 252 Product PositionRecords (SLOT_CAPACITY OK)", () => {
    const bases = writeFourTrackFamilyMembers([], {
      balls: baseBalls(),
      entry: baseEntry("B2T_L", "mb_B2T_L"),
    });
    if (!bases.ok) throw new Error(bases.reason);

    const frozen: Partial<Record<FamilyTrack, CueImpactReviewFrozenSource>> = {};
    const cueMembers: LogicalFamilyMemberCandidate[] = [];
    const c3Members: LogicalFamilyMemberCandidate[] = [];

    for (const track of FAMILY_TRACKS) {
      const loc = bases.set.members.find((m) => m.track === track);
      if (!loc) throw new Error(`missing track ${track}`);
      frozen[track] = {
        track,
        memberId: loc.entry.memberId!,
        balls: loc.balls,
        entry: loc.entry,
        runtimeT: "8/8",
      };
      for (let i = 1; i <= 3; i += 1) {
        const t = (0.3 * i) / 3;
        const dx = FAMILY_TRACKS.indexOf(track) * 6;
        cueMembers.push({
          familyId: loc.entry.familyId!,
          memberId: `mb_cue_${track}_${i}`,
          memberOrigin: CUE_IMPACT_MEMBER_ORIGIN,
          generatedFromMemberId: loc.entry.memberId,
          derivedRule: "CUE_IMPACT_FIRST_30PCT",
          derivedStep: `cue_impact:t:${t.toFixed(6)}`,
          authoringStrategyId: `as_cue_${track}_${i}`,
          track,
          balls: {
            cue: pt(10 + i * 2 + dx, 16),
            target: { ...loc.balls.target },
            second: { ...loc.balls.second },
          },
          compatibility: {
            signature: loc.entry.signature,
            sysInputs: { ...(loc.entry.sysInputs ?? {}) },
          },
        });
      }
      for (let j = 0; j < 21; j += 1) {
        const dx = FAMILY_TRACKS.indexOf(track) * 6;
        c3Members.push({
          familyId: loc.entry.familyId!,
          memberId: `mb_c3_${track}_${j}`,
          memberOrigin: C3_PLUS_MEMBER_ORIGIN,
          generatedFromMemberId: loc.entry.memberId,
          derivedRule: "C3_PLUS_SCORING_LINE_v1",
          derivedStep: `c3plus:seg:0:t:${(j / 100).toFixed(6)}`,
          authoringStrategyId: `as_c3_${track}_${j}`,
          track,
          balls: {
            cue: pt(55 + dx, 5 + j * 1.5),
            target: { ...loc.balls.target },
            second: { ...loc.balls.second },
          },
          compatibility: {
            signature: loc.entry.signature,
            sysInputs: { ...(loc.entry.sysInputs ?? {}) },
          },
        });
      }
    }

    const built = buildCueC3ProductMembers({
      familyId: bases.set.familyId,
      cueMembers,
      c3PlusMembers: c3Members,
      frozenSourcesByTrack: frozen,
    });
    if (!built.ok) throw new Error(built.reason);
    expect(built.members.length).toBe(252);

    const written = writeFamilyMembers(bases.dataset, {
      familyId: bases.set.familyId,
      members: built.members,
    });
    expect(written.ok).toBe(true);
    if (!written.ok) {
      throw new Error(`${written.code}: ${written.reason}`);
    }
    const productEntries = written.dataset.flatMap((r) =>
      Object.values(r.strategies ?? {}).filter(
        (e) => e?.memberOrigin === CUE_C3_PRODUCT_MEMBER_ORIGIN
      )
    );
    expect(productEntries.length).toBe(252);
  });
});
