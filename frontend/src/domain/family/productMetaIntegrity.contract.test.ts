/**
 * Product Meta Integrity — rebuild + diagnostic propagation contracts.
 * Never writes real repo dataset positions.json files.
 */

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { calcImpactBall } from "../../data/system/calculator";
import { DEFAULT_SCALE } from "../../utils/physics/ImpactEngine";
import { validateCanonicalStrategyEntry } from "../canonicalPersistAudit";
import type { Ball3, Point, StrategyEntry } from "../positionSearchEngine";
import { bindDomainContractSupply } from "../runtimeContractSupply";
import type { PublishFamilyPayload } from "../publishFamilyPayload";
import type { PublishOperation } from "../publishOperation";
import {
  publishDatasetBatchToRepo,
  publishDatasetLeafToRepo,
} from "../repoPublish/publishDatasetToRepo";
import { resolvePublishedLeafAbsolutePath } from "../repoPublish/resolveRepoLeafPath";
import { publishDatasetBatchWithGit } from "../repoPublish/publishDatasetWithGit";
import {
  projectFamilyMemberToCompatibilityEntry,
  type LogicalFamilyMemberCandidate,
  writeFamilyMembers,
} from "./familyAwareWriter";
import {
  buildCueC3ProductMembers,
  CUE_C3_PRODUCT_MEMBER_ORIGIN,
} from "./buildCueC3ProductMembers";
import type { CueImpactReviewFrozenSource } from "./cueImpactDerivedReview";
import {
  CUE_IMPACT_MEMBER_ORIGIN,
  generateCueImpactDerivedMembers,
} from "./generateCueImpactDerivedMembers";
import { C3_PLUS_MEMBER_ORIGIN } from "./generateC3PlusScoringDerivedMembers";
import {
  rebuildCanonicalMemberMeta,
  withRebuiltCanonicalMeta,
} from "./rebuildCanonicalMemberMeta";
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

