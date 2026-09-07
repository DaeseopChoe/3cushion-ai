/**
 * Phase 2B DEV-only — R1b gate first-divergence observation.
 *
 * Does NOT decide the gate. Production SSOT remains
 * `shouldApplyFrameProgressionR1b` in reflectionPolicy.ts.
 * This module only mirrors the same predicates for console audit.
 */

import type { Point } from "../reflectionEngine";
import {
  classifyFrameRoles,
  isC1FrameAimProvenance,
  resolveParallelOppositeFrame,
  type ParallelOppositeSpec,
} from "./frameProgressionReflection";

/** Structural mirror of ReflectionMarkReference — avoids circular import. */
type TraceMarkReference = {
  co?: {
    point: Point;
    sysFieldKey?: string;
    valueSpace?: "Fg" | "Rg";
  };
  c1Aim?: {
    point: Point;
    sysFieldKey?: string;
    valueSpace?: "Fg" | "Rg";
  };
  c3?: {
    point: Point;
    sysFieldKey?: string;
    valueSpace?: "Fg" | "Rg";
  };
};

export type R1bGateFirstFailedPredicate =
  | "P1_REFERENCE_C1AIM_EXISTS"
  | "P2_REFERENCE_CO_EXISTS"
  | "P3_C1_SYS_FIELD_KEY"
  | "P4_C1_VALUE_SPACE"
  | "P3_C1_FRAME_AIM_PROVENANCE"
  | "P5_CO_VALUE_SPACE"
  | "P6_POINTS_FINITE"
  | "P7_PARALLEL_OPPOSITE_FRAME"
  | null;

export type R1bGateTracePayload = {
  prefix: "[R1B_GATE_TRACE]";
  referenceExists: boolean;
  rawAnchorsNote: "RAW ANCHOR NOT AVAILABLE AT GATE SCOPE";
  reference: {
    co: {
      sysFieldKey: string | null;
      valueSpace: "Fg" | "Rg" | null;
      point: Point | null;
    } | null;
    c1Aim: {
      sysFieldKey: string | null;
      valueSpace: "Fg" | "Rg" | null;
      point: Point | null;
    } | null;
  };
  /** P3 detail — C1_f key + Fg valueSpace (observation only). */
  c1SysFieldKey: string | null;
  c1ValueSpace: "Fg" | "Rg" | null;
  isC1FrameAimProvenance: boolean;
  c1SysFieldKeyIsC1_f: boolean;
  c1ValueSpaceIsFg: boolean;
  c1ValueSpaceNullAllowed: boolean;
  /** P7 detail — A/B Frame geometry (NOT physical c1Rail/c3Rail). */
  A: Point | null;
  B: Point | null;
  A_frameRoles: ReturnType<typeof classifyFrameRoles> | null;
  B_frameRoles: ReturnType<typeof classifyFrameRoles> | null;
  parallelOppositeTolerance: number;
  resolvedParallelOppositeFrame: ParallelOppositeSpec | null;
  p1ReferenceC1AimExists: boolean;
  p2ReferenceCoExists: boolean;
  p3C1SysFieldKeyValid: boolean;
  p4C1ValueSpaceValid: boolean;
  p3C1FrameAimProvenance: boolean;
  p5CoValueSpaceValid: boolean;
  p6PointsFinite: boolean;
  p7ParallelOppositeFrame: boolean;
  /** Must equal production `shouldApplyFrameProgressionR1b` when passed in. */
  gateResult: boolean;
  firstFailedPredicate: R1bGateFirstFailedPredicate;
  r1bGatePassed: boolean;
  r1bConstructionAttempted: boolean;
  r1bConstructionSucceeded: boolean;
  fallbackReason:
    | "gate_failed"
    | "construction_failed"
    | "r1b_succeeded"
    | "no_c2";
};

function pointFinite(p: Point | null | undefined): p is Point {
  return (
    !!p &&
    typeof p.x === "number" &&
    typeof p.y === "number" &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y)
  );
}

function isC1SysFieldKeyValid(key: unknown): boolean {
  if (typeof key !== "string" || key.length === 0) return false;
  return key === "C1_f" || (key.startsWith("C1") && key.endsWith("_f"));
}

function isC1ValueSpaceValid(vs: unknown): boolean {
  return vs == null || vs === "Fg";
}

function isCoValueSpaceValid(vs: unknown): boolean {
  return vs == null || vs === "Fg";
}

/**
 * Observe R1b gate predicates for DEV console.
 * `gateResultFromPolicy` must be the live return of `shouldApplyFrameProgressionR1b`.
 */
