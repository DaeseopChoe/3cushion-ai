/**
 * DEV-only diagnostics for HPT tip-side flip → corrected C1-cut investigation
 * (뒤돌리기 대회전 FAULT vs NORMAL control).
 * Side-effect: console.log only. Does not mutate product state or timing.
 */
import { PATH_NODE_MARKS } from "../domain/trajectoryPathDisplayPolicy";
import { detectRail } from "../domain/reflectionEngine";
import {
  canonicalTipSideFromHpt,
  type HptTipSideSource,
} from "../domain/trajectory/c2ReflectionOverride";

export type HptTrajectoryDiagPhase =
  | "APPLY"
  | "FIRST_RENDER"
  | "NEXT_RENDER"
  | "BASELINE_ON"
  | "CORRECTED_AGAIN";

export type HptTrajectoryDiagSession = {
  applyId: number;
  step:
    | "await_first"
    | "await_next"
    | "await_baseline"
    | "await_corrected_again"
    | "done";
  logged: Record<string, boolean>;
  /** Captured at APPLY for correlation on later renders */
  applyMeta: Record<string, unknown> | null;
};

type PointLike = { x?: number; y?: number } | null | undefined;

export function createHptTrajectoryDiagSession(
  applyId: number
): HptTrajectoryDiagSession {
  return {
    applyId,
    step: "await_first",
    logged: {},
    applyMeta: null,
  };
}

