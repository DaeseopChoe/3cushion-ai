// application/flows/userSearchFlow.ts
// SRCH-003 — USER Published Search Flow
// Batch 3 STEP 3-6
//
// AD-B3-02: Hybrid Object Context (READ / WRITE / ACTION / HELPER 분리).
// React import 금지. Hook 사용 금지. Named Export Only.
//
// Migration Debt:
//   D-006 Closed (STEP 6-4) — recall hydrate formulaHash via App injection
//   D-008: calculateByProfileExpr 직접 호출 — recallHydrateFlow 경유 (Batch 4 해소 예정)
//
// NOTE: postRecallTraceLog / buildRecallTracePayload 는 App.jsx에서 no-op 함수로 정의되어 있어
//       Flow에서는 해당 호출을 생략한다. 런타임 동작에 영향 없음.

import { normalizeBallsToBall3 } from "../../admin/slotAutoRecommend";
import { runSpatialRecall } from "../../domain/recall/recallEngine";
import { type PositionRecord } from "../../domain/positionSearchEngine";
import { getOrLoadPublishedLeaf } from "../../domain/publishedDatasetStore";
import {
  resolveCandidatePublishedLeaves,
  resolvePublishedLeafKey,
} from "../../domain/publishedLeafResolve";
import {
  normalizePublishedShotTypeHint,
  resolvePublishedLeafHints,
} from "./recallHydrateFlow";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AdminState = Record<string, unknown>;

type UserPublishedSearchContext = {
  shotType?: string | null;
  systemId?: string | null;
} | null | undefined;

export type UserSearchFlowContext = {
  // READ
  ballsState: Record<string, unknown> | null | undefined;
  adminState: AdminState | null | undefined;
  activeSlot: string;
  slots: Record<string, unknown>;
  targetColor: string | null;
  userPublishedSearchContext: UserPublishedSearchContext;

  // WRITE
  setUserLastSearchRecord: (record: PositionRecord | null) => void;
  setUserPublishedSearchContext: (ctx: {
    shotType: string;
    systemId: string;
  }) => void;

  // ACTION
  applyUserSearchRecall: (record: PositionRecord) => void;
  clearSearchSlotDrafts: () => void;

  // HELPER
  clearUserSearchDisplayRuntime: () => void;
  resetUserSearchTargetSelection: () => void;
  showToast: (message: string, options?: { variant?: string }) => void;
};

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

/**
 * USER Published Search Flow (SRCH-003).
 * Published corpus 검색 → Recall 적용 → userLastSearchRecord 저장.
 * appMode guard 및 in-flight guard는 App.jsx 호출 전에 수행.
 * @returns matched PositionRecord on success; null on no-match / load error
 */
export async function runUserSearch(
  ctx: UserSearchFlowContext
): Promise<PositionRecord | null> {
  const runtimeHints = resolvePublishedLeafHints(
    (ctx.adminState as Record<string, unknown> | undefined)?.sys as
      | Record<string, unknown>
      | null
      | undefined,
    ctx.slots,
    ctx.activeSlot
  );

  const rawShotType =
    runtimeHints.shotType ??
    normalizePublishedShotTypeHint(ctx.userPublishedSearchContext?.shotType);
  const rawSystemId =
    runtimeHints.systemId ?? ctx.userPublishedSearchContext?.systemId;

  const candidateLeaves = resolveCandidatePublishedLeaves({
    mode: "USER",
    shotType: rawShotType,
    systemId: rawSystemId,
  });

  ctx.clearUserSearchDisplayRuntime();
  ctx.clearSearchSlotDrafts();
  ctx.resetUserSearchTargetSelection();

  const rawBalls = ctx.ballsState ?? {};
  const currentBalls = normalizeBallsToBall3(rawBalls as Record<string, unknown>);
  const recallProfile = "userStrict";

  let bestMatchRecord: PositionRecord | null = null;
  let bestMatchDistance = Infinity;
  let bestMatchLeaf: { shotType: string; systemId: string } | null = null;
  let hasLoadedRecords = false;

  for (const leaf of candidateLeaves) {
    const loadResult = await getOrLoadPublishedLeaf(leaf.shotType, leaf.systemId);
    if (loadResult.kind === "error") {
      if (candidateLeaves.length === 1) {
        alert(`Search 데이터 로드 오류: ${loadResult.message}`);
        return null;
      }
      continue;
    }

    const publishedRecords = loadResult.kind === "ok" ? loadResult.records : [];
    if (publishedRecords.length > 0) {
      hasLoadedRecords = true;
    }

    console.log("[USER_PUBLISHED_SEARCH]", {
      shotType: leaf.shotType,
      systemId: leaf.systemId,
      url: loadResult.url,
      fromCache: loadResult.fromCache,
      recordCount: publishedRecords.length,
      leafHints: runtimeHints,
      persistedContext: ctx.userPublishedSearchContext,
    });

    const spatialResult = runSpatialRecall({
      dataset: publishedRecords,
      query: { balls: currentBalls, targetBall: null },
      profile: recallProfile,
    });

    if (spatialResult.kind === "match") {
      if (spatialResult.distance < bestMatchDistance) {
        bestMatchDistance = spatialResult.distance;
        bestMatchRecord = spatialResult.record;
        bestMatchLeaf = leaf;
        if (spatialResult.distance === 0) {
          break;
        }
      }
    }
  }

  if (!bestMatchRecord || !bestMatchLeaf) {
    const reason = hasLoadedRecords ? "over-max-distance" : "empty-dataset";
    console.log("[USER_SEARCH_RECALL] no-match", reason);
    ctx.showToast("일치하는 포지션이 없습니다.", { variant: "center" });
    return null;
  }

  console.log("[USER_SEARCH_RECALL] applyUserSearchRecall", {
    profile: recallProfile,
    positionId: bestMatchRecord.positionId,
    distance: bestMatchDistance,
    leaf: bestMatchLeaf,
  });

  ctx.applyUserSearchRecall(bestMatchRecord);
  ctx.setUserLastSearchRecord(bestMatchRecord);
  ctx.setUserPublishedSearchContext(bestMatchLeaf);
  return bestMatchRecord;
}
