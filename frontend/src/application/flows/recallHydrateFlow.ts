// application/flows/recallHydrateFlow.ts
// CAL-004 — Recall Hydrate 순수 함수 추출
// Batch 3 STEP 3-3 · Batch 4 STEP 4-3 (CAL-003 Domain 위임)
//
// AD-B3-03: Object Context 없음. 모든 함수는 명시적 파라미터 → Return 형태.
// React state / dispatch / ref / hook / Context 사용 금지.
//
// Batch 6 STEP 6-4: formulaHash injected by App (Registry → Contract). No SYSTEM_PROFILES.

import { buildSlotSysSnapshot } from "../../domain/calculator/systemValueCalculator";
import {
  buildSlotRuntimePayload,
  extractSlotRuntimeMeta,
  type SlotRuntimeDraftSlice,
} from "../../domain/slotRuntimeHydrate";
import { mergeCorrectionsForRecallHydrate } from "../../domain/canonicalStrategy";
import type { StrategyEntry } from "../../domain/positionSearchEngine";

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
 * formulaHash: App injection hub — Contract formulaExpr / packageVersion (D-006 Closed).
 */
export function adminSysFromRecallEntry(
  entry: StrategyEntry | null | undefined,
  prevSys: Record<string, unknown> | null | undefined,
  formulaHashSource?: string | null
): Record<string, unknown> | null {
  const snap = buildSlotSysSnapshot(entry);
  if (!snap) return null;
  const sid = snap.systemId;
  const formulaHash = (formulaHashSource ?? "v1").slice(0, 32);
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
