/**
 * Phase F-3B.2 — 4-Track Family Strategy Slot Invariant.
 *
 * A 4-Track set is one real billiards Position/strategy shown in four screen
 * orientations. AUTHORED + H/V/RPI SYMMETRY Members of one Family share one
 * S1/S2/S3 slot = the selected strategy slot. No first-empty fallback; any
 * required (positionId, slot) held by another Family fails the whole CREATE.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { runSaveStrategy, type SaveFlowContext } from "../../application/flows/saveFlow";
import { runNormalizedLocalMemberSearch } from "../recall/normalizedLocalMemberSearch";
import type { CompareProfileId } from "../recall/recallTypes";
import { createPositionId } from "../positionId";
import type { Ball3, PositionRecord, StrategyEntry } from "../positionSearchEngine";
import {
  familyWriteCandidateFromEntry,
  preflightFamilyMemberWrite,
  writeFamilyMembers,
  writeFourTrackFamilyMembers,
} from "./familyAwareWriter";
import { FAMILY_TRACKS, mapFamilyTrack, type FamilyTrack } from "./trackSymmetry";

type Slot = "S1" | "S2" | "S3";

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

const positionA: Ball3 = {
  cue: { x: 10, y: 10 },
  target: { x: 40, y: 20 },
  second: { x: 60, y: 15 },
};

const seedInputs = { CO_f: 30, C1_f: 10, C3_r: 20 };

function slotSys(track: FamilyTrack, inputs: Record<string, number> = seedInputs) {
  return {
    systemId: "5_half_system",
    track,
    inputs,
    outputs: { result: { ...inputs } },
  };
}

function adminStateFor(track: FamilyTrack, inputs: Record<string, number> = seedInputs) {
  return {
    sys: {
      system: "5_half_system",
      systemId: "5_half_system",
      system_id: "5_half_system",
      shotType: "뒤돌리기",
      track,
      inputs,
      system_values: { ...inputs },
      corrections: { slide: 0, curve_ratio: 0, draw: 0, departure: 0, spin: 0 },
    },
    hpt: { T: "8/8" },
  };
}

function slotsFor(slot: Slot, track: FamilyTrack, aiText = "공략") {
  const empty = { draft: null, applied: null };
  return {
    S1: empty,
    S2: empty,
    S3: empty,
    [slot]: {
      draft: { sys: slotSys(track), hpt: { T: "8/8" } },
      applied: {
        sys: slotSys(track),
        hpt: { T: "8/8" },
        str: { speed: 1 },
        ai: { text: aiText },
      },
    },
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

function buildCtx(
  h: Harness,
  opts: { slot: Slot; track?: FamilyTrack; balls?: Ball3; aiText?: string },
  overrides: Partial<SaveFlowContext> = {}
): SaveFlowContext {
  const track = opts.track ?? "B2T_L";
  return {
    dataset: h.dataset,
    ballsState: opts.balls ?? positionA,
    adminState: adminStateFor(track),
    activeSlot: opts.slot,
    slots: slotsFor(opts.slot, track, opts.aiText),
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

type FamilyLoc = { slot: Slot; positionId: string; balls: Ball3; entry: StrategyEntry };

function entriesOfFamily(dataset: PositionRecord[], familyId: string): FamilyLoc[] {
  return dataset.flatMap((rec) =>
    (Object.entries(rec.strategies) as Array<[Slot, StrategyEntry | undefined]>)
      .filter(([, e]) => e?.familyId === familyId)
      .map(([slot, e]) => ({ slot, positionId: rec.positionId, balls: rec.balls, entry: e! }))
  );
}

function saveCreate(h: Harness, slot: Slot, track: FamilyTrack = "B2T_L"): string {
  const r = runSaveStrategy(buildCtx(h, { slot, track }));
  expect(r.ok, r.reason).toBe(true);
  expect(r.saveIntent).toBe("CREATE");
  return r.familyId!;
}

function expectFourTrackFamilyInSlot(
  dataset: PositionRecord[],
  familyId: string,
  slot: Slot,
  authoredTrack: FamilyTrack = "B2T_L"
) {
  const locs = entriesOfFamily(dataset, familyId).filter(
    (l) => l.entry.memberOrigin === "AUTHORED" || l.entry.memberOrigin === "SYMMETRY"
  );
  expect(locs).toHaveLength(4);
  expect(new Set(locs.map((l) => l.positionId)).size).toBe(4);
  for (const l of locs) {
    expect(l.slot).toBe(slot);
    expect(l.entry.familyId).toBe(familyId);
  }
  const authored = locs.filter((l) => l.entry.memberOrigin === "AUTHORED");
  expect(authored).toHaveLength(1);
  expect(authored[0].entry.track).toBe(authoredTrack);
  const sym = locs.filter((l) => l.entry.memberOrigin === "SYMMETRY");
  expect(sym.map((l) => l.entry.symmetryOp).sort()).toEqual(["H", "RPI", "V"]);
  for (const l of sym) {
    expect(l.entry.generatedFromMemberId).toBe(authored[0].entry.memberId);
    expect(l.entry.track).toBe(mapFamilyTrack(authoredTrack, l.entry.symmetryOp as "H"));
  }
  expect(new Set(locs.map((l) => l.entry.track))).toEqual(new Set(FAMILY_TRACKS));
  return locs;
}

function searchEveryOrientation(
  locs: FamilyLoc[],
  familyId: string,
  slot: Slot,
  profile: CompareProfileId = "adminSearch"
) {
  for (const loc of locs) {
    const r = runNormalizedLocalMemberSearch({ query: { balls: loc.balls }, profile });
    expect(r.kind, `${loc.entry.symmetryOp ?? "AUTHORED"} ${loc.positionId}`).toBe("match");
    if (r.kind !== "match") continue;
    expect(r.positionId).toBe(loc.positionId);
    expect(r.record.strategies[slot]?.familyId).toBe(familyId);
    expect(r.record.strategies[slot]?.memberId).toBe(loc.entry.memberId);
    const hit = r.hits.find((x) => x.familyId === familyId)!;
    expect(hit.sourceSlot).toBe(slot);
    expect(hit.track).toBe(loc.entry.track);
  }
}

/** Family B holding a single Strategy at (balls, slot) — e.g. a partial/legacy Family. */
function foreignOccupant(template: PositionRecord, slot: Slot): PositionRecord {
  const src = Object.values(template.strategies).find(Boolean)!;
  const entry: StrategyEntry = {
    ...structuredClone(src),
    slot,
    familyId: "fm_other_b",
    memberId: "mb_other_b",
    memberOrigin: "AUTHORED",
    authoringStrategyId: "as_other_b",
    ai: { text: "Family B" },
  };
  delete entry.symmetryOp;
  delete entry.generatedFromMemberId;
  return {
    ...structuredClone(template),
    strategies: { [slot]: entry },
  };
}

