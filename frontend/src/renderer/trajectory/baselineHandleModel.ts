/**
 * baselineHandleModel.ts
 * RND-003 / AD-B5-11 — Baseline handle display model.
 *
 * Batch 6 STEP 6-3 (D-010): visibility from Contract flags (App-resolved).
 * No systemId / family / track hardcode. JSX mount remains App/Presentation.
 */

import type { TrajectoryBuildResult } from "../../domain/trajectory/trajectoryBuilder";
import { toPx } from "../../utils/geometry/coords";
import type { TablePxConfig } from "./trajectoryPathAttrModel";

export type BaselineHandleMark = "CO" | "C1";

export type BaselineHandleCircleModel = {
  visible: boolean;
  cx: number;
  cy: number;
  r: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  className: string;
  dataHandleAttr: "co" | "c1";
};

export type BaselineHandleModel = {
  co: BaselineHandleCircleModel | null;
  c1: BaselineHandleCircleModel | null;
};

/** Draft overlay + UI flags (App orchestrator supplies; not Domain calc). */
export type BaselineHandlePresentationContext = {
  appMode: string;
  showBaseLine: boolean;
  draftCoRg: { x: number; y: number } | null;
  draftC1Rg: { x: number; y: number } | null;
  draggingMark: BaselineHandleMark | null;
};

/**
 * Contract-derived visibility flag from App injection hub.
 * App resolves TrajectoryContractView.baselineHandle + track match;
 * Renderer does not inspect systemId / family / track strings.
 */
export type BaselineHandleContractFlags = {
  enabled: boolean;
};

const HANDLE_RADIUS = 7;
const HANDLE_FILL = "#facc15";
const HANDLE_STROKE = "#a16207";
const HANDLE_STROKE_WIDTH = 1.5;
const HANDLE_OPACITY_IDLE = 0.85;
const HANDLE_OPACITY_DRAG = 1;

function isBaselineHandleLayerVisible(
  ctx: BaselineHandlePresentationContext,
  flags: BaselineHandleContractFlags
): boolean {
  return ctx.appMode === "ADMIN" && ctx.showBaseLine && flags.enabled;
}

function buildHandleCircle(
  mark: BaselineHandleMark,
  effectiveRg: { x: number; y: number } | null,
  layerVisible: boolean,
  draggingMark: BaselineHandleMark | null,
  config: TablePxConfig
): BaselineHandleCircleModel | null {
  if (!layerVisible) {
    return null;
  }
  if (
    !effectiveRg ||
    !Number.isFinite(effectiveRg.x) ||
    !Number.isFinite(effectiveRg.y)
  ) {
    return null;
  }

  const hp = toPx(effectiveRg, config.scale, config.tableH);
  const isCo = mark === "CO";

  return {
    visible: true,
    cx: hp.x + config.padding,
    cy: hp.y + config.padding,
    r: HANDLE_RADIUS,
    fill: HANDLE_FILL,
    stroke: HANDLE_STROKE,
    strokeWidth: HANDLE_STROKE_WIDTH,
    opacity: draggingMark === mark ? HANDLE_OPACITY_DRAG : HANDLE_OPACITY_IDLE,
    className: isCo ? "co-baseline-drag-handle" : "c1-baseline-drag-handle",
    dataHandleAttr: isCo ? "co" : "c1",
  };
}

/** TrajectoryBuildResult + presentation context + Contract flags → handle display model. */
export function buildBaselineHandleModel(
  result: TrajectoryBuildResult,
  ctx: BaselineHandlePresentationContext,
  config: TablePxConfig,
  baselineHandleFlags: BaselineHandleContractFlags
): BaselineHandleModel {
  const layerVisible = isBaselineHandleLayerVisible(ctx, baselineHandleFlags);

  const coEffective = ctx.draftCoRg ?? result.handles.coRg;
  const c1Effective = ctx.draftC1Rg ?? result.handles.c1Rg;

  return {
    co: buildHandleCircle(
      "CO",
      coEffective,
      layerVisible,
      ctx.draggingMark,
      config
    ),
    c1: buildHandleCircle(
      "C1",
      c1Effective,
      layerVisible,
      ctx.draggingMark,
      config
    ),
  };
}
