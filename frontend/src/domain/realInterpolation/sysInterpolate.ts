/**
 * SYS interpolation — continuous numeric only; derived keys stripped.
 */

import {
  CANONICAL_STRIP_EFFECTIVE_SYS_INPUT_KEYS,
  stripRuntimeSysInputs,
} from "../canonicalStrategy";
import type { InterpolationKnotView } from "./types";

export type SysInterpResult =
  | { ok: true; sysInputs: Record<string, number> }
  | { ok: false; reason: string };

function isBlendableKey(key: string): boolean {
  if (CANONICAL_STRIP_EFFECTIVE_SYS_INPUT_KEYS.has(key)) return false;
  // Noise placeholders often stored as 0 — still continuous; allow blend.
  return true;
}

/**
 * Linear blend of stripRuntimeSysInputs maps.
 * Missing key on one side with λ not at endpoint → fail (unsafe).
 */
export function interpolateSysInputs(
  knotA: InterpolationKnotView,
  knotB: InterpolationKnotView,
  lambda: number
): SysInterpResult {
  if (!Number.isFinite(lambda) || lambda < 0 || lambda > 1) {
    return { ok: false, reason: "invalid_lambda" };
  }

  const a = stripRuntimeSysInputs(knotA.sysInputs);
  const b = stripRuntimeSysInputs(knotB.sysInputs);
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  const out: Record<string, number> = {};

  for (const key of keys) {
    if (!isBlendableKey(key)) continue;
    const hasA = Object.prototype.hasOwnProperty.call(a, key);
    const hasB = Object.prototype.hasOwnProperty.call(b, key);
    if (hasA && hasB) {
      out[key] = (1 - lambda) * a[key] + lambda * b[key];
      continue;
    }
    if (hasA && !hasB) {
      if (lambda === 0) {
        out[key] = a[key];
        continue;
      }
      return { ok: false, reason: `sys_incompatible:${key}` };
    }
    if (!hasA && hasB) {
      if (lambda === 1) {
        out[key] = b[key];
        continue;
      }
      return { ok: false, reason: `sys_incompatible:${key}` };
    }
  }

  if (Object.keys(out).length === 0) {
    return { ok: false, reason: "empty_sys" };
  }
  return { ok: true, sysInputs: out };
}
