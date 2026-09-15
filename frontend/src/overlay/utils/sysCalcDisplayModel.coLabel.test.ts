/**
 * Spin/inclination signed authoring + CO label when CO unchanged.
 */
import { describe, expect, it } from "vitest";
import { mergeCorrections } from "../../domain/canonicalStrategy";
import {
  applyCorrectionSign,
  correctionIsNegative,
  correctionMagnitude,
} from "../../domain/calculator/correctionSignMode";
import {
  coDisplayLabel,
  isCoValueCorrected,
  buildSysCalcDisplayModel,
} from "./sysCalcDisplayModel";

describe("spin/inclination signed authoring persistence", () => {
  it("T1–T4 merge preserves ± curve_ratio and spin", () => {
    expect(mergeCorrections({ curve_ratio: 2, spin: 0 }).curve_ratio).toBe(2);
    expect(mergeCorrections({ curve_ratio: -2, spin: 0 }).curve_ratio).toBe(-2);
    expect(mergeCorrections({ spin: 2 }).spin).toBe(2);
    expect(mergeCorrections({ spin: -2 }).spin).toBe(-2);
  });

  it("magnitude / [-] helpers for spin & inclination", () => {
    expect(correctionMagnitude(-2)).toBe(2);
    expect(correctionIsNegative(-2)).toBe(true);
    expect(applyCorrectionSign(2, true)).toBe(-2);
    expect(applyCorrectionSign(2, false)).toBe(2);
  });

  it("shotType does not rewrite spin/inclination fields (stored as authored)", () => {
    const m = mergeCorrections({
      slide: 0,
      draw: 0,
      curve_ratio: -2,
      spin: 2,
      signMode: "authored",
    });
    expect(m.curve_ratio).toBe(-2);
    expect(m.spin).toBe(2);
  });
});

describe("CO display label vs actual CO change", () => {
  it("T14/T16/T17: CO unchanged → 출발값", () => {
    expect(isCoValueCorrected(28, 28)).toBe(false);
    expect(coDisplayLabel(28, 28)).toBe("출발값");
  });

  it("T15: CO changed → 보정한 출발값", () => {
    expect(isCoValueCorrected(28, 30)).toBe(true);
    expect(coDisplayLabel(28, 30)).toBe("보정한 출발값");
  });

  it("spin-only corrected block uses 출발값 not 보정한 출발값", () => {
    const model = buildSysCalcDisplayModel({
      systemId: "5_half_system",
      hasAllInputs: true,
      useSn: true,
      baseCo: 28,
      baseC1: 2,
      baseC3: 26,
      effCo: 28,
      effC3: 28,
      unifiedSlide: 0,
      angleTilt: 0,
      spin: 2,
      hasCorrection: true,
    });
    const corrected = model.blocks.find((b) => b.id === "corrected");
    const c3 = corrected?.sections.find((s) => s.id === "corrected-c3");
    const labels = (c3?.lines[0]?.parts || [])
      .filter((p) => p.type === "value")
      .map((p) => (p as { label: string }).label);
    expect(labels).toContain("출발값");
    expect(labels).not.toContain("보정한 출발값");
  });

  it("slide-corrected block uses 보정한 출발값 in C3 section", () => {
    const model = buildSysCalcDisplayModel({
      systemId: "5_half_system",
      hasAllInputs: true,
      useSn: true,
      baseCo: 28,
      baseC1: 2,
      baseC3: 26,
      effCo: 30,
      effC3: 28,
      unifiedSlide: 2,
      angleTilt: 0,
      spin: 0,
      hasCorrection: true,
    });
    const corrected = model.blocks.find((b) => b.id === "corrected");
    const c3 = corrected?.sections.find((s) => s.id === "corrected-c3");
    const labels = (c3?.lines[0]?.parts || [])
      .filter((p) => p.type === "value")
      .map((p) => (p as { label: string }).label);
    expect(labels).toContain("보정한 출발값");
  });
});
