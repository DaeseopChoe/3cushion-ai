/**
 * Strategy Summary semantic Bold (presentation only) contracts.
 */
import { describe, expect, it } from "vitest";
import {
  buildStrategySummaryTemplateInputs,
  buildStrategySummaryTemplateModel,
  composeFinalStrategySummary,
} from "./strategySummaryTemplate";
import {
  canRenderStrategySummaryEmphasis,
  listEmphasizedStrategySummaryUnits,
} from "./strategySummaryEmphasis";
import { buildCommittedAiPresentation } from "./committedAiPresentation";

function slidePlusInputs() {
  return buildStrategySummaryTemplateInputs({
    systemId: "5_half_system",
    shotType: "뒤돌리기",
    baseValues: { CO_f: 33.1, C1_f: 1.8 },
    correctedValues: {
      CO_f: 35.1,
      C1_f: 1.8,
      C3_r: 33.3,
      Sn: -7.4,
      C4_f: 25.9,
    },
    corrections: { slide: 2, draw: 0, curve_ratio: 0, spin: 0 },
  });
}

describe("Strategy Summary semantic Bold presentation", () => {
  it("parts join equals plain text (no storage markup)", () => {
    const model = buildStrategySummaryTemplateModel(slidePlusInputs());
    for (const seg of model.segments) {
      expect(seg.parts.map((p) => p.text).join("")).toBe(seg.text);
    }
    expect(model.text).toBe(composeFinalStrategySummary(slidePlusInputs()));
    expect(model.text.includes("<strong>")).toBe(false);
    expect(model.text.includes("**")).toBe(false);
  });

  it("CASE A: bold-only flow preserves signed slide +", () => {
    const units = listEmphasizedStrategySummaryUnits(
      buildStrategySummaryTemplateModel(slidePlusInputs()).segments
    );
    expect(units).toEqual([
      "출발값 33.1",
      "밀림값 +2",
      "출발값은 35.1",
      "1쿠션 1.8",
      "3쿠션은 33.3",
      "출발값 보정 -7.4",
      "최종 도착값은 25.9",
    ]);
  });

  it("CASE B: 끌림 signed minus preserved", () => {
    const inputs = buildStrategySummaryTemplateInputs({
      systemId: "5_half_system",
      shotType: "뒤돌리기",
      baseValues: { CO_f: 30, C1_f: 4 },
      correctedValues: { CO_f: 28, C3_r: 30, Sn: -5, C4_f: 25 },
      corrections: { slide: 0, draw: -2, curve_ratio: 0 },
    });
    const units = listEmphasizedStrategySummaryUnits(
      buildStrategySummaryTemplateModel(inputs).segments
    );
    expect(units).toContain("끌림값 -2");
    expect(units.some((u) => u.includes("끌림값 2"))).toBe(false);
  });

  it("CASE D: inclination unit emphasized when present", () => {
    const inputs = buildStrategySummaryTemplateInputs({
      systemId: "5_half_system",
      shotType: "뒤돌리기",
      baseValues: { CO_f: 30, C1_f: 4 },
      correctedValues: { CO_f: 34, C3_r: 32.5, Sn: -8, C4_f: 24.5 },
      corrections: { slide: 4, draw: 0, curve_ratio: 2.5 },
    });
    const units = listEmphasizedStrategySummaryUnits(
      buildStrategySummaryTemplateModel(inputs).segments
    );
    expect(units).toContain("기울기 2.5");
    expect(units).toContain("3쿠션은 32.5");
  });

  it("CASE E: no fake correction emphasis when slide/draw zero", () => {
    const inputs = buildStrategySummaryTemplateInputs({
      systemId: "5_half_system",
      shotType: "뒤돌리기",
      baseValues: { CO_f: 30, C1_f: 4 },
      correctedValues: { CO_f: 30, C3_r: 33 },
      corrections: { slide: 0, draw: 0, curve_ratio: 0 },
    });
    const units = listEmphasizedStrategySummaryUnits(
      buildStrategySummaryTemplateModel(inputs).segments
    );
    expect(units).toContain("출발값은 30");
    expect(units.some((u) => u.includes("밀림") || u.includes("끌림"))).toBe(
      false
    );
  });

  it("emphasis only when draft matches generated", () => {
    expect(
      canRenderStrategySummaryEmphasis({
        draftText: composeFinalStrategySummary(slidePlusInputs()),
        generatedText: composeFinalStrategySummary(slidePlusInputs()),
      })
    ).toBe(true);
    expect(
      canRenderStrategySummaryEmphasis({
        draftText: "직접 수정한 요약",
        generatedText: composeFinalStrategySummary(slidePlusInputs()),
      })
    ).toBe(false);
  });

  it("committed override disables emphasis segments", () => {
    const withGen = buildCommittedAiPresentation({
      committedAi: { onePointLessons: [] },
      templateInputs: slidePlusInputs(),
    });
    expect(withGen.strategySummaryEmphasisSegments?.length).toBeGreaterThan(0);

    const withOverride = buildCommittedAiPresentation({
      committedAi: {
        strategySummaryOverride: "커스텀 요약만",
        onePointLessons: [],
      },
      templateInputs: slidePlusInputs(),
    });
    expect(withOverride.strategySummaryEmphasisSegments).toBe(null);
    expect(withOverride.strategySummaryText).toBe("커스텀 요약만");
  });
});
