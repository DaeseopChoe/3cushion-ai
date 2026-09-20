/**
 * Save Intent Split — CASE 1–10 contract tests.
 *
 * SSOT:
 * - SAVE = always CREATE NEW Family
 * - OVERWRITE = Source Family UPDATE (trusted Published session only)
 * - Recall source must never auto-switch SAVE → UPDATE
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runSaveStrategy, type SaveFlowContext } from "../../application/flows/saveFlow";
import { resolveFamilySaveIntent } from "./familySavePolicy";
import {
  canOverwritePublishedSourceFamily,
  resolveOverwriteSaveIntent,
} from "./publishedEditSession";
import type { PositionRecord } from "../positionSearchEngine";

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
  cue: { x: 10, y: 10 },
  target: { x: 40, y: 20 },
  second: { x: 60, y: 15 },
};

function buildCtx(overrides: Partial<SaveFlowContext> = {}): {
  ctx: SaveFlowContext;
} {
  const slotSys = {
    systemId: "5_half_system",
    track: "B2T_L",
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
        track: "B2T_L",
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
      hpt: { T: "8/8" },
    },
    activeSlot: "S1",
    slots: {
      S1: {
        draft: { sys: slotSys, hpt: { T: "8/8" } },
        applied: { sys: slotSys, hpt: { T: "8/8" }, str: { speed: 1 }, ai: {} },
      },
    },
    targetColor: "red",
    aiOverride: null,
    system: "5_half_system",
    resolvedSlotSysValues: { CO_f: 30, C1_f: 10, C3_r: 20 },
    autoSave: false,
    editSource: null,
    saveCommand: "SAVE",
    saveWorkingDataset: vi.fn(),
    setDataset: vi.fn(),
    setUserPublishedSearchContext: vi.fn(),
    setAdminState: vi.fn(),
    patchSlotRuntimeMeta: vi.fn(),
    patchSlotFamilyIdentity: vi.fn(),
    saveToFile: vi.fn(),
    resolveFormulaHash: () => "test_hash",
    resolveEvalProfile: () => ({ formula: { expr: "1" } }),
    resolveAnchorsData: () => undefined,
    ...overrides,
  };
  return { ctx };
}

function authoredFrom(dataset: PositionRecord[]) {
  return dataset
    .flatMap((r) => Object.values(r.strategies))
    .find((e) => e?.memberOrigin === "AUTHORED");
}

function slotWithIdentity(
  identity: Record<string, unknown>,
  inputs = { CO_f: 30, C1_f: 10, C3_r: 20 }
) {
  const slotSys = {
    systemId: "5_half_system",
    track: "B2T_L",
    inputs,
    outputs: { result: { ...inputs } },
  };
  return {
    S1: {
      draft: { sys: slotSys, hpt: { T: "8/8" }, ...identity },
      applied: {
        sys: slotSys,
        hpt: { T: "8/8" },
        str: { speed: 1 },
        ai: {},
        ...identity,
      },
    },
  };
}

describe("Save Intent Split CASE 1–10", () => {
  it("CASE 1 — fresh input SAVE → NEW Family", () => {
    let dataset: PositionRecord[] = [];
    const { ctx } = buildCtx({
      saveCommand: "SAVE",
      saveWorkingDataset: (u) => {
        dataset = u;
      },
      setDataset: (u) => {
        dataset = u;
      },
    });
    const r = runSaveStrategy(ctx);
    expect(r.ok).toBe(true);
    expect(r.saveIntent).toBe("CREATE");
    expect(r.familyId).toBeTruthy();
    expect(r.publishOperation?.intent).toBe("CREATE");
  });

  it("CASE 2 — Published MASTER recall → SAVE → NEW Family; source preserved", () => {
    let dataset: PositionRecord[] = [];
    const first = buildCtx({
      saveWorkingDataset: (u) => {
        dataset = u;
      },
      setDataset: (u) => {
        dataset = u;
      },
    });
    expect(runSaveStrategy(first.ctx).ok).toBe(true);
    const source = authoredFrom(dataset)!;
    const sourceFamilyId = source.familyId!;
    const sourceMemberId = source.memberId!;

    const after = buildCtx({
      dataset,
      editingPublishedFamilyId: sourceFamilyId,
      saveCommand: "SAVE",
      slots: slotWithIdentity({
        familyId: sourceFamilyId,
        memberId: sourceMemberId,
        memberOrigin: "AUTHORED",
      }),
      saveWorkingDataset: (u) => {
        dataset = u;
      },
      setDataset: (u) => {
        dataset = u;
      },
    });
    const r = runSaveStrategy(after.ctx);
    expect(r.ok).toBe(true);
    expect(r.saveIntent).toBe("CREATE");
    expect(r.familyId).not.toBe(sourceFamilyId);
    expect(r.familyId).toBeTruthy();
    // Source family still present
    expect(
      dataset.some((rec) =>
        Object.values(rec.strategies).some((e) => e?.familyId === sourceFamilyId)
      )
    ).toBe(true);
  });

  it("CASE 3 — Published MASTER recall → OVERWRITE → Source Family UPDATE; no new family", () => {
    let dataset: PositionRecord[] = [];
    const first = buildCtx({
      saveWorkingDataset: (u) => {
        dataset = u;
      },
      setDataset: (u) => {
        dataset = u;
      },
    });
    expect(runSaveStrategy(first.ctx).ok).toBe(true);
    const source = authoredFrom(dataset)!;
    const sourceFamilyId = source.familyId!;

    const after = buildCtx({
      dataset,
      editingPublishedFamilyId: sourceFamilyId,
      saveCommand: "OVERWRITE",
      slots: slotWithIdentity(
        {
          familyId: sourceFamilyId,
          memberId: source.memberId,
          memberOrigin: "AUTHORED",
        },
        { CO_f: 35, C1_f: 10, C3_r: 20 }
      ),
      saveWorkingDataset: (u) => {
        dataset = u;
      },
      setDataset: (u) => {
        dataset = u;
      },
    });
    const r = runSaveStrategy(after.ctx);
    expect(r.ok).toBe(true);
    expect(r.saveIntent).toBe("UPDATE");
    expect(r.familyId).toBe(sourceFamilyId);
    expect(r.publishOperation?.intent).toBe("UPDATE");
    expect(r.publishOperation?.sourceFamilyId).toBe(sourceFamilyId);
    expect(r.publishOperation?.destinationFamilyId).toBe(sourceFamilyId);
    const authoredFamilies = new Set(
      dataset
        .flatMap((rec) => Object.values(rec.strategies))
        .filter((e) => e?.memberOrigin === "AUTHORED")
        .map((e) => e?.familyId)
    );
    expect(authoredFamilies.size).toBe(1);
    expect(authoredFamilies.has(sourceFamilyId)).toBe(true);
  });

  it("CASE 4 — Published Derived Member → SAVE → NEW Family B; Family A preserved", () => {
    let dataset: PositionRecord[] = [];
    const first = buildCtx({
      saveWorkingDataset: (u) => {
        dataset = u;
      },
      setDataset: (u) => {
        dataset = u;
      },
    });
    expect(runSaveStrategy(first.ctx).ok).toBe(true);
    const source = authoredFrom(dataset)!;
    const familyA = source.familyId!;

    const after = buildCtx({
      dataset,
      editingPublishedFamilyId: familyA,
      saveCommand: "SAVE",
      slots: slotWithIdentity({
        familyId: familyA,
        memberId: "mb_der_30",
        memberOrigin: "DERIVED_CUE_IMPACT",
        generatedFromMemberId: source.memberId,
        derivedRule: "CUE_IMPACT_FIRST_30PCT",
        derivedStep: "0.3",
      }),
      saveWorkingDataset: (u) => {
        dataset = u;
      },
      setDataset: (u) => {
        dataset = u;
      },
    });
    const r = runSaveStrategy(after.ctx);
    expect(r.ok).toBe(true);
    expect(r.saveIntent).toBe("CREATE");
    expect(r.familyId).not.toBe(familyA);
    expect(
      dataset.some((rec) =>
        Object.values(rec.strategies).some((e) => e?.familyId === familyA)
      )
    ).toBe(true);
  });

  it("CASE 5 — Published Derived Member → OVERWRITE → Source Family A UPDATE", () => {
    let dataset: PositionRecord[] = [];
    const first = buildCtx({
      saveWorkingDataset: (u) => {
        dataset = u;
      },
      setDataset: (u) => {
        dataset = u;
      },
    });
    expect(runSaveStrategy(first.ctx).ok).toBe(true);
    const source = authoredFrom(dataset)!;
    const familyA = source.familyId!;

    expect(
      resolveOverwriteSaveIntent({
        editingPublishedFamilyId: familyA,
        slotIdentity: {
          familyId: familyA,
          memberId: "mb_der_30",
          memberOrigin: "DERIVED_CUE_IMPACT",
          generatedFromMemberId: source.memberId!,
          derivedRule: "CUE_IMPACT_FIRST_30PCT",
          derivedStep: "0.3",
        },
      })
    ).toBe("UPDATE");

    const after = buildCtx({
      dataset,
      editingPublishedFamilyId: familyA,
      saveCommand: "OVERWRITE",
      slots: slotWithIdentity(
        {
          familyId: familyA,
          memberId: "mb_der_30",
          memberOrigin: "DERIVED_CUE_IMPACT",
          generatedFromMemberId: source.memberId,
          derivedRule: "CUE_IMPACT_FIRST_30PCT",
          derivedStep: "0.3",
        },
        { CO_f: 36, C1_f: 10, C3_r: 20 }
      ),
      saveWorkingDataset: (u) => {
        dataset = u;
      },
      setDataset: (u) => {
        dataset = u;
      },
    });
    const r = runSaveStrategy(after.ctx);
    expect(r.ok).toBe(true);
    expect(r.saveIntent).toBe("UPDATE");
    expect(r.familyId).toBe(familyA);
  });

  it("CASE 6 — Local DB recall → SAVE → NEW Family", () => {
    // Local DB clears editingPublishedFamilyId; draft may still carry familyId.
    let dataset: PositionRecord[] = [];
    const first = buildCtx({
      saveWorkingDataset: (u) => {
        dataset = u;
      },
      setDataset: (u) => {
        dataset = u;
      },
    });
    expect(runSaveStrategy(first.ctx).ok).toBe(true);
    const prior = authoredFrom(dataset)!;

    const after = buildCtx({
      dataset,
      editingPublishedFamilyId: null, // Local DB clears session
      saveCommand: "SAVE",
      slots: slotWithIdentity({
        familyId: prior.familyId,
        memberId: prior.memberId,
        memberOrigin: "AUTHORED",
      }),
      saveWorkingDataset: (u) => {
        dataset = u;
      },
      setDataset: (u) => {
        dataset = u;
      },
    });
    const r = runSaveStrategy(after.ctx);
    expect(r.ok).toBe(true);
    expect(r.saveIntent).toBe("CREATE");
    expect(r.familyId).not.toBe(prior.familyId);
  });

  it("CASE 7 — Local DB provenance unclear → OVERWRITE BLOCKED", () => {
    expect(
      canOverwritePublishedSourceFamily({ editingPublishedFamilyId: null })
    ).toBe(false);

    let dataset: PositionRecord[] = [];
    const first = buildCtx({
      saveWorkingDataset: (u) => {
        dataset = u;
      },
      setDataset: (u) => {
        dataset = u;
      },
    });
    expect(runSaveStrategy(first.ctx).ok).toBe(true);
    const prior = authoredFrom(dataset)!;

    // Draft has familyId but no trusted published session → block
    const after = buildCtx({
      dataset,
      editingPublishedFamilyId: null,
      saveCommand: "OVERWRITE",
      slots: slotWithIdentity({
        familyId: prior.familyId,
        memberId: prior.memberId,
        memberOrigin: "AUTHORED",
      }),
      saveWorkingDataset: (u) => {
        dataset = u;
      },
      setDataset: (u) => {
        dataset = u;
      },
    });
    const r = runSaveStrategy(after.ctx);
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("overwrite-missing-source-family");
  });

  it("CASE 8 — SAVE → PublishOperation CREATE", () => {
    let dataset: PositionRecord[] = [];
    const { ctx } = buildCtx({
      saveCommand: "SAVE",
      editingPublishedFamilyId: "fm_should_not_become_source",
      saveWorkingDataset: (u) => {
        dataset = u;
      },
      setDataset: (u) => {
        dataset = u;
      },
    });
    const r = runSaveStrategy(ctx);
    expect(r.publishOperation).toEqual({
      schemaVersion: 1,
      intent: "CREATE",
      sourceFamilyId: null,
      destinationFamilyId: r.familyId,
    });
  });

  it("CASE 9 — OVERWRITE → PublishOperation UPDATE", () => {
    let dataset: PositionRecord[] = [];
    const first = buildCtx({
      saveWorkingDataset: (u) => {
        dataset = u;
      },
      setDataset: (u) => {
        dataset = u;
      },
    });
    expect(runSaveStrategy(first.ctx).ok).toBe(true);
    const source = authoredFrom(dataset)!;

    const after = buildCtx({
      dataset,
      editingPublishedFamilyId: source.familyId!,
      saveCommand: "OVERWRITE",
      slots: slotWithIdentity({
        familyId: source.familyId,
        memberId: source.memberId,
        memberOrigin: "AUTHORED",
      }),
      saveWorkingDataset: (u) => {
        dataset = u;
      },
      setDataset: (u) => {
        dataset = u;
      },
    });
    const r = runSaveStrategy(after.ctx);
    expect(r.publishOperation).toEqual({
      schemaVersion: 1,
      intent: "UPDATE",
      sourceFamilyId: source.familyId,
      destinationFamilyId: source.familyId,
    });
  });

  it("CASE 10 — SAVE does not reuse source familyId/memberId as NEW identity", () => {
    let dataset: PositionRecord[] = [];
    const first = buildCtx({
      saveWorkingDataset: (u) => {
        dataset = u;
      },
      setDataset: (u) => {
        dataset = u;
      },
    });
    expect(runSaveStrategy(first.ctx).ok).toBe(true);
    const source = authoredFrom(dataset)!;

    const after = buildCtx({
      dataset,
      editingPublishedFamilyId: source.familyId!,
      saveCommand: "SAVE",
      slots: slotWithIdentity({
        familyId: source.familyId,
        memberId: source.memberId,
        memberOrigin: "AUTHORED",
      }),
      saveWorkingDataset: (u) => {
        dataset = u;
      },
      setDataset: (u) => {
        dataset = u;
      },
    });
    const r = runSaveStrategy(after.ctx);
    expect(r.ok).toBe(true);
    expect(r.familyId).not.toBe(source.familyId);
    const newest = dataset
      .flatMap((rec) => Object.values(rec.strategies))
      .find(
        (e) =>
          e?.familyId === r.familyId && e?.memberOrigin === "AUTHORED"
      );
    expect(newest?.memberId).toBeTruthy();
    expect(newest?.memberId).not.toBe(source.memberId);
    expect(newest?.familyId).toBe(r.familyId);
  });

  it("policy: draft familyId alone never auto-UPDATE", () => {
    expect(
      resolveFamilySaveIntent({
        explicitIdentity: {
          familyId: "fm_draft",
          memberId: "mb_draft",
          memberOrigin: "AUTHORED",
        },
        existingSlotEntry: {
          slot: "S1",
          signature: {
            systemId: "5_half_system",
            formulaHash: "h",
            shotType: "뒤돌리기",
          },
          sysInputs: {},
          familyId: "fm_draft",
          memberId: "mb_draft",
          memberOrigin: "AUTHORED",
          meta: { impact: { x: 0, y: 0 }, final: { x: 0, y: 0 } },
        },
      })
    ).toBe("CREATE");
  });
});
