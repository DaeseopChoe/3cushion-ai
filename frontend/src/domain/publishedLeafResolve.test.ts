import { describe, expect, it } from "vitest";
import {
  resolvePublishedLeafKey,
  resolvePublishedShotType,
  resolvePublishedSystemId,
} from "./publishedLeafResolve";

describe("resolvePublishedShotType", () => {
  it("returns trimmed shot type when non-empty", () => {
    expect(resolvePublishedShotType("  옆돌리기  ")).toBe("옆돌리기");
  });

  it("falls back to 뒤돌리기 for empty, whitespace, null, undefined", () => {
    expect(resolvePublishedShotType("")).toBe("뒤돌리기");
    expect(resolvePublishedShotType("   ")).toBe("뒤돌리기");
    expect(resolvePublishedShotType(null)).toBe("뒤돌리기");
    expect(resolvePublishedShotType(undefined)).toBe("뒤돌리기");
  });
});

describe("resolvePublishedSystemId", () => {
  it("prefers systemId over system_id", () => {
    expect(resolvePublishedSystemId("plus_system", "5_half_system")).toBe(
      "plus_system"
    );
  });

  it("falls back to system_id then default", () => {
    expect(resolvePublishedSystemId(null, "plus2_system")).toBe("plus2_system");
    expect(resolvePublishedSystemId("", "")).toBe("5_half_system");
    expect(resolvePublishedSystemId(null, undefined)).toBe("5_half_system");
  });
});

describe("resolvePublishedLeafKey", () => {
  it("resolves ADMIN input with empty shotType to default", () => {
    expect(
      resolvePublishedLeafKey({
        mode: "ADMIN",
        shotType: "",
        systemId: "5_half_system",
      })
    ).toEqual({ shotType: "뒤돌리기", systemId: "5_half_system" });
  });

  it("resolves USER mode with defaults when hints omitted", () => {
    expect(resolvePublishedLeafKey({ mode: "USER" })).toEqual({
      shotType: "뒤돌리기",
      systemId: "5_half_system",
    });
  });
});
