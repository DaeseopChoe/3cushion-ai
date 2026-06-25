import { describe, expect, it } from "vitest";
import {
  buildSlotRuntimePayload,
  createEmptySlotRuntime,
  extractSlotTargetBall,
  slotHasRenderableStrategy,
} from "./slotRuntimeHydrate";

describe("slotRuntimeHydrate", () => {
  it("empty slot returns blank runtime", () => {
    const payload = buildSlotRuntimePayload({ draft: null, applied: null });
    expect(payload.trajectoryResult).toBeNull();
    expect(payload.targetBall).toBeNull();
    expect(payload.adminSys.inputs).toEqual({});
    expect(payload.adminSys.shotType).toBe("");
    expect(payload.adminSys.corrections?.slide).toBe(0);
  });

  it("slot with applied sys uses per-slot corrections", () => {
    const slot = {
      applied: {
        sys: {
          systemId: "5_half_system",
          track: "B2T_L",
          inputs: { CO_f: 10 },
          outputs: { result: { CO_f: 12, oneC: 1, threeC: 2 } },
        },
        corrections: { slide: 3, curve_ratio: 0, draw: 0, departure: 0, spin: 0 },
        shotType: "뒤돌리기",
      },
    };
    expect(slotHasRenderableStrategy(slot)).toBe(true);
    const payload = buildSlotRuntimePayload(slot);
    expect(payload.adminSys.corrections?.slide).toBe(3);
    expect(payload.trajectoryResult?.oneC).toBe(1);
  });

  it("createEmptySlotRuntime has no trajectory", () => {
    expect(createEmptySlotRuntime().trajectoryResult).toBeNull();
    expect(createEmptySlotRuntime().targetBall).toBeNull();
  });

  it("restores per-slot targetBall from draft", () => {
    const slot = {
      applied: {
        sys: {
          systemId: "5_half_system",
          track: "B2T_L",
          inputs: { CO_f: 10 },
          outputs: { result: { CO_f: 12, oneC: 1, threeC: 2 } },
        },
        targetBall: "yellow" as const,
      },
    };
    expect(buildSlotRuntimePayload(slot).targetBall).toBe("yellow");
  });

  it("extractSlotTargetBall prefers draft over applied", () => {
    const slot = {
      draft: { targetBall: "red" as const },
      applied: { targetBall: "yellow" as const },
    };
    expect(extractSlotTargetBall(slot)).toBe("red");
  });
});
