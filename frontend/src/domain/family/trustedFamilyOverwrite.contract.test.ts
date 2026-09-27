/**
 * Phase F-3C — Trusted Family OVERWRITE + Recall Position Difference Notice.
 *
 * 4 Track = one real Position/strategy in four orientations. OVERWRITE edits the
 * trusted Family (AUTHORED root geometry preserved) — never promotes the recalled
 * SYMMETRY / DERIVED Member and never relocates the Family to the approximate
 * query. SAVE = CREATE a new Family at the current screen Position.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { runAdminLocalDbRecall } from "../../application/flows/adminLocalDbFlow";
import { runAdminSearch } from "../../application/flows/adminSearchFlow";
import { runSaveStrategy, type SaveFlowContext } from "../../application/flows/saveFlow";
import { persistWorkingCorpusNormalizedAuthority } from "../dataset/infra/persistWorkingCorpusNormalizedAuthority";
import { createPositionId } from "../positionId";
import type { Ball3, PositionRecord, StrategyEntry } from "../positionSearchEngine";
import { __clearPublishedDatasetStoreForTests } from "../publishedDatasetStore";
import {
  draftFamilyIdentityFromStrategyEntry,
  draftRuntimeFieldsFromStrategyEntry,
  runtimeHptFromStrategyEntry,
  strategyEntryToSlotDraftSys,
} from "../slotDraftFromEntry";
import { familyWriteCandidateFromEntry, writeFamilyMembers } from "./familyAwareWriter";
import {
  FAMILY_TRACKS,
  mapFamilyTrack,
  transformBall3,
  transformReflectionOverride,
  transformTrajectoryExtensions,
  type FamilyTrack,
} from "./trackSymmetry";
import type { ReflectionOverride } from "../trajectory/c2ReflectionOverride";
import {
  computeRecallPositionDifference,
  formatRecallPositionDifferenceNotice,
  isRecallPositionExact,
} from "../recall/recallPositionDifference";
import {
  canOverwriteTrustedSourceFamily,
  shouldClearOverwriteEligibilityOnBallEdit,
} from "./publishedEditSession";

type Slot = "S1" | "S2" | "S3";
const SLOTS: Slot[] = ["S1", "S2", "S3"];

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

let storage: ReturnType<typeof createMemoryLocalStorage>;
let alerts: string[];

beforeEach(() => {
  storage = createMemoryLocalStorage();
  vi.stubGlobal("localStorage", storage);
  alerts = [];
  vi.stubGlobal("alert", (m: unknown) => {
    alerts.push(String(m));
  });
  __clearPublishedDatasetStoreForTests();
});

afterEach(() => {
  __clearPublishedDatasetStoreForTests();
  vi.unstubAllGlobals();
});

const positionA: Ball3 = {
  cue: { x: 10, y: 10 },
  target: { x: 40, y: 20 },
  second: { x: 60, y: 15 },
};

const seedInputs = { CO_f: 30, C1_f: 10, C3_r: 20 };
const editedInputs = { CO_f: 34, C1_f: 11, C3_r: 23 };
const seedHpt = { T: "+3/8", hit_point: { x: -2, y: 1 }, mode: "TIP", tipCount: 1 };

function slotSys(track: string, inputs: Record<string, number> = seedInputs) {
  return {
    systemId: "5_half_system",
    track,
    inputs,
    outputs: { result: { ...inputs } },
  };
}

function adminStateFor(
  track: string,
  inputs: Record<string, number> = seedInputs,
  shotType = "뒤돌리기"
) {
  return {
    sys: {
      system: "5_half_system",
      systemId: "5_half_system",
      system_id: "5_half_system",
      shotType,
      track,
      inputs,
      system_values: { ...inputs },
      corrections: { slide: 0, curve_ratio: 0, draw: 0, departure: 0, spin: 0 },
    },
    hpt: { T: "8/8" },
  };
}

type Harness = { dataset: PositionRecord[]; setDataset: (u: PositionRecord[]) => void };

function harness(initial: PositionRecord[] = []): Harness {
  const h: Harness = {
    dataset: initial,
    setDataset: (u) => {
      h.dataset = u;
    },
  };
  return h;
}

function baseCtx(h: Harness, overrides: Partial<SaveFlowContext>): SaveFlowContext {
  return {
    dataset: h.dataset,
    ballsState: positionA,
    adminState: adminStateFor("B2T_L"),
    activeSlot: "S1",
    slots: {},
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

/** First SAVE — CREATE a 4-Track Family at `balls` in `slot`. */
function seedFamily(
  h: Harness,
  opts: {
    slot?: Slot;
    track?: FamilyTrack;
    balls?: Ball3;
    shotType?: string;
    extensions?: StrategyEntry["trajectoryExtensions"];
    c2?: ReflectionOverride;
  } = {}
): string {
  const slot = opts.slot ?? "S1";
  const track = opts.track ?? "B2T_L";
  const layer = {
    sys: slotSys(track),
    hpt: seedHpt,
    str: { speed: 1 },
    ai: { text: "원본 공략" },
  };
  const r = runSaveStrategy(
    baseCtx(h, {
      ballsState: opts.balls ?? positionA,
      adminState: adminStateFor(track, seedInputs, opts.shotType),
      activeSlot: slot,
      slots: {
        S1: { draft: null, applied: null },
        S2: { draft: null, applied: null },
        S3: { draft: null, applied: null },
        [slot]: { draft: layer, applied: layer },
      },
      trajectoryExtensionPayload: opts.extensions ?? null,
      reflectionOverridePayload: opts.c2 ?? null,
    })
  );
  expect(r.ok, r.reason).toBe(true);
  expect(r.saveIntent).toBe("CREATE");
  return r.familyId!;
}

type FamilyLoc = { slot: Slot; positionId: string; balls: Ball3; entry: StrategyEntry };

function entriesOfFamily(dataset: PositionRecord[], familyId: string): FamilyLoc[] {
  return dataset.flatMap((rec) =>
    (Object.entries(rec.strategies) as Array<[Slot, StrategyEntry | undefined]>)
      .filter(([, e]) => e?.familyId === familyId)
      .map(([slot, e]) => ({ slot, positionId: rec.positionId, balls: rec.balls, entry: e! }))
  );
}

function fourTrack(dataset: PositionRecord[], familyId: string): FamilyLoc[] {
  return entriesOfFamily(dataset, familyId).filter(
    (l) => l.entry.memberOrigin === "AUTHORED" || l.entry.memberOrigin === "SYMMETRY"
  );
}

function locByOp(dataset: PositionRecord[], familyId: string, op: "AUTHORED" | "H" | "V" | "RPI") {
  return fourTrack(dataset, familyId).find((l) =>
    op === "AUTHORED" ? l.entry.memberOrigin === "AUTHORED" : l.entry.symmetryOp === op
  )!;
}

function geometrySnapshot(locs: FamilyLoc[]) {
  return locs
    .map((l) => ({
      positionId: l.positionId,
      balls: l.balls,
      slot: l.slot,
      memberId: l.entry.memberId,
      memberOrigin: l.entry.memberOrigin,
      symmetryOp: l.entry.symmetryOp ?? null,
      generatedFromMemberId: l.entry.generatedFromMemberId ?? null,
      track: l.entry.track,
    }))
    .sort((a, b) => a.positionId.localeCompare(b.positionId));
}

