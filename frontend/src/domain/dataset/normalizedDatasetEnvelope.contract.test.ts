/**
 * Phase A — Canonical Normalized Dataset Envelope + Validator contracts.
 *
 * Run: npx vitest run src/domain/dataset/normalizedDatasetEnvelope.contract.test.ts
 */
import { describe, expect, it } from "vitest";
import { DATASET_EXPORT_SCHEMA_VERSION } from "../datasetPath";
import {
  FAMILY_NORMALIZED_SCHEMA_VERSION,
  type FamilyMaster,
  type FamilyMember,
} from "../family/familyNormalizedSchema";
import {
  composeNormalizedDatasetEnvelope,
  decomposeNormalizedDatasetEnvelope,
  familyMasterCommonFingerprint,
  isFlatLegacyDataset,
  isNormalizedDataset,
  NORMALIZED_DATASET_SCHEMA_VERSION,
  parseNormalizedDatasetEnvelope,
  type NormalizedDatasetEnvelope,
} from "./normalizedDatasetEnvelope";

const signature = {
  systemId: "5_half_system",
  formulaHash: "h1",
  shotType: "뒤돌리기",
};

const sysInputs = { CO_f: 30, C1_f: 10, C3_r: 20 };

const ballsP = {
  cue: { x: 12, y: 10 },
  target: { x: 40, y: 20 },
  second: { x: 60, y: 14 },
};

function master(
  familyId: string,
  overrides: Partial<FamilyMaster> = {}
): FamilyMaster {
  return {
    schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
    familyId,
    signature,
    sysInputs,
    corrections: {
      slide: 1,
      curve_ratio: 0,
      draw: 0,
      departure: 0,
      spin: 0,
    },
    correctionsStored: true,
    ai: { text: "lesson" },
    str: { speed: 2.5 },
    hpT: { T: "-5/8", hit_point: { x: -1, y: 2 }, mode: "TIP", tipCount: 1 },
    ...overrides,
  };
}

function member(
  overrides: Partial<FamilyMember> &
    Pick<FamilyMember, "memberId" | "familyId" | "memberOrigin" | "track">
): FamilyMember {
  return {
    schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
    balls: { ...ballsP, cue: { ...ballsP.cue }, target: { ...ballsP.target }, second: { ...ballsP.second } },
    sourceSlot: "S1",
    authoringStrategyId: "as_1",
    ...overrides,
  };
}

function envelope(
  masters: FamilyMaster[],
  members: FamilyMember[],
  extra: Record<string, unknown> = {}
): Record<string, unknown> {
  return {
    schemaVersion: NORMALIZED_DATASET_SCHEMA_VERSION,
    shotType: "뒤돌리기",
    systemId: "5_half_system",
    systemLabel: "파이브앤하프",
    exportedAt: "2026-09-21T00:00:00.000Z",
    familyMasters: masters,
    familyMembers: members,
    ...extra,
  };
}

function expectFailCode(
  raw: unknown,
  code: string
): void {
  const result = parseNormalizedDatasetEnvelope(raw);
  expect(result.ok).toBe(false);
  if (result.ok) return;
  expect(result.issues.some((i) => i.code === code)).toBe(true);
}

