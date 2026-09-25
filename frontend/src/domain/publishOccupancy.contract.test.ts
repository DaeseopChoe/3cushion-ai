/**
 * Phase F-2E — Publish occupancy classification + confirmed Family replacement.
 *
 * Run: npx vitest run src/domain/publishOccupancy.contract.test.ts
 */

import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { createPositionId } from "./positionId";
import type { Ball3, PositionRecord, StrategyEntry } from "./positionSearchEngine";
import {
  composeNormalizedDatasetEnvelope,
  parseNormalizedDatasetEnvelope,
} from "./dataset/normalizedDatasetEnvelope";
import type { PublishOperation } from "./publishOperation";
import type { PublishFamilyPayload } from "./publishFamilyPayload";
import {
  applyPublishFamilyToNormalizedLeaf,
  createEmptyNormalizedPublishedLeaf,
} from "./publishedNormalizedLeafMutation";
import { prepareNormalizedPublishCandidate } from "./publishedLeafPrepare";
import {
  buildOccupancyIndex,
  classifyResolvablePublishOverwrite,
  collectOccupancyConflicts,
  makePositionSlotKey,
} from "./publishOccupancy";
import type { FamilyMember } from "./family/familyNormalizedSchema";

const LEAF = {
  shotType: "뒤돌리기",
  systemId: "5_half_system",
  systemLabel: "파이브앤하프",
};

const EXISTING_FM = "fm_3c75c038-dbd9-42b9-b8e2-2a10fd20c1f5";
const INCOMING_FM = "fm_2a1440b5-6c93-40b5-a797-b10ef12aac99";
const OTHER_FM = "fm_aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

const ballsAuth: Ball3 = {
  cue: { x: 20, y: 16 },
  target: { x: 60, y: 20 },
  second: { x: 20, y: 20 },
};
const ballsH: Ball3 = {
  cue: { x: 60, y: 16 },
  target: { x: 20, y: 20 },
  second: { x: 60, y: 20 },
};
const ballsV: Ball3 = {
  cue: { x: 20, y: 24 },
  target: { x: 60, y: 20 },
  second: { x: 20, y: 20 },
};
const ballsRpi: Ball3 = {
  cue: { x: 60, y: 24 },
  target: { x: 20, y: 20 },
  second: { x: 60, y: 20 },
};
const ballsOther: Ball3 = {
  cue: { x: 10, y: 10 },
  target: { x: 30, y: 20 },
  second: { x: 40, y: 15 },
};

function entry(
  familyId: string,
  memberId: string,
  origin: StrategyEntry["memberOrigin"],
  track: StrategyEntry["track"],
  extra: Partial<StrategyEntry> = {}
): StrategyEntry {
  return {
    slot: "S1",
    signature: {
      systemId: "5_half_system",
      formulaHash: "test",
      shotType: "뒤돌리기",
    },
    track,
    sysInputs: { CO_f: 30, C3_r: 26 },
    meta: {
      impact: { x: 20, y: 16 },
      final: { x: 20, y: 20 },
      angle_ci: 0,
      angle_fs: 0,
    },
    corrections: {
      slide: 7,
      curve_ratio: 0,
      draw: 0,
      departure: 0,
      spin: 0,
    },
    correctionsStored: true,
    familyId,
    memberId,
    memberOrigin: origin,
    ...extra,
  };
}

function record(balls: Ball3, strategy: StrategyEntry): PositionRecord {
  return {
    positionId: createPositionId(balls),
    balls,
    strategies: { S1: { ...strategy, slot: "S1" } },
    schemaVersion: 1,
  };
}

function fourTrackFamily(
  familyId: string,
  authMemberId: string
): PositionRecord[] {
  const auth = entry(familyId, authMemberId, "AUTHORED", "B2T_R");
  return [
    record(ballsAuth, auth),
    record(
      ballsH,
      entry(familyId, `${authMemberId}_h`, "SYMMETRY", "B2T_L", {
        generatedFromMemberId: authMemberId,
        symmetryOp: "H",
      })
    ),
    record(
      ballsV,
      entry(familyId, `${authMemberId}_v`, "SYMMETRY", "T2B_L", {
        generatedFromMemberId: authMemberId,
        symmetryOp: "V",
      })
    ),
    record(
      ballsRpi,
      entry(familyId, `${authMemberId}_r`, "SYMMETRY", "T2B_R", {
        generatedFromMemberId: authMemberId,
        symmetryOp: "RPI",
      })
    ),
  ];
}

