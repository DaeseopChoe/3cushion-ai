/**
 * reflectionPolicy.ts
 * TRJ-003 (Batch 5 STEP 5-2) — Reflection Policy SSOT.
 *
 * Policy → reflectionEngine delegate.
 * Batch 6 STEP 6-2: reflection safety supplied by App from TrajectoryContractView (D-009).
 *
 * Phase 1 Mark reference provenance:
 * optional `reference` may carry formula sysFieldKey + valueSpace for CO / C1 aim / C3.
 *
 * Phase 2A: when C1_f + parallel opposite-Frame progression is proven,
 * base outgoing uses R1b (destination-preserving Frame progression) instead of R0.
 * Physical bend remains H (`c1`). Engine does not parse "_f".
 *
 * Phase 2B EXPERIMENTAL Option 1: after base-law selection (R0 or R1b),
 * eligible C1_f spin uses effectiveSpin = rawSpin × K(q) exactly once.
 * q = |Frame aim B∥ − physical Rail hit H∥| (not φ). Independent of P7.
 * tip=0 → effective spin 0 → Phase 2A bit-identical. K never alters base D/H.
 */

import {
  angleDeg,
  chooseCandidateRail,
  computeReflectionC2,
  detectRail,
  findFirstValidC2,
  isLeftHandedTrack,
  resolveSignedSpinDeg,
  type Point,
  type ReflectionInput,
  type ReflectionOutput,
  type TipInput,
} from "../reflectionEngine";
import { applyAngleRatioSpin } from "./applyAngleRatioSpin";
import {
  computeFrameProgressionR1b,
  isC1FrameAimProvenance,
  resolveParallelOppositeFrame,
} from "./frameProgressionReflection";
import { buildR1bGateTrace, logR1bGateTraceDev } from "./r1bGateTrace";

export type ReflectionSafetyParams = {
  m_min: number;
  theta_t_max: number;
};

/**
 * Minimal Mark reference provenance (Phase 1 transport).
 * sysFieldKey = formula reference intent (e.g. "C1_f", "C3_r").
 * valueSpace = resolved coordinate embedding (Fg | Rg).
 * point = reference geometry point (for c1Aim this is B, NOT physical bend H).
 */
export type MarkReferenceProvenance = {
  point: Point;
  sysFieldKey?: string;
  valueSpace?: "Fg" | "Rg";
};

/**
 * Optional bag passed alongside physical reflection inputs.
 * c1Aim is Frame/Rail *aim* (B); physical `c1` argument remains bend H.
 */
