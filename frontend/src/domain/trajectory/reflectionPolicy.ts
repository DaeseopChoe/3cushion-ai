/**
 * reflectionPolicy.ts
 * TRJ-003 (Batch 5 STEP 5-2) — Reflection Policy SSOT.
 *
 * Policy → reflectionEngine delegate.
 * Batch 6 STEP 6-2: reflection safety supplied by App from TrajectoryContractView (D-009).
 */

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
  /** Retained for Builder API stability; safety is not resolved from systemId. */
  systemId?: string | null;
  /** Optional per-call override (App injection hub). */
  safety?: ReflectionSafetyParams;
};

const DEFAULT_REFLECTION_SAFETY: ReflectionSafetyParams = {
  m_min: 0.05,
  theta_t_max: 68,
};

let reflectionSafetySupply: ReflectionSafetyParams = DEFAULT_REFLECTION_SAFETY;

/**
 * App Orchestrator injection — TrajectoryContractView.reflectionSafety (AD-B6-04 hub).
 * Domain does not read System JSON or Runtime Registry directly.
 */
export function supplyReflectionSafety(
  safety: ReflectionSafetyParams
): void {
  reflectionSafetySupply = {
    m_min:
      typeof safety.m_min === "number"
        ? safety.m_min
        : DEFAULT_REFLECTION_SAFETY.m_min,
    theta_t_max:
      typeof safety.theta_t_max === "number"
        ? safety.theta_t_max
        : DEFAULT_REFLECTION_SAFETY.theta_t_max,
  };
}

/** Contract-supplied reflection guard params (D-009 SSOT). */
export function getReflectionSafetyParams(): ReflectionSafetyParams {
  return reflectionSafetySupply;
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
  const { co, c1, c3, tip, track, manualHint, safety } = input;

  if (!co || !c1 || !c3) {
    return null;
  }

  const resolvedSafety = safety ?? getReflectionSafetyParams();

  const result = computeReflectionC2({
    co,
    c1,
    c3,
    tip: tip ?? null,
    track,
    manualHint: manualHint ?? null,
  });

  if (result) {
    isReflectionGuardBlocked(result.thetaOutDeg, resolvedSafety);
  }

  return result;
}
