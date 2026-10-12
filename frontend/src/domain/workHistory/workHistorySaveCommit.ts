/**
 * SAVE / OVERWRITE → one D History snapshot.
 *
 * New 4-track Family (PENDING_DERIVED_APPROVAL) → PENDING snapshot holding the
 * base Family graph; approval later turns the same snapshot APPROVED.
 * OVERWRITE_PRESERVED / IMMEDIATE → APPROVED snapshot right away.
 */

import type { Point, PositionRecord } from "../positionSearchEngine";
import type { PublishOperation } from "../publishOperation";
import { buildPublishFamilyGraphFromRecords, type PublishFamilyGraph } from "../publishFamilyGraph";
import type { WorkHistoryApi, WorkHistoryApiFailure } from "./workHistoryClient";
import type { WorkHistoryIndexEntry } from "./workHistoryModel";

export type WorkHistorySaveMode = "PENDING_DERIVED_APPROVAL" | "OVERWRITE_PRESERVED" | "IMMEDIATE";

export type CommitSaveToWorkHistoryResult =
  | { ok: true; entry: WorkHistoryIndexEntry }
  | (WorkHistoryApiFailure & { issues?: string[] });

function toPathNodes(nodes: ReadonlyArray<Point | null | undefined> | null | undefined) {
  if (!Array.isArray(nodes)) return [];
  return nodes.map((p) =>
    p && Number.isFinite(p.x) && Number.isFinite(p.y) ? { x: p.x, y: p.y } : null
  );
}

export async function commitSaveToWorkHistory(args: {
  api: WorkHistoryApi;
  updated: PositionRecord[];
  publishOperation: PublishOperation | null;
  mode: WorkHistorySaveMode;
  state: unknown;
  systemId: string;
  pattern: string;
  authoredPathNodes?: ReadonlyArray<Point | null | undefined> | null;
}): Promise<CommitSaveToWorkHistoryResult> {
  const { api, publishOperation: op, mode, systemId, pattern } = args;
  let graph: PublishFamilyGraph | null = null;
  if (op) {
    const built = buildPublishFamilyGraphFromRecords(args.updated, op.destinationFamilyId, {
      shotType: pattern,
      systemId,
    });
    if (!built.ok) {
      return {
        ok: false,
        code: "GRAPH_INVALID",
        message: "저장할 Family 정보를 만들지 못했습니다.",
        issues: built.issues,
      };
    }
    graph = built.graph;
  }

  if (mode === "PENDING_DERIVED_APPROVAL") {
    if (!op || !graph) {
      return { ok: false, code: "GRAPH_INVALID", message: "새 Family 정보가 없어 저장하지 못했습니다." };
    }
    return api.createPending({
      state: args.state,
      publishOperation: op,
      pendingFamilyGraph: graph,
      authoredPathNodes: toPathNodes(args.authoredPathNodes),
      shotType: pattern,
      systemId,
    });
  }

  return api.createApproved({
    mode,
    state: args.state,
    publishOperation: op,
    graph,
    shotType: pattern,
    systemId,
  });
}