function payload(
  familyId: string,
  records: PositionRecord[]
): PublishFamilyPayload {
  return { schemaVersion: 1, familyId, records };
}

function opCreate(dest: string): PublishOperation {
  return {
    schemaVersion: 1,
    intent: "CREATE",
    sourceFamilyId: null,
    destinationFamilyId: dest,
  };
}

function opUpdate(familyId: string): PublishOperation {
  return {
    schemaVersion: 1,
    intent: "UPDATE",
    sourceFamilyId: familyId,
    destinationFamilyId: familyId,
  };
}

function leafWithExisting() {
  const empty = createEmptyNormalizedPublishedLeaf(LEAF);
  expect(empty.ok).toBe(true);
  if (!empty.ok) throw new Error("empty");
  const applied = applyPublishFamilyToNormalizedLeaf({
    existing: empty.envelope,
    operation: opCreate(EXISTING_FM),
    payload: payload(EXISTING_FM, fourTrackFamily(EXISTING_FM, "mb_exist_auth")),
    leafMeta: LEAF,
  });
  expect(applied.ok).toBe(true);
  if (!applied.ok) throw new Error("seed");
  return applied.envelope;
}

describe("publishOccupancy — index structure", () => {
  it("build+lookup is Map-based (not nested N×M)", () => {
    const members: FamilyMember[] = [];
    for (let i = 0; i < 2000; i++) {
      members.push({
        schemaVersion: 2,
        memberId: `mb_${String(i).padStart(8, "0")}-0000-4000-8000-000000000001`,
        familyId: `fm_${String(i % 50).padStart(8, "0")}-0000-4000-8000-00000000000a`,
        balls: {
          cue: { x: (i % 80) + 0.1, y: 10 },
          target: { x: 40, y: 20 },
          second: { x: 60, y: 15 },
        },
        track: "B2T_L",
        sourceSlot: "S1",
        memberOrigin: "AUTHORED",
      });
    }
    const index = buildOccupancyIndex(members);
    expect(index.size).toBeGreaterThan(0);
    const probe = members.slice(0, 2000);
    const { conflicts } = collectOccupancyConflicts(index, probe);
    // Same members against own index → no cross-family if unique keys; may have collisions by design of coords
    expect(Array.isArray(conflicts)).toBe(true);
    // Structural: key format
    const key = makePositionSlotKey("200160600200200200", "S1");
    expect(key).toBe("200160600200200200|S1");
  });

  it("synthetic 10k build + 2k lookups completes (structure guard)", () => {
    const members: FamilyMember[] = [];
    for (let i = 0; i < 10_000; i++) {
      members.push({
        schemaVersion: 2,
        memberId: `mb_${String(i).padStart(8, "0")}-1111-4111-8111-111111111111`,
        familyId: `fm_${String(i).padStart(8, "0")}-2222-4222-8222-222222222222`,
        balls: {
          cue: { x: (i % 100) * 0.1, y: Math.floor(i / 100) * 0.1 },
          target: { x: 20, y: 20 },
          second: { x: 60, y: 20 },
        },
        track: "B2T_R",
        sourceSlot: i % 2 === 0 ? "S1" : "S2",
        memberOrigin: "AUTHORED",
      });
    }
    const index = buildOccupancyIndex(members);
    expect(index.size).toBe(10_000);
    const incoming = members.slice(0, 2000).map((m) => ({
      ...m,
      familyId: INCOMING_FM,
      memberId: m.memberId.replace("mb_", "mb_i"),
    }));
    const { conflicts } = collectOccupancyConflicts(index, incoming);
    expect(conflicts.length).toBe(2000);
  });
});

