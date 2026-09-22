// domain/dataset/infra/datasetStorage.ts
// DS-001 + DS-004 — Working Dataset localStorage Infrastructure
// Batch 3 STEP 3-2
//
// Phase C-2: positions_dataset is NOT Local durable SSOT and MUST NOT be used
// as production App load / SAVE / Search authority. Prefer
// loadProductionCompatibleDataset / loadRematerializedWorkingCorpus /
// persistWorkingCorpusNormalizedAuthority (normalized_dataset).
//
// loadWorkingDataset / saveWorkingDataset remain for TEST / MIGRATION helpers
// and explicit opt-in fixtures that assert stale flat is ignored.

import { normalizeDatasetFromStorage } from "../../positionMergeEngine";
import type { PositionRecord } from "../../positionSearchEngine";

/** @deprecated Phase C-2 — not production Local durable SSOT. */
export const WORKING_DATASET_KEY = "positions_dataset";

/** @deprecated Phase C-2 — TEST/MIGRATION only; never production authority. */
export function loadWorkingDataset(): PositionRecord[] {
  try {
    const saved = localStorage.getItem(WORKING_DATASET_KEY);
    const raw = saved ? JSON.parse(saved) : [];
    return normalizeDatasetFromStorage(raw);
  } catch {
    return [];
  }
}

/** @deprecated Phase C-2 — TEST/MIGRATION only; production SAVE does not call this. */
export function saveWorkingDataset(updated: PositionRecord[]): void {
  try {
    localStorage.setItem(WORKING_DATASET_KEY, JSON.stringify(updated));
  } catch (e) {
    console.warn("[SAVE] Failed to save positions_dataset", e);
  }
}

/** Flat file INPUT parser — Import format ≠ Local durable DB. */
export async function importDatasetFromFile(
  file: File
): Promise<PositionRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target!.result as string);
        const importedDataset =
          json.dataset ?? (Array.isArray(json) ? json : null);
        if (!importedDataset) {
          reject(new Error("Invalid dataset.json format"));
          return;
        }
        resolve(normalizeDatasetFromStorage(importedDataset));
      } catch {
        reject(new Error("Failed to import dataset.json"));
      }
    };
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsText(file);
  });
}
