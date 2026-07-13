// application/flows/adminLocalDbFlow.ts
// SRCH-001 — ADMIN LocalDB Recall Flow
// Batch 3 STEP 3-5
//
// AD-B3-02: Hybrid Object Context (READ / WRITE / ACTION / HELPER 분리).
// React import 금지. Hook 사용 금지. Named Export Only.
//
// Batch 6 STEP 6-4: formulaHash via App-injected HELPER (D-006 Closed).

import { normalizeBallsToBall3 } from "../../admin/slotAutoRecommend";
import { runSpatialRecall } from "../../domain/recall/recallEngine";
import { makeSignatureKey } from "../../domain/search/signatureKey";
import {
  listStrategiesInRecord,
  type PositionRecord,
} from "../../domain/positionSearchEngine";
import { normalizeTargetBallForKey } from "../../domain/positionMergeEngine";
import { adminSysFromRecallEntry } from "./recallHydrateFlow";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AdminState = Record<string, unknown>;

export type AdminLocalDbFlowContext = {
  // READ
  dataset: PositionRecord[] | null | undefined;
  ballsState: Record<string, unknown> | null | undefined;
  adminState: AdminState | null | undefined;
  activeSlot: string;
  slots: Record<string, unknown>;
  isTargetSelected: boolean;
  targetColor: string | null;

  // WRITE
  setAdminState: (updater: (prev: AdminState) => AdminState) => void;
  setIsAdminPublishedSearchMatched: (value: boolean) => void;
  setAdminTableLayersVisible: (value: boolean) => void;
  setShowCoaching: (value: boolean) => void;

  // ACTION
  applyPositionRecall: (record: PositionRecord) => void;
  patchSlotRuntimeMeta: (
    slotId: string,
    meta: { targetBall: string | null }
  ) => void;

  // HELPER
  clearAdminSearchDisplayRuntime: () => void;
  beginAdminInputSession: () => boolean;
  getAdminRecallQueryTargetBall: () => string | null;
  /** App injection — Contract formulaExpr / packageVersion → formulaHash (D-006). */
  resolveFormulaHash: (systemId: string) => string;
};

// ---------------------------------------------------------------------------
// module-private helpers
// ---------------------------------------------------------------------------

const HARD_THRESHOLD_L1 = 14;

function isAdminRecallTargetBallMismatch(
  record: PositionRecord,
  queryTargetBall: string | null
): boolean {
  if (queryTargetBall !== "red" && queryTargetBall !== "yellow") return false;
  return (
    normalizeTargetBallForKey(record?.targetBall) !==
    normalizeTargetBallForKey(queryTargetBall)
  );
}

function rejectAdminRecallHydrateForMismatch(
  record: PositionRecord,
  queryTargetBall: string | null,
  ctx: Pick<
    AdminLocalDbFlowContext,
    "setAdminTableLayersVisible" | "setShowCoaching" | "setIsAdminPublishedSearchMatched"
  >
): boolean {
  if (!isAdminRecallTargetBallMismatch(record, queryTargetBall)) return false;
  ctx.setAdminTableLayersVisible(false);
  ctx.setShowCoaching(false);
  ctx.setIsAdminPublishedSearchMatched(false);
  alert("해당 데이터 없음");
  return true;
}

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

/**
 * ADMIN strict recall — Working Dataset 검색 → Recall 적용 → AdminState 갱신.
 * match 여부를 Promise<boolean>으로 반환.
 */
