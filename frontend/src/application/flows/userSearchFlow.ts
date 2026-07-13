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
import { resolvePublishedLeafKey } from "../../domain/publishedLeafResolve";
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
 */
export async function runUserSearch(
  ctx: UserSearchFlowContext
): Promise<void> {
  const runtimeHints = resolvePublishedLeafHints(
    (ctx.adminState as Record<string, unknown> | undefined)?.sys as
      | Record<string, unknown>
      | null
      | undefined,
    ctx.slots,
    ctx.activeSlot
  );

  const { shotType, systemId } = resolvePublishedLeafKey({
    mode: "USER",
    shotType:
      runtimeHints.shotType ??
      normalizePublishedShotTypeHint(ctx.userPublishedSearchContext?.shotType),
    systemId:
      runtimeHints.systemId ?? ctx.userPublishedSearchContext?.systemId,
  });

  ctx.clearUserSearchDisplayRuntime();
  ctx.clearSearchSlotDrafts();
  ctx.resetUserSearchTargetSelection();

  const loadResult = await getOrLoadPublishedLeaf(shotType, systemId);

  if (loadResult.kind === "error") {
    alert(`Search 데이터 로드 오류: ${loadResult.message}`);
    return;
  }

  const publishedRecords = loadResult.kind === "ok" ? loadResult.records : [];
  const rawBalls = ctx.ballsState ?? {};
  const currentBalls = normalizeBallsToBall3(rawBalls as Record<string, unknown>);

  console.log("[USER_PUBLISHED_SEARCH]", {
    shotType,
    systemId,
    url: loadResult.url,
    fromCache: loadResult.fromCache,
    recordCount: publishedRecords.length,
    leafHints: runtimeHints,
    persistedContext: ctx.userPublishedSearchContext,
  });

  const recallProfile = "userStrict";

  const spatialResult = runSpatialRecall({
    dataset: publishedRecords,
    query: { balls: currentBalls, targetBall: null },
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
            (spatialResult as { reason?: string }).reason === "empty-dataset"
              ? "empty-dataset"
              : (spatialResult as { reason?: string }).reason ===
                  "over-max-distance"
                ? "over-max-distance"
                : "coarse-empty",
        };

  console.log("[USER_SEARCH_RECALL]", {
    profile: recallProfile,
    spatialResult,
    result,
  });

  if (!result || result.kind === "no-match") {
    const reason =
      result?.kind === "no-match" ? result.reason : "unknown";
    console.log("[USER_SEARCH_RECALL] no-match", reason);
    ctx.showToast("일치하는 포지션이 없습니다.", { variant: "center" });
    return;
  }

  console.log("[USER_SEARCH_RECALL] applyUserSearchRecall", {
    profile: recallProfile,
    positionId: result.record?.positionId,
    distance: result.distance,
  });

  ctx.applyUserSearchRecall(result.record);
  ctx.setUserLastSearchRecord(result.record);
  ctx.setUserPublishedSearchContext({ shotType, systemId });
}
