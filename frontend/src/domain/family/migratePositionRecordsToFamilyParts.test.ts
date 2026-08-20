/**
 * Phase 3A-323 B1–B4 — migrate PositionRecord[] → FamilyMaster/Member.
 * Run: npx vitest run src/domain/family/migratePositionRecordsToFamilyParts.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SCALE } from "../../utils/physics/ImpactEngine";
import { WORKING_DATASET_KEY } from "../dataset/infra/datasetStorage";
import type { Ball3, PositionRecord, StrategyEntry } from "../positionSearchEngine";
import { WORKSPACE_HISTORY_KEY } from "../workspaceHistory";
import {
  approveCueImpactDerivedReview,
  createCueImpactDerivedReview,
} from "./cueImpactDerivedReview";
import { writeFourTrackFamilyMembers } from "./familyAwareWriter";
import {
  familyCompatibilityFingerprint,
  hydrateFamilyMemberToPositionRecord,
} from "./familyHydrate";
import { isFamilyNormalizedStorageEnabled } from "./familyNormalizedFlag";
import {
  FAMILY_MASTER_COMMON_FIELD_KEYS,
  FAMILY_MASTERS_STORAGE_KEY,
  FAMILY_MEMBERS_STORAGE_KEY,
  memberHasForbiddenCommonPayload,
} from "./familyNormalizedSchema";
import {
  clearFamilyNormalizedStoresForTests,
  loadFamilyMastersEnvelope,
  loadFamilyMembersEnvelope,
  persistMigratedFamilyParts,
  readFamilyMaster,
  readFamilyMembersByFamilyId,
  validateFamilyStore,
} from "./familyNormalizedStore";
import {
  migratePositionRecordsToFamilyParts,
  migratedFamilyPartsIdentitySnapshot,
} from "./migratePositionRecordsToFamilyParts";

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
    memberOrigin: "AUTHORED",
    track: "B2T_L",
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

function persistFourTrack(balls = collinearBalls(20)) {
  const written = writeFourTrackFamilyMembers([], {
    balls,
    targetBall: "red",
    entry: authoredEntry(),
  });
  if (!written.ok) throw new Error(written.reason);
  return written;
}

function persistFourTrackWithDerived() {
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
  return { dataset: approved.dataset, review, approved };
}

beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryLocalStorage());
  clearFamilyNormalizedStoresForTests();
  localStorage.setItem(
    WORKING_DATASET_KEY,
    JSON.stringify([{ sentinel: "positions_dataset" }])
  );
  localStorage.setItem(
    WORKSPACE_HISTORY_KEY,
    JSON.stringify([{ sentinel: "workspace_history" }])
  );
});

describe("feature flag", () => {
  it("remains OFF", () => {
    expect(isFamilyNormalizedStorageEnabled()).toBe(false);
  });
});

describe("B1–B4 migration", () => {
  it("A: basic 4-track → 1 Master + 4 Members", () => {
    const written = persistFourTrack();
    const result = migratePositionRecordsToFamilyParts(written.dataset);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.familyCount).toBe(1);
    expect(result.memberCount).toBe(4);
    expect(result.masters).toHaveLength(1);
    expect(result.masters[0]?.familyId).toBe("fm_family1");
    expect(result.members.filter((m) => m.memberOrigin === "AUTHORED")).toHaveLength(1);
    expect(result.members.filter((m) => m.memberOrigin === "SYMMETRY")).toHaveLength(3);
  });

  it("B2: handcrafted 4×(1+3) = 16 Members representative fixture", () => {
    const tracks = ["B2T_L", "B2T_R", "T2B_L", "T2B_R"] as const;
    const ops = [null, "H", "V", "RPI"] as const;
    const dataset: PositionRecord[] = [];
    tracks.forEach((track, ti) => {
      const sourceId = ti === 0 ? "mb_authored" : `mb_sym_${track}`;
      const sourceBalls = {
        cue: { x: 10 + ti, y: 8 },
        target: { x: 40, y: 20 },
        second: { x: 62, y: 12 },
      };
      const sourceEntry = authoredEntry({
        memberId: sourceId,
        track,
        memberOrigin: ti === 0 ? "AUTHORED" : "SYMMETRY",
        ...(ti === 0
          ? {}
          : {
              generatedFromMemberId: "mb_authored",
              symmetryOp: ops[ti] as "H" | "V" | "RPI",
              authoringStrategyId: `as_${track}`,
            }),
      });
      dataset.push({
        positionId: `pos_src_${track}`,
        balls: sourceBalls,
        targetBall: "red",
        strategies: { S1: sourceEntry },
      });
      for (let k = 1; k <= 3; k += 1) {
        dataset.push({
          positionId: `pos_der_${track}_${k}`,
          balls: {
            cue: { x: sourceBalls.cue.x + k, y: sourceBalls.cue.y },
            target: sourceBalls.target,
            second: sourceBalls.second,
          },
          targetBall: "red",
          strategies: {
            S1: authoredEntry({
              memberId: `mb_der_${track}_${k}`,
              track,
              memberOrigin: "DERIVED_CUE_IMPACT",
              generatedFromMemberId: sourceId,
              derivedRule: "CUE_IMPACT_FIRST_30PCT",
              derivedStep: `cue_impact:t:${(0.1 * k).toFixed(6)}`,
              authoringStrategyId: `as_der_${track}_${k}`,
              symmetryOp: undefined,
            }),
          },
        });
      }
    });
    const result = migratePositionRecordsToFamilyParts(dataset);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.masters).toHaveLength(1);
    expect(result.members).toHaveLength(16);
    expect(
      result.members.filter((m) => m.memberOrigin === "DERIVED_CUE_IMPACT")
    ).toHaveLength(12);
  });

  it("C: cue/target/second exact for every Member", () => {
    const { dataset } = persistFourTrackWithDerived();
    const byKey = new Map<string, Ball3>();
    for (const record of dataset) {
      for (const entry of Object.values(record.strategies ?? {})) {
        if (!entry?.memberId) continue;
        byKey.set(entry.memberId, record.balls);
      }
    }
    const result = migratePositionRecordsToFamilyParts(dataset);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const member of result.members) {
      const legacy = byKey.get(member.memberId);
      expect(legacy).toBeTruthy();
      expect(member.balls.cue).toEqual(legacy!.cue);
      expect(member.balls.target).toEqual(legacy!.target);
      expect(member.balls.second).toEqual(legacy!.second);
    }
  });

  it("D/E: common payload stripped from Members; present on Master", () => {
    const written = persistFourTrack();
    const result = migratePositionRecordsToFamilyParts(written.dataset);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    for (const member of result.members) {
      expect(
        memberHasForbiddenCommonPayload(member as unknown as Record<string, unknown>)
      ).toBe(false);
      for (const key of FAMILY_MASTER_COMMON_FIELD_KEYS) {
        expect(Object.prototype.hasOwnProperty.call(member, key)).toBe(false);
      }
    }
    const master = result.masters[0]!;
    expect(master.signature.systemId).toBe("5_half_system");
    expect(master.sysInputs).toEqual({ CO_f: 30, C1_f: 10, C3_r: 20 });
    expect(master.hpT).toEqual(canonicalHpt);
    expect(master.ai).toEqual({ text: "keep" });
    expect(master.str).toEqual({ speed: 2.5 });
    expect(master.correctionsStored).toBe(true);
  });

  it("F: AUTHORED / SYMMETRY / DERIVED provenance preserved", () => {
    const { dataset } = persistFourTrackWithDerived();
    const result = migratePositionRecordsToFamilyParts(dataset);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const authored = result.members.find((m) => m.memberOrigin === "AUTHORED")!;
    expect(authored.symmetryOp).toBeUndefined();
    expect(authored.derivedRule).toBeUndefined();

    const sym = result.members.find((m) => m.memberOrigin === "SYMMETRY")!;
    expect(sym.generatedFromMemberId).toBe(authored.memberId);
    expect(["H", "V", "RPI"]).toContain(sym.symmetryOp);

    const derived = result.members.find(
      (m) => m.memberOrigin === "DERIVED_CUE_IMPACT"
    )!;
    expect(derived.generatedFromMemberId).toBeTruthy();
    expect(derived.derivedRule).toBe("CUE_IMPACT_FIRST_30PCT");
    expect(derived.derivedStep?.startsWith("cue_impact:t:")).toBe(true);
    expect(derived.track).toBeTruthy();
    expect(derived.familyId).toBe("fm_family1");
  });

  it("G: idempotent — same identity snapshot twice", () => {
    const { dataset } = persistFourTrackWithDerived();
    const a = migratePositionRecordsToFamilyParts(dataset);
    const b = migratePositionRecordsToFamilyParts(dataset);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(migratedFamilyPartsIdentitySnapshot(a)).toEqual(
      migratedFamilyPartsIdentitySnapshot(b)
    );
  });

  it("H: duplicate memberId with incompatible payload rejects", () => {
    const written = persistFourTrack();
    const dataset = structuredClone(written.dataset) as PositionRecord[];
    const first = dataset[0]!;
    const entry = Object.values(first.strategies)[0]!;
    dataset.push({
      ...first,
      positionId: "dup_position",
      balls: {
        cue: { x: 99, y: 99 },
        target: first.balls.target,
        second: first.balls.second,
      },
      strategies: {
        S1: {
          ...entry,
          memberId: entry.memberId,
          memberOrigin: "AUTHORED",
          track: "B2T_L",
        },
      },
    });
    const result = migratePositionRecordsToFamilyParts(dataset);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(
      result.issues.some(
        (i) =>
          i.code === "DUPLICATE_MEMBER_ID" ||
          i.code === "MULTIPLE_AUTHORED_SEEDS" ||
          i.code === "MEMBER_PAYLOAD_CONFLICT" ||
          i.code === "COMMON_PAYLOAD_CONFLICT"
      )
    ).toBe(true);
  });

  it("I: logical identity collision with different memberId rejects", () => {
    const written = persistFourTrack();
    const dataset = structuredClone(written.dataset) as PositionRecord[];
    const authoredRec = dataset.find((r) =>
      Object.values(r.strategies).some((e) => e?.memberOrigin === "AUTHORED")
    )!;
    const authored = Object.values(authoredRec.strategies)[0]!;
    dataset.push({
      positionId: "extra_authored",
      balls: {
        cue: { x: 1, y: 1 },
        target: { x: 2, y: 2 },
        second: { x: 3, y: 3 },
      },
      targetBall: "red",
      strategies: {
        S1: {
          ...authored,
          memberId: "mb_authored_other",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
          generatedFromMemberId: undefined,
          symmetryOp: undefined,
        },
      },
    });
    const result = migratePositionRecordsToFamilyParts(dataset);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(
      result.issues.some(
        (i) =>
          i.code === "MULTIPLE_AUTHORED_SEEDS" ||
          i.code === "LOGICAL_IDENTITY_COLLISION"
      )
    ).toBe(true);
  });

  it("J: conflicting common payload rejects — no silent merge", () => {
    const written = persistFourTrack();
    const dataset = structuredClone(written.dataset) as PositionRecord[];
    const sym = dataset.find((r) =>
      Object.values(r.strategies).some((e) => e?.memberOrigin === "SYMMETRY")
    )!;
    const entry = Object.values(sym.strategies)[0]!;
    entry.sysInputs = { ...entry.sysInputs, CO_f: 999 };
    const result = migratePositionRecordsToFamilyParts(dataset);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    const issue = result.issues.find((i) => i.code === "COMMON_PAYLOAD_CONFLICT");
    expect(issue).toBeTruthy();
    expect(issue?.familyId).toBe("fm_family1");
    expect(issue?.field).toBeTruthy();
    expect(issue?.conflictingMemberIds?.length).toBeGreaterThanOrEqual(1);
  });

  it("K: no AUTHORED seed fails closed", () => {
    const written = persistFourTrack();
    const dataset = structuredClone(written.dataset) as PositionRecord[];
    for (const record of dataset) {
      for (const entry of Object.values(record.strategies)) {
        if (!entry) continue;
        if (entry.memberOrigin === "AUTHORED") {
          entry.memberOrigin = "SYMMETRY";
          entry.symmetryOp = "H";
          entry.generatedFromMemberId = "mb_missing_seed";
        }
      }
    }
    const result = migratePositionRecordsToFamilyParts(dataset);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.issues.some((i) => i.code === "NO_AUTHORED_SEED")).toBe(true);
  });

  it("L: familyId alias (familyId === authoringStrategyId) is not merged as native", () => {
    const dataset: PositionRecord[] = [
      {
        positionId: "100080400200620120",
        balls: collinearBalls(20),
        strategies: {
          S1: authoredEntry({
            familyId: "fm_alias_bad",
            authoringStrategyId: "fm_alias_bad",
            memberId: "mb_alias",
          }),
        },
      },
    ];
    const result = migratePositionRecordsToFamilyParts(dataset);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.familyCount).toBe(0);
    expect(result.memberCount).toBe(0);
    expect(result.skippedLegacySlots).toBeGreaterThan(0);
  });

  it("M: round-trip migrate → hydrate preserves meaningful fields", () => {
    const written = persistFourTrack();
    const authoredRecord = written.dataset.find((r) =>
      Object.values(r.strategies).some((e) => e?.memberOrigin === "AUTHORED")
    )!;
    const slot = (Object.keys(authoredRecord.strategies)[0] ?? "S1") as "S1";
    const result = migratePositionRecordsToFamilyParts(written.dataset);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const master = result.masters[0]!;
    const member = result.members.find((m) => m.memberOrigin === "AUTHORED")!;
    const hydrated = hydrateFamilyMemberToPositionRecord(master, member, {
      slot,
      positionId: authoredRecord.positionId,
      meta: authoredRecord.strategies[slot]!.meta,
    });
    expect(familyCompatibilityFingerprint(hydrated, slot)).toEqual(
      familyCompatibilityFingerprint(authoredRecord, slot)
    );
  });

  it("N: persistMigratedFamilyParts reload validates counts", () => {
    const { dataset, review } = persistFourTrackWithDerived();
    const expectedMembers = 4 + review.session.members.length;
    const migrated = migratePositionRecordsToFamilyParts(dataset);
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;
    expect(migrated.memberCount).toBe(expectedMembers);
    const persisted = persistMigratedFamilyParts({
      masters: migrated.masters,
      members: migrated.members,
    });
    expect(persisted.ok).toBe(true);
    const validation = validateFamilyStore();
    expect(validation).toEqual({
      ok: true,
      masterCount: 1,
      memberCount: expectedMembers,
      orphanCount: 0,
      duplicateMemberIdCount: 0,
    });
    expect(readFamilyMaster("fm_family1")).toBeTruthy();
    expect(readFamilyMembersByFamilyId("fm_family1")).toHaveLength(
      expectedMembers
    );
    expect(loadFamilyMastersEnvelope().masters["fm_family1"]).toBeTruthy();
    expect(Object.keys(loadFamilyMembersEnvelope().members)).toHaveLength(
      expectedMembers
    );
  });

  it("O: positions_dataset and workspace_history untouched by persist", () => {
    const beforePos = localStorage.getItem(WORKING_DATASET_KEY);
    const beforeHist = localStorage.getItem(WORKSPACE_HISTORY_KEY);
    const written = persistFourTrack();
    const migrated = migratePositionRecordsToFamilyParts(written.dataset);
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;
    persistMigratedFamilyParts({
      masters: migrated.masters,
      members: migrated.members,
    });
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBe(beforePos);
    expect(localStorage.getItem(WORKSPACE_HISTORY_KEY)).toBe(beforeHist);
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeTruthy();
    expect(localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)).toBeTruthy();
  });

  it("does not mutate input dataset", () => {
    const written = persistFourTrack();
    const snapshot = structuredClone(written.dataset);
    migratePositionRecordsToFamilyParts(written.dataset);
    expect(written.dataset).toEqual(snapshot);
  });
});
