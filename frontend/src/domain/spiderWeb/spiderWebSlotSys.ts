/**
 * Spider Web (거미줄) — slot SYS snapshot (commit / render).
 * Only spider keys survive; stale 5&Half outputs (Sn, C4_f…) never leak in.
 */

import { spiderContinuationSignature } from "./spiderWebContinuation";
import { spiderValuesFromStoredInputs } from "./spiderWebSolver";
import { isSpiderWebSystemId } from "./spiderWebTracks";

export type SpiderSlotSys = {
  inputs: Record<string, number>;
  /** C3_f first (draft validation reads the first numeric value). */
  result: Record<string, number>;
};

export function resolveSpiderSlotSys(
  track: unknown,
  inputs: Record<string, unknown> | null | undefined
): SpiderSlotSys | null {
  const v = spiderValuesFromStoredInputs(track, inputs);
  if (!v) return null;
  return {
    inputs: { CO_f: v.CO_f, C1_f: v.C1_f, C3_f: v.C3_f, HP_n: v.HP_n, HP_sel: v.HP_sel },
    result: { C3_f: v.C3_f, CO_f: v.CO_f, C1_f: v.C1_f, HP_n: v.HP_n, HP_sel: v.HP_sel },
  };
}

/** Continuation signature of a slot sys snapshot (null unless a valid spider sys). */
export function spiderSignatureFromSlotSys(
  sys: { systemId?: unknown; track?: unknown; inputs?: Record<string, unknown> | null } | null | undefined
): string | null {
  if (!sys || !isSpiderWebSystemId(typeof sys.systemId === "string" ? sys.systemId : null)) {
    return null;
  }
  const v = spiderValuesFromStoredInputs(sys.track, sys.inputs);
  return v ? spiderContinuationSignature({ track: String(sys.track), ...v }) : null;
}

/**
 * Any SYS / track / tip change invalidates C4–C6 edits and E1/E2.
 * True when either side is spider and the signatures differ.
 */
export function shouldInvalidateSpiderEditsOnSysChange(
  prevSys: Parameters<typeof spiderSignatureFromSlotSys>[0],
  nextSys: Parameters<typeof spiderSignatureFromSlotSys>[0]
): boolean {
  const prev = spiderSignatureFromSlotSys(prevSys);
  const next = spiderSignatureFromSlotSys(nextSys);
  if (prev == null && next == null) return false;
  return prev !== next;
}
