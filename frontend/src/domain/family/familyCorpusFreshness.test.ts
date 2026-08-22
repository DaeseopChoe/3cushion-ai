/**
 * Phase 3A-333 — Generation / freshness contract regression.
 * Run: npx vitest run src/domain/family/familyCorpusFreshness.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { WORKING_DATASET_KEY } from "../dataset/infra/datasetStorage";
import {
  bumpPositionsDatasetCorpusGeneration,
  clearPositionsDatasetMetaForTests,
  loadPositionsDatasetCorpusGeneration,
  writePositionsDatasetCorpusGeneration,
  POSITIONS_DATASET_META_KEY,
} from "../dataset/infra/positionsDatasetMeta";
import type { Ball3, StrategyEntry } from "../positionSearchEngine";
import { writeFourTrackFamilyMembers } from "./familyAwareWriter";
import {
  evaluateNormalizedCorpusFreshness,
  isNormalizedCorpusFresh,
} from "./familyCorpusFreshness";
import { isFamilyNormalizedStorageEnabled } from "./familyNormalizedFlag";
import {
  FAMILY_MASTERS_STORAGE_KEY,
  FAMILY_MEMBERS_STORAGE_KEY,
  FAMILY_NORMALIZED_SCHEMA_VERSION,
  emptyFamilyMastersEnvelope,
  emptyFamilyMembersEnvelope,
} from "./familyNormalizedSchema";
import {
  clearFamilyNormalizedStoresForTests,
  loadFamilyMastersEnvelope,
  loadFamilyMembersEnvelope,
  persistMigratedFamilyParts,
  validateFamilyStore,
  writeFamilyMastersEnvelopeForTests,
  writeFamilyMembersEnvelopeForTests,
} from "./familyNormalizedStore";
import { migratePositionRecordsToFamilyParts } from "./migratePositionRecordsToFamilyParts";
import { syncPositionDatasetToNormalizedFamilyStore } from "./syncPositionDatasetToNormalizedFamilyStore";

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

function seedFreshShadow() {
  const written = writeFourTrackFamilyMembers([], {
    balls,
    targetBall: "red",
    entry: authoredEntry(),
  });
  if (!written.ok) throw new Error(written.reason);
  localStorage.setItem(WORKING_DATASET_KEY, JSON.stringify(written.dataset));
  const bump = bumpPositionsDatasetCorpusGeneration();
  if (!bump.ok) throw new Error(bump.reason);
  const sync = syncPositionDatasetToNormalizedFamilyStore(written.dataset, {
    corpusGeneration: bump.corpusGeneration,
  });
  if (!sync.ok) throw new Error(sync.reason);
  return { written, gen: bump.corpusGeneration };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryLocalStorage());
  clearFamilyNormalizedStoresForTests();
  clearPositionsDatasetMetaForTests();
});

describe("architecture guards", () => {
  it("default flag ON does not change freshness API (shadow vs WRITE SSOT)", () => {
    expect(isFamilyNormalizedStorageEnabled()).toBe(true);
  });
});

describe("fresh success + reload", () => {
  it("full write → reload → freshness true", () => {
    seedFreshShadow();
    expect(isNormalizedCorpusFresh()).toBe(true);
    const mastersRaw = localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)!;
    const membersRaw = localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)!;
    const metaRaw = localStorage.getItem(POSITIONS_DATASET_META_KEY)!;
    // Simulate reload by re-parsing
    localStorage.setItem(FAMILY_MASTERS_STORAGE_KEY, mastersRaw);
    localStorage.setItem(FAMILY_MEMBERS_STORAGE_KEY, membersRaw);
    localStorage.setItem(POSITIONS_DATASET_META_KEY, metaRaw);
    expect(evaluateNormalizedCorpusFreshness()).toMatchObject({
      ok: true,
      fresh: true,
      corpusGeneration: 1,
      masterCount: 1,
      memberCount: 4,
    });
  });
});

describe("partial / mismatch detection", () => {
  it("Master gen N + Member gen N-1 → ineligible", () => {
    const { gen } = seedFreshShadow();
    const members = loadFamilyMembersEnvelope();
    members.corpusGeneration = gen - 1 >= 1 ? gen - 1 : undefined;
    if (gen === 1) {
      delete members.corpusGeneration;
      writeFamilyMembersEnvelopeForTests(members);
      const freshness = evaluateNormalizedCorpusFreshness();
      expect(freshness.ok).toBe(false);
      if (!freshness.ok) expect(freshness.reason).toBe("MEMBER_MARKER_MISSING");
      return;
    }
    writeFamilyMembersEnvelopeForTests(members);
    expect(validateFamilyStore().ok).toBe(true);
    const freshness = evaluateNormalizedCorpusFreshness();
    expect(freshness.ok).toBe(false);
    if (!freshness.ok) expect(freshness.reason).toBe("GENERATION_MISMATCH");
  });

  it("Master gen N + Member gen older stamped → GENERATION_MISMATCH", () => {
    seedFreshShadow();
    // Advance legacy + masters only (simulate partial write after bump to 2)
    writePositionsDatasetCorpusGeneration(2);
    const masters = loadFamilyMastersEnvelope();
    masters.corpusGeneration = 2;
    writeFamilyMastersEnvelopeForTests(masters);
    // members remain at 1
    expect(loadFamilyMembersEnvelope().corpusGeneration).toBe(1);
    expect(validateFamilyStore().ok).toBe(true);
    const freshness = evaluateNormalizedCorpusFreshness();
    expect(freshness.ok).toBe(false);
    if (!freshness.ok) {
      expect(freshness.reason).toBe("GENERATION_MISMATCH");
      expect(freshness.masterGeneration).toBe(2);
      expect(freshness.memberGeneration).toBe(1);
      expect(freshness.legacyGeneration).toBe(2);
    }
  });

  it("Member gen newer than Master → GENERATION_MISMATCH", () => {
    seedFreshShadow();
    writePositionsDatasetCorpusGeneration(2);
    const members = loadFamilyMembersEnvelope();
    members.corpusGeneration = 2;
    writeFamilyMembersEnvelopeForTests(members);
    expect(loadFamilyMastersEnvelope().corpusGeneration).toBe(1);
    expect(validateFamilyStore().ok).toBe(true);
    const freshness = evaluateNormalizedCorpusFreshness();
    expect(freshness.ok).toBe(false);
    if (!freshness.ok) expect(freshness.reason).toBe("GENERATION_MISMATCH");
  });

  it("both normalized at old gen while legacy advanced → stale", () => {
    seedFreshShadow();
    writePositionsDatasetCorpusGeneration(5);
    expect(validateFamilyStore().ok).toBe(true);
    expect(loadFamilyMastersEnvelope().corpusGeneration).toBe(1);
    expect(loadFamilyMembersEnvelope().corpusGeneration).toBe(1);
    const freshness = evaluateNormalizedCorpusFreshness();
    expect(freshness.ok).toBe(false);
    if (!freshness.ok) expect(freshness.reason).toBe("GENERATION_MISMATCH");
  });

  it("marker-missing family envelopes → not fresh", () => {
    const written = writeFourTrackFamilyMembers([], {
      balls,
      entry: authoredEntry(),
    });
    if (!written.ok) throw new Error(written.reason);
    const migrated = migratePositionRecordsToFamilyParts(written.dataset);
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;
    // Persist via test helpers WITHOUT corpusGeneration field (legacy pre-3A-333 shape)
    const mastersEnv = emptyFamilyMastersEnvelope();
    const membersEnv = emptyFamilyMembersEnvelope();
    for (const m of migrated.masters) mastersEnv.masters[m.familyId] = m;
    for (const m of migrated.members) membersEnv.members[m.memberId] = m;
    writeFamilyMastersEnvelopeForTests(mastersEnv);
    writeFamilyMembersEnvelopeForTests(membersEnv);
    writePositionsDatasetCorpusGeneration(1);
    expect(validateFamilyStore().ok).toBe(true);
    const freshness = evaluateNormalizedCorpusFreshness();
    expect(freshness.ok).toBe(false);
    if (!freshness.ok) expect(freshness.reason).toBe("MASTER_MARKER_MISSING");
  });

  it("legacy marker missing → ineligible", () => {
    seedFreshShadow();
    localStorage.removeItem(POSITIONS_DATASET_META_KEY);
    const freshness = evaluateNormalizedCorpusFreshness();
    expect(freshness.ok).toBe(false);
    if (!freshness.ok) expect(freshness.reason).toBe("LEGACY_MARKER_MISSING");
  });

  it("family_* missing → NORMALIZED_MISSING", () => {
    writePositionsDatasetCorpusGeneration(1);
    localStorage.setItem(WORKING_DATASET_KEY, JSON.stringify([]));
    const freshness = evaluateNormalizedCorpusFreshness();
    expect(freshness.ok).toBe(false);
    if (!freshness.ok) expect(freshness.reason).toBe("NORMALIZED_MISSING");
  });

  it("only masters key present → NORMALIZED_PARTIAL", () => {
    seedFreshShadow();
    localStorage.removeItem(FAMILY_MEMBERS_STORAGE_KEY);
    const freshness = evaluateNormalizedCorpusFreshness();
    expect(freshness.ok).toBe(false);
    if (!freshness.ok) expect(freshness.reason).toBe("NORMALIZED_PARTIAL");
  });

  it("schema mismatch → ineligible", () => {
    seedFreshShadow();
    const masters = loadFamilyMastersEnvelope();
    masters.schemaVersion = FAMILY_NORMALIZED_SCHEMA_VERSION + 99;
    writeFamilyMastersEnvelopeForTests(masters);
    const freshness = evaluateNormalizedCorpusFreshness();
    expect(freshness.ok).toBe(false);
    if (!freshness.ok) expect(freshness.reason).toBe("SCHEMA_MISMATCH");
  });

  it("persistMigratedFamilyParts requires corpusGeneration", () => {
    const written = writeFourTrackFamilyMembers([], {
      balls,
      entry: authoredEntry(),
    });
    if (!written.ok) throw new Error(written.reason);
    const migrated = migratePositionRecordsToFamilyParts(written.dataset);
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;
    const persisted = persistMigratedFamilyParts({
      masters: migrated.masters,
      members: migrated.members,
      // @ts-expect-error intentional missing generation for runtime guard
      corpusGeneration: undefined,
    });
    expect(persisted.ok).toBe(false);
  });

  it("clear_all equivalent: no false eligibility", () => {
    seedFreshShadow();
    localStorage.clear();
    expect(loadPositionsDatasetCorpusGeneration()).toBeNull();
    expect(isNormalizedCorpusFresh()).toBe(false);
  });
});
