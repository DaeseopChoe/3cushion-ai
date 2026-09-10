// domain/lesson/onePointLibrary.ts
// AI-002 — One-Point / Sentence Library localStorage persistence
// Phase 2A — explicit register / update / delete + max-30 FIFO (createdAt age)

export const ONE_POINT_STORAGE_KEY = "ONE_POINT_LESSON_LIBRARY_V1";

/** Whole Sentence Library max size (not per-category). */
export const MAX_ONE_POINT_LIBRARY_ITEMS = 30;

export interface OnePointItem {
  id: string;
  text: string;
  categoryNo?: number;
  count?: number;
  createdAt?: number;
  updatedAt?: number;
}

export function loadOnePoints(): OnePointItem[] {
  try {
    const raw = localStorage.getItem(ONE_POINT_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (Array.isArray(parsed)) return parsed as OnePointItem[];
    return [];
  } catch (e) {
    console.warn("Failed to load onePointLibrary", e);
    return [];
  }
}

export function saveOnePoints(items: OnePointItem[]): void {
  try {
    localStorage.setItem(ONE_POINT_STORAGE_KEY, JSON.stringify(items));
  } catch (e) {
    console.warn("Failed to save onePointLibrary", e);
  }
}

/** Minimal deterministic text normalize for equality (trim + CRLF → LF). */
export function normalizeOnePointLibraryText(value: unknown): string {
  return String(value ?? "")
    .replace(/^\uFEFF/, "")
    .replace(/\r\n/g, "\n")
    .trim();
}

export function newOnePointLibraryItemId(now = Date.now()): string {
  return `${now}-${Math.random().toString(16).slice(2)}`;
}

/** Parse `${Date.now()}-…` style ids; else null. */
export function parseTimestampPrefixFromId(id: unknown): number | null {
  const s = String(id ?? "");
  const m = /^(\d{10,16})-/.exec(s);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/**
 * Deterministic creation age for FIFO / display.
 * Does not mutate items. Array index is NOT used as age
 * (Lesson Order may have reordered the array).
 *
 * Priority:
 * 1. valid createdAt
 * 2. id timestamp prefix
 * 3. legacy-old cohort (0) + stable id lexical tie-break via resolveCreationAgeMeta
 */
export function resolveOnePointCreationAge(item: OnePointItem | null | undefined): number {
  const created = Number(item?.createdAt);
  if (Number.isFinite(created) && created > 0) return created;
  const fromId = parseTimestampPrefixFromId(item?.id);
  if (fromId != null) return fromId;
  return 0;
}

export type OnePointAgeMeta = {
  age: number;
  id: string;
};

export function resolveOnePointAgeMeta(
  item: OnePointItem | null | undefined
): OnePointAgeMeta {
  return {
    age: resolveOnePointCreationAge(item ?? undefined),
    id: item?.id == null ? "" : String(item.id),
  };
}

/** Oldest first (FIFO eviction order). Stable by id. */
export function compareOnePointByCreationAgeAsc(
  a: OnePointItem,
  b: OnePointItem
): number {
  const ma = resolveOnePointAgeMeta(a);
  const mb = resolveOnePointAgeMeta(b);
  if (ma.age !== mb.age) return ma.age - mb.age;
  if (ma.id < mb.id) return -1;
  if (ma.id > mb.id) return 1;
  return 0;
}

/** Newest first (dropdown display). Stable by id. */
export function compareOnePointByCreationAgeDesc(
  a: OnePointItem,
  b: OnePointItem
): number {
  return compareOnePointByCreationAgeAsc(b, a);
}

export function sortOnePointLibraryForDropdown(
  items: OnePointItem[] | null | undefined
): OnePointItem[] {
  if (!Array.isArray(items) || items.length === 0) return [];
  return items.slice().sort(compareOnePointByCreationAgeDesc);
}

/**
 * Trim to max by removing oldest items (createdAt age).
 * Non-destructive on load — call only after registration.
 * Does not use array position.
 */
export function evictOldestOnePointItems(
  items: OnePointItem[] | null | undefined,
  maxItems: number = MAX_ONE_POINT_LIBRARY_ITEMS
): OnePointItem[] {
  if (!Array.isArray(items)) return [];
  if (!Number.isFinite(maxItems) || maxItems < 0) return items.slice();
  if (items.length <= maxItems) return items.slice();

  const byAgeAsc = items.slice().sort(compareOnePointByCreationAgeAsc);
  const removeCount = items.length - maxItems;
  const removeIds = new Set(
    byAgeAsc.slice(0, removeCount).map((item) => String(item.id))
  );
  // Preserve relative order of survivors (not age order).
  return items.filter((item) => !removeIds.has(String(item.id)));
}

export type UpdateOnePointLibraryResult =
  | { ok: true; items: OnePointItem[]; updated: OnePointItem }
  | { ok: false; reason: string; items: OnePointItem[] };

/**
 * Explicit 「문장 수정」: update selected id only.
 * Preserves createdAt. Does not touch shot/USER.
 */
export function updateOnePointLibraryItemById(
  items: OnePointItem[] | null | undefined,
  args: { id: string; text: unknown; now?: number }
): UpdateOnePointLibraryResult {
  const list = Array.isArray(items) ? items.slice() : [];
  const id = String(args.id ?? "");
  const text = normalizeOnePointLibraryText(args.text);
  if (!id) return { ok: false, reason: "missing-id", items: list };
  if (!text) return { ok: false, reason: "empty-text", items: list };

  const idx = list.findIndex((x) => String(x.id) === id);
  if (idx < 0) return { ok: false, reason: "not-found", items: list };

  const now = Number.isFinite(args.now) ? Number(args.now) : Date.now();
  const prev = list[idx];
  const updated: OnePointItem = {
    ...prev,
    id: prev.id,
    text,
    updatedAt: now,
  };
  // createdAt must remain as stored (including undefined legacy).
  if (prev.createdAt !== undefined) updated.createdAt = prev.createdAt;
  else delete updated.createdAt;

  list[idx] = updated;
  return { ok: true, items: list, updated };
}

export type RegisterOnePointLibraryResult =
  | {
      ok: true;
      items: OnePointItem[];
      item: OnePointItem;
      reused: boolean;
    }
  | { ok: false; reason: string; items: OnePointItem[] };

/**
 * Explicit 「문장 등록」.
 * - Identical normalized text → reuse existing id (no duplicate row); bump updatedAt/count.
 * - Else insert new item, then FIFO-normalize to max (registration-time only).
 * - Load path must NOT call eviction.
 */
export function registerOnePointLibraryItem(
  items: OnePointItem[] | null | undefined,
  args: {
    text: unknown;
    now?: number;
    categoryNo?: number | null | "";
    maxItems?: number;
  }
): RegisterOnePointLibraryResult {
  const list = Array.isArray(items) ? items.slice() : [];
  const text = normalizeOnePointLibraryText(args.text);
  if (!text) {
    return { ok: false, reason: "empty-text", items: list };
  }

  const now = Number.isFinite(args.now) ? Number(args.now) : Date.now();
  const maxItems =
    args.maxItems == null ? MAX_ONE_POINT_LIBRARY_ITEMS : Number(args.maxItems);

  const existing = list.find(
    (x) => normalizeOnePointLibraryText(x.text) === text
  );
  if (existing) {
    const next = list.map((x) =>
      String(x.id) === String(existing.id)
        ? {
            ...x,
            text,
            updatedAt: now,
            count: (Number(x.count) || 0) + 1,
          }
        : x
    );
    const item = next.find((x) => String(x.id) === String(existing.id))!;
    return { ok: true, items: next, item, reused: true };
  }

  const newItem: OnePointItem = {
    id: newOnePointLibraryItemId(now),
    text,
    count: 0,
    createdAt: now,
    updatedAt: now,
  };
  const cat = Number(args.categoryNo);
  if (
    args.categoryNo !== "" &&
    args.categoryNo != null &&
    Number.isFinite(cat)
  ) {
    newItem.categoryNo = cat;
  }

  const withNew = [newItem, ...list];
  const capped = evictOldestOnePointItems(withNew, maxItems);
  const item =
    capped.find((x) => String(x.id) === String(newItem.id)) ?? newItem;
  return { ok: true, items: capped, item, reused: false };
}

export type DeleteOnePointLibraryResult =
  | { ok: true; items: OnePointItem[]; removedId: string }
  | { ok: false; reason: string; items: OnePointItem[] };

/** Explicit library delete by id (not editor text clear). */
export function deleteOnePointLibraryItemById(
  items: OnePointItem[] | null | undefined,
  id: unknown
): DeleteOnePointLibraryResult {
  const list = Array.isArray(items) ? items.slice() : [];
  const target = String(id ?? "");
  if (!target) return { ok: false, reason: "missing-id", items: list };
  if (!list.some((x) => String(x.id) === target)) {
    return { ok: false, reason: "not-found", items: list };
  }
  return {
    ok: true,
    items: list.filter((x) => String(x.id) !== target),
    removedId: target,
  };
}

/**
 * Display-only label for native <select> options (does not mutate stored text).
 * Collapses whitespace to one line and truncates with ellipsis.
 */
export function formatOnePointDropdownLabel(
  text: unknown,
  maxChars = 48
): string {
  const oneLine = String(text ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
  if (!oneLine) return "(빈 문장)";
  const limit = Number.isFinite(maxChars) && maxChars > 4 ? maxChars : 48;
  if (oneLine.length <= limit) return oneLine;
  return `${oneLine.slice(0, limit - 1)}…`;
}
