/**
 * Phase D-2 — publishedLeafPrepare + reader adapter cutover contracts.
 *
 * Run: npx vitest run src/domain/publishedLeafPrepare.contract.test.ts
 */
import { describe, expect, it } from "vitest";
import { createPositionId } from "./positionId";
import type { Ball3, PositionRecord, StrategyEntry } from "./positionSearchEngine";
import {
  NORMALIZED_DATASET_SCHEMA_VERSION,
  parseNormalizedDatasetEnvelope,
} from "./dataset/normalizedDatasetEnvelope";
import { parsePublishedLeafPayload } from "./datasetLoader";
import {
  convertFlatDatasetExportToNormalizedLeaf,
  detectPublishedLeafKind,
  prepareNormalizedPublishCandidate,
} from "./publishedLeafPrepare";
import type { DatasetExportPayload } from "./datasetExport";
import type { PublishOperation } from "./publishOperation";
import type { PublishFamilyPayload } from "./publishFamilyPayload";
import { isNormalizedDataset } from "./dataset/normalizedDatasetEnvelope";
import { rematerializePublishedLeafForRi } from "./realInterpolation/rematerializePublishedLeafForRi";

const LEAF_META = {
  shotType: "뒤돌리기",
  systemId: "5_half_system",
  systemLabel: "파이브앤하프",
};

const FM_A = "fm_d2_aaaa-0000-4000-8000-00000000000a";
const FM_B = "fm_d2_bbbb-0000-4000-8000-00000000000b";

const ballsP1: Ball3 = {
  cue: { x: 10, y: 10 },
  target: { x: 50, y: 25 },
  second: { x: 40, y: 20 },
};
const ballsP2: Ball3 = {
  cue: { x: 12, y: 12 },
  target: { x: 52, y: 27 },
  second: { x: 42, y: 22 },
};

function entry(
  slot: "S1" | "S2" | "S3",
  opts: {
    familyId: string;
    memberId: string;
    marker?: string;
  }
): StrategyEntry {
  return {
    slot,
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: 40, C1_f: 10, C3_r: 20 },
    corrections: {
      departure: 0,
      spin: 0,
      slide: 1,
      draw: 0,
      curve_ratio: 0,
    },
    correctionsStored: true,
    meta: {
      impact: { x: 1, y: 1 },
      final: { x: 2, y: 2 },
      angle_ci: 0,
      angle_fs: 0,
    },
    ai: { text: opts.marker ?? "lesson" },
    str: { speed: 2.5 },
    hpT: {
      T: "-5/8",
      hit_point: { x: -1, y: 2 },
      mode: "TIP",
      tipCount: 1,
    },
    authoringStrategyId: `as_${opts.memberId}`,
    familyId: opts.familyId,
    memberId: opts.memberId,
    memberOrigin: "AUTHORED",
    track: "B2T_L",
  };
}

function position(
  balls: Ball3,
  slots: Partial<Record<"S1" | "S2" | "S3", StrategyEntry>>
): PositionRecord {
  return {
    positionId: createPositionId(balls),
    balls,
    strategies: slots,
    schemaVersion: 1,
  };
}

function flatLeaf(records: PositionRecord[]): DatasetExportPayload {
  return {
    schemaVersion: 2,
    shotType: "뒤돌리기",
    systemId: "5_half_system",
    systemLabel: "파이브앤하프",
    exportedAt: "2026-09-22T00:00:00.000Z",
    records,
  };
}

function payload(
  familyId: string,
  records: PositionRecord[]
): PublishFamilyPayload {
  return { schemaVersion: 1, familyId, records };
}

function op(
  intent: "CREATE" | "UPDATE",
  destinationFamilyId: string,
  sourceFamilyId: string | null = intent === "UPDATE" ? destinationFamilyId : null
): PublishOperation {
  return {
    schemaVersion: 1,
    intent,
    sourceFamilyId,
    destinationFamilyId,
  };
}

