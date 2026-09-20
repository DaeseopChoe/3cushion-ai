/**
 * Local DB Overwrite + Save Intent Split — CASE 1–16 contract tests.
 *
 * SSOT:
 * - SAVE = always CREATE NEW Family (any source)
 * - OVERWRITE = UPDATE trusted LOCAL or PUBLISHED source Family
 * - LOCAL UPDATE ≠ PUBLISHED UPDATE (PublishOperation)
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runSaveStrategy, type SaveFlowContext } from "../../application/flows/saveFlow";
import { resolveFamilySaveIntent } from "./familySavePolicy";
import {
  canOverwriteTrustedSourceFamily,
  resolveEditSourceKind,
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

function firstSave(): {
  dataset: PositionRecord[];
  source: NonNullable<ReturnType<typeof authoredFrom>>;
} {
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
  expect(source.familyId).toBeTruthy();
  return { dataset, source };
}

describe("Local Overwrite + Save Intent CASE 1–16", () => {
  it("CASE 1 — fresh SAVE → NEW Family", () => {
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

  it("CASE 2 — Local A → SAVE → NEW Local Family B; A preserved", () => {
    const { dataset: initial, source } = firstSave();
    let dataset = initial;
    const after = buildCtx({
      dataset,
      editingLocalFamilyId: source.familyId!,
      editingPublishedFamilyId: null,
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
    expect(r.saveIntent).toBe("CREATE");
    expect(r.familyId).not.toBe(source.familyId);
    expect(
      dataset.some((rec) =>
        Object.values(rec.strategies).some((e) => e?.familyId === source.familyId)
      )
    ).toBe(true);
  });

  it("CASE 3 — Local A → OVERWRITE → Local Family A UPDATE; no new family", () => {
    const { dataset: initial, source } = firstSave();
    let dataset = initial;
    const after = buildCtx({
      dataset,
      editingLocalFamilyId: source.familyId!,
      editingPublishedFamilyId: null,
      saveCommand: "OVERWRITE",
      slots: slotWithIdentity(
        {
          familyId: source.familyId,
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
    expect(r.overwriteSourceKind).toBe("LOCAL");
    expect(r.familyId).toBe(source.familyId);
    const authoredFamilies = new Set(
      dataset
        .flatMap((rec) => Object.values(rec.strategies))
        .filter((e) => e?.memberOrigin === "AUTHORED")
        .map((e) => e?.familyId)
    );
    expect(authoredFamilies.size).toBe(1);
    expect(authoredFamilies.has(source.familyId)).toBe(true);
  });

  it("CASE 4 — Local Derived(A) → SAVE → NEW Family B; A preserved", () => {
    const { dataset: initial, source } = firstSave();
    let dataset = initial;
    const after = buildCtx({
      dataset,
      editingLocalFamilyId: source.familyId!,
      saveCommand: "SAVE",
      slots: slotWithIdentity({
        familyId: source.familyId,
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
    expect(r.familyId).not.toBe(source.familyId);
  });

  it("CASE 5 — Local Derived(A) → OVERWRITE → Source Local Family A UPDATE", () => {
    const { dataset: initial, source } = firstSave();
    let dataset = initial;
    expect(
      resolveOverwriteSaveIntent({
        editingLocalFamilyId: source.familyId!,
        slotIdentity: {
          familyId: source.familyId!,
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
      editingLocalFamilyId: source.familyId!,
      saveCommand: "OVERWRITE",
      slots: slotWithIdentity(
        {
          familyId: source.familyId,
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
    expect(r.familyId).toBe(source.familyId);
    expect(r.overwriteSourceKind).toBe("LOCAL");
  });

  it("CASE 6 — Published A → SAVE → NEW Family B", () => {
    const { dataset: initial, source } = firstSave();
    let dataset = initial;
    const after = buildCtx({
      dataset,
      editingPublishedFamilyId: source.familyId!,
      editingLocalFamilyId: null,
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
    expect(r.saveIntent).toBe("CREATE");
    expect(r.familyId).not.toBe(source.familyId);
  });

  it("CASE 7 — Published A → OVERWRITE → Published Source A UPDATE", () => {
    const { dataset: initial, source } = firstSave();
    let dataset = initial;
    const after = buildCtx({
      dataset,
      editingPublishedFamilyId: source.familyId!,
      editingLocalFamilyId: null,
      saveCommand: "OVERWRITE",
      slots: slotWithIdentity(
        {
          familyId: source.familyId,
          memberId: source.memberId,
          memberOrigin: "AUTHORED",
        },
        { CO_f: 37, C1_f: 10, C3_r: 20 }
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
    expect(r.overwriteSourceKind).toBe("PUBLISHED");
    expect(r.familyId).toBe(source.familyId);
    expect(r.publishOperation?.intent).toBe("UPDATE");
    expect(r.publishOperation?.sourceFamilyId).toBe(source.familyId);
  });

  it("CASE 8 — Published Derived(A) → SAVE → NEW Family B", () => {
    const { dataset: initial, source } = firstSave();
    let dataset = initial;
    const after = buildCtx({
      dataset,
      editingPublishedFamilyId: source.familyId!,
      saveCommand: "SAVE",
      slots: slotWithIdentity({
        familyId: source.familyId,
        memberId: "mb_der_p",
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
    expect(r.familyId).not.toBe(source.familyId);
  });

  it("CASE 9 — Published Derived(A) → OVERWRITE → Published Source A UPDATE", () => {
    const { dataset: initial, source } = firstSave();
    let dataset = initial;
    const after = buildCtx({
      dataset,
      editingPublishedFamilyId: source.familyId!,
      saveCommand: "OVERWRITE",
      slots: slotWithIdentity({
        familyId: source.familyId,
        memberId: "mb_der_p",
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
    expect(r.saveIntent).toBe("UPDATE");
    expect(r.familyId).toBe(source.familyId);
    expect(r.publishOperation?.intent).toBe("UPDATE");
  });

  it("CASE 10 — source NONE → OVERWRITE BLOCK", () => {
    expect(
      canOverwriteTrustedSourceFamily({
        editingPublishedFamilyId: null,
        editingLocalFamilyId: null,
      })
    ).toBe(false);
    const { dataset: initial, source } = firstSave();
    let dataset = initial;
    const after = buildCtx({
      dataset,
      editingPublishedFamilyId: null,
      editingLocalFamilyId: null,
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
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("overwrite-missing-source-family");
  });

  it("CASE 11 — Local recall ownership sets LOCAL and clears PUBLISHED", () => {
    expect(
      resolveEditSourceKind({
        editingLocalFamilyId: "fm_loc",
        editingPublishedFamilyId: null,
      })
    ).toBe("LOCAL");
  });

  it("CASE 12 — Published recall ownership sets PUBLISHED and clears LOCAL", () => {
    expect(
      resolveEditSourceKind({
        editingPublishedFamilyId: "fm_pub",
        editingLocalFamilyId: null,
      })
    ).toBe("PUBLISHED");
  });

  it("CASE 13 — reset/new input clears both ownerships → NONE", () => {
    expect(
      resolveEditSourceKind({
        editingPublishedFamilyId: null,
        editingLocalFamilyId: null,
      })
    ).toBe("NONE");
  });

  it("CASE 14 — Local OVERWRITE does NOT create Published UPDATE PublishOperation", () => {
    const { dataset: initial, source } = firstSave();
    let dataset = initial;
    const after = buildCtx({
      dataset,
      editingLocalFamilyId: source.familyId!,
      editingPublishedFamilyId: null,
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
    expect(r.ok).toBe(true);
    expect(r.saveIntent).toBe("UPDATE");
    expect(r.overwriteSourceKind).toBe("LOCAL");
    expect(r.publishOperation).toEqual({
      schemaVersion: 1,
      intent: "CREATE",
      sourceFamilyId: null,
      destinationFamilyId: source.familyId,
    });
  });

  it("CASE 15 — Local A → SAVE does not reuse A familyId/memberId", () => {
    const { dataset: initial, source } = firstSave();
    let dataset = initial;
    const after = buildCtx({
      dataset,
      editingLocalFamilyId: source.familyId!,
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
        (e) => e?.familyId === r.familyId && e?.memberOrigin === "AUTHORED"
      );
    expect(newest?.memberId).not.toBe(source.memberId);
  });

  it("CASE 16 — Local A → OVERWRITE preserves A family identity", () => {
    const { dataset: initial, source } = firstSave();
    let dataset = initial;
    const after = buildCtx({
      dataset,
      editingLocalFamilyId: source.familyId!,
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
    expect(r.ok).toBe(true);
    expect(r.familyId).toBe(source.familyId);
    const kept = dataset
      .flatMap((rec) => Object.values(rec.strategies))
      .find(
        (e) =>
          e?.familyId === source.familyId && e?.memberOrigin === "AUTHORED"
      );
    expect(kept?.memberId).toBe(source.memberId);
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
