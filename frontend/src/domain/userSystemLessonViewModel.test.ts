import { describe, expect, it } from "vitest";
import { buildUserSystemLessonViewModel } from "./userSystemLessonViewModel";

describe("buildUserSystemLessonViewModel", () => {
  it("empty when no strategy selected", () => {
    const vm = buildUserSystemLessonViewModel({ noStrategySelected: true });
    expect(vm.isEmpty).toBe(true);
    expect(vm.emptyMessage).toContain("공략");
  });

  it("five-half: position C4=16 and corrected C4=25.5", () => {
    const vm = buildUserSystemLessonViewModel({
      slotRenderSys: {
        systemId: "5_half_system",
        shotType: "뒤돌리기",
        spaceSel: { CO: "f", C1: "f", C3: "r" },
        corrections: { slide: 3, draw: 0, curve_ratio: 5, spin: 0 },
      },
      resolvedSlotBaseSysValues: {
        CO_f: 30,
        C1_f: 4,
        C3_r: 26,
        Sn: -10,
        C4_f: 16,
      },
      resolvedSlotSysValues: {
        CO_f: 33,
        C1_f: 4,
        C3_r: 34,
        Sn: -8.5,
        C4_f: 25.5,
      },
    });

    expect(vm.isEmpty).toBe(false);
    expect(vm.title).toContain("파이브");
    expect(vm.positionSection?.c4.resultLine).toBe("4쿠션값 : 16");
    expect(vm.positionSection?.c4.calcLine).toContain("= 16");
    expect(vm.correctionSection?.c4.resultLine).toBe("4쿠션값 : 25.5");
    expect(vm.correctionSection?.startAdjustLine).toContain("밀림(3)");
    expect(vm.correctionSection?.c3AdjustLine).toContain("3쿠션값(34)");
  });
});
