/**
 * PHASE 2 STEP 2 — Slot runtime full replace (no partial merge, no prev-slot contamination).
 */

import { mergeCorrections, STRATEGY_CORRECTIONS_ZERO } from "./canonicalStrategy";
import type { StrategySysCorrections, TargetBall } from "./positionSearchEngine";
import {
  adminSysFromResolvedSlotSys,
  createEmptyAdminSysSnapshot,
  type AdminSysSnapshot,
  type SlotRuntimeMeta,
} from "./adminSysFromSlot";
import {
  hasRenderableOutputsResult,
  resolveSlotSysForRender,
  type SlotDraftSys,
  type SlotDraftSysSlice,
} from "./slotSysResolve";

export type { SlotRuntimeMeta } from "./adminSysFromSlot";

export type SlotRuntimeDraftSlice = {
  draft?: {
    sys?: SlotDraftSys | null;
    corrections?: StrategySysCorrections;
    shotType?: string | null;
    system_values?: Record<string, number>;
    targetBall?: TargetBall | null;
    hpt?: unknown;
    str?: unknown;
    ai?: unknown;
  } | null;
  applied?: {
    sys?: SlotDraftSys | null;
    corrections?: StrategySysCorrections;
    shotType?: string | null;
    system_values?: Record<string, number>;
    targetBall?: TargetBall | null;
    hpt?: unknown;
    str?: unknown;
    ai?: unknown;
  } | null;
};

export function normalizeSlotTargetBall(
  value: unknown
): TargetBall | null {
  return value === "red" || value === "yellow" ? value : null;
}

/** Per-slot targetBall (draft → applied); no prev-slot fallback. */
export function extractSlotTargetBall(
  slot: SlotRuntimeDraftSlice | null | undefined
): TargetBall | null {
  const draft = slot?.draft;
  const applied = slot?.applied;
  return (
    normalizeSlotTargetBall(draft?.targetBall) ??
    normalizeSlotTargetBall(applied?.targetBall) ??
    null
  );
}

export const DEFAULT_SLOT_HPT = {
  T: "8/8",
  hit_point: { x: 0, y: 0 },
  mode: "TIP",
  tipCount: 0,
};

export const DEFAULT_SLOT_STR = {
  curve: "constant",
  type: null,
  acceleration: "smooth_const",
  speed: 2.5,
  depth: 2,
  impact: "medium",
};

export const DEFAULT_SLOT_AI = { text: "", onePointLessons: [] };

export type SlotRuntimePayload = {
  adminSys: AdminSysSnapshot;
  hpt: typeof DEFAULT_SLOT_HPT;
  str: typeof DEFAULT_SLOT_STR;
  ai: typeof DEFAULT_SLOT_AI;
  trajectoryResult: Record<string, number> | null;
  /** null = empty slot / no selection — do not keep previous slot target */
  targetBall: TargetBall | null;
};

export function slotHasRenderableStrategy(
  slot: SlotDraftSysSlice | null | undefined
): boolean {
  const sys = resolveSlotSysForRender(slot);
  return hasRenderableOutputsResult(sys);
}

/** Extract per-slot runtime meta (not previous active slot adminState). */
export function extractSlotRuntimeMeta(
  slot: SlotRuntimeDraftSlice | null | undefined
): SlotRuntimeMeta {
  const draft = slot?.draft;
  const applied = slot?.applied;
  const src = draft ?? applied;
  const sys = resolveSlotSysForRender(slot);
  let system_values = src?.system_values;
  if (!system_values && sys) {
    const merged: Record<string, number> = {};
    for (const [k, v] of Object.entries(sys.inputs ?? {})) {
      if (typeof v === "number" && Number.isFinite(v)) merged[k] = v;
    }
    for (const [k, v] of Object.entries(sys.outputs?.result ?? {})) {
      if (typeof v === "number" && Number.isFinite(v)) merged[k] = v;
    }
    system_values = merged;
  }
  const rawShot = src?.shotType;
  const shotType =
    rawShot && rawShot !== "default" && rawShot !== "_" ? rawShot : "";
  return {
    corrections: mergeCorrections(src?.corrections),
    shotType,
    system_values: system_values ? { ...system_values } : undefined,
  };
}

/** Empty slot: position-only blank runtime (no prev-slot SYS/trajectory carry-over). */
export function createEmptySlotRuntime(): SlotRuntimePayload {
  return {
    adminSys: createEmptyAdminSysSnapshot(),
    hpt: { ...DEFAULT_SLOT_HPT },
    str: { ...DEFAULT_SLOT_STR },
    ai: { ...DEFAULT_SLOT_AI },
    trajectoryResult: null,
    targetBall: null,
  };
}

/** Full runtime from slot container (draft/applied SSOT). */
export function buildSlotRuntimePayload(
  slot: SlotRuntimeDraftSlice | null | undefined
): SlotRuntimePayload {
  const slotSys = resolveSlotSysForRender(slot);
  if (!slotSys || !hasRenderableOutputsResult(slotSys)) {
    return createEmptySlotRuntime();
  }
  const meta = extractSlotRuntimeMeta(slot);
  const draft = slot?.draft;
  const applied = slot?.applied;
  return {
    adminSys: adminSysFromResolvedSlotSys(slotSys, meta),
    hpt: (draft?.hpt ?? applied?.hpt ?? DEFAULT_SLOT_HPT) as typeof DEFAULT_SLOT_HPT,
    str: (draft?.str ?? applied?.str ?? DEFAULT_SLOT_STR) as typeof DEFAULT_SLOT_STR,
    ai: (draft?.ai ?? applied?.ai ?? DEFAULT_SLOT_AI) as typeof DEFAULT_SLOT_AI,
    trajectoryResult: { ...(slotSys.outputs?.result ?? {}) },
    targetBall: extractSlotTargetBall(slot),
  };
}
