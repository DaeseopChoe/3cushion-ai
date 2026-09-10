/**
 * Phase 3B.1 / 3B.1.1 — Final Strategy Summary template + inclination explanation.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  assertStrategySummaryNumericSubmultiset,
  buildStrategySummaryTemplateInputs,
  buildStrategySummaryTemplateModel,
  composeFinalStrategySummary,
} from "./strategySummaryTemplate";
import {
  buildStrategySummaryFingerprintInputs,
  isStrategySummaryOverrideStale,
  serializeStrategySummaryFingerprint,
} from "./strategySummaryPersistence";

const __dirname = dirname(fileURLToPath(import.meta.url));

const EXPECTED_FULL = [
  "파이브 앤드 하프 시스템을 응용한 뒤돌리기 공략입니다.",
  "출발값 30에서 밀림값 +7을 보정하면 출발값은 37이 됩니다.",
  "1쿠션 4를 겨냥하여 진행하면 3쿠션은 33에 도착합니다.",
  "이어서 출발값 보정 -6.5를 적용하면 최종 도착값은 26.5가 됩니다.",
].join("\n");

/** Phase 3B.1.1 representative: slide + inclination + Sn */
const EXPECTED_WITH_INCLINATION = [
  "파이브 앤드 하프 시스템을 응용한 뒤돌리기 공략입니다.",
  "출발값 30에서 밀림값 +4을 보정하면 출발값은 34이 됩니다.",
  "1쿠션 4를 겨냥하여 진행하면 기울기 2.5가 보정되어 3쿠션은 32.5에 도착합니다.",
  "이어서 출발값 보정 -8를 적용하면 최종 도착값은 24.5가 됩니다.",
].join("\n");

function fullInputs(overrides: Record<string, unknown> = {}) {
  return buildStrategySummaryTemplateInputs({
    systemId: "5_half_system",
    shotType: "뒤돌리기",
    baseValues: { CO_f: 30, C1_f: 4, C3_r: 26 },
    correctedValues: {
      CO_f: 37,
      C1_f: 4,
      C3_r: 33,
      Sn: -6.5,
      C4_f: 26.5,
    },
    corrections: { slide: 7, draw: 0, curve_ratio: 0, spin: 0, departure: 0 },
    ...overrides,
  });
}

function inclinationExampleInputs(
  overrides: Record<string, unknown> = {}
) {
  return buildStrategySummaryTemplateInputs({
    systemId: "5_half_system",
    shotType: "뒤돌리기",
    baseValues: { CO_f: 30, C1_f: 4 },
    correctedValues: {
      CO_f: 34,
      C1_f: 4,
      C3_r: 32.5,
      Sn: -8,
      C4_f: 24.5,
    },
    corrections: {
      slide: 4,
      draw: 0,
      curve_ratio: 2.5,
      spin: 0,
      departure: 0,
    },
    ...overrides,
  });
}

