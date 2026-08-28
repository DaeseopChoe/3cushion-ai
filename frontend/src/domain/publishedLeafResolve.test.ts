import { describe, expect, it } from "vitest";
import {
  listCanonicalShotTypes,
  resolveCandidatePublishedLeaves,
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

describe("listCanonicalShotTypes", () => {
  it("returns list of active shot types including 뒤돌리기 and 옆돌리기", () => {
    const list = listCanonicalShotTypes();
    expect(list).toContain("뒤돌리기");
    expect(list).toContain("옆돌리기");
    expect(list.length).toBeGreaterThanOrEqual(2);
  });
});

describe("resolveCandidatePublishedLeaves", () => {
  it("returns single leaf when explicit shotType is provided", () => {
    const leaves = resolveCandidatePublishedLeaves({
      mode: "USER",
      shotType: "옆돌리기",
      systemId: "5_half_system",
    });
    expect(leaves).toEqual([{ shotType: "옆돌리기", systemId: "5_half_system" }]);
  });

  it("returns single default leaf in ADMIN mode when shotType is empty", () => {
    const leaves = resolveCandidatePublishedLeaves({
      mode: "ADMIN",
      shotType: "",
      systemId: "5_half_system",
    });
    expect(leaves).toEqual([{ shotType: "뒤돌리기", systemId: "5_half_system" }]);
  });

  it("returns candidate leaves from canonical active shot types in USER mode when shotType is null", () => {
    const leaves = resolveCandidatePublishedLeaves({
      mode: "USER",
      shotType: null,
      systemId: "5_half_system",
    });
    expect(leaves.length).toBeGreaterThanOrEqual(2);
    expect(leaves).toContainEqual({ shotType: "뒤돌리기", systemId: "5_half_system" });
    expect(leaves).toContainEqual({ shotType: "옆돌리기", systemId: "5_half_system" });
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
