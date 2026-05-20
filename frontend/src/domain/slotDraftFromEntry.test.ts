import { describe, expect, it } from "vitest";
import {
  hasRenderableOutputsResult,
  resolveSlotSysForRender,
} from "./slotSysResolve";

const goodSys = {
  systemId: "5_half_system",
  track: "B2T_L",
  inputs: { CO_f: 33, C3_r: 20 },
  outputs: { result: { CO_f: 33, C3_r: 20, C1_f: 13 } },
};

const brokenDraft = {
  systemId: "5_half_system",
  track: "B2T_L",
  inputs: { CO_f: 33 },
  outputs: { result: {} },
};

describe("slotSysResolve", () => {
  it("treats finite outputs.result as renderable", () => {
    expect(hasRenderableOutputsResult(goodSys)).toBe(true);
    expect(hasRenderableOutputsResult(brokenDraft)).toBe(false);
  });

  it("falls back to applied when draft outputs are incomplete", () => {
    expect(
      resolveSlotSysForRender({
        draft: { sys: brokenDraft },
        applied: { sys: goodSys },
      })
    ).toBe(goodSys);
  });
});