describe("Phase A normalized dataset envelope", () => {
  it("CASE 1: minimal valid normalized envelope → PASS", () => {
    const raw = envelope(
      [master("fm_a1b2c3d4-0000-4000-8000-000000000001")],
      [
        member({
          memberId: "mb_a1b2c3d4-0000-4000-8000-000000000001",
          familyId: "fm_a1b2c3d4-0000-4000-8000-000000000001",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
        }),
      ]
    );
    expect(isNormalizedDataset(raw)).toBe(true);
    const parsed = parseNormalizedDatasetEnvelope(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.envelope.familyMasters).toHaveLength(1);
    expect(parsed.envelope.familyMembers).toHaveLength(1);
    expect(parsed.envelope.schemaVersion).toBe(3);
  });

  it("CASE 2: multiple Families → PASS", () => {
    const raw = envelope(
      [
        master("fm_a1b2c3d4-0000-4000-8000-000000000001"),
        master("fm_a1b2c3d4-0000-4000-8000-000000000002", {
          ai: { text: "other" },
        }),
      ],
      [
        member({
          memberId: "mb_a1b2c3d4-0000-4000-8000-000000000001",
          familyId: "fm_a1b2c3d4-0000-4000-8000-000000000001",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
        }),
        member({
          memberId: "mb_a1b2c3d4-0000-4000-8000-000000000002",
          familyId: "fm_a1b2c3d4-0000-4000-8000-000000000002",
          memberOrigin: "AUTHORED",
          track: "B2T_R",
          balls: {
            cue: { x: 20, y: 10 },
            target: { x: 40, y: 20 },
            second: { x: 60, y: 14 },
          },
        }),
      ]
    );
    const parsed = parseNormalizedDatasetEnvelope(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.envelope.familyMasters).toHaveLength(2);
  });

  it("CASE 3: one Family + many Members → PASS", () => {
    const fid = "fm_a1b2c3d4-0000-4000-8000-000000000001";
    const authoredId = "mb_a1b2c3d4-0000-4000-8000-000000000001";
    const raw = envelope(
      [master(fid)],
      [
        member({
          memberId: authoredId,
          familyId: fid,
          memberOrigin: "AUTHORED",
          track: "B2T_L",
        }),
        member({
          memberId: "mb_a1b2c3d4-0000-4000-8000-000000000010",
          familyId: fid,
          memberOrigin: "SYMMETRY",
          track: "B2T_R",
          symmetryOp: "H",
          generatedFromMemberId: authoredId,
          balls: {
            cue: { x: 68, y: 10 },
            target: { x: 40, y: 20 },
            second: { x: 20, y: 14 },
          },
        }),
        member({
          memberId: "mb_a1b2c3d4-0000-4000-8000-000000000011",
          familyId: fid,
          memberOrigin: "DERIVED_CUE_IMPACT",
          track: "B2T_L",
          generatedFromMemberId: authoredId,
          derivedRule: "CUE_IMPACT_FIRST_30PCT",
          derivedStep: "cue_impact:t:0.100000",
          balls: {
            cue: { x: 14, y: 10 },
            target: { x: 40, y: 20 },
            second: { x: 60, y: 14 },
          },
        }),
      ]
    );
    expect(parseNormalizedDatasetEnvelope(raw).ok).toBe(true);
  });

  it("CASE 4: same Position + same sourceSlot across different Families → PASS", () => {
    const raw = envelope(
      [
        master("fm_a1b2c3d4-0000-4000-8000-000000000001"),
        master("fm_a1b2c3d4-0000-4000-8000-000000000002"),
      ],
      [
        member({
          memberId: "mb_a1b2c3d4-0000-4000-8000-000000000001",
          familyId: "fm_a1b2c3d4-0000-4000-8000-000000000001",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
          sourceSlot: "S1",
          balls: ballsP,
        }),
        member({
          memberId: "mb_a1b2c3d4-0000-4000-8000-000000000002",
          familyId: "fm_a1b2c3d4-0000-4000-8000-000000000002",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
          sourceSlot: "S1",
          balls: ballsP,
        }),
      ]
    );
    const parsed = parseNormalizedDatasetEnvelope(raw);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.envelope.familyMembers[0]!.balls).toEqual(
      parsed.envelope.familyMembers[1]!.balls
    );
    expect(parsed.envelope.familyMembers[0]!.sourceSlot).toBe("S1");
    expect(parsed.envelope.familyMembers[1]!.sourceSlot).toBe("S1");
  });

  it("CASE 5: duplicate familyId → FAIL", () => {
    const fid = "fm_a1b2c3d4-0000-4000-8000-000000000001";
    expectFailCode(
      envelope(
        [master(fid), master(fid)],
        [
          member({
            memberId: "mb_a1b2c3d4-0000-4000-8000-000000000001",
            familyId: fid,
            memberOrigin: "AUTHORED",
            track: "B2T_L",
          }),
        ]
      ),
      "DUPLICATE_FAMILY_ID"
    );
  });

  it("CASE 6: duplicate memberId → FAIL", () => {
    const mid = "mb_a1b2c3d4-0000-4000-8000-000000000001";
    expectFailCode(
      envelope(
        [
          master("fm_a1b2c3d4-0000-4000-8000-000000000001"),
          master("fm_a1b2c3d4-0000-4000-8000-000000000002"),
        ],
        [
          member({
            memberId: mid,
            familyId: "fm_a1b2c3d4-0000-4000-8000-000000000001",
            memberOrigin: "AUTHORED",
            track: "B2T_L",
          }),
          member({
            memberId: mid,
            familyId: "fm_a1b2c3d4-0000-4000-8000-000000000002",
            memberOrigin: "AUTHORED",
            track: "B2T_R",
          }),
        ]
      ),
      "DUPLICATE_MEMBER_ID"
    );
  });

  it("CASE 7: orphan Member familyId → FAIL", () => {
    expectFailCode(
      envelope(
        [master("fm_a1b2c3d4-0000-4000-8000-000000000001")],
        [
          member({
            memberId: "mb_a1b2c3d4-0000-4000-8000-000000000099",
            familyId: "fm_a1b2c3d4-0000-4000-8000-000000000099",
            memberOrigin: "AUTHORED",
            track: "B2T_L",
          }),
        ]
      ),
      "ORPHAN_MEMBER"
    );
  });

  it.each([
    ["signature", { signature }, "CASE 8"],
    ["sysInputs", { sysInputs }, "CASE 9"],
    ["corrections", { corrections: { slide: 1 } }, "CASE 10"],
    ["ai", { ai: { text: "x" } }, "CASE 11"],
    ["str", { str: { speed: 1 } }, "CASE 12"],
    ["hpT", { hpT: { T: "8/8" } }, "CASE 13"],
  ] as const)(
    "%s Member common payload → FAIL (%s)",
    (field, extra) => {
      const fid = "fm_a1b2c3d4-0000-4000-8000-000000000001";
      const dirty = {
        ...member({
          memberId: "mb_a1b2c3d4-0000-4000-8000-000000000001",
          familyId: fid,
          memberOrigin: "AUTHORED",
          track: "B2T_L",
        }),
        ...extra,
      };
      expectFailCode(
        envelope([master(fid)], [dirty as FamilyMember]),
        "FORBIDDEN_MEMBER_COMMON_PAYLOAD"
      );
      void field;
    }
  );

  it("CASE 14: invalid balls → FAIL", () => {
    const fid = "fm_a1b2c3d4-0000-4000-8000-000000000001";
    const bad = member({
      memberId: "mb_a1b2c3d4-0000-4000-8000-000000000001",
      familyId: fid,
      memberOrigin: "AUTHORED",
      track: "B2T_L",
    });
    (bad as { balls: unknown }).balls = { cue: { x: 1, y: 1 } };
    expectFailCode(envelope([master(fid)], [bad]), "INVALID_BALLS");
  });

  it("CASE 15: invalid track → FAIL", () => {
    const fid = "fm_a1b2c3d4-0000-4000-8000-000000000001";
    expectFailCode(
      envelope(
        [master(fid)],
        [
          member({
            memberId: "mb_a1b2c3d4-0000-4000-8000-000000000001",
            familyId: fid,
            memberOrigin: "AUTHORED",
            track: "NOT_A_TRACK",
          }),
        ]
      ),
      "INVALID_TRACK"
    );
  });

  it("CASE 16: invalid sourceSlot → FAIL", () => {
    const fid = "fm_a1b2c3d4-0000-4000-8000-000000000001";
    const bad = member({
      memberId: "mb_a1b2c3d4-0000-4000-8000-000000000001",
      familyId: fid,
      memberOrigin: "AUTHORED",
      track: "B2T_L",
    });
    (bad as { sourceSlot: unknown }).sourceSlot = "S9";
    expectFailCode(envelope([master(fid)], [bad]), "INVALID_SOURCE_SLOT");
  });

  it("CASE 17: duplicate logical Member within same Family → FAIL", () => {
    const fid = "fm_a1b2c3d4-0000-4000-8000-000000000001";
    expectFailCode(
      envelope(
        [master(fid)],
        [
          member({
            memberId: "mb_a1b2c3d4-0000-4000-8000-000000000001",
            familyId: fid,
            memberOrigin: "AUTHORED",
            track: "B2T_L",
          }),
          member({
            memberId: "mb_a1b2c3d4-0000-4000-8000-000000000002",
            familyId: fid,
            memberOrigin: "AUTHORED",
            track: "B2T_R",
          }),
        ]
      ),
      "DUPLICATE_LOGICAL_MEMBER"
    );
  });

  it("CASE 18: same spatial Member across different Families → PASS", () => {
    // Same as CASE 4 — family-scoped identity only
    const raw = envelope(
      [
        master("fm_a1b2c3d4-0000-4000-8000-000000000001"),
        master("fm_a1b2c3d4-0000-4000-8000-000000000002"),
      ],
      [
        member({
          memberId: "mb_a1b2c3d4-0000-4000-8000-000000000001",
          familyId: "fm_a1b2c3d4-0000-4000-8000-000000000001",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
          sourceSlot: "S1",
        }),
        member({
          memberId: "mb_a1b2c3d4-0000-4000-8000-000000000002",
          familyId: "fm_a1b2c3d4-0000-4000-8000-000000000002",
          memberOrigin: "AUTHORED",
          track: "B2T_L",
          sourceSlot: "S1",
        }),
      ]
    );
    expect(parseNormalizedDatasetEnvelope(raw).ok).toBe(true);
  });

  it("CASE 19: JSON serialization round trip → PASS", () => {
    const fid = "fm_a1b2c3d4-0000-4000-8000-000000000001";
    const authoredId = "mb_a1b2c3d4-0000-4000-8000-000000000001";
    const raw = envelope(
      [master(fid)],
      [
        member({
          memberId: authoredId,
          familyId: fid,
          memberOrigin: "AUTHORED",
          track: "B2T_L",
        }),
        member({
          memberId: "mb_a1b2c3d4-0000-4000-8000-000000000010",
          familyId: fid,
          memberOrigin: "SYMMETRY",
          track: "B2T_R",
          symmetryOp: "V",
          generatedFromMemberId: authoredId,
          balls: {
            cue: { x: 12, y: 30 },
            target: { x: 40, y: 20 },
            second: { x: 60, y: 26 },
          },
        }),
      ]
    );
    const first = parseNormalizedDatasetEnvelope(raw);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const json = JSON.stringify(first.envelope);
    const second = parseNormalizedDatasetEnvelope(JSON.parse(json));
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(second.envelope).toEqual(first.envelope);
    // Master common payload once; Members have no forbidden keys
    expect(second.envelope.familyMasters).toHaveLength(1);
    const fp = familyMasterCommonFingerprint(second.envelope.familyMasters[0]!);
    expect(fp).toContain("lesson");
    for (const m of second.envelope.familyMembers) {
      expect(m).not.toHaveProperty("signature");
      expect(m).not.toHaveProperty("sysInputs");
      expect(m).not.toHaveProperty("ai");
      expect(m).not.toHaveProperty("hpT");
    }
  });

  it("CASE 20: flat legacy records[] → FAIL as normalized (no silent migration)", () => {
    const flat = {
      schemaVersion: DATASET_EXPORT_SCHEMA_VERSION,
      shotType: "뒤돌리기",
      systemId: "5_half_system",
      systemLabel: "파이브앤하프",
      exportedAt: "2026-09-21T00:00:00.000Z",
      records: [],
    };
    expect(isFlatLegacyDataset(flat)).toBe(true);
    expect(isNormalizedDataset(flat)).toBe(false);
    expectFailCode(flat, "LEGACY_FLAT_SHAPE");
  });

  it("compose from shadow envelopes + decompose round-trip", () => {
    const fid = "fm_a1b2c3d4-0000-4000-8000-000000000001";
    const mid = "mb_a1b2c3d4-0000-4000-8000-000000000001";
    const composed = composeNormalizedDatasetEnvelope({
      shotType: "뒤돌리기",
      systemId: "5_half_system",
      masters: {
        schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
        masters: { [fid]: master(fid) },
      },
      members: {
        schemaVersion: FAMILY_NORMALIZED_SCHEMA_VERSION,
        members: {
          [mid]: member({
            memberId: mid,
            familyId: fid,
            memberOrigin: "AUTHORED",
            track: "B2T_L",
          }),
        },
      },
    });
    const parsed = parseNormalizedDatasetEnvelope(composed);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const parts = decomposeNormalizedDatasetEnvelope(parsed.envelope);
    expect(Object.keys(parts.masters.masters)).toEqual([fid]);
    expect(Object.keys(parts.members.members)).toEqual([mid]);
  });

  it("schemaVersion 3 is distinct from flat export version 2", () => {
    expect(NORMALIZED_DATASET_SCHEMA_VERSION).toBe(3);
    expect(DATASET_EXPORT_SCHEMA_VERSION).toBe(2);
    expect(NORMALIZED_DATASET_SCHEMA_VERSION).not.toBe(
      DATASET_EXPORT_SCHEMA_VERSION
    );
  });

  it("Master without Members → FAIL", () => {
    expectFailCode(
      envelope([master("fm_a1b2c3d4-0000-4000-8000-000000000001")], []),
      "MASTER_WITHOUT_MEMBERS"
    );
  });
});

describe("Normalized envelope is not wired to live export", () => {
  it("DatasetExportPayload type still uses records (compile-time documentation)", () => {
    // Runtime: flat discriminator still recognizes records[]
    expect(
      isFlatLegacyDataset({
        schemaVersion: 2,
        records: [{ positionId: "x", balls: ballsP, strategies: {} }],
      })
    ).toBe(true);
    const typed: NormalizedDatasetEnvelope | null = null;
    expect(typed).toBeNull();
  });
});