describe("Phase 3B.1 final Strategy Summary template", () => {
  it("representative exact text (no inclination)", () => {
    expect(composeFinalStrategySummary(fullInputs())).toBe(EXPECTED_FULL);
  });

  it("has no double-quote characters", () => {
    expect(composeFinalStrategySummary(fullInputs()).includes('"')).toBe(false);
    expect(
      composeFinalStrategySummary(inclinationExampleInputs()).includes('"')
    ).toBe(false);
  });

  it("no-correction branch uses 출발값은 N입니다", () => {
    const text = composeFinalStrategySummary(
      buildStrategySummaryTemplateInputs({
        systemId: "5_half_system",
        shotType: "뒤돌리기",
        baseValues: { CO_f: 30, C1_f: 4, C3_r: 33 },
        correctedValues: { CO_f: 30, C1_f: 4, C3_r: 33 },
        corrections: { slide: 0, draw: 0, curve_ratio: 0 },
      })
    );
    expect(text).toContain("출발값은 30입니다.");
    expect(text).not.toContain("밀림값");
    expect(text).not.toContain("기울기");
  });

  it("preserves negative Sn and decimals", () => {
    expect(EXPECTED_FULL).toContain("출발값 보정 -6.5");
    expect(EXPECTED_FULL).toContain("26.5");
  });

  it("omits cushion sentence when C1/C3 missing (missing ≠ zero)", () => {
    const text = composeFinalStrategySummary(
      buildStrategySummaryTemplateInputs({
        systemId: "5_half_system",
        shotType: "뒤돌리기",
        baseValues: { CO_f: 30 },
        correctedValues: { CO_f: 30 },
        corrections: { slide: 0 },
      })
    );
    expect(text).toBe(
      [
        "파이브 앤드 하프 시스템을 응용한 뒤돌리기 공략입니다.",
        "출발값은 30입니다.",
      ].join("\n")
    );
  });

  it("omits arrival when Sn/C4 missing; zero Sn omitted", () => {
    const noSn = composeFinalStrategySummary(
      buildStrategySummaryTemplateInputs({
        systemId: "5_half_system",
        shotType: "뒤돌리기",
        baseValues: { CO_f: 30, C1_f: 4 },
        correctedValues: { CO_f: 30, C3_r: 33 },
        corrections: { slide: 0 },
      })
    );
    expect(noSn).not.toContain("최종 도착값");

    const zeroSn = composeFinalStrategySummary(
      buildStrategySummaryTemplateInputs({
        systemId: "5_half_system",
        shotType: "뒤돌리기",
        baseValues: { CO_f: 50, C1_f: 4 },
        correctedValues: { CO_f: 50, C3_r: 33, Sn: 0, C4_f: 33 },
        corrections: { slide: 0 },
      })
    );
    expect(zeroSn).not.toContain("최종 도착값");
  });

  it("does not include STR advice paragraph", () => {
    expect(EXPECTED_FULL).not.toContain("레일 속도");
    expect(EXPECTED_WITH_INCLINATION).not.toContain("통과 기준");
  });

  it("segment model exposes protected tokens per sentence", () => {
    const model = buildStrategySummaryTemplateModel(fullInputs());
    expect(model.segments.map((s) => s.id)).toEqual([
      "intro",
      "start",
      "cushion",
      "arrival",
    ]);
    expect(
      model.segments.find((s) => s.id === "cushion")?.protectedTokens
    ).toEqual(expect.arrayContaining(["4", "33"]));
  });
});

