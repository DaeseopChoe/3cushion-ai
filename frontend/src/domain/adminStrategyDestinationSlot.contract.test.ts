/**
 * Phase F-3B — ADMIN Strategy Destination Slot + Edit Draft Preservation.
 *
 * Contract:
 * - ADMIN S1/S2/S3 during editing = SAVE destination (edit draft carried, not wiped)
 * - SAVE = CREATE (new familyId) into the selected destination slot
 * - failed SAVE (C-0) preserves edit draft + trusted session
 * - destination carry is runtime-only (no durable write / History / familyId mint)
 * - OVERWRITE only when the active slot still carries the trusted source Family
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runSaveStrategy, type SaveFlowContext } from "../application/flows/saveFlow";
import { runCanonicalSave } from "../application/flows/historyFlow";
import {
  carryEditDraftToDestinationSlot,
  resolveAdminStrategySlotSelection,
  slotHasEditDraft,
  type DestinationSlotsShape,
} from "./adminStrategyDestinationSlot";
import {
  canOverwriteTrustedSourceFamily,
  isOverwriteSourceAlignedWithSlot,
} from "./family/publishedEditSession";
import { createPositionId } from "./positionId";
import type { PositionRecord, StrategyEntry } from "./positionSearchEngine";

const __dirname = dirname(fileURLToPath(import.meta.url));

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
    snapshot: () => new Map(map),
  };
}

let storage: ReturnType<typeof createMemoryLocalStorage>;

beforeEach(() => {
  storage = createMemoryLocalStorage();
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("alert", vi.fn());
});

const positionA = {
  cue: { x: 10, y: 10 },
  target: { x: 40, y: 20 },
  second: { x: 60, y: 15 },
};

const positionB = {
  cue: { x: 22, y: 31 },
  target: { x: 47, y: 18 },
  second: { x: 63, y: 12 },
};

const seedInputs = { CO_f: 30, C1_f: 10, C3_r: 20 };

function slotSys(inputs: Record<string, number> = seedInputs) {
  return {
    systemId: "5_half_system",
    track: "B2T_L",
    inputs,
    outputs: { result: { ...inputs } },
  };
}

function adminStateFor(inputs: Record<string, number> = seedInputs) {
  return {
    sys: {
      system: "5_half_system",
      systemId: "5_half_system",
      system_id: "5_half_system",
      shotType: "뒤돌리기",
      track: "B2T_L",
      inputs,
      system_values: { ...inputs },
      corrections: { slide: 0, curve_ratio: 0, draw: 0, departure: 0, spin: 0 },
    },
    hpt: { T: "8/8" },
  };
}

type Harness = {
  dataset: PositionRecord[];
  setDataset: (u: PositionRecord[]) => void;
};

function harness(initial: PositionRecord[] = []): Harness {
  const h: Harness = {
    dataset: initial,
    setDataset: (u) => {
      h.dataset = u;
    },
  };
  return h;
}

function buildCtx(
  h: Harness,
  overrides: Partial<SaveFlowContext> = {}
): SaveFlowContext {
  return {
    dataset: h.dataset,
    ballsState: positionA,
    adminState: adminStateFor(),
    activeSlot: "S1",
    slots: {
      S1: {
        draft: { sys: slotSys(), hpt: { T: "8/8" } },
        applied: { sys: slotSys(), hpt: { T: "8/8" }, str: { speed: 1 }, ai: {} },
      },
      S2: { draft: null, applied: null },
      S3: { draft: null, applied: null },
    },
    targetColor: "red",
    aiOverride: null,
    system: "5_half_system",
    resolvedSlotSysValues: { ...seedInputs },
    autoSave: false,
    editSource: null,
    saveCommand: "SAVE",
    setDataset: h.setDataset,
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
}

function entriesOfFamily(dataset: PositionRecord[], familyId: string) {
  return dataset.flatMap((rec) =>
    (Object.entries(rec.strategies) as Array<[string, StrategyEntry | undefined]>)
      .filter(([, e]) => e?.familyId === familyId)
      .map(([slot, e]) => ({ slot, positionId: rec.positionId, entry: e! }))
  );
}

function authoredOf(dataset: PositionRecord[], familyId: string) {
  return entriesOfFamily(dataset, familyId).find(
    (x) => x.entry.memberOrigin === "AUTHORED"
  );
}

/** Seed Local corpus: Family A authored at Position A / S1. */
function seedFamilyA(h: Harness) {
  const r = runSaveStrategy(buildCtx(h));
  expect(r.ok).toBe(true);
  const familyA = r.familyId!;
  const authored = authoredOf(h.dataset, familyA)!;
  expect(authored.slot).toBe("S1");
  return { familyA, authored: authored.entry };
}

