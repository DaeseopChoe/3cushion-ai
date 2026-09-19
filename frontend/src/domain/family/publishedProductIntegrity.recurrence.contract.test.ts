/**
 * Published Product Integrity — Recurrence Prevention & Regression Lock (R1–R20).
 *
 * Locks ISSUE A (Product meta) and ISSUE B (duplicate familyId::memberId).
 * In-memory / fixture only — never writes dataset positions.json files.
 *
 * Current publish path SSOT:
 *   writeFamilyMembers → snapshot/payload → replaceFamiliesInPublishedRecords
 *   → validatePublishedExportCandidate → write
 * Raw mergePublishedRecords is a low-level primitive (positionId merge only);
 * UI Export/Publish must not call it without family purge + validation.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { calcImpactBall } from "../../data/system/calculator";
import { placePhysicalSecondSampleOnRoleBall3 } from "../ballRole";
import { mergePublishedExport, mergePublishedRecords } from "../datasetExportMerge";
import type { DatasetExportPayload } from "../datasetExport";
import type { Ball3, Point, PositionRecord, StrategyEntry } from "../positionSearchEngine";
import {
  buildPublishedFamilyExportCandidate,
  validatePublishedExportCandidate,
} from "../publishedFamilyPublish";
import { replaceFamiliesInPublishedRecords } from "../publishedFamilyReplace";
import { bindDomainContractSupply } from "../runtimeContractSupply";
import { DEFAULT_SCALE } from "../../utils/physics/ImpactEngine";
import {
  buildCueC3ProductMembers,
  CUE_C3_PRODUCT_MEMBER_ORIGIN,
} from "./buildCueC3ProductMembers";
import type { CueImpactReviewFrozenSource } from "./cueImpactDerivedReview";
import {
  projectFamilyMemberToCompatibilityEntry,
  writeFamilyMembers,
  type LogicalFamilyMemberCandidate,
} from "./familyAwareWriter";
import { C3_PLUS_MEMBER_ORIGIN } from "./generateC3PlusScoringDerivedMembers";
import { CUE_IMPACT_MEMBER_ORIGIN } from "./generateCueImpactDerivedMembers";
import { FAMILY_TRACKS, type FamilyTrack } from "./trackSymmetry";

function pt(x: number, y: number): Point {
  return { x, y };
}

beforeAll(() => {
  bindDomainContractSupply({
    getFormulaExpr: () => "C1_f = CO_f - C3_r",
    getFormulaHash: () => "h1",
    getAnchorsData: () => undefined,
  });
});

const CORRECTIONS = {
  departure: 0,
  spin: 0,
  slide: 0,
  draw: 0,
  curve_ratio: 0,
};

const FID = "fm_recur_lock";
const FID_B = "fm_recur_lock_b";

function collinearBalls(distance: number, cueX = 8, y = 16): Ball3 {
  return {
    cue: { x: cueX, y },
    target: { x: cueX + distance + DEFAULT_SCALE.BALL_DIAMETER_RG, y },
    second: { x: 62, y: 12 },
  };
}

function metaOk(m: StrategyEntry["meta"] | undefined): boolean {
  return (
    !!m &&
    Number.isFinite(m.impact?.x) &&
    Number.isFinite(m.impact?.y) &&
    Number.isFinite(m.final?.x) &&
    Number.isFinite(m.final?.y) &&
    Number.isFinite(m.angle_ci) &&
    Number.isFinite(m.angle_fs)
  );
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
    corrections: { ...CORRECTIONS },
    authoringStrategyId: "as_authored",
    familyId: FID,
    memberId: "mb_authored",
    memberOrigin: "AUTHORED",
    track: "B2T_L",
    hpT: { T: "8/8", hit_point: { x: -1, y: 1 }, mode: "TIP", tipCount: 1 },
    meta: {
      impact: pt(99, 99),
      final: pt(88, 88),
      angle_ci: 9,
      angle_fs: 9,
    },
    ...overrides,
  };
}

function trackOffset(track: FamilyTrack): number {
  return FAMILY_TRACKS.indexOf(track) * 0.01;
}

function frozenSources(): Record<FamilyTrack, CueImpactReviewFrozenSource> {
  const out = {} as Record<FamilyTrack, CueImpactReviewFrozenSource>;
  for (const track of FAMILY_TRACKS) {
    const dx = trackOffset(track);
    const memberId = track === "B2T_L" ? "mb_authored" : `mb_sym_${track}`;
    const balls = collinearBalls(20, 8 + dx);
    out[track] = {
      track,
      memberId,
      balls,
      entry: authoredEntry({
        memberId,
        memberOrigin: track === "B2T_L" ? "AUTHORED" : "SYMMETRY",
        track,
        ...(track !== "B2T_L"
          ? { generatedFromMemberId: "mb_authored", symmetryOp: "H" as const }
          : {}),
      }),
      runtimeT: "8/8",
    };
  }
  return out;
}

function cueSample(
  track: FamilyTrack,
  t: number,
  cueY: number
): LogicalFamilyMemberCandidate {
  const base = frozenSources()[track];
  const dx = trackOffset(track);
  return {
    familyId: FID,
    memberId: `mb_cue_${track}_${t.toFixed(3)}`,
    memberOrigin: CUE_IMPACT_MEMBER_ORIGIN,
    generatedFromMemberId: base.memberId,
    derivedRule: "CUE_IMPACT_FIRST_30PCT",
    derivedStep: `cue_impact:t:${t.toFixed(6)}`,
    authoringStrategyId: `as_cue_${track}_${t}`,
    track,
    balls: {
      cue: pt(8 + dx + t * 2, cueY),
      target: { ...base.balls.target },
      second: { ...base.balls.second },
    },
    compatibility: {
      signature: base.entry.signature,
      sysInputs: { ...(base.entry.sysInputs ?? {}) },
      corrections: { ...CORRECTIONS },
      hpT: base.entry.hpT,
    },
  };
}

function c3Sample(
  track: FamilyTrack,
  index: number,
  sampleY: number
): LogicalFamilyMemberCandidate {
  const base = frozenSources()[track];
  const dx = trackOffset(track);
  return {
    familyId: FID,
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
      corrections: { ...CORRECTIONS },
      hpT: base.entry.hpT,
    },
  };
}

function buildFreshProducts(): LogicalFamilyMemberCandidate[] {
  const cueMembers: LogicalFamilyMemberCandidate[] = [];
  const c3Members: LogicalFamilyMemberCandidate[] = [];
  for (const track of FAMILY_TRACKS) {
    cueMembers.push(cueSample(track, 0.1, 10));
    c3Members.push(c3Sample(track, 0, 5));
  }
  const built = buildCueC3ProductMembers({
    familyId: FID,
    cueMembers,
    c3PlusMembers: c3Members,
    frozenSourcesByTrack: frozenSources(),
  });
  expect(built.ok).toBe(true);
  if (!built.ok) return [];
  return built.members.filter(
    (m) => m.memberOrigin === CUE_C3_PRODUCT_MEMBER_ORIGIN
  );
}

function envelope(records: PositionRecord[]): DatasetExportPayload {
  return {
    schemaVersion: 2,
    shotType: "뒤돌리기",
    systemId: "5_half_system",
    systemLabel: "파이브앤하프",
    exportedAt: "2026-09-19T00:00:00.000Z",
    records,
  };
}

function validEntry(
  familyId: string,
  memberId: string,
  overrides: Partial<StrategyEntry> = {}
): StrategyEntry {
  return {
    slot: "S1",
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: 30 },
    corrections: { ...CORRECTIONS },
    familyId,
    memberId,
    memberOrigin: "AUTHORED",
    track: "B2T_L",
    meta: {
      impact: pt(1, 1),
      final: pt(2, 2),
      angle_ci: 0.1,
      angle_fs: 0.2,
    },
    ...overrides,
  };
}

function countIdentity(
  records: PositionRecord[],
  familyId: string,
  memberId: string
): number {
  let n = 0;
  for (const rec of records) {
    for (const slot of ["S1", "S2", "S3"] as const) {
      const e = rec.strategies?.[slot];
      if (!e) continue;
      if (e.familyId === familyId && e.memberId === memberId) n += 1;
    }
  }
  return n;
}

describe("R1–R5 / R27–R28 — Product meta recurrence lock", () => {
  it("R1/R2/R3/R4 — fresh Product meta survives write + publish candidate", () => {
    const products = buildFreshProducts();
    expect(products.length).toBeGreaterThan(0);

    for (const m of products) {
      expect(metaOk(m.meta)).toBe(true);
      expect(m.meta!.impact).not.toEqual({ x: 99, y: 99 });
      const expected = calcImpactBall(m.balls.cue, m.balls.target, "8/8");
      expect(m.meta!.impact.x).toBeCloseTo(expected!.x, 3);
      expect(m.meta!.impact.y).toBeCloseTo(expected!.y, 3);
    }

    // R2: projection preserves rebuilt meta
    for (const m of products) {
      const projected = projectFamilyMemberToCompatibilityEntry(m, "S1");
      expect(metaOk(projected.meta)).toBe(true);
      expect(projected.meta).toEqual(m.meta);
      expect(projected.familyId).toBe(FID);
      expect(projected.memberId).toBe(m.memberId);
      expect(projected.memberOrigin).toBe(CUE_C3_PRODUCT_MEMBER_ORIGIN);
    }

    // Persist B2T_L authored + B2T_L products only (provenance-complete subset)
    const b2tProducts = products.filter((m) => m.track === "B2T_L");
    expect(b2tProducts.length).toBeGreaterThan(0);
    const src = frozenSources().B2T_L;
    const baseWritten = writeFamilyMembers([], {
      familyId: FID,
      members: [
        {
          familyId: FID,
          memberId: src.memberId,
          memberOrigin: "AUTHORED",
          authoringStrategyId: src.entry.authoringStrategyId,
          track: "B2T_L",
          balls: src.balls,
          compatibility: {
            signature: src.entry.signature,
            sysInputs: { ...(src.entry.sysInputs ?? {}) },
            corrections: { ...CORRECTIONS },
            hpT: src.entry.hpT,
          },
          meta: src.entry.meta,
        },
      ],
    });
    expect(baseWritten.ok).toBe(true);
    if (!baseWritten.ok) {
      throw new Error(`base write failed: ${baseWritten.code} ${baseWritten.reason}`);
    }

    const written = writeFamilyMembers(baseWritten.dataset, {
      familyId: FID,
      members: b2tProducts,
    });
    if (!written.ok) {
      throw new Error(`write failed: ${written.code} ${written.reason}`);
    }
    expect(written.ok).toBe(true);

    let productSlots = 0;
    for (const rec of written.dataset) {
      for (const ent of Object.values(rec.strategies)) {
        if (!ent || ent.memberOrigin !== CUE_C3_PRODUCT_MEMBER_ORIGIN) continue;
        productSlots += 1;
        expect(metaOk(ent.meta)).toBe(true);
      }
    }
    expect(productSlots).toBe(b2tProducts.length);

    // R3/R4: snapshot-equivalent envelope → publish candidate PASS
    const snapshotRecords: PositionRecord[] = products.map((m, i) => ({
      positionId: `snap_${i}_${m.memberId}`,
      balls: m.balls,
      strategies: {
        S1: projectFamilyMemberToCompatibilityEntry(m, "S1"),
      },
      schemaVersion: 1,
    }));
    const snapshotPayload = envelope(snapshotRecords);
    const published = buildPublishedFamilyExportCandidate(null, snapshotPayload);
    expect(published.ok).toBe(true);
    if (!published.ok) return;
    expect(validatePublishedExportCandidate(published.payload).ok).toBe(true);
  });

  it("R5/R15 — meta:missing candidate FAIL with field diagnostic", () => {
    const products = buildFreshProducts();
    const m = products[0]!;
    const entry = {
      ...projectFamilyMemberToCompatibilityEntry(m, "S1"),
    };
    delete (entry as { meta?: unknown }).meta;
    const candidate = envelope([
      {
        positionId: "p_meta_missing",
        balls: m.balls,
        strategies: { S1: entry },
        schemaVersion: 1,
      },
    ]);
    const validated = validatePublishedExportCandidate(candidate);
    expect(validated.ok).toBe(false);
    if (validated.ok) return;
    expect(validated.issues.some((i) => i.includes("meta:missing"))).toBe(true);
  });
});

describe("R6–R12 / R14 / R29 — duplicate member recurrence lock", () => {
  it("R6/R10/R11 — writer replace/move same member; no twin append", () => {
    const balls1 = collinearBalls(20, 8);
    const balls2 = collinearBalls(20, 9);
    const member: LogicalFamilyMemberCandidate = {
      familyId: FID,
      memberId: "mb_move",
      memberOrigin: "AUTHORED",
      authoringStrategyId: "as_move",
      track: "B2T_L",
      balls: balls1,
      compatibility: {
        signature: authoredEntry().signature,
        sysInputs: { CO_f: 30 },
        corrections: { ...CORRECTIONS },
        hpT: { T: "8/8" },
      },
      meta: {
        impact: pt(1, 1),
        final: pt(2, 2),
        angle_ci: 0,
        angle_fs: 0,
      },
    };

    const w1 = writeFamilyMembers([], { familyId: FID, members: [member] });
    expect(w1.ok).toBe(true);
    if (!w1.ok) return;
    expect(countIdentity(w1.dataset, FID, "mb_move")).toBe(1);

    const moved = { ...member, balls: balls2 };
    const w2 = writeFamilyMembers(w1.dataset, {
      familyId: FID,
      members: [moved],
    });
    expect(w2.ok).toBe(true);
    if (!w2.ok) return;
    expect(countIdentity(w2.dataset, FID, "mb_move")).toBe(1);

    const w3 = writeFamilyMembers(w2.dataset, {
      familyId: FID,
      members: [moved],
    });
    expect(w3.ok).toBe(true);
    if (!w3.ok) return;
    expect(countIdentity(w3.dataset, FID, "mb_move")).toBe(1);
  });

  it("R7 — raw mergePublishedRecords CAN construct cross-record duplicate", () => {
    const memberId = "mb_twin";
    const existing: PositionRecord[] = [
      {
        positionId: "P1",
        balls: collinearBalls(20, 8),
        strategies: { S1: validEntry(FID, memberId) },
        schemaVersion: 1,
      },
    ];
    const incoming: PositionRecord[] = [
      {
        positionId: "P2",
        balls: collinearBalls(20, 12),
        strategies: { S1: validEntry(FID, memberId) },
        schemaVersion: 1,
      },
    ];
    const merged = mergePublishedRecords(existing, incoming);
    expect(merged).toHaveLength(2);
    expect(countIdentity(merged, FID, memberId)).toBe(2);
  });

  it("R8/R14 — duplicate cannot pass validate / family publish candidate", () => {
    const memberId = "mb_blocked";
    const bad = envelope([
      {
        positionId: "P1",
        balls: collinearBalls(20, 8),
        strategies: { S1: validEntry(FID, memberId) },
        schemaVersion: 1,
      },
      {
        positionId: "P2",
        balls: collinearBalls(20, 12),
        strategies: { S1: validEntry(FID, memberId) },
        schemaVersion: 1,
      },
    ]);
    const validated = validatePublishedExportCandidate(bad);
    expect(validated.ok).toBe(false);
    if (validated.ok) return;
    expect(
      validated.issues.some((i) => i.includes("duplicate-member-identity"))
    ).toBe(true);

    // Family UPDATE replace keeps one occurrence
    const existing = envelope([
      {
        positionId: "P1",
        balls: collinearBalls(20, 8),
        strategies: { S1: validEntry(FID, memberId, { ai: { text: "old" } }) },
        schemaVersion: 1,
      },
    ]);
    const incoming = envelope([
      {
        positionId: "P2",
        balls: collinearBalls(20, 12),
        strategies: { S1: validEntry(FID, memberId, { ai: { text: "new" } }) },
        schemaVersion: 1,
      },
    ]);
    const oldMerge = mergePublishedExport(existing, incoming);
    expect(countIdentity(oldMerge.records, FID, memberId)).toBe(2);

    const familyAware = buildPublishedFamilyExportCandidate(existing, incoming);
    expect(familyAware.ok).toBe(true);
    if (!familyAware.ok) return;
    expect(countIdentity(familyAware.payload.records, FID, memberId)).toBe(1);
    expect(
      familyAware.payload.records.some((r) => r.strategies?.S1?.ai?.text === "new")
    ).toBe(true);
  });

  it("R9/R12 — similar geometry different family ALLOWED; CREATE independent", () => {
    const balls = collinearBalls(20, 8);
    const existing = envelope([
      {
        positionId: "P1",
        balls,
        strategies: { S1: validEntry(FID, "mb_a") },
        schemaVersion: 1,
      },
    ]);
    const incoming = envelope([
      {
        positionId: "P2",
        balls: { ...balls, cue: { x: balls.cue.x + 0.01, y: balls.cue.y } },
        strategies: { S1: validEntry(FID_B, "mb_a") },
        schemaVersion: 1,
      },
    ]);
    const result = buildPublishedFamilyExportCandidate(existing, incoming);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(countIdentity(result.payload.records, FID, "mb_a")).toBe(1);
    expect(countIdentity(result.payload.records, FID_B, "mb_a")).toBe(1);
    expect(result.payload.records.length).toBe(2);
  });
});

describe("R13 / R16 — color + combined diagnostics", () => {
  it("R13 — targetBall/color does not choose Role fields", () => {
    const base = collinearBalls(20);
    const sample = pt(33, 1.5);
    const asRed = placePhysicalSecondSampleOnRoleBall3(base, sample, "red");
    const asYellow = placePhysicalSecondSampleOnRoleBall3(
      base,
      sample,
      "yellow"
    );
    // Returns object-ball pair only; color arg must not change Role mapping.
    expect(asRed.second).toEqual(sample);
    expect(asYellow.second).toEqual(sample);
    expect(asRed.target).toEqual(base.target);
    expect(asYellow.target).toEqual(base.target);
    expect(asRed).toEqual(asYellow);
  });

  it("R16 — meta:missing + duplicate-member-identity both preserved", () => {
    const memberId = "mb_both";
    const noMeta = validEntry(FID, memberId);
    delete (noMeta as { meta?: unknown }).meta;
    const candidate = envelope([
      {
        positionId: "P1",
        balls: collinearBalls(20, 8),
        strategies: { S1: noMeta },
        schemaVersion: 1,
      },
      {
        positionId: "P2",
        balls: collinearBalls(20, 12),
        strategies: {
          S1: (() => {
            const e = validEntry(FID, memberId);
            delete (e as { meta?: unknown }).meta;
            return e;
          })(),
        },
        schemaVersion: 1,
      },
    ]);
    const validated = validatePublishedExportCandidate(candidate);
    expect(validated.ok).toBe(false);
    if (validated.ok) return;
    expect(validated.issues.some((i) => i.includes("meta:missing"))).toBe(true);
    expect(
      validated.issues.some((i) => i.includes("duplicate-member-identity"))
    ).toBe(true);
  });
});

describe("R17–R20 — Phase 3/4 path preservation (source + contracts)", () => {
  it("R17 — legacy no-family records not purged by family replace", () => {
    const existing: PositionRecord[] = [
      {
        positionId: "legacy",
        balls: collinearBalls(20, 5),
        strategies: {
          S1: {
            slot: "S1",
            signature: {
              systemId: "5_half_system",
              formulaHash: "h1",
              shotType: "뒤돌리기",
            },
            sysInputs: { CO_f: 1 },
            corrections: { ...CORRECTIONS },
            meta: {
              impact: pt(0, 0),
              final: pt(1, 1),
              angle_ci: 0,
              angle_fs: 0,
            },
          },
        },
        schemaVersion: 1,
      },
      {
        positionId: "fam",
        balls: collinearBalls(20, 8),
        strategies: { S1: validEntry(FID, "mb_x") },
        schemaVersion: 1,
      },
    ];
    const incoming: PositionRecord[] = [
      {
        positionId: "fam2",
        balls: collinearBalls(20, 9),
        strategies: { S1: validEntry(FID, "mb_x") },
        schemaVersion: 1,
      },
    ];
    const { records } = replaceFamiliesInPublishedRecords(existing, incoming);
    expect(records.some((r) => r.positionId === "legacy")).toBe(true);
    expect(countIdentity(records, FID, "mb_x")).toBe(1);
  });

  it("R18/R19 — family publish uses replace; Export owner not raw merge", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const settings = readFileSync(join(here, "../../hooks/useSettings.js"), "utf8");
    expect(settings).toContain("buildPublishedFamilyExportCandidate");
    expect(settings).not.toMatch(/mergedPayload\s*=\s*mergePublishedExport/);
    expect(settings).not.toContain('from "../domain/datasetExportMerge"');

    const publish = readFileSync(
      join(here, "../publishedFamilyPublish.ts"),
      "utf8"
    );
    expect(publish).toContain("replaceFamiliesInPublishedRecords");
    expect(publish).toContain("validatePublishedExportCandidate");
  });

  it("R20 — Phase 4 write path still gates on validatePublishedExportCandidate", () => {
    const here = dirname(fileURLToPath(import.meta.url));
    const writeFs = readFileSync(
      join(here, "../repoPublish/writeVerifiedPublishedLeafFs.ts"),
      "utf8"
    );
    expect(writeFs).toContain("validatePublishedExportCandidate");
    const publishRepo = readFileSync(
      join(here, "../repoPublish/publishDatasetToRepo.ts"),
      "utf8"
    );
    expect(publishRepo).toContain("validatePublishedExportCandidate");
    expect(publishRepo).toContain("buildPublishedFamilyExportCandidate");
  });
});