function expectFourTrackFamily(
  dataset: PositionRecord[],
  familyId: string,
  slot: Slot,
  authoredBalls: Ball3 = positionA,
  authoredTrack: FamilyTrack = "B2T_L"
) {
  const locs = fourTrack(dataset, familyId);
  expect(locs).toHaveLength(4);
  for (const l of locs) expect(l.slot).toBe(slot);
  const authored = locs.filter((l) => l.entry.memberOrigin === "AUTHORED");
  expect(authored).toHaveLength(1);
  expect(authored[0].balls).toEqual(authoredBalls);
  expect(authored[0].positionId).toBe(createPositionId(authoredBalls));
  expect(authored[0].entry.track).toBe(authoredTrack);
  for (const op of ["H", "V", "RPI"] as const) {
    const sym = locs.find((l) => l.entry.symmetryOp === op)!;
    expect(sym.balls).toEqual(transformBall3(op, authoredBalls));
    expect(sym.entry.track).toBe(mapFamilyTrack(authoredTrack, op));
    expect(sym.entry.generatedFromMemberId).toBe(authored[0].entry.memberId);
  }
  expect(new Set(locs.map((l) => l.entry.track))).toEqual(new Set(FAMILY_TRACKS));
  return locs;
}

function persistLocal(h: Harness, shotType = "뒤돌리기") {
  const r = persistWorkingCorpusNormalizedAuthority({
    dataset: h.dataset,
    shotType,
    systemId: "5_half_system",
  });
  expect(r.ok, r.ok ? "" : `${r.stage}: ${r.reason}`).toBe(true);
}

type DerivedOrigin = "DERIVED_CUE_IMPACT" | "DERIVED_C3_PLUS" | "DERIVED_CUE_C3_PRODUCT";
const DERIVED_RULE: Record<DerivedOrigin, StrategyEntry["derivedRule"]> = {
  DERIVED_CUE_IMPACT: "CUE_IMPACT_FIRST_30PCT",
  DERIVED_C3_PLUS: "C3_PLUS_SCORING_LINE_v1",
  DERIVED_CUE_C3_PRODUCT: "CUE_C3_CARTESIAN_PRODUCT_V1",
};

/**
 * Add one Derived Member generated from `base` at `derivedBalls`, following the generation
 * rules: C3+ / Product copy the same-track base C2 + Extension; Cue→Impact carries neither.
 */
function addDerived(
  h: Harness,
  familyId: string,
  base: FamilyLoc,
  derivedBalls: Ball3,
  n = 1,
  origin: DerivedOrigin = "DERIVED_CUE_IMPACT"
) {
  const entry: StrategyEntry = {
    ...structuredClone(base.entry),
    memberId: `mb_derived_${n}`,
    memberOrigin: origin,
    generatedFromMemberId: base.entry.memberId,
    derivedRule: DERIVED_RULE[origin],
    derivedStep: `step:000${n}`,
    authoringStrategyId: `as_derived_${n}`,
  };
  delete entry.symmetryOp;
  if (origin === "DERIVED_CUE_IMPACT") {
    delete entry.reflectionOverride;
    delete entry.trajectoryExtensions;
  }
  const candidate = familyWriteCandidateFromEntry({ balls: derivedBalls, entry })!;
  expect(candidate).toBeTruthy();
  const w = writeFamilyMembers(h.dataset, { familyId, members: [candidate] });
  expect(w.ok, w.ok ? "" : w.reason).toBe(true);
  if (!w.ok) throw new Error(w.reason);
  h.dataset = w.dataset;
  persistLocal(h);
  return entriesOfFamily(h.dataset, familyId).find((l) => l.entry.memberId === entry.memberId)!;
}

/** useShotSlots.buildDraftsFromRecord equivalent (Recall → slot drafts). */
function draftsFromRecord(record: PositionRecord): Record<string, Record<string, unknown>> {
  const map: Record<string, Record<string, unknown>> = {};
  for (const slotId of SLOTS) {
    const entry = record.strategies[slotId];
    if (!entry) continue;
    const runtime = draftRuntimeFieldsFromStrategyEntry(entry);
    map[slotId] = {
      sys: strategyEntryToSlotDraftSys(entry),
      hpt: runtimeHptFromStrategyEntry(entry),
      str: entry.str,
      ai: entry.ai,
      ...draftFamilyIdentityFromStrategyEntry(entry),
      corrections: runtime.corrections,
      shotType: runtime.shotType,
      system_values: runtime.system_values,
      targetBall: record.targetBall ?? null,
      ...(runtime.trajectoryExtensions ? { trajectoryExtensions: runtime.trajectoryExtensions } : {}),
      ...(runtime.reflectionOverride ? { reflectionOverride: runtime.reflectionOverride } : {}),
    };
  }
  return map;
}

type RecallCapture = {
  matched: boolean;
  record: PositionRecord | null;
  drafts: Record<string, Record<string, unknown>>;
  screenBalls: Ball3 | null;
  localFamilyId: string | null;
  publishedFamilyId: string | null;
  overwriteRecallContext: unknown;
  alerts: string[];
};

function recallCallbacks(cap: RecallCapture) {
  return {
    setAdminState: vi.fn(),
    setIsAdminPublishedSearchMatched: vi.fn(),
    setEditingPublishedFamilyId: (id: string | null) => {
      cap.publishedFamilyId = id;
    },
    setEditingLocalFamilyId: (id: string | null) => {
      cap.localFamilyId = id;
    },
    setOverwriteRecallContext: (c: unknown) => {
      cap.overwriteRecallContext = c;
    },
    setAdminTableLayersVisible: vi.fn(),
    setShowCoaching: vi.fn(),
    setIsAdminInputSessionActive: vi.fn(),
    hydrateAdminRecallTarget: vi.fn(),
    setBallsState: (b: unknown) => {
      cap.screenBalls = structuredClone(b) as Ball3;
    },
    applyPositionRecall: (rec: PositionRecord) => {
      cap.record = rec;
      cap.drafts = draftsFromRecord(rec);
    },
    patchSlotRuntimeMeta: vi.fn(),
    clearAdminSearchDisplayRuntime: vi.fn(),
    beginAdminInputSession: () => true,
    getAdminRecallQueryTargetBall: () => null,
    rejectAdminRecallHydrateForMismatch: () => false,
    resolveFormulaHash: () => "test_hash",
  };
}

function emptyCapture(): RecallCapture {
  return {
    matched: false,
    record: null,
    drafts: {},
    screenBalls: null,
    localFamilyId: null,
    publishedFamilyId: null,
    overwriteRecallContext: null,
    alerts: [],
  };
}

async function localRecall(query: Ball3, activeSlot: Slot = "S1"): Promise<RecallCapture> {
  const cap = emptyCapture();
  const before = alerts.length;
  cap.matched = await runAdminLocalDbRecall({
    ballsState: query as unknown as Record<string, unknown>,
    adminState: adminStateFor("B2T_L"),
    activeSlot,
    slots: {},
    isTargetSelected: false,
    targetColor: null,
    ...recallCallbacks(cap),
  } as never);
  cap.alerts = alerts.slice(before);
  return cap;
}

async function publishedRecall(
  records: PositionRecord[],
  query: Ball3,
  activeSlot: Slot = "S1"
): Promise<RecallCapture> {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        schemaVersion: 2,
        shotType: "옆돌리기",
        systemId: "5_half_system",
        systemLabel: "파이브앤하프",
        records,
      }),
    })
  );
  const cap = emptyCapture();
  const before = alerts.length;
  cap.matched = await runAdminSearch({
    ballsState: query as unknown as Record<string, unknown>,
    adminState: adminStateFor("B2T_L", seedInputs, "옆돌리기"),
    activeSlot,
    slots: {},
    isTargetSelected: false,
    targetColor: null,
    userPublishedSearchContext: { shotType: null, systemId: null },
    ...recallCallbacks(cap),
  } as never);
  cap.alerts = alerts.slice(before);
  return cap;
}