/** Recalled S1 working copy (as applyPositionRecall + Apply would leave it). */
function recalledSlots(
  identity: { familyId: string; memberId?: string },
  opts: { editedInputs?: Record<string, number>; aiText?: string } = {}
): DestinationSlotsShape {
  const inputs = opts.editedInputs ?? seedInputs;
  const idFields = {
    familyId: identity.familyId,
    memberId: identity.memberId,
    memberOrigin: "AUTHORED",
  };
  const content = {
    sys: slotSys(inputs),
    hpt: { T: "6/8", tip: { side: "L", count: 1 } },
    displayHpt: { T: "6/8" },
    str: { speed: 3, stroke: "follow" },
    ai: {
      text: opts.aiText ?? "원본 AI 코멘트",
      comments: ["두께 6/8", "팔로우"],
    },
    corrections: { slide: 1, curve_ratio: 0.2, draw: 0, departure: 0, spin: 1 },
    shotType: "뒤돌리기",
    system_values: { ...inputs },
    targetBall: "red",
    trajectoryExtensions: {
      extensionSchemaVersion: 1,
      origin: { kind: "path_node", source: "corrected" },
      items: [{ id: "ext1", endpoint: { x: 70, y: 30 } }],
    },
    reflectionOverride: { rail: "long", t: 0.42 },
    meta: { recommendedFrom: { positionId: createPositionId(positionA), score: 0 } },
  };
  return {
    S1: {
      draft: structuredClone({ ...content, ...idFields }),
      applied: structuredClone({ ...content, ...idFields }),
      balls: structuredClone(positionA),
    },
    S2: { draft: null, applied: null, balls: structuredClone(positionA) },
    S3: { draft: null, applied: null, balls: structuredClone(positionA) },
  };
}

const IDENTITY_KEYS = [
  "familyId",
  "memberId",
  "memberOrigin",
  "generatedFromMemberId",
  "symmetryOp",
];

function withoutIdentity(layer: Record<string, unknown> | null | undefined) {
  if (!layer) return layer;
  const copy = { ...layer };
  for (const k of IDENTITY_KEYS) delete copy[k];
  return copy;
}

function expectDraftPreserved(
  slots: DestinationSlotsShape,
  from: "S1" | "S2" | "S3",
  to: "S1" | "S2" | "S3"
) {
  const src = slots[from];
  const dst = slots[to];
  expect(withoutIdentity(dst.draft)).toEqual(withoutIdentity(src.draft));
  expect(withoutIdentity(dst.applied)).toEqual(withoutIdentity(src.applied));
  expect(dst.balls).toEqual(src.balls);
  for (const layer of [dst.draft, dst.applied]) {
    expect(layer?.sys).toBeTruthy();
    expect(layer?.hpt).toBeTruthy();
    expect(layer?.str).toBeTruthy();
    expect(layer?.ai).toBeTruthy();
    expect(layer?.corrections).toBeTruthy();
    expect(layer?.trajectoryExtensions).toBeTruthy();
    expect(layer?.reflectionOverride).toBeTruthy();
  }
}

