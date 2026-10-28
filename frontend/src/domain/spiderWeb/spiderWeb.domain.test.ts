/**
 * Spider Web (거미줄) phase 1 — tracks · 9 tips · solver · C3 60 boundary · continuation · E1/E2.
 * Run: npx vitest run src/domain/spiderWeb
 */

import { describe, expect, it } from "vitest";
import spiderAnchors from "../../data/systems/spider_web/anchors.json";
import {
  SPIDER_WEB_TRACKS,
  SPIDER_WEB_TRACK_IDS,
  spiderC3Rail,
  type SpiderWebTrackId,
} from "./spiderWebTracks";
import {
  solveSpiderWeb,
  spiderAllowedHpSelections,
  spiderHitPointFromSelection,
  spiderValuesFromStoredInputs,
} from "./spiderWebSolver";
import {
  SPIDER_C2_SOLVE_ANGLE_TOL,
  buildSpiderWebPath,
  solveSpiderC2,
  spiderC2SpinDeltaDeg,
  spiderMarkFramePoint,
} from "./spiderWebGeometry";
import {
  SPIDER_CONTINUATION_DEFAULTS,
  applySpiderVertexEdit,
  buildSpiderContinuationPayload,
  resolveSpiderContinuationVertices,
  spiderContinuationDeltaDeg,
  spiderContinuationSignature,
} from "./spiderWebContinuation";
import { reflectionOverrideFromPoint } from "../trajectory/c2ReflectionOverride";
import {
  appendExtension1Draft,
  appendExtension2Draft,
  resolveDraftSegments,
} from "../trajectoryExtension/proposal";
import { resolveOrigin } from "../trajectoryExtension/origin";

const anchors = spiderAnchors as Parameters<typeof spiderMarkFramePoint>[0];

function solvedInputs(track: SpiderWebTrackId, co: number, c1: number, sel: number) {
  const r = solveSpiderWeb({ track, solveTarget: "C3_f", CO_f: co, C1_f: c1, hpSel: sel });
  if (!r.ok) throw new Error(`solve failed: ${r.code}`);
  return r.values;
}

function pathFor(track: SpiderWebTrackId, inputs: Record<string, number>, vertices = {}) {
  const p = buildSpiderWebPath({ track, inputs, anchorsData: anchors, vertices });
  if (!p.ok) throw new Error(`path failed: ${p.code}`);
  return p;
}

/** Inputs with an arbitrary C3 (HP solved exactly so C3 is the requested value). */
function inputsWithC3(track: SpiderWebTrackId, c3: number) {
  const sel = SPIDER_WEB_TRACKS[track].spin === "R" ? 4 : -4;
  const co = 40;
  const c1 = co + 40 - c3;
  return { CO_f: co, C1_f: c1, C3_f: c3, HP_n: 40, HP_sel: sel };
}

function railOf(p: { x: number; y: number }): string {
  if (Math.abs(p.x) < 1e-6) return "LEFT";
  if (Math.abs(p.x - 80) < 1e-6) return "RIGHT";
  if (Math.abs(p.y) < 1e-6) return "BOTTOM";
  if (Math.abs(p.y - 40) < 1e-6) return "TOP";
  return "NONE";
}

