/**
 * baselineHandleModel.ts
 * RND-003 / AD-B5-11 — Baseline handle display model.
 *
 * TrajectoryBuildResult.handles + presentation context → render model.
 * JSX mount remains App/Presentation; no geometry calculation.
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

const HANDLE_RADIUS = 7;
const HANDLE_FILL = "#facc15";
const HANDLE_STROKE = "#a16207";
const HANDLE_STROKE_WIDTH = 1.5;
const HANDLE_OPACITY_IDLE = 0.85;
const HANDLE_OPACITY_DRAG = 1;

/** D-010 interim: 5½ + B2T guard encapsulated as visibility flag. */
function isBaselineHandleLayerVisible(
  ctx: BaselineHandlePresentationContext,
  systemIdForGrid: string | undefined,
  trackForAnchors: string | undefined
): boolean {
  return (
    ctx.appMode === "ADMIN" &&
    ctx.showBaseLine &&
    systemIdForGrid === "5_half_system" &&
    !!trackForAnchors?.startsWith("B2T")
  );
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

/** TrajectoryBuildResult + presentation context → handle display model. */
export function buildBaselineHandleModel(
  result: TrajectoryBuildResult,
  ctx: BaselineHandlePresentationContext,
  config: TablePxConfig
): BaselineHandleModel {
  const layerVisible = isBaselineHandleLayerVisible(
    ctx,
    result.meta.systemIdForGrid,
    result.meta.trackForAnchors
  );

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
