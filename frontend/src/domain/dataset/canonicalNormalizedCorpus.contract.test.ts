/**
 * Phase B-1 / C-2 — Canonical Normalized Local Corpus Store contracts.
 *
 * AUTHORITATIVE: normalized_dataset (NormalizedDatasetEnvelope)
 * Phase C-2: positions_dataset / family_* are NOT production mirrors.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CANONICAL_NORMALIZED_CORPUS_KEY,
  clearCanonicalCommitFailureForTests,
  clearCanonicalNormalizedCorpusForTests,
  commitCanonicalNormalizedCorpus,
  createEmptyCanonicalNormalizedCorpus,
  forceCanonicalCommitFailureForTests,
  loadCanonicalNormalizedCorpus,
  upsertFamilySliceInEnvelope,
} from "./infra/canonicalNormalizedCorpusStore";
import { persistWorkingCorpusNormalizedAuthority } from "./infra/persistWorkingCorpusNormalizedAuthority";
import { WORKING_DATASET_KEY } from "./infra/datasetStorage";
import {
  FAMILY_MASTERS_STORAGE_KEY,
  FAMILY_MEMBERS_STORAGE_KEY,
  FAMILY_NORMALIZED_SCHEMA_VERSION,
  type FamilyMaster,
  type FamilyMember,
} from "../family/familyNormalizedSchema";
import { writeFourTrackFamilyMembers } from "../family/familyAwareWriter";
import type { PositionRecord, StrategyEntry } from "../positionSearchEngine";
import { NORMALIZED_DATASET_SCHEMA_VERSION } from "./normalizedDatasetEnvelope";
import { runSaveStrategy, type SaveFlowContext } from "../../application/flows/saveFlow";
import { commitDerivedApprovalDataset } from "../../application/flows/derivedApprovalFlow";
import {
  approveUnifiedDerivedReview,
  createUnifiedDerivedReview,
} from "../family/unifiedDerivedReview";
import { CUE_C3_PRODUCT_MEMBER_ORIGIN } from "../family/buildCueC3ProductMembers";
import { resolveTrajectoryHitTolerance } from "../trajectory/hitToleranceRg";
import { DEFAULT_SCALE } from "../../utils/physics/ImpactEngine";

const HIT = resolveTrajectoryHitTolerance();
const here = dirname(fileURLToPath(import.meta.url));

function createMemoryLocalStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() {
      return map.size;
    },
  };
}

function masterOf(familyId: string): FamilyMaster {
  return {
    schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
    familyId,
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
    hpT: { T: "8/8", hit_point: { x: 0, y: 0 }, mode: "TIP", tipCount: 0 },
  };
}

function authoredMember(
  familyId: string,
  memberId: string,
  balls = {
    cue: { x: 10, y: 10 },
    target: { x: 40, y: 20 },
    second: { x: 60, y: 15 },
  },
  sourceSlot: "S1" | "S2" | "S3" = "S1"
): FamilyMember {
  return {
    schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
    memberId,
    familyId,
    balls,
    track: "B2T_L",
    memberOrigin: "AUTHORED",
    sourceSlot,
    authoringStrategyId: `as_${memberId}`,
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
    authoringStrategyId: "as_b1",
    familyId: "fm_b1",
    memberId: "mb_authored",
    memberOrigin: "AUTHORED",
    track: "B2T_L",
    hpT: {
      T: "8/8",
      hit_point: { x: -2, y: 1.5 },
      mode: "TIP",
      tipCount: 2,
    },
    thickness: "8/8",
    corrections: {
      slide: 0,
      curve_ratio: 0,
      draw: 0,
      departure: 0,
      spin: 0,
    },
    ai: { text: "", onePointLessons: [] },
    str: { speed: 2.5 },
    meta: {
      impact: { x: 12, y: 9 },
      final: { x: 50, y: 5 },
      angle_ci: 0.1,
      angle_fs: 0.2,
    },
    ...overrides,
  };
}

const balls = {
  cue: { x: 10, y: 8 },
  target: { x: 40, y: 20 },
  second: { x: 62, y: 12 },
};

const canonicalHpt = {
  T: "-3/8",
  hit_point: { x: -2, y: 1.5 },
  mode: "TIP",
  tipCount: 2,
};

function buildSaveCtx(overrides: Partial<SaveFlowContext> = {}): {
  ctx: SaveFlowContext;
  capture: { dataset: PositionRecord[] };
} {
  const capture = { dataset: [] as PositionRecord[] };
  const slotSys = {
    systemId: "5_half_system",
    track: "B2T_L",
    inputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
    outputs: { result: { CO_f: 30, C1_f: 10, C3_r: 20 } },
  };
  const ctx: SaveFlowContext = {
    dataset: [],
    ballsState: balls,
    adminState: {
      sys: {
        system: "5_half_system",
        systemId: "5_half_system",
        system_id: "5_half_system",
        shotType: "뒤돌리기",
        track: "B2T_L",
        inputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
        system_values: { CO_f: 30, C1_f: 10, C3_r: 20 },
        corrections: {
          slide: 0,
          curve_ratio: 0,
          draw: 0,
          departure: 0,
          spin: 0,
        },
      },
      hpt: canonicalHpt,
    },
    activeSlot: "S1",
    slots: {
      S1: {
        draft: { sys: slotSys, hpt: canonicalHpt },
        applied: { sys: slotSys, hpt: canonicalHpt, str: { speed: 1 }, ai: {} },
      },
    },
    targetColor: "red",
    aiOverride: null,
    system: "5_half_system",
    resolvedSlotSysValues: { CO_f: 30, C1_f: 10, C3_r: 20 },
    autoSave: false,
    editSource: null,
    saveCommand: "SAVE",
    editingPublishedFamilyId: null,
    editingLocalFamilyId: null,
    saveWorkingDataset: (updated) => {
      capture.dataset = updated;
      localStorage.setItem(WORKING_DATASET_KEY, JSON.stringify(updated));
    },
    setDataset: (updated) => {
      capture.dataset = updated;
    },
    setUserPublishedSearchContext: () => {},
    setAdminState: () => {},
    patchSlotRuntimeMeta: () => {},
    patchSlotFamilyIdentity: () => {},
    saveToFile: () => {},
    resolveFormulaHash: () => "h1",
    resolveEvalProfile: () => ({ formula: { expr: "x" } }),
    resolveAnchorsData: () => undefined,
    ...overrides,
  };
  return { ctx, capture };
}

beforeEach(() => {
  clearCanonicalCommitFailureForTests();
  vi.stubGlobal("localStorage", createMemoryLocalStorage());
  clearCanonicalNormalizedCorpusForTests();
});

describe("Phase B-1 canonical normalized corpus store", () => {
  it("CASE 1: valid empty corpus initialization → PASS", () => {
    const empty = createEmptyCanonicalNormalizedCorpus({
      shotType: "뒤돌리기",
      systemId: "5_half_system",
    });
    expect(commitCanonicalNormalizedCorpus(empty).ok).toBe(true);
    const loaded = loadCanonicalNormalizedCorpus();
    expect(loaded.ok).toBe(true);
    if (!loaded.ok) return;
    expect(loaded.present).toBe(true);
    expect(loaded.envelope.familyMasters).toEqual([]);
    expect(loaded.envelope.schemaVersion).toBe(NORMALIZED_DATASET_SCHEMA_VERSION);
  });

  it("CASE 2: valid Family CREATE → one canonical commit", () => {
    const written = writeFourTrackFamilyMembers([], {
      balls: {
        cue: { x: 8, y: 16 },
        target: { x: 8 + 20 + DEFAULT_SCALE.BALL_DIAMETER_RG, y: 16 },
        second: { x: 20, y: 10 },
      },
      entry: authoredEntry({ familyId: "fm_create_new" }),
    });
    expect(written.ok).toBe(true);
    if (!written.ok) return;
    const persist = persistWorkingCorpusNormalizedAuthority({
      dataset: written.dataset,
      shotType: "뒤돌리기",
      systemId: "5_half_system",
    });
    expect(persist.ok).toBe(true);
    if (!persist.ok) return;
    expect(
      persist.envelope.familyMasters.some((m) => m.familyId === "fm_create_new")
    ).toBe(true);
    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBeTruthy();
  });

  it("CASE 3–9: invalid candidates → zero canonical write", () => {
    const before = createEmptyCanonicalNormalizedCorpus({
      shotType: "뒤돌리기",
      systemId: "5_half_system",
    });
    expect(commitCanonicalNormalizedCorpus(before).ok).toBe(true);
    const prior = localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY);

    const invalids: unknown[] = [
      {
        schemaVersion: 3,
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        systemLabel: "x",
        familyMasters: [masterOf("fm_a"), masterOf("fm_a")],
        familyMembers: [authoredMember("fm_a", "mb_1")],
      },
      {
        schemaVersion: 3,
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        systemLabel: "x",
        familyMasters: [masterOf("fm_a")],
        familyMembers: [
          authoredMember("fm_a", "mb_1"),
          authoredMember("fm_a", "mb_1"),
        ],
      },
      {
        schemaVersion: 3,
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        systemLabel: "x",
        familyMasters: [masterOf("fm_a")],
        familyMembers: [authoredMember("fm_missing", "mb_1")],
      },
      {
        schemaVersion: 3,
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        systemLabel: "x",
        familyMasters: [masterOf("fm_a")],
        familyMembers: [],
      },
      {
        schemaVersion: 3,
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        systemLabel: "x",
        familyMasters: [masterOf("fm_a")],
        familyMembers: [
          {
            ...authoredMember("fm_a", "mb_1"),
            signature: {
              systemId: "x",
              formulaHash: "h",
              shotType: "뒤돌리기",
            },
          },
        ],
      },
      {
        schemaVersion: 3,
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        systemLabel: "x",
        familyMasters: [masterOf("fm_a")],
        familyMembers: [
          {
            ...authoredMember("fm_a", "mb_sym"),
            memberOrigin: "SYMMETRY",
            symmetryOp: "H",
            generatedFromMemberId: "mb_missing",
            sourceSlot: "S2",
            track: "B2T_R",
          },
        ],
      },
      {
        schemaVersion: 3,
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        systemLabel: "x",
        familyMasters: [masterOf("fm_a")],
        familyMembers: [
          authoredMember("fm_a", "mb_1"),
          {
            ...authoredMember("fm_a", "mb_2"),
            memberOrigin: "AUTHORED",
            sourceSlot: "S2",
            track: "B2T_R",
          },
        ],
      },
    ];

    for (const raw of invalids) {
      expect(commitCanonicalNormalizedCorpus(raw).ok).toBe(false);
      expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBe(prior);
    }
  });

  it("CASE 10–12: serialize/write/readback failure preserves prior / no false success", () => {
    const empty = createEmptyCanonicalNormalizedCorpus({
      shotType: "뒤돌리기",
      systemId: "5_half_system",
    });
    expect(commitCanonicalNormalizedCorpus(empty).ok).toBe(true);
    const prior = localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)!;

    const next = upsertFamilySliceInEnvelope(empty, masterOf("fm_ok"), [
      authoredMember("fm_ok", "mb_ok"),
    ]);
    expect(next.ok).toBe(true);
    if (!next.ok) return;

    forceCanonicalCommitFailureForTests("serialize");
    expect(commitCanonicalNormalizedCorpus(next.envelope).ok).toBe(false);
    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBe(prior);

    forceCanonicalCommitFailureForTests("write");
    expect(commitCanonicalNormalizedCorpus(next.envelope).ok).toBe(false);
    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBe(prior);

    forceCanonicalCommitFailureForTests("readback");
    const rb = commitCanonicalNormalizedCorpus(next.envelope);
    expect(rb.ok).toBe(false);
    if (!rb.ok) expect(rb.stage).toBe("readback");
    clearCanonicalCommitFailureForTests();
  });

  it("CASE 14–17/19: Family-unit replace preserves familyId + unrelated Families", () => {
    const seed = upsertFamilySliceInEnvelope(
      createEmptyCanonicalNormalizedCorpus({
        shotType: "뒤돌리기",
        systemId: "5_half_system",
      }),
      masterOf("fm_a"),
      [authoredMember("fm_a", "mb_a1")]
    );
    expect(seed.ok).toBe(true);
    if (!seed.ok) return;
    const withB = upsertFamilySliceInEnvelope(seed.envelope, masterOf("fm_b"), [
      authoredMember("fm_b", "mb_b1", {
        cue: { x: 11, y: 11 },
        target: { x: 41, y: 21 },
        second: { x: 61, y: 16 },
      }),
    ]);
    expect(withB.ok).toBe(true);
    if (!withB.ok) return;
    expect(commitCanonicalNormalizedCorpus(withB.envelope).ok).toBe(true);

    const replaced = upsertFamilySliceInEnvelope(withB.envelope, masterOf("fm_a"), [
      authoredMember("fm_a", "mb_a1"),
      {
        ...authoredMember("fm_a", "mb_a_new", {
          cue: { x: 12, y: 12 },
          target: { x: 42, y: 22 },
          second: { x: 62, y: 17 },
        }),
        memberOrigin: "SYMMETRY",
        symmetryOp: "H",
        generatedFromMemberId: "mb_a1",
        track: "B2T_R",
        sourceSlot: "S2",
      },
    ]);
    expect(replaced.ok).toBe(true);
    if (!replaced.ok) return;
    expect(commitCanonicalNormalizedCorpus(replaced.envelope).ok).toBe(true);
    const loaded = loadCanonicalNormalizedCorpus();
    expect(loaded.ok && loaded.present).toBe(true);
    if (!loaded.ok || !loaded.present) return;
    expect(loaded.envelope.familyMasters.map((m) => m.familyId).sort()).toEqual([
      "fm_a",
      "fm_b",
    ]);
    expect(
      loaded.envelope.familyMembers.some((m) => m.memberId === "mb_a1")
    ).toBe(true);
    expect(
      loaded.envelope.familyMembers.some((m) => m.memberId === "mb_a_new")
    ).toBe(true);
    expect(
      loaded.envelope.familyMembers.some((m) => m.memberId === "mb_b1")
    ).toBe(true);
  });

  // Phase C-0: SUPERSEDED — same Position+same S1 different Families must REJECT.
  it("CASE 18: same Position+same S1 different Families → canonical REJECT", () => {
    const sharedBalls = {
      cue: { x: 10, y: 10 },
      target: { x: 40, y: 20 },
      second: { x: 60, y: 15 },
    };
    const a = upsertFamilySliceInEnvelope(
      createEmptyCanonicalNormalizedCorpus({
        shotType: "뒤돌리기",
        systemId: "5_half_system",
      }),
      masterOf("fm_pos_a"),
      [authoredMember("fm_pos_a", "mb_pos_a", sharedBalls)]
    );
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    const b = upsertFamilySliceInEnvelope(a.envelope, masterOf("fm_pos_b"), [
      authoredMember("fm_pos_b", "mb_pos_b", sharedBalls),
    ]);
    expect(b.ok).toBe(false);
    if (b.ok) return;
    expect(
      b.issues.some((i) => i.code === "POSITION_STRATEGY_SLOT_CONFLICT")
    ).toBe(true);
  });

  it("CASE 18b: same Position+different Slot different Families → canonical PASS", () => {
    const sharedBalls = {
      cue: { x: 10, y: 10 },
      target: { x: 40, y: 20 },
      second: { x: 60, y: 15 },
    };
    const a = upsertFamilySliceInEnvelope(
      createEmptyCanonicalNormalizedCorpus({
        shotType: "뒤돌리기",
        systemId: "5_half_system",
      }),
      masterOf("fm_pos_a2"),
      [authoredMember("fm_pos_a2", "mb_pos_a2", sharedBalls, "S1")]
    );
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    const b = upsertFamilySliceInEnvelope(a.envelope, masterOf("fm_pos_b2"), [
      authoredMember("fm_pos_b2", "mb_pos_b2", sharedBalls, "S2"),
    ]);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const commit = commitCanonicalNormalizedCorpus(b.envelope);
    expect(commit.ok).toBe(true);
  });

  it("CASE 20: canonical Members contain no Master common payload", () => {
    const env = upsertFamilySliceInEnvelope(
      createEmptyCanonicalNormalizedCorpus({
        shotType: "뒤돌리기",
        systemId: "5_half_system",
      }),
      masterOf("fm_c"),
      [authoredMember("fm_c", "mb_c")]
    );
    expect(env.ok).toBe(true);
    if (!env.ok) return;
    for (const m of env.envelope.familyMembers) {
      expect(m).not.toHaveProperty("signature");
      expect(m).not.toHaveProperty("sysInputs");
      expect(m).not.toHaveProperty("hpT");
    }
  });
});

describe("Phase B-1 WRITE order + lifecycle", () => {
  it("CASE 27/29: failed canonical writes no flat; success writes no flat (C-2)", () => {
    const written = writeFourTrackFamilyMembers([], {
      balls: {
        cue: { x: 8, y: 16 },
        target: { x: 8 + 20 + DEFAULT_SCALE.BALL_DIAMETER_RG, y: 16 },
        second: { x: 20, y: 10 },
      },
      entry: authoredEntry({ familyId: "fm_order" }),
    });
    expect(written.ok).toBe(true);
    if (!written.ok) return;

    forceCanonicalCommitFailureForTests("write");
    const fail = persistWorkingCorpusNormalizedAuthority({
      dataset: written.dataset,
      shotType: "뒤돌리기",
      systemId: "5_half_system",
    });
    expect(fail.ok).toBe(false);
    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBeNull();
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBeNull();
    clearCanonicalCommitFailureForTests();

    const ok = persistWorkingCorpusNormalizedAuthority({
      dataset: written.dataset,
      shotType: "뒤돌리기",
      systemId: "5_half_system",
    });
    expect(ok.ok).toBe(true);
    if (!ok.ok) return;
    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBeTruthy();
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBeNull();
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeNull();
    expect(ok.flatProjection.ok).toBe(false);
    expect(ok.shadowSync.ok).toBe(false);
  });

  it("CASE 13/21–26: SAVE + Derived/Product approval; product_export absent", () => {
    const collinear = {
      cue: { x: 8, y: 16 },
      target: { x: 8 + 20 + DEFAULT_SCALE.BALL_DIAMETER_RG, y: 16 },
      second: { x: 20, y: 10 },
    };
    const { ctx } = buildSaveCtx({ ballsState: collinear });
    const save = runSaveStrategy(ctx);
    expect(save.ok).toBe(true);
    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBeTruthy();
    if (!save.ok || !save.updated || !save.familyId) return;

    const review = createUnifiedDerivedReview({
      dataset: save.updated,
      familyId: save.familyId,
      authoredPathNodes: [
        { x: 10, y: 0 },
        { x: 40, y: 40 },
        { x: 80, y: 20 },
        { x: 40, y: 0 },
        { x: 0, y: 20 },
        null,
        null,
      ],
      hitTolerance: HIT,
    });
    expect(review.ok).toBe(true);
    if (!review.ok) return;
    // Product may be empty on ALL NO_SB; Derived approval path still must be canonical.
    if (review.bag.productMembers.length === 0) {
      expect(existsSync(join(here, "../productExportRequest.ts"))).toBe(false);
      return;
    }

    const approved = approveUnifiedDerivedReview({
      dataset: save.updated,
      bag: review.bag,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;

    const priorCanonical = localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY);
    forceCanonicalCommitFailureForTests("write");
    const failApprove = commitDerivedApprovalDataset({
      resultDataset: approved.dataset,
      baselineSnapshot: null,
      setDataset: () => {},
      restoreDerivedReviewSnapshot: () => {},
      shotType: "뒤돌리기",
      systemId: "5_half_system",
    });
    expect(failApprove.canonicalOk).toBe(false);
    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBe(
      priorCanonical
    );
    clearCanonicalCommitFailureForTests();

    const okApprove = commitDerivedApprovalDataset({
      resultDataset: approved.dataset,
      baselineSnapshot: null,
      setDataset: () => {},
      restoreDerivedReviewSnapshot: () => {},
      shotType: "뒤돌리기",
      systemId: "5_half_system",
    });
    expect(okApprove.canonicalOk).toBe(true);
    const loaded = loadCanonicalNormalizedCorpus();
    expect(loaded.ok && loaded.present).toBe(true);
    if (!loaded.ok || !loaded.present) return;
    expect(
      loaded.envelope.familyMembers.some(
        (m) => m.memberOrigin === CUE_C3_PRODUCT_MEMBER_ORIGIN
      )
    ).toBe(true);
    expect(existsSync(join(here, "../productExportRequest.ts"))).toBe(false);
  });

  it("CASE 30–31: multi-Family same balls canonical survives without flat", () => {
    const sharedBalls = {
      cue: { x: 10, y: 10 },
      target: { x: 40, y: 20 },
      second: { x: 60, y: 15 },
    };
    clearCanonicalNormalizedCorpusForTests();
    const empty = createEmptyCanonicalNormalizedCorpus({
      shotType: "뒤돌리기",
      systemId: "5_half_system",
    });
    const dual = upsertFamilySliceInEnvelope(empty, masterOf("fm_1"), [
      authoredMember("fm_1", "mb_1", sharedBalls),
    ]);
    expect(dual.ok).toBe(true);
    if (!dual.ok) {
      // eslint-disable-next-line no-console
      console.log(dual.issues);
      return;
    }
    const dual2 = upsertFamilySliceInEnvelope(dual.envelope, masterOf("fm_2"), [
      authoredMember("fm_2", "mb_2", sharedBalls, "S2"),
    ]);
    expect(dual2.ok).toBe(true);
    if (!dual2.ok) return;
    expect(commitCanonicalNormalizedCorpus(dual2.envelope).ok).toBe(true);
    localStorage.removeItem(WORKING_DATASET_KEY);
    localStorage.removeItem(FAMILY_MASTERS_STORAGE_KEY);
    localStorage.removeItem(FAMILY_MEMBERS_STORAGE_KEY);
    const reloaded = loadCanonicalNormalizedCorpus();
    expect(reloaded.ok && reloaded.present).toBe(true);
    if (!reloaded.ok || !reloaded.present) return;
    expect(reloaded.envelope.familyMasters).toHaveLength(2);
  });
});

describe("Phase B-1 architecture owner wiring", () => {
  it("saveFlow / derivedApproval use normalized authority orchestrator", () => {
    const save = readFileSync(
      join(here, "../../application/flows/saveFlow.ts"),
      "utf8"
    );
    const approval = readFileSync(
      join(here, "../../application/flows/derivedApprovalFlow.ts"),
      "utf8"
    );
    expect(save).toContain("persistWorkingCorpusNormalizedAuthority");
    expect(approval).toContain("persistWorkingCorpusNormalizedAuthority");
    expect(save.indexOf("persistWorkingCorpusNormalizedAuthority")).toBeLessThan(
      save.lastIndexOf("ok: true")
    );
  });
});
