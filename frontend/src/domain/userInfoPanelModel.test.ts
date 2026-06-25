import { describe, expect, it } from "vitest";
import {
  buildPlayStrategySummaryText,
  buildUserInfoPanel,
} from "./userInfoPanelModel";

describe("buildUserInfoPanel", () => {
  it("builds read model from slot SSOT values", () => {
    const panel = buildUserInfoPanel({
      strategyButtonLabel: "뒤돌리기①",
      slotRenderSys: {
        systemId: "5_half_system",
        shotType: "뒤돌리기",
      },
      resolvedSlotSys: {
        systemId: "5_half_system",
        track: "B2T_L",
        inputs: { CO_f: 40 },
        outputs: { result: { oneC: 20, threeC: 30, CO_f: 40, C1_f: 20, C3_f: 30 } },
      },
      resolvedSlotSysValues: { CO_f: 40, C1_f: 20, C3_f: 30, oneC: 20, threeC: 30 },
      appliedSys: {
        systemId: "5_half_system",
        track: "B2T_L",
        inputs: {},
        outputs: { result: { oneC: 20, threeC: 30 } },
      },
      hpt: { T: "8/8", hit_point: { x: 0, y: 0 }, mode: "TIP" },
      str: { speed: 2.5, depth: 2, impact: "medium", acceleration: "smooth_const" },
    });

    expect(panel.title).toBe("뒤돌리기①");
    expect(panel.shotType).toBe("뒤돌리기");
    expect(panel.systemName).toContain("파이브");
    expect(panel.systemValues.c1).toBe("20");
    expect(panel.systemValues.c3).toBe("30");
    expect(panel.summaryText).toContain("뒤돌리기");
    expect(panel.autoComment?.formulaUserLine).toContain("1쿠션값");
    expect(panel.summaryText).not.toContain("두께는");
    expect(panel.hpPreview.thickness).toContain("8/8");
  });

  it("onePointLessons from ai only (no narrative fallback)", () => {
    const panel = buildUserInfoPanel({
      slotRenderSys: { systemId: "5_half_system", shotType: "옆돌리기" },
      ai: {
        onePointLessons: [{ id: "1", text: "손에 힘을 빼고 스트로크하세요." }],
      },
      viewStrategyNarrative: ["무시될 서사", "두 번째 줄"],
    });
    expect(panel.onePointLessons).toEqual(["손에 힘을 빼고 스트로크하세요."]);
    expect(panel.autoComment?.introLine).toContain("옆돌리기");
  });

  it("merges onePointLessons from aiLessonSources when primary ai is empty", () => {
    const panel = buildUserInfoPanel({
      slotRenderSys: { systemId: "5_half_system", shotType: "뒤돌리기" },
      ai: { onePointLessons: [] },
      aiLessonSources: [
        { onePointLessons: [] },
        { onePointLessons: [{ id: "1", text: "내공과 1적구의 거리가 멀어 밀림이 큽니다." }] },
        null,
      ],
    });
    expect(panel.onePointLessons).toEqual([
      "내공과 1적구의 거리가 멀어 밀림이 큽니다.",
    ]);
  });

  it("buildPlayStrategySummaryText is non-empty with minimal slot data", () => {
    const text = buildPlayStrategySummaryText({
      slotRenderSys: { systemId: "5_half_system", shotType: "뒤돌리기" },
      appliedSys: {
        systemId: "5_half_system",
        track: "B2T_L",
        inputs: {},
        outputs: { result: { oneC: 12, threeC: 30 } },
      },
      hpt: { T: "8/8", hit_point: { x: 0, y: 0 } },
      str: { speed: 2.5, depth: 2, impact: "medium" },
    });
    expect(text.length).toBeGreaterThan(10);
    expect(text).toContain("뒤돌리기");
  });
});
