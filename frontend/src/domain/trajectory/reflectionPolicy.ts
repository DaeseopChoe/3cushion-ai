/**
 * reflectionPolicy.ts
 * TRJ-003 (Batch 5 STEP 5-2) — Reflection Policy SSOT.
 *
 * Policy → reflectionEngine delegate.
 * Batch 5 interim: SYSTEM_PROFILES.safety direct read (D-006 / D-009).
 * Batch 6: Trajectory Runtime Contract replace.
 */

import { SYSTEM_PROFILES } from "../../data/systems";
import {
  computeReflectionC2,
  type ReflectionInput,
  type ReflectionOutput,
} from "../reflectionEngine";

export type ReflectionSafetyParams = {
  m_min: number;
  theta_t_max: number;
};

export type ReflectionPolicyInput = {
  co: ReflectionInput["co"];
  c1: ReflectionInput["c1"];
  c3: ReflectionInput["c3"];
  tip?: ReflectionInput["tip"];
  track?: ReflectionInput["track"];
  manualHint?: ReflectionInput["manualHint"];
  /** D-006 interim — Batch 6 Contract replaces profile lookup */
  systemId?: string | null;
};

/** profile.safety → reflection guard params (D-009 interim SSOT). */
export function getReflectionSafetyParams(
  systemId: string | null | undefined
): ReflectionSafetyParams {
  const profile = systemId ? SYSTEM_PROFILES?.[systemId] : undefined;
  return {
    m_min: profile?.safety?.m_min ?? 0.05,
    theta_t_max: profile?.safety?.theta_t_max ?? 68,
  };
}

/** theta_t_max guard — diagnostic seam; does not block result (behavior invariant). */
export function isReflectionGuardBlocked(
  thetaOutDeg: number,
  safety: ReflectionSafetyParams
): boolean {
  return Math.abs(thetaOutDeg) > safety.theta_t_max;
}

/**
 * C2 reflection fallback — Policy entry (INV-B5-05).
 * App / Builder must not call computeReflectionC2 directly.
 */
export function resolveReflectionC2(
  input: ReflectionPolicyInput
): ReflectionOutput | null {
  const { co, c1, c3, tip, track, manualHint, systemId } = input;

  if (!co || !c1 || !c3) {
    return null;
  }

  const safety = getReflectionSafetyParams(systemId);

  const result = computeReflectionC2({
    co,
    c1,
    c3,
    tip: tip ?? null,
    track,
    manualHint: manualHint ?? null,
  });

  if (result) {
    isReflectionGuardBlocked(result.thetaOutDeg, safety);
  }

  return result;
}