describe("Phase 3B.1.1 inclination / correction explanation", () => {
  it("slide + inclination + Sn exact representative text", () => {
    expect(composeFinalStrategySummary(inclinationExampleInputs())).toBe(
      EXPECTED_WITH_INCLINATION
    );
  });

  it("inclination present → C3 sentence includes 기울기 value", () => {
    const text = composeFinalStrategySummary(inclinationExampleInputs());
    expect(text).toContain("1쿠션 4");
    expect(text).toContain("기울기 2.5");
    expect(text).toContain("3쿠션은 32.5");
  });

  it("inclination 0/missing → no 기울기 phrase", () => {
    expect(EXPECTED_FULL).not.toContain("기울기");
    const zeroTilt = composeFinalStrategySummary(
      inclinationExampleInputs({
        corrections: { slide: 4, draw: 0, curve_ratio: 0 },
      })
    );
    expect(zeroTilt).not.toContain("기울기");
    expect(zeroTilt).toContain(
      "1쿠션 4를 겨냥하여 진행하면 3쿠션은 32.5에 도착합니다."
    );
  });

  it("inclination-only still explains C3 correction", () => {
    const text = composeFinalStrategySummary(
      buildStrategySummaryTemplateInputs({
        systemId: "5_half_system",
        shotType: "뒤돌리기",
        baseValues: { CO_f: 30, C1_f: 4 },
        correctedValues: { CO_f: 30, C3_r: 32.5 },
        corrections: { slide: 0, draw: 0, curve_ratio: 2.5 },
      })
    );
    expect(text).toContain("출발값은 30입니다.");
    expect(text).toContain(
      "1쿠션 4를 겨냥하여 진행하면 기울기 2.5가 보정되어 3쿠션은 32.5에 도착합니다."
    );
  });

  it("draw (끌림) uses signed 끌림값 -N", () => {
    const text = composeFinalStrategySummary(
      buildStrategySummaryTemplateInputs({
        systemId: "5_half_system",
        shotType: "뒤돌리기",
        baseValues: { CO_f: 30, C1_f: 4 },
        correctedValues: { CO_f: 25, C3_r: 22 },
        corrections: { slide: 0, draw: -5, curve_ratio: 0 },
      })
    );
    expect(text).toContain("끌림값 -5");
    expect(text).toContain("출발값은 25이 됩니다.");
    expect(text).not.toContain("끌림값 5을");
    expect(text).not.toContain("끌림값 5를");
  });

  it("slide positive uses explicit + sign", () => {
    const text = composeFinalStrategySummary(
      buildStrategySummaryTemplateInputs({
        systemId: "5_half_system",
        shotType: "뒤돌리기",
        baseValues: { CO_f: 30, C1_f: 4 },
        correctedValues: { CO_f: 34, C3_r: 30 },
        corrections: { slide: 4, draw: 0, curve_ratio: 0 },
      })
    );
    expect(text).toContain("밀림값 +4");
    expect(text).toContain("출발값은 34이 됩니다.");
  });

  it("decimal signed slide/draw preserved", () => {
    const pos = composeFinalStrategySummary(
      buildStrategySummaryTemplateInputs({
        systemId: "5_half_system",
        shotType: "뒤돌리기",
        baseValues: { CO_f: 30 },
        correctedValues: { CO_f: 32.5 },
        corrections: { slide: 2.5, draw: 0 },
      })
    );
    expect(pos).toContain("밀림값 +2.5");

    const neg = composeFinalStrategySummary(
      buildStrategySummaryTemplateInputs({
        systemId: "5_half_system",
        shotType: "뒤돌리기",
        baseValues: { CO_f: 30 },
        correctedValues: { CO_f: 27.5 },
        corrections: { slide: 0, draw: -2.5 },
      })
    );
    expect(neg).toContain("끌림값 -2.5");
  });

  it("signed +4/-5 generated summary passes numeric guard", () => {
    expect(
      assertStrategySummaryNumericSubmultiset(
        EXPECTED_WITH_INCLINATION,
        EXPECTED_WITH_INCLINATION
      ).ok
    ).toBe(true);
    const drawBaseline = composeFinalStrategySummary(
      buildStrategySummaryTemplateInputs({
        systemId: "5_half_system",
        shotType: "뒤돌리기",
        baseValues: { CO_f: 30, C1_f: 4 },
        correctedValues: { CO_f: 25, C3_r: 21, Sn: -12.5, C4_f: 11 },
        corrections: { slide: 0, draw: -5, curve_ratio: 2.5 },
      })
    );
    expect(drawBaseline).toContain("끌림값 -5");
    expect(
      assertStrategySummaryNumericSubmultiset(drawBaseline, drawBaseline).ok
    ).toBe(true);
    expect(
      assertStrategySummaryNumericSubmultiset(
        drawBaseline,
        drawBaseline.replace("-5", "-6")
      ).ok
    ).toBe(false);
  });

  it("inclination token is legitimate for numeric guard Apply", () => {
    const baseline = EXPECTED_WITH_INCLINATION;
    expect(
      assertStrategySummaryNumericSubmultiset(baseline, baseline).ok
    ).toBe(true);
    expect(
      assertStrategySummaryNumericSubmultiset(
        baseline,
        baseline.replace("2.5", "3.5")
      ).ok
    ).toBe(false);
  });

  it("fingerprint changes when inclination changes", () => {
    const a = serializeStrategySummaryFingerprint(
      buildStrategySummaryFingerprintInputs(inclinationExampleInputs())
    );
    const b = serializeStrategySummaryFingerprint(
      buildStrategySummaryFingerprintInputs(
        inclinationExampleInputs({
          corrections: { slide: 4, draw: 0, curve_ratio: 3 },
        })
      )
    );
    expect(a).not.toBe(b);
  });
});