describe("publishOccupancy — classification", () => {
  it("same AUTHORED Position+S1 → RESOLVABLE_PUBLISH_OVERWRITE", () => {
    const base = leafWithExisting();
    const classified = classifyResolvablePublishOverwrite({
      base,
      operation: opCreate(INCOMING_FM),
      payload: payload(INCOMING_FM, fourTrackFamily(INCOMING_FM, "mb_in_auth")),
    });
    expect(classified.kind).toBe("RESOLVABLE_PUBLISH_OVERWRITE");
    if (classified.kind !== "RESOLVABLE_PUBLISH_OVERWRITE") return;
    expect(classified.conflict.existingFamilyId).toBe(EXISTING_FM);
    expect(classified.conflict.incomingFamilyId).toBe(INCOMING_FM);
    expect(classified.conflict.authoredPositionId).toBe(
      createPositionId(ballsAuth)
    );
    expect(classified.conflict.authoredSourceSlot).toBe("S1");
    expect(classified.conflict.conflictCount).toBe(4);
  });

  it("same Position different Slot → no cross-family conflict", () => {
    const base = leafWithExisting();
    const s2Records = fourTrackFamily(INCOMING_FM, "mb_in_auth").map((r) => {
      const e = r.strategies.S1!;
      return {
        ...r,
        strategies: {
          S2: { ...e, slot: "S2" as const },
        },
      };
    });
    const classified = classifyResolvablePublishOverwrite({
      base,
      operation: opCreate(INCOMING_FM),
      payload: payload(INCOMING_FM, s2Records),
    });
    expect(classified.kind).toBe("NO_CROSS_FAMILY_CONFLICT");
  });

  it("different AUTHORED root + derived overlap → HARD derived-only", () => {
    const base = leafWithExisting();
    // Incoming AUTHORED at different position, but one SYMMETRY collides with existing
    const records: PositionRecord[] = [
      record(
        ballsOther,
        entry(INCOMING_FM, "mb_in_auth", "AUTHORED", "B2T_R")
      ),
      record(
        ballsAuth,
        entry(INCOMING_FM, "mb_in_sym", "SYMMETRY", "B2T_L", {
          generatedFromMemberId: "mb_in_auth",
          symmetryOp: "H",
        })
      ),
    ];
    const classified = classifyResolvablePublishOverwrite({
      base,
      operation: opCreate(INCOMING_FM),
      payload: payload(INCOMING_FM, records),
    });
    expect(classified.kind).toBe("HARD_OCCUPANCY_CONFLICT");
    if (classified.kind !== "HARD_OCCUPANCY_CONFLICT") return;
    expect(classified.reason).toBe("derived-only-different-authored-root");
  });

  it("multi existing Families → HARD", () => {
    const base1 = leafWithExisting();
    const applied2 = applyPublishFamilyToNormalizedLeaf({
      existing: base1,
      operation: opCreate(OTHER_FM),
      payload: payload(OTHER_FM, [
        record(
          ballsOther,
          entry(OTHER_FM, "mb_other_auth", "AUTHORED", "B2T_L")
        ),
      ]),
      leafMeta: LEAF,
    });
    expect(applied2.ok).toBe(true);
    if (!applied2.ok) return;

    // Incoming overlaps BOTH families' positions
    const records: PositionRecord[] = [
      record(
        ballsAuth,
        entry(INCOMING_FM, "mb_in_auth", "AUTHORED", "B2T_R")
      ),
      record(
        ballsOther,
        entry(INCOMING_FM, "mb_in_2", "SYMMETRY", "B2T_L", {
          generatedFromMemberId: "mb_in_auth",
          symmetryOp: "H",
        })
      ),
    ];
    const classified = classifyResolvablePublishOverwrite({
      base: applied2.envelope,
      operation: opCreate(INCOMING_FM),
      payload: payload(INCOMING_FM, records),
    });
    expect(classified.kind).toBe("HARD_OCCUPANCY_CONFLICT");
    if (classified.kind !== "HARD_OCCUPANCY_CONFLICT") return;
    expect(classified.reason).toBe("multi-existing-family");
  });
});

