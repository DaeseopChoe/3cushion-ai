/**
 * Phase 3A-335 — Generation metadata failure-safety regression.
 * Run: npx vitest run src/domain/dataset/infra/persistPositionsDatasetWithGeneration.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { WORKING_DATASET_KEY } from "./datasetStorage";
import {
  clearPositionsDatasetMetaForTests,
  loadPositionsDatasetCorpusGeneration,
  POSITIONS_DATASET_META_KEY,
  writePositionsDatasetCorpusGeneration,
} from "./positionsDatasetMeta";
import {
  clearPersistPositionsFailureForTests,
  forcePersistPositionsFailureForTests,
  persistPositionsDatasetWithGeneration,
} from "./persistPositionsDatasetWithGeneration";
import type { Ball3, PositionRecord, StrategyEntry } from "../../positionSearchEngine";
import { writeFourTrackFamilyMembers } from "../../family/familyAwareWriter";
import {
  evaluateNormalizedCorpusFreshness,
  isNormalizedCorpusFresh,
} from "../../family/familyCorpusFreshness";
import {
  clearFamilyNormalizedStoresForTests,
  loadFamilyMastersEnvelope,
  loadFamilyMembersEnvelope,
} from "../../family/familyNormalizedStore";
import { syncPositionDatasetToNormalizedFamilyStore } from "../../family/syncPositionDatasetToNormalizedFamilyStore";
import {
  FAMILY_MASTERS_STORAGE_KEY,
  FAMILY_MEMBERS_STORAGE_KEY,
} from "../../family/familyNormalizedSchema";

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

const canonicalHpt = {
  T: "-3/8",
  hit_point: { x: -2, y: 1.5 },
  mode: "TIP",
  tipCount: 2,
};

const balls: Ball3 = {
  cue: { x: 10, y: 8 },
  target: { x: 40, y: 20 },
  second: { x: 62, y: 12 },
};

function authoredEntry(overrides: Partial<StrategyEntry> = {}): StrategyEntry {
  return {
    slot: "S1",
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
    corrections: {
      slide: 0,
      curve_ratio: 0,
      draw: 0,
      departure: 0,
      spin: 0,
    },
    correctionsStored: true,
    authoringStrategyId: "as_authored",
    familyId: "fm_family1",
    memberId: "mb_authored",
    track: "B2T_L",
    memberOrigin: "AUTHORED",
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

function seedFreshAtGeneration10() {
  const written = writeFourTrackFamilyMembers([], {
    balls,
    targetBall: "red",
    entry: authoredEntry(),
  });
  if (!written.ok) throw new Error(written.reason);
  // Establish gen 10 without going through 1..9 bumps
  localStorage.setItem(WORKING_DATASET_KEY, JSON.stringify(written.dataset));
  writePositionsDatasetCorpusGeneration(10);
  const sync = syncPositionDatasetToNormalizedFamilyStore(written.dataset, {
    corpusGeneration: 10,
  });
  if (!sync.ok) throw new Error(sync.reason);
  expect(isNormalizedCorpusFresh()).toBe(true);
  expect(loadPositionsDatasetCorpusGeneration()).toBe(10);
  expect(loadFamilyMastersEnvelope().corpusGeneration).toBe(10);
  expect(loadFamilyMembersEnvelope().corpusGeneration).toBe(10);
  return written.dataset;
}

beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryLocalStorage());
  clearFamilyNormalizedStoresForTests();
  clearPositionsDatasetMetaForTests();
  clearPersistPositionsFailureForTests();
});

describe("T5 full success", () => {
  it("invalidate → positions → gen → sync → fresh true", () => {
    seedFreshAtGeneration10();
    const next: PositionRecord[] = [
      {
        positionId: "pos_b",
        balls,
        targetBall: "red",
        strategies: { S1: authoredEntry({ memberId: "mb_b" }) },
      },
    ];
    // Need valid migrate corpus — use four-track again
    const written = writeFourTrackFamilyMembers([], {
      balls: { cue: { x: 11, y: 8 }, target: { x: 41, y: 20 }, second: { x: 63, y: 12 } },
      entry: authoredEntry({ memberId: "mb_authored2", familyId: "fm_family1" }),
    });
    if (!written.ok) throw new Error(written.reason);
    const persist = persistPositionsDatasetWithGeneration(written.dataset);
    expect(persist.ok).toBe(true);
    if (!persist.ok) return;
    expect(persist.corpusGeneration).toBe(11);
    expect(persist.previousGeneration).toBe(10);
    const sync = syncPositionDatasetToNormalizedFamilyStore(written.dataset, {
      corpusGeneration: persist.corpusGeneration,
    });
    expect(sync.ok).toBe(true);
    expect(isNormalizedCorpusFresh()).toBe(true);
  });
});

describe("T1 Phase 3A-334 exact defect — generation commit failure", () => {
  it("positions write success + meta commit fail → fresh false after reload", () => {
    const oldDataset = seedFreshAtGeneration10();
    const written = writeFourTrackFamilyMembers([], {
      balls: { cue: { x: 12, y: 9 }, target: { x: 42, y: 21 }, second: { x: 64, y: 13 } },
      entry: authoredEntry(),
    });
    if (!written.ok) throw new Error(written.reason);

    forcePersistPositionsFailureForTests("generation");
    const persist = persistPositionsDatasetWithGeneration(written.dataset);
    expect(persist.ok).toBe(false);
    if (persist.ok) return;
    expect(persist.stage).toBe("generation");

    // New positions may be durable; marker missing; family still old gen 10
    expect(JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!)).toEqual(
      written.dataset
    );
    expect(localStorage.getItem(POSITIONS_DATASET_META_KEY)).toBeNull();
    expect(loadFamilyMastersEnvelope().corpusGeneration).toBe(10);
    expect(loadFamilyMembersEnvelope().corpusGeneration).toBe(10);

    // Normalized sync must not run on failure (caller contract) — family unchanged
    expect(Object.keys(loadFamilyMembersEnvelope().members).length).toBe(4);

    expect(isNormalizedCorpusFresh()).toBe(false);
    const freshness = evaluateNormalizedCorpusFreshness();
    expect(freshness.ok).toBe(false);
    if (!freshness.ok) expect(freshness.reason).toBe("LEGACY_MARKER_MISSING");

    // Reload simulation
    const pos = localStorage.getItem(WORKING_DATASET_KEY)!;
    const masters = localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)!;
    const members = localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)!;
    localStorage.setItem(WORKING_DATASET_KEY, pos);
    localStorage.setItem(FAMILY_MASTERS_STORAGE_KEY, masters);
    localStorage.setItem(FAMILY_MEMBERS_STORAGE_KEY, members);
    expect(localStorage.getItem(POSITIONS_DATASET_META_KEY)).toBeNull();
    expect(isNormalizedCorpusFresh()).toBe(false);

    void oldDataset;
  });
});

describe("T2 invalidation failure", () => {
  it("does not write positions and does not sync", () => {
    seedFreshAtGeneration10();
    const beforePos = localStorage.getItem(WORKING_DATASET_KEY);
    const written = writeFourTrackFamilyMembers([], {
      balls: { cue: { x: 1, y: 1 }, target: { x: 2, y: 2 }, second: { x: 3, y: 3 } },
      entry: authoredEntry(),
    });
    if (!written.ok) throw new Error(written.reason);

    forcePersistPositionsFailureForTests("invalidate");
    const persist = persistPositionsDatasetWithGeneration(written.dataset);
    expect(persist.ok).toBe(false);
    if (persist.ok) return;
    expect(persist.stage).toBe("invalidate");
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBe(beforePos);
    expect(loadPositionsDatasetCorpusGeneration()).toBe(10);
    expect(isNormalizedCorpusFresh()).toBe(true);
  });
});

describe("T3 positions write failure", () => {
  it("leaves marker missing and fresh false", () => {
    seedFreshAtGeneration10();
    const written = writeFourTrackFamilyMembers([], {
      balls,
      entry: authoredEntry(),
    });
    if (!written.ok) throw new Error(written.reason);

    forcePersistPositionsFailureForTests("positions");
    const persist = persistPositionsDatasetWithGeneration(written.dataset);
    expect(persist.ok).toBe(false);
    if (persist.ok) return;
    expect(persist.stage).toBe("positions");
    expect(localStorage.getItem(POSITIONS_DATASET_META_KEY)).toBeNull();
    expect(isNormalizedCorpusFresh()).toBe(false);
  });
});

describe("T4 generation ok / normalized sync fails", () => {
  it("leaves mismatch fresh false", () => {
    seedFreshAtGeneration10();
    const conflict = structuredClone(
      JSON.parse(localStorage.getItem(WORKING_DATASET_KEY)!)
    ) as PositionRecord[];
    // Break common payload consistency across members
    if (conflict[0] && conflict[1]) {
      Object.values(conflict[0].strategies)[0]!.sysInputs = { CO_f: 1 };
      Object.values(conflict[1].strategies)[0]!.sysInputs = { CO_f: 999 };
    }
    const persist = persistPositionsDatasetWithGeneration(conflict);
    expect(persist.ok).toBe(true);
    if (!persist.ok) return;
    expect(persist.corpusGeneration).toBe(11);
    const sync = syncPositionDatasetToNormalizedFamilyStore(conflict, {
      corpusGeneration: persist.corpusGeneration,
    });
    expect(sync.ok).toBe(false);
    expect(loadPositionsDatasetCorpusGeneration()).toBe(11);
    expect(loadFamilyMastersEnvelope().corpusGeneration).toBe(10);
    expect(isNormalizedCorpusFresh()).toBe(false);
  });
});

describe("monotonicity", () => {
  it("uses in-memory previous gen so invalidate does not reset to 1", () => {
    seedFreshAtGeneration10();
    const written = writeFourTrackFamilyMembers([], {
      balls,
      entry: authoredEntry(),
    });
    if (!written.ok) throw new Error(written.reason);
    const persist = persistPositionsDatasetWithGeneration(written.dataset);
    expect(persist.ok).toBe(true);
    if (!persist.ok) return;
    expect(persist.previousGeneration).toBe(10);
    expect(persist.corpusGeneration).toBe(11);
  });
});
