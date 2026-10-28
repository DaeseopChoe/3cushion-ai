/**
 * Spider Web (거미줄) phase 1 — persistence (SAVE → History → Recall → Publish/Search),
 * builder integration, slot SYS values, contract metadata, 5&Half strip regression.
 * Run: npx vitest run src/domain/spiderWeb
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import spiderAnchors from "../../data/systems/spider_web/anchors.json";
import spiderMeta from "../../data/systems/spider_web/system_meta.json";
import spiderLogic from "../../data/systems/spider_web/logic.json";
import spiderProfile from "../../data/systems/spider_web/profile.json";
import metaSchema from "../../data/systems/schema/system_meta.schema.json";
import type { PositionRecord, StrategyEntry } from "../positionSearchEngine";
import {
  getPersistableBaseSysInputs,
  normalizeCanonicalSaveDraft,
  stripRuntimeSysInputs,
  toCanonicalStrategyEntry,
} from "../canonicalStrategy";
import { createStrategyEntry } from "../adminSaveEngine";
import {
  draftRuntimeFieldsFromStrategyEntry,
  strategyEntryToSlotDraftSys,
} from "../slotDraftFromEntry";
import { hydrateSysFromStrategyEntryWithResolver } from "../strategyHydrateCore";
import { calculateByProfileExpr } from "../../utils/systemCalculator";
import {
  familyCompatibilityFingerprint,
  hydrateFamilyMemberToPositionRecord,
  splitPositionRecordToFamilyParts,
} from "../family/familyHydrate";
import { migratePositionRecordsToFamilyParts } from "../family/migratePositionRecordsToFamilyParts";
import { rematerializeFamilyPartsToPositionRecords } from "../family/rematerializeFamilyPartsToPositionRecords";
import { parseFamilyTrack } from "../family/trackSymmetry";
import { buildTrajectory } from "../trajectory/trajectoryBuilder";
import { buildEffectiveRenderSysValues } from "../calculator/systemValueCalculator";
import { runSaveStrategy, type SaveFlowContext } from "../../application/flows/saveFlow";
import { buildSpiderWebPath, type SpiderAnchorsData } from "./spiderWebGeometry";
import {
  resolveSpiderSlotSys,
  shouldInvalidateSpiderEditsOnSysChange,
  spiderSignatureFromSlotSys,
} from "./spiderWebSlotSys";
import { carryEditDraftToDestinationSlot } from "../adminStrategyDestinationSlot";
import { getSystemMode, getUseSn } from "../system/systemIdentity";
import {
  SPIDER_CONTINUATION_RULE_VERSION,
  buildSpiderContinuationPayload,
  resolveSpiderContinuationVertices,
  spiderContinuationSignature,
} from "./spiderWebContinuation";

const anchors = spiderAnchors as SpiderAnchorsData;
const SPIDER_EXPR = "C3_f = CO_f - C1_f + HP_n";
const INPUTS = { CO_f: 20, C1_f: 40, C3_f: 10, HP_n: 30, HP_sel: -3 };
const TRACK = "LRTL_L";
const SIG = spiderContinuationSignature({ track: TRACK, ...INPUTS });
const VERTICES = { C4: { rail: "TOP" as const, t: 0.3 } };
const CONTINUATION = buildSpiderContinuationPayload(SIG, VERTICES)!;
const SIGNATURE = { systemId: "spider_web", formulaHash: "v1", shotType: "뒤돌리기" };
const BALLS = {
  cue: { x: 10, y: 10 },
  target: { x: 40, y: 20 },
  second: { x: 60, y: 15 },
};
const EXTENSIONS = {
  origin: { kind: "path_node" as const, source: "corrected" as const },
  items: [{ id: "ext1", index: 1 as const, endpoint: { x: 30, y: 0 } }],
};

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

describe("system-specific strip policy", () => {
  it("spider keeps CO_f / C1_f / C3_f / HP_n / HP_sel", () => {
    const raw = { ...INPUTS, Sn: 5, C4_f: 9, outputs: 1 };
    expect(stripRuntimeSysInputs(raw, { systemId: "spider_web" })).toEqual(INPUTS);
  });

  it("5&Half (and default) strip list is unchanged", () => {
    const raw = { CO_f: 30, C1_f: 10, C3_r: 20, C3_f: 4, Sn: 1, C4_f: 2 };
    const expected = { CO_f: 30, C3_r: 20 };
    expect(stripRuntimeSysInputs(raw)).toEqual(expected);
    expect(stripRuntimeSysInputs(raw, { systemId: "5_half_system" })).toEqual(expected);
  });

  it("SAVE cascade keeps spider keys via the slot systemId", () => {
    const out = getPersistableBaseSysInputs(
      { system: "spider_web", system_values: { ...INPUTS, Sn: 3 } },
      { systemId: "spider_web", inputs: INPUTS } as never
    );
    expect(out).toEqual(INPUTS);
    const draft = normalizeCanonicalSaveDraft(
      toCanonicalStrategyEntry({
        slotId: "S1",
        signature: SIGNATURE,
        applied: { sys: { systemId: "spider_web", track: TRACK, inputs: INPUTS } },
        adminSys: { system_values: INPUTS, track: TRACK },
      })
    );
    expect(draft.sysInputs).toEqual(INPUTS);
    expect(draft.track).toBe(TRACK);
  });
});

describe("SAVE → History (normalized Family) → Recall → Publish/Search", () => {
  function buildCtx(): { ctx: SaveFlowContext; written: () => PositionRecord[] } {
    let dataset: PositionRecord[] = [];
    const slotSys = {
      systemId: "spider_web",
      track: TRACK,
      inputs: INPUTS,
      outputs: { result: { C3_f: 10, CO_f: 20, C1_f: 40, HP_n: 30, HP_sel: -3 } },
    };
    const ctx: SaveFlowContext = {
      dataset: [],
      ballsState: BALLS,
      adminState: {
        sys: {
          system: "spider_web",
          systemId: "spider_web",
          shotType: "뒤돌리기",
          track: TRACK,
          inputs: INPUTS,
          system_values: INPUTS,
          corrections: { slide: 0, curve_ratio: 0, draw: 0, departure: 0, spin: 0 },
        },
        hpt: { T: "8/8" },
      } as never,
      activeSlot: "S1",
      slots: {
        S1: {
          draft: { sys: slotSys },
          applied: { sys: slotSys, hpt: { T: "8/8" } },
        },
      },
      targetColor: "red",
      aiOverride: null,
      system: null,
      resolvedSlotSysValues: INPUTS,
      autoSave: false,
      editSource: null,
      trajectoryExtensionPayload: EXTENSIONS as never,
      reflectionOverridePayload: null,
      spiderContinuationPayload: CONTINUATION,
      setDataset: (d) => {
        dataset = d;
      },
      setUserPublishedSearchContext: vi.fn(),
      setAdminState: vi.fn(),
      patchSlotRuntimeMeta: vi.fn(),
      patchSlotFamilyIdentity: vi.fn(),
      saveToFile: vi.fn(),
      resolveFormulaHash: () => "v1",
      resolveEvalProfile: () => ({ formula: { expr: SPIDER_EXPR } }),
      resolveAnchorsData: () => anchors as never,
    };
    return { ctx, written: () => dataset };
  }

  it("persists systemId, route track, spider sysInputs and spiderContinuation on an exact single-track write", () => {
    expect(parseFamilyTrack(TRACK)).toBeNull();
    const { ctx, written } = buildCtx();
    const result = runSaveStrategy(ctx);
    expect(result.ok).toBe(true);
    const records = written();
    expect(records).toHaveLength(1);
    const entry = records[0].strategies.S1!;
    expect(entry.signature.systemId).toBe("spider_web");
    expect(entry.track).toBe(TRACK);
    expect(entry.sysInputs).toEqual(INPUTS);
    expect(entry.spiderContinuation).toEqual(CONTINUATION);
    expect(entry.trajectoryExtensions).toEqual(EXTENSIONS);
    expect((entry.sysInputs as Record<string, unknown>).C4_f).toBeUndefined();
  });

  it("History split/rematerialize and Recall hydrate restore inputs, track, tip, C4–C6 edits and E1/E2", () => {
    const { ctx, written } = buildCtx();
    expect(runSaveStrategy(ctx).ok).toBe(true);
    const saved = written();

    const migrated = migratePositionRecordsToFamilyParts(saved);
    expect(migrated.ok).toBe(true);
    if (!migrated.ok) return;
    expect(migrated.members[0].spiderContinuation).toEqual(CONTINUATION);
    expect(migrated.members[0].track).toBe(TRACK);
    expect(migrated.masters[0].sysInputs).toEqual(INPUTS);

    const remat = rematerializeFamilyPartsToPositionRecords({
      masters: migrated.masters,
      members: migrated.members,
    });
    expect(remat.ok).toBe(true);
    if (!remat.ok) return;
    const entry = remat.dataset[0].strategies.S1 as StrategyEntry;
    expect(entry.signature.systemId).toBe("spider_web");
    expect(entry.track).toBe(TRACK);
    expect(entry.spiderContinuation).toEqual(CONTINUATION);
    expect(entry.trajectoryExtensions).toEqual(EXTENSIONS);

    const sys = strategyEntryToSlotDraftSys(entry);
    expect(sys.systemId).toBe("spider_web");
    expect(sys.track).toBe(TRACK);
    expect(sys.inputs).toEqual(INPUTS);
    const runtime = draftRuntimeFieldsFromStrategyEntry(entry);
    expect(runtime.spiderContinuation).toEqual(CONTINUATION);
    expect(runtime.trajectoryExtensions).toEqual(EXTENSIONS);
    expect(runtime.system_values).toEqual(INPUTS);

    const sigAfter = spiderContinuationSignature({ track: sys.track, ...(sys.inputs as typeof INPUTS) });
    const vertices = resolveSpiderContinuationVertices(runtime.spiderContinuation, sigAfter);
    expect(vertices).toEqual(VERTICES);
    const before = buildSpiderWebPath({ track: TRACK, inputs: INPUTS, anchorsData: anchors, vertices: VERTICES });
    const after = buildSpiderWebPath({ track: sys.track, inputs: sys.inputs, anchorsData: anchors, vertices });
    expect(after.ok && after.pathNodes).toEqual(before.ok && before.pathNodes);
  });

  it("member split / hydrate (Publish / Search path) keeps spiderContinuation in the fingerprint", () => {
    const entry: StrategyEntry = {
      slot: "S1",
      signature: SIGNATURE,
      sysInputs: INPUTS,
      track: TRACK,
      authoringStrategyId: "as_spider",
      familyId: "fm_spider1",
      memberId: "mb_spider1",
      memberOrigin: "AUTHORED",
      spiderContinuation: CONTINUATION,
      meta: { impact: { x: 1, y: 1 }, final: { x: 2, y: 2 }, angle_ci: 0, angle_fs: 0 },
    };
    const record: PositionRecord = { positionId: "p1", balls: BALLS, strategies: { S1: entry } };
    const split = splitPositionRecordToFamilyParts(record, "S1");
    expect(split.ok).toBe(true);
    if (!split.ok) return;
    expect(split.member.spiderContinuation).toEqual(CONTINUATION);
    const hydrated = hydrateFamilyMemberToPositionRecord(split.master, split.member, {
      slot: "S1",
      positionId: "p1",
      meta: entry.meta,
    });
    expect(hydrated.strategies.S1?.spiderContinuation).toEqual(CONTINUATION);
    expect(familyCompatibilityFingerprint(hydrated, "S1")).toEqual(
      familyCompatibilityFingerprint(record, "S1")
    );
    expect(familyCompatibilityFingerprint(record, "S1")?.spiderContinuation).toEqual(CONTINUATION);
  });

  it("createStrategyEntry stores spiderContinuation separately from sysInputs and extensions", () => {
    const entry = createStrategyEntry({
      slot: "S1",
      signature: SIGNATURE,
      sysInputs: INPUTS,
      balls: BALLS,
      track: TRACK,
      evaluateStrategy: () => ({ userImpact: { x: 1, y: 1 }, userFinal: { x: 2, y: 2 } }),
      spiderContinuation: CONTINUATION,
    });
    expect(entry.spiderContinuation).toEqual(CONTINUATION);
    expect(entry.sysInputs).toEqual(INPUTS);
    expect(entry.trajectoryExtensions).toBeUndefined();
  });

  it("Recall hydrate keeps spider inputs and recomputes C3_f from the profile expression", () => {
    const entry = {
      slot: "S1",
      signature: SIGNATURE,
      sysInputs: INPUTS,
      track: TRACK,
    } as StrategyEntry;
    const h = hydrateSysFromStrategyEntryWithResolver(entry, {
      getExpr: () => SPIDER_EXPR,
      calculate: calculateByProfileExpr,
    });
    expect(h.inputs).toEqual(INPUTS);
    expect(h.track).toBe(TRACK);
    expect(h.outputs.result.C3_f).toBe(10);
  });
});

describe("trajectoryBuilder spider branch", () => {
  it("uses the spider path nodes, frame labels and no generic C2 / handles", () => {
    const path = buildSpiderWebPath({ track: TRACK, inputs: INPUTS, anchorsData: anchors });
    expect(path.ok).toBe(true);
    if (!path.ok) return;
    const build = buildTrajectory({
      anchors: {},
      rawAnchors: {},
      resolveAnchorCtx: { track: TRACK, systemId: "spider_web" },
      balls: BALLS,
      ballDiameterRg: 1,
      ballRadiusRg: 0.5,
      spiderWebPath: path,
    });
    expect(build.corrected.pathNodes).toEqual(path.pathNodes);
    expect(build.corrected.cap.endIndex).toBe(6);
    expect(build.corrected.cushionPath).toHaveLength(7);
    expect(build.baseline?.pathNodes).toEqual(path.pathNodes);
    expect(build.labels.anchorSources.CO?.coord).toEqual({ x: -2.25, y: 20 });
    expect(build.labels.anchorSources.C1?.coord).toEqual({ x: 82.25, y: 20 });
    expect(build.labels.anchorSources.C3?.coord).toEqual(path.frame.C3);
    expect(build.labels.anchorSources.C4?.coord).toEqual(path.pathNodes[4]);
    expect(build.handles).toEqual({ coRg: null, c1Rg: null });
    expect(build.corrected.useCurveDeform).toBe(false);
  });

  it("a failed spider path (C2 연결 불가) renders no trajectory and no labels — no generic fallback", () => {
    const failed = buildSpiderWebPath({
      track: TRACK,
      inputs: INPUTS,
      anchorsData: anchors,
      config: { tipDeltaDeg: [0, 0, 0, 170, 170], decay: [1, 0.8, 0.7] },
    });
    expect(failed).toMatchObject({ ok: false, code: "C2_NO_SOLUTION" });
    const genericAnchors = {
      CO: { coord: { x: 0, y: 20 } },
      C1: { coord: { x: 80, y: 20 } },
      C2: { coord: { x: 40, y: 40 } },
      C3: { coord: { x: 0, y: 30 } },
    };
    const build = buildTrajectory({
      anchors: genericAnchors,
      rawAnchors: genericAnchors,
      resolveAnchorCtx: { track: TRACK, systemId: "spider_web" },
      balls: BALLS,
      ballDiameterRg: 1,
      ballRadiusRg: 0.5,
      spiderWebPath: failed,
    });
    expect(build.corrected.pathNodes.every((n) => n === null)).toBe(true);
    expect(build.corrected.cushionPath).toEqual([]);
    expect(build.corrected.cushionPathForRender).toEqual([]);
    expect(build.baseline).toBeNull();
    expect(build.labels.anchorSources).toEqual({});
    expect(build.impact).toEqual({ raw: null, contactRg: null });
  });
});

describe("slot SYS values for spider", () => {
  it("commit result holds only spider keys (C3_f first) and drops stale 5&Half outputs", () => {
    const r = resolveSpiderSlotSys(TRACK, { ...INPUTS, Sn: 5, C4_f: 9, C3_r: 3 });
    expect(r).not.toBeNull();
    expect(Object.keys(r!.result)[0]).toBe("C3_f");
    expect(r!.result).toEqual({ C3_f: 10, CO_f: 20, C1_f: 40, HP_n: 30, HP_sel: -3 });
    expect(r!.inputs).toEqual(INPUTS);
    expect(resolveSpiderSlotSys(TRACK, { ...INPUTS, HP_sel: 3 })).toBeNull();
    expect(resolveSpiderSlotSys("B2T_L", INPUTS)).toBeNull();
  });

  it("render values ignore 5&Half corrections / Sn / C4 for spider", () => {
    const out = buildEffectiveRenderSysValues(
      { ...INPUTS, Sn: 5, C4_f: 9 },
      { systemId: "spider_web", track: TRACK } as never,
      { corrections: { slide: 3, spin: 2, departure: 4 } }
    );
    expect(out).toEqual(INPUTS);
  });
});

describe("spider_web metadata / schema", () => {
  it("system_meta lists the four route tracks (not FamilyTrack)", () => {
    expect(spiderMeta.track_model).toBe("route_track");
    expect(spiderMeta.canonical_track).toBe("RLTR_R");
    expect(spiderMeta.allowed_tracks).toEqual(["RLTR_R", "LRTL_L", "RLBR_L", "LRBL_R"]);
  });

  it("logic allows calculation and has no dangling rules reference", () => {
    expect(spiderLogic.calculation_policy.calculation_allowed).toBe(true);
    expect(JSON.stringify(spiderLogic)).not.toContain("rules.json");
    expect(spiderLogic.track_policy.available_tracks).toEqual(spiderMeta.allowed_tracks);
  });

  it("profile keeps the formula and declares value domains", () => {
    expect(spiderProfile.formula.expr).toBe(SPIDER_EXPR);
    expect(spiderProfile.value_domains).toEqual({ CO_f: [0, 40], C1_f: [0, 80], C3_f: [0, 80], HP_n: [0, 40] });
  });

  it("anchors use the standard anchors[{id}] shape and define nine hit points", () => {
    const traj = spiderAnchors.trajectories as Record<string, { anchors: { id: string }[] }>;
    expect(Object.keys(traj)).toEqual(["RLTR_R", "LRTL_L", "RLBR_L", "LRBL_R"]);
    for (const t of Object.values(traj)) {
      expect(Array.isArray(t.anchors)).toBe(true);
      expect(t.anchors.every((a) => /^(CO|C1|C3)_\(-?[\d.]+,-?[\d.]+\)_-?[\d.]+$/.test(a.id))).toBe(true);
    }
    const points = spiderAnchors.hit_points.spider_web.points;
    expect(points.map((p) => p.id)).toEqual(["0", "R1", "R2", "R3", "R4", "L1", "L2", "L3", "L4"]);
    expect(points.map((p) => p.hpN)).toEqual([0, 10, 20, 30, 40, 10, 20, 30, 40]);
    expect(JSON.stringify(spiderAnchors.hit_points)).not.toContain('"tip":3');
  });

  it("schema widening keeps the Family tracks / families and adds route tracks only", () => {
    const props = metaSchema.properties as Record<string, { enum?: string[]; items?: { enum?: string[] } }>;
    for (const t of ["B2T_L", "B2T_R", "T2B_L", "T2B_R"]) {
      expect(props.canonical_track.enum).toContain(t);
      expect(props.allowed_tracks.items?.enum).toContain(t);
    }
    for (const t of spiderMeta.allowed_tracks) {
      expect(props.canonical_track.enum).toContain(t);
    }
    expect(props.family.enum).toContain("spider");
    expect(props.family.enum).toContain("other");
    expect(metaSchema.required).toEqual([
      "system_id",
      "family",
      "required_cushions",
      "canonical_track",
      "entry_rail",
      "exit_rail",
    ]);
  });

  it("rule version constant is stable", () => {
    expect(SPIDER_CONTINUATION_RULE_VERSION).toBe(1);
  });

  it("system identity: spider is full_input without Sn", () => {
    expect(getSystemMode("spider_web")).toBe("full_input");
    expect(getUseSn("spider_web")).toBe(false);
  });
});

describe("spider_web runtime invalidation / slot carry", () => {
  const sys = (over: Record<string, unknown> = {}, track = TRACK) => ({
    systemId: "spider_web",
    track,
    inputs: { ...INPUTS, ...over },
  });

  it("signature only for valid spider sys", () => {
    expect(spiderSignatureFromSlotSys(sys())).toBe(SIG);
    expect(spiderSignatureFromSlotSys({ systemId: "5_half_system", track: "B2T_L", inputs: INPUTS })).toBeNull();
    expect(spiderSignatureFromSlotSys(sys({ C3_f: 11 }))).toBeNull();
  });

  it("SYS value / tip / track / system changes invalidate; identical SYS keeps edits", () => {
    expect(shouldInvalidateSpiderEditsOnSysChange(sys(), sys())).toBe(false);
    expect(shouldInvalidateSpiderEditsOnSysChange(sys(), sys({ C1_f: 30, C3_f: 20 }))).toBe(true);
    expect(shouldInvalidateSpiderEditsOnSysChange(sys(), sys({ HP_n: 40, HP_sel: -4, C3_f: 20 }))).toBe(true);
    expect(
      shouldInvalidateSpiderEditsOnSysChange(
        sys({}, "LRTL_L"),
        sys({ HP_sel: 3 }, "RLTR_R")
      )
    ).toBe(true);
    expect(
      shouldInvalidateSpiderEditsOnSysChange(sys(), {
        systemId: "5_half_system",
        track: "B2T_L",
        inputs: { CO_f: 40, C1_f: 20 },
      })
    ).toBe(true);
    expect(
      shouldInvalidateSpiderEditsOnSysChange(
        { systemId: "5_half_system", track: "B2T_L", inputs: {} },
        { systemId: "5_half_system", track: "B2T_R", inputs: {} }
      )
    ).toBe(false);
  });

  it("destination slot carry copies / clears live spiderContinuation", () => {
    const slots = {
      S1: { draft: { sys: sys(), spiderContinuation: CONTINUATION }, applied: null },
      S2: { draft: null, applied: null },
      S3: { draft: null, applied: null },
    };
    const live = buildSpiderContinuationPayload(SIG, { C5: { rail: "RIGHT", t: 0.4 } });
    const carried = carryEditDraftToDestinationSlot(slots as never, "S1", "S2", {
      spiderContinuation: live,
    }) as Record<string, { draft: Record<string, unknown> | null }>;
    expect(carried.S2.draft?.spiderContinuation).toEqual(live);
    const cleared = carryEditDraftToDestinationSlot(slots as never, "S1", "S2", {
      spiderContinuation: null,
    }) as Record<string, { draft: Record<string, unknown> | null }>;
    expect(cleared.S2.draft?.spiderContinuation).toBeUndefined();
  });
});