describe("spider_web track table + labels (4 tracks)", () => {
  it("declares the four route tracks with the specified rails and tips", () => {
    expect(SPIDER_WEB_TRACK_IDS).toEqual(["RLTR_R", "LRTL_L", "RLBR_L", "LRBL_R"]);
    expect(SPIDER_WEB_TRACKS.RLTR_R).toMatchObject({ co: "RIGHT", c1: "LEFT", c2: "TOP", c3Short: "RIGHT", c3Long: "BOTTOM", spin: "R" });
    expect(SPIDER_WEB_TRACKS.LRTL_L).toMatchObject({ co: "LEFT", c1: "RIGHT", c2: "TOP", c3Short: "LEFT", c3Long: "BOTTOM", spin: "L" });
    expect(SPIDER_WEB_TRACKS.RLBR_L).toMatchObject({ co: "RIGHT", c1: "LEFT", c2: "BOTTOM", c3Short: "RIGHT", c3Long: "TOP", spin: "L" });
    expect(SPIDER_WEB_TRACKS.LRBL_R).toMatchObject({ co: "LEFT", c1: "RIGHT", c2: "BOTTOM", c3Short: "LEFT", c3Long: "TOP", spin: "R" });
  });

  it("LRTL_L CO_20 sits on the left frame and C1_40 on the right frame", () => {
    const co = spiderMarkFramePoint(anchors, "LRTL_L", "CO", 20);
    const c1 = spiderMarkFramePoint(anchors, "LRTL_L", "C1", 40);
    expect(co).toEqual({ point: { x: -2.25, y: 20 }, rail: "LEFT" });
    expect(c1).toEqual({ point: { x: 82.25, y: 20 }, rail: "RIGHT" });
  });

  it.each(SPIDER_WEB_TRACK_IDS)("%s: CO/C1/C2/C3 rail nodes are on the declared rails", (track) => {
    const sel = SPIDER_WEB_TRACKS[track].spin === "R" ? 3 : -3;
    const p = pathFor(track, solvedInputs(track, 20, 40, sel));
    const spec = SPIDER_WEB_TRACKS[track];
    expect(p.values.C3_f).toBe(10);
    expect(railOf(p.pathNodes[0]!)).toBe(spec.co);
    expect(railOf(p.pathNodes[1]!)).toBe(spec.c1);
    expect(railOf(p.pathNodes[2]!)).toBe(spec.c2);
    expect(railOf(p.pathNodes[3]!)).toBe(spec.c3Short);
    expect(p.rails).toEqual({ CO: spec.co, C1: spec.c1, C2: spec.c2, C3: spec.c3Short });
    const frameX = (rail: string) => (rail === "LEFT" ? -2.25 : 82.25);
    expect(p.frame.CO.x).toBe(frameX(spec.co));
    expect(p.frame.C1.x).toBe(frameX(spec.c1));
    expect(p.frame.C3.x).toBe(frameX(spec.c3Short));
  });

});

type Pt = { x: number; y: number };
const TIP_DEG = [0, 5, 10, 13, 18];
const spinSign = (track: SpiderWebTrackId) => (SPIDER_WEB_TRACKS[track].spin === "R" ? 1 : -1);
const ZERO_TIP_CONFIG = { ...SPIDER_CONTINUATION_DEFAULTS, tipDeltaDeg: [0, 0, 0, 0, 0] };