/** Orbit of positionA (AUTHORED + H/V/RPI records) from a throw-away SAVE. */
function orbitOfPositionA(): { byOp: Record<string, PositionRecord> } {
  const dry = harness();
  const familyId = saveCreate(dry, "S1");
  storage.clear();
  const byOp: Record<string, PositionRecord> = {};
  for (const rec of dry.dataset) {
    const e = rec.strategies.S1!;
    expect(e.familyId).toBe(familyId);
    byOp[e.symmetryOp ?? "AUTHORED"] = rec;
  }
  return { byOp };
}

describe("F-3B.2 — SAVE slot = Family strategy slot for all four Tracks", () => {
  it.each<[string, Slot]>([
    ["TEST 1", "S1"],
    ["TEST 2", "S2"],
    ["TEST 3", "S3"],
  ])("%s — empty corpus SAVE %s → AUTHORED + H/V/RPI all in that slot", (_label, slot) => {
    const h = harness();
    const familyId = saveCreate(h, slot);
    expect(h.dataset).toHaveLength(4);
    expectFourTrackFamilyInSlot(h.dataset, familyId, slot);
    for (const rec of h.dataset) {
      for (const other of ["S1", "S2", "S3"] as Slot[]) {
        if (other !== slot) expect(rec.strategies[other]).toBeUndefined();
      }
    }
  });

  it.each<[string, Slot]>([
    ["TEST 4", "S2"],
    ["TEST 5", "S3"],
  ])("%s — Search each of the 4 orientations → Family appears as %s", (_label, slot) => {
    const h = harness();
    const familyId = saveCreate(h, slot);
    const locs = expectFourTrackFamilyInSlot(h.dataset, familyId, slot);
    searchEveryOrientation(locs, familyId, slot);
  });

  it("TEST 6 — symmetry Position/S2 held by another Family → whole CREATE fails atomically", () => {
    const { byOp } = orbitOfPositionA();
    const blocker = foreignOccupant(byOp.H, "S2");
    const h = harness([blocker]);
    const datasetBefore = structuredClone(h.dataset);
    const storageBefore = storage.snapshot();
    const setDatasetSpy = vi.fn(h.setDataset);
    const patchIdentity = vi.fn();

    const r = runSaveStrategy(
      buildCtx(h, { slot: "S2" }, { setDataset: setDatasetSpy, patchSlotFamilyIdentity: patchIdentity })
    );
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/POSITION_STRATEGY_SLOT_CONFLICT/);
    expect(setDatasetSpy).not.toHaveBeenCalled();
    expect(patchIdentity).not.toHaveBeenCalled();
    expect(h.dataset).toEqual(datasetBefore);
    expect(storage.snapshot()).toEqual(storageBefore);
    // B untouched; no partial Family A, no S1/S3 fallback anywhere
    expect(h.dataset).toHaveLength(1);
    expect(h.dataset[0].strategies.S2?.familyId).toBe("fm_other_b");
    expect(h.dataset[0].strategies.S1).toBeUndefined();
    expect(h.dataset[0].strategies.S3).toBeUndefined();

    // writer names the blocked symmetry Position and the required slot
    const authored = Object.values(byOp.AUTHORED.strategies)[0]!;
    const w = writeFourTrackFamilyMembers(
      h.dataset,
      { balls: byOp.AUTHORED.balls, entry: { ...authored, slot: "S2" } },
      { preferredAuthoredSlot: "S2" }
    );
    expect(w.ok).toBe(false);
    if (w.ok) return;
    expect(w.code).toBe("POSITION_STRATEGY_SLOT_CONFLICT");
    expect(w.reason).toContain(byOp.H.positionId);
    expect(w.reason).toContain("slot S2");
    expect(w.dataset).toBe(h.dataset);
  });

  it("TEST 6b — every symmetry orientation (H / V / RPI) is equally strict", () => {
    const { byOp } = orbitOfPositionA();
    for (const op of ["H", "V", "RPI"]) {
      const h = harness([foreignOccupant(byOp[op], "S3")]);
      const before = structuredClone(h.dataset);
      const r = runSaveStrategy(buildCtx(h, { slot: "S3" }));
      expect(r.ok, op).toBe(false);
      expect(r.reason).toMatch(/POSITION_STRATEGY_SLOT_CONFLICT/);
      expect(h.dataset).toEqual(before);
    }
  });

  it("TEST 6c — a free different slot at the same orbit still saves (no false block)", () => {
    const { byOp } = orbitOfPositionA();
    const h = harness([foreignOccupant(byOp.H, "S2")]);
    const familyId = saveCreate(h, "S3");
    expectFourTrackFamilyInSlot(h.dataset, familyId, "S3");
    const hRec = h.dataset.find((r) => r.positionId === byOp.H.positionId)!;
    expect(hRec.strategies.S2?.familyId).toBe("fm_other_b");
  });

  it("TEST 7 — same-Family rewrite keeps all four Members in place (replacement preserved)", () => {
    const h = harness();
    const familyId = saveCreate(h, "S2");
    const before = expectFourTrackFamilyInSlot(h.dataset, familyId, "S2");
    const authored = before.find((l) => l.entry.memberOrigin === "AUTHORED")!;
    const edited = { ...authored.entry, ai: { text: "수정본" } };

    for (const options of [{ preferredAuthoredSlot: "S2" as const }, undefined]) {
      const w = writeFourTrackFamilyMembers(h.dataset, { balls: authored.balls, entry: edited }, options);
      expect(w.ok, w.ok ? "" : w.reason).toBe(true);
      if (!w.ok) return;
      const after = expectFourTrackFamilyInSlot(w.dataset, familyId, "S2");
      expect(new Set(after.map((l) => l.entry.memberId))).toEqual(
        new Set(before.map((l) => l.entry.memberId))
      );
      expect(after.find((l) => l.entry.memberOrigin === "AUTHORED")!.entry.ai).toEqual({
        text: "수정본",
      });
      expect(w.dataset).toHaveLength(4);
    }
  });

  it("TEST 8 — C-0 still rejects a different Family at the same Position/slot", () => {
    const h = harness();
    const familyA = saveCreate(h, "S1");
    const before = structuredClone(h.dataset);
    const r = runSaveStrategy(buildCtx(h, { slot: "S1" }));
    expect(r.ok).toBe(false);
    expect(r.reason).toMatch(/POSITION_STRATEGY_SLOT_CONFLICT/);
    expect(h.dataset).toEqual(before);
    expectFourTrackFamilyInSlot(h.dataset, familyA, "S1");
  });

  it("TEST 9 — F-3B: Family A in S1, new SAVE in S2 → all four Members of B in S2, A untouched", () => {
    const h = harness();
    const familyA = saveCreate(h, "S1");
    const aBefore = structuredClone(entriesOfFamily(h.dataset, familyA));
    const familyB = saveCreate(h, "S2");
    expect(familyB).not.toBe(familyA);
    expect(entriesOfFamily(h.dataset, familyA)).toEqual(aBefore);
    const locsB = expectFourTrackFamilyInSlot(h.dataset, familyB, "S2");
    expect(h.dataset).toHaveLength(4);
    for (const rec of h.dataset) {
      expect(rec.strategies.S1?.familyId).toBe(familyA);
      expect(rec.strategies.S2?.familyId).toBe(familyB);
    }
    searchEveryOrientation(locsB, familyB, "S2");
  });

  it("TEST 10 — F-3B: failed SAVE (C-0) leaves slots/dataset intact; retry in S2 succeeds", () => {
    const h = harness();
    const familyA = saveCreate(h, "S1");
    const ctx = buildCtx(h, { slot: "S1", aiText: "편집본" });
    const slotsBefore = structuredClone(ctx.slots);
    const datasetBefore = structuredClone(h.dataset);
    const failed = runSaveStrategy(ctx);
    expect(failed.ok).toBe(false);
    expect(ctx.slots).toEqual(slotsBefore);
    expect(h.dataset).toEqual(datasetBefore);

    const saved = runSaveStrategy(buildCtx(h, { slot: "S2", aiText: "편집본" }));
    expect(saved.ok).toBe(true);
    expectFourTrackFamilyInSlot(h.dataset, saved.familyId!, "S2");
    expectFourTrackFamilyInSlot(h.dataset, familyA, "S1");
  });

  it("TEST 11 — H/V/RPI coordinates differ; sys / slot / familyId invariant", () => {
    const h = harness();
    const familyId = saveCreate(h, "S2");
    const locs = expectFourTrackFamilyInSlot(h.dataset, familyId, "S2");
    const ballKeys = new Set(locs.map((l) => JSON.stringify(l.balls)));
    expect(ballKeys.size).toBe(4);
    const authored = locs.find((l) => l.entry.memberOrigin === "AUTHORED")!;
    expect(authored.positionId).toBe(createPositionId(positionA));
    for (const l of locs) {
      expect(l.positionId).toBe(createPositionId(l.balls));
      expect(l.entry.sysInputs).toEqual(authored.entry.sysInputs);
      expect(l.entry.signature).toEqual(authored.entry.signature);
      expect(l.entry.familyId).toBe(familyId);
      expect(l.slot).toBe("S2");
    }
  });

  it.each(FAMILY_TRACKS.map((t) => [t] as [FamilyTrack]))(
    "TEST 12 — authored track %s → 4 Tracks, one familyId, one sourceSlot",
    (track) => {
      for (const slot of ["S1", "S2", "S3"] as Slot[]) {
        storage.clear();
        const h = harness();
        const familyId = saveCreate(h, slot, track);
        const locs = expectFourTrackFamilyInSlot(h.dataset, familyId, slot, track);
        searchEveryOrientation(locs, familyId, slot);
      }
    }
  );

  it("TEST 13 — Derived Members keep first-free slot semantics (familyStrategySlot ignored)", () => {
    const h = harness();
    const familyId = saveCreate(h, "S2");
    const authored = entriesOfFamily(h.dataset, familyId).find(
      (l) => l.entry.memberOrigin === "AUTHORED"
    )!;
    const derivedBalls: Ball3 = {
      cue: { x: 14, y: 12 },
      target: { x: 40, y: 20 },
      second: { x: 60, y: 15 },
    };
    const derived = familyWriteCandidateFromEntry({
      balls: derivedBalls,
      entry: {
        ...authored.entry,
        memberId: "mb_derived_1",
        memberOrigin: "DERIVED_CUE_IMPACT",
        generatedFromMemberId: authored.entry.memberId,
        derivedRule: "CUE_IMPACT_FIRST_30PCT",
        derivedStep: "step:0001",
        authoringStrategyId: "as_derived_1",
      },
    })!;
    expect(derived).toBeTruthy();
    const set = { familyId, members: [derived] };

    const pre = preflightFamilyMemberWrite(h.dataset, set, { familyStrategySlot: "S3" });
    expect(pre.ok).toBe(true);
    if (!pre.ok) return;
    expect(pre.plans[0].slot).toBe("S1");

    const w = writeFamilyMembers(h.dataset, set);
    expect(w.ok).toBe(true);
    if (!w.ok) return;
    const rec = w.dataset.find((r) => r.positionId === createPositionId(derivedBalls))!;
    expect(rec.strategies.S1?.memberOrigin).toBe("DERIVED_CUE_IMPACT");
    expect(entriesOfFamily(w.dataset, familyId)).toHaveLength(5);
    expectFourTrackFamilyInSlot(w.dataset, familyId, "S2");
  });

  it("TEST 14 — USER profiles read the same slot in all four orientations", () => {
    const h = harness();
    const familyA = saveCreate(h, "S1");
    const familyB = saveCreate(h, "S3");
    const locsB = expectFourTrackFamilyInSlot(h.dataset, familyB, "S3");
    for (const profile of ["userStrict", "userRelaxed"] as CompareProfileId[]) {
      searchEveryOrientation(locsB, familyB, "S3", profile);
      searchEveryOrientation(entriesOfFamily(h.dataset, familyA), familyA, "S1", profile);
    }
  });

  it("no-selection 4-Track write picks one slot free at all four Positions", () => {
    const { byOp } = orbitOfPositionA();
    const h = harness([foreignOccupant(byOp.V, "S1")]);
    const authored = Object.values(byOp.AUTHORED.strategies)[0]!;
    const w = writeFourTrackFamilyMembers(h.dataset, {
      balls: byOp.AUTHORED.balls,
      entry: { ...authored, familyId: "fm_noselect", memberId: "mb_noselect", authoringStrategyId: "as_noselect" },
    });
    expect(w.ok, w.ok ? "" : w.reason).toBe(true);
    if (!w.ok) return;
    expectFourTrackFamilyInSlot(w.dataset, "fm_noselect", "S2");
  });
});
