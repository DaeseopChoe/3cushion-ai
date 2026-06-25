/**
 * PHASE 2 — resolved slot.sys → adminState.sys (SYS modal mirror).
 * STEP 2: corrections/shotType from SlotRuntimeMeta only (no prev-slot carry-over).
 */

import { SYSTEM_PROFILES } from "../data/systems";
import { STRATEGY_CORRECTIONS_ZERO } from "./canonicalStrategy";
import {
  hasRenderableOutputsResult,
  type SlotDraftSys,
} from "./slotSysResolve";

export type AdminSysSnapshot = {
  system_id?: string;
  system?: string;
  systemId?: string;
  track?: string;
  shotType?: string;
  inputs?: Record<string, number>;
  outputs?: { result?: Record<string, number> };
  formulaHash?: string;
  corrections?: Record<string, number>;
  spaceSel?: Record<string, string>;
  system_values?: Record<string, number>;
  [key: string]: unknown;
};

export type SlotRuntimeMeta = {
  corrections?: Record<string, number>;
  shotType?: string | null;
  system_values?: Record<string, number>;
  spaceSel?: Record<string, string>;
};

function canonicalSystemId(systemId: string | undefined): string {
  if (!systemId || systemId === "5_HALF") return "5_half_system";
  return systemId;
}

function formulaHashForSystemId(systemId: string): string {
  const profile = SYSTEM_PROFILES[systemId];
  return (profile?.formula?.expr ?? profile?.meta?.version ?? "v1").slice(0, 32);
}

function correctionsFromMeta(meta?: SlotRuntimeMeta | null) {
  const c = meta?.corrections;
  if (!c || typeof c !== "object") {
    return { ...STRATEGY_CORRECTIONS_ZERO };
  }
  return {
    slide: Number(c.slide) || 0,
    curve_ratio: Number(c.curve_ratio) || 0,
    draw: Number(c.draw) || 0,
    departure: Number(c.departure) || 0,
    spin: Number(c.spin) || 0,
  };
}

function buildMergedNumericMap(slotSys: SlotDraftSys): Record<string, number> {
  const merged: Record<string, number> = {};
  for (const [k, v] of Object.entries(slotSys.inputs ?? {})) {
    if (typeof v === "number" && Number.isFinite(v)) merged[k] = v;
  }
  for (const [k, v] of Object.entries(slotSys.outputs?.result ?? {})) {
    if (typeof v === "number" && Number.isFinite(v)) merged[k] = v;
  }
  return merged;
}

/** Empty slot runtime — no previous slot numeric/correction carry-over. */
export function createEmptyAdminSysSnapshot(): AdminSysSnapshot {
  const sid = "5_half_system";
  const snapshot: AdminSysSnapshot = {
    system_id: sid,
    system: sid,
    systemId: sid,
    track: "B2T_L",
    shotType: "",
    inputs: {},
    outputs: { result: {} },
    formulaHash: formulaHashForSystemId(sid),
    corrections: { ...STRATEGY_CORRECTIONS_ZERO },
    system_values: {},
  };
  console.log("[EMPTY_ADMIN_SYS_CREATED]", snapshot);
  return snapshot;
}

/** @deprecated Use createEmptyAdminSysSnapshot for empty slots (no prev carry-over). */
export function emptyAdminSysTemplate(
  _prevSys?: AdminSysSnapshot | null
): AdminSysSnapshot {
  return createEmptyAdminSysSnapshot();
}

/**
 * Build admin SYS UI shape from resolved slot.sys + per-slot meta.
 */
export function adminSysFromResolvedSlotSys(
  slotSys: SlotDraftSys | null | undefined,
  meta?: SlotRuntimeMeta | null
): AdminSysSnapshot | null {
  if (!slotSys || !hasRenderableOutputsResult(slotSys)) return null;

  const sid = canonicalSystemId(slotSys.systemId);
  const merged = buildMergedNumericMap(slotSys);
  const system_values = meta?.system_values
    ? { ...meta.system_values }
    : { ...merged };
  const rawShot = meta?.shotType;
  const shotType =
    rawShot && rawShot !== "default" && rawShot !== "_" ? rawShot : "";

  const result: AdminSysSnapshot = {
    system_id: sid,
    system: sid,
    systemId: sid,
    track: slotSys.track ?? "B2T_L",
    shotType,
    inputs: { ...merged },
    outputs: {
      result: { ...(slotSys.outputs?.result ?? {}) },
    },
    formulaHash: formulaHashForSystemId(sid),
    corrections: correctionsFromMeta(meta),
    system_values,
    ...(meta?.spaceSel ? { spaceSel: { ...meta.spaceSel } } : {}),
  };
  console.log("[ADMIN_SYS_FROM_SLOT]", result);
  return result;
}

function stableNumericRecordEqual(
  a?: Record<string, number>,
  b?: Record<string, number>
): boolean {
  const keysA = Object.keys(a ?? {}).sort();
  const keysB = Object.keys(b ?? {}).sort();
  if (keysA.length !== keysB.length) return false;
  for (let i = 0; i < keysA.length; i++) {
    const key = keysA[i];
    if (key !== keysB[i]) return false;
    if ((a as Record<string, number>)[key] !== (b as Record<string, number>)[key]) {
      return false;
    }
  }
  return true;
}

/** Prevent setAdminState loops when slot sys already mirrors adminState.sys. */
export function adminSysShallowEqual(
  a?: AdminSysSnapshot | null,
  b?: AdminSysSnapshot | null
): boolean {
  if (a === b) return true;
  if (!a || !b) return false;

  const idA = a.systemId ?? a.system_id ?? a.system;
  const idB = b.systemId ?? b.system_id ?? b.system;
  if (idA !== idB) return false;
  if ((a.track ?? "B2T_L") !== (b.track ?? "B2T_L")) return false;
  if ((a.shotType ?? "") !== (b.shotType ?? "")) return false;
  if ((a.formulaHash ?? "") !== (b.formulaHash ?? "")) return false;
  if (!stableNumericRecordEqual(a.inputs, b.inputs)) return false;
  if (!stableNumericRecordEqual(a.system_values, b.system_values)) return false;

  const ca = a.corrections ?? {};
  const cb = b.corrections ?? {};
  for (const k of ["slide", "curve_ratio", "draw", "departure", "spin"] as const) {
    if ((Number(ca[k]) || 0) !== (Number(cb[k]) || 0)) return false;
  }
  return true;
}
