/**
 * Phase C — Normalized Local Member Search contracts (CASE 1–53 focused).
 *
 * Run: npx vitest run src/domain/recall/normalizedLocalMemberSearch.contract.test.ts
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CANONICAL_NORMALIZED_CORPUS_KEY,
  clearCanonicalNormalizedCorpusForTests,
  commitCanonicalNormalizedCorpus,
  createEmptyCanonicalNormalizedCorpus,
  upsertFamilySliceInEnvelope,
} from "../dataset/infra/canonicalNormalizedCorpusStore";
import { WORKING_DATASET_KEY } from "../dataset/infra/datasetStorage";
import {
  FAMILY_MASTERS_STORAGE_KEY,
  FAMILY_MEMBERS_STORAGE_KEY,
  FAMILY_NORMALIZED_SCHEMA_VERSION,
  type FamilyMaster,
  type FamilyMember,
} from "../family/familyNormalizedSchema";
import { createPositionId } from "../positionId";
import { runNormalizedLocalMemberSearch } from "./normalizedLocalMemberSearch";
import { NORMALIZED_DATASET_SCHEMA_VERSION } from "../dataset/normalizedDatasetEnvelope";

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

beforeEach(() => {
  vi.stubGlobal("localStorage", createMemoryLocalStorage());
  clearCanonicalNormalizedCorpusForTests();
});

const ballsP = {
  cue: { x: 10, y: 10 },
  target: { x: 40, y: 20 },
  second: { x: 60, y: 15 },
};

const ballsNear = {
  cue: { x: 10.5, y: 10.2 },
  target: { x: 40.3, y: 20.1 },
  second: { x: 60.2, y: 15.1 },
};

const ballsQ = {
  cue: { x: 25, y: 12 },
  target: { x: 45, y: 22 },
  second: { x: 65, y: 18 },
};

function master(
  familyId: string,
  overrides: Partial<FamilyMaster> = {}
): FamilyMaster {
  return {
    schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
    familyId,
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
    ai: { text: `ai-${familyId}` },
    str: { speed: 2 },
    hpT: { T: "8/8", hit_point: { x: 0, y: 0 }, mode: "TIP", tipCount: 0 },
    ...overrides,
  };
}

function member(
  partial: Partial<FamilyMember> &
    Pick<FamilyMember, "memberId" | "familyId" | "memberOrigin" | "track" | "sourceSlot">
): FamilyMember {
  return {
    schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
    balls: ballsP,
    authoringStrategyId: `as_${partial.memberId}`,
    ...partial,
  };
}

function commitMastersMembers(
  masters: FamilyMaster[],
  members: FamilyMember[]
): void {
  let env = createEmptyCanonicalNormalizedCorpus({
    shotType: "뒤돌리기",
    systemId: "5_half_system",
  });
  for (const m of masters) {
    const slice = members.filter((x) => x.familyId === m.familyId);
    const next = upsertFamilySliceInEnvelope(env, m, slice);
    expect(next.ok).toBe(true);
    if (!next.ok) throw new Error(next.issues[0]?.reason);
    env = next.envelope;
  }
  const commit = commitCanonicalNormalizedCorpus(env);
  expect(commit.ok).toBe(true);
}

describe("Phase C normalized Local Member Search — READ SSOT", () => {
  it("CASE 1: normalized valid + positions_dataset absent → Search PASS", () => {
    commitMastersMembers(
      [master("fm_a")],
      [
        member({
          memberId: "mb_a",
          familyId: "fm_a",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
          sourceSlot: "S1",
        }),
      ]
    );
    expect(localStorage.getItem(WORKING_DATASET_KEY)).toBeNull();
    const r = runNormalizedLocalMemberSearch({
      query: { balls: ballsP },
      profile: "adminSearch",
    });
    expect(r.kind).toBe("match");
    if (r.kind !== "match") return;
    expect(r.hits.some((h) => h.familyId === "fm_a")).toBe(true);
  });

  it("CASE 2: normalized valid + family_* shadow absent → Search PASS", () => {
    commitMastersMembers(
      [master("fm_a")],
      [
        member({
          memberId: "mb_a",
          familyId: "fm_a",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
          sourceSlot: "S1",
        }),
      ]
    );
    expect(localStorage.getItem(FAMILY_MASTERS_STORAGE_KEY)).toBeNull();
    expect(localStorage.getItem(FAMILY_MEMBERS_STORAGE_KEY)).toBeNull();
    expect(runNormalizedLocalMemberSearch({ query: { balls: ballsP } }).kind).toBe(
      "match"
    );
  });

  it("CASE 3: normalized NEW + flat OLD → NEW only", () => {
    commitMastersMembers(
      [master("fm_new", { ai: { text: "NEW" }, hpT: { T: "+1/8" } })],
      [
        member({
          memberId: "mb_new",
          familyId: "fm_new",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
          sourceSlot: "S1",
        }),
      ]
    );
    localStorage.setItem(
      WORKING_DATASET_KEY,
      JSON.stringify([
        {
          positionId: createPositionId(ballsP),
          balls: ballsP,
          strategies: {
            S1: {
              slot: "S1",
              familyId: "fm_old",
              memberId: "mb_old",
              memberOrigin: "AUTHORED",
              signature: { systemId: "5_half_system", formulaHash: "h", shotType: "뒤돌리기" },
              sysInputs: { CO_f: 99 },
              ai: { text: "OLD" },
            },
          },
        },
      ])
    );
    const r = runNormalizedLocalMemberSearch({ query: { balls: ballsP } });
    expect(r.kind).toBe("match");
    if (r.kind !== "match") return;
    expect(r.hits.every((h) => h.familyId === "fm_new")).toBe(true);
    expect(r.hits.some((h) => h.familyId === "fm_old")).toBe(false);
    expect(r.record.strategies.S1?.familyId).toBe("fm_new");
    expect(r.record.strategies.S1?.ai).toEqual({ text: "NEW" });
  });

  it("CASE 4: normalized NEW + shadow OLD → NEW only", () => {
    commitMastersMembers(
      [master("fm_new2", { ai: { text: "NEW2" } })],
      [
        member({
          memberId: "mb_new2",
          familyId: "fm_new2",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
          sourceSlot: "S1",
        }),
      ]
    );
    localStorage.setItem(
      FAMILY_MASTERS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
        masters: [master("fm_shadow_old", { ai: { text: "SHADOW_OLD" } })],
      })
    );
    localStorage.setItem(
      FAMILY_MEMBERS_STORAGE_KEY,
      JSON.stringify({
        schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
        members: [
          member({
            memberId: "mb_shadow_old",
            familyId: "fm_shadow_old",
            memberOrigin: "AUTHORED",
            track: "B2T_L",
            sourceSlot: "S1",
          }),
        ],
      })
    );
    const r = runNormalizedLocalMemberSearch({ query: { balls: ballsP } });
    expect(r.kind).toBe("match");
    if (r.kind !== "match") return;
    expect(r.record.strategies.S1?.familyId).toBe("fm_new2");
    expect(r.record.strategies.S1?.ai).toEqual({ text: "NEW2" });
  });

  it("CASE 5: normalized empty + flat populated → NO MATCH", () => {
    const empty = createEmptyCanonicalNormalizedCorpus({
      shotType: "뒤돌리기",
      systemId: "5_half_system",
    });
    expect(commitCanonicalNormalizedCorpus(empty).ok).toBe(true);
    localStorage.setItem(
      WORKING_DATASET_KEY,
      JSON.stringify([
        {
          positionId: createPositionId(ballsP),
          balls: ballsP,
          strategies: {
            S1: {
              slot: "S1",
              familyId: "fm_flat",
              memberId: "mb_flat",
              memberOrigin: "AUTHORED",
              signature: { systemId: "5_half_system", formulaHash: "h", shotType: "뒤돌리기" },
              sysInputs: { CO_f: 1 },
            },
          },
        },
      ])
    );
    const r = runNormalizedLocalMemberSearch({ query: { balls: ballsP } });
    expect(r.kind).toBe("no-match");
    if (r.kind === "no-match") expect(r.reason).toBe("empty-corpus");
  });

  it("CASE 6: normalized invalid + flat valid → FAIL CLOSED (no flat fallback)", () => {
    localStorage.setItem(CANONICAL_NORMALIZED_CORPUS_KEY, "{not-json");
    localStorage.setItem(
      WORKING_DATASET_KEY,
      JSON.stringify([
        {
          positionId: createPositionId(ballsP),
          balls: ballsP,
          strategies: {
            S1: {
              slot: "S1",
              familyId: "fm_flat",
              memberId: "mb_flat",
              memberOrigin: "AUTHORED",
              signature: { systemId: "5_half_system", formulaHash: "h", shotType: "뒤돌리기" },
              sysInputs: { CO_f: 1 },
            },
          },
        },
      ])
    );
    const r = runNormalizedLocalMemberSearch({ query: { balls: ballsP } });
    expect(r.kind).toBe("no-match");
    if (r.kind === "no-match") expect(r.reason).toBe("canonical-invalid");
  });

  it("CASE 7: canonical key missing → NO MATCH; no flat fallback", () => {
    localStorage.setItem(
      WORKING_DATASET_KEY,
      JSON.stringify([
        {
          positionId: createPositionId(ballsP),
          balls: ballsP,
          strategies: {
            S1: {
              slot: "S1",
              familyId: "fm_flat",
              memberId: "mb_flat",
              memberOrigin: "AUTHORED",
              signature: { systemId: "5_half_system", formulaHash: "h", shotType: "뒤돌리기" },
              sysInputs: { CO_f: 1 },
            },
          },
        },
      ])
    );
    const r = runNormalizedLocalMemberSearch({ query: { balls: ballsP } });
    expect(r.kind).toBe("no-match");
    if (r.kind === "no-match") expect(r.reason).toBe("canonical-missing");
  });
});

describe("Phase C Position / Strategy preservation", () => {
  it("CASE 8–12: P/S1+S2+S3 preserved; no position-only dedupe", () => {
    commitMastersMembers(
      [
        master("fm_a", { hpT: { T: "1/8" }, ai: { text: "A" }, sysInputs: { CO_f: 10 } }),
        master("fm_b", { hpT: { T: "2/8" }, ai: { text: "B" }, sysInputs: { CO_f: 20 } }),
        master("fm_c", { hpT: { T: "3/8" }, ai: { text: "C" }, sysInputs: { CO_f: 30 } }),
      ],
      [
        member({
          memberId: "mb_a",
          familyId: "fm_a",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
          sourceSlot: "S1",
        }),
        member({
          memberId: "mb_b",
          familyId: "fm_b",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
          sourceSlot: "S2",
        }),
        member({
          memberId: "mb_c",
          familyId: "fm_c",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
          sourceSlot: "S3",
        }),
      ]
    );
    const r = runNormalizedLocalMemberSearch({ query: { balls: ballsP } });
    expect(r.kind).toBe("match");
    if (r.kind !== "match") return;
    expect(r.meta.strategySlots).toEqual(["S1", "S2", "S3"]);
    expect(r.hits).toHaveLength(3);
    expect(r.record.strategies.S1?.familyId).toBe("fm_a");
    expect(r.record.strategies.S2?.familyId).toBe("fm_b");
    expect(r.record.strategies.S3?.familyId).toBe("fm_c");
    expect(r.record.strategies.S1?.ai).toEqual({ text: "A" });
    expect(r.record.strategies.S2?.ai).toEqual({ text: "B" });
    expect(r.record.strategies.S3?.ai).toEqual({ text: "C" });
    expect(r.record.strategies.S1?.hpT).toEqual({ T: "1/8" });
    expect(r.record.strategies.S2?.hpT).toEqual({ T: "2/8" });
    expect(r.record.strategies.S3?.hpT).toEqual({ T: "3/8" });
  });

  it("CASE 13: same systemId on S1/S2 different Family payload → both preserved", () => {
    commitMastersMembers(
      [
        master("fm_s1", {
          signature: { systemId: "5_half_system", formulaHash: "h1", shotType: "뒤돌리기" },
          hpT: { T: "-1/8" },
          corrections: { slide: 1, curve_ratio: 0, draw: 0, departure: 0, spin: 0 },
        }),
        master("fm_s2", {
          signature: { systemId: "5_half_system", formulaHash: "h1", shotType: "뒤돌리기" },
          hpT: { T: "+5/8" },
          corrections: { slide: 9, curve_ratio: 0, draw: 0, departure: 0, spin: 0 },
        }),
      ],
      [
        member({
          memberId: "mb_s1",
          familyId: "fm_s1",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
          sourceSlot: "S1",
        }),
        member({
          memberId: "mb_s2",
          familyId: "fm_s2",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
          sourceSlot: "S2",
        }),
      ]
    );
    const r = runNormalizedLocalMemberSearch({ query: { balls: ballsP } });
    expect(r.kind).toBe("match");
    if (r.kind !== "match") return;
    expect(r.record.strategies.S1?.signature.systemId).toBe("5_half_system");
    expect(r.record.strategies.S2?.signature.systemId).toBe("5_half_system");
    expect(r.record.strategies.S1?.hpT).toEqual({ T: "-1/8" });
    expect(r.record.strategies.S2?.hpT).toEqual({ T: "+5/8" });
    expect(r.record.strategies.S1?.corrections?.slide).toBe(1);
    expect(r.record.strategies.S2?.corrections?.slide).toBe(9);
  });
});

describe("Phase C Near Search + hydration identity", () => {
  it("CASE 14–18: near Position uses same euclidean coarse gate; S1/S2/S3 same distance preserved", () => {
    commitMastersMembers(
      [master("fm_n1"), master("fm_n2")],
      [
        member({
          memberId: "mb_n1",
          familyId: "fm_n1",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
          sourceSlot: "S1",
          balls: ballsP,
        }),
        member({
          memberId: "mb_n2",
          familyId: "fm_n2",
          memberOrigin: "AUTHORED",
          track: "B2T_R",
          sourceSlot: "S2",
          balls: ballsP,
        }),
        member({
          memberId: "mb_q",
          familyId: "fm_n1",
          memberOrigin: "SYMMETRY",
          track: "B2T_R",
          sourceSlot: "S1",
          balls: ballsQ,
          symmetryOp: "H",
          generatedFromMemberId: "mb_n1",
        }),
      ]
    );
    const r = runNormalizedLocalMemberSearch({
      query: { balls: ballsNear },
      profile: "adminSearch",
    });
    expect(r.kind).toBe("match");
    if (r.kind !== "match") return;
    expect(r.distance).toBeGreaterThan(0);
    expect(r.meta.strategySlots).toContain("S1");
    expect(r.meta.strategySlots).toContain("S2");
    expect(r.hits.filter((h) => h.positionId === r.positionId).length).toBeGreaterThanOrEqual(
      2
    );
  });

  it("CASE 19–28: S1 Master A vs S2 Master B — no cross contamination", () => {
    commitMastersMembers(
      [
        master("fm_a", {
          sysInputs: { CO_f: 11 },
          ai: { text: "A" },
          str: { speed: 1 },
          hpT: { T: "1/8" },
          corrections: { slide: 1, curve_ratio: 0, draw: 0, departure: 0, spin: 0 },
        }),
        master("fm_b", {
          sysInputs: { CO_f: 22 },
          ai: { text: "B" },
          str: { speed: 9 },
          hpT: { T: "7/8" },
          corrections: { slide: 7, curve_ratio: 0, draw: 0, departure: 0, spin: 0 },
        }),
      ],
      [
        member({
          memberId: "mb_a",
          familyId: "fm_a",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
          sourceSlot: "S1",
        }),
        member({
          memberId: "mb_b",
          familyId: "fm_b",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
          sourceSlot: "S2",
        }),
      ]
    );
    const r = runNormalizedLocalMemberSearch({ query: { balls: ballsP } });
    expect(r.kind).toBe("match");
    if (r.kind !== "match") return;
    expect(r.record.strategies.S1?.sysInputs.CO_f).toBe(11);
    expect(r.record.strategies.S2?.sysInputs.CO_f).toBe(22);
    expect(r.record.strategies.S1?.ai).toEqual({ text: "A" });
    expect(r.record.strategies.S2?.ai).toEqual({ text: "B" });
    expect(r.record.strategies.S1?.str).toEqual({ speed: 1 });
    expect(r.record.strategies.S2?.str).toEqual({ speed: 9 });
    expect(r.record.strategies.S1?.meta).toBeTruthy();
    expect(r.record.strategies.S2?.meta).toBeTruthy();
  });

  it("CASE 29–36: Derived origins searchable with provenance", () => {
    commitMastersMembers(
      [master("fm_d")],
      [
        member({
          memberId: "mb_auth",
          familyId: "fm_d",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
          sourceSlot: "S1",
          balls: ballsP,
        }),
        member({
          memberId: "mb_sym",
          familyId: "fm_d",
          memberOrigin: "SYMMETRY",
          track: "B2T_R",
          sourceSlot: "S1",
          balls: ballsQ,
          symmetryOp: "V",
          generatedFromMemberId: "mb_auth",
        }),
        member({
          memberId: "mb_cue",
          familyId: "fm_d",
          memberOrigin: "DERIVED_CUE_IMPACT",
          track: "B2T_L",
          sourceSlot: "S2",
          balls: {
            cue: { x: 12, y: 10 },
            target: { x: 40, y: 20 },
            second: { x: 60, y: 15 },
          },
          generatedFromMemberId: "mb_auth",
          derivedRule: "CUE_IMPACT_FIRST_30PCT",
          derivedStep: "cue_impact:t:0.300000",
        }),
      ]
    );
    const authored = runNormalizedLocalMemberSearch({ query: { balls: ballsP } });
    expect(authored.kind).toBe("match");
    if (authored.kind === "match") {
      expect(authored.hits.some((h) => h.memberOrigin === "AUTHORED")).toBe(true);
    }
    const sym = runNormalizedLocalMemberSearch({ query: { balls: ballsQ } });
    expect(sym.kind).toBe("match");
    if (sym.kind === "match") {
      const hit = sym.hits.find((h) => h.memberId === "mb_sym");
      expect(hit?.memberOrigin).toBe("SYMMETRY");
      expect(hit?.track).toBe("B2T_R");
      expect(sym.record.strategies.S1?.generatedFromMemberId).toBe("mb_auth");
    }
  });

  it("CASE 37–42: selected slot maps to exact familyId/memberId/sourceSlot", () => {
    commitMastersMembers(
      [master("fm_a"), master("fm_b")],
      [
        member({
          memberId: "mb_a",
          familyId: "fm_a",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
          sourceSlot: "S1",
        }),
        member({
          memberId: "mb_b",
          familyId: "fm_b",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
          sourceSlot: "S2",
        }),
      ]
    );
    const r = runNormalizedLocalMemberSearch({ query: { balls: ballsP } });
    expect(r.kind).toBe("match");
    if (r.kind !== "match") return;
    const s1 = r.hits.find((h) => h.sourceSlot === "S1")!;
    const s2 = r.hits.find((h) => h.sourceSlot === "S2")!;
    expect(s1.familyId).toBe("fm_a");
    expect(s1.memberId).toBe("mb_a");
    expect(s2.familyId).toBe("fm_b");
    expect(s2.memberId).toBe("mb_b");
    // positionId alone does not collapse Families
    expect(s1.positionId).toBe(s2.positionId);
    expect(s1.familyId).not.toBe(s2.familyId);
  });
});

describe("Phase C wiring source markers", () => {
  it("adminLocalDbFlow reads normalized Member search (no positions_dataset authority)", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const here = dirname(fileURLToPath(import.meta.url));
    const src = readFileSync(
      join(here, "../../application/flows/adminLocalDbFlow.ts"),
      "utf8"
    );
    expect(src).toContain("runNormalizedLocalMemberSearch");
    expect(src).toContain('readSource: "normalized_dataset"');
    expect(src).not.toContain("runSpatialRecall(");
  });

  it("schemaVersion remains 3 (no bump for Phase C)", () => {
    expect(NORMALIZED_DATASET_SCHEMA_VERSION).toBe(3);
  });
});