describe("Phase D-2 publishedLeafPrepare", () => {
  it("detects absent / v2 / v3 / invalid", () => {
    expect(detectPublishedLeafKind(null)).toBe("absent");
    expect(
      detectPublishedLeafKind(
        flatLeaf([
          position(ballsP1, {
            S1: entry("S1", { familyId: FM_A, memberId: "mb_a1" }),
          }),
        ])
      )
    ).toBe("v2");
    const converted = convertFlatDatasetExportToNormalizedLeaf(
      flatLeaf([
        position(ballsP1, {
          S1: entry("S1", { familyId: FM_A, memberId: "mb_a1" }),
        }),
      ])
    );
    expect(converted.ok).toBe(true);
    if (!converted.ok) return;
    expect(detectPublishedLeafKind(converted.envelope)).toBe("v3");
    expect(detectPublishedLeafKind([])).toBe("invalid");
  });

  it("v2 → v3 CREATE preserves unrelated Families", () => {
    const existing = flatLeaf([
      position(ballsP1, {
        S1: entry("S1", { familyId: FM_A, memberId: "mb_a1", marker: "keep" }),
      }),
    ]);
    const prepared = prepareNormalizedPublishCandidate({
      existingRaw: existing,
      operation: op("CREATE", FM_B),
      payload: payload(FM_B, [
        position(ballsP2, {
          S1: entry("S1", { familyId: FM_B, memberId: "mb_b1", marker: "new" }),
        }),
      ]),
      leafMeta: LEAF_META,
    });
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.existingKind).toBe("v2");
    expect(prepared.candidate.schemaVersion).toBe(
      NORMALIZED_DATASET_SCHEMA_VERSION
    );
    expect(prepared.candidate.familyMasters.map((m) => m.familyId).sort()).toEqual(
      [FM_A, FM_B].sort()
    );
  });

  it("invalid v2 with non-migratable legacy slots → BLOCK", () => {
    const legacy: DatasetExportPayload = {
      schemaVersion: 2,
      shotType: "뒤돌리기",
      systemId: "5_half_system",
      systemLabel: "파이브앤하프",
      exportedAt: "2026-09-22T00:00:00.000Z",
      records: [
        {
          positionId: createPositionId(ballsP1),
          balls: ballsP1,
          schemaVersion: 1,
          strategies: {
            S1: {
              slot: "S1",
              signature: {
                systemId: "5_half_system",
                formulaHash: "h1",
                shotType: "뒤돌리기",
              },
              sysInputs: { CO_f: 40 },
              // missing family identity → skippedLegacySlots
              track: "B2T_L",
              meta: {
                impact: { x: 0, y: 0 },
                final: { x: 0, y: 0 },
                angle_ci: 0,
                angle_fs: 0,
              },
            },
          },
        },
      ],
    };
    const converted = convertFlatDatasetExportToNormalizedLeaf(legacy);
    expect(converted.ok).toBe(false);
    if (converted.ok) return;
    expect(converted.code).toBe("V2_CONVERSION_FAILED");
  });

  it("C-0 collision on CREATE after v2 convert → RESOLVABLE_PUBLISH_OVERWRITE", () => {
    const existing = flatLeaf([
      position(ballsP1, {
        S1: entry("S1", { familyId: FM_A, memberId: "mb_a1" }),
      }),
    ]);
    const prepared = prepareNormalizedPublishCandidate({
      existingRaw: existing,
      operation: op("CREATE", FM_B),
      payload: payload(FM_B, [
        position(ballsP1, {
          S1: entry("S1", { familyId: FM_B, memberId: "mb_b1" }),
        }),
      ]),
      leafMeta: LEAF_META,
      leafRevision: "rev-test",
    });
    expect(prepared.ok).toBe(false);
    if (prepared.ok) return;
    expect(prepared.code).toBe("RESOLVABLE_PUBLISH_OVERWRITE");
    expect(prepared.conflict?.existingFamilyId).toBe(FM_A);
    expect(prepared.conflict?.incomingFamilyId).toBe(FM_B);
  });

  it("native v3 → v3 UPDATE path (no flat rematerialize)", () => {
    const first = prepareNormalizedPublishCandidate({
      existingRaw: null,
      operation: op("CREATE", FM_A),
      payload: payload(FM_A, [
        position(ballsP1, {
          S1: entry("S1", { familyId: FM_A, memberId: "mb_a1", marker: "v1" }),
        }),
      ]),
      leafMeta: LEAF_META,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    const updated = prepareNormalizedPublishCandidate({
      existingRaw: first.candidate,
      operation: op("UPDATE", FM_A, FM_A),
      payload: payload(FM_A, [
        position(ballsP2, {
          S1: entry("S1", { familyId: FM_A, memberId: "mb_a1", marker: "v2" }),
        }),
      ]),
      leafMeta: LEAF_META,
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    expect(updated.existingKind).toBe("v3");
    expect(updated.candidate.familyMasters[0]!.ai).toEqual({ text: "v2" });
  });
});

describe("Phase D-2 Published reader adapter", () => {
  it("v2 leaf loads as normalized Members/Masters (no eager records)", () => {
    const raw = flatLeaf([
      position(ballsP1, {
        S1: entry("S1", { familyId: FM_A, memberId: "mb_a1", marker: "flat" }),
      }),
    ]);
    const result = parsePublishedLeafPayload(raw, "/dataset/x/positions.json");
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect("records" in result).toBe(false);
    expect(result.familyMembers[0]!.familyId).toBe(FM_A);
    expect(result.masterByFamilyId.get(FM_A)?.ai).toEqual({ text: "flat" });
    expect(result.sourceSchemaVersion).toBe(2);
  });

  it("v3 leaf loads normalized; on-demand rematerialize yields PositionRecord[]", () => {
    const converted = convertFlatDatasetExportToNormalizedLeaf(
      flatLeaf([
        position(ballsP1, {
          S1: entry("S1", {
            familyId: FM_A,
            memberId: "mb_a1",
            marker: "norm",
          }),
        }),
      ])
    );
    expect(converted.ok).toBe(true);
    if (!converted.ok) return;
    expect(isNormalizedDataset(converted.envelope)).toBe(true);
    const result = parsePublishedLeafPayload(
      converted.envelope,
      "/dataset/x/positions.json"
    );
    expect(result.kind).toBe("ok");
    if (result.kind !== "ok") return;
    expect("records" in result).toBe(false);
    expect(result.familyMembers[0]!.memberId).toBe("mb_a1");
    expect(result.familyMembers[0]!.track).toBe("B2T_L");
    expect(result.masterByFamilyId.get(FM_A)?.ai).toEqual({ text: "norm" });
    expect(result.masterByFamilyId.get(FM_A)?.sysInputs?.CO_f).toBe(40);

    const remat = rematerializePublishedLeafForRi({
      familyMasters: result.familyMasters,
      familyMembers: result.familyMembers,
    });
    expect(remat.ok).toBe(true);
    if (!remat.ok) return;
    expect(remat.records[0]!.strategies.S1!.familyId).toBe(FM_A);
    expect(remat.records[0]!.strategies.S1!.memberId).toBe("mb_a1");
    expect(remat.records[0]!.strategies.S1!.ai).toEqual({ text: "norm" });
    expect(remat.records[0]!.strategies.S1!.sysInputs?.CO_f).toBe(40);
    expect(remat.records[0]!.strategies.S1!.track).toBe("B2T_L");
  });

  it("invalid v3 fails closed (no flat fallback)", () => {
    const raw = {
      schemaVersion: 3,
      shotType: "뒤돌리기",
      systemId: "5_half_system",
      systemLabel: "파이브앤하프",
      familyMasters: [],
      familyMembers: [
        {
          schemaVersion: 2,
          memberId: "mb_orphan",
          familyId: FM_A,
          balls: ballsP1,
          track: "B2T_L",
          memberOrigin: "AUTHORED",
          sourceSlot: "S1",
        },
      ],
      // orphan member without master — invalid
    };
    expect(parseNormalizedDatasetEnvelope(raw).ok).toBe(false);
    const result = parsePublishedLeafPayload(raw, "/x");
    expect(result.kind).toBe("error");
  });

  it("Manual Export downgrade guard: isNormalizedDataset detects v3", () => {
    const converted = convertFlatDatasetExportToNormalizedLeaf(
      flatLeaf([
        position(ballsP1, {
          S1: entry("S1", { familyId: FM_A, memberId: "mb_a1" }),
        }),
      ])
    );
    expect(converted.ok).toBe(true);
    if (!converted.ok) return;
    expect(isNormalizedDataset(converted.envelope)).toBe(true);
    expect(isNormalizedDataset(flatLeaf([]))).toBe(false);
  });
});
