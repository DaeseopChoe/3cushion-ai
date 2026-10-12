/**
 * History snapshot → Publish client item.
 *
 * Input priority:
 *   1. publishFamilyGraph (approved normalized graph; new snapshots)
 *   2. publishFamilyPayload (legacy flat SAVE-time payload; read-only compat)
 * Never reads the current LocalDB: Publish sends what History recorded.
 */

import type { WorkspaceSnapshot } from "./workspaceHistory";
import { readPublishOperationFromSnapshot } from "./publishOperation";
import {
  crossValidateOperationAndPayload,
  readPublishFamilyPayloadFromSnapshot,
} from "./publishFamilyPayload";
import {
  crossValidateOperationAndGraph,
  readPublishFamilyGraphFromSnapshot,
} from "./publishFamilyGraph";
import type { LocalPublishClientItem } from "./repoPublish/publishDatasetToLocalRepo";

export type HistoryPublishInputResult =
  | { ok: true; item: LocalPublishClientItem }
  | { ok: false; reason: string; issues?: string[] };

export function buildPublishClientItemFromSnapshot(
  snap: WorkspaceSnapshot
): HistoryPublishInputResult {
  const op = readPublishOperationFromSnapshot(snap);
  if (!op) return { ok: false, reason: "legacy-snapshot-repo-publish-blocked" };

  if (snap.derivedApproval?.status === "PENDING") {
    return { ok: false, reason: "derived-approval-pending" };
  }

  const base = {
    snapshotId: snap.id,
    shotType: snap.pattern ?? "뒤돌리기",
    systemId: snap.systemId ?? "5_half_system",
    publishOperation: op,
  };

  const graphRead = readPublishFamilyGraphFromSnapshot(snap);
  if (!graphRead.ok) {
    return { ok: false, reason: graphRead.reason, issues: graphRead.issues };
  }
  if (graphRead.graph) {
    const cross = crossValidateOperationAndGraph(op, graphRead.graph);
    if (!cross.ok) return { ok: false, reason: cross.reason, issues: cross.issues };
    return { ok: true, item: { ...base, publishFamilyGraph: graphRead.graph } };
  }

  const payloadRead = readPublishFamilyPayloadFromSnapshot(snap);
  if (!payloadRead.ok) {
    return { ok: false, reason: payloadRead.reason ?? "payload-invalid", issues: payloadRead.issues };
  }
  if (!payloadRead.payload || ("absent" in payloadRead && payloadRead.absent)) {
    return { ok: false, reason: "c2-payload-required" };
  }
  const cross = crossValidateOperationAndPayload(op, payloadRead.payload);
  if (!cross.ok) return { ok: false, reason: cross.reason, issues: cross.issues };
  return { ok: true, item: { ...base, publishFamilyPayload: payloadRead.payload } };
}