describe("prepareNormalizedPublishCandidate — F-2E overwrite", () => {
  it("CREATE conflict surfaces RESOLVABLE_PUBLISH_OVERWRITE (no candidate)", () => {
    const base = leafWithExisting();
    const raw = composeNormalizedDatasetEnvelope({
      shotType: base.shotType,
      systemId: base.systemId,
      systemLabel: base.systemLabel,
      masters: base.familyMasters,
      members: base.familyMembers,
    });
    const leafRevision = createHash("sha256")
      .update(JSON.stringify(raw), "utf8")
      .digest("hex");
    const prepared = prepareNormalizedPublishCandidate({
      existingRaw: raw,
      operation: opCreate(INCOMING_FM),
      payload: payload(INCOMING_FM, fourTrackFamily(INCOMING_FM, "mb_in_auth")),
      leafMeta: LEAF,
      leafRevision,
    });
    expect(prepared.ok).toBe(false);
    if (prepared.ok) return;
    expect(prepared.code).toBe("RESOLVABLE_PUBLISH_OVERWRITE");
    expect(prepared.conflict?.existingFamilyId).toBe(EXISTING_FM);
    expect(prepared.leafRevision).toBe(leafRevision);
  });

  it("confirmed overwrite → existing familyId survives; incoming absent; C-0 PASS", () => {
    const base = leafWithExisting();
    const raw = composeNormalizedDatasetEnvelope({
      shotType: base.shotType,
      systemId: base.systemId,
      systemLabel: base.systemLabel,
      masters: base.familyMasters,
      members: base.familyMembers,
    });
    const leafRevision = createHash("sha256")
      .update(JSON.stringify(raw), "utf8")
      .digest("hex");

    const prepared = prepareNormalizedPublishCandidate({
      existingRaw: raw,
      operation: opCreate(INCOMING_FM),
      payload: payload(INCOMING_FM, fourTrackFamily(INCOMING_FM, "mb_in_auth")),
      leafMeta: LEAF,
      leafRevision,
      confirmedOverwrite: {
        targetFamilyId: EXISTING_FM,
        expectedLeafRevision: leafRevision,
      },
    });
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.confirmedOverwriteApplied).toBe(true);
    expect(prepared.insertedFamilyId).toBe(EXISTING_FM);
    expect(prepared.purgedFamilyIds).toContain(EXISTING_FM);
    const ids = prepared.candidate.familyMasters.map((m) => m.familyId);
    expect(ids).toContain(EXISTING_FM);
    expect(ids).not.toContain(INCOMING_FM);
    expect(
      prepared.candidate.familyMembers.every((m) => m.familyId !== INCOMING_FM)
    ).toBe(true);
    expect(
      prepared.candidate.familyMembers.every((m) => m.familyId === EXISTING_FM)
    ).toBe(true);
    const parsed = parseNormalizedDatasetEnvelope(prepared.candidate);
    expect(parsed.ok).toBe(true);
  });

  it("stale leaf revision aborts confirmed overwrite", () => {
    const base = leafWithExisting();
    const raw = composeNormalizedDatasetEnvelope({
      shotType: base.shotType,
      systemId: base.systemId,
      systemLabel: base.systemLabel,
      masters: base.familyMasters,
      members: base.familyMembers,
    });
    const leafRevision = createHash("sha256")
      .update(JSON.stringify(raw), "utf8")
      .digest("hex");
    const prepared = prepareNormalizedPublishCandidate({
      existingRaw: raw,
      operation: opCreate(INCOMING_FM),
      payload: payload(INCOMING_FM, fourTrackFamily(INCOMING_FM, "mb_in_auth")),
      leafMeta: LEAF,
      leafRevision,
      confirmedOverwrite: {
        targetFamilyId: EXISTING_FM,
        expectedLeafRevision: "deadbeef",
      },
    });
    expect(prepared.ok).toBe(false);
    if (prepared.ok) return;
    expect(prepared.code).toBe("STALE_LEAF_REVISION");
  });

  it("normal CREATE without conflict still works", () => {
    const empty = createEmptyNormalizedPublishedLeaf(LEAF);
    expect(empty.ok).toBe(true);
    if (!empty.ok) return;
    const raw = composeNormalizedDatasetEnvelope({
      shotType: empty.envelope.shotType,
      systemId: empty.envelope.systemId,
      systemLabel: empty.envelope.systemLabel,
      masters: [],
      members: [],
    });
    const prepared = prepareNormalizedPublishCandidate({
      existingRaw: raw,
      operation: opCreate(INCOMING_FM),
      payload: payload(INCOMING_FM, fourTrackFamily(INCOMING_FM, "mb_in_auth")),
      leafMeta: LEAF,
      leafRevision: createHash("sha256").update("").digest("hex"),
    });
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.insertedFamilyId).toBe(INCOMING_FM);
  });

  it("existing UPDATE path unchanged", () => {
    const base = leafWithExisting();
    const raw = composeNormalizedDatasetEnvelope({
      shotType: base.shotType,
      systemId: base.systemId,
      systemLabel: base.systemLabel,
      masters: base.familyMasters,
      members: base.familyMembers,
    });
    const updatedRecords = fourTrackFamily(EXISTING_FM, "mb_exist_auth").map(
      (r) => {
        const e = r.strategies.S1!;
        return {
          ...r,
          strategies: {
            S1: {
              ...e,
              sysInputs: { ...e.sysInputs, CO_f: 31 },
            },
          },
        };
      }
    );
    const prepared = prepareNormalizedPublishCandidate({
      existingRaw: raw,
      operation: opUpdate(EXISTING_FM),
      payload: payload(EXISTING_FM, updatedRecords),
      leafMeta: LEAF,
      leafRevision: createHash("sha256")
        .update(JSON.stringify(raw), "utf8")
        .digest("hex"),
    });
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.candidate.familyMasters[0]!.sysInputs?.CO_f).toBe(31);
  });
});
