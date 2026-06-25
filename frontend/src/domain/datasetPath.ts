/**
 * Published dataset folder layout SSOT:
 * dataset/{shotType}/{systemLabel}/positions.json
 */

import { getSystemNameKo } from "../utils/aiPlayStrategyBuilder";

/** Export file at leaf directory */
export const DATASET_EXPORT_FILENAME = "positions.json";

/** Root folder under user-selected export directory */
export const DATASET_ROOT_DIR = "dataset";

/** Dataset export envelope schema (not PositionRecord.schemaVersion logic) */
export const DATASET_EXPORT_SCHEMA_VERSION = 2;

/** Folder name overrides (display-friendly, no spaces) */
const SYSTEM_FOLDER_LABEL_OVERRIDES: Record<string, string> = {
  "5_half_system": "파이브앤하프",
  plus2_system: "플러스투",
  plus_system: "플러스",
  double_rail: "더블레일",
};

function sanitizePathSegment(name: string): string {
  const trimmed = String(name ?? "").trim();
  const safe = trimmed.replace(/[/\\:*?"<>|]/g, "_").trim();
  return safe || "unknown";
}

function folderLabelFromKoName(koName: string): string {
  return koName
    .replace(/\s+/g, "")
    .replace(/·/g, "")
    .replace(/시스템$/, "")
    .trim();
}

/** systemId → folder segment (e.g. 파이브앤하프) */
export function systemIdToFolderLabel(systemId: string): string {
  const id = String(systemId ?? "").trim();
  if (!id) return "unknown";
  const override = SYSTEM_FOLDER_LABEL_OVERRIDES[id];
  if (override) return sanitizePathSegment(override);
  const ko = getSystemNameKo(id, id);
  return sanitizePathSegment(folderLabelFromKoName(ko));
}

export type DatasetExportPathSegments = {
  datasetRoot: string;
  shotTypeDir: string;
  systemDir: string;
  fileName: string;
};

/** Relative segments under export root: dataset/{shotType}/{systemLabel}/positions.json */
export function buildDatasetExportPathSegments(
  shotType: string,
  systemId: string
): DatasetExportPathSegments {
  const systemLabel = systemIdToFolderLabel(systemId);
  return {
    datasetRoot: DATASET_ROOT_DIR,
    shotTypeDir: sanitizePathSegment(shotType),
    systemDir: systemLabel,
    fileName: DATASET_EXPORT_FILENAME,
  };
}
