/**
 * Phase 3C — committed AI shared presentation contracts (no OpenAI / no calc).
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import {
  buildCommittedAiPresentation,
  selectCommittedSlotAiForUser,
} from "./committedAiPresentation";
import { buildStrategySummaryTemplateInputs } from "./strategySummaryTemplate";
import { buildUserInfoPanel } from "../userInfoPanelModel";

const __dirname = dirname(fileURLToPath(import.meta.url));

const TEMPLATE = buildStrategySummaryTemplateInputs({
  systemId: "5_half_system",
  shotType: "뒤돌리기",
  baseValues: { CO_f: 30, C1_f: 4 },
  correctedValues: {
    CO_f: 25,
    C3_r: 25.5,
    Sn: -12.5,
    C4_f: 13,
  },
  corrections: { slide: 0, draw: -5, curve_ratio: 4.5 },
});

describe("Phase 3C committed AI presentation", () => {
  it("generated summary when override missing", () => {
    const p = buildCommittedAiPresentation({
      committedAi: { onePointLessons: [] },
      templateInputs: TEMPLATE,
    });
    expect(p.strategySummaryText).toContain("파이브 앤드 하프");
    expect(p.strategySummaryText).toContain("끌림값 -5");
    expect(p.strategySummaryText).toContain("기울기 4.5");
    expect(p.strategySummaryText).toContain("출발값 보정 -12.5");
    expect(p.hasStrategySummary).toBe(true);
  });

  it("committed override wins over generated", () => {
    const p = buildCommittedAiPresentation({
      committedAi: {
        strategySummaryOverride: "관리자 확정 요약\n두 번째 줄",
        onePointLessons: [{ id: "1", text: "원포인트" }],
      },
      templateInputs: TEMPLATE,
    });
    expect(p.strategySummaryText).toBe("관리자 확정 요약\n두 번째 줄");
    expect(p.strategySummaryParagraphs).toEqual([
      "관리자 확정 요약",
      "두 번째 줄",
    ]);
    expect(p.onePointText).toBe("원포인트");
  });

  it("legacy missing override/fingerprint → generated fallback", () => {
    const p = buildCommittedAiPresentation({
      committedAi: { text: "", onePointLessons: [] },
      templateInputs: TEMPLATE,
    });
    expect(p.strategySummaryText.length).toBeGreaterThan(0);
    expect(p.strategySummaryText).not.toContain("관리자");
  });

  it("multiline PRO ONE POINT preserved", () => {
    const p = buildCommittedAiPresentation({
      committedAi: {
        onePointLessons: [
          { id: "1", text: "첫 줄입니다.\n둘째 줄입니다." },
        ],
      },
      templateInputs: TEMPLATE,
    });
    expect(p.onePointText).toContain("\n");
    expect(p.onePointParagraphs).toEqual(["첫 줄입니다.", "둘째 줄입니다."]);
  });

  it("empty both → isEmpty", () => {
    const p = buildCommittedAiPresentation({
      committedAi: null,
      templateInputs: buildStrategySummaryTemplateInputs({
        systemId: "5_half_system",
        shotType: "뒤돌리기",
        baseValues: {},
        correctedValues: {},
        corrections: {},
      }),
    });
    // intro still generates from system/shot even without numbers
    expect(p.hasStrategySummary).toBe(true);
    expect(p.hasOnePoint).toBe(false);
  });

  it("USER selector prefers applied over draft", () => {
    const picked = selectCommittedSlotAiForUser({
      draftAi: {
        onePointLessons: [{ id: "d", text: "draft only" }],
        strategySummaryOverride: "draft override",
      },
      appliedAi: {
        onePointLessons: [{ id: "a", text: "applied committed" }],
        strategySummaryOverride: "applied override",
      },
    });
    expect(picked?.strategySummaryOverride).toBe("applied override");
    expect(picked?.onePointLessons?.[0]?.text).toBe("applied committed");
  });

  it("signed slide/draw tokens in generated path", () => {
    const slide = buildCommittedAiPresentation({
      templateInputs: buildStrategySummaryTemplateInputs({
        systemId: "5_half_system",
        shotType: "뒤돌리기",
        baseValues: { CO_f: 30 },
        correctedValues: { CO_f: 34 },
        corrections: { slide: 4, draw: 0 },
      }),
    });
    expect(slide.strategySummaryText).toContain("밀림값 +4");
  });
});

describe("Phase 3C buildUserInfoPanel integration", () => {
  it("uses override for strategySummaryText; ignores dual-merge when ai set", () => {
    const panel = buildUserInfoPanel({
      slotRenderSys: {
        systemId: "5_half_system",
        shotType: "뒤돌리기",
        corrections: { slide: 0, draw: -5, curve_ratio: 4.5 },
      },
      resolvedSlotBaseSysValues: { CO_f: 30, C1_f: 4 },
      resolvedSlotSysValues: {
        CO_f: 25,
        C3_r: 25.5,
        Sn: -12.5,
        C4_f: 13,
      },
      ai: {
        strategySummaryOverride: "확정 공략 요약",
        onePointLessons: [{ id: "1", text: "확정 원포인트" }],
      },
    });
    expect(panel.strategySummaryText).toBe("확정 공략 요약");
    expect(panel.onePointText).toBe("확정 원포인트");
    expect(panel.summaryText).toBe("확정 공략 요약");
  });

  it("generated fallback when no override", () => {
    const panel = buildUserInfoPanel({
      slotRenderSys: {
        systemId: "5_half_system",
        shotType: "뒤돌리기",
        corrections: { slide: 0, draw: -5, curve_ratio: 0 },
      },
      resolvedSlotBaseSysValues: { CO_f: 30, C1_f: 4 },
      resolvedSlotSysValues: { CO_f: 25, C3_r: 21 },
      ai: { onePointLessons: [] },
    });
    expect(panel.strategySummaryText).toContain("끌림값 -5");
    expect(panel.strategySummaryText).not.toContain("기울기");
  });
});

describe("Phase 3C USER wiring (source)", () => {
  const app = readFileSync(join(__dirname, "../../App.jsx"), "utf8");
  const panel = readFileSync(
    join(__dirname, "../../components/user/UserAiPanel.jsx"),
    "utf8"
  );
  const helper = readFileSync(
    join(__dirname, "./committedAiPresentation.ts"),
    "utf8"
  );
  const model = readFileSync(
    join(__dirname, "../userInfoPanelModel.ts"),
    "utf8"
  );

  it("App USER path uses selectCommittedSlotAiForUser; no aiLessonSources dual merge", () => {
    expect(app).toContain("selectCommittedSlotAiForUser");
    expect(app).toContain("no draft+applied dual merge for USER AI lessons");
    expect(app).not.toMatch(
      /aiLessonSources:\s*\[\s*draftAi\s*,\s*appliedAi\s*\]/
    );
    // USER panel build must not pass session drafts
    expect(app).toMatch(/ai:\s*committedUserAi/);
    const userPanelIdx = app.indexOf("const committedUserAi = selectCommittedSlotAiForUser");
    expect(userPanelIdx).toBeGreaterThan(-1);
    const userPanelSlice = app.slice(userPanelIdx, userPanelIdx + 900);
    expect(userPanelSlice).not.toContain("strategySummaryDraft");
    expect(userPanelSlice).not.toContain("shotOnePointDraft");
    expect(userPanelSlice).not.toContain("libraryDraft");
  });

  it("UserAiPanel shows 공략 요약 / PRO ONE POINT; no admin chrome", () => {
    expect(panel).toContain("공략 요약");
    expect(panel).toContain("PRO ONE POINT");
    expect(panel).toContain("strategySummaryText");
    expect(panel).toContain("onePointText");
    expect(panel).not.toContain("문장 등록");
    expect(panel).not.toContain("문장 수정");
    expect(panel).not.toContain("문장 선택");
    expect(panel).not.toContain("AI 교정");
    expect(panel).not.toContain("stale");
    expect(panel).not.toContain("fingerprint");
    expect(panel).not.toContain("fetchProofreading");
    expect(panel).not.toContain("libraryDraft");
    expect(panel).not.toContain("shotOnePointDraft");
    expect(panel).not.toContain("strategySummaryDraft");
  });

  it("shared helper has no OpenAI / draft session / calc imports", () => {
    expect(helper).not.toContain("proofread");
    expect(helper).not.toContain("openai");
    expect(helper).not.toContain("localStorage");
    expect(helper).not.toContain("strategySummaryDraft");
    expect(helper).not.toContain("shotOnePointDraft");
    expect(helper).not.toContain("libraryDraft");
    expect(helper).toContain("resolveEffectiveStrategySummary");
    expect(helper).toContain("composeFinalStrategySummary");
  });

  it("userInfoPanelModel builds presentation from committed ai + template SSOT", () => {
    expect(model).toContain("buildCommittedAiPresentation");
    expect(model).toContain("buildStrategySummaryTemplateInputs");
    expect(model).toContain("strategySummaryText");
    expect(model).toContain("onePointText");
  });
});

describe("Phase 3C empty / one-block cases", () => {
  it("summary only → hasStrategySummary, no onePoint", () => {
    const p = buildCommittedAiPresentation({
      committedAi: { onePointLessons: [] },
      templateInputs: TEMPLATE,
    });
    expect(p.hasStrategySummary).toBe(true);
    expect(p.hasOnePoint).toBe(false);
    expect(p.isEmpty).toBe(false);
  });

  it("onePoint only when generated empty inputs still may have intro — override empty + lessons", () => {
    const p = buildCommittedAiPresentation({
      committedAi: {
        strategySummaryOverride: "   ",
        onePointLessons: [{ id: "1", text: "원포인트만" }],
      },
      templateInputs: TEMPLATE,
    });
    // empty override falls through to generated — so both present
    expect(p.hasOnePoint).toBe(true);
    expect(p.onePointText).toBe("원포인트만");
  });

  it("whitespace-only override → generated fallback", () => {
    const p = buildCommittedAiPresentation({
      committedAi: { strategySummaryOverride: "\n  \n" },
      templateInputs: TEMPLATE,
    });
    expect(p.strategySummaryText).toContain("파이브 앤드 하프");
  });

  it("legacy string lesson normalization", () => {
    const p = buildCommittedAiPresentation({
      committedAi: {
        onePointLessons: ["레거시 문자열\n둘째"],
      },
      templateInputs: TEMPLATE,
    });
    expect(p.onePointText).toContain("레거시 문자열");
    expect(p.onePointParagraphs.length).toBeGreaterThanOrEqual(2);
  });
});
