import { describe, expect, it } from "vitest";
import {
  formatPublishedLeafSource,
  listCanonicalPublishedSystemIds,
  listCanonicalShotTypes,
  resolveAllPublishedLeafCandidates,
  resolveCandidatePublishedLeaves,
  resolvePublishedLeafKey,
  resolvePublishedShotType,
  resolvePublishedSystemId,
} from "./publishedLeafResolve";
import { buildDatasetExportPathSegments, systemIdToFolderLabel } from "./datasetPath";

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

  it("ADMIN mode with empty shotType returns every Published leaf, default leaf first", () => {
    const leaves = resolveCandidatePublishedLeaves({
      mode: "ADMIN",
      shotType: "",
      systemId: null,
    });
    expect(leaves[0]).toEqual({ shotType: "뒤돌리기", systemId: "5_half_system" });
    expect(leaves).toContainEqual({ shotType: "옆돌리기", systemId: "5_half_system" });
    expect(leaves).toContainEqual({ shotType: "옆돌리기", systemId: "plus_system" });
    expect(leaves.length).toBe(
      listCanonicalShotTypes().length * new Set(listCanonicalPublishedSystemIds().map(systemIdToFolderLabel)).size
    );
  });

  it("ADMIN mode explicit shotType/systemId is a priority hint, never a filter", () => {
    const leaves = resolveCandidatePublishedLeaves({
      mode: "ADMIN",
      shotType: "옆돌리기",
      systemId: "plus_system",
    });
    expect(leaves[0]).toEqual({ shotType: "옆돌리기", systemId: "plus_system" });
    expect(leaves).toContainEqual({ shotType: "뒤돌리기", systemId: "5_half_system" });
    expect(leaves.length).toBe(
      resolveCandidatePublishedLeaves({ mode: "ADMIN", shotType: null, systemId: null }).length
    );
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

describe("resolveAllPublishedLeafCandidates", () => {
  const folderKey = (l: { shotType: string; systemId: string }) => {
    const s = buildDatasetExportPathSegments(l.shotType, l.systemId);
    return `${s.shotTypeDir}/${s.systemDir}`;
  };

  it("one candidate per Published folder (no duplicate URL)", () => {
    const leaves = resolveAllPublishedLeafCandidates();
    const keys = leaves.map(folderKey);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("system list = default 5_half_system first, includes registry and SYS overlay ids", () => {
    const ids = listCanonicalPublishedSystemIds();
    expect(ids[0]).toBe("5_half_system");
    expect(ids).toContain("plus_system");
    expect(ids).toContain("99 to 1");
    expect(ids).toContain("backside_umbrella");
  });

  it("no hint → fixed canonical order: default system first, shot types in metadata order", () => {
    const leaves = resolveAllPublishedLeafCandidates();
    const shots = listCanonicalShotTypes();
    expect(leaves.slice(0, shots.length)).toEqual(
      shots.map((shotType) => ({ shotType, systemId: "5_half_system" }))
    );
    expect(resolveAllPublishedLeafCandidates()).toEqual(leaves);
  });

  it("hint leaf moves first; partial hints rank their matches ahead; nothing is dropped", () => {
    const base = resolveAllPublishedLeafCandidates();
    const hinted = resolveAllPublishedLeafCandidates({ shotType: "옆돌리기", systemId: "plus_system" });
    expect(hinted[0]).toEqual({ shotType: "옆돌리기", systemId: "plus_system" });
    expect(hinted.map(folderKey).sort()).toEqual(base.map(folderKey).sort());

    const shotOnly = resolveAllPublishedLeafCandidates({ shotType: "옆돌리기" });
    expect(shotOnly[0]).toEqual({ shotType: "옆돌리기", systemId: "5_half_system" });
    expect(shotOnly[1].shotType).toBe("옆돌리기");
  });

  it("a non-canonical hinted shot type is added as an extra candidate", () => {
    const leaves = resolveAllPublishedLeafCandidates({ shotType: "빗겨치기", systemId: "5_half_system" });
    expect(leaves[0]).toEqual({ shotType: "빗겨치기", systemId: "5_half_system" });
    expect(leaves.length).toBeGreaterThan(resolveAllPublishedLeafCandidates().length);
  });

  it("formatPublishedLeafSource uses the Published folder label", () => {
    expect(formatPublishedLeafSource({ shotType: "옆돌리기", systemId: "5_half_system" })).toBe(
      "옆돌리기 · 파이브앤하프"
    );
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
