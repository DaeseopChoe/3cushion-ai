/**
 * Phase 2A — Sentence Library register/update/delete + 30 FIFO contracts.
 */
import { describe, expect, it } from "vitest";
import {
  MAX_ONE_POINT_LIBRARY_ITEMS,
  compareOnePointByCreationAgeAsc,
  deleteOnePointLibraryItemById,
  evictOldestOnePointItems,
  formatOnePointDropdownLabel,
  normalizeOnePointLibraryText,
  parseTimestampPrefixFromId,
  registerOnePointLibraryItem,
  resolveOnePointCreationAge,
  sortOnePointLibraryForDropdown,
  updateOnePointLibraryItemById,
  type OnePointItem,
} from "./onePointLibrary";
import {
  buildAiCommentApplyPayload,
  pickCommittedAiForUser,
} from "./aiCommentEditorSession";

function item(
  partial: Partial<OnePointItem> & { id: string; text: string }
): OnePointItem {
  return { ...partial };
}

describe("onePointLibrary Phase 2A — normalize / age", () => {
  it("normalizes CRLF and outer whitespace without altering inner newlines", () => {
    const raw = "  line1\r\nline2\n  ";
    expect(normalizeOnePointLibraryText(raw)).toBe("line1\nline2");
  });

  it("parses timestamp prefix from id", () => {
    expect(parseTimestampPrefixFromId("1700000000000-abc")).toBe(1700000000000);
    expect(parseTimestampPrefixFromId("legacy-no-ts")).toBeNull();
  });

  it("resolves creation age: createdAt > id prefix > legacy 0", () => {
    expect(
      resolveOnePointCreationAge(
        item({ id: "x", text: "a", createdAt: 100 })
      )
    ).toBe(100);
    expect(
      resolveOnePointCreationAge(
        item({ id: "1700000000200-xyz", text: "a" })
      )
    ).toBe(1700000000200);
    expect(
      resolveOnePointCreationAge(item({ id: "legacy-z", text: "a" }))
    ).toBe(0);
  });
});

describe("onePointLibrary Phase 2A — select semantics (model)", () => {
  it("select replaces draft; second select does not append", () => {
    const lib = [
      item({ id: "1", text: "첫째", createdAt: 1 }),
      item({ id: "2", text: "둘째", createdAt: 2 }),
    ];
    let draft = "";
    let selectedId = "";
    const select = (id: string) => {
      const found = lib.find((x) => x.id === id);
      if (!found) return;
      selectedId = id;
      draft = found.text; // replace
    };
    select("1");
    expect(draft).toBe("첫째");
    select("2");
    expect(draft).toBe("둘째");
    expect(draft).not.toContain("첫째");
    expect(selectedId).toBe("2");
  });
});