type EditOptions = {
  ai?: string;
  inputs?: Record<string, number>;
  hpt?: unknown;
  extensions?: StrategyEntry["trajectoryExtensions"] | null;
  /** C2 on the screen at OVERWRITE/SAVE (default: the recalled slot's C2, as App hydrates it). */
  c2?: ReflectionOverride | null;
  shotType?: string;
};

/** ADMIN edits the recalled slot, then presses OVERWRITE (or SAVE). */
function pressAfterRecall(
  h: Harness,
  rc: RecallCapture,
  slot: Slot,
  command: "OVERWRITE" | "SAVE",
  edit: EditOptions = {},
  session: { local?: string | null; published?: string | null } = {
    local: rc.localFamilyId,
    published: rc.publishedFamilyId,
  }
) {
  const draft = rc.drafts[slot];
  expect(draft, `recalled draft for ${slot}`).toBeTruthy();
  const track = (draft.sys as { track: string }).track;
  const inputs = edit.inputs ?? seedInputs;
  const applied = {
    ...structuredClone(draft),
    sys: slotSys(track, inputs),
    ai: { text: edit.ai ?? "수정된 공략" },
    ...(edit.hpt !== undefined ? { hpt: edit.hpt } : {}),
  };
  const slots: Record<string, unknown> = {
    S1: { draft: null, applied: null },
    S2: { draft: null, applied: null },
    S3: { draft: null, applied: null },
  };
  for (const s of SLOTS) {
    if (rc.drafts[s]) slots[s] = { draft: structuredClone(rc.drafts[s]), applied: null };
  }
  slots[slot] = { draft: structuredClone(draft), applied };
  const patchIdentity = vi.fn();
  const ctx = baseCtx(h, {
    ballsState: rc.screenBalls as unknown as Record<string, unknown>,
    adminState: adminStateFor(track, inputs, edit.shotType),
    activeSlot: slot,
    slots,
    saveCommand: command,
    editingLocalFamilyId: session.local ?? null,
    editingPublishedFamilyId: session.published ?? null,
    overwriteRecallContext: rc.overwriteRecallContext,
    trajectoryExtensionPayload:
      edit.extensions !== undefined
        ? edit.extensions
        : ((draft.trajectoryExtensions as StrategyEntry["trajectoryExtensions"]) ?? null),
    reflectionOverridePayload:
      edit.c2 !== undefined
        ? edit.c2
        : ((draft.reflectionOverride as ReflectionOverride | undefined) ?? null),
    patchSlotFamilyIdentity: patchIdentity,
  } as Partial<SaveFlowContext>);
  const result = runSaveStrategy(ctx);
  return { result, ctx, patchIdentity };
}

function shift(balls: Ball3, d: { cue?: [number, number]; target?: [number, number]; second?: [number, number] }): Ball3 {
  const mv = (p: { x: number; y: number }, v?: [number, number]) =>
    v ? { x: p.x + v[0], y: p.y + v[1] } : { ...p };
  return { cue: mv(balls.cue, d.cue), target: mv(balls.target, d.target), second: mv(balls.second, d.second) };
}

const NOTICE_HEAD = "유사한 공략을 찾았습니다.";

// ---------------------------------------------------------------------------
// Test-first regressions (F-3C.0 root causes)
// ---------------------------------------------------------------------------