describe("Phase 3B.1 fingerprint expansion", () => {
  it("same inputs → stable fingerprint", () => {
    const a = serializeStrategySummaryFingerprint(
      buildStrategySummaryFingerprintInputs(fullInputs())
    );
    const b = serializeStrategySummaryFingerprint(
      buildStrategySummaryFingerprintInputs(fullInputs())
    );
    expect(a).toBe(b);
    expect(a.startsWith("v2:")).toBe(true);
  });

  it("summary-relevant scalar change → fingerprint changes", () => {
    const a = serializeStrategySummaryFingerprint(
      buildStrategySummaryFingerprintInputs(fullInputs())
    );
    const b = serializeStrategySummaryFingerprint(
      buildStrategySummaryFingerprintInputs(
        fullInputs({
          correctedValues: {
            CO_f: 38,
            C1_f: 4,
            C3_r: 33,
            Sn: -6.5,
            C4_f: 26.5,
          },
        })
      )
    );
    expect(a).not.toBe(b);
  });

  it("stale only when override present", () => {
    expect(
      isStrategySummaryOverrideStale({
        strategySummaryOverride: "",
        strategySummaryFingerprint: "v2:old",
        currentFingerprint: "v2:new",
      })
    ).toBe(false);
    expect(
      isStrategySummaryOverrideStale({
        strategySummaryOverride: "관리자 문장",
        strategySummaryFingerprint: "v2:old",
        currentFingerprint: "v2:new",
      })
    ).toBe(true);
  });
});

describe("Phase 3B.1 numeric submultiset guard", () => {
  it("value mutation rejected", () => {
    expect(
      assertStrategySummaryNumericSubmultiset(
        EXPECTED_FULL,
        EXPECTED_FULL.replace("33", "35")
      ).ok
    ).toBe(false);
  });

  it("negative/decimal mutation rejected", () => {
    expect(
      assertStrategySummaryNumericSubmultiset(
        EXPECTED_FULL,
        EXPECTED_FULL.replace("-6.5", "-7.5")
      ).ok
    ).toBe(false);
  });

  it("optional sentence deletion allowed", () => {
    const withoutArrival = EXPECTED_FULL.split("\n").slice(0, 3).join("\n");
    expect(
      assertStrategySummaryNumericSubmultiset(EXPECTED_FULL, withoutArrival).ok
    ).toBe(true);
  });

  it("arbitrary new calculation number insertion rejected", () => {
    expect(
      assertStrategySummaryNumericSubmultiset(
        EXPECTED_FULL,
        `${EXPECTED_FULL}\n참고값 99`
      ).ok
    ).toBe(false);
  });

  it("prose-only edit with same numbers allowed", () => {
    expect(
      assertStrategySummaryNumericSubmultiset(
        EXPECTED_FULL,
        EXPECTED_FULL.replace("공략입니다.", "공략입니다!")
      ).ok
    ).toBe(true);
  });
});

describe("Phase 3B.1 App / Overlay wiring", () => {
  const app = readFileSync(join(__dirname, "../../App.jsx"), "utf8");
  const overlay = readFileSync(
    join(__dirname, "../../components/overlays/AiOverlay.jsx"),
    "utf8"
  );

  it("uses final template composer and expanded fingerprint", () => {
    expect(app).toContain("composeFinalStrategySummary");
    expect(app).toContain("buildStrategySummaryTemplateInputs");
    expect(app).toContain("restoreStrategySummaryToGenerated");
  });

  it("stale UX offers restore to generated", () => {
    expect(overlay).toContain("원본 요약으로 되돌리기");
    expect(overlay).toContain("onRestoreStrategySummaryToGenerated");
  });
});
