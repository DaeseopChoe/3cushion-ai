/**
 * SYS slide/draw signed authoring contracts (T1–T18 core).
 */
import { describe, expect, it } from "vitest";
import {
  applyCorrectionSign,
  correctionIsNegative,
  correctionMagnitude,
  exclusiveSlideDraw,
  resolveCorrectionSignMode,
  resolveInitialCorrectionSignMode,
} from "./correctionSignMode";
import { unifiedSlideFromCorrections } from "./sysOverlayCalcHelpers";
import { normalizeSlideDrawCorrections } from "./correctionSignMode";
import { mergeCorrections } from "../canonicalStrategy";

describe("correctionSignMode helpers", () => {
  it("resolve: missing marker → legacy; authored explicit", () => {
    expect(resolveCorrectionSignMode({})).toBe("legacy");
    expect(resolveCorrectionSignMode({ signMode: "authored" })).toBe("authored");
  });

  it("initial: empty → authored; unmarked non-zero → legacy", () => {
    expect(resolveInitialCorrectionSignMode({ slide: 0, draw: 0 })).toBe("authored");
    expect(resolveInitialCorrectionSignMode({ slide: 2, draw: 0 })).toBe("legacy");
    expect(resolveInitialCorrectionSignMode({ slide: 0, draw: -2 })).toBe("legacy");
    expect(
      resolveInitialCorrectionSignMode({ slide: -2, draw: 0, signMode: "authored" })
    ).toBe("authored");
  });

  it("magnitude / [-] apply", () => {
    expect(correctionMagnitude(-2)).toBe(2);
    expect(correctionIsNegative(-2)).toBe(true);
    expect(applyCorrectionSign(2, false)).toBe(2);
    expect(applyCorrectionSign(2, true)).toBe(-2);
    expect(applyCorrectionSign(0, true)).toBe(0);
  });

  it("T5/T6/T18 mutual exclusion by non-zero (sign-agnostic)", () => {
    expect(exclusiveSlideDraw(-2, 3, "slide")).toEqual({ slide: -2, draw: 0 });
    expect(exclusiveSlideDraw(-2, 3, "draw")).toEqual({ slide: 0, draw: 3 });
  });
});

describe("unifiedSlideFromCorrections authored vs legacy", () => {
  it("T1/T2 authored slide ±2 (옆돌리기 does not flip)", () => {
    expect(
      unifiedSlideFromCorrections(
        { slide: 2, draw: 0, signMode: "authored" },
        "옆돌리기"
      )
    ).toBe(2);
    expect(
      unifiedSlideFromCorrections(
        { slide: -2, draw: 0, signMode: "authored" },
        "옆돌리기"
      )
    ).toBe(-2);
  });

  it("T3/T4 authored draw ±2", () => {
    expect(
      unifiedSlideFromCorrections(
        { slide: 0, draw: 2, signMode: "authored" },
        "뒤돌리기"
      )
    ).toBe(2);
    expect(
      unifiedSlideFromCorrections(
        { slide: 0, draw: -2, signMode: "authored" },
        "뒤돌리기"
      )
    ).toBe(-2);
  });

  it("T7–T10 authored shotType invariance", () => {
    for (const st of ["옆돌리기", "뒤돌리기", "옆돌리기 대회전"]) {
      expect(
        unifiedSlideFromCorrections({ slide: 2, draw: 0, signMode: "authored" }, st)
      ).toBe(2);
      expect(
        unifiedSlideFromCorrections({ slide: -2, draw: 0, signMode: "authored" }, st)
      ).toBe(-2);
    }
  });

  it("T11 legacy 옆돌리기 slide+2 → effective -2", () => {
    expect(
      unifiedSlideFromCorrections({ slide: 2, draw: 0 }, "옆돌리기")
    ).toBe(-2);
  });

  it("T12 legacy 뒤돌리기 slide+2 → effective +2", () => {
    expect(
      unifiedSlideFromCorrections({ slide: 2, draw: 0 }, "뒤돌리기")
    ).toBe(2);
  });

  it("legacy draw -2 with 옆돌리기 → effective +2", () => {
    expect(
      unifiedSlideFromCorrections({ slide: 0, draw: -2 }, "옆돌리기")
    ).toBe(2);
  });

  it("T16/T17 negative fields are active in authored", () => {
    expect(
      unifiedSlideFromCorrections({ slide: -2, draw: 0, signMode: "authored" }, "뒤돌리기")
    ).toBe(-2);
    expect(
      unifiedSlideFromCorrections({ slide: 0, draw: -2, signMode: "authored" }, "뒤돌리기")
    ).toBe(-2);
  });
});

describe("normalize + merge preserve authored signs", () => {
  it("T13 authored normalize preserves negatives", () => {
    const n = normalizeSlideDrawCorrections({
      slide: -2,
      draw: 0,
      signMode: "authored",
    });
    expect(n.slide).toBe(-2);
    expect(n.draw).toBe(0);
    expect(n.signMode).toBe("authored");
  });

  it("legacy normalize forces slide≥0 draw≤0", () => {
    const n = normalizeSlideDrawCorrections({ slide: -2, draw: 3 });
    expect(n.slide).toBe(0);
    expect(n.draw).toBe(-3);
    expect(n.signMode).toBeUndefined();
  });

  it("mergeCorrections keeps authored signMode and negative slide", () => {
    const m = mergeCorrections({
      slide: -2.5,
      draw: 0,
      signMode: "authored",
      curve_ratio: 1,
      spin: 0,
      departure: 0,
    });
    expect(m.slide).toBe(-2.5);
    expect(m.signMode).toBe("authored");
  });

  it("CO contract: baseline 28 + authored ±2", () => {
    const base = 28;
    const plus = unifiedSlideFromCorrections(
      { slide: 2, draw: 0, signMode: "authored" },
      "옆돌리기"
    );
    const minus = unifiedSlideFromCorrections(
      { slide: -2, draw: 0, signMode: "authored" },
      "옆돌리기"
    );
    expect(base + plus).toBe(30);
    expect(base + minus).toBe(26);
  });
});