export function buildR1bGateTrace(input: {
  reference?: TraceMarkReference | null;
  /** Production SSOT gate result — never recomputed as decision authority. */
  gateResultFromPolicy: boolean;
  r1bConstructionAttempted: boolean;
  r1bConstructionSucceeded: boolean;
  tol?: number;
}): R1bGateTracePayload {
  const tol = input.tol ?? 0.5;
  const reference = input.reference ?? null;
  const c1Aim = reference?.c1Aim ?? null;
  const co = reference?.co ?? null;

  const p1ReferenceC1AimExists = !!c1Aim;
  const p2ReferenceCoExists = !!co;

  const c1SysFieldKey =
    typeof c1Aim?.sysFieldKey === "string" ? c1Aim.sysFieldKey : null;
  const c1ValueSpace =
    c1Aim?.valueSpace === "Fg" || c1Aim?.valueSpace === "Rg"
      ? c1Aim.valueSpace
      : null;
  const coSysFieldKey =
    typeof co?.sysFieldKey === "string" ? co.sysFieldKey : null;
  const coValueSpace =
    co?.valueSpace === "Fg" || co?.valueSpace === "Rg" ? co.valueSpace : null;

  const p3C1SysFieldKeyValid = isC1SysFieldKeyValid(c1SysFieldKey);
  const p4C1ValueSpaceValid = isC1ValueSpaceValid(c1Aim?.valueSpace);
  const p3C1FrameAimProvenance = isC1FrameAimProvenance(c1Aim);
  const p5CoValueSpaceValid = isCoValueSpaceValid(co?.valueSpace);

  const A = pointFinite(co?.point) ? { x: co!.point.x, y: co!.point.y } : null;
  const B = pointFinite(c1Aim?.point)
    ? { x: c1Aim!.point.x, y: c1Aim!.point.y }
    : null;
  const p6PointsFinite = A != null && B != null;

  const resolvedParallelOppositeFrame =
    A && B ? resolveParallelOppositeFrame(A, B, tol) : null;
  const p7ParallelOppositeFrame = resolvedParallelOppositeFrame != null;

  let firstFailedPredicate: R1bGateFirstFailedPredicate = null;
  // Short-circuit order mirrors shouldApplyFrameProgressionR1b.
  if (!p1ReferenceC1AimExists) {
    firstFailedPredicate = "P1_REFERENCE_C1AIM_EXISTS";
  } else if (!p2ReferenceCoExists) {
    firstFailedPredicate = "P2_REFERENCE_CO_EXISTS";
  } else if (!p3C1SysFieldKeyValid) {
    firstFailedPredicate = "P3_C1_SYS_FIELD_KEY";
  } else if (!p4C1ValueSpaceValid) {
    firstFailedPredicate = "P4_C1_VALUE_SPACE";
  } else if (!p3C1FrameAimProvenance) {
    firstFailedPredicate = "P3_C1_FRAME_AIM_PROVENANCE";
  } else if (!p5CoValueSpaceValid) {
    firstFailedPredicate = "P5_CO_VALUE_SPACE";
  } else if (!p6PointsFinite) {
    firstFailedPredicate = "P6_POINTS_FINITE";
  } else if (!p7ParallelOppositeFrame) {
    firstFailedPredicate = "P7_PARALLEL_OPPOSITE_FRAME";
  }

  const gateResult = input.gateResultFromPolicy;
  const r1bGatePassed = gateResult;
  const r1bConstructionAttempted = input.r1bConstructionAttempted;
  const r1bConstructionSucceeded = input.r1bConstructionSucceeded;

  let fallbackReason: R1bGateTracePayload["fallbackReason"];
  if (r1bConstructionSucceeded) {
    fallbackReason = "r1b_succeeded";
  } else if (r1bGatePassed && r1bConstructionAttempted) {
    fallbackReason = "construction_failed";
  } else if (!r1bGatePassed) {
    fallbackReason = "gate_failed";
  } else {
    fallbackReason = "no_c2";
  }

  return {
    prefix: "[R1B_GATE_TRACE]",
    referenceExists: !!reference,
    rawAnchorsNote: "RAW ANCHOR NOT AVAILABLE AT GATE SCOPE",
    reference: {
      co: co
        ? {
            sysFieldKey: coSysFieldKey,
            valueSpace: coValueSpace,
            point: A,
          }
        : null,
      c1Aim: c1Aim
        ? {
            sysFieldKey: c1SysFieldKey,
            valueSpace: c1ValueSpace,
            point: B,
          }
        : null,
    },
    c1SysFieldKey,
    c1ValueSpace,
    isC1FrameAimProvenance: p3C1FrameAimProvenance,
    c1SysFieldKeyIsC1_f: c1SysFieldKey === "C1_f",
    c1ValueSpaceIsFg: c1ValueSpace === "Fg",
    c1ValueSpaceNullAllowed: c1Aim?.valueSpace == null,
    A,
    B,
    A_frameRoles: A ? classifyFrameRoles(A, tol) : null,
    B_frameRoles: B ? classifyFrameRoles(B, tol) : null,
    parallelOppositeTolerance: tol,
    resolvedParallelOppositeFrame,
    p1ReferenceC1AimExists,
    p2ReferenceCoExists,
    p3C1SysFieldKeyValid,
    p4C1ValueSpaceValid,
    p3C1FrameAimProvenance,
    p5CoValueSpaceValid,
    p6PointsFinite,
    p7ParallelOppositeFrame,
    gateResult,
    firstFailedPredicate,
    r1bGatePassed,
    r1bConstructionAttempted,
    r1bConstructionSucceeded,
    fallbackReason,
  };
}

/** DEV console dedupe — observation only; no production state. */
let lastR1bGateTraceKey: string | null = null;

export function logR1bGateTraceDev(payload: R1bGateTracePayload): void {
  if (!import.meta.env.DEV) return;
  try {
    const key = JSON.stringify(payload);
    if (key === lastR1bGateTraceKey) return;
    lastR1bGateTraceKey = key;
  } catch {
    // ignore stringify failures; still log once
  }
  console.log("[R1B_GATE_TRACE]", payload);
}