describe("F-3B ADMIN destination slot — edit draft preservation", () => {
  it("TEST 1 — Search S1 → S2 → current draft unchanged", () => {
    const slots = recalledSlots({ familyId: "fm_a", memberId: "mb_a" });
    const next = carryEditDraftToDestinationSlot(slots, "S1", "S2");
    expectDraftPreserved(next, "S1", "S2");
    expect(next.S1).toEqual(slots.S1);
  });

  it("TEST 2 — Search S1 → edit → S2 → edited draft unchanged (all authored fields)", () => {
    const slots = recalledSlots(
      { familyId: "fm_a", memberId: "mb_a" },
      { editedInputs: { CO_f: 37, C1_f: 12, C3_r: 22 }, aiText: "수정된 AI 코멘트" }
    );
    const next = carryEditDraftToDestinationSlot(slots, "S1", "S2", {
      trajectoryExtensions: {
        extensionSchemaVersion: 1,
        origin: { kind: "path_node", source: "corrected" },
        items: [{ id: "ext_live", endpoint: { x: 81, y: 9 } }],
      },
      reflectionOverride: { rail: "short", t: 0.61 },
    });
    const s2 = next.S2;
    expect((s2.applied?.ai as { text: string }).text).toBe("수정된 AI 코멘트");
    expect((s2.applied?.sys as { inputs: Record<string, number> }).inputs).toEqual({
      CO_f: 37,
      C1_f: 12,
      C3_r: 22,
    });
    expect(s2.applied?.hpt).toEqual({ T: "6/8", tip: { side: "L", count: 1 } });
    expect(s2.applied?.str).toEqual({ speed: 3, stroke: "follow" });
    expect(s2.draft?.corrections).toEqual(slots.S1.draft?.corrections);
    expect(s2.balls).toEqual(positionA);
    // live runtime not mirrored into the slot container is carried too
    expect(s2.draft?.reflectionOverride).toEqual({ rail: "short", t: 0.61 });
    expect(s2.applied?.reflectionOverride).toEqual({ rail: "short", t: 0.61 });
    expect(
      (s2.draft?.trajectoryExtensions as { items: Array<{ id: string }> }).items[0].id
    ).toBe("ext_live");
    // destination is a new-Family candidate: no source identity copied
    expect(s2.draft?.familyId).toBeUndefined();
    expect(s2.applied?.familyId).toBeUndefined();
    expect(s2.applied?.memberId).toBeUndefined();
  });

  it("TEST 3/4/5/6/9/10 — edit → SAVE(S1) C-0 → S2 keeps draft → SAVE → new S2 Family", () => {
    const h = harness();
    const { familyA, authored } = seedFamilyA(h);
    const familyABefore = structuredClone(entriesOfFamily(h.dataset, familyA));

    const edited = recalledSlots(
      { familyId: familyA, memberId: authored.memberId },
      { editedInputs: { CO_f: 34, C1_f: 11, C3_r: 21 }, aiText: "S2용 수정 코멘트" }
    );
    const session = { editingLocalFamilyId: familyA, editingPublishedFamilyId: null };
    const slotsBeforeFail = structuredClone(edited);

    // STEP 3: SAVE while S1 selected → expected C-0
    const setDatasetSpy = vi.fn(h.setDataset);
    const patchIdentity = vi.fn();
    const failCtx = buildCtx(h, {
      ...session,
      activeSlot: "S1",
      slots: edited,
      adminState: adminStateFor({ CO_f: 34, C1_f: 11, C3_r: 21 }),
      setDataset: setDatasetSpy,
      patchSlotFamilyIdentity: patchIdentity,
    });
    const commitHistory = vi.fn(() => ({ ok: true }));
    const failed = runCanonicalSave({
      ...failCtx,
      canUseSystemControls: true,
      commitWorkspaceHistoryWithStrategyDataset: commitHistory,
    });
    expect(failed.ok).toBe(false);
    expect(failed.reason).toMatch(/POSITION_STRATEGY_SLOT_CONFLICT/);

    // TEST 9: failed SAVE keeps edit draft; no durable/History/identity side effects
    expect(edited).toEqual(slotsBeforeFail);
    expect(setDatasetSpy).not.toHaveBeenCalled();
    expect(patchIdentity).not.toHaveBeenCalled();
    expect(commitHistory).not.toHaveBeenCalled();
    expect(entriesOfFamily(h.dataset, familyA)).toEqual(familyABefore);

    // TEST 10: trusted session is not destroyed by the failure itself
    expect(canOverwriteTrustedSourceFamily(session)).toBe(true);
    expect(isOverwriteSourceAlignedWithSlot({ ...session, slot: edited.S1 })).toBe(true);

    // STEP 5: select S2 → same edited draft
    const afterS2 = carryEditDraftToDestinationSlot(edited, "S1", "S2");
    expectDraftPreserved(afterS2, "S1", "S2");
    expect((afterS2.S2.applied?.ai as { text: string }).text).toBe("S2용 수정 코멘트");

    // STEP 6: SAVE → NEW S2 Family
    const saved = runSaveStrategy(
      buildCtx(h, {
        ...session,
        activeSlot: "S2",
        slots: afterS2,
        adminState: adminStateFor({ CO_f: 34, C1_f: 11, C3_r: 21 }),
      })
    );
    expect(saved.ok).toBe(true);
    expect(saved.saveIntent).toBe("CREATE");
    const familyB = saved.familyId!;
    expect(familyB).toBeTruthy();
    expect(familyB).not.toBe(familyA);

    // TEST 4: S1 Family untouched
    expect(entriesOfFamily(h.dataset, familyA)).toEqual(familyABefore);

    // TEST 5: generated Family Members placed in S2 (writer contract: AUTHORED at the
    // preferred slot; symmetry members at the first free slot of their Position —
    // S1 is held by Family A's members, so S2)
    const familyBEntries = entriesOfFamily(h.dataset, familyB);
    expect(familyBEntries.length).toBeGreaterThan(1);
    for (const m of familyBEntries) expect(m.slot).toBe("S2");
    const authoredB = authoredOf(h.dataset, familyB)!;
    expect(authoredB.positionId).toBe(createPositionId(positionA));
    expect(authoredB.entry.ai).toEqual(afterS2.S2.applied?.ai);
    expect(authoredB.entry.sysInputs?.CO_f).toBe(34);

    // TEST 6: same Position holds S1 Family A + S2 Family B
    const shared = h.dataset.find((r) => r.positionId === createPositionId(positionA))!;
    expect(shared.strategies.S1?.familyId).toBe(familyA);
    expect(shared.strategies.S2?.familyId).toBe(familyB);
  });

  it("TEST 3b — S2 first, then edit, then SAVE gives the same result as edit-then-S2", () => {
    const h = harness();
    const { familyA, authored } = seedFamilyA(h);
    const recalled = recalledSlots({ familyId: familyA, memberId: authored.memberId });
    const afterS2 = carryEditDraftToDestinationSlot(recalled, "S1", "S2");
    // edit in S2 (Apply writes into the active slot container)
    afterS2.S2 = {
      ...afterS2.S2,
      applied: { ...afterS2.S2.applied, ai: { text: "S2에서 수정", comments: [] } },
    };
    const saved = runSaveStrategy(
      buildCtx(h, {
        editingLocalFamilyId: familyA,
        activeSlot: "S2",
        slots: afterS2,
      })
    );
    expect(saved.ok).toBe(true);
    expect(saved.saveIntent).toBe("CREATE");
    expect(saved.familyId).not.toBe(familyA);
    expect(authoredOf(h.dataset, saved.familyId!)!.slot).toBe("S2");
    expect(authoredOf(h.dataset, saved.familyId!)!.entry.ai).toEqual({
      text: "S2에서 수정",
      comments: [],
    });
  });

  it("TEST 7 — same Position + same S1, different Family → C-0 still rejects", () => {
    const h = harness();
    const { familyA } = seedFamilyA(h);
    const before = structuredClone(h.dataset);
    const r = runSaveStrategy(buildCtx(h, { activeSlot: "S1" }));
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/POSITION_STRATEGY_SLOT_CONFLICT/);
    expect(h.dataset).toEqual(before);
    expect(authoredOf(h.dataset, familyA)!.slot).toBe("S1");
  });

  it("TEST 8 — S2 click alone: no durable write, no History, no familyId mint, input not mutated", () => {
    const h = harness();
    const { familyA, authored } = seedFamilyA(h);
    const storageBefore = storage.snapshot();
    const datasetBefore = structuredClone(h.dataset);
    const slots = recalledSlots({ familyId: familyA, memberId: authored.memberId });
    const inputBefore = structuredClone(slots);

    const next = carryEditDraftToDestinationSlot(slots, "S1", "S2");

    expect(storage.snapshot()).toEqual(storageBefore);
    expect(h.dataset).toEqual(datasetBefore);
    expect(slots).toEqual(inputBefore);
    expect(next.S1.draft?.familyId).toBe(familyA);
    expect(next.S2.draft?.familyId).toBeUndefined();
    expect(next.S2.applied?.familyId).toBeUndefined();
    expect(next.S2.applied?.memberId).toBeUndefined();
  });

  it("TEST 10b — S2 selected: OVERWRITE cannot touch recalled S1; back to S1 restores eligibility", () => {
    const h = harness();
    const { familyA, authored } = seedFamilyA(h);
    const familyABefore = structuredClone(entriesOfFamily(h.dataset, familyA));
    const session = { editingLocalFamilyId: familyA, editingPublishedFamilyId: null };
    const recalled = recalledSlots(
      { familyId: familyA, memberId: authored.memberId },
      { aiText: "수정" }
    );
    const afterS2 = carryEditDraftToDestinationSlot(recalled, "S1", "S2");

    expect(isOverwriteSourceAlignedWithSlot({ ...session, slot: afterS2.S2 })).toBe(false);
    const blocked = runSaveStrategy(
      buildCtx(h, {
        ...session,
        saveCommand: "OVERWRITE",
        activeSlot: "S2",
        slots: afterS2,
      })
    );
    expect(blocked.ok).toBe(false);
    expect(entriesOfFamily(h.dataset, familyA)).toEqual(familyABefore);

    // S2 → S1: destination S1 keeps its own (source) identity
    const backToS1 = carryEditDraftToDestinationSlot(afterS2, "S2", "S1");
    expect(backToS1.S1.applied?.familyId).toBe(familyA);
    expect(backToS1.S1.applied?.memberId).toBe(authored.memberId);
    expect(isOverwriteSourceAlignedWithSlot({ ...session, slot: backToS1.S1 })).toBe(true);
  });

  it("destination with its own recalled Family keeps that identity (never adopts source)", () => {
    const slots = recalledSlots({ familyId: "fm_a", memberId: "mb_a" });
    slots.S2 = {
      draft: { sys: slotSys(), familyId: "fm_b", memberId: "mb_b", memberOrigin: "AUTHORED" },
      applied: null,
      balls: structuredClone(positionA),
    };
    const next = carryEditDraftToDestinationSlot(slots, "S1", "S2");
    expect(next.S2.draft?.familyId).toBe("fm_b");
    expect(next.S2.applied?.familyId).toBe("fm_b");
    expect(next.S2.applied?.memberId).toBe("mb_b");
    expect(withoutIdentity(next.S2.applied)).toEqual(withoutIdentity(slots.S1.applied));
    expect(
      isOverwriteSourceAlignedWithSlot({ editingLocalFamilyId: "fm_a", slot: next.S2 })
    ).toBe(false);
  });

  it("TEST 11 — Position A → ball move to Position B: OVERWRITE off, content reused, SAVE creates Position B Family", () => {
    const h = harness();
    const { familyA, authored } = seedFamilyA(h);
    const familyABefore = structuredClone(entriesOfFamily(h.dataset, familyA));
    const recalled = recalledSlots(
      { familyId: familyA, memberId: authored.memberId },
      { aiText: "Position B 기반 코멘트" }
    );
    // ball move clears the trusted edit session (existing App policy)
    const clearedSession = { editingLocalFamilyId: null, editingPublishedFamilyId: null };
    expect(canOverwriteTrustedSourceFamily(clearedSession)).toBe(false);
    expect(isOverwriteSourceAlignedWithSlot({ ...clearedSession, slot: recalled.S1 })).toBe(false);

    const saved = runSaveStrategy(
      buildCtx(h, {
        ...clearedSession,
        ballsState: positionB,
        activeSlot: "S1",
        slots: recalled,
      })
    );
    expect(saved.ok).toBe(true);
    expect(saved.saveIntent).toBe("CREATE");
    expect(saved.familyId).not.toBe(familyA);
    const authoredB = authoredOf(h.dataset, saved.familyId!)!;
    expect(authoredB.positionId).toBe(createPositionId(positionB));
    expect(authoredB.slot).toBe("S1");
    expect(authoredB.entry.ai).toEqual(recalled.S1.applied?.ai);
    expect(entriesOfFamily(h.dataset, familyA)).toEqual(familyABefore);

    const app = readFileSync(join(__dirname, "../App.jsx"), "utf8");
    const ballInvalidate = app.slice(
      app.indexOf("function invalidateSavedAndRecalledForBallId"),
      app.indexOf("function applyBallCenterDirectInput")
    );
    expect(ballInvalidate).toContain("clearPublishedEditSession()");
  });

  it("TEST 12 — selection policy: only ADMIN editing carries; USER/review/empty/same slot navigate", () => {
    const filled = recalledSlots({ familyId: "fm_a" }).S1;
    const base = { fromSlot: "S1", toSlot: "S2", fromSlotContainer: filled };
    expect(resolveAdminStrategySlotSelection({ ...base, appMode: "ADMIN" })).toBe(
      "CARRY_EDIT_DRAFT"
    );
    expect(resolveAdminStrategySlotSelection({ ...base, appMode: "USER" })).toBe("NAVIGATE");
    expect(
      resolveAdminStrategySlotSelection({ ...base, appMode: "ADMIN", derivedReviewPending: true })
    ).toBe("NAVIGATE");
    expect(
      resolveAdminStrategySlotSelection({ ...base, appMode: "ADMIN", toSlot: "S1" })
    ).toBe("NAVIGATE");
    expect(
      resolveAdminStrategySlotSelection({
        ...base,
        appMode: "ADMIN",
        fromSlotContainer: { draft: { targetBall: "red" }, applied: null },
      })
    ).toBe("NAVIGATE");
    expect(slotHasEditDraft({ draft: { targetBall: "red" }, applied: null })).toBe(false);
    expect(slotHasEditDraft(filled)).toBe(true);
  });

  it("wiring — App slot effect carries in ADMIN, keeps switchSlot fallback and USER hydrate gate", () => {
    const app = readFileSync(join(__dirname, "../App.jsx"), "utf8");
    const hook = readFileSync(join(__dirname, "../hooks/useShotSlots.ts"), "utf8");
    expect(app).toContain("resolveAdminStrategySlotSelection");
    expect(app).toContain("actions.selectDestinationSlotWithEditDraft(currentButtonId");
    expect(app).toContain("actions.switchSlot(currentButtonId)");
    expect(app).toMatch(
      /if \(appMode === "USER"\) return;\s*lastHydrateTriggerRef\.current = "slot_switch";/
    );
    expect(app).toContain("isOverwriteSourceAlignedWithSlot");
    expect(app).toContain("!canOverwriteActiveSlot");
    expect(app).toContain("OVERWRITE_SLOT_MISMATCH_USER_MESSAGE");
    expect(hook).toContain("selectDestinationSlotWithEditDraft");
    expect(hook).toContain("carryEditDraftToDestinationSlot(");
  });
});
