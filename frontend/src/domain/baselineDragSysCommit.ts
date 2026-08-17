/**
 * baselineDragSysCommit.ts
 * Baseline CO/C1 drag → SYS inputDelta.
 *
 * coord → getSysValueFromAnchorCoord → solveFiveHalfTwoOfThree
 * (same 2-of-3 ownership as SYS modal). No formula hardcode in UI.
 */

import { getSysValueFromAnchorCoord } from "./anchorLookupEngine";
import {
  fiveHalfComputedInputKey,
  solveFiveHalfTwoOfThree,
} from "./calculator/fiveHalfCalculator";
import { isFiveHalfSystemId } from "./system/systemIdentity";

export type BaselineDragMark = "CO" | "C1";

export type ResolveBaselineDragSysCommitInput = {
  systemId: string;
  track: string | null | undefined;
  mark: BaselineDragMark;
  coord: { x: number; y: number } | null | undefined;
  slotInputs: Record<string, unknown> | null | undefined;
};

export type ResolveBaselineDragSysCommitResult = {
  draggedSys: number;
  sysFieldKey: string;
  inputDelta: Record<string, number>;
  coKey: string;
  c1Key: string;
  c3Key: string;
};

function finiteSlotNum(
  inputs: Record<string, unknown> | null | undefined,
  key: string
): number | null {
  if (!inputs || typeof inputs !== "object") return null;
  const v = inputs[key];
  if (v === "" || v === null || v === undefined) return null;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? n : null;
}

function pickExistingKey(
  inputs: Record<string, unknown> | null | undefined,
  primary: string,
  fallback: string
): string {
  if (finiteSlotNum(inputs, primary) != null) return primary;
  if (finiteSlotNum(inputs, fallback) != null) return fallback;
  return primary;
}

/** Prefer stored keys; 5_half defaults CO_f / C1_f / C3_r. */
export function inferFiveHalfCoC1C3Keys(
  slotInputs: Record<string, unknown> | null | undefined
): { coKey: string; c1Key: string; c3Key: string } {
  return {
    coKey: pickExistingKey(slotInputs, "CO_f", "CO_r"),
    c1Key: pickExistingKey(slotInputs, "C1_f", "C1_r"),
    c3Key: pickExistingKey(slotInputs, "C3_r", "C3_f"),
  };
}

function sysFieldKeyForMark(
  mark: BaselineDragMark,
  keys: { coKey: string; c1Key: string }
): string {
  return mark === "CO" ? keys.coKey : keys.c1Key;
}

function collectFiniteTrio(
  slotInputs: Record<string, unknown> | null | undefined,
  coKey: string,
  c1Key: string,
  c3Key: string
): Record<string, number> {
  const out: Record<string, number> = {};
  const co = finiteSlotNum(slotInputs, coKey);
  const c1 = finiteSlotNum(slotInputs, c1Key);
  const c3 = finiteSlotNum(slotInputs, c3Key);
  if (co != null) out[coKey] = co;
  if (c1 != null) out[c1Key] = c1;
  if (c3 != null) out[c3Key] = c3;
  return out;
}

/**
 * SYS modal 2-of-3: fiveHalfComputedInputKey가 고른 종속키를 빼고
 * 드래그한 값을 넣은 뒤 solveFiveHalfTwoOfThree.
 */
export function buildFiveHalfDragSolverDelta(params: {
  mark: BaselineDragMark;
  draggedSys: number;
  slotInputs: Record<string, unknown> | null | undefined;
  coKey: string;
  c1Key: string;
  c3Key: string;
}): Record<string, number> | null {
  const { mark, draggedSys, slotInputs, coKey, c1Key, c3Key } = params;
  if (!Number.isFinite(draggedSys)) return null;

  const draggedKey = sysFieldKeyForMark(mark, { coKey, c1Key });
  const current = collectFiniteTrio(slotInputs, coKey, c1Key, c3Key);
  const computedKey = fiveHalfComputedInputKey(current, coKey, c1Key, c3Key);

  const solverInputs: Record<string, number> = { ...current };
  solverInputs[draggedKey] = draggedSys;
  if (computedKey && computedKey !== draggedKey) {
    delete solverInputs[computedKey];
  }

  return solveFiveHalfTwoOfThree(solverInputs, coKey, c1Key, c3Key);
}

/**
 * Mark coord → sys → 2-of-3 inputDelta for commitDraftSys.
 * null = do not commit (invalid axis / solver fail / missing track).
 */
export function resolveBaselineDragSysCommit(
  input: ResolveBaselineDragSysCommitInput
): ResolveBaselineDragSysCommitResult | null {
  const { systemId, track, mark, coord, slotInputs } = input;
  if (!track || (mark !== "CO" && mark !== "C1")) return null;
  if (!coord || !Number.isFinite(coord.x) || !Number.isFinite(coord.y)) {
    return null;
  }

  const keys = inferFiveHalfCoC1C3Keys(slotInputs);
  const sysFieldKey = sysFieldKeyForMark(mark, keys);
  const draggedSys = getSysValueFromAnchorCoord({
    systemId,
    track,
    mark,
    coord,
    sysFieldKey,
  });
  if (draggedSys == null || !Number.isFinite(draggedSys)) return null;

  if (isFiveHalfSystemId(systemId)) {
    const inputDelta = buildFiveHalfDragSolverDelta({
      mark,
      draggedSys,
      slotInputs,
      ...keys,
    });
    if (!inputDelta) return null;
    const co = inputDelta[keys.coKey];
    const c1 = inputDelta[keys.c1Key];
    const c3 = inputDelta[keys.c3Key];
    if (
      !Number.isFinite(co) ||
      !Number.isFinite(c1) ||
      !Number.isFinite(c3)
    ) {
      return null;
    }
    return {
      draggedSys,
      sysFieldKey,
      inputDelta,
      ...keys,
    };
  }

  return {
    draggedSys,
    sysFieldKey,
    inputDelta: { [sysFieldKey]: draggedSys },
    ...keys,
  };
}
