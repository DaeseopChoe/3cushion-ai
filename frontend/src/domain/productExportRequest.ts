/**
 * Product Export Request — WorkspaceSnapshot → Product Host payload.
 *
 * Official Names: Product Host · Export Pipeline (GLOSSARY).
 * Does not run Generator in the browser; writes request JSON for Product Host.
 * GeometryConsumePort is supplied by Product Host (Python) — not reimplemented here.
 */

import type { WorkspaceSnapshot } from "./workspaceHistory";
import { normalizeDatasetFromStorage } from "./positionMergeEngine";
import type { PositionRecord } from "./positionSearchEngine";
import { listStrategiesInRecord } from "./positionSearchEngine";

export const PRODUCT_EXPORT_ROOT_DIR = "product_export";
export const PRODUCT_EXPORT_REQUEST_FILENAME = "export_request.json";
export const PRODUCT_EXPORT_HANDOFF_FILENAME = "export_handoff.json";

export type ProductExportStrategyRow = {
  strategyRef: string;
  positionId: string;
  slot: string;
  cue: { x: number; y: number };
  target: { x: number; y: number };
  second: { x: number; y: number };
};

export type ProductExportRequestPayload = {
  sourceSnapshotIds: string[];
  exportedAt: string;
  generatorBuildIdentity: string;
  strategies: ProductExportStrategyRow[];
};

function pointOf(p: { x: number; y: number } | undefined | null) {
  if (!p || typeof p.x !== "number" || typeof p.y !== "number") return null;
  return { x: p.x, y: p.y };
}

/** Build Product Export request from one WorkspaceSnapshot (Authoring Adapter input). */
export function buildProductExportRequestFromSnapshot(
  snapshot: WorkspaceSnapshot,
  exportedAt: string = new Date().toISOString()
): ProductExportRequestPayload {
  const rawRows = snapshot.state?.dataset ?? [];
  const records = normalizeDatasetFromStorage(rawRows) as PositionRecord[];
  const strategies: ProductExportStrategyRow[] = [];

  for (const rec of records) {
    const cue = pointOf(rec.balls?.cue);
    const target = pointOf(rec.balls?.target);
    const second = pointOf(rec.balls?.second);
    if (!cue || !target || !second) continue;

    for (const entry of listStrategiesInRecord(rec)) {
      strategies.push({
        strategyRef: `${rec.positionId}.${entry.slot}`,
        positionId: rec.positionId,
        slot: entry.slot,
        cue,
        target,
        second,
      });
    }
  }

  return {
    sourceSnapshotIds: [snapshot.id],
    exportedAt,
    generatorBuildIdentity: "product-export-pipeline-v1",
    strategies,
  };
}

/** Merge multiple snapshot requests (same Export batch). */
export function mergeProductExportRequests(
  parts: ProductExportRequestPayload[]
): ProductExportRequestPayload {
  const ids: string[] = [];
  const strategies: ProductExportStrategyRow[] = [];
  let exportedAt = new Date().toISOString();
  for (const part of parts) {
    for (const id of part.sourceSnapshotIds) {
      if (!ids.includes(id)) ids.push(id);
    }
    strategies.push(...part.strategies);
    exportedAt = part.exportedAt || exportedAt;
  }
  return {
    sourceSnapshotIds: ids,
    exportedAt,
    generatorBuildIdentity: "product-export-pipeline-v1",
    strategies,
  };
}
