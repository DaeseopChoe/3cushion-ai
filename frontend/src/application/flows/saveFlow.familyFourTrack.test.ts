/**
 * Phase 2C: ADMIN SAVE → automatic 4 Track Family generation.
 * Run: npx vitest run src/application/flows/saveFlow.familyFourTrack.test.ts
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { runSaveStrategy, type SaveFlowContext } from "./saveFlow";
import type { PositionRecord, StrategyEntry } from "../../domain/positionSearchEngine";
import { reconstructFamilyMembers } from "../../domain/family/familyAwareWriter";
import { familySymmetryIdentity } from "../../domain/family/familyIdentity";
import { runtimeHptFromStrategyEntry } from "../../domain/slotDraftFromEntry";
import { mapFamilyTrack, type FamilyTrack } from "../../domain/family/trackSymmetry";
import { createPositionId } from "../../domain/positionId";

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
});

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

function buildCtx(overrides: Partial<SaveFlowContext> = {}): {
  ctx: SaveFlowContext;
  capture: { dataset: PositionRecord[] };
} {
  const capture = { dataset: [] as PositionRecord[] };
  const track =
    ((overrides.adminState as { sys?: { track?: string } } | undefined)?.sys?.track ??
      "B2T_L") as string;
  const slotSys = {
    systemId: "5_half_system",
    track,
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
        track,
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
    saveWorkingDataset: (updated) => {
      capture.dataset = updated;
    },
    setDataset: (updated) => {
      capture.dataset = updated;
    },
    setUserPublishedSearchContext: vi.fn(),
    setAdminState: vi.fn(),
    patchSlotRuntimeMeta: vi.fn(),
    patchSlotFamilyIdentity: (slotId, identity) => {
      const slot = ctx.slots[slotId as "S1" | "S2" | "S3"] as
        | { draft?: Record<string, unknown>; applied?: Record<string, unknown> }
        | undefined;
      if (!slot) return;
      if (slot.draft && identity) Object.assign(slot.draft, identity);
      if (slot.applied && identity) Object.assign(slot.applied, identity);
      if (slot.draft && !identity) {
        delete slot.draft.familyId;
        delete slot.draft.memberId;
        delete slot.draft.memberOrigin;
        delete slot.draft.generatedFromMemberId;
        delete slot.draft.symmetryOp;
      }
      if (slot.applied && !identity) {
        delete slot.applied.familyId;
        delete slot.applied.memberId;
        delete slot.applied.memberOrigin;
        delete slot.applied.generatedFromMemberId;
        delete slot.applied.symmetryOp;
      }
    },
    saveToFile: vi.fn(),
    resolveFormulaHash: () => "v1",
    resolveEvalProfile: () => ({ formula: { expr: "C3_r = CO_f - C1_f" } }),
    resolveAnchorsData: () => ({
      trajectories: { B2T_L: { anchors: [{ id: "a1" }] } },
      meta: {},
    }),
    ...overrides,
  };
  if (overrides.saveWorkingDataset || overrides.setDataset) {
    /* keep caller overrides */
  } else {
    ctx.saveWorkingDataset = (updated) => {
      capture.dataset = updated;
    };
    ctx.setDataset = (updated) => {
      capture.dataset = updated;
    };
  }
  return { ctx, capture };
}

function membersOf(dataset: PositionRecord[], familyId: string) {
  return reconstructFamilyMembers(dataset, familyId);
}

function otherFamilyEntry(familyId: string, memberId: string, asid: string): StrategyEntry {
  return {
    slot: "S1",
    signature: { systemId: "5_half_system", formulaHash: "h1", shotType: "뒤돌리기" },
    sysInputs: { CO_f: 1 },
    familyId,
    memberId,
    authoringStrategyId: asid,
    memberOrigin: "AUTHORED",
    track: "B2T_L",
    meta: {
      impact: { x: 1, y: 1 },
      final: { x: 2, y: 2 },
      angle_ci: 0,
      angle_fs: 0,
    },
  };
}

