import { describe, expect, it } from "vitest";
import {
  buildAiAutoCommentModel,
  composeAiAutoComment,
  getActiveCorrectionLabels,
  getUserFormulaLine,
  hasAnySysCorrection,
} from "./aiAutoCommentViewModel";

describe("getUserFormulaLine", () => {
  it("returns user-facing formula for 5 half", () => {
    expect(getUserFormulaLine("5_half_system")).toBe("1쿠션값 = 출발값 - 3쿠션값");
  });
});

describe("getActiveCorrectionLabels", () => {
  it("lists non-zero corrections only", () => {
    const labels = getActiveCorrectionLabels(
      { slide: 4, curve_ratio: 2, draw: 0, spin: 0, departure: 0 },
      "뒤돌리기 대회전"
    );
    expect(labels).toContain("밀림");
    expect(labels).toContain("기울기");
    expect(labels).toContain("출발값 보정");
    expect(labels).not.toContain("끌림");
    expect(labels).not.toContain("스핀");
  });

  it("empty when all zero", () => {
    expect(getActiveCorrectionLabels({}, "뒤돌리기")).toEqual([]);
  });
});

describe("buildAiAutoCommentModel", () => {
  it("no correction: intro + formula + STR only", () => {
    const m = buildAiAutoCommentModel({
      systemId: "5_half_system",
      shotType: "뒤돌리기 대회전",
      baseValues: { CO_f: 30, C4_f: 16 },
      correctedValues: { CO_f: 30, C4_f: 16 },
      corrections: { slide: 0, draw: 0, curve_ratio: 0, spin: 0, departure: 0 },
      str: { depth: 2, speed: 2.5, acceleration: "smooth_const" },
    });
    expect(m.introLine).toContain("파이브");
    expect(m.introLine).toContain("뒤돌리기 대회전");
    expect(m.formulaUserLine).toBe("1쿠션값 = 출발값 - 3쿠션값");
    expect(m.correctionLine).toBeNull();
    expect(m.strLine).toContain("볼 2개 통과");
    expect(m.strLine).toContain("2.5레일");
    expect(m.strLine).not.toContain("평범한");
  });

  it("with correction: one-line correction paragraph", () => {
    const m = buildAiAutoCommentModel({
      systemId: "5_half_system",
      shotType: "뒤돌리기",
      baseValues: { CO_f: 30, C4_f: 16 },
      correctedValues: { CO_f: 34, C4_f: 25 },
      corrections: { slide: 4, curve_ratio: 2, draw: 0, spin: 0, departure: 0 },
      str: { depth: 2, speed: 2.5, acceleration: "smooth_const" },
    });
    expect(m.correctionLine).toContain("밀림");
    expect(m.correctionLine).toContain("출발값은 30 → 34");
    expect(m.correctionLine).toContain("도착값은 16 → 25");
    expect(hasAnySysCorrection(
      { slide: 4, curve_ratio: 2 },
      "뒤돌리기",
      { CO_f: 30, C4_f: 16 },
      { CO_f: 34, C4_f: 25 }
    )).toBe(true);
  });
});

describe("composeAiAutoComment", () => {
  it("joins sections with blank lines", () => {
    const text = composeAiAutoComment(
      buildAiAutoCommentModel({
        systemName: "테스트 시스템",
        shotType: "뒤돌리기",
        str: { depth: 2, speed: 3, acceleration: "smooth_const" },
      })
    );
    expect(text).toContain("테스트 시스템");
    expect(text).toContain("[기본 공식]  ");
    expect(text).toMatch(/\n\n/);
    expect(text).not.toContain("C1_f");
  });
});
