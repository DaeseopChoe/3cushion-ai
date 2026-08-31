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
import { ADMIN_SEARCH_SOFT_DISTANCE_WARN } from "../../domain/recall/recallProfiles";
import {
  resolveAdminRecallTargetMeta,
  type AdminTargetBall,
} from "../../domain/system/adminEditSessionContract";
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
  /** View-only after match — Reset re-opens editable session (History parity). */
  setIsAdminInputSessionActive: (value: boolean) => void;
  /** Hydrate Target color metadata for Ready after Reset unlock. */
  hydrateAdminRecallTarget: (targetBall: AdminTargetBall | null) => void;
  setBallsState?: (balls: Record<string, { x: number; y: number } | undefined> | ((prev: any) => any)) => void;

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

const SOFT_DISTANCE_WARN = ADMIN_SEARCH_SOFT_DISTANCE_WARN;

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

  // Spatial recall — Role Ball3 query (Phase 4: target↔target, second↔second)
  const searchQueryTargetBall = ctx.getAdminRecallQueryTargetBall();

  // Target NONE: Physical colors are not logical roles (Yellow != Target, Red != Second).
  // When searchQueryTargetBall is null (Target=NONE), evaluate both candidate role permutations:
  // 1) Target = Object Ball A (currentBalls.target), Second = Object Ball B (currentBalls.second)
  // 2) Target = Object Ball B (currentBalls.second), Second = Object Ball A (currentBalls.target)
  // When searchQueryTargetBall != null (explicit target chosen by user), evaluate only the single permutation.
  const candidateBallQueries: Ball3[] =
    searchQueryTargetBall != null
      ? [currentBalls]
      : [
          currentBalls,
          {
            cue: currentBalls.cue,
            target: currentBalls.second,
            second: currentBalls.target,
          },
        ];

  let bestMatchRecord: PositionRecord | null = null;
  let bestMatchDistance = Infinity;
  let bestSpatialResult: ReturnType<typeof runSpatialRecall> | null = null;
  let bestMatchQueryBalls: Ball3 | null = null;

  for (const queryBalls of candidateBallQueries) {
    const spatialResult = runSpatialRecall({
      dataset: ds,
      query: { balls: queryBalls, targetBall: searchQueryTargetBall },
      profile: recallProfile,
    });

    if (spatialResult.kind === "match") {
      if (spatialResult.distance < bestMatchDistance) {
        bestMatchDistance = spatialResult.distance;
        bestMatchRecord = spatialResult.record;
        bestSpatialResult = spatialResult;
        bestMatchQueryBalls = queryBalls;
        if (spatialResult.distance === 0) {
          break;
        }
      }
    } else if (!bestSpatialResult) {
      bestSpatialResult = spatialResult;
    }
  }

  const result =
    bestMatchRecord && bestSpatialResult?.kind === "match"
      ? {
          kind: "match" as const,
          record: bestMatchRecord,
          distance: bestMatchDistance,
        }
      : {
          kind: "no-match" as const,
          reason:
            bestSpatialResult && bestSpatialResult.kind === "no-match"
              ? bestSpatialResult.reason
              : "coarse-empty",
        };

  console.log("[RECALL_RESULT]", {
    profile: recallProfile,
    result,
    spatialResult: bestSpatialResult,
    bestMatchQueryBalls,
  });

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
  // Target color metadata: query lock preferred, else record (Ready after Reset unlock).
  const targetMeta = resolveAdminRecallTargetMeta({
    searchQueryTargetBall,
    recordTargetBall: result.record?.targetBall,
  });
  if (targetMeta) {
    ctx.patchSlotRuntimeMeta(ctx.activeSlot, { targetBall: targetMeta });
  }
  ctx.hydrateAdminRecallTarget(targetMeta);

  if (bestMatchQueryBalls) {
    ctx.setBallsState?.(bestMatchQueryBalls);
    ctx.setAdminState((prev) => ({
      ...prev,
      balls: JSON.parse(JSON.stringify(bestMatchQueryBalls)),
    }));
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

  if (result.distance > SOFT_DISTANCE_WARN) {
    alert("유사도 낮음");
  }

  // Sync table balls into slots, then leave view-only until Reset (History parity).
  if (!ctx.beginAdminInputSession()) {
    // session 시작 실패 — recall은 match이지만 layer 표시 생략
    return true;
  }
  ctx.setIsAdminInputSessionActive(false);

  // Post-match display (view-only: SYS/SAVE gated off until Reset)
  ctx.setAdminTableLayersVisible(true);
  ctx.setShowCoaching(true);

  return true;
}