function collinearBalls(distance: number, cueX = 8, y = 16): Ball3 {
  return {
    cue: { x: cueX, y },
    target: { x: cueX + distance + DEFAULT_SCALE.BALL_DIAMETER_RG, y },
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
    corrections: { ...CORRECTIONS },
    authoringStrategyId: "as_authored",
    familyId: "fm_meta",
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

describe("rebuildCanonicalMemberMeta", () => {
  it("P3–P7 — REBUILD from Product balls; not source meta copy", () => {
    const balls: Ball3 = {
      cue: pt(15, 16),
      target: pt(40, 16),
      second: pt(20, 8),
    };
    const sourceMeta = {
      impact: pt(12, 9),
      final: pt(50, 5),
      angle_ci: 0.1,
      angle_fs: 0.2,
    };
    const meta = rebuildCanonicalMemberMeta({
      balls,
      signature: {
        systemId: "5_half_system",
        formulaHash: "h1",
        shotType: "뒤돌리기",
      },
      sysInputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
      track: "B2T_L",
      hpT: { T: "8/8" },
    });
    expect(meta.impact).not.toEqual(sourceMeta.impact);
    expect(meta.final).not.toEqual(sourceMeta.final);
    const expectedImpact = calcImpactBall(balls.cue, balls.target, "8/8");
    expect(meta.impact.x).toBeCloseTo(expectedImpact!.x, 5);
    expect(meta.impact.y).toBeCloseTo(expectedImpact!.y, 5);
    expect(meta.angle_ci).toBeCloseTo(
      Math.atan2(meta.impact.y - balls.cue.y, meta.impact.x - balls.cue.x),
      10
    );
    expect(meta.angle_fs).toBeCloseTo(
      Math.atan2(balls.second.y - meta.final.y, balls.second.x - meta.final.x),
      10
    );
    const v = validateCanonicalStrategyEntry({
      slot: "S1",
      signature: {
        systemId: "5_half_system",
        formulaHash: "h1",
        shotType: "뒤돌리기",
      },
      sysInputs: { CO_f: 30 },
      corrections: { ...CORRECTIONS },
      meta,
    });
    expect(v.ok).toBe(true);
  });

  it("P8 — same input → same meta", () => {
    const args = {
      balls: collinearBalls(24),
      signature: {
        systemId: "5_half_system",
        formulaHash: "h1",
        shotType: "뒤돌리기",
      },
      sysInputs: { CO_f: 28, C1_f: 8, C3_r: 20 },
      track: "B2T_L" as const,
      hpT: { T: "5/8" },
    };
    expect(rebuildCanonicalMemberMeta(args)).toEqual(
      rebuildCanonicalMemberMeta(args)
    );
  });
});

function trackOffset(track: FamilyTrack): number {
  return FAMILY_TRACKS.indexOf(track) * 6;
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
    corrections: { ...CORRECTIONS },
    authoringStrategyId: `as_${track}`,
    familyId: "fm_meta",
    memberId,
    memberOrigin: track === "B2T_L" ? "AUTHORED" : "SYMMETRY",
    ...(track !== "B2T_L"
      ? { generatedFromMemberId: "mb_B2T_L", symmetryOp: "H" as const }
      : {}),
    track,
    hpT: { T: "8/8", hit_point: { x: -1, y: 1 }, mode: "TIP", tipCount: 1 },
    meta: {
      impact: pt(99, 99),
      final: pt(88, 88),
      angle_ci: 9,
      angle_fs: 9,
    },
  };
}

function frozenSources(): Record<FamilyTrack, CueImpactReviewFrozenSource> {
  const out = {} as Record<FamilyTrack, CueImpactReviewFrozenSource>;
  for (const track of FAMILY_TRACKS) {
    const memberId = `mb_${track}`;
    const dx = trackOffset(track);
    out[track] = {
      track,
      memberId,
      balls: {
        cue: pt(10 + dx, 16),
        target: pt(40 + dx, 16),
        second: pt(20 + dx, 8),
      },
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
  const base = frozenSources()[track];
  const dx = trackOffset(track);
  return {
    familyId: "fm_meta",
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
    familyId: "fm_meta",
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

describe("Product / Cue producers attach rebuilt meta", () => {
  it("P1/P4/P11/P12 — Cue Product members have meta rebuilt from balls", () => {
    const balls = collinearBalls(20);
    const result = generateCueImpactDerivedMembers({
      sourceMember: { balls, entry: authoredEntry() },
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.members.length).toBeGreaterThan(0);
    for (const m of result.members) {
      expect(m.meta).toBeTruthy();
      expect(m.meta!.impact).not.toEqual({ x: 99, y: 99 });
      const expected = calcImpactBall(m.balls.cue, m.balls.target, "8/8");
      expect(m.meta!.impact.x).toBeCloseTo(expected!.x, 4);
      expect(m.meta!.impact.y).toBeCloseTo(expected!.y, 4);
      expect(m.memberOrigin).toBe(CUE_IMPACT_MEMBER_ORIGIN);
      expect(m.compatibility.sysInputs).toEqual({
        CO_f: 30,
        C1_f: 10,
        C3_r: 20,
      });
      const projected = projectFamilyMemberToCompatibilityEntry(m, "S1");
      expect(projected.meta).toEqual(m.meta);
      expect(validateCanonicalStrategyEntry(projected).ok).toBe(true);
    }

    const baseWritten = writeFamilyMembers([], {
      familyId: "fm_meta",
      members: [
        {
          familyId: "fm_meta",
          memberId: "mb_authored",
          memberOrigin: "AUTHORED",
          authoringStrategyId: "as_authored",
          track: "B2T_L",
          balls,
          compatibility: {
            signature: authoredEntry().signature,
            sysInputs: { ...(authoredEntry().sysInputs ?? {}) },
            corrections: { ...CORRECTIONS },
            hpT: authoredEntry().hpT,
          },
          meta: authoredEntry().meta,
        },
      ],
    });
    expect(baseWritten.ok).toBe(true);
    if (!baseWritten.ok) return;
    const written = writeFamilyMembers(baseWritten.dataset, {
      familyId: "fm_meta",
      members: result.members,
    });
    expect(written.ok).toBe(true);
    if (!written.ok) return;
    for (const rec of written.dataset) {
      for (const ent of Object.values(rec.strategies)) {
        if (!ent || ent.memberOrigin !== CUE_IMPACT_MEMBER_ORIGIN) continue;
        expect(ent.meta).toBeTruthy();
        expect(ent.meta!.impact).not.toEqual({ x: 99, y: 99 });
      }
    }
  });

  it("P2/P3/P9/P10 — Cue×C3 Product meta rebuilt; identity/sys preserved", () => {
    const { cueMembers, c3Members } = synthSamples(1, 1);
    const built = buildCueC3ProductMembers({
      familyId: "fm_meta",
      cueMembers,
      c3PlusMembers: c3Members,
      frozenSourcesByTrack: frozenSources(),
    });
    expect(built.ok).toBe(true);
    if (!built.ok) return;
    const cross = built.members.filter(
      (m) => m.memberOrigin === CUE_C3_PRODUCT_MEMBER_ORIGIN
    );
    expect(cross.length).toBe(4);
    for (const m of cross) {
      expect(m.meta).toBeTruthy();
      expect(m.meta!.impact).not.toEqual({ x: 99, y: 99 });
      expect(m.familyId).toBe("fm_meta");
      expect(m.memberOrigin).toBe(CUE_C3_PRODUCT_MEMBER_ORIGIN);
      expect(m.compatibility.sysInputs).toEqual({
        CO_f: 30,
        C1_f: 10,
        C3_r: 20,
      });
      expect(m.compatibility.corrections).toEqual(CORRECTIONS);
      const expected = calcImpactBall(m.balls.cue, m.balls.target, "8/8");
      expect(m.meta!.impact.x).toBeCloseTo(expected!.x, 4);
      expect(m.meta!.impact.y).toBeCloseTo(expected!.y, 4);
      expect(validateCanonicalStrategyEntry(
        projectFamilyMemberToCompatibilityEntry(m, "S1")
      ).ok).toBe(true);
    }
  });

  it("withRebuiltCanonicalMeta is deterministic", () => {
    const candidate: LogicalFamilyMemberCandidate = {
      familyId: "fm_meta",
      memberId: "mb_x",
      memberOrigin: CUE_C3_PRODUCT_MEMBER_ORIGIN,
      generatedFromMemberId: "mb_B2T_L",
      derivedRule: "CUE_C3_CARTESIAN_PRODUCT_V1",
      derivedStep: "cue_c3:cue_impact:t:0.100000|c3plus:seg:0:t:0.000000",
      track: "B2T_L",
      balls: {
        cue: pt(18, 15),
        target: pt(42, 17),
        second: pt(25, 9),
      },
      compatibility: {
        signature: {
          systemId: "5_half_system",
          formulaHash: "h1",
          shotType: "뒤돌리기",
        },
        sysInputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
        corrections: { ...CORRECTIONS },
        hpT: { T: "8/8" },
      },
    };
    expect(withRebuiltCanonicalMeta(candidate).meta).toEqual(
      withRebuiltCanonicalMeta(candidate).meta
    );
  });
});

describe("Git Publish diagnostic propagation", () => {
  const temps: string[] = [];

  afterEach(() => {
    for (const root of temps) {
      try {
        fs.rmSync(root, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    }
    temps.length = 0;
  });

  function makeTempDatasetRoot(): string {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "p-meta-leaf-"));
    temps.push(root);
    return root;
  }

  function git(cwd: string, args: string[]) {
    return execFileSync("git", ["-c", "core.quotepath=false", ...args], {
      cwd,
      encoding: "utf8",
      windowsHide: true,
    });
  }

  function validNewEntry(familyId: string): StrategyEntry {
    return {
      slot: "S1",
      signature: {
        systemId: "5_half_system",
        formulaHash: "h1",
        shotType: "뒤돌리기",
      },
      sysInputs: { CO_f: 40 },
      corrections: { ...CORRECTIONS },
      meta: {
        impact: { x: 20, y: 20 },
        final: { x: 30, y: 30 },
        angle_ci: 0.1,
        angle_fs: 0.2,
      },
      familyId,
      memberId: "mb_new",
      memberOrigin: "AUTHORED",
      track: "B2T_L",
    };
  }

  function writeInvalidExistingLeaf(datasetRoot: string) {
    const resolved = resolvePublishedLeafAbsolutePath(
      datasetRoot,
      "뒤돌리기",
      "5_half_system"
    );
    expect(resolved.ok).toBe(true);
    if (!resolved.ok) return;
    fs.mkdirSync(path.dirname(resolved.absolutePath), { recursive: true });
    // Valid shape except StrategyEntry.meta omitted (legacy Product failure mode).
    fs.writeFileSync(
      resolved.absolutePath,
      JSON.stringify({
        schemaVersion: 2,
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        systemLabel: "파이브앤하프",
        exportedAt: "2026-08-27T00:00:00.000Z",
        records: [
          {
            positionId: "p0",
            balls: {
              cue: { x: 10, y: 10 },
              target: { x: 50, y: 25 },
              second: { x: 40, y: 20 },
            },
            strategies: {
              S1: {
                slot: "S1",
                signature: {
                  systemId: "5_half_system",
                  formulaHash: "h1",
                  shotType: "뒤돌리기",
                },
                sysInputs: { CO_f: 40 },
                corrections: { ...CORRECTIONS },
                familyId: "fm_legacy",
                memberId: "mb_legacy",
                memberOrigin: "AUTHORED",
                track: "B2T_L",
              },
            },
            schemaVersion: 1,
          },
        ],
      }),
      "utf8"
    );
  }

  it("D1/D2 — existing-leaf-validation-failed keeps field-level meta:missing", () => {
    const root = makeTempDatasetRoot();
    writeInvalidExistingLeaf(root);
    const op: PublishOperation = {
      schemaVersion: 1,
      intent: "CREATE",
      sourceFamilyId: null,
      destinationFamilyId: "fm_new",
    };
    const payload: PublishFamilyPayload = {
      schemaVersion: 1,
      familyId: "fm_new",
      records: [
        {
          positionId: "p_new",
          balls: {
            cue: { x: 12, y: 12 },
            target: { x: 52, y: 27 },
            second: { x: 42, y: 22 },
          },
          strategies: { S1: validNewEntry("fm_new") },
          schemaVersion: 1,
        },
      ],
    };
    const r = publishDatasetLeafToRepo({
      datasetRoot: root,
      request: {
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        publishOperation: op,
        publishFamilyPayload: payload,
      },
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("existing-leaf-validation-failed");
    expect(r.issues.some((i) => i.includes("meta:missing"))).toBe(true);
    expect(
      r.issues.some((i) =>
        /records\[\d+\]\.strategies\.S1\.meta:missing/.test(i)
      )
    ).toBe(true);
  });

  it("D3/D7 — batch Git result preserves full issues (UI truncates separately)", async () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "p-meta-git-"));
    temps.push(root);
    const remote = path.join(root, "remote.git");
    const work = path.join(root, "work");
    fs.mkdirSync(remote);
    git(root, ["init", "--bare", remote]);
    fs.mkdirSync(work);
    git(work, ["init", "-b", "main"]);
    git(work, ["config", "user.name", "Diag"]);
    git(work, ["config", "user.email", "diag@example.com"]);
    git(work, ["remote", "add", "origin", remote]);

    const datasetRoot = path.join(work, "dataset");
    writeInvalidExistingLeaf(datasetRoot);
    fs.writeFileSync(path.join(work, "README.md"), "# diag\n", "utf8");
    git(work, ["add", "--", "README.md", "dataset"]);
    git(work, ["commit", "-m", "seed"]);
    git(work, ["push", "-u", "origin", "main"]);

    const manyIssuesLeaf = publishDatasetBatchToRepo({
      datasetRoot,
      items: [
        {
          snapshotId: "snap-diag-1",
          shotType: "뒤돌리기",
          systemId: "5_half_system",
          publishOperation: {
            schemaVersion: 1,
            intent: "CREATE",
            sourceFamilyId: null,
            destinationFamilyId: "fm_new",
          },
          publishFamilyPayload: {
            schemaVersion: 1,
            familyId: "fm_new",
            records: [
              {
                positionId: "p_new",
                balls: {
                  cue: { x: 12, y: 12 },
                  target: { x: 52, y: 27 },
                  second: { x: 42, y: 22 },
                },
                strategies: { S1: validNewEntry("fm_new") },
                schemaVersion: 1,
              },
            ],
          },
        },
      ],
    });
    const leafFail = manyIssuesLeaf.find((x) => !x.ok);
    expect(leafFail && !leafFail.ok && leafFail.reason).toBe(
      "existing-leaf-validation-failed"
    );

    const result = await publishDatasetBatchWithGit({
      repoRoot: work,
      datasetRoot,
      fetchRemote: true,
      verifyProduction: false,
      items: [
        {
          snapshotId: "snap-diag-1",
          shotType: "뒤돌리기",
          systemId: "5_half_system",
          publishOperation: {
            schemaVersion: 1,
            intent: "CREATE",
            sourceFamilyId: null,
            destinationFamilyId: "fm_new",
          },
          publishFamilyPayload: {
            schemaVersion: 1,
            familyId: "fm_new",
            records: [
              {
                positionId: "p_new",
                balls: {
                  cue: { x: 12, y: 12 },
                  target: { x: 52, y: 27 },
                  second: { x: 42, y: 22 },
                },
                strategies: { S1: validNewEntry("fm_new") },
                schemaVersion: 1,
              },
            ],
          },
        },
      ],
    });

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe("REPO_WRITE_FAILED");
    expect(
      result.issues.some((i) =>
        i.includes("snap-diag-1:existing-leaf-validation-failed")
      )
    ).toBe(true);
    expect(result.issues.some((i) => i.includes("meta:missing"))).toBe(true);
    // Domain keeps full issues; UI may slice(0,12) for alert only.
    expect(result.issues.length).toBeGreaterThanOrEqual(2);

    // D4–D6 — endpoint/client alert shape (display truncate ≠ domain loss)
    const alertLines = [
      result.status ? `status: ${result.status}` : "",
      result.reason,
      ...result.issues.slice(0, 12),
    ].filter(Boolean);
    expect(alertLines.some((l) => l.includes("meta:missing"))).toBe(true);
    expect(alertLines.some((l) => l.includes("REPO_WRITE_FAILED"))).toBe(true);

    const settingsSrc = fs.readFileSync(
      path.resolve(__dirname, "../../hooks/useSettings.js"),
      "utf8"
    );
    expect(settingsSrc).toContain("result.issues.slice(0, 12)");
    expect(settingsSrc).toContain("Git Publish 실패");
  }, 60_000);
});
