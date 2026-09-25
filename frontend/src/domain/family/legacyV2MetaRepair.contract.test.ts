/**
 * Phase F-2B — legacy v2 migration-boundary meta repair contracts.
 * Never writes real repo dataset/** files.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it } from "vitest";
import { normalizeDatasetExport } from "../datasetExport";
import type { DatasetExportPayload } from "../datasetExport";
import { createPositionId } from "../positionId";
import type { Ball3, PositionRecord, StrategyEntry } from "../positionSearchEngine";
import { validatePublishedExportCandidate } from "../publishedFamilyPublish";
import {
  convertFlatDatasetExportToNormalizedLeaf,
  prepareNormalizedPublishCandidate,
} from "../publishedLeafPrepare";
import type { PublishFamilyPayload } from "../publishFamilyPayload";
import type { PublishOperation } from "../publishOperation";
import { bindDomainContractSupply } from "../runtimeContractSupply";
import { CUE_C3_PRODUCT_MEMBER_ORIGIN } from "./buildCueC3ProductMembers";
import { C3_PLUS_MEMBER_ORIGIN } from "./generateC3PlusScoringDerivedMembers";
import { CUE_IMPACT_MEMBER_ORIGIN } from "./generateCueImpactDerivedMembers";
import {
  countLegacyV2MissingMeta,
  repairLegacyV2MissingMeta,
} from "./legacyV2MetaRepair";

beforeAll(() => {
  const systemsRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../data/systems/5_half_system"
  );
  const profile = JSON.parse(
    fs.readFileSync(path.join(systemsRoot, "profile.json"), "utf8")
  ) as { formula?: { expr?: string; hash?: string } };
  const anchors = JSON.parse(
    fs.readFileSync(path.join(systemsRoot, "anchors.json"), "utf8")
  ) as { trajectories?: Record<string, { anchors: { id: string }[] }> };
  bindDomainContractSupply({
    getFormulaExpr: (systemId) =>
      systemId === "5_half_system" ? profile.formula?.expr ?? null : null,
    getFormulaHash: (systemId) =>
      systemId === "5_half_system"
        ? String(profile.formula?.hash ?? "h1")
        : "v1",
    getAnchorsData: (systemId) =>
      systemId === "5_half_system" ? anchors : undefined,
  });
});

const CORRECTIONS = {
  departure: 0,
  spin: 0,
  slide: 0,
  draw: 0,
  curve_ratio: 0,
};

const ballsA: Ball3 = {
  cue: { x: 10, y: 10 },
  target: { x: 50, y: 25 },
  second: { x: 40, y: 20 },
};
const ballsB: Ball3 = {
  cue: { x: 12, y: 12 },
  target: { x: 52, y: 27 },
  second: { x: 42, y: 22 },
};

function baseEntry(
  slot: "S1" | "S2" | "S3",
  opts: {
    familyId: string;
    memberId: string;
    memberOrigin: string;
    omitMeta?: boolean;
    omitTrack?: boolean;
    track?: string;
  }
): StrategyEntry {
  const entry: StrategyEntry = {
    slot,
    signature: {
      systemId: "5_half_system",
      formulaHash: "h1",
      shotType: "뒤돌리기",
    },
    sysInputs: { CO_f: 40, C1_f: 10, C3_r: 20 },
    corrections: { ...CORRECTIONS },
    correctionsStored: true,
    familyId: opts.familyId,
    memberId: opts.memberId,
    memberOrigin: opts.memberOrigin as StrategyEntry["memberOrigin"],
    track: opts.track ?? "B2T_L",
    hpT: { T: "-5/8", hit_point: { x: -1, y: 2 }, mode: "TIP" },
    meta: {
      impact: { x: 1, y: 1 },
      final: { x: 2, y: 2 },
      angle_ci: 0.1,
      angle_fs: 0.2,
    },
  };
  if (opts.omitMeta) {
    const { meta: _m, ...rest } = entry;
    if (opts.omitTrack) {
      const { track: _t, ...noTrack } = rest;
      return noTrack as StrategyEntry;
    }
    return rest as StrategyEntry;
  }
  if (opts.omitTrack) {
    const { track: _t, ...rest } = entry;
    return rest as StrategyEntry;
  }
  return entry;
}

function envelope(records: PositionRecord[]): DatasetExportPayload {
  return {
    schemaVersion: 2,
    shotType: "뒤돌리기",
    systemId: "5_half_system",
    systemLabel: "파이브앤하프",
    exportedAt: "2026-09-25T00:00:00.000Z",
    records,
  };
}

describe("legacyV2MetaRepair — unit contracts", () => {
  it("A — missing meta + complete inputs → repaired", () => {
    const input = envelope([
      {
        positionId: createPositionId(ballsA),
        balls: ballsA,
        strategies: {
          S1: baseEntry("S1", {
            familyId: "fm_a",
            memberId: "mb_a",
            memberOrigin: CUE_C3_PRODUCT_MEMBER_ORIGIN,
            omitMeta: true,
          }),
        },
        schemaVersion: 1,
      },
    ]);
    const before = JSON.stringify(input);
    const r = repairLegacyV2MissingMeta(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.repairedCount).toBe(1);
    expect(r.payload.records[0]!.strategies.S1!.meta).toBeTruthy();
    expect(r.payload.records[0]!.strategies.S1!.meta!.impact).toBeTruthy();
    expect(JSON.stringify(input)).toBe(before);
  });

  it("B — existing valid meta → unchanged", () => {
    const input = envelope([
      {
        positionId: createPositionId(ballsA),
        balls: ballsA,
        strategies: {
          S1: baseEntry("S1", {
            familyId: "fm_a",
            memberId: "mb_a",
            memberOrigin: "AUTHORED",
          }),
        },
        schemaVersion: 1,
      },
    ]);
    const originalMeta = JSON.parse(
      JSON.stringify(input.records[0]!.strategies.S1!.meta)
    );
    const r = repairLegacyV2MissingMeta(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.repairedCount).toBe(0);
    expect(r.preservedExistingMetaCount).toBe(1);
    expect(r.payload.records[0]!.strategies.S1!.meta).toEqual(originalMeta);
  });

  it("C — missing meta + insufficient inputs → fail closed", () => {
    const input = envelope([
      {
        positionId: createPositionId(ballsA),
        balls: ballsA,
        strategies: {
          S1: baseEntry("S1", {
            familyId: "fm_a",
            memberId: "mb_a",
            memberOrigin: CUE_C3_PRODUCT_MEMBER_ORIGIN,
            omitMeta: true,
            omitTrack: true,
          }),
        },
        schemaVersion: 1,
      },
    ]);
    const r = repairLegacyV2MissingMeta(input);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.reason).toBe("legacy-v2-meta-unrepairable");
    expect(r.issues.some((i) => i.includes("unrepairable-missing-inputs"))).toBe(
      true
    );
    expect(r.issues.some((i) => i.includes("track"))).toBe(true);
  });

  it("D — repair preserves identity fields", () => {
    const input = envelope([
      {
        positionId: "pos_keep",
        balls: ballsA,
        strategies: {
          S1: {
            ...baseEntry("S1", {
              familyId: "fm_keep",
              memberId: "mb_keep",
              memberOrigin: C3_PLUS_MEMBER_ORIGIN,
              omitMeta: true,
            }),
            generatedFromMemberId: "mb_src",
            derivedRule: "C3_PLUS_V1",
            derivedStep: "step1",
          },
        },
        schemaVersion: 1,
      },
    ]);
    const r = repairLegacyV2MissingMeta(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const e = r.payload.records[0]!.strategies.S1!;
    expect(e.familyId).toBe("fm_keep");
    expect(e.memberId).toBe("mb_keep");
    expect(e.track).toBe("B2T_L");
    expect(e.memberOrigin).toBe(C3_PLUS_MEMBER_ORIGIN);
    expect(e.generatedFromMemberId).toBe("mb_src");
    expect(e.sysInputs).toEqual({ CO_f: 40, C1_f: 10, C3_r: 20 });
    expect(r.payload.records[0]!.balls).toEqual(ballsA);
    expect(r.payload.records[0]!.positionId).toBe("pos_keep");
  });

  it("E — input object immutable", () => {
    const input = envelope([
      {
        positionId: createPositionId(ballsA),
        balls: ballsA,
        strategies: {
          S1: baseEntry("S1", {
            familyId: "fm_a",
            memberId: "mb_a",
            memberOrigin: CUE_IMPACT_MEMBER_ORIGIN,
            omitMeta: true,
          }),
        },
        schemaVersion: 1,
      },
    ]);
    const snap = JSON.stringify(input);
    repairLegacyV2MissingMeta(input);
    expect(JSON.stringify(input)).toBe(snap);
    expect(input.records[0]!.strategies.S1!.meta).toBeUndefined();
  });

  it("F — multiple slots preserved", () => {
    const input = envelope([
      {
        positionId: createPositionId(ballsA),
        balls: ballsA,
        strategies: {
          S1: baseEntry("S1", {
            familyId: "fm_s1",
            memberId: "mb_s1",
            memberOrigin: "AUTHORED",
          }),
          S2: baseEntry("S2", {
            familyId: "fm_s2",
            memberId: "mb_s2",
            memberOrigin: CUE_C3_PRODUCT_MEMBER_ORIGIN,
            omitMeta: true,
          }),
        },
        schemaVersion: 1,
      },
    ]);
    const r = repairLegacyV2MissingMeta(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.repairedCount).toBe(1);
    expect(r.payload.records[0]!.strategies.S1!.meta).toBeTruthy();
    expect(r.payload.records[0]!.strategies.S2!.meta).toBeTruthy();
    expect(r.payload.records[0]!.strategies.S1!.familyId).toBe("fm_s1");
    expect(r.payload.records[0]!.strategies.S2!.familyId).toBe("fm_s2");
  });

  it("G — different Families on S1/S2 same Position preserved", () => {
    const input = envelope([
      {
        positionId: createPositionId(ballsA),
        balls: ballsA,
        strategies: {
          S1: baseEntry("S1", {
            familyId: "fm_one",
            memberId: "mb_one",
            memberOrigin: "AUTHORED",
            omitMeta: true,
          }),
          S2: baseEntry("S2", {
            familyId: "fm_two",
            memberId: "mb_two",
            memberOrigin: "SYMMETRY",
            omitMeta: true,
          }),
        },
        schemaVersion: 1,
      },
    ]);
    const r = repairLegacyV2MissingMeta(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.repairedCount).toBe(2);
    expect(r.payload.records[0]!.strategies.S1!.familyId).toBe("fm_one");
    expect(r.payload.records[0]!.strategies.S2!.familyId).toBe("fm_two");
  });

  it("H — same Position+Slot C-0 conflict still fails after repair at convert", () => {
    // Two records same balls / same S1 different Families → C-0 on normalized parse
    const input = envelope([
      {
        positionId: createPositionId(ballsA),
        balls: ballsA,
        strategies: {
          S1: baseEntry("S1", {
            familyId: "fm_x",
            memberId: "mb_x",
            memberOrigin: "AUTHORED",
            omitMeta: true,
          }),
        },
        schemaVersion: 1,
      },
      {
        positionId: createPositionId(ballsA),
        balls: ballsA,
        strategies: {
          S1: baseEntry("S1", {
            familyId: "fm_y",
            memberId: "mb_y",
            memberOrigin: "AUTHORED",
            omitMeta: true,
          }),
        },
        schemaVersion: 1,
      },
    ]);
    const repaired = repairLegacyV2MissingMeta(input);
    expect(repaired.ok).toBe(true);
    const converted = convertFlatDatasetExportToNormalizedLeaf(input);
    expect(converted.ok).toBe(false);
  });

  it("origin coverage — PRODUCT / C3_PLUS / CUE_IMPACT all repairable", () => {
    const input = envelope([
      {
        positionId: createPositionId(ballsA),
        balls: ballsA,
        strategies: {
          S1: baseEntry("S1", {
            familyId: "fm_p",
            memberId: "mb_p",
            memberOrigin: CUE_C3_PRODUCT_MEMBER_ORIGIN,
            omitMeta: true,
          }),
        },
        schemaVersion: 1,
      },
      {
        positionId: createPositionId(ballsB),
        balls: ballsB,
        strategies: {
          S1: baseEntry("S1", {
            familyId: "fm_c3",
            memberId: "mb_c3",
            memberOrigin: C3_PLUS_MEMBER_ORIGIN,
            omitMeta: true,
          }),
        },
        schemaVersion: 1,
      },
      {
        positionId: createPositionId({
          cue: { x: 14, y: 14 },
          target: { x: 54, y: 29 },
          second: { x: 44, y: 24 },
        }),
        balls: {
          cue: { x: 14, y: 14 },
          target: { x: 54, y: 29 },
          second: { x: 44, y: 24 },
        },
        strategies: {
          S1: baseEntry("S1", {
            familyId: "fm_ci",
            memberId: "mb_ci",
            memberOrigin: CUE_IMPACT_MEMBER_ORIGIN,
            omitMeta: true,
          }),
        },
        schemaVersion: 1,
      },
    ]);
    expect(countLegacyV2MissingMeta(input)).toBe(3);
    const r = repairLegacyV2MissingMeta(input);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.repairedCount).toBe(3);
    expect(countLegacyV2MissingMeta(r.payload)).toBe(0);
  });

  it("new flat candidate missing meta still FAILS without repair path", () => {
    const candidate = envelope([
      {
        positionId: createPositionId(ballsA),
        balls: ballsA,
        strategies: {
          S1: baseEntry("S1", {
            familyId: "fm_new",
            memberId: "mb_new",
            memberOrigin: "AUTHORED",
            omitMeta: true,
          }),
        },
        schemaVersion: 1,
      },
    ]);
    // New-data gate: validatePublishedExportCandidate alone (no repair)
    const v = validatePublishedExportCandidate(normalizeDatasetExport(candidate));
    expect(v.ok).toBe(false);
    if (v.ok) return;
    expect(v.issues.some((i) => i.includes("meta:missing"))).toBe(true);
  });
});

describe("convertFlatDatasetExportToNormalizedLeaf — F-2B prepare", () => {
  it("legacy missing meta + CREATE prepare → valid v3 candidate", () => {
    const existing = envelope([
      {
        positionId: createPositionId(ballsA),
        balls: ballsA,
        strategies: {
          S1: baseEntry("S1", {
            familyId: "fm_legacy",
            memberId: "mb_legacy_authored",
            memberOrigin: "AUTHORED",
          }),
          S2: {
            ...baseEntry("S2", {
              familyId: "fm_legacy",
              memberId: "mb_legacy_product",
              memberOrigin: CUE_C3_PRODUCT_MEMBER_ORIGIN,
              omitMeta: true,
            }),
            generatedFromMemberId: "mb_legacy_authored",
            derivedRule: "CUE_C3_CARTESIAN_PRODUCT_V1",
            derivedStep: "cue_c3:test",
          },
        },
        schemaVersion: 1,
      },
    ]);
    const converted = convertFlatDatasetExportToNormalizedLeaf(existing);
    expect(converted.ok).toBe(true);
    if (!converted.ok) return;
    expect(converted.envelope.schemaVersion).toBe(3);
    expect(converted.envelope.familyMasters.length).toBeGreaterThan(0);
    expect(converted.envelope.familyMembers.length).toBeGreaterThan(0);

    const op: PublishOperation = {
      schemaVersion: 1,
      intent: "CREATE",
      sourceFamilyId: null,
      destinationFamilyId: "fm_new_publish",
    };
    const payload: PublishFamilyPayload = {
      schemaVersion: 1,
      familyId: "fm_new_publish",
      records: [
        {
          positionId: createPositionId(ballsB),
          balls: ballsB,
          strategies: {
            S1: baseEntry("S1", {
              familyId: "fm_new_publish",
              memberId: "mb_new_publish",
              memberOrigin: "AUTHORED",
            }),
          },
          schemaVersion: 1,
        },
      ],
    };
    const prepared = prepareNormalizedPublishCandidate({
      existingRaw: existing,
      operation: op,
      payload,
      leafMeta: {
        shotType: "뒤돌리기",
        systemId: "5_half_system",
        systemLabel: "파이브앤하프",
      },
    });
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.existingKind).toBe("v2");
    expect(prepared.candidate.schemaVersion).toBe(3);
    expect(
      prepared.candidate.familyMasters.some((m) => m.familyId === "fm_new_publish")
    ).toBe(true);
    expect(
      prepared.candidate.familyMasters.some((m) => m.familyId === "fm_legacy")
    ).toBe(true);
  });

  it("idempotent: convert twice on same logical input → stable", () => {
    const existing = envelope([
      {
        positionId: createPositionId(ballsA),
        balls: ballsA,
        strategies: {
          S1: baseEntry("S1", {
            familyId: "fm_idem",
            memberId: "mb_idem_auth",
            memberOrigin: "AUTHORED",
          }),
          S2: {
            ...baseEntry("S2", {
              familyId: "fm_idem",
              memberId: "mb_idem_c3",
              memberOrigin: C3_PLUS_MEMBER_ORIGIN,
              omitMeta: true,
            }),
            generatedFromMemberId: "mb_idem_auth",
            derivedRule: "C3_PLUS_SCORING_LINE_v1",
            derivedStep: "c3plus:test",
          },
        },
        schemaVersion: 1,
      },
    ]);
    const a = convertFlatDatasetExportToNormalizedLeaf(existing);
    const b = convertFlatDatasetExportToNormalizedLeaf(existing);
    expect(a.ok && b.ok).toBe(true);
    if (!a.ok || !b.ok) return;
    expect(a.envelope.familyMasters).toEqual(b.envelope.familyMasters);
    expect(a.envelope.familyMembers).toEqual(b.envelope.familyMembers);
  });
});

describe("real leaf dry-run (read-only; no dataset write)", () => {
  const repoRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../../../.."
  );

  function loadLeaf(rel: string): DatasetExportPayload {
    const abs = path.join(repoRoot, "dataset", rel, "positions.json");
    const raw = JSON.parse(fs.readFileSync(abs, "utf8"));
    return normalizeDatasetExport(raw);
  }

  it("뒤돌리기 — F-2C orphan discarded; meta repair + convert PASS (5 Families)", () => {
    const flat = loadLeaf(path.join("뒤돌리기", "파이브앤하프"));
    expect(flat.schemaVersion).toBe(2);
    expect(flat.records.length).toBe(1892);
    const beforeMissing = countLegacyV2MissingMeta(flat);
    expect(beforeMissing).toBe(548);

    const repaired = repairLegacyV2MissingMeta(flat);
    expect(repaired.ok).toBe(true);
    if (!repaired.ok) return;
    expect(repaired.repairedCount).toBe(548);
    expect(countLegacyV2MissingMeta(repaired.payload)).toBe(0);

    const validated = validatePublishedExportCandidate(repaired.payload);
    expect(validated.ok).toBe(true);

    // F-2C: unrecoverable Product-only Family removed — first-touch now completes.
    const converted = convertFlatDatasetExportToNormalizedLeaf(flat);
    expect(converted.ok).toBe(true);
    if (!converted.ok) return;
    expect(converted.envelope.schemaVersion).toBe(3);
    expect(converted.envelope.familyMasters.length).toBe(5);
    expect(converted.envelope.familyMembers.length).toBe(1896);
    const authored = converted.envelope.familyMembers.filter(
      (m) => m.memberOrigin === "AUTHORED"
    );
    expect(authored.length).toBe(5);
  });

  it("옆돌리기 — 252 missing meta → repair + convert PASS · C-0 clean", () => {
    const flat = loadLeaf(path.join("옆돌리기", "파이브앤하프"));
    expect(flat.records.length).toBe(256);
    const beforeMissing = countLegacyV2MissingMeta(flat);
    expect(beforeMissing).toBe(252);

    const repaired = repairLegacyV2MissingMeta(flat);
    expect(repaired.ok).toBe(true);
    if (!repaired.ok) return;
    expect(repaired.repairedCount).toBe(252);
    expect(countLegacyV2MissingMeta(repaired.payload)).toBe(0);

    const converted = convertFlatDatasetExportToNormalizedLeaf(flat);
    expect(converted.ok).toBe(true);
    if (!converted.ok) return;
    expect(converted.envelope.schemaVersion).toBe(3);
    expect(converted.envelope.familyMasters.length).toBe(1);
    expect(converted.envelope.familyMembers.length).toBe(256);
  });
});