describe("ADMIN Family SAVE creates 4 tracks", () => {
  it("saves AUTHORED + H + V + RPI under one familyId", () => {
    const { ctx, capture } = buildCtx();
    const result = runSaveStrategy(ctx);
    expect(result.ok).toBe(true);
    const authored = capture.dataset.find((r) =>
      Object.values(r.strategies).some((e) => e?.memberOrigin === "AUTHORED")
    );
    const familyId = Object.values(authored?.strategies ?? {}).find(
      (e) => e?.memberOrigin === "AUTHORED"
    )?.familyId;
    expect(familyId).toBeTruthy();
    const members = membersOf(capture.dataset, familyId!);
    expect(members).toHaveLength(4);
    expect(new Set(members.map((m) => m.entry.memberId)).size).toBe(4);
    expect(new Set(members.map((m) => m.entry.authoringStrategyId)).size).toBe(4);
    const authoredMember = members.find((m) => familySymmetryIdentity(m.entry) === "IDENTITY");
    expect(authoredMember?.entry.memberOrigin).toBe("AUTHORED");
    expect(authoredMember?.entry.track).toBe("B2T_L");
    expect(result.familyId).toBe(familyId);
    expect(result.fourTrackWritten).toBe(true);
    expect(
      members.some((m) => m.entry.memberOrigin === "DERIVED_CUE_IMPACT")
    ).toBe(false);
    for (const op of ["H", "V", "RPI"] as const) {
      const m = members.find((row) => row.entry.symmetryOp === op);
      expect(m?.entry.memberOrigin).toBe("SYMMETRY");
      expect(m?.entry.generatedFromMemberId).toBe(authoredMember?.entry.memberId);
      expect(m?.entry.track).toBe(mapFamilyTrack("B2T_L", op));
      expect(m?.entry.sysInputs).toEqual(authoredMember?.entry.sysInputs);
      expect(m?.entry.hpT).toEqual(canonicalHpt);
      expect(m?.positionId).toBe(createPositionId(m.balls));
      expect(m?.entry.memberId).not.toBe(m.positionId);
    }
  });

  it.each(["B2T_L", "B2T_R", "T2B_L", "T2B_R"] as FamilyTrack[])(
    "base %s produces each Family track once",
    (base) => {
      const { ctx, capture } = buildCtx({
        adminState: {
          sys: {
            system: "5_half_system",
            systemId: "5_half_system",
            system_id: "5_half_system",
            shotType: "뒤돌리기",
            track: base,
            inputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
            system_values: { CO_f: 30, C1_f: 10, C3_r: 20 },
            corrections: { slide: 0, curve_ratio: 0, draw: 0, departure: 0, spin: 0 },
          },
          hpt: canonicalHpt,
        },
        slots: {
          S1: {
            draft: {
              sys: {
                systemId: "5_half_system",
                track: base,
                inputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
                outputs: { result: { CO_f: 30, C1_f: 10, C3_r: 20 } },
              },
              hpt: canonicalHpt,
            },
            applied: {
              sys: {
                systemId: "5_half_system",
                track: base,
                inputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
                outputs: { result: { CO_f: 30, C1_f: 10, C3_r: 20 } },
              },
              hpt: canonicalHpt,
              str: { speed: 1 },
              ai: {},
            },
          },
        },
      });
      expect(runSaveStrategy(ctx).ok).toBe(true);
      const id = capture.dataset
        .flatMap((r) => Object.values(r.strategies))
        .find((e) => e?.familyId)?.familyId;
      const members = membersOf(capture.dataset, id!);
      const tracks = members.map((m) => m.entry.track).sort();
      expect(tracks).toEqual(["B2T_L", "B2T_R", "T2B_L", "T2B_R"]);
      expect(members.find((m) => familySymmetryIdentity(m.entry) === "IDENTITY")?.entry.track).toBe(
        base
      );
    }
  );
});