function finitePoint(p: PointLike): { x: number; y: number } | null {
  if (!p || typeof p !== "object") return null;
  const x = Number((p as { x?: number }).x);
  const y = Number((p as { y?: number }).y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
}

function summarizeNode(p: PointLike, index: number) {
  const pt = finitePoint(p);
  if (!pt) {
    return {
      index,
      mark: PATH_NODE_MARKS[index] ?? `i${index}`,
      present: false,
      x: null,
      y: null,
      rail: null,
    };
  }
  return {
    index,
    mark: PATH_NODE_MARKS[index] ?? `i${index}`,
    present: true,
    x: pt.x,
    y: pt.y,
    rail: detectRail(pt) ?? null,
  };
}

function summarizePathHead(pathNodes: unknown[] | null | undefined) {
  const arr = Array.isArray(pathNodes) ? pathNodes : [];
  return {
    length: arr.length,
    n0: summarizeNode(arr[0] as PointLike, 0),
    n1: summarizeNode(arr[1] as PointLike, 1),
    n2: summarizeNode(arr[2] as PointLike, 2),
    n3: summarizeNode(arr[3] as PointLike, 3),
  };
}

function hptFields(hpt: HptTipSideSource) {
  const hp =
    (hpt as { hit_point?: { x?: number; y?: number }; hp?: { x?: number; y?: number } } | null)
      ?.hit_point ??
    (hpt as { hp?: { x?: number; y?: number } } | null)?.hp ??
    null;
  return {
    side: canonicalTipSideFromHpt(hpt),
    mode: (hpt as { mode?: string } | null)?.mode ?? null,
    tipCount: (hpt as { tipCount?: number } | null)?.tipCount ?? null,
    T: (hpt as { T?: string } | null)?.T ?? null,
    hit_point_x: hp && typeof hp.x === "number" ? hp.x : null,
    hit_point_y: hp && typeof hp.y === "number" ? hp.y : null,
  };
}

export function logHptTrajectoryDiag(
  phase: HptTrajectoryDiagPhase,
  payload: Record<string, unknown>
) {
  if (!import.meta.env.DEV) return;
  console.log(`[HPT_TRAJECTORY_DIAG][${phase}]`, {
    ts: Date.now(),
    ...payload,
  });
}

export type HptApplyDiagInput = {
  applyId: number;
  positionId: string | null;
  shotType: string | null;
  track: string | null;
  targetBall: string | null;
  prevHpt: HptTipSideSource;
  nextHpt: HptTipSideSource;
  shouldClear: boolean;
  c2ReflectionOverrideBefore: { rail?: string; t?: number } | null;
  slotDraftOverrideBefore: unknown;
  slotAppliedOverrideBefore: unknown;
  corrections: Record<string, unknown> | null;
};

/** Call from HPT onSave (DEV). Returns applyMeta for session. */
export function logHptTrajectoryDiagApply(input: HptApplyDiagInput) {
  if (!import.meta.env.DEV) return null;
  const prev = hptFields(input.prevHpt);
  const next = hptFields(input.nextHpt);
  const payload = {
    applyId: input.applyId,
    identity: {
      positionId: input.positionId,
      shotType: input.shotType,
      track: input.track,
      targetBall: input.targetBall,
    },
    hpt: {
      prevSide: prev.side,
      nextSide: next.side,
      prev: prev,
      next: next,
    },
    corrections: input.corrections,
    slide: input.corrections ? Number(input.corrections.slide) || 0 : null,
    override: {
      shouldClear: input.shouldClear,
      reactBefore: input.c2ReflectionOverrideBefore,
      slotDraftBefore: input.slotDraftOverrideBefore ?? null,
      slotAppliedBefore: input.slotAppliedOverrideBefore ?? null,
      note: "after Apply: React/slot cleared only when shouldClear; confirm on FIRST_RENDER",
    },
  };
  logHptTrajectoryDiag("APPLY", payload);
  console.table({
    applyId: input.applyId,
    positionId: input.positionId,
    shotType: input.shotType,
    track: input.track,
    prevSide: prev.side,
    nextSide: next.side,
    tipCount: next.tipCount,
    slide: payload.slide,
    shouldClear: input.shouldClear,
    hadReactOverride: !!input.c2ReflectionOverrideBefore,
  });
  return payload;
}

export type HptRenderDiagInput = {
  applyId: number;
  phase: HptTrajectoryDiagPhase;
  applyMeta: Record<string, unknown> | null;
  showBaseLine: boolean;
  skipSameRail: boolean;
  c2ReflectionOverride: { rail?: string; t?: number } | null;
  currentTip: { count?: number; side?: string; hp?: unknown } | null;
  corrections: Record<string, unknown> | null;
  effectiveCorrected: Record<string, unknown> | null;
  effectiveBaseline: Record<string, unknown> | null;
  correctedPathNodes: unknown[] | null | undefined;
  baselinePathNodes: unknown[] | null | undefined;
  capCorrected: {
    endIndex?: number;
    reason?: string;
    stoppedSegment?: string;
  } | null;
  capBaseline: {
    endIndex?: number;
    reason?: string;
    stoppedSegment?: string;
  } | null;
  coPrep: PointLike;
  c1Rail: PointLike;
  anchorsC2Present: boolean;
  reflectedDiagnostics: unknown;
  useCurveDeform: boolean;
};

function pickEff(eff: Record<string, unknown> | null | undefined) {
  if (!eff) return null;
  return {
    CO_f: eff.CO_f ?? null,
    C1_f: eff.C1_f ?? null,
    C3_r: eff.C3_r ?? null,
    C4_f: eff.C4_f ?? null,
  };
}

export function buildHptRenderDiagPayload(input: HptRenderDiagInput) {
  const corrPath = summarizePathHead(input.correctedPathNodes);
  const basePath = summarizePathHead(input.baselinePathNodes);
  const capC = input.capCorrected ?? null;
  const capB = input.capBaseline ?? null;
  return {
    applyId: input.applyId,
    phase: input.phase,
    showBaseLine: input.showBaseLine,
    applyMeta: input.applyMeta,
    tip: input.currentTip,
    skipSameRail: input.skipSameRail,
    c2ReflectionOverride: input.c2ReflectionOverride,
    anchorsC2Present: input.anchorsC2Present,
    corrections: input.corrections,
    slide: input.corrections ? Number(input.corrections.slide) || 0 : null,
    effective: {
      corrected: pickEff(input.effectiveCorrected),
      baseline: pickEff(input.effectiveBaseline),
    },
    geometry: {
      coPrep: summarizeNode(input.coPrep, 0),
      c1Rail: summarizeNode(input.c1Rail, 1),
      reflectedDiagnostics: input.reflectedDiagnostics ?? null,
    },
    corrected: {
      path: corrPath,
      c1: corrPath.n1,
      c2: corrPath.n2,
      c3: corrPath.n3,
      cap: {
        reason: capC?.reason ?? null,
        endIndex: capC?.endIndex ?? null,
        stoppedSegment: capC?.stoppedSegment ?? null,
        same_rail: capC?.reason === "same_rail",
        missing_node: capC?.reason === "missing_node",
      },
      useCurveDeform: input.useCurveDeform,
    },
    baseline: {
      path: basePath,
      c1: basePath.n1,
      c2: basePath.n2,
      c3: basePath.n3,
      cap: {
        reason: capB?.reason ?? null,
        endIndex: capB?.endIndex ?? null,
        stoppedSegment: capB?.stoppedSegment ?? null,
      },
    },
    divergenceHints: {
      c1c2SameRailCorrected:
        corrPath.n1.rail != null &&
        corrPath.n2.rail != null &&
        corrPath.n1.rail === corrPath.n2.rail,
      c2MissingCorrected: !corrPath.n2.present,
      c2MissingBaseline: !basePath.n2.present,
      effCoDiffers:
        pickEff(input.effectiveCorrected)?.CO_f !==
        pickEff(input.effectiveBaseline)?.CO_f,
    },
  };
}

export function logHptRenderDiag(input: HptRenderDiagInput) {
  if (!import.meta.env.DEV) return;
  const payload = buildHptRenderDiagPayload(input);
  logHptTrajectoryDiag(input.phase, payload);
  console.table({
    applyId: input.applyId,
    phase: input.phase,
    showBaseLine: input.showBaseLine,
    tipSide: (input.currentTip as { side?: string } | null)?.side ?? null,
    tipCount: (input.currentTip as { count?: number } | null)?.count ?? null,
    slide: payload.slide,
    skipSameRail: input.skipSameRail,
    override: input.c2ReflectionOverride
      ? `${input.c2ReflectionOverride.rail}@${input.c2ReflectionOverride.t}`
      : null,
    corrCapReason: payload.corrected.cap.reason,
    corrCapEnd: payload.corrected.cap.endIndex,
    baseCapReason: payload.baseline.cap.reason,
    baseCapEnd: payload.baseline.cap.endIndex,
    corrC1rail: payload.corrected.c1.rail,
    corrC2rail: payload.corrected.c2.rail,
    corrC2present: payload.corrected.c2.present,
    baseC2present: payload.baseline.c2.present,
    c1c2SameRail: payload.divergenceHints.c1c2SameRailCorrected,
    effCO_corr: payload.effective.corrected?.CO_f ?? null,
    effCO_base: payload.effective.baseline?.CO_f ?? null,
  });
}

/**
 * Drive FIRST/NEXT/BASELINE/CORRECTED_AGAIN logging once per step (DEV).
 * Call once per App render after trajectoryBuild.
 */
export function maybeLogHptTrajectoryDiagRender(
  session: HptTrajectoryDiagSession | null,
  args: {
    showBaseLine: boolean;
    adminTableLayersVisible: boolean;
    appMode: string;
    renderInput: Omit<HptRenderDiagInput, "applyId" | "phase" | "applyMeta">;
  }
): HptTrajectoryDiagSession | null {
  if (!import.meta.env.DEV || !session || session.step === "done") return session;
  if (args.appMode !== "ADMIN" || !args.adminTableLayersVisible) return session;

  const run = (
    phase: HptTrajectoryDiagPhase,
    nextStep: HptTrajectoryDiagSession["step"]
  ) => {
    if (session.logged[phase]) return;
    logHptRenderDiag({
      ...args.renderInput,
      applyId: session.applyId,
      phase,
      applyMeta: session.applyMeta,
    });
    session.logged[phase] = true;
    session.step = nextStep;
  };

  if (session.step === "await_first" && !args.showBaseLine) {
    run("FIRST_RENDER", "await_next");
    return session;
  }
  if (session.step === "await_next" && !args.showBaseLine) {
    run("NEXT_RENDER", "await_baseline");
    return session;
  }
  if (session.step === "await_baseline" && args.showBaseLine) {
    run("BASELINE_ON", "await_corrected_again");
    return session;
  }
  if (session.step === "await_corrected_again" && !args.showBaseLine) {
    run("CORRECTED_AGAIN", "done");
    return session;
  }
  return session;
}