function angDeg(a: Pt, b: Pt): number {
  return (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI;
}
function wrapDeg(d: number): number {
  return ((((d + 180) % 360) + 360) % 360) - 180;
}
/** Pure specular C2 (old behaviour): mirror C3 across the C2 rail and intersect C1 → mirror. */
function specularC2(c1: Pt, c3: Pt, rail: string): Pt {
  const y = rail === "TOP" ? 40 : 0;
  const m = { x: c3.x, y: 2 * y - c3.y };
  const t = (y - c1.y) / (m.y - c1.y);
  return { x: c1.x + t * (m.x - c1.x), y };
}
/** Measured C1 → C2 → C3 rotation relative to the specular reflection on a horizontal rail. */
function measuredC2RotationDeg(c1: Pt, c2: Pt, c3: Pt): number {
  return wrapDeg(angDeg(c2, c3) - -angDeg(c1, c2));
}
/** Measured C2 → C3 → C4 rotation relative to the specular reflection on the C3 rail. */
function measuredC3RotationDeg(c2: Pt, c3: Pt, c4: Pt, c3Rail: string): number {
  const vin = { x: c3.x - c2.x, y: c3.y - c2.y };
  const spec = c3Rail === "LEFT" || c3Rail === "RIGHT" ? { x: -vin.x, y: vin.y } : { x: vin.x, y: -vin.y };
  return wrapDeg(angDeg(c3, c4) - (Math.atan2(spec.y, spec.x) * 180) / Math.PI);
}

describe("spider_web C1 → C2 spin-corrected reflection (C3 fixed)", () => {
  it.each(SPIDER_WEB_TRACK_IDS)("%s: tip 0 keeps the pure specular C2", (track) => {
    const p = pathFor(track, solvedInputs(track, 30, 10, 0));
    const [, c1, c2, c3] = p.pathNodes as Pt[];
    expect(p.c2DeltaDeg).toBe(0);
    const spec = specularC2(c1, c3, p.rails.C2);
    expect(c2.x).toBeCloseTo(spec.x, 8);
    expect(c2.y).toBe(spec.y);
    expect(measuredC2RotationDeg(c1, c2, c3)).toBeCloseTo(0, 6);
  });

  it.each(SPIDER_WEB_TRACK_IDS)("%s: tips 1–4 rotate C1 → C2 → C3 by the track spin and move C2 off the specular point", (track) => {
    for (const level of [1, 2, 3, 4]) {
      const p = pathFor(track, solvedInputs(track, 30, 20, spinSign(track) * level));
      const [, c1, c2, c3] = p.pathNodes as Pt[];
      const expected = spinSign(track) * TIP_DEG[level];
      expect(p.c2DeltaDeg).toBe(expected);
      expect(railOf(c2)).toBe(SPIDER_WEB_TRACKS[track].c2);
      expect(c2.x).toBeGreaterThanOrEqual(0);
      expect(c2.x).toBeLessThanOrEqual(80);
      expect(measuredC2RotationDeg(c1, c2, c3)).toBeCloseTo(expected, 6);
      expect(Math.abs(c2.x - specularC2(c1, c3, p.rails.C2).x)).toBeGreaterThan(0.05);
    }
  });

  it.each(SPIDER_WEB_TRACK_IDS)("%s: C3 coordinate, rail and value stay the formula answer", (track) => {
    for (const level of [1, 2, 3, 4]) {
      const inputs = solvedInputs(track, 30, 20, spinSign(track) * level);
      expect(inputs.C3_f).toBe(30 - 20 + 10 * level);
      const p = pathFor(track, inputs);
      const specular = buildSpiderWebPath({ track, inputs, anchorsData: anchors, vertices: {}, config: ZERO_TIP_CONFIG });
      if (!specular.ok) throw new Error(specular.code);
      expect(p.values.C3_f).toBe(inputs.C3_f);
      expect(p.rails.C3).toBe(specular.rails.C3);
      expect(p.frame.C3).toEqual(spiderMarkFramePoint(anchors, track, "C3", inputs.C3_f)!.point);
      expect(p.pathNodes[3]).toEqual(specular.pathNodes[3]);
      expect(p.pathNodes.slice(0, 2)).toEqual(specular.pathNodes.slice(0, 2));
      expect(p.pathNodes[2]).not.toEqual(specular.pathNodes[2]);
    }
  });

  it.each(SPIDER_WEB_TRACK_IDS)("%s: C3 60 / 60.1 / 70 / 80 — C1 → C2 keeps the track spin; only C3 → C4 reverses above 60", (track) => {
    const s = spinSign(track);
    for (const c3 of [60, 60.1, 70, 80]) {
      const p = pathFor(track, inputsWithC3(track, c3));
      const [, c1, c2, c3p, c4] = p.pathNodes as Pt[];
      expect(p.c2DeltaDeg).toBe(s * 18);
      expect(measuredC2RotationDeg(c1, c2, c3p)).toBeCloseTo(s * 18, 6);
      const branch = c3 > 60 ? -1 : 1;
      expect(spiderContinuationDeltaDeg({ track, c3, level: 4, stepIndex: 0 })).toBe(branch * s * 18);
      if (!c4) {
        // C3 on the table corner (60 / 60.1): continuation has no rail hit, same as with a specular C2.
        const specular = buildSpiderWebPath({ track, inputs: inputsWithC3(track, c3), anchorsData: anchors, vertices: {}, config: ZERO_TIP_CONFIG });
        expect(specular.ok && specular.pathNodes[4]).toBeNull();
        continue;
      }
      expect(p.continuation[0]!.deltaDeg).toBe(branch * s * 18);
      expect(Math.sign(measuredC3RotationDeg(c2, c3p, c4, p.rails.C3))).toBe(branch * s);
    }
  });

  it("solver failures return a code + Korean message and never a nearby point", () => {
    const korean = /[가-힣]/;
    const noSol = solveSpiderC2({ c1: { x: 80, y: 0 }, c3: { x: 78, y: 0 }, c2Rail: "TOP", deltaDeg: -18 });
    expect(noSol).toMatchObject({ ok: false, code: "C2_NO_SOLUTION" });
    expect(!noSol.ok && noSol.message).toMatch(korean);
    expect(noSol).not.toHaveProperty("point");
    expect(solveSpiderC2({ c1: { x: 80, y: 0 }, c3: { x: 78, y: 0 }, c2Rail: "TOP", deltaDeg: 0 }).ok).toBe(true);

    const degenerate = solveSpiderC2({ c1: { x: 10, y: 40 }, c3: { x: 0, y: 20 }, c2Rail: "TOP", deltaDeg: 5 });
    expect(degenerate).toMatchObject({ ok: false, code: "C2_DEGENERATE" });
    expect(!degenerate.ok && degenerate.message).toMatch(korean);
    expect(solveSpiderC2({ c1: { x: Number.NaN, y: 10 }, c3: { x: 0, y: 20 }, c2Rail: "TOP", deltaDeg: 5 })).toMatchObject({
      ok: false,
      code: "C2_DEGENERATE",
    });
    expect(solveSpiderC2({ c1: { x: 80, y: 10 }, c3: { x: 0, y: 20 }, c2Rail: "LEFT", deltaDeg: 5 })).toMatchObject({
      ok: false,
      code: "C2_DEGENERATE",
    });

    const notConverged = solveSpiderC2({ c1: { x: 80, y: 10 }, c3: { x: 0, y: 20 }, c2Rail: "TOP", deltaDeg: 5, maxIter: 3 });
    expect(notConverged).toMatchObject({ ok: false, code: "C2_NOT_CONVERGED" });
    expect(!notConverged.ok && notConverged.message).toMatch(korean);
    const converged = solveSpiderC2({ c1: { x: 80, y: 10 }, c3: { x: 0, y: 20 }, c2Rail: "TOP", deltaDeg: 5 });
    expect(converged.ok && converged.residualRad).toBeLessThanOrEqual(SPIDER_C2_SOLVE_ANGLE_TOL);
  });

  it("path-level C2 failure yields no path nodes (no fallback trajectory)", () => {
    const inputs = solvedInputs("LRTL_L", 20, 40, -4);
    const forced = buildSpiderWebPath({
      track: "LRTL_L",
      inputs,
      anchorsData: anchors,
      vertices: {},
      config: { ...SPIDER_CONTINUATION_DEFAULTS, tipDeltaDeg: [0, 0, 0, 0, 170] },
    });
    expect(forced).toMatchObject({ ok: false, code: "C2_NO_SOLUTION" });
    expect(forced).not.toHaveProperty("pathNodes");
    expect(spiderC2SpinDeltaDeg("LRTL_L", 4)).toBe(-18);
    expect(spiderC2SpinDeltaDeg("RLTR_R", 4)).toBe(18);
    expect(spiderC2SpinDeltaDeg("RLBR_L", 0)).toBe(0);

    const corner = buildSpiderWebPath({ track: "RLTR_R", inputs: solvedInputs("RLTR_R", 30, 30, 0), anchorsData: anchors, vertices: {} });
    expect(corner).toMatchObject({ ok: false, code: "C2_DEGENERATE" });
    expect(corner).not.toHaveProperty("pathNodes");
  });
});

describe("spider_web 9 hit points (-4..+4 → HPn)", () => {
  it("_R tracks allow 0..+4, _L tracks allow 0..-4", () => {
    expect(spiderAllowedHpSelections("RLTR_R")).toEqual([0, 1, 2, 3, 4]);
    expect(spiderAllowedHpSelections("LRBL_R")).toEqual([0, 1, 2, 3, 4]);
    expect(spiderAllowedHpSelections("LRTL_L")).toEqual([0, -1, -2, -3, -4]);
    expect(spiderAllowedHpSelections("RLBR_L")).toEqual([0, -1, -2, -3, -4]);
  });

  it("converts the signed selection into unsigned HPn = 10·|n| and keeps direction", () => {
    for (const sel of [0, 1, 2, 3, 4]) {
      const r = spiderHitPointFromSelection("RLTR_R", sel);
      expect(r.ok && r.hitPoint.hpN).toBe(10 * sel);
      expect(r.ok && r.hitPoint.hitPointId).toBe(sel === 0 ? "0" : `R${sel}`);
    }
    for (const sel of [-1, -2, -3, -4]) {
      const r = spiderHitPointFromSelection("LRTL_L", sel);
      expect(r.ok && r.hitPoint.hpN).toBe(10 * Math.abs(sel));
      expect(r.ok && r.hitPoint.spinDirection).toBe("L");
      expect(r.ok && r.hitPoint.hitPointId).toBe(`L${Math.abs(sel)}`);
    }
  });

  it("rejects the opposite direction and never yields HPn = -40", () => {
    expect(spiderHitPointFromSelection("RLTR_R", -4)).toMatchObject({ ok: false, code: "HP_DIRECTION_MISMATCH" });
    expect(spiderHitPointFromSelection("LRTL_L", 3)).toMatchObject({ ok: false, code: "HP_DIRECTION_MISMATCH" });
    expect(spiderHitPointFromSelection("RLTR_R", 5)).toMatchObject({ ok: false, code: "HP_INVALID_SELECTION" });
    expect(spiderHitPointFromSelection("RLTR_R", 1.5)).toMatchObject({ ok: false, code: "HP_INVALID_SELECTION" });
    const left4 = spiderHitPointFromSelection("LRTL_L", -4);
    expect(left4.ok && left4.hitPoint.hpN).toBe(40);
  });
});

describe("spider_web solver (explicit target, any three)", () => {
  it("solves C3, CO, C1 and HP", () => {
    expect(solveSpiderWeb({ track: "LRTL_L", solveTarget: "C3_f", CO_f: 20, C1_f: 40, hpSel: -3 })).toMatchObject({
      ok: true,
      values: { CO_f: 20, C1_f: 40, C3_f: 10, HP_n: 30, HP_sel: -3 },
    });
    expect(solveSpiderWeb({ track: "LRTL_L", solveTarget: "CO_f", C1_f: 40, C3_f: 10, hpSel: -3 })).toMatchObject({
      ok: true,
      values: { CO_f: 20 },
    });
    expect(solveSpiderWeb({ track: "LRTL_L", solveTarget: "C1_f", CO_f: 20, C3_f: 10, hpSel: -3 })).toMatchObject({
      ok: true,
      values: { C1_f: 40 },
    });
    expect(solveSpiderWeb({ track: "LRTL_L", solveTarget: "HP", CO_f: 20, C1_f: 40, C3_f: 20 })).toMatchObject({
      ok: true,
      values: { HP_n: 40, HP_sel: -4 },
      hitPoint: { hitPointId: "L4" },
    });
    expect(solveSpiderWeb({ track: "RLTR_R", solveTarget: "HP", CO_f: 20, C1_f: 40, C3_f: -20 })).toMatchObject({
      ok: false,
      code: "C3_BELOW_MIN",
    });
    expect(solveSpiderWeb({ track: "RLTR_R", solveTarget: "HP", CO_f: 30, C1_f: 10, C3_f: 20 })).toMatchObject({
      ok: true,
      values: { HP_n: 0, HP_sel: 0 },
      hitPoint: { hitPointId: "0" },
    });
  });

  it("blocks HP values that are not exactly 0/10/20/30/40 (no rounding)", () => {
    expect(solveSpiderWeb({ track: "RLTR_R", solveTarget: "HP", CO_f: 20, C1_f: 40, C3_f: 5 })).toMatchObject({
      ok: false,
      code: "HP_NOT_REPRESENTABLE",
    });
    expect(solveSpiderWeb({ track: "RLTR_R", solveTarget: "HP", CO_f: 20, C1_f: 40, C3_f: 29.9 })).toMatchObject({
      ok: false,
      code: "HP_NOT_REPRESENTABLE",
    });
    expect(solveSpiderWeb({ track: "RLTR_R", solveTarget: "HP", CO_f: 0, C1_f: 0, C3_f: 50 })).toMatchObject({
      ok: false,
      code: "HP_NOT_REPRESENTABLE",
    });
  });

  it("blocks C3 < 0 and C3 > 80 with a clear error", () => {
    const below = solveSpiderWeb({ track: "RLTR_R", solveTarget: "C3_f", CO_f: 10, C1_f: 60, hpSel: 1 });
    expect(below).toMatchObject({ ok: false, code: "C3_BELOW_MIN" });
    expect(!below.ok && below.message).toContain("C3");
    const above = solveSpiderWeb({ track: "LRBL_R", solveTarget: "C1_f", CO_f: 20, C3_f: 90, hpSel: 4 });
    expect(above).toMatchObject({ ok: false, code: "C3_ABOVE_MAX" });
    expect(!above.ok && above.message).toContain("C3");
    expect(solveSpiderWeb({ track: "RLTR_R", solveTarget: "CO_f", C1_f: 0, C3_f: 80.5, hpSel: 4 })).toMatchObject({
      ok: false,
      code: "C3_ABOVE_MAX",
    });
    expect(solveSpiderWeb({ track: "RLTR_R", solveTarget: "C3_f", CO_f: 40, C1_f: 0, hpSel: 4 })).toMatchObject({
      ok: true,
      values: { C3_f: 80 },
    });
    expect(solveSpiderWeb({ track: "RLTR_R", solveTarget: "C3_f", CO_f: 40, C1_f: 0, hpSel: 3 })).toMatchObject({
      ok: true,
      values: { C3_f: 70 },
    });
  });

  it("validates ranges, direction and target selection", () => {
    expect(solveSpiderWeb({ track: "RLTR_R", solveTarget: "C3_f", CO_f: 41, C1_f: 0, hpSel: 0 })).toMatchObject({ ok: false, code: "CO_OUT_OF_RANGE" });
    expect(solveSpiderWeb({ track: "RLTR_R", solveTarget: "C1_f", CO_f: 0, C3_f: 10, hpSel: 0 })).toMatchObject({ ok: false, code: "C1_OUT_OF_RANGE" });
    expect(solveSpiderWeb({ track: "RLTR_R", solveTarget: "C3_f", CO_f: 20, C1_f: 10, hpSel: -2 })).toMatchObject({ ok: false, code: "HP_DIRECTION_MISMATCH" });
    expect(solveSpiderWeb({ track: "RLTR_R", solveTarget: undefined, CO_f: 20, C1_f: 10, hpSel: 2 })).toMatchObject({ ok: false, code: "INVALID_SOLVE_TARGET" });
    expect(solveSpiderWeb({ track: "B2T_L", solveTarget: "C3_f", CO_f: 20, C1_f: 10, hpSel: 2 })).toMatchObject({ ok: false, code: "INVALID_TRACK" });
    expect(solveSpiderWeb({ track: "RLTR_R", solveTarget: "C3_f", CO_f: 20, hpSel: 2 })).toMatchObject({ ok: false, code: "MISSING_INPUT" });
  });

  it("stored inputs must be self-consistent", () => {
    expect(spiderValuesFromStoredInputs("LRTL_L", { CO_f: 20, C1_f: 40, C3_f: 10, HP_n: 30, HP_sel: -3 })).toEqual({
      CO_f: 20, C1_f: 40, C3_f: 10, HP_n: 30, HP_sel: -3,
    });
    expect(spiderValuesFromStoredInputs("LRTL_L", { CO_f: 20, C1_f: 40, C3_f: 11, HP_sel: -3 })).toBeNull();
    expect(spiderValuesFromStoredInputs("LRTL_L", { CO_f: 20, C1_f: 40, C3_f: 10, HP_sel: 3 })).toBeNull();
    expect(spiderValuesFromStoredInputs("LRTL_L", { CO_f: 20, C1_f: 40, C3_f: 10, HP_n: 30 })).toMatchObject({ HP_sel: -3 });
  });
});

describe("spider_web C3 rail branch at the 60 boundary", () => {
  it.each(SPIDER_WEB_TRACK_IDS)("%s: 59.9 / 60 short rail · 60.1 / 69 / 70 / 80 long rail", (track) => {
    const spec = SPIDER_WEB_TRACKS[track];
    for (const c3 of [59.9, 60]) {
      expect(spiderC3Rail(track, c3)).toBe(spec.c3Short);
      const p = pathFor(track, inputsWithC3(track, c3));
      expect(p.c3Branch).toBe("short");
      expect(p.rails.C3).toBe(spec.c3Short);
      expect(railOf(p.pathNodes[3]!)).toBe(spec.c3Short);
    }
    for (const c3 of [60.1, 69, 70, 80]) {
      expect(spiderC3Rail(track, c3)).toBe(spec.c3Long);
      const p = pathFor(track, inputsWithC3(track, c3));
      expect(p.c3Branch).toBe("long");
      expect(p.rails.C3).toBe(spec.c3Long);
      const longFrameY = spec.c3Long === "BOTTOM" ? -2.25 : 42.25;
      expect(p.frame.C3.y).toBeCloseTo(longFrameY, 9);
    }
  });

  it("60 → 61 is continuous along the frame with no gap and no diagonal", () => {
    for (const track of SPIDER_WEB_TRACK_IDS) {
      const spec = SPIDER_WEB_TRACKS[track];
      const at60 = spiderMarkFramePoint(anchors, track, "C3", 60)!.point;
      const cornerX = spec.c3Short === "RIGHT" ? 82.25 : -2.25;
      const cornerY = spec.c3Long === "BOTTOM" ? -2.25 : 42.25;
      const shortEndY = spec.c3Long === "BOTTOM" ? 0 : 40;
      expect(at60).toEqual({ x: cornerX, y: shortEndY });
      let prev = spiderMarkFramePoint(anchors, track, "C3", 60.0001)!.point;
      expect(prev.y).toBeCloseTo(cornerY, 9);
      expect(Math.abs(prev.x - cornerX)).toBeLessThan(0.01);
      for (let v = 60.5; v <= 69.0001; v += 0.5) {
        const pt = spiderMarkFramePoint(anchors, track, "C3", v)!.point;
        expect(pt.y).toBeCloseTo(cornerY, 9);
        const step = Math.abs(pt.x - prev.x);
        expect(step).toBeGreaterThan(0);
        expect(step).toBeLessThan(0.6);
        prev = pt;
      }
      const at70 = spiderMarkFramePoint(anchors, track, "C3", 70)!.point;
      expect(at70.y).toBeCloseTo(cornerY, 9);
    }
  });
});

describe("spider_web continuation C3 → C4 → C5 → C6", () => {
  it("rotation follows the track spin for C3 ≤ 60 and reverses for C3 > 60, with decay", () => {
    const d = (track: SpiderWebTrackId, c3: number, step: number) =>
      spiderContinuationDeltaDeg({ track, c3, level: 4, stepIndex: step });
    expect(d("RLTR_R", 60, 0)).toBe(18);
    expect(d("RLTR_R", 60.1, 0)).toBe(-18);
    expect(d("LRTL_L", 30, 0)).toBe(-18);
    expect(d("LRTL_L", 61, 0)).toBe(18);
    expect(d("RLTR_R", 30, 1)).toBeCloseTo(18 * 0.8, 9);
    expect(d("RLTR_R", 30, 2)).toBeCloseTo(18 * 0.7, 9);
    expect(spiderContinuationDeltaDeg({ track: "RLTR_R", c3: 30, level: 0, stepIndex: 0 })).toBe(0);
    expect(SPIDER_CONTINUATION_DEFAULTS.decay).toEqual([1.0, 0.8, 0.7]);
  });

  it("produces C4–C6 on rails; C3 > 60 turns the C3→C4 direction the other way", () => {
    const short = pathFor("RLTR_R", inputsWithC3("RLTR_R", 50));
    expect(short.pathNodes.slice(4).every((n) => n && railOf(n) !== "NONE")).toBe(true);

    const long = pathFor("RLTR_R", inputsWithC3("RLTR_R", 70));
    const c2 = long.pathNodes[2]!;
    const c3 = long.pathNodes[3]!;
    const c4 = long.pathNodes[4]!;
    expect(long.continuation[0]?.deltaDeg).toBeLessThan(0);
    const inc = Math.atan2(c3.y - c2.y, c3.x - c2.x);
    const specular = Math.atan2(-(c3.y - c2.y), c3.x - c2.x);
    const out = Math.atan2(c4.y - c3.y, c4.x - c3.x);
    expect(inc).not.toBeCloseTo(out, 3);
    const rot = ((out - specular) * 180) / Math.PI;
    expect(rot).toBeCloseTo(-18, 6);
  });

  it("tip 0 yields a purely specular C3 → C4", () => {
    const p = pathFor("RLTR_R", { CO_f: 30, C1_f: 10, C3_f: 20, HP_n: 0, HP_sel: 0 });
    const [c2, c3, c4] = [p.pathNodes[2]!, p.pathNodes[3]!, p.pathNodes[4]!];
    const inSlope = (c3.y - c2.y) / (c3.x - c2.x);
    const outSlope = (c4.y - c3.y) / (c4.x - c3.x);
    expect(outSlope).toBeCloseTo(-inSlope, 9);
  });

  it("moving C4 recomputes C5/C6; moving C5 recomputes C6; moving C6 fixes only C6", () => {
    const inputs = inputsWithC3("RLTR_R", 50);
    const base = pathFor("RLTR_R", inputs);
    const c4Rail = base.continuation[0]!.rail;
    const movedC4 = reflectionOverrideFromPoint(
      { x: base.pathNodes[4]!.x - (c4Rail === "LEFT" || c4Rail === "RIGHT" ? 0 : 6), y: base.pathNodes[4]!.y + (c4Rail === "LEFT" || c4Rail === "RIGHT" ? 4 : 0) },
      c4Rail
    )!;
    const stale = {
      C5: reflectionOverrideFromPoint(base.pathNodes[5]!, base.continuation[1]!.rail)!,
      C6: reflectionOverrideFromPoint(base.pathNodes[6]!, base.continuation[2]!.rail)!,
    };
    const v1 = applySpiderVertexEdit(stale, "C4", movedC4);
    expect(Object.keys(v1)).toEqual(["C4"]);
    const p1 = pathFor("RLTR_R", inputs, v1);
    expect(p1.continuation[0]!.overridden).toBe(true);
    expect(p1.continuation[1]!.overridden).toBe(false);
    expect(p1.pathNodes[5]).not.toEqual(base.pathNodes[5]);
    expect(p1.pathNodes[6]).not.toEqual(base.pathNodes[6]);
    expect(p1.pathNodes.slice(0, 4)).toEqual(base.pathNodes.slice(0, 4));

    const c5 = p1.continuation[1]!;
    const movedC5 = reflectionOverrideFromPoint(
      { x: c5.point.x + (c5.rail === "TOP" || c5.rail === "BOTTOM" ? 5 : 0), y: c5.point.y + (c5.rail === "LEFT" || c5.rail === "RIGHT" ? -3 : 0) },
      c5.rail
    )!;
    const v2 = applySpiderVertexEdit({ ...v1, C6: stale.C6 }, "C5", movedC5);
    expect(Object.keys(v2).sort()).toEqual(["C4", "C5"]);
    const p2 = pathFor("RLTR_R", inputs, v2);
    expect(p2.pathNodes[4]).toEqual(p1.pathNodes[4]);
    expect(p2.pathNodes[6]).not.toEqual(p1.pathNodes[6]);

    const c6 = p2.continuation[2]!;
    const movedC6 = reflectionOverrideFromPoint(
      { x: c6.point.x + (c6.rail === "TOP" || c6.rail === "BOTTOM" ? -4 : 0), y: c6.point.y + (c6.rail === "LEFT" || c6.rail === "RIGHT" ? 2 : 0) },
      c6.rail
    )!;
    const v3 = applySpiderVertexEdit(v2, "C6", movedC6);
    const p3 = pathFor("RLTR_R", inputs, v3);
    expect(p3.pathNodes.slice(0, 6)).toEqual(p2.pathNodes.slice(0, 6));
    expect(p3.continuation[2]!.overridden).toBe(true);
  });

  it("stored edits are ignored after a SYS / track / tip change or a rule version change", () => {
    const inputs = inputsWithC3("RLTR_R", 50);
    const sig = spiderContinuationSignature({ track: "RLTR_R", ...inputs });
    const vertices = { C4: { rail: "LEFT" as const, t: 0.5 } };
    const payload = buildSpiderContinuationPayload(sig, vertices)!;
    expect(resolveSpiderContinuationVertices(payload, sig)).toEqual(vertices);
    const otherTip = spiderContinuationSignature({ track: "RLTR_R", ...inputs, HP_sel: 1 });
    expect(resolveSpiderContinuationVertices(payload, otherTip)).toEqual({});
    const otherTrack = spiderContinuationSignature({ track: "LRBL_R", ...inputs });
    expect(resolveSpiderContinuationVertices(payload, otherTrack)).toEqual({});
    expect(resolveSpiderContinuationVertices({ ...payload, ruleVersion: 99 }, sig)).toEqual({});
    expect(buildSpiderContinuationPayload(sig, {})).toBeNull();
  });
});

describe("common Trajectory Extension starts at C6", () => {
  it("E1 origin = C6 and E2 chains after E1", () => {
    const p = pathFor("LRTL_L", solvedInputs("LRTL_L", 20, 40, -4));
    const origin = resolveOrigin(p.pathNodes, { kind: "path_node", source: "corrected" });
    expect(origin?.index).toBe(6);
    const e1 = appendExtension1Draft(p.pathNodes, "S1");
    expect(e1).not.toBeNull();
    const seg = resolveDraftSegments(e1, p.pathNodes);
    expect(seg[0].start).toEqual(p.pathNodes[6]);
    const e2 = appendExtension2Draft(e1!, p.pathNodes, "S1");
    expect(e2?.items).toHaveLength(2);
    expect(resolveDraftSegments(e2, p.pathNodes)[1].start).toEqual(seg[0].end);
  });
});
