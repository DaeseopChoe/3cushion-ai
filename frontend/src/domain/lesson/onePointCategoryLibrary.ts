// domain/lesson/onePointCategoryLibrary.ts
// One-Point Category Library — independent localStorage persistence

export const ONE_POINT_CATEGORY_STORAGE_KEY =
  "ONE_POINT_CATEGORY_LIBRARY_V1";

export interface OnePointCategory {
  /** Stable identity. It is assigned once and never changed. */
  no: number;
  name: string;
}

interface StoredCategoryLibrary {
  categories: OnePointCategory[];
  /** Monotonic allocator prevents a deleted category number being reused. */
  nextNo: number;
}

const EMPTY_LIBRARY: StoredCategoryLibrary = {
  categories: [],
  nextNo: 1,
};

function normalizeCategories(value: unknown): OnePointCategory[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<number>();
  const categories: OnePointCategory[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const no = Number(row.no);
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!Number.isSafeInteger(no) || no < 1 || !name || seen.has(no)) continue;
    seen.add(no);
    categories.push({ no, name });
  }
  return categories;
}

function loadLibrary(): StoredCategoryLibrary {
  try {
    const raw = localStorage.getItem(ONE_POINT_CATEGORY_STORAGE_KEY);
    if (!raw) return { ...EMPTY_LIBRARY, categories: [] };

    const parsed: unknown = JSON.parse(raw);
    // Accept a plain array as a defensive backward-compatible shape.
    const source = Array.isArray(parsed)
      ? parsed
      : parsed && typeof parsed === "object"
        ? (parsed as Record<string, unknown>).categories
        : [];
    const categories = normalizeCategories(source);
    const maxNo = categories.reduce((max, item) => Math.max(max, item.no), 0);
    const storedNextNo =
      !Array.isArray(parsed) && parsed && typeof parsed === "object"
        ? Number((parsed as Record<string, unknown>).nextNo)
        : 0;
    const nextNo =
      Number.isSafeInteger(storedNextNo) && storedNextNo > maxNo
        ? storedNextNo
        : maxNo + 1;

    return { categories, nextNo: Math.max(1, nextNo) };
  } catch (e) {
    console.warn("Failed to load onePointCategoryLibrary", e);
    return { ...EMPTY_LIBRARY, categories: [] };
  }
}

function persistLibrary(library: StoredCategoryLibrary): void {
  try {
    localStorage.setItem(
      ONE_POINT_CATEGORY_STORAGE_KEY,
      JSON.stringify(library)
    );
  } catch (e) {
    console.warn("Failed to save onePointCategoryLibrary", e);
  }
}

export function loadOnePointCategories(): OnePointCategory[] {
  return loadLibrary().categories;
}

export function saveOnePointCategories(
  categories: OnePointCategory[]
): OnePointCategory[] {
  const current = loadLibrary();
  const normalized = normalizeCategories(categories);
  const maxNo = normalized.reduce((max, item) => Math.max(max, item.no), 0);
  persistLibrary({
    categories: normalized,
    nextNo: Math.max(current.nextNo, maxNo + 1),
  });
  return normalized;
}

export function createOnePointCategory(name: string): OnePointCategory[] {
  const library = loadLibrary();
  const normalizedName = String(name ?? "").trim();
  if (!normalizedName) return library.categories;

  const category = { no: library.nextNo, name: normalizedName };
  const categories = [...library.categories, category];
  persistLibrary({
    categories,
    nextNo: library.nextNo + 1,
  });
  return categories;
}

export function updateOnePointCategory(
  no: number,
  name: string
): OnePointCategory[] {
  const library = loadLibrary();
  const normalizedName = String(name ?? "").trim();
  if (!normalizedName) return library.categories;

  const categories = library.categories.map((category) =>
    category.no === no ? { ...category, name: normalizedName } : category
  );
  persistLibrary({ ...library, categories });
  return categories;
}

export function deleteOnePointCategory(no: number): OnePointCategory[] {
  const library = loadLibrary();
  const categories = library.categories.filter(
    (category) => category.no !== no
  );
  persistLibrary({ ...library, categories });
  return categories;
}
