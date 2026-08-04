/**
 * c2HandleModel.ts
 * ADMIN C2 Reflection Override handle display model (yellow dot at C2).
 */

import { toPx } from "../../utils/geometry/coords";
import type { TablePxConfig } from "./trajectoryPathAttrModel";

export type C2HandleCircleModel = {
  visible: boolean;
  cx: number;
  cy: number;
  r: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  className: string;
};

/** Match AnchorPoint / C3 marker size (not CO/C1 drag handle r=7). */
const HANDLE_RADIUS = 2.5;
const HANDLE_FILL = "#facc15";
const HANDLE_STROKE = "#a16207";
const HANDLE_STROKE_WIDTH = 1;
const HANDLE_OPACITY_IDLE = 0.95;
const HANDLE_OPACITY_DRAG = 1;

export type C2HandlePresentationContext = {
  appMode: string;
  /** Effective C2 Rg (override or reflected pathNodes[2]). */
  c2Rg: { x: number; y: number } | null;
  dragging: boolean;
};

/**
 * ADMIN-only yellow handle at C2. USER → null.
 * World→Screen matches baselineHandleModel (toPx + padding).
 */
export function buildC2HandleModel(
  ctx: C2HandlePresentationContext,
  config: TablePxConfig
): C2HandleCircleModel | null {
  if (ctx.appMode !== "ADMIN") return null;
  const rg = ctx.c2Rg;
  if (!rg || !Number.isFinite(rg.x) || !Number.isFinite(rg.y)) return null;

  const hp = toPx(rg, config.scale, config.tableH);
  return {
    visible: true,
    cx: hp.x + config.padding,
    cy: hp.y + config.padding,
    r: HANDLE_RADIUS,
    fill: HANDLE_FILL,
    stroke: HANDLE_STROKE,
    strokeWidth: HANDLE_STROKE_WIDTH,
    opacity: ctx.dragging ? HANDLE_OPACITY_DRAG : HANDLE_OPACITY_IDLE,
    className: ctx.dragging
      ? "c2-rail-handle c2-rail-handle--dragging"
      : "c2-rail-handle",
  };
}
