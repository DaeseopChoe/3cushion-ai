import { describe, expect, it } from "vitest";
import { buildBaselineDraftApplyDelta } from "./buildBaselineDraftApplyDelta";

describe("buildBaselineDraftApplyDelta", () => {
  it("CO draft only", () => {
    expect(
      buildBaselineDraftApplyDelta({
        baselineDraftState: {
          coSysValue: 34.2,
          c1SysValue: null,
          activeMark: "CO",
        },
      })
    ).toEqual({
      targetMark: "CO",
      inputDelta: { CO_f: 34.2 },
    });
  });

  it("C1 draft only", () => {
    expect(
      buildBaselineDraftApplyDelta({
        baselineDraftState: {
          coSysValue: null,
          c1SysValue: 6.8,
          activeMark: "C1",
        },
      })
    ).toEqual({
      targetMark: "C1",
      inputDelta: { C1_f: 6.8 },
    });
  });

  it("CO and C1 drafts exist, activeMark CO", () => {
    const result = buildBaselineDraftApplyDelta({
      baselineDraftState: {
        coSysValue: 34.2,
        c1SysValue: 6.8,
        activeMark: "CO",
      },
    });
    expect(result).toEqual({
      targetMark: "CO",
      inputDelta: { CO_f: 34.2 },
    });
    expect(result?.inputDelta).not.toHaveProperty("C1_f");
  });

  it("CO and C1 drafts exist, activeMark C1", () => {
    const result = buildBaselineDraftApplyDelta({
      baselineDraftState: {
        coSysValue: 34.2,
        c1SysValue: 6.8,
        activeMark: "C1",
      },
    });
    expect(result).toEqual({
      targetMark: "C1",
      inputDelta: { C1_f: 6.8 },
    });
    expect(result?.inputDelta).not.toHaveProperty("CO_f");
  });

  it("no activeMark", () => {
    expect(
      buildBaselineDraftApplyDelta({
        baselineDraftState: {
          coSysValue: 34.2,
          c1SysValue: 6.8,
          activeMark: null,
        },
      })
    ).toBeNull();
  });

  it("activeMark CO but coSysValue missing", () => {
    expect(
      buildBaselineDraftApplyDelta({
        baselineDraftState: {
          coSysValue: null,
          c1SysValue: 6.8,
          activeMark: "CO",
        },
      })
    ).toBeNull();
  });

  it("activeMark C1 but c1SysValue missing", () => {
    expect(
      buildBaselineDraftApplyDelta({
        baselineDraftState: {
          coSysValue: 34.2,
          c1SysValue: null,
          activeMark: "C1",
        },
      })
    ).toBeNull();
  });

  it("rejects NaN and Infinity", () => {
    expect(
      buildBaselineDraftApplyDelta({
        baselineDraftState: {
          coSysValue: NaN,
          activeMark: "CO",
        },
      })
    ).toBeNull();
    expect(
      buildBaselineDraftApplyDelta({
        baselineDraftState: {
          coSysValue: Infinity,
          activeMark: "CO",
        },
      })
    ).toBeNull();
    expect(
      buildBaselineDraftApplyDelta({
        baselineDraftState: {
          c1SysValue: NaN,
          activeMark: "C1",
        },
      })
    ).toBeNull();
    expect(
      buildBaselineDraftApplyDelta({
        baselineDraftState: {
          c1SysValue: -Infinity,
          activeMark: "C1",
        },
      })
    ).toBeNull();
  });
});