describe("idempotency / collision / capacity", () => {
  it("re-SAVE keeps 4 members and the same memberIds", () => {
    const first = buildCtx();
    expect(runSaveStrategy(first.ctx).ok).toBe(true);
    const authored = first.capture.dataset
      .flatMap((r) => Object.values(r.strategies))
      .find((e) => e?.memberOrigin === "AUTHORED");
    const familyId = authored?.familyId;
    const ids1 = membersOf(first.capture.dataset, familyId!)
      .map((m) => `${familySymmetryIdentity(m.entry)}:${m.entry.memberId}`)
      .sort();
    const second = buildCtx({
      dataset: first.capture.dataset,
      saveIntent: "UPDATE",
      slots: {
        S1: {
          draft: {
            sys: {
              systemId: "5_half_system",
              track: "B2T_L",
              inputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
              outputs: { result: { CO_f: 30, C1_f: 10, C3_r: 20 } },
            },
            hpt: canonicalHpt,
            ...authored,
          },
          applied: {
            sys: {
              systemId: "5_half_system",
              track: "B2T_L",
              inputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
              outputs: { result: { CO_f: 30, C1_f: 10, C3_r: 20 } },
            },
            hpt: canonicalHpt,
            str: { speed: 1 },
            ai: {},
            ...authored,
          },
        },
      },
    });
    second.ctx.saveWorkingDataset = (updated) => {
      second.capture.dataset = updated;
    };
    second.ctx.setDataset = (updated) => {
      second.capture.dataset = updated;
    };
    expect(runSaveStrategy(second.ctx).ok).toBe(true);
    const ids2 = membersOf(second.capture.dataset, familyId!)
      .map((m) => `${familySymmetryIdentity(m.entry)}:${m.entry.memberId}`)
      .sort();
    expect(membersOf(second.capture.dataset, familyId!)).toHaveLength(4);
    expect(ids2).toEqual(ids1);
  });

  it("explicit CREATE on Exact same-slot mints a new family instead of inheriting", () => {
    const first = buildCtx();
    expect(runSaveStrategy(first.ctx).ok).toBe(true);
    const authoredA = first.capture.dataset
      .flatMap((r) => Object.values(r.strategies))
      .find((e) => e?.memberOrigin === "AUTHORED");
    const second = buildCtx({
      dataset: first.capture.dataset,
      saveIntent: "CREATE",
    });
    expect(runSaveStrategy(second.ctx).ok).toBe(true);
    const authoredFamilies = second.capture.dataset
      .flatMap((r) => Object.values(r.strategies))
      .filter((e) => e?.memberOrigin === "AUTHORED")
      .map((e) => ({ familyId: e?.familyId, memberId: e?.memberId }));
    expect(new Set(authoredFamilies.map((x) => x.familyId)).size).toBe(2);
    expect(authoredFamilies.some((x) => x.familyId === authoredA?.familyId)).toBe(true);
    expect(authoredFamilies.some((x) => x.familyId !== authoredA?.familyId)).toBe(true);
  });

  it("preserves an unrelated Family on the same Exact authored coordinates", () => {
    const a = buildCtx();
    expect(runSaveStrategy(a.ctx).ok).toBe(true);
    const familyA = a.capture.dataset
      .flatMap((r) => Object.values(r.strategies))
      .find((e) => e?.memberOrigin === "AUTHORED")?.familyId;
    const b = buildCtx({
      dataset: a.capture.dataset,
      activeSlot: "S2",
      slots: {
        S1: a.ctx.slots.S1,
        S2: {
          draft: {
            sys: {
              systemId: "5_half_system",
              track: "B2T_L",
              inputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
              outputs: { result: { CO_f: 30, C1_f: 10, C3_r: 20 } },
            },
            hpt: canonicalHpt,
          },
          applied: {
            sys: {
              systemId: "5_half_system",
              track: "B2T_L",
              inputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
              outputs: { result: { CO_f: 30, C1_f: 10, C3_r: 20 } },
            },
            hpt: canonicalHpt,
            str: { speed: 1 },
            ai: {},
          },
        },
      },
    });
    b.ctx.saveWorkingDataset = (updated) => {
      b.capture.dataset = updated;
    };
    b.ctx.setDataset = (updated) => {
      b.capture.dataset = updated;
    };
    expect(runSaveStrategy(b.ctx).ok).toBe(true);
    const familyB = b.capture.dataset
      .flatMap((r) => Object.values(r.strategies))
      .find((e) => e?.slot === "S2" && e?.memberOrigin === "AUTHORED")?.familyId;
    expect(familyB).toBeTruthy();
    expect(familyB).not.toBe(familyA);
    expect(membersOf(b.capture.dataset, familyA!)).toHaveLength(4);
    expect(membersOf(b.capture.dataset, familyB!)).toHaveLength(4);
  });

  it("CREATE fails closed when authored Exact position has S1–S3 occupied by unrelated Families", () => {
    const occupied: PositionRecord = {
      positionId: createPositionId(balls),
      balls,
      strategies: {
        S1: otherFamilyEntry("fm_x", "mb_x", "as_x"),
        S2: otherFamilyEntry("fm_y", "mb_y", "as_y"),
        S3: otherFamilyEntry("fm_z", "mb_z", "as_z"),
      },
      schemaVersion: 1,
    };
    const { ctx } = buildCtx({ dataset: [occupied], saveIntent: "CREATE" });
    const directResult = runSaveStrategy(ctx);
    expect(directResult.ok).toBe(false);
    expect(directResult.reason).toMatch(/SLOT_CAPACITY/);
    expect(occupied.strategies.S1?.familyId).toBe("fm_x");
    expect(occupied.strategies.S2?.familyId).toBe("fm_y");
    expect(occupied.strategies.S3?.familyId).toBe("fm_z");
  });
});