export type ReflectionMarkReference = {
  co?: MarkReferenceProvenance;
  c1Aim?: MarkReferenceProvenance;
  c3?: MarkReferenceProvenance;
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
  /**
   * Phase 1/2A: Mark reference provenance (sysFieldKey + valueSpace).
   * Policy gate may opt into R1b; never forwarded into engine as "_f" parsing.
   */
  reference?: ReflectionMarkReference | null;
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
 * Fail-safe R1b gate (policy only).
 * Uncertain / short-rail / C1_r / no-reference → false → R0.
 */
export function shouldApplyFrameProgressionR1b(
  reference?: ReflectionMarkReference | null
): boolean {
  if (!reference?.c1Aim || !reference?.co) return false;
  if (!isC1FrameAimProvenance(reference.c1Aim)) return false;
  // CO should be Frame-ish when present; reject Rg-only CO for this opt-in.
  if (
    reference.co.valueSpace != null &&
    reference.co.valueSpace !== "Fg"
  ) {
    return false;
  }
  const A = reference.co.point;
  const B = reference.c1Aim.point;
  if (!A || !B) return false;
  return resolveParallelOppositeFrame(A, B) != null;
}

/** Non-zero tip/spin input — used by callers/tests; K stage bypasses multiply when false. */
export function hasNonZeroTipSpin(tip?: TipInput | null): boolean {
  if (!tip) return false;
  if (typeof tip.count === "number" && tip.count > 0) return true;
  if (
    tip.hp &&
    typeof tip.hp.x === "number" &&
    typeof tip.hp.y === "number" &&
    Math.hypot(tip.hp.x, tip.hp.y) > 1e-12
  ) {
    return true;
  }
  return false;
}

type BaseReflectionBundle = {
  baseLaw: "R0" | "R1b";
  baseThetaOutDeg: number;
  thetaInDeg: number;
  c1Rail: NonNullable<ReturnType<typeof detectRail>>;
  c3Rail: NonNullable<ReturnType<typeof detectRail>>;
  chosen: ReturnType<typeof chooseCandidateRail>;
  B: Point | null;
};

/**
 * Phase 2A base θ only (no spin). R1b = H→D; R0 = tip=0 specular (θ_reflect+180).
 * Does not change R0/R1b equations — extracts tip=0 / progression base.
 */
function resolveBaseReflectionBundle(
  input: ReflectionPolicyInput
): BaseReflectionBundle | null {
  const { co, c1, c3, tip, track, manualHint, reference } = input;
  if (!co || !c1 || !c3) return null;

  const H = c1;
  const c1Rail = detectRail(H);
  const c3Rail = detectRail(c3);
  if (!c1Rail || !c3Rail) return null;

  const preferred = manualHint?.preferredRail;
  const chosen = chooseCandidateRail(c1Rail, track, preferred);

  if (shouldApplyFrameProgressionR1b(reference) && reference?.co && reference?.c1Aim) {
    const A = reference.co.point;
    const B = reference.c1Aim.point;
    const r1b = computeFrameProgressionR1b({ A, B, H });
    if (r1b) {
      return {
        baseLaw: "R1b",
        baseThetaOutDeg: r1b.thetaOutDeg,
        thetaInDeg: angleDeg(co, H),
        c1Rail,
        c3Rail,
        chosen,
        B: { x: B.x, y: B.y },
      };
    }
    // Construction failed → fall through to R0 base
  }

  // R0 base: tip=0 extract so spin can be scaled in common stage without changing reflect law.
  const tip0Side = tip?.side ?? "R";
  const tip0Result = computeReflectionC2({
    co,
    c1,
    c3,
    tip: { count: 0, side: tip0Side },
    track,
    manualHint: manualHint ?? null,
  });
  if (!tip0Result) return null;

  return {
    baseLaw: "R0",
    baseThetaOutDeg: tip0Result.thetaOutDeg,
    thetaInDeg: tip0Result.thetaInDeg,
    c1Rail,
    c3Rail,
    chosen,
    B: reference?.c1Aim?.point
      ? { x: reference.c1Aim.point.x, y: reference.c1Aim.point.y }
      : null,
  };
}

/**
 * C2 reflection fallback — Policy entry (INV-B5-05).
 * App / Builder must not call computeReflectionC2 directly.
 *
 * Phase 2A: opt-in R1b for proven C1_f parallel opposite-Frame only.
 * Phase 2B Option 1: K(q) on eligible C1_f after base law (R0 or R1b), exactly once.
 */
export function resolveReflectionC2(
  input: ReflectionPolicyInput
): ReflectionOutput | null {
  const { co, c1, c3, tip, track, manualHint, safety, reference } = input;

  if (!co || !c1 || !c3) {
    return null;
  }

  const resolvedSafety = safety ?? getReflectionSafetyParams();
  const H = c1;

  // DEV gate trace on R0 fallback path (unchanged diagnostic; no behavior).
  const r1bGatePassed = shouldApplyFrameProgressionR1b(reference);
  if (!r1bGatePassed && import.meta.env.DEV) {
    logR1bGateTraceDev(
      buildR1bGateTrace({
        reference,
        gateResultFromPolicy: false,
        r1bConstructionAttempted: false,
        r1bConstructionSucceeded: false,
      })
    );
  }

  const base = resolveBaseReflectionBundle(input);
  if (!base) {
    if (r1bGatePassed && import.meta.env.DEV) {
      logR1bGateTraceDev(
        buildR1bGateTrace({
          reference,
          gateResultFromPolicy: true,
          r1bConstructionAttempted: true,
          r1bConstructionSucceeded: false,
        })
      );
    }
    return null;
  }

  if (r1bGatePassed && base.baseLaw === "R0" && import.meta.env.DEV) {
    // Gate passed but R1b construction failed → R0 fail-safe
    logR1bGateTraceDev(
      buildR1bGateTrace({
        reference,
        gateResultFromPolicy: true,
        r1bConstructionAttempted: true,
        r1bConstructionSucceeded: false,
      })
    );
  }

  const spinAdjustDeg = resolveSignedSpinDeg(
    track,
    tip,
    manualHint?.deltaAngleDeg ?? 0
  );
  const rawSpinCorrectionDeg =
    spinAdjustDeg * (isLeftHandedTrack(track) ? -1 : 1);

  const spinScale = applyAngleRatioSpin({
    reference,
    H,
    c1Rail: base.c1Rail,
    tip: tip ?? null,
    rawSpinCorrectionDeg,
  });

  const thetaOutDeg =
    base.baseThetaOutDeg + spinScale.effectiveSpinCorrectionDeg;

  const orderedRails = [
    base.chosen.rail,
    ...base.chosen.candidates.filter((r) => r !== base.chosen.rail),
  ];
  const found = findFirstValidC2(H, thetaOutDeg, orderedRails);
  if (!found) {
    return null;
  }

  isReflectionGuardBlocked(thetaOutDeg, resolvedSafety);

  const preferred = manualHint?.preferredRail;
  return {
    c2: found.c2,
    c2Rail: found.c2Rail,
    thetaInDeg: base.thetaInDeg,
    thetaOutDeg,
    spinAdjustDeg,
    source: preferred ? "auto_with_hint" : "auto",
    diagnostics: {
      c1Rail: base.c1Rail,
      c3Rail: base.c3Rail,
      candidateRails: base.chosen.candidates,
      selectedBy: base.chosen.selectedBy,
      baseLaw: base.baseLaw,
      angleRatio: spinScale.angleRatioEligible
        ? spinScale.angleRatio
        : undefined,
      angleRatioK: spinScale.angleRatioEligible
        ? (spinScale.angleRatioK ?? undefined)
        : undefined,
      rawSpinCorrectionDeg: spinScale.rawSpinCorrectionDeg,
      effectiveSpinCorrectionDeg: spinScale.effectiveSpinCorrectionDeg,
      baseThetaOutDeg: base.baseThetaOutDeg,
      finalThetaOutDeg: thetaOutDeg,
      angleRatioEligible: spinScale.angleRatioEligible,
      angleRatioApplied: spinScale.angleRatioApplied,
      angleRatioApplicationCount: spinScale.angleRatioApplicationCount,
      ...(spinScale.angleRatioEligible
        ? {
            frameAimPoint: spinScale.frameAimPoint,
            physicalRailHit: spinScale.physicalRailHit,
            longitudinalAxis: spinScale.longitudinalAxis,
            frameAimLongitudinal: spinScale.frameAimLongitudinal,
            railHitLongitudinal: spinScale.railHitLongitudinal,
          }
        : {}),
    },
  };
}