describe("F-3C — trusted Family root OVERWRITE (Local)", () => {
  it("TEST 1 — AUTHORED exact Recall → OVERWRITE keeps the same root", async () => {
    const h = harness();
    const familyId = seedFamily(h);
    const before = geometrySnapshot(fourTrack(h.dataset, familyId));
    const rc = await localRecall(positionA);
    expect(rc.matched).toBe(true);
    expect(rc.localFamilyId).toBe(familyId);

    const { result } = pressAfterRecall(h, rc, "S1", "OVERWRITE", { ai: "수정 1" });
    expect(result.ok, result.reason).toBe(true);
    expect(result.saveIntent).toBe("UPDATE");
    expect(geometrySnapshot(fourTrack(h.dataset, familyId))).toEqual(before);
    for (const l of fourTrack(h.dataset, familyId)) expect(l.entry.ai).toEqual({ text: "수정 1" });
    expect(h.dataset).toHaveLength(4);
  });

  it("TEST 2 — AUTHORED approximate Search → OVERWRITE preserves the stored root (no relocation)", async () => {
    const h = harness();
    const familyId = seedFamily(h);
    const before = geometrySnapshot(fourTrack(h.dataset, familyId));
    const q = shift(positionA, { cue: [1.2, 0.5], target: [0.3, -0.4] });
    const rc = await localRecall(q);
    expect(rc.matched).toBe(true);
    expect(rc.record?.balls).toEqual(positionA);
    expect(rc.screenBalls).toEqual(q);

    const { result } = pressAfterRecall(h, rc, "S1", "OVERWRITE", { ai: "근사 덮어쓰기" });
    expect(result.ok, result.reason).toBe(true);
    expect(geometrySnapshot(fourTrack(h.dataset, familyId))).toEqual(before);
    expect(h.dataset.some((r) => r.positionId === createPositionId(q))).toBe(false);
    expect(locByOp(h.dataset, familyId, "AUTHORED").entry.ai).toEqual({ text: "근사 덮어쓰기" });
  });

  it("TEST 3 — AUTHORED approximate Search → SAVE creates a new Family at Q; A untouched", async () => {
    const h = harness();
    const familyA = seedFamily(h);
    const aBefore = structuredClone(entriesOfFamily(h.dataset, familyA));
    const q = shift(positionA, { cue: [1.2, 0.5], target: [0.3, -0.4] });
    const rc = await localRecall(q);

    const { result } = pressAfterRecall(h, rc, "S1", "SAVE", { ai: "새 공략" });
    expect(result.ok, result.reason).toBe(true);
    expect(result.saveIntent).toBe("CREATE");
    expect(result.familyId).not.toBe(familyA);
    expectFourTrackFamily(h.dataset, result.familyId!, "S1", q);
    expect(entriesOfFamily(h.dataset, familyA)).toEqual(aBefore);
  });

  it("TEST 4 — SYMMETRY exact Recall → OVERWRITE: no self-conflict, geometry preserved", async () => {
    const h = harness();
    const familyId = seedFamily(h);
    const before = geometrySnapshot(fourTrack(h.dataset, familyId));
    const hLoc = locByOp(h.dataset, familyId, "H");
    const rc = await localRecall(hLoc.balls);
    expect(rc.record?.strategies.S1?.symmetryOp).toBe("H");

    const { result } = pressAfterRecall(h, rc, "S1", "OVERWRITE", { ai: "대칭에서 수정" });
    expect(result.ok, result.reason).toBe(true);
    expect(result.reason ?? "").not.toMatch(/POSITION_STRATEGY_SLOT_CONFLICT/);
    expect(geometrySnapshot(fourTrack(h.dataset, familyId))).toEqual(before);
    for (const l of fourTrack(h.dataset, familyId)) expect(l.entry.ai).toEqual({ text: "대칭에서 수정" });
    expect(h.dataset).toHaveLength(4);
  });

  it("TEST 5 — SYMMETRY approximate Search → difference vs SYMMETRY member; root preserved", async () => {
    const h = harness();
    const familyId = seedFamily(h);
    const before = geometrySnapshot(fourTrack(h.dataset, familyId));
    const vLoc = locByOp(h.dataset, familyId, "V");
    const q = shift(vLoc.balls, { cue: [0.6, -0.8] });
    const rc = await localRecall(q);
    expect(rc.record?.balls).toEqual(vLoc.balls);
    const notice = rc.alerts.find((a) => a.includes(NOTICE_HEAD));
    expect(notice).toBeTruthy();
    expect(notice).toContain("내공: 1.0");
    expect(notice).toContain("앞공: 0.0");
    expect(notice).toContain("뒷공: 0.0");

    const { result } = pressAfterRecall(h, rc, "S1", "OVERWRITE", { ai: "V 근사" });
    expect(result.ok, result.reason).toBe(true);
    expect(geometrySnapshot(fourTrack(h.dataset, familyId))).toEqual(before);
  });

  it("TEST 6 — DERIVED exact Recall → OVERWRITE: Derived not promoted, no self-conflict", async () => {
    const h = harness();
    const familyId = seedFamily(h);
    const authored = locByOp(h.dataset, familyId, "AUTHORED");
    const dBalls = shift(positionA, { cue: [4, 2] });
    const derived = addDerived(h, familyId, authored, dBalls);
    const before4 = geometrySnapshot(fourTrack(h.dataset, familyId));
    const derivedBefore = structuredClone(derived);

    const rc = await localRecall(dBalls, derived.slot);
    expect(rc.record?.strategies[derived.slot]?.memberOrigin).toBe("DERIVED_CUE_IMPACT");

    const { result } = pressAfterRecall(h, rc, derived.slot, "OVERWRITE", { ai: "파생에서 수정" });
    expect(result.ok, result.reason).toBe(true);
    expect(geometrySnapshot(fourTrack(h.dataset, familyId))).toEqual(before4);
    const d = entriesOfFamily(h.dataset, familyId).find((l) => l.entry.memberId === "mb_derived_1")!;
    expect(d.entry.memberOrigin).toBe("DERIVED_CUE_IMPACT");
    expect(d.balls).toEqual(derivedBefore.balls);
    expect(d.slot).toBe(derivedBefore.slot);
    expect(entriesOfFamily(h.dataset, familyId).filter((l) => l.entry.memberOrigin === "AUTHORED")).toHaveLength(1);
  });

  it("TEST 7 — DERIVED approximate Search → difference vs Derived member; root preserved", async () => {
    const h = harness();
    const familyId = seedFamily(h);
    const hLoc = locByOp(h.dataset, familyId, "H");
    const dBalls = shift(hLoc.balls, { cue: [-4, 2] });
    const derived = addDerived(h, familyId, hLoc, dBalls);
    const before4 = geometrySnapshot(fourTrack(h.dataset, familyId));
    const q = shift(dBalls, { cue: [0.3, 0.4], second: [-0.6, 0.8] });

    const rc = await localRecall(q, derived.slot);
    expect(rc.record?.balls).toEqual(dBalls);
    const notice = rc.alerts.find((a) => a.includes(NOTICE_HEAD))!;
    expect(notice).toContain("내공: 0.5");
    expect(notice).toContain("앞공: 0.0");
    expect(notice).toContain("뒷공: 1.0");

    const { result } = pressAfterRecall(h, rc, derived.slot, "OVERWRITE", { ai: "파생 근사" });
    expect(result.ok, result.reason).toBe(true);
    expect(geometrySnapshot(fourTrack(h.dataset, familyId))).toEqual(before4);
  });

  it("TEST 8 — Family-common edit with a Derived present → no COMMON_PAYLOAD_CONFLICT", async () => {
    const h = harness();
    const familyId = seedFamily(h);
    const authored = locByOp(h.dataset, familyId, "AUTHORED");
    addDerived(h, familyId, authored, shift(positionA, { cue: [4, 2] }));
    const rc = await localRecall(positionA);

    const { result } = pressAfterRecall(h, rc, "S1", "OVERWRITE", {
      ai: "공통 수정",
      inputs: editedInputs,
    });
    expect(result.ok, result.reason).toBe(true);
    expect(result.reason ?? "").not.toMatch(/COMMON_PAYLOAD_CONFLICT/);
    const rootInputs = locByOp(h.dataset, familyId, "AUTHORED").entry.sysInputs;
    expect(rootInputs).toMatchObject({ CO_f: 34, C3_r: 23 });
    const all = entriesOfFamily(h.dataset, familyId);
    expect(all).toHaveLength(5);
    for (const l of all) {
      expect(l.entry.ai).toEqual({ text: "공통 수정" });
      expect(l.entry.sysInputs).toEqual(rootInputs);
    }
  });

  it("TEST 9 — Derived geometry / memberId / sourceSlot / lineage unchanged by OVERWRITE", async () => {
    const h = harness();
    const familyId = seedFamily(h, { slot: "S2" });
    const vLoc = locByOp(h.dataset, familyId, "V");
    const dBalls = shift(vLoc.balls, { cue: [3, -2] });
    const derived = addDerived(h, familyId, vLoc, dBalls);
    const pick = (l: FamilyLoc) => ({
      balls: l.balls,
      positionId: l.positionId,
      slot: l.slot,
      track: l.entry.track,
      memberId: l.entry.memberId,
      memberOrigin: l.entry.memberOrigin,
      generatedFromMemberId: l.entry.generatedFromMemberId,
      derivedRule: l.entry.derivedRule,
      derivedStep: l.entry.derivedStep,
      meta: l.entry.meta,
    });
    const before = pick(derived);

    const rc = await localRecall(vLoc.balls, "S2");
    const { result } = pressAfterRecall(h, rc, "S2", "OVERWRITE", { ai: "V에서 수정", inputs: editedInputs });
    expect(result.ok, result.reason).toBe(true);
    const after = entriesOfFamily(h.dataset, familyId).find((l) => l.entry.memberId === "mb_derived_1")!;
    expect(pick(after)).toEqual(before);
    expect(after.entry.ai).toEqual({ text: "V에서 수정" });
  });

  it.each<[string, Slot]>([
    ["TEST 10", "S2"],
    ["TEST 11", "S3"],
  ])("%s — %s Family stays %s on all four Tracks after SYMMETRY OVERWRITE", async (_l, slot) => {
    const h = harness();
    const familyId = seedFamily(h, { slot });
    const rpi = locByOp(h.dataset, familyId, "RPI");
    const rc = await localRecall(rpi.balls, slot);
    const { result } = pressAfterRecall(h, rc, slot, "OVERWRITE", { ai: `${slot} 수정` });
    expect(result.ok, result.reason).toBe(true);
    expectFourTrackFamily(h.dataset, familyId, slot);
    for (const rec of h.dataset) {
      for (const other of SLOTS) if (other !== slot) expect(rec.strategies[other]).toBeUndefined();
    }
  });

  it("TEST 12 — C-0: a different Family at the same Position/slot still fails", async () => {
    const h = harness();
    const familyA = seedFamily(h);
    const before = structuredClone(h.dataset);
    const hLoc = locByOp(h.dataset, familyA, "H");
    const rc = await localRecall(hLoc.balls);
    const { result } = pressAfterRecall(h, rc, "S1", "SAVE", { ai: "다른 공략" });
    expect(result.ok).toBe(false);
    expect(result.reason).toMatch(/POSITION_STRATEGY_SLOT_CONFLICT/);
    expect(h.dataset).toEqual(before);
  });

  it("TEST 13 — physical ball move clears eligibility; draft kept; SAVE still possible", async () => {
    for (const id of ["cue", "target", "target_center", "second"]) {
      expect(shouldClearOverwriteEligibilityOnBallEdit(id)).toBe(true);
    }
    const h = harness();
    const familyA = seedFamily(h);
    const rc = await localRecall(positionA);
    const moved = shift(positionA, { cue: [6, 3] });
    const afterMove: RecallCapture = { ...rc, screenBalls: moved, localFamilyId: null };
    expect(canOverwriteTrustedSourceFamily({ editingLocalFamilyId: null, editingPublishedFamilyId: null })).toBe(false);

    const blocked = pressAfterRecall(h, afterMove, "S1", "OVERWRITE", {}, { local: null, published: null });
    expect(blocked.result.ok).toBe(false);
    expect(blocked.result.reason).toBe("overwrite-missing-source-family");

    const saved = pressAfterRecall(h, afterMove, "S1", "SAVE", { ai: "이동 후 저장" }, { local: null, published: null });
    expect(saved.result.ok, saved.result.reason).toBe(true);
    expect(saved.result.familyId).not.toBe(familyA);
    expectFourTrackFamily(h.dataset, saved.result.familyId!, "S1", moved);
    expect(locByOp(h.dataset, saved.result.familyId!, "AUTHORED").entry.ai).toEqual({ text: "이동 후 저장" });
  });

  it("TEST 14 — thickness change keeps eligibility; opposite-handedness edit stored canonically", async () => {
    expect(shouldClearOverwriteEligibilityOnBallEdit("impact")).toBe(false);
    expect(shouldClearOverwriteEligibilityOnBallEdit(null)).toBe(false);
    const h = harness();
    const familyId = seedFamily(h);
    const hLoc = locByOp(h.dataset, familyId, "H");
    const rc = await localRecall(hLoc.balls);
    // H (B2T_R) is opposite handedness to AUTHORED B2T_L → runtime T is mirrored.
    expect((rc.drafts.S1.hpt as { T: string }).T).toBe("-3/8");

    const { result } = pressAfterRecall(h, rc, "S1", "OVERWRITE", {
      hpt: { T: "-5/8", hit_point: { x: 3, y: 1 }, mode: "TIP", tipCount: 1 },
    });
    expect(result.ok, result.reason).toBe(true);
    for (const l of fourTrack(h.dataset, familyId)) {
      expect(l.entry.hpT).toMatchObject({ T: "+5/8", hit_point: { x: -3, y: 1 } });
    }
  });

  it("TEST 15 — Extension edited on a SYMMETRY Recall → canonical root + all four Tracks", async () => {
    const ext = (x: number, y: number): StrategyEntry["trajectoryExtensions"] => ({
      extensionSchemaVersion: 1,
      origin: { kind: "path_node", source: "corrected" },
      items: [
        { id: "EXT-S1-01", index: 1, endpoint: { x, y }, userEdited: true, createdAt: "t0", updatedAt: "t0" },
      ],
    } as StrategyEntry["trajectoryExtensions"]);
    const h = harness();
    const familyId = seedFamily(h, { extensions: ext(70, 30) });
    const hLoc = locByOp(h.dataset, familyId, "H");
    expect(hLoc.entry.trajectoryExtensions?.items[0].endpoint).toEqual({ x: 10, y: 30 });
    const rc = await localRecall(hLoc.balls);

    // unchanged Extension → root copy kept exactly
    const same = pressAfterRecall(h, rc, "S1", "OVERWRITE", { ai: "확장 유지" });
    expect(same.result.ok, same.result.reason).toBe(true);
    expect(locByOp(h.dataset, familyId, "AUTHORED").entry.trajectoryExtensions).toEqual(ext(70, 30));

    // edited in the H frame (x=12) → AUTHORED x = 80 - 12 = 68
    const edited = pressAfterRecall(h, rc, "S1", "OVERWRITE", { extensions: ext(12, 25) });
    expect(edited.result.ok, edited.result.reason).toBe(true);
    const root = locByOp(h.dataset, familyId, "AUTHORED").entry.trajectoryExtensions!;
    expect(root.items[0].endpoint).toEqual({ x: 68, y: 25 });
    for (const op of ["H", "V", "RPI"] as const) {
      expect(locByOp(h.dataset, familyId, op).entry.trajectoryExtensions).toEqual(
        transformTrajectoryExtensions(op, root)
      );
    }
  });

  it("OVERWRITE after SYMMETRY Recall keeps the recalled slot identity (no AUTHORED promotion)", async () => {
    const h = harness();
    const familyId = seedFamily(h);
    const hLoc = locByOp(h.dataset, familyId, "H");
    const rc = await localRecall(hLoc.balls);
    const { result, patchIdentity } = pressAfterRecall(h, rc, "S1", "OVERWRITE");
    expect(result.ok, result.reason).toBe(true);
    const lastPatch = patchIdentity.mock.calls.at(-1);
    expect(lastPatch?.[1]).toMatchObject({
      familyId,
      memberId: hLoc.entry.memberId,
      memberOrigin: "SYMMETRY",
      symmetryOp: "H",
    });
  });
});

