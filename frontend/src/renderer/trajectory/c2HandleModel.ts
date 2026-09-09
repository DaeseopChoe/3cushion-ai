/**
 * ADMIN C2 rail handle — active-trajectory C2 ownership SSOT.
 *
 * Handle display XY and drag seed (c2HandleRgRef) share one owner:
 *   Baseline active  → baseline.pathNodes[2]
 *   Corrected active → corrected.pathNodes[2]
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

export type PathNodeLike = { x: number; y: number } | null | undefined;

/** ADMIN table path branch currently shown / edited. */
export type ActiveC2TrajectoryBranch = "baseline" | "corrected";

function isFiniteRg(
  p: PathNodeLike
): p is { x: number; y: number } {
  return (
    !!p &&
    typeof p.x === "number" &&
    typeof p.y === "number" &&
    Number.isFinite(p.x) &&
    Number.isFinite(p.y)
  );
}

/**
 * Active C2 handle owner — single SSOT for display + drag seed.
 * Prefer active branch pathNodes[2]; fallback override point only.
 */
export function resolveActiveC2HandleRg(input: {
  active: ActiveC2TrajectoryBranch;
  baselinePathNodes: PathNodeLike[] | null | undefined;
  correctedPathNodes: PathNodeLike[] | null | undefined;
  overridePoint: PathNodeLike;
}): { x: number; y: number } | null {
  const activeNodes =
    input.active === "baseline"
      ? input.baselinePathNodes
      : input.correctedPathNodes;
  const node = activeNodes?.[2];
  if (isFiniteRg(node)) {
    return { x: node.x, y: node.y };
  }
  if (isFiniteRg(input.overridePoint)) {
    return { x: input.overridePoint.x, y: input.overridePoint.y };
  }
  return null;
}

/**
 * @deprecated Use resolveActiveC2HandleRg — kept as thin alias for baseline-active call sites.
 */
export function resolveC2HandleDisplayRg(input: {
  baselinePathNodes: PathNodeLike[] | null | undefined;
  overridePoint: PathNodeLike;
  correctedPathNodes?: PathNodeLike[] | null | undefined;
  active?: ActiveC2TrajectoryBranch;
}): { x: number; y: number } | null {
  return resolveActiveC2HandleRg({
    active: input.active ?? "baseline",
    baselinePathNodes: input.baselinePathNodes,
    correctedPathNodes: input.correctedPathNodes ?? null,
    overridePoint: input.overridePoint,
  });
}

export type C2HandlePresentationContext = {
  appMode: string;
  /** Active-trajectory C2 Rg (see resolveActiveC2HandleRg). */
  c2Rg: { x: number; y: number } | null;
  dragging: boolean;
};

/**
 * ADMIN-only yellow handle at active-trajectory C2. USER → null.
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
