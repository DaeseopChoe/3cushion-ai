// application/flows/adminSearchFlow.ts
// SRCH-002 — ADMIN Published Search Flow
// Batch 3 STEP 3-6
//
// AD-B3-02: Hybrid Object Context (READ / WRITE / ACTION / HELPER 분리).
// React import 금지. Hook 사용 금지. Named Export Only.
//
// Migration Debt:
//   D-006 Closed (STEP 6-4) — formulaHash via App resolveFormulaHash
//   D-008: calculateByProfileExpr 직접 호출 — recallHydrateFlow 경유 (Batch 4 해소 예정)

import { normalizeBallsToBall3 } from "../../admin/slotAutoRecommend";
import { runSpatialRecall } from "../../domain/recall/recallEngine";
import { type PositionRecord } from "../../domain/positionSearchEngine";
import { getOrLoadPublishedLeaf } from "../../domain/publishedDatasetStore";
import { resolvePublishedLeafKey } from "../../domain/publishedLeafResolve";
import {
  normalizePublishedShotTypeHint,
  adminSysFromRecallEntry,
} from "./recallHydrateFlow";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type AdminState = Record<string, unknown>;

type UserPublishedSearchContext = {
  shotType?: string | null;
  systemId?: string | null;
} | null | undefined;

export type AdminSearchFlowContext = {
  // READ
  ballsState: Record<string, unknown> | null | undefined;
  adminState: AdminState | null | undefined;
  activeSlot: string;
  slots: Record<string, unknown>;
  isTargetSelected: boolean;
  targetColor: string | null;
  userPublishedSearchContext: UserPublishedSearchContext;

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
  rejectAdminRecallHydrateForMismatch: (
    record: PositionRecord,
    queryTargetBall: string | null
  ) => boolean;
  /** App injection — Contract formulaExpr / packageVersion → formulaHash (D-006). */
  resolveFormulaHash: (systemId: string) => string;
};

// ---------------------------------------------------------------------------
// module-private constants
// ---------------------------------------------------------------------------

const HARD_THRESHOLD_L1 = 14;

// ---------------------------------------------------------------------------
// Flow
// ---------------------------------------------------------------------------

/**
 * ADMIN Published Search Flow (SRCH-002).
 * Published corpus 검색 → Recall 적용 → AdminState hydrate → 표시.
 * appMode guard는 App.jsx 호출 전에 수행.
 */
export async function runAdminSearch(
  ctx: AdminSearchFlowContext
): Promise<void> {
  ctx.clearAdminSearchDisplayRuntime();

  console.log(
    "[RECALL_READ]",
    (ctx.adminState as Record<string, unknown> | undefined)?.sys,
  );

  const { shotType, systemId } = resolvePublishedLeafKey({
    mode: "ADMIN",
    shotType: normalizePublishedShotTypeHint(
      ctx.userPublishedSearchContext?.shotType
    ),
    systemId: ctx.userPublishedSearchContext?.systemId,
  });

  const loadResult = await getOrLoadPublishedLeaf(shotType, systemId);

  if (loadResult.kind === "error") {
    alert(`Search 데이터 로드 오류: ${loadResult.message}`);
    return;
  }

  const publishedRecords = loadResult.kind === "ok" ? loadResult.records : [];
  const currentBalls = normalizeBallsToBall3(
    (ctx.ballsState ??
      (ctx.adminState as Record<string, unknown> | undefined)?.balls ??
      {}) as Record<string, unknown>
  );
  const searchQueryTargetBall = ctx.getAdminRecallQueryTargetBall();
  const recallProfile = "adminStrict";

  console.log("[ADMIN_PUBLISHED_RECALL]", {
    shotType,
    systemId,
    dataSource: "published",
    url: loadResult.url,
    fromCache: loadResult.fromCache,
    recordCount: publishedRecords.length,
    leafSource: "userPublishedSearchContext_or_default",
    persistedContext: ctx.userPublishedSearchContext,
  });

  console.log("[RECALL_QUERY_DEBUG]", {
    publishedRecordsLength: publishedRecords?.length,
    currentBalls,
    searchQueryTargetBall,
    adminShotType: (ctx.adminState as Record<string, unknown> | undefined)?.sys,
    activeSlot: ctx.activeSlot,
  });

  const spatialResult = runSpatialRecall({
    dataset: publishedRecords,
    query: { balls: currentBalls, targetBall: searchQueryTargetBall },
    profile: recallProfile,
  });

  console.log("[RECALL_SPATIAL_RESULT]", {
    kind: spatialResult.kind,
    reason:
      spatialResult.kind !== "match"
        ? (spatialResult as { reason?: string }).reason ?? null
        : null,
    recordId:
      spatialResult.kind === "match"
        ? spatialResult.record?.positionId ?? null
        : null,
  });

  if (spatialResult.kind !== "match") {
    alert("해당 데이터 없음");
    ctx.beginAdminInputSession();
    return;
  }

  // Target ball mismatch 1차 확인 → 차단 후 input session 시작
  if (
    ctx.rejectAdminRecallHydrateForMismatch(
      spatialResult.record,
      searchQueryTargetBall
    )
  ) {
    ctx.beginAdminInputSession();
    return;
  }

  if (!ctx.beginAdminInputSession()) return;

  // applyAdminRecallMatch 로직 인라인 (동일 순서 유지)
  // 2차 mismatch 확인 (App.jsx applyAdminRecallMatch 내부 동작 동일 복제)
  if (
    ctx.rejectAdminRecallHydrateForMismatch(
      spatialResult.record,
      searchQueryTargetBall
    )
  ) {
    return;
  }

  ctx.applyPositionRecall(spatialResult.record);

  if (searchQueryTargetBall) {
    ctx.patchSlotRuntimeMeta(ctx.activeSlot, {
      targetBall: searchQueryTargetBall,
    });
  }

  const recallEntry = (
    spatialResult.record?.strategies as
      | Record<string, unknown>
      | undefined
  )?.[ctx.activeSlot];

  if (recallEntry) {
    ctx.setAdminState((prev) => {
      const entry = recallEntry as Parameters<typeof adminSysFromRecallEntry>[0];
      const sid =
        entry?.signature?.systemId ??
        ((prev as Record<string, unknown>)?.sys as Record<string, unknown> | undefined)
          ?.systemId ??
        ((ctx.adminState?.sys as Record<string, unknown> | undefined)?.systemId as
          | string
          | undefined) ??
        "5_half_system";
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

  if (spatialResult.distance > HARD_THRESHOLD_L1) {
    alert("유사도 낮음");
  }

  ctx.setAdminTableLayersVisible(true);
  ctx.setShowCoaching(true);
}