describe("HPT persist vs hydrate", () => {
  it("does not persist mirrored HPT; hydrate mirrors opposite handedness only", () => {
    const { ctx, capture } = buildCtx();
    expect(runSaveStrategy(ctx).ok).toBe(true);
    const familyId = capture.dataset
      .flatMap((r) => Object.values(r.strategies))
      .find((e) => e?.memberOrigin === "AUTHORED")?.familyId;
    const members = membersOf(capture.dataset, familyId!);
    const authored = members.find((m) => familySymmetryIdentity(m.entry) === "IDENTITY")!;
    const h = members.find((m) => m.entry.symmetryOp === "H")!;
    const rpi = members.find((m) => m.entry.symmetryOp === "RPI")!;
    expect(h.entry.hpT).toEqual(canonicalHpt);
    expect(rpi.entry.hpT).toEqual(canonicalHpt);
    expect(runtimeHptFromStrategyEntry(authored.entry)).toEqual(canonicalHpt);
    expect(runtimeHptFromStrategyEntry(rpi.entry)).toEqual(canonicalHpt);
    expect(runtimeHptFromStrategyEntry(h.entry)).toEqual({
      T: "+3/8",
      hit_point: { x: 2, y: 1.5 },
      mode: "TIP",
      tipCount: 2,
    });
  });
});

describe("legacy SAVE", () => {
  it("does not auto-generate 4 tracks when overwriting a legacy slot", () => {
    const legacy: PositionRecord = {
      positionId: createPositionId(balls),
      balls,
      strategies: {
        S1: {
          slot: "S1",
          signature: {
            systemId: "5_half_system",
            formulaHash: "h1",
            shotType: "뒤돌리기",
          },
          sysInputs: { CO_f: 30, C1_f: 10, C3_r: 20 },
          hpT: { T: "8/8" },
          meta: {
            impact: { x: 1, y: 1 },
            final: { x: 2, y: 2 },
            angle_ci: 0,
            angle_fs: 0,
          },
        },
      },
    };
    const { ctx, capture } = buildCtx({ dataset: [legacy] });
    expect(runSaveStrategy(ctx).ok).toBe(true);
    expect(capture.dataset).toHaveLength(1);
    const entry = capture.dataset[0].strategies.S1;
    expect(entry?.symmetryOp).toBeUndefined();
    expect(
      capture.dataset.flatMap((r) => Object.values(r.strategies)).filter((e) => e?.memberOrigin === "SYMMETRY")
    ).toHaveLength(0);
    expect(runtimeHptFromStrategyEntry(entry!)).toEqual(entry?.hpT);
  });
});
