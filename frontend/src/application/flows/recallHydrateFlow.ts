// application/flows/recallHydrateFlow.ts
// CAL-004 — Recall Hydrate 순수 함수 추출
// Batch 3 STEP 3-3
//
// AD-B3-03: Object Context 없음. 모든 함수는 명시적 파라미터 → Return 형태.
// React state / dispatch / ref / hook / Context 사용 금지.
//
// Migration Debt:
//   D-006: SYSTEM_PROFILES 직접 접근 — Batch 6에서 해소 예정
//   D-008: calculateByProfileExpr 직접 호출 — Batch 4 (CAL-005 통합) 시 해소 예정

// D-006: SYSTEM_PROFILES 직접 접근 (Migration Debt Open)
import { SYSTEM_PROFILES } from "../../data/systems";
// D-008: calculateByProfileExpr 직접 호출 (Migration Debt Open)
import { calculateByProfileExpr } from "../../utils/systemCalculator";
import {
  buildSlotRuntimePayload,
  extractSlotRuntimeMeta,
  type SlotRuntimeDraftSlice,
} from "../../domain/slotRuntimeHydrate";
import { mergeCorrectionsForRecallHydrate } from "../../domain/canonicalStrategy";
import type { StrategyEntry } from "../../domain/positionSearchEngine";

// ---------------------------------------------------------------------------
// module-private
// ---------------------------------------------------------------------------

/**
 * Position Recall 직후 SYS 모달 폼용: 한 StrategyEntry에서 슬롯 draft.sys와 동일한
 * 수치 파이프라인 스냅샷. (module-private)
 * D-008: calculateByProfileExpr 직접 호출 (Migration Debt Open)
 */
function buildSlotSysSnapshotFromEntry(entry: StrategyEntry | null | undefined) {
  if (!entry) return null;
  const systemId =
    entry.signature.systemId === "5_HALF"
      ? "5_half_system"
      : (entry.signature.systemId ?? "5_half_system");
  const inputs = entry.sysInputs ?? {};
  // D-006: SYSTEM_PROFILES 직접 접근 (Migration Debt Open)
  const profile = SYSTEM_PROFILES[systemId];
  const expr: string | undefined = profile?.formula?.expr;
  const baseThreeC =
    typeof inputs.baseThreeC === "number"
      ? inputs.baseThreeC
      : typeof inputs.C3 === "number"
        ? inputs.C3
        : typeof inputs.C3_r === "number"
          ? inputs.C3_r
          : 0;
  const baseOneC =
    typeof inputs.baseOneC === "number"
      ? inputs.baseOneC
      : typeof inputs.CO === "number"
        ? inputs.CO
        : typeof inputs.CO_f === "number"
          ? inputs.CO_f
          : 0;
  const exprInputs = {
    ...inputs,
    baseThreeC,
    baseOneC,
    CO_f: typeof inputs.CO_f === "number" ? inputs.CO_f : baseOneC,
    C3_r: typeof inputs.C3_r === "number" ? inputs.C3_r : baseThreeC,
  };
  let calcResult: Record<string, unknown> = {};
  if (expr) {
    calcResult = calculateByProfileExpr(expr, exprInputs) as Record<string, unknown>;
  }
  return {
    systemId,
    track: entry.track ?? "B2T_L",
    inputs,
    outputs: { result: calcResult },
  };
}

// ---------------------------------------------------------------------------
// exports
// ---------------------------------------------------------------------------

/** SYS 오버레이 shotType 결정: signature 값 우선, 없으면 이전 값, 기본 "뒤돌리기". */
export function shotTypeForSysOverlay(
  sigShotType: string | null | undefined,
  prevShotType: string | null | undefined
): string {
  if (sigShotType && sigShotType !== "default" && sigShotType !== "_") {
    return sigShotType;
  }
  return prevShotType || "뒤돌리기";
}

/** Published leaf shotType hint — empty/default/_ → null (no silent 뒤돌리기). */
export function normalizePublishedShotTypeHint(raw: unknown): string | null {
  const trimmed = String(raw ?? "").trim();
  if (!trimmed || trimmed === "default" || trimmed === "_") return null;
  return trimmed;
}

/** 현재 슬롯 런타임 상태에서 Published leaf의 shotType / systemId 힌트를 추출. */
export function resolvePublishedLeafHints(
  adminSys: Record<string, unknown> | null | undefined,
  slots: Record<string, unknown> | null | undefined,
  activeSlot: string | null | undefined
): { shotType: string | null; systemId: string | null } {
  const slot = slots?.[activeSlot as string] as SlotRuntimeDraftSlice | null | undefined;
  const slotMeta = extractSlotRuntimeMeta(slot);
  const slotPayload = buildSlotRuntimePayload(slot);
  const shotType =
    normalizePublishedShotTypeHint(adminSys?.shotType) ??
    normalizePublishedShotTypeHint(slotMeta.shotType) ??
    normalizePublishedShotTypeHint(slotPayload.adminSys?.shotType) ??
    null;
  const systemId: string | null =
    (adminSys?.systemId as string | undefined) ??
    (adminSys?.system_id as string | undefined) ??
    slotPayload.adminSys?.systemId ??
    slotPayload.adminSys?.system_id ??
    null;
  return { shotType, systemId };
}

/**
 * Recall 성공 직후 adminState.sys 1회 채움 (SYS 모달 표시/편집용).
 * trajectory SSOT는 슬롯 draft 유지.
 * D-006: SYSTEM_PROFILES 직접 접근 (Migration Debt Open)
 */
export function adminSysFromRecallEntry(
  entry: StrategyEntry | null | undefined,
  prevSys: Record<string, unknown> | null | undefined
): Record<string, unknown> | null {
  const snap = buildSlotSysSnapshotFromEntry(entry);
  if (!snap) return null;
  const sid = snap.systemId;
  // D-006: SYSTEM_PROFILES 직접 접근 (Migration Debt Open)
  const profile = SYSTEM_PROFILES[sid];
  const formulaHash = (
    (profile?.formula?.expr as string | undefined) ??
    (profile?.meta?.version as string | undefined) ??
    "v1"
  ).slice(0, 32);
  const mergedInputs = {
    ...(snap.inputs ?? {}),
    ...(snap.outputs?.result ?? {}),
  };
  const corr = mergeCorrectionsForRecallHydrate(
    entry,
    prevSys as { corrections?: unknown } | null
  );
  const result = {
    system_id: sid,
    system: sid,
    systemId: sid,
    track: snap.track ?? "B2T_L",
    shotType: shotTypeForSysOverlay(
      entry?.signature?.shotType,
      prevSys?.shotType as string | undefined
    ),
    inputs: mergedInputs,
    outputs: snap.outputs,
    formulaHash,
    corrections: {
      slide: Number(corr?.slide) || 0,
      curve_ratio: Number(corr?.curve_ratio) || 0,
      draw: Number(corr?.draw) || 0,
      departure: Number(corr?.departure) || 0,
      spin: Number(corr?.spin) || 0,
    },
    ...(prevSys?.spaceSel ? { spaceSel: prevSys.spaceSel } : {}),
  };
  console.log("[ADMIN_SYS_FROM_RECALL]", result);
  return result;
}
