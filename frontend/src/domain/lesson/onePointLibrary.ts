// domain/lesson/onePointLibrary.ts
// AI-002 — One-Point Library localStorage persistence
// Batch 3 STEP 3-1

export const ONE_POINT_STORAGE_KEY = "ONE_POINT_LESSON_LIBRARY_V1";

export interface OnePointItem {
  id: string;
  text: string;
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