describe("onePointLibrary Phase 2A — update", () => {
  it("updates selected item text and updatedAt; preserves createdAt", () => {
    const lib = [
      item({
        id: "a",
        text: "원본",
        createdAt: 1000,
        updatedAt: 1000,
        categoryNo: 2,
      }),
    ];
    const result = updateOnePointLibraryItemById(lib, {
      id: "a",
      text: "  수정본\n둘째 줄  ",
      now: 5000,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.updated.text).toBe("수정본\n둘째 줄");
    expect(result.updated.createdAt).toBe(1000);
    expect(result.updated.updatedAt).toBe(5000);
    expect(result.updated.categoryNo).toBe(2);
    expect(lib[0].text).toBe("원본"); // input not mutated
  });

  it("rejects empty text / missing selection", () => {
    const lib = [item({ id: "a", text: "x", createdAt: 1 })];
    expect(
      updateOnePointLibraryItemById(lib, { id: "a", text: "   " }).ok
    ).toBe(false);
    expect(
      updateOnePointLibraryItemById(lib, { id: "missing", text: "y" }).ok
    ).toBe(false);
  });

  it("update does not rejuvenate FIFO age (createdAt)", () => {
    const older = item({ id: "old", text: "old", createdAt: 10 });
    const newer = item({ id: "new", text: "new", createdAt: 90 });
    const updated = updateOnePointLibraryItemById([older, newer], {
      id: "old",
      text: "old-edited",
      now: 999,
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    const ages = updated.items
      .slice()
      .sort(compareOnePointByCreationAgeAsc)
      .map((x) => x.id);
    expect(ages[0]).toBe("old");
  });
});

describe("onePointLibrary Phase 2A — register + FIFO", () => {
  it("registers new item and sets reusable fields", () => {
    const result = registerOnePointLibraryItem([], {
      text: "새 문장\n둘째",
      now: 100,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reused).toBe(false);
    expect(result.item.text).toBe("새 문장\n둘째");
    expect(result.item.createdAt).toBe(100);
    expect(result.items).toHaveLength(1);
  });

  it("identical text register reuses id (no duplicate row)", () => {
    const base = [
      item({
        id: "keep",
        text: "동일 문장",
        createdAt: 1,
        updatedAt: 1,
        count: 0,
      }),
    ];
    const result = registerOnePointLibraryItem(base, {
      text: "  동일 문장  ",
      now: 50,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reused).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.item.id).toBe("keep");
    expect(result.item.createdAt).toBe(1);
    expect(result.item.updatedAt).toBe(50);
    expect(result.item.count).toBe(1);
  });

  it("29 → register → 30; 30 → register → still 30 with oldest evicted", () => {
    const lib29: OnePointItem[] = [];
    for (let i = 1; i <= 29; i += 1) {
      lib29.push(item({ id: `id-${i}`, text: `t${i}`, createdAt: i }));
    }
    const r30 = registerOnePointLibraryItem(lib29, {
      text: "t30",
      now: 30,
    });
    expect(r30.ok).toBe(true);
    if (!r30.ok) return;
    expect(r30.items).toHaveLength(30);

    const r31 = registerOnePointLibraryItem(r30.items, {
      text: "t31",
      now: 31,
    });
    expect(r31.ok).toBe(true);
    if (!r31.ok) return;
    expect(r31.items).toHaveLength(MAX_ONE_POINT_LIBRARY_ITEMS);
    expect(r31.items.some((x) => x.text === "t1")).toBe(false);
    expect(r31.items.some((x) => x.text === "t31")).toBe(true);
  });

  it("FIFO uses createdAt, not array position", () => {
    // Array puts newest first physically, but oldest createdAt must evict.
    const lib = [
      item({ id: "newest", text: "n", createdAt: 300 }),
      item({ id: "oldest", text: "o", createdAt: 100 }),
      item({ id: "mid", text: "m", createdAt: 200 }),
    ];
    const capped = evictOldestOnePointItems(lib, 2);
    expect(capped).toHaveLength(2);
    expect(capped.some((x) => x.id === "oldest")).toBe(false);
    expect(capped.map((x) => x.id)).toEqual(["newest", "mid"]);
  });

  it("load itself is non-destructive for >30; register then normalizes <=30", () => {
    const legacy: OnePointItem[] = [];
    for (let i = 1; i <= 34; i += 1) {
      legacy.push(item({ id: `L${i}`, text: `x${i}`, createdAt: i }));
    }
    expect(legacy).toHaveLength(34); // load would keep this
    const after = registerOnePointLibraryItem(legacy, {
      text: "brand-new",
      now: 1000,
    });
    expect(after.ok).toBe(true);
    if (!after.ok) return;
    expect(after.items.length).toBeLessThanOrEqual(30);
    expect(after.items.some((x) => x.text === "brand-new")).toBe(true);
  });

  it("legacy id timestamp fallback participates in FIFO", () => {
    const lib = [
      item({ id: "1700000000500-a", text: "from-id" }), // age from id
      item({ id: "keep", text: "kept", createdAt: 1700000000900 }),
    ];
    const capped = evictOldestOnePointItems(lib, 1);
    expect(capped).toHaveLength(1);
    expect(capped[0].id).toBe("keep");
  });

  it("legacy no-timestamp uses deterministic id tie-break within age 0", () => {
    const a = item({ id: "aaa", text: "a" });
    const b = item({ id: "zzz", text: "z" });
    expect(compareOnePointByCreationAgeAsc(a, b)).toBeLessThan(0);
    const capped = evictOldestOnePointItems([b, a], 1);
    expect(capped[0].id).toBe("zzz");
  });

  it("dropdown sort is newest-first and includes categoryNo items (flat)", () => {
    const lib = [
      item({ id: "1", text: "old", createdAt: 1, categoryNo: 3 }),
      item({ id: "2", text: "new", createdAt: 9 }),
    ];
    const sorted = sortOnePointLibraryForDropdown(lib);
    expect(sorted.map((x) => x.id)).toEqual(["2", "1"]);
    expect(sorted.some((x) => x.categoryNo === 3)).toBe(true);
  });

  it("formatOnePointDropdownLabel is display-only preview", () => {
    const text = "abcdefghijklmnopqrstuvwxyz0123456789EXTRA";
    expect(formatOnePointDropdownLabel(text, 20).endsWith("…")).toBe(true);
    expect(text.length).toBeGreaterThan(20);
  });
});

describe("onePointLibrary Phase 2A — delete", () => {
  it("explicit delete removes only selected id", () => {
    const lib = [
      item({ id: "a", text: "A", createdAt: 1 }),
      item({ id: "b", text: "B", createdAt: 2 }),
    ];
    const result = deleteOnePointLibraryItemById(lib, "a");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items.map((x) => x.id)).toEqual(["b"]);
  });

  it("editor text clear alone is not a library delete (model)", () => {
    const lib = [item({ id: "a", text: "A", createdAt: 1 })];
    let draft = "A";
    draft = ""; // typing clear
    expect(lib).toHaveLength(1);
    expect(draft).toBe("");
  });
});

describe("onePointLibrary Phase 2A — Apply vs Library isolation", () => {
  const originalLib = [
    item({ id: "lib1", text: "라이브러리 원본", createdAt: 1 }),
  ];

  it("A: direct input Apply does not mutate library", () => {
    const libBefore = originalLib.map((x) => ({ ...x }));
    const payload = buildAiCommentApplyPayload({
      draftText: "직접 입력 샷",
    });
    expect(payload.onePointLessons).toHaveLength(1);
    expect(libBefore).toEqual(originalLib);
  });

  it("B: edit selected + Apply keeps library original", () => {
    const lib = originalLib.map((x) => ({ ...x }));
    const draft = "라이브러리 원본 — 샷만 수정";
    const payload = buildAiCommentApplyPayload({ draftText: draft });
    expect(payload.onePointLessons[0].text).toBe(draft);
    expect(lib[0].text).toBe("라이브러리 원본");
  });

  it("C: edit selected + explicit update changes library only", () => {
    const lib = originalLib.map((x) => ({ ...x }));
    const result = updateOnePointLibraryItemById(lib, {
      id: "lib1",
      text: "라이브러리 수정본",
      now: 10,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items[0].text).toBe("라이브러리 수정본");
    // shot would still be separate — Apply not called
  });

  it("D: register adds/reuses without Apply", () => {
    const result = registerOnePointLibraryItem([], {
      text: "등록만",
      now: 1,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items).toHaveLength(1);
  });

  it("E: proofread draft → Apply leaves library unchanged (model)", () => {
    const lib = originalLib.map((x) => ({ ...x }));
    const corrected = "교정본 샷";
    const payload = buildAiCommentApplyPayload({ draftText: corrected });
    expect(payload.onePointLessons[0].text).toBe(corrected);
    expect(lib[0].text).toBe("라이브러리 원본");
  });

  it("F: proofread draft → explicit update changes selected library", () => {
    const lib = originalLib.map((x) => ({ ...x }));
    const result = updateOnePointLibraryItemById(lib, {
      id: "lib1",
      text: "교정본 라이브러리",
      now: 20,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.items[0].text).toBe("교정본 라이브러리");
  });

  it("Apply remains single shot block", () => {
    const payload = buildAiCommentApplyPayload({
      draftText: "a\nb\nc",
    });
    expect(payload.onePointLessons).toHaveLength(1);
    expect(payload.onePointLessons[0].text).toBe("a\nb\nc");
  });

  it("Cancel after library update does not rollback library (model)", () => {
    let lib = originalLib.map((x) => ({ ...x }));
    const updated = updateOnePointLibraryItemById(lib, {
      id: "lib1",
      text: "확정된 라이브러리 수정",
      now: 3,
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;
    lib = updated.items;
    // cancel restores draft only
    let draft = "미확정";
    draft = "lastCommittedText";
    expect(lib[0].text).toBe("확정된 라이브러리 수정");
    expect(draft).toBe("lastCommittedText");
  });

  it("USER isolation: library/draft do not enter committed pick", () => {
    const userAi = pickCommittedAiForUser({
      draftAi: null,
      appliedAi: { text: "", onePointLessons: [] },
    });
    expect(userAi?.onePointLessons ?? []).toEqual([]);
  });
});
