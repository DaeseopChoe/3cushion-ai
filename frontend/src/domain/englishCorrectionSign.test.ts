import { describe, it, expect } from "vitest";
import { getShotTypeCorrectionSign } from "./englishCorrectionSign";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

describe("englishCorrectionSign", () => {
  it("returns correct sign for shot types", () => {
    assert(getShotTypeCorrectionSign("뒤돌리기") === 1, "back spin +1");
    assert(getShotTypeCorrectionSign("옆돌리기") === -1, "side spin -1");
    assert(getShotTypeCorrectionSign("옆돌리기 대회전") === -1, "side family -1");
    assert(getShotTypeCorrectionSign(undefined) === 1, "default +1");
    assert(getShotTypeCorrectionSign(null) === 1, "null default +1");
  });
});