// ---------------------------------------------------------------------------
// Published root (captured at Recall)
// ---------------------------------------------------------------------------

describe("F-3C — Published trusted Family root", () => {
  function publishedCorpus(withDerived: boolean) {
    const dry = harness();
    const familyId = seedFamily(dry, { shotType: "옆돌리기" });
    let derivedBalls: Ball3 | null = null;
    if (withDerived) {
      const authored = locByOp(dry.dataset, familyId, "AUTHORED");
      derivedBalls = shift(positionA, { cue: [4, 2] });
      addDerived(dry, familyId, authored, derivedBalls);
    }
    storage.clear();
    return { records: dry.dataset, familyId, derivedBalls };
  }

  it("TEST 17 — Published SYMMETRY Recall without a Local root → OVERWRITE rebuilds at the Published root", async () => {
    const { records, familyId } = publishedCorpus(false);
    const hLoc = locByOp(records, familyId, "H");
    const authoredBefore = locByOp(records, familyId, "AUTHORED");
    const rc = await publishedRecall(records, hLoc.balls);
    expect(rc.matched).toBe(true);
    expect(rc.publishedFamilyId).toBe(familyId);

    const h = harness([]);
    const { result } = pressAfterRecall(h, rc, "S1", "OVERWRITE", { ai: "Published 수정", shotType: "옆돌리기" });
    expect(result.ok, result.reason).toBe(true);
    expect(result.overwriteSourceKind).toBe("PUBLISHED");
    const locs = expectFourTrackFamily(h.dataset, familyId, "S1");
    expect(locs.find((l) => l.entry.memberOrigin === "AUTHORED")!.entry.memberId).toBe(
      authoredBefore.entry.memberId
    );
  });

  it("TEST 18 — Published DERIVED Recall without a Local root → root preserved", async () => {
    const { records, familyId, derivedBalls } = publishedCorpus(true);
    const rc = await publishedRecall(records, derivedBalls!);
    expect(rc.matched).toBe(true);
    const slot = (SLOTS.find((s) => rc.record?.strategies[s]?.familyId === familyId) ?? "S1") as Slot;
    expect(rc.record?.strategies[slot]?.memberOrigin).toBe("DERIVED_CUE_IMPACT");

    const h = harness([]);
    const { result } = pressAfterRecall(h, rc, slot, "OVERWRITE", { ai: "Published 파생", shotType: "옆돌리기" });
    expect(result.ok, result.reason).toBe(true);
    expectFourTrackFamily(h.dataset, familyId, "S1");
  });

  it("Published OVERWRITE without any root (no Local, no Recall context) fails closed", () => {
    const h = harness([]);
    const draft = {
      sys: slotSys("B2T_R"),
      hpt: seedHpt,
      str: { speed: 1 },
      ai: { text: "x" },
      familyId: "fm_missing",
      memberId: "mb_missing_h",
      memberOrigin: "SYMMETRY",
      generatedFromMemberId: "mb_missing",
      symmetryOp: "H",
    };
    const r = runSaveStrategy(
      baseCtx(h, {
        ballsState: transformBall3("H", positionA) as unknown as Record<string, unknown>,
        adminState: adminStateFor("B2T_R"),
        slots: { S1: { draft, applied: draft } },
        saveCommand: "OVERWRITE",
        editingPublishedFamilyId: "fm_missing",
      })
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/OVERWRITE_FAMILY_ROOT_MISSING/);
    expect(h.dataset).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Phase F-3C.2 — C2 reflectionOverride Family-common canonicalization
// ---------------------------------------------------------------------------

describe("F-3C.2 — C2 reflection is Family-common (AUTHORED canonical + projections)", () => {
  const canonicalC2: ReflectionOverride = { rail: "LEFT", t: 0.3 };
  const ext = (x: number, y: number): StrategyEntry["trajectoryExtensions"] =>
    ({
      extensionSchemaVersion: 1,
      origin: { kind: "path_node", source: "corrected" },
      items: [
        { id: "EXT-S1-01", index: 1, endpoint: { x, y }, userEdited: true, createdAt: "t0", updatedAt: "t0" },
      ],
    }) as StrategyEntry["trajectoryExtensions"];

  function rootC2(dataset: PositionRecord[], familyId: string) {
    return locByOp(dataset, familyId, "AUTHORED").entry.reflectionOverride;
  }

  /** AUTHORED = `canonical`; every SYMMETRY Member = deterministic projection of it. */
  function expectFamilyC2(dataset: PositionRecord[], familyId: string, canonical: ReflectionOverride | null) {
    const root = rootC2(dataset, familyId);
    if (canonical == null) {
      for (const l of fourTrack(dataset, familyId)) expect(l.entry.reflectionOverride).toBeUndefined();
      return;
    }
    expect(root).toEqual(canonical);
    for (const op of ["H", "V", "RPI"] as const) {
      expect(locByOp(dataset, familyId, op).entry.reflectionOverride).toEqual(
        transformReflectionOverride(op, canonical)
      );
    }
  }

  function derivedLoc(dataset: PositionRecord[], familyId: string, memberId: string) {
    return entriesOfFamily(dataset, familyId).find((l) => l.entry.memberId === memberId)!;
  }

  function derivedIdentity(l: FamilyLoc) {
    return {
      balls: l.balls,
      positionId: l.positionId,
      slot: l.slot,
      track: l.entry.track,
      memberId: l.entry.memberId,
      memberOrigin: l.entry.memberOrigin,
      generatedFromMemberId: l.entry.generatedFromMemberId,
      derivedRule: l.entry.derivedRule,
      derivedStep: l.entry.derivedStep,
    };
  }

  it("TEST C2-1 — AUTHORED Recall → edit C2 → OVERWRITE: root updated, 3 Tracks projected", async () => {
    const h = harness();
    const familyId = seedFamily(h, { c2: canonicalC2 });
    expectFamilyC2(h.dataset, familyId, canonicalC2);
    const before = geometrySnapshot(fourTrack(h.dataset, familyId));
    const rc = await localRecall(positionA);
    expect(rc.drafts.S1.reflectionOverride).toEqual(canonicalC2);

    const edited: ReflectionOverride = { rail: "LEFT", t: 0.62 };
    const { result } = pressAfterRecall(h, rc, "S1", "OVERWRITE", { c2: edited });
    expect(result.ok, result.reason).toBe(true);
    expectFamilyC2(h.dataset, familyId, edited);
    expect(geometrySnapshot(fourTrack(h.dataset, familyId))).toEqual(before);
  });

  it.each<[string, "H" | "V" | "RPI"]>([
    ["TEST C2-2", "H"],
    ["TEST C2-3", "V"],
    ["TEST C2-4", "RPI"],
  ])("%s — %s Recall shows the projection; edited C2 is inverse-transformed to the root", async (_l, op) => {
    const h = harness();
    const familyId = seedFamily(h, { c2: canonicalC2 });
    const before = geometrySnapshot(fourTrack(h.dataset, familyId));
    const loc = locByOp(h.dataset, familyId, op);
    const rc = await localRecall(loc.balls);
    const shown = transformReflectionOverride(op, canonicalC2)!;
    expect(rc.drafts.S1.reflectionOverride).toEqual(shown);

    const edited: ReflectionOverride = { rail: shown.rail, t: 0.2 };
    const { result } = pressAfterRecall(h, rc, "S1", "OVERWRITE", { c2: edited });
    expect(result.ok, result.reason).toBe(true);
    const canonical = transformReflectionOverride(op, edited)!;
    expect(rootC2(h.dataset, familyId)).not.toEqual(edited);
    expectFamilyC2(h.dataset, familyId, canonical);
    expect(locByOp(h.dataset, familyId, op).entry.reflectionOverride!.rail).toBe(edited.rail);
    expect(locByOp(h.dataset, familyId, op).entry.reflectionOverride!.t).toBeCloseTo(edited.t, 12);
    expect(geometrySnapshot(fourTrack(h.dataset, familyId))).toEqual(before);
  });

  it("non-B2T_L root: AUTHORED T2B_R, V (B2T_L) Recall edit → canonical in the T2B_R frame", async () => {
    const h = harness();
    const c2: ReflectionOverride = { rail: "TOP", t: 0.35 };
    const familyId = seedFamily(h, { track: "T2B_R", c2 });
    expect(locByOp(h.dataset, familyId, "AUTHORED").entry.track).toBe("T2B_R");
    expectFamilyC2(h.dataset, familyId, c2);
    const vLoc = locByOp(h.dataset, familyId, "V");
    expect(vLoc.entry.track).toBe("B2T_L");
    const rc = await localRecall(vLoc.balls);
    expect(rc.drafts.S1.reflectionOverride).toEqual({ rail: "BOTTOM", t: 0.35 });

    const { result } = pressAfterRecall(h, rc, "S1", "OVERWRITE", { c2: { rail: "BOTTOM", t: 0.8 } });
    expect(result.ok, result.reason).toBe(true);
    expectFamilyC2(h.dataset, familyId, { rail: "TOP", t: 0.8 });
    expect(locByOp(h.dataset, familyId, "AUTHORED").entry.track).toBe("T2B_R");
  });

  it.each<[string, DerivedOrigin, "H" | "V"]>([
    ["TEST C2-5", "DERIVED_C3_PLUS", "H"],
    ["TEST C2-6", "DERIVED_CUE_C3_PRODUCT", "V"],
  ])("%s — %s Recall (base %s) → edit C2 → root canonical; Derived stays Derived", async (_l, origin, op) => {
    const h = harness();
    const familyId = seedFamily(h, { c2: canonicalC2 });
    const base = locByOp(h.dataset, familyId, op);
    const dBalls = shift(base.balls, { cue: [op === "H" ? -4 : 4, 2] });
    const derived = addDerived(h, familyId, base, dBalls, 1, origin);
    const shown = transformReflectionOverride(op, canonicalC2)!;
    expect(derived.entry.reflectionOverride).toEqual(shown);
    const before4 = geometrySnapshot(fourTrack(h.dataset, familyId));
    const identityBefore = derivedIdentity(derived);

    const rc = await localRecall(dBalls, derived.slot);
    expect(rc.record?.strategies[derived.slot]?.memberOrigin).toBe(origin);
    expect(rc.drafts[derived.slot].reflectionOverride).toEqual(shown);

    const edited: ReflectionOverride = { rail: shown.rail, t: 0.15 };
    const { result } = pressAfterRecall(h, rc, derived.slot, "OVERWRITE", { c2: edited });
    expect(result.ok, result.reason).toBe(true);
    const canonical = transformReflectionOverride(op, edited)!;
    expectFamilyC2(h.dataset, familyId, canonical);
    expect(geometrySnapshot(fourTrack(h.dataset, familyId))).toEqual(before4);
    const after = derivedLoc(h.dataset, familyId, "mb_derived_1");
    expect(derivedIdentity(after)).toEqual(identityBefore);
    expect(after.entry.reflectionOverride).toEqual(locByOp(h.dataset, familyId, op).entry.reflectionOverride);
    expect(entriesOfFamily(h.dataset, familyId).filter((l) => l.entry.memberOrigin === "AUTHORED")).toHaveLength(1);
  });

  it("TEST C2-7 — unchanged C2 → root payload kept exactly (no round-trip drift)", async () => {
    const h = harness();
    const c2: ReflectionOverride = { rail: "TOP", t: 0.3700000000000001 };
    const familyId = seedFamily(h, { c2 });
    for (const op of ["H", "V", "RPI"] as const) {
      const rc = await localRecall(locByOp(h.dataset, familyId, op).balls);
      const { result } = pressAfterRecall(h, rc, "S1", "OVERWRITE", { ai: `${op} 유지` });
      expect(result.ok, result.reason).toBe(true);
      expect(rootC2(h.dataset, familyId)).toStrictEqual(c2);
      expectFamilyC2(h.dataset, familyId, c2);
    }
  });

  it("TEST C2-8 — cleared C2 → removed Family-wide (4 Tracks + C3+/Product); Cue→Impact stays without", async () => {
    const h = harness();
    const familyId = seedFamily(h, { c2: canonicalC2 });
    const hLoc = locByOp(h.dataset, familyId, "H");
    addDerived(h, familyId, hLoc, shift(hLoc.balls, { cue: [-4, 2] }), 1, "DERIVED_C3_PLUS");
    const vLoc = locByOp(h.dataset, familyId, "V");
    addDerived(h, familyId, vLoc, shift(vLoc.balls, { cue: [4, 2] }), 2, "DERIVED_CUE_C3_PRODUCT");
    const a = locByOp(h.dataset, familyId, "AUTHORED");
    addDerived(h, familyId, a, shift(positionA, { cue: [4, 2] }), 3, "DERIVED_CUE_IMPACT");

    const rc = await localRecall(hLoc.balls);
    const { result } = pressAfterRecall(h, rc, "S1", "OVERWRITE", { c2: null });
    expect(result.ok, result.reason).toBe(true);
    expectFamilyC2(h.dataset, familyId, null);
    for (const id of ["mb_derived_1", "mb_derived_2", "mb_derived_3"]) {
      expect(derivedLoc(h.dataset, familyId, id).entry.reflectionOverride).toBeUndefined();
    }
  });

  it("TEST C2-9 — SAVE from a B2T_R screen (H Recall, approximate) → B2T_R is AUTHORED; raw C2 canonical", async () => {
    const h = harness();
    const familyA = seedFamily(h, { c2: canonicalC2 });
    const hLoc = locByOp(h.dataset, familyA, "H");
    const q = shift(hLoc.balls, { cue: [1.5, 1] });
    const rc = await localRecall(q);
    expect((rc.drafts.S1.sys as { track: string }).track).toBe("B2T_R");
    const screenC2: ReflectionOverride = { rail: "RIGHT", t: 0.44 };

    const { result } = pressAfterRecall(h, rc, "S1", "SAVE", { ai: "새 공략", c2: screenC2 });
    expect(result.ok, result.reason).toBe(true);
    expect(result.saveIntent).toBe("CREATE");
    const familyB = result.familyId!;
    expect(familyB).not.toBe(familyA);
    expectFourTrackFamily(h.dataset, familyB, "S1", q, "B2T_R");
    expectFamilyC2(h.dataset, familyB, screenC2);
    expectFamilyC2(h.dataset, familyA, canonicalC2);
  });

  it("TEST C2-10 — SAVE CREATE with a T2B_L screen → T2B_L AUTHORED keeps the raw C2", () => {
    const h = harness();
    const c2: ReflectionOverride = { rail: "BOTTOM", t: 0.61 };
    const familyId = seedFamily(h, { track: "T2B_L", c2 });
    expectFourTrackFamily(h.dataset, familyId, "S1", positionA, "T2B_L");
    expectFamilyC2(h.dataset, familyId, c2);
    expect(locByOp(h.dataset, familyId, "RPI").entry.track).toBe("B2T_L");
    const rpi = locByOp(h.dataset, familyId, "RPI").entry.reflectionOverride!;
    expect(rpi.rail).toBe("TOP");
    expect(rpi.t).toBeCloseTo(0.39, 12);
  });

  it("Derived matrix — C3+/Product follow their same-track base; Cue→Impact carries no C2 / Extension", async () => {
    const h = harness();
    const familyId = seedFamily(h, { c2: canonicalC2, extensions: ext(70, 30) });
    const hLoc = locByOp(h.dataset, familyId, "H");
    const vLoc = locByOp(h.dataset, familyId, "V");
    const a = locByOp(h.dataset, familyId, "AUTHORED");
    const c3 = addDerived(h, familyId, hLoc, shift(hLoc.balls, { cue: [-4, 2] }), 1, "DERIVED_C3_PLUS");
    const prod = addDerived(h, familyId, vLoc, shift(vLoc.balls, { cue: [4, 2] }), 2, "DERIVED_CUE_C3_PRODUCT");
    const cueImpact = addDerived(h, familyId, a, shift(positionA, { cue: [4, 2] }), 3, "DERIVED_CUE_IMPACT");
    const identities = [c3, prod, cueImpact].map(derivedIdentity);

    const rc = await localRecall(positionA);
    const editedC2: ReflectionOverride = { rail: "LEFT", t: 0.55 };
    const { result } = pressAfterRecall(h, rc, "S1", "OVERWRITE", { c2: editedC2, extensions: ext(66, 28) });
    expect(result.ok, result.reason).toBe(true);
    expectFamilyC2(h.dataset, familyId, editedC2);

    const c3After = derivedLoc(h.dataset, familyId, "mb_derived_1");
    const prodAfter = derivedLoc(h.dataset, familyId, "mb_derived_2");
    const cueAfter = derivedLoc(h.dataset, familyId, "mb_derived_3");
    expect(c3After.entry.reflectionOverride).toEqual(locByOp(h.dataset, familyId, "H").entry.reflectionOverride);
    expect(c3After.entry.trajectoryExtensions).toEqual(locByOp(h.dataset, familyId, "H").entry.trajectoryExtensions);
    expect(prodAfter.entry.reflectionOverride).toEqual(locByOp(h.dataset, familyId, "V").entry.reflectionOverride);
    expect(prodAfter.entry.trajectoryExtensions).toEqual(locByOp(h.dataset, familyId, "V").entry.trajectoryExtensions);
    expect(cueAfter.entry.reflectionOverride).toBeUndefined();
    expect(cueAfter.entry.trajectoryExtensions).toBeUndefined();
    expect([c3After, prodAfter, cueAfter].map(derivedIdentity)).toEqual(identities);
  });

  it("Extension sync never gives DERIVED_CUE_IMPACT an Extension (generation rule)", async () => {
    const h = harness();
    const familyId = seedFamily(h, { extensions: ext(70, 30) });
    const a = locByOp(h.dataset, familyId, "AUTHORED");
    addDerived(h, familyId, a, shift(positionA, { cue: [4, 2] }), 1, "DERIVED_CUE_IMPACT");
    const rc = await localRecall(positionA);
    const { result } = pressAfterRecall(h, rc, "S1", "OVERWRITE", { extensions: ext(66, 28) });
    expect(result.ok, result.reason).toBe(true);
    expect(locByOp(h.dataset, familyId, "AUTHORED").entry.trajectoryExtensions).toEqual(ext(66, 28));
    expect(derivedLoc(h.dataset, familyId, "mb_derived_1").entry.trajectoryExtensions).toBeUndefined();
  });

  it("Cue→Impact Recall → OVERWRITE (no C2 / Extension shown by rule) keeps the Family C2 and Extension", async () => {
    const h = harness();
    const familyId = seedFamily(h, { c2: canonicalC2, extensions: ext(70, 30) });
    const a = locByOp(h.dataset, familyId, "AUTHORED");
    const dBalls = shift(positionA, { cue: [4, 2] });
    const cueImpact = addDerived(h, familyId, a, dBalls, 1, "DERIVED_CUE_IMPACT");
    const rc = await localRecall(dBalls, cueImpact.slot);
    expect(rc.drafts[cueImpact.slot].reflectionOverride).toBeUndefined();
    expect(rc.drafts[cueImpact.slot].trajectoryExtensions).toBeUndefined();

    const { result } = pressAfterRecall(h, rc, cueImpact.slot, "OVERWRITE", { ai: "파생에서 수정" });
    expect(result.ok, result.reason).toBe(true);
    expectFamilyC2(h.dataset, familyId, canonicalC2);
    expect(locByOp(h.dataset, familyId, "AUTHORED").entry.trajectoryExtensions).toEqual(ext(70, 30));
    expect(derivedLoc(h.dataset, familyId, "mb_derived_1").entry.reflectionOverride).toBeUndefined();
  });

  it("Published SYMMETRY Recall → edit C2 → OVERWRITE stores the canonical C2 at the Published root", async () => {
    const dry = harness();
    const familyId = seedFamily(dry, { shotType: "옆돌리기", c2: canonicalC2 });
    const records = dry.dataset;
    storage.clear();
    const rpi = locByOp(records, familyId, "RPI");
    const rc = await publishedRecall(records, rpi.balls);
    expect(rc.matched).toBe(true);
    const shown = transformReflectionOverride("RPI", canonicalC2)!;
    expect(rc.drafts.S1.reflectionOverride).toEqual(shown);

    const h = harness([]);
    const edited: ReflectionOverride = { rail: shown.rail, t: 0.9 };
    const { result } = pressAfterRecall(h, rc, "S1", "OVERWRITE", { c2: edited, shotType: "옆돌리기" });
    expect(result.ok, result.reason).toBe(true);
    expectFamilyC2(h.dataset, familyId, transformReflectionOverride("RPI", edited));
  });

  it("thickness edit keeps OVERWRITE eligibility and the C2 (T is not a C2 dependency)", async () => {
    expect(shouldClearOverwriteEligibilityOnBallEdit("impact")).toBe(false);
    const h = harness();
    const familyId = seedFamily(h, { c2: canonicalC2 });
    const rc = await localRecall(locByOp(h.dataset, familyId, "V").balls);
    const { result } = pressAfterRecall(h, rc, "S1", "OVERWRITE", {
      hpt: { ...seedHpt, T: "+6/8" },
    });
    expect(result.ok, result.reason).toBe(true);
    expectFamilyC2(h.dataset, familyId, canonicalC2);
  });
});

// ---------------------------------------------------------------------------
// Search difference notice
// ---------------------------------------------------------------------------

describe("F-3C — Recall position difference notice", () => {
  it("TEST 21 — exact match → all differences 0 and no notice", async () => {
    const zero = computeRecallPositionDifference(positionA, positionA);
    expect(zero).toEqual({ cueDifference: 0, targetDifference: 0, secondDifference: 0 });
    expect(isRecallPositionExact(zero)).toBe(true);
    expect(formatRecallPositionDifferenceNotice(zero)).toBeNull();

    const h = harness();
    seedFamily(h);
    const rc = await localRecall(positionA);
    expect(rc.matched).toBe(true);
    expect(rc.alerts.some((a) => a.includes(NOTICE_HEAD))).toBe(false);
  });

  it("TEST 22 — approximate → per-ball Euclidean distances (no rounding inside, 1 decimal shown)", () => {
    const q = shift(positionA, { cue: [1.2, 0.5], target: [0.3, -0.4], second: [0.05, 0.02] });
    const d = computeRecallPositionDifference(q, positionA);
    expect(d.cueDifference).toBeCloseTo(1.3, 10);
    expect(d.targetDifference).toBeCloseTo(0.5, 10);
    expect(d.secondDifference).toBeCloseTo(Math.hypot(0.05, 0.02), 10);
    expect(isRecallPositionExact(d)).toBe(false);
    const text = formatRecallPositionDifferenceNotice(d)!;
    expect(text.split("\n").filter(Boolean)).toEqual([
      NOTICE_HEAD,
      "내공: 1.3",
      "앞공: 0.5",
      "뒷공: 0.1",
      "검색된 공략의 내용이 화면에 표시되었습니다.",
    ]);
    expect(text).not.toMatch(/%|Rg|수구|적구/);
  });

  it("TEST 6/7/8-diff — AUTHORED / SYMMETRY / DERIVED Recall compare against the winning Member", async () => {
    const h = harness();
    const familyId = seedFamily(h);
    const hLoc = locByOp(h.dataset, familyId, "H");
    const dBalls = shift(positionA, { cue: [4, 2] });
    const derived = addDerived(h, familyId, locByOp(h.dataset, familyId, "AUTHORED"), dBalls);

    const cases: Array<[string, Ball3, Slot]> = [
      ["AUTHORED", positionA, "S1"],
      ["SYMMETRY", hLoc.balls, "S1"],
      ["DERIVED", dBalls, derived.slot],
    ];
    for (const [label, stored, slot] of cases) {
      const q = shift(stored, { target: [0.6, 0.8] });
      const rc = await localRecall(q, slot);
      expect(rc.record?.balls, label).toEqual(stored);
      const notice = rc.alerts.find((a) => a.includes(NOTICE_HEAD));
      expect(notice, label).toContain("내공: 0.0");
      expect(notice, label).toContain("앞공: 1.0");
      expect(notice, label).toContain("뒷공: 0.0");
    }
  });

  it("Published Recall shows the same difference notice", async () => {
    const dry = harness();
    const familyId = seedFamily(dry, { shotType: "옆돌리기" });
    const records = dry.dataset;
    storage.clear();
    const vLoc = locByOp(records, familyId, "V");
    const rc = await publishedRecall(records, shift(vLoc.balls, { second: [0.3, 0.4] }));
    expect(rc.matched).toBe(true);
    const notice = rc.alerts.find((a) => a.includes(NOTICE_HEAD));
    expect(notice).toContain("뒷공: 0.5");
  });
});

// ---------------------------------------------------------------------------
// App wiring (source contract)
// ---------------------------------------------------------------------------

describe("F-3C — App wiring", () => {
  const app = readFileSync(join(__dirname, "../../App.jsx"), "utf8");

  it("ball-edit invalidation uses the physical-ball policy (thickness/impact keeps eligibility)", () => {
    const invalidate = app.slice(
      app.indexOf("function invalidateSavedAndRecalledForBallId"),
      app.indexOf("function applyBallCenterDirectInput")
    );
    expect(invalidate).toContain("shouldClearOverwriteEligibilityOnBallEdit(ballId)");
    expect(invalidate).toContain("clearPublishedEditSession()");

    const impactStart = app.indexOf('if (dragState.ballId === "impact") {');
    expect(impactStart).toBeGreaterThan(0);
    const impactBranch = app.slice(impactStart, app.indexOf("const draggedBall", impactStart));
    expect(impactBranch).not.toContain("clearPublishedEditSession");
    expect(app).toContain("shouldClearOverwriteEligibilityOnBallEdit(dragState.ballId)");
  });

  it("Recall context is captured, cleared with the session, and passed to OVERWRITE", () => {
    expect(app).toContain("setOverwriteRecallContext");
    const clear = app.slice(
      app.indexOf("const clearPublishedEditSession = useCallback"),
      app.indexOf("const canOverwriteTrustedSource =")
    );
    expect(clear).toContain("setOverwriteRecallContext(null)");
    const overwrite = app.slice(
      app.indexOf("function handleCanonicalOverwrite"),
      app.indexOf("async function handlePositionRecall")
    );
    expect(overwrite).toContain("overwriteRecallContext");
  });
});
