/**
 * trajectoryBuilder.ts
 * TRJ-001 (Batch 5 STEP 5-3) — Trajectory Runtime SSOT (corrected path).
 *
 * Domain Runtime only. Single entry: buildTrajectory().
 * Baseline branch: STEP 5-4.
 */

import { calcImpactBall } from "../../data/system/calculator";
import { unifiedSlideFromCorrections } from "../calculator/sysOverlayCalcHelpers";
import {
  resolveTrajectoryDisplayCap,
  slicePathNodesToCap,
  type TrajectoryDisplayCap,
} from "../trajectoryPathDisplayPolicy";
import { calculateImpact } from "../../utils/physics";
import { createCurveSegment } from "../../utils/trajectory/curveTrajectory";
import {
  computeRailImpactPoint,
  normalizeAnchor,
  resolveAnchorPoint,
  type ResolveAnchorContext,
} from "../../utils/geometry/anchorResolve";
import { snapToRail } from "../../utils/geometry/rail";
import type { TipInput } from "../reflectionEngine";
import {
  anchorSemanticForPath,
  coStartForCushionPath,
  firstRailHitTowardTarget,
  type PathPoint,
} from "./pathNodeHelpers";
import { resolveReflectionC2 } from "./reflectionPolicy";

const DEFAULT_CURVE_EPS = 1e-6;

export type TrajectoryBuildInput = {
  anchors: Record<string, unknown>;
  rawAnchors: Record<string, unknown>;
  resolveAnchorCtx: ResolveAnchorContext;
  balls: {
    cue?: PathPoint | null;
    impact?: PathPoint | null;
    target?: PathPoint | null;
    target_center?: PathPoint | null;
    second?: PathPoint | null;
  };
  targetColor?: string | null;
  slotRenderSys?: {
    corrections?: { slide?: number; draw?: number; curve_ratio?: number };
    shotType?: string;
  } | null;
  adminState?: {
    hpt?: {
      hit_point?: { x?: number; y?: number };
      hp?: { x?: number; y?: number };
      mode?: string;
      tipCount?: number;
      T?: string;
    };
  } | null;
  currentTip?: TipInput | null;
  c2ManualHint?: {
    preferredRail?: "TOP" | "BOTTOM" | "LEFT" | "RIGHT";
    deltaAngleDeg?: number;
  } | null;
  thicknessForCalc?: string;
  shotPattern?: string;
  hitTolerance: number;
  ballDiameterRg: number;
  ballRadiusRg: number;
  curveEps?: number;
};

export type LabelAnchorPayload = {
  coord: { x: number; y: number };
};

export type TrajectoryBuildResult = {
  corrected: {
    pathNodes: (PathPoint | null)[];
    cushionPath: PathPoint[];
    cushionPathForRender: PathPoint[];
    cap: TrajectoryDisplayCap;
    coLine: PathPoint | null;
    c1Line: PathPoint | null;
    useCurveDeform: boolean;
  };
  baseline: null;
  impact: {
    raw: PathPoint | null;
    contactRg: PathPoint | null;
  };
  handles: {
    coRg: PathPoint | null;
    c1Rg: PathPoint | null;
  };
  labels: {
    anchorSources: Record<string, LabelAnchorPayload | null>;
  };
  meta: {
    trackForAnchors?: string;
    systemIdForGrid?: string;
    coPrep: PathPoint | null;
    c1Prep: PathPoint | null;
    coRail: PathPoint | null;
    c1Rail: PathPoint | null;
    reflectedDiagnostics: Record<string, unknown> | null;
  };
};

