import { describe, expect, it } from "vitest";
import {
  clampBallCenterRg,
  clampGuideIntersectionRg,
  parseCoordinateInput,
  resolveDirectInputApply,
  resolveGuideDirectInputApply,
} from "./ballPositionDirectInputPolicy";

describe("ballPositionDirectInputPolicy", () => {
  it("parses integer coordinates", () => {
    expect(parseCoordinateInput("70")).toBe(70);
    expect(parseCoordinateInput(" 39 ")).toBe(39);
  });

  it("parses decimal coordinates", () => {
    expect(parseCoordinateInput("70.0")).toBe(70);
    expect(parseCoordinateInput("10.5")).toBe(10.5);
  });

  it("rejects invalid strings", () => {
    expect(parseCoordinateInput("abc")).toBeNull();
    expect(parseCoordinateInput("12.3.4")).toBeNull();
  });

  it("rejects empty input", () => {
    expect(parseCoordinateInput("")).toBeNull();
    expect(parseCoordinateInput("   ")).toBeNull();
  });

  it("rejects NaN-equivalent values", () => {
    expect(parseCoordinateInput("NaN")).toBeNull();
    expect(parseCoordinateInput("Infinity")).toBeNull();
  });

  it("clamps ball x lower bound", () => {
    expect(clampBallCenterRg(0, 20)?.x).toBe(0.5);
  });

  it("clamps ball x upper bound", () => {
    expect(clampBallCenterRg(80, 20)?.x).toBe(79.5);
  });

  it("clamps ball y lower bound", () => {
    expect(clampBallCenterRg(20, 0)?.y).toBe(0.5);
  });

  it("clamps ball y upper bound", () => {
    expect(clampBallCenterRg(20, 40)?.y).toBe(39.5);
  });

  it("clamps guide intersection boundaries", () => {
    expect(clampGuideIntersectionRg(0, 0)).toEqual({
      verticalX: 0.5,
      horizontalY: 0.5,
    });
    expect(clampGuideIntersectionRg(80, 40)).toEqual({
      verticalX: 79.5,
      horizontalY: 39.5,
    });
  });

  it("keeps in-range coordinates unchanged", () => {
    expect(clampBallCenterRg(70, 39)).toEqual({ x: 70, y: 39 });
    expect(clampGuideIntersectionRg(70, 39)).toEqual({
      verticalX: 70,
      horizontalY: 39,
    });
  });

  it("resolves direct ball apply from raw fields", () => {
    expect(
      resolveDirectInputApply("70.0", "39.0", { x: 0, y: 0 })
    ).toEqual({ x: 70, y: 39 });
    expect(resolveDirectInputApply("", "39", { x: 1, y: 2 })).toBeNull();
  });

  it("resolves direct guide apply from raw fields", () => {
    expect(
      resolveGuideDirectInputApply("70.0", "39.0", { x: 0, y: 0 })
    ).toEqual({ verticalX: 70, horizontalY: 39 });
  });
});