export async function runAdminLocalDbRecall(
  ctx: AdminLocalDbFlowContext
): Promise<boolean> {
  // 이전 recall display 초기화
  ctx.clearAdminSearchDisplayRuntime();

  // Build query
  const currentBalls = normalizeBallsToBall3(
    (ctx.ballsState ?? ctx.adminState?.balls ?? {}) as Record<string, unknown>
  );
  const sys = ctx.adminState?.sys as Record<string, unknown> | null | undefined;
  const systemId =
    (sys?.systemId as string | undefined) ??
    (sys?.system_id as string | undefined) ??
    "5_half_system";

  const formulaHash = ctx.resolveFormulaHash(systemId);

  const signatureKey = makeSignatureKey({
    systemId,
    formulaHash,
    shotType: "_",
  });

  const ds = ctx.dataset ?? [];
  const datasetSigKeys = new Set<string>();
  for (const r of ds) {
    for (const e of listStrategiesInRecord(r)) {
      datasetSigKeys.add(makeSignatureKey(e.signature));
    }
  }

  const recallProfile = "adminSearch";
  console.log("[RECALL_QUERY]", {
    hypothesisId: "H_RECALL_QUERY",
    recallProfile,
    signatureKey,
    systemId,
    formulaHash,
    uiShotType: (sys?.shotType as string | undefined) ?? null,
    datasetLength: ds.length,
    uniqueSignatureKeysInDataset: [...datasetSigKeys].slice(0, 40),
    uniqueKeyCount: datasetSigKeys.size,
  });
  console.log("[RECALL_DATASET_SIGNATURES]", {
    datasetLength: ds.length,
    signatures: [...datasetSigKeys],
  });

  // Spatial recall
  const searchQueryTargetBall = ctx.getAdminRecallQueryTargetBall();
  const spatialResult = runSpatialRecall({
    dataset: ds,
    query: { balls: currentBalls, targetBall: searchQueryTargetBall },
    profile: recallProfile,
  });

  const result =
    spatialResult.kind === "match"
      ? {
          kind: "match" as const,
          record: spatialResult.record,
          distance: spatialResult.distance,
        }
      : {
          kind: "no-match" as const,
          reason:
            spatialResult.reason === "empty-dataset"
              ? "empty-dataset"
              : spatialResult.reason === "over-max-distance"
                ? "over-max-distance"
                : "coarse-empty",
        };

  console.log("[RECALL_RESULT]", { profile: recallProfile, result, spatialResult });

  // No match
  if (!result || result.kind === "no-match") {
    alert("해당 데이터 없음");
    return false;
  }

  // Target ball mismatch
  if (rejectAdminRecallHydrateForMismatch(result.record, searchQueryTargetBall, ctx)) {
    return false;
  }

  console.log("[RECALL_APPLY]", {
    positionId: result.record?.positionId,
    kind: result.kind,
  });

  // Apply recall
  ctx.applyPositionRecall(result.record);
  if (searchQueryTargetBall) {
    ctx.patchSlotRuntimeMeta(ctx.activeSlot, {
      targetBall: searchQueryTargetBall,
    });
  }

  // Hydrate adminState.sys
  const recallEntry = (result.record?.strategies as Record<string, unknown> | undefined)?.[ctx.activeSlot];
  if (recallEntry) {
    ctx.setAdminState((prev) => {
      const entry = recallEntry as Parameters<typeof adminSysFromRecallEntry>[0];
      const sid =
        entry?.signature?.systemId ??
        ((prev as Record<string, unknown>)?.sys as Record<string, unknown> | undefined)
          ?.systemId ??
        systemId;
      const nextSys = adminSysFromRecallEntry(
        entry,
        (prev as Record<string, unknown>)?.sys as Record<string, unknown>,
        ctx.resolveFormulaHash(String(sid))
      );
      if (!nextSys) return prev;
      return { ...prev, sys: nextSys };
    });
  }
  ctx.setIsAdminPublishedSearchMatched(true);

  if (result.distance > HARD_THRESHOLD_L1) {
    alert("유사도 낮음");
  }

  // HELPER: begin admin input session
  if (!ctx.beginAdminInputSession()) {
    // session 시작 실패 — recall은 match이지만 layer 표시 생략
    return true;
  }

  // Post-match display
  ctx.setAdminTableLayersVisible(true);
  ctx.setShowCoaching(true);

  return true;
}