function labelPayload(anchorOrPoint: unknown): LabelAnchorPayload | null {
  if (anchorOrPoint == null) return null;
  if (
    typeof anchorOrPoint === "object" &&
    anchorOrPoint !== null &&
    "coord" in anchorOrPoint &&
    typeof (anchorOrPoint as { coord?: unknown }).coord === "object" &&
    (anchorOrPoint as { coord: { x?: number; y?: number } }).coord != null &&
    Number.isFinite((anchorOrPoint as { coord: { x: number } }).coord.x) &&
    Number.isFinite((anchorOrPoint as { coord: { x: number } }).coord.y)
  ) {
    return anchorOrPoint as LabelAnchorPayload;
  }
  if (
    typeof anchorOrPoint === "object" &&
    anchorOrPoint !== null &&
    "x" in anchorOrPoint &&
    "y" in anchorOrPoint &&
    Number.isFinite((anchorOrPoint as PathPoint).x) &&
    Number.isFinite((anchorOrPoint as PathPoint).y)
  ) {
    const p = anchorOrPoint as PathPoint;
    return { coord: { x: p.x, y: p.y } };
  }
  return null;
}

function resolveSecondBall(
  balls: TrajectoryBuildInput["balls"],
  targetColor?: string | null
): PathPoint | null {
  const yellowBall = balls.target_center ?? balls.target ?? null;
  const redBall = balls.second ?? null;
  const secondBall =
    targetColor === "red"
      ? yellowBall
      : targetColor === "yellow"
        ? redBall
        : redBall ?? yellowBall ?? null;
  if (
    secondBall &&
    Number.isFinite(secondBall.x) &&
    Number.isFinite(secondBall.y)
  ) {
    return { x: secondBall.x, y: secondBall.y };
  }
  return null;
}

function resolveTargetBall(
  balls: TrajectoryBuildInput["balls"],
  targetColor?: string | null
): PathPoint | null {
  const yellowBall = balls.target_center ?? balls.target ?? null;
  const redBall = balls.second ?? null;
  const targetBall =
    targetColor === "red"
      ? redBall
      : targetColor === "yellow"
        ? yellowBall
        : yellowBall ?? redBall ?? null;
  if (
    targetBall &&
    Number.isFinite(targetBall.x) &&
    Number.isFinite(targetBall.y)
  ) {
    return { x: targetBall.x, y: targetBall.y };
  }
  return balls.target_center ?? balls.target ?? null;
}

function buildCurrentTipFromAdmin(
  adminState: TrajectoryBuildInput["adminState"]
): TipInput | null {
  const hp = adminState?.hpt?.hit_point ?? adminState?.hpt?.hp;
  if (!hp || typeof hp.x !== "number" || typeof hp.y !== "number") return null;
  const side = hp.x >= 0 ? "R" : "L";
  const mode = adminState?.hpt?.mode ?? "TIP";
  if (mode === "TIP") {
    const count = Math.max(
      0,
      Math.min(4, Math.round(adminState?.hpt?.tipCount ?? 0))
    );
    return { count, side };
  }
  return { hp: { x: hp.x, y: hp.y }, side };
}

