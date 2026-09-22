// application/flows/adminLocalDbFlow.ts
// SRCH-001 — ADMIN LocalDB Recall Flow
//
// Phase C: Local Search READ SSOT = normalized_dataset (FamilyMember search).
// Never falls back to positions_dataset / family_* shadow.

import { normalizeBallsToBall3 } from "../../admin/slotAutoRecommend";
import { runNormalizedLocalMemberSearch } from "../../domain/recall/normalizedLocalMemberSearch";
import { makeSignatureKey } from "../../domain/search/signatureKey";
import type { Ball3, PositionRecord } from "../../domain/positionSearchEngine";
import { readFamilyIdFromRecordSlot } from "../../domain/family/publishedEditSession";
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
  // READ — Phase C: dataset is NOT Local Search authority (kept optional for
  // transitional callers / diagnostics only).
  dataset?: PositionRecord[] | null | undefined;
  ballsState: Record<string, unknown> | null | undefined;
  adminState: AdminState | null | undefined;
  activeSlot: string;
  slots: Record<string, unknown>;
  isTargetSelected: boolean;
  targetColor: string | null;

  // WRITE
  setAdminState: (updater: (prev: AdminState) => AdminState) => void;
  setIsAdminPublishedSearchMatched: (value: boolean) => void;
  /** Clear Published UPDATE ownership (LocalDB is not Published UPDATE). */
  setEditingPublishedFamilyId?: (familyId: string | null) => void;
  /** Set Local UPDATE ownership from trusted Local recall. */
  setEditingLocalFamilyId?: (familyId: string | null) => void;
  setAdminTableLayersVisible: (value: boolean) => void;
  setShowCoaching: (value: boolean) => void;
  /** Load success → editable session (Undo/Recall model; no Reset gate). */
  setIsAdminInputSessionActive: (value: boolean) => void;
  /** Hydrate Target color metadata for Target Ready after Load. */
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
 * ADMIN LocalDB Search — Phase C Member-centric normalized_dataset READ.
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

  const recallProfile = "adminSearch";
  console.log("[RECALL_QUERY]", {
    hypothesisId: "H_RECALL_QUERY",
    recallProfile,
    readSource: "normalized_dataset",
    signatureKey,
    systemId,
    formulaHash,
    uiShotType: (sys?.shotType as string | undefined) ?? null,
  });

  // Spatial recall — Role Ball3 query (Phase 4: target↔target, second↔second)
  const searchQueryTargetBall = ctx.getAdminRecallQueryTargetBall();

  // Target NONE: Physical colors are not logical roles (Yellow != Target, Red != Second).
  // When searchQueryTargetBall is null (Target=NONE), evaluate both candidate role permutations.
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
  let bestSearchResult: ReturnType<typeof runNormalizedLocalMemberSearch> | null =
    null;
  let bestMatchQueryBalls: Ball3 | null = null;

  for (const queryBalls of candidateBallQueries) {
    const searchResult = runNormalizedLocalMemberSearch({
      query: {
        balls: queryBalls,
        targetBall: searchQueryTargetBall as "red" | "yellow" | null | undefined,
      },
      profile: recallProfile,
    });

    if (searchResult.kind === "match") {
      if (searchResult.distance < bestMatchDistance) {
        bestMatchDistance = searchResult.distance;
        bestMatchRecord = searchResult.record;
        bestSearchResult = searchResult;
        bestMatchQueryBalls = queryBalls;
        if (searchResult.distance === 0) {
          break;
        }
      }
    } else if (!bestSearchResult) {
      bestSearchResult = searchResult;
    }
  }

  const result =
    bestMatchRecord && bestSearchResult?.kind === "match"
      ? {
          kind: "match" as const,
          record: bestMatchRecord,
          distance: bestMatchDistance,
          hits: bestSearchResult.hits,
        }
      : {
          kind: "no-match" as const,
          reason:
            bestSearchResult && bestSearchResult.kind === "no-match"
              ? bestSearchResult.reason
              : "coarse-empty",
        };

  console.log("[RECALL_RESULT]", {
    profile: recallProfile,
    readSource: "normalized_dataset",
    result,
    searchResult: bestSearchResult,
    bestMatchQueryBalls,
  });

  // Fail-closed: invalid / missing canonical never falls back to flat.
  if (
    result.kind === "no-match" &&
    (result.reason === "canonical-invalid" ||
      result.reason === "canonical-missing")
  ) {
    alert("로컬 데이터셋이 없거나 유효하지 않습니다");
    return false;
  }

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
    strategySlots: bestSearchResult?.kind === "match"
      ? bestSearchResult.meta.strategySlots
      : [],
    hits: result.hits,
  });

  // Apply recall — assembled PositionRecord preserves S1/S2/S3 at this Position.
  ctx.applyPositionRecall(result.record);
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

  // Hydrate adminState.sys from active Strategy Slot (selected FamilyMaster payload).
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
  // LocalDB recall: LOCAL ownership only (clear Published).
  ctx.setEditingPublishedFamilyId?.(null);
  const localFamilyId =
    readFamilyIdFromRecordSlot(result.record, ctx.activeSlot as "S1" | "S2" | "S3") ??
    result.hits.find((h) => h.sourceSlot === ctx.activeSlot)?.familyId ??
    null;
  ctx.setEditingLocalFamilyId?.(localFamilyId);

  if (result.distance > SOFT_DISTANCE_WARN) {
    alert("유사도 낮음");
  }

  if (!ctx.beginAdminInputSession()) {
    return true;
  }

  ctx.setAdminTableLayersVisible(true);
  ctx.setShowCoaching(true);

  return true;
}
