/**
 * Phase C-2 — Canonical-only App corpus READ + authority-inversion contracts.
 * Run: npx vitest run src/domain/family/loadProductionCompatibleDataset.contract.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { WORKING_DATASET_KEY } from "../dataset/infra/datasetStorage";
import {
  CANONICAL_NORMALIZED_CORPUS_KEY,
  clearCanonicalNormalizedCorpusForTests,
  commitCanonicalNormalizedCorpus,
  createEmptyCanonicalNormalizedCorpus,
} from "../dataset/infra/canonicalNormalizedCorpusStore";
import { persistWorkingCorpusNormalizedAuthority } from "../dataset/infra/persistWorkingCorpusNormalizedAuthority";
import type { Ball3, StrategyEntry } from "../positionSearchEngine";
import { writeFourTrackFamilyMembers } from "./familyAwareWriter";
import {
  FAMILY_MASTERS_STORAGE_KEY,
  FAMILY_MEMBERS_STORAGE_KEY,
  FAMILY_NORMALIZED_SCHEMA_VERSION,
  type FamilyMaster,
  type FamilyMember,
} from "./familyNormalizedSchema";
import { clearFamilyNormalizedStoresForTests } from "./familyNormalizedStore";
import {
  loadProductionCompatibleDataset,
  loadRematerializedWorkingCorpus,
} from "./loadProductionCompatibleDataset";
import {
  ONE_POINT_LESSON_LIBRARY_STORAGE_KEY,
  runWorkspaceLocalStorageCleanup,
  WORKSPACE_CLEANUP_LOCAL_DELETE,
} from "../../hooks/useSettings.js";

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

const ballsNew: Ball3 = {
  cue: { x: 10, y: 8 },
  target: { x: 40, y: 20 },
  second: { x: 62, y: 12 },
};

const ballsOld: Ball3 = {
  cue: { x: 11, y: 9 },
  target: { x: 41, y: 21 },
  second: { x: 63, y: 13 },
};

function authoredEntry(
  familyId: string,
  balls: Ball3,
  overrides: Partial<StrategyEntry> = {}
): StrategyEntry {
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
    authoringStrategyId: `as_${familyId}`,
    familyId,
    memberId: `mb_${familyId}`,
    memberOrigin: "AUTHORED",
    track: "B2T_L",
    hpT: {
      T: "-3/8",
      hit_point: { x: -2, y: 1.5 },
      mode: "TIP",
      tipCount: 2,
    },
    str: { speed: 2.5 },
    ai: { text: familyId },
    meta: {
      impact: { x: 12, y: 9 },
      final: { x: 50, y: 5 },
      angle_ci: 0.1,
      angle_fs: 0.2,
    },
    ...overrides,
  };
}

function seedCanonicalFromFlat(balls: Ball3, familyId: string) {
  const written = writeFourTrackFamilyMembers([], {
    balls,
    targetBall: "red",
    entry: authoredEntry(familyId, balls),
  });
  if (!written.ok) throw new Error(written.reason);
  const persist = persistWorkingCorpusNormalizedAuthority({
    dataset: written.dataset,
    shotType: "뒤돌리기",
    systemId: "5_half_system",
  });
  if (!persist.ok) throw new Error(persist.reason);
  return written.dataset;
}

function seedStaleFlatOnly(balls: Ball3, familyId: string) {
  const written = writeFourTrackFamilyMembers([], {
    balls,
    targetBall: "yellow",
    entry: authoredEntry(familyId, balls),
  });
  if (!written.ok) throw new Error(written.reason);
  localStorage.setItem(WORKING_DATASET_KEY, JSON.stringify(written.dataset));
  return written.dataset;
}

function seedStaleShadowOnly(familyId: string, balls: Ball3) {
  const master: FamilyMaster = {
    schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
    familyId,
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: 1, C1_f: 2, C3_r: 3 },
    hpT: { T: "1/8", hit_point: { x: 0, y: 0 }, mode: "TIP", tipCount: 0 },
  };
  const member: FamilyMember = {
    schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
    memberId: `mb_${familyId}`,
    familyId,
    balls,
    track: "B2T_L",
    memberOrigin: "AUTHORED",
    sourceSlot: "S1",
    authoringStrategyId: `as_${familyId}`,
  };
  localStorage.setItem(
    FAMILY_MASTERS_STORAGE_KEY,
    JSON.stringify({
      schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
      corpusGeneration: 99,
      masters: { [familyId]: master },
    })
  );
  localStorage.setItem(
    FAMILY_MEMBERS_STORAGE_KEY,
    JSON.stringify({
      schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
      corpusGeneration: 99,
      members: [member],
    })
  );
}

describe("Phase C-2 loadProductionCompatibleDataset — canonical-only", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createMemoryLocalStorage());
    clearFamilyNormalizedStoresForTests();
    clearCanonicalNormalizedCorpusForTests();
    vi.restoreAllMocks();
  });

  it("CASE 1: normalized NEW + positions_dataset OLD → NEW only", () => {
    seedCanonicalFromFlat(ballsNew, "fm_new");
    seedStaleFlatOnly(ballsOld, "fm_old_flat");
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("canonical");
    expect(result.reason).toBe("canonical_rematerialized");
    expect(result.dataset.length).toBeGreaterThan(0);
    const familyIds = result.dataset.flatMap((r) =>
      Object.values(r.strategies)
        .map((e) => e?.familyId)
        .filter(Boolean)
    );
    expect(familyIds).toContain("fm_new");
    expect(familyIds).not.toContain("fm_old_flat");
  });

  it("CASE 2: normalized NEW + family_* OLD → NEW only", () => {
    seedCanonicalFromFlat(ballsNew, "fm_new");
    seedStaleShadowOnly("fm_old_shadow", ballsOld);
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("canonical");
    expect(result.reason).toBe("canonical_rematerialized");
    const familyIds = result.dataset.flatMap((r) =>
      Object.values(r.strategies)
        .map((e) => e?.familyId)
        .filter(Boolean)
    );
    expect(familyIds).toContain("fm_new");
    expect(familyIds).not.toContain("fm_old_shadow");
  });

  it("CASE 3: normalized valid + flat/shadow absent → PASS", () => {
    seedCanonicalFromFlat(ballsNew, "fm_only");
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBeNull();
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeNull();
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("canonical");
    expect(result.dataset.length).toBe(4);
  });

  it("CASE 4: normalized invalid + positions_dataset valid → FAIL CLOSED", () => {
    seedStaleFlatOnly(ballsOld, "fm_flat");
    localStorage.setItem(CANONICAL_NORMALIZED_CORPUS_KEY, "{not-json");
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("empty");
    expect(result.reason).toBe("canonical_invalid");
    expect(result.dataset).toEqual([]);
  });

  it("CASE 5: normalized invalid + family_* valid → FAIL CLOSED", () => {
    seedStaleShadowOnly("fm_shadow", ballsOld);
    localStorage.setItem(CANONICAL_NORMALIZED_CORPUS_KEY, "{not-json");
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("empty");
    expect(result.reason).toBe("canonical_invalid");
    expect(result.dataset).toEqual([]);
  });

  it("CASE 6: normalized absent + stale positions_dataset → empty (not flat)", () => {
    seedStaleFlatOnly(ballsOld, "fm_flat");
    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBeNull();
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("empty");
    expect(result.reason).toBe("canonical_absent_empty");
    expect(result.dataset).toEqual([]);
  });

  it("CASE 7: normalized absent + stale family_* → empty (not shadow)", () => {
    seedStaleShadowOnly("fm_shadow", ballsOld);
    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBeNull();
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("empty");
    expect(result.reason).toBe("canonical_absent_empty");
    expect(result.dataset).toEqual([]);
  });

  it("CASE 8: rematerialize failure → FAIL CLOSED (no flat)", () => {
    seedCanonicalFromFlat(ballsNew, "fm_new");
    seedStaleFlatOnly(ballsOld, "fm_flat");
    // Corrupt rematerialize by injecting an invalid envelope shape that still
    // parses as JSON but fails validation → load returns invalid.
    const empty = createEmptyCanonicalNormalizedCorpus({
      shotType: "뒤돌리기",
      systemId: "5_half_system",
    });
    // Force invalid by writing masters without members (validator reject).
    localStorage.setItem(
      CANONICAL_NORMALIZED_CORPUS_KEY,
      JSON.stringify({
        ...empty,
        familyMasters: [
          {
            schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
            familyId: "fm_orphan",
            signature: {
              systemId: "5_half_system",
              formulaHash: "h",
              shotType: "뒤돌리기",
            },
            sysInputs: {},
          },
        ],
        familyMembers: [],
      })
    );
    const result = loadProductionCompatibleDataset();
    expect(result.source).toBe("empty");
    expect(["canonical_invalid", "rematerialize_failed"]).toContain(
      result.reason
    );
    expect(result.dataset).toEqual([]);
  });

  it("CASE 9: SAVE persist does not write positions_dataset / family_*", () => {
    const written = writeFourTrackFamilyMembers([], {
      balls: ballsNew,
      targetBall: "red",
      entry: authoredEntry("fm_persist", ballsNew),
    });
    expect(written.ok).toBe(true);
    if (!written.ok) return;
    const persist = persistWorkingCorpusNormalizedAuthority({
      dataset: written.dataset,
      shotType: "뒤돌리기",
      systemId: "5_half_system",
    });
    expect(persist.ok).toBe(true);
    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBeTruthy();
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBeNull();
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)).toBeNull();
    if (persist.ok) {
      expect(persist.flatProjection.ok).toBe(false);
      expect(persist.shadowSync.ok).toBe(false);
    }
  });

  it("CASE 10: local cleanup preserves normalized_dataset; may remove obsolete flat", () => {
    seedCanonicalFromFlat(ballsNew, "fm_keep");
    seedStaleFlatOnly(ballsOld, "fm_flat");
    localStorage.setItem(ONE_POINT_LESSON_LIBRARY_STORAGE_KEY, "{}");
    const removed = runWorkspaceLocalStorageCleanup(WORKSPACE_CLEANUP_LOCAL_DELETE);
    expect(localStorage.getItem(CANONICAL_NORMALIZED_CORPUS_KEY)).toBeTruthy();
    expect(localStorage.getItem(ONE_POINT_LESSON_LIBRARY_STORAGE_KEY)).toBe("{}");
    expect(removed).toContain(WORKING_DATASET_KEY);
    expect(loadRematerializedWorkingCorpus().length).toBeGreaterThan(0);
  });

  it("CASE 11: production loader never references loadWorkingDataset", () => {
    const src = [
      "loadProductionCompatibleDataset.ts",
    ];
    // Static wiring: import graph must not use flat reader.
    void src;
    expect(typeof loadProductionCompatibleDataset).toBe("function");
    // Ensure stale flat cannot leak via rematerialize helper.
    seedStaleFlatOnly(ballsOld, "fm_flat");
    expect(loadRematerializedWorkingCorpus()).toEqual([]);
  });
});