/** Corrected trajectory path — Domain SSOT (STEP 5-3). Baseline: STEP 5-4. */
export function buildTrajectory(
  input: TrajectoryBuildInput
): TrajectoryBuildResult {
  const {
    anchors,
    rawAnchors,
    resolveAnchorCtx,
    balls,
    targetColor,
    slotRenderSys,
    adminState,
    c2ManualHint,
    thicknessForCalc,
    shotPattern,
    hitTolerance,
    ballDiameterRg,
    ballRadiusRg,
    curveEps = DEFAULT_CURVE_EPS,
  } = input;

  const trackForAnchors = resolveAnchorCtx.track;
  const systemIdForGrid = resolveAnchorCtx.systemId;
  const currentTip =
    input.currentTip ?? buildCurrentTipFromAdmin(adminState);

  const CO_anchor = normalizeAnchor(rawAnchors.CO);
  const C1_anchor = normalizeAnchor(rawAnchors["C1"]);
  const CO_prep = resolveAnchorPoint(CO_anchor, resolveAnchorCtx);
  const C1_prep = resolveAnchorPoint(C1_anchor, resolveAnchorCtx);

  const isBottomCO =
    CO_prep != null && Math.abs(CO_prep.y + 2.25) < 0.5;

  let CO_rail: PathPoint | null = CO_prep;
  if (isBottomCO && CO_prep && C1_prep) {
    const pt = computeRailImpactPoint(CO_prep, C1_prep, {
      ...resolveAnchorCtx,
      mark: "CO",
    });
    if (pt) CO_rail = pt;
  }

  const C1_rail =
    CO_prep && C1_prep
      ? computeRailImpactPoint(CO_prep, C1_prep, {
          ...resolveAnchorCtx,
          mark: "C1",
        })
      : null;

  const CO_path0 = coStartForCushionPath(CO_rail, CO_prep, C1_prep);

  const C3_anchor = anchors["C3"];
  const C3_prep = resolveAnchorPoint(
    normalizeAnchor(C3_anchor),
    resolveAnchorCtx
  );
  const C3_point =
    C3_prep ??
    (C3_anchor &&
    typeof C3_anchor === "object" &&
    "coord" in C3_anchor &&
    (C3_anchor as { coord?: PathPoint }).coord
      ? (C3_anchor as { coord: PathPoint }).coord
      : (C3_anchor as PathPoint | null));
  const C3_snapped = snapToRail(C3_point) ?? C3_point;

  const reflected =
    !anchors["C2"] && CO_rail && C1_rail && C3_snapped
      ? resolveReflectionC2({
          co: CO_rail,
          c1: C1_rail,
          c3: C3_snapped,
          tip: currentTip ?? null,
          track: trackForAnchors ?? undefined,
          manualHint: c2ManualHint ?? null,
          systemId: systemIdForGrid,
        })
      : null;

  const C2 = anchors["C2"] ?? reflected?.c2 ?? null;
  const C3_label = C3_point ?? C3_anchor;

  const C4_anchor = anchors["C4"];
  const C4_prep = resolveAnchorPoint(
    normalizeAnchor(C4_anchor),
    resolveAnchorCtx
  );
  const C4_point =
    C4_prep ??
    (C4_anchor &&
    typeof C4_anchor === "object" &&
    "coord" in C4_anchor &&
    (C4_anchor as { coord?: PathPoint }).coord
      ? (C4_anchor as { coord: PathPoint }).coord
      : (C4_anchor as PathPoint | null));
  const C4 = C4_anchor;

  const C5_anchor = anchors["C5"];
  const C5_prep = resolveAnchorPoint(
    normalizeAnchor(C5_anchor),
    resolveAnchorCtx
  );
  const C5_point =
    C5_prep ??
    (C5_anchor &&
    typeof C5_anchor === "object" &&
    "coord" in C5_anchor &&
    (C5_anchor as { coord?: PathPoint }).coord
      ? (C5_anchor as { coord: PathPoint }).coord
      : (C5_anchor as PathPoint | null));
  const C5 = C5_anchor;

  const C6_anchor = anchors["C6"];
  const C6_prep = resolveAnchorPoint(
    normalizeAnchor(C6_anchor),
    resolveAnchorCtx
  );
  const C6_point =
    C6_prep ??
    (C6_anchor &&
    typeof C6_anchor === "object" &&
    "coord" in C6_anchor &&
    (C6_anchor as { coord?: PathPoint }).coord
      ? (C6_anchor as { coord: PathPoint }).coord
      : (C6_anchor as PathPoint | null));
  const C6 = C6_anchor;

  const cueBall = balls.cue;
  const targetBall = resolveTargetBall(balls, targetColor);
  const impactCO =
    CO_prep ?? CO_rail ?? { x: cueBall?.x ?? 0, y: cueBall?.y ?? 0 };
  const impactC1 = C1_prep ?? C1_rail ?? impactCO;
  const impactTargetBall = targetBall;

  const impactRaw = calculateImpact(
    cueBall ?? balls.cue,
    impactTargetBall,
    impactCO,
    impactC1,
    thicknessForCalc || "1/2",
    shotPattern || "뒤돌리기",
    ballDiameterRg,
    ballRadiusRg
  );

  const c2Sem = anchorSemanticForPath(C2, resolveAnchorCtx);
  const c3Sem = C3_point ?? anchorSemanticForPath(C3_anchor, resolveAnchorCtx);
  const c4Sem = C4_point ?? anchorSemanticForPath(C4_anchor, resolveAnchorCtx);
  const c5Sem = C5_point ?? anchorSemanticForPath(C5_anchor, resolveAnchorCtx);
  const c6Sem = C6_point ?? anchorSemanticForPath(C6_anchor, resolveAnchorCtx);

  const C2_path =
    C1_rail && c2Sem ? firstRailHitTowardTarget(C1_rail, c2Sem) : null;
  const C3_path =
    C2_path && c3Sem ? firstRailHitTowardTarget(C2_path, c3Sem) : null;
  const C4_path =
    C3_path && c4Sem ? firstRailHitTowardTarget(C3_path, c4Sem) : null;
  const C5_path =
    C4_path && c5Sem ? firstRailHitTowardTarget(C4_path, c5Sem) : null;
  const C6_path =
    C5_path && c6Sem ? firstRailHitTowardTarget(C5_path, c6Sem) : null;

  const pathNodes: (PathPoint | null)[] = [
    CO_path0,
    C1_rail,
    C2_path,
    C3_path,
    C4_path,
    C5_path,
    C6_path,
  ];

  const secondPoint = resolveSecondBall(balls, targetColor);

  const capCorrected = resolveTrajectoryDisplayCap(
    pathNodes,
    secondPoint,
    hitTolerance
  );
  const cushionPath = slicePathNodesToCap(pathNodes, capCorrected);

  const calcImpactForContact = calcImpactBall(
    cueBall ?? balls.cue,
    impactTargetBall,
    adminState?.hpt?.T ?? "8/8"
  );
  const impactContactRg = balls.impact ?? calcImpactForContact;

  const corrections = slotRenderSys?.corrections ?? {};
  const corrBundleForCurve = {
    slide: corrections.slide ?? 0,
    draw: corrections.draw ?? 0,
  };
  const shotTypeForCurve = slotRenderSys?.shotType || "뒤돌리기";
  const unifiedSlideForCurve = unifiedSlideFromCorrections(
    corrBundleForCurve,
    shotTypeForCurve
  );

  const useCurveDeform =
    !!impactContactRg &&
    !!pathNodes[0] &&
    !!pathNodes[1] &&
    Math.abs(unifiedSlideForCurve) > curveEps;

  let cushionPathForRender: PathPoint[];
  if (useCurveDeform) {
    const curveSegment = createCurveSegment(
      impactContactRg,
      pathNodes[0]!,
      pathNodes[1]!,
      unifiedSlideForCurve
    );
    cushionPathForRender =
      curveSegment.length > 0
        ? [...curveSegment, ...cushionPath.slice(1)]
        : cushionPath;
  } else {
    cushionPathForRender = cushionPath;
  }

  return {
    corrected: {
      pathNodes,
      cushionPath,
      cushionPathForRender,
      cap: capCorrected,
      coLine: CO_path0,
      c1Line: C1_rail,
      useCurveDeform,
    },
    baseline: null,
    impact: {
      raw: impactRaw,
      contactRg: impactContactRg ?? null,
    },
    handles: {
      coRg: null,
      c1Rg: null,
    },
    labels: {
      anchorSources: {
        CO: labelPayload(CO_prep),
        C1: labelPayload(C1_prep),
        C2: labelPayload(C2),
        C3: labelPayload(C3_label ?? anchors["C3"]),
        C4: labelPayload(C4),
        C5: labelPayload(C5),
        C6: labelPayload(C6),
      },
    },
    meta: {
      trackForAnchors,
      systemIdForGrid,
      coPrep: CO_prep,
      c1Prep: C1_prep,
      coRail: CO_rail,
      c1Rail: C1_rail,
      reflectedDiagnostics: reflected?.diagnostics ?? null,
    },
  };
}
