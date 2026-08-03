/**
 * trajectoryExtensionRenderModel.ts
 * Rg → SVG display model for Trajectory Extension Overlay (P2-5).
 *
 * Renderer only — solid path + endpoint handle circles.
 * Drag lifecycle lives in overlay/state (not here).
 */

import { toPx } from "../../utils/geometry/coords";
import type { RgPoint } from "../../domain/trajectoryExtension/model";
import type { TrajectoryExtensionChainSegment } from "../../domain/trajectoryExtension/model";

export type TablePxConfig = {
  scale: number;
  tableH: number;
  padding: number;
};

/** Extension endpoint handle mark (1 = E1 end, 2 = E2 end). */
export type ExtensionHandleMark = 1 | 2;

export type ExtensionHandleCircleModel = {
  index: ExtensionHandleMark;
  id: string;
  cx: number;
  cy: number;
  r: number;
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  active: boolean;
};

export type TrajectoryExtensionRenderModel = {
  revealPointsAttr: string | null;
  extensionPolylines: Array<{
    id: string;
    index: 1 | 2;
    pointsAttr: string;
  }>;
  handles: ExtensionHandleCircleModel[];
};

/** Match CO/C1 baseline handle look (yellow joystick). */
const HANDLE_RADIUS = 7;
const HANDLE_FILL = "#facc15";
const HANDLE_STROKE = "#a16207";
const HANDLE_STROKE_WIDTH = 1.5;
const HANDLE_OPACITY_IDLE = 0.85;
const HANDLE_OPACITY_ACTIVE = 1;

function rgPathToAttrString(
  path: RgPoint[] | null | undefined,
  config: TablePxConfig
): string | null {
  if (!path || path.length < 2) {
    return null;
  }
  return path
    .map((pt) => {
      const p = toPx(pt, config.scale, config.tableH);
      return `${p.x + config.padding},${p.y + config.padding}`;
    })
    .join(" ");
}

function buildHandleCircle(
  segment: TrajectoryExtensionChainSegment,
  activeMark: ExtensionHandleMark | null,
  config: TablePxConfig
): ExtensionHandleCircleModel | null {
  const end = segment?.end;
  if (
    !end ||
    !Number.isFinite(end.x) ||
    !Number.isFinite(end.y) ||
    (segment.index !== 1 && segment.index !== 2)
  ) {
    return null;
  }
  const hp = toPx(end, config.scale, config.tableH);
  const active = activeMark === segment.index;
  return {
    index: segment.index,
    id: segment.id,
    cx: hp.x + config.padding,
    cy: hp.y + config.padding,
    r: HANDLE_RADIUS,
    fill: HANDLE_FILL,
    stroke: HANDLE_STROKE,
    strokeWidth: HANDLE_STROKE_WIDTH,
    opacity: active ? HANDLE_OPACITY_ACTIVE : HANDLE_OPACITY_IDLE,
    active,
  };
}

export function buildTrajectoryExtensionRenderModel(args: {
  revealPath: RgPoint[];
  segments: TrajectoryExtensionChainSegment[];
  tablePx: TablePxConfig;
  activeHandleMark?: ExtensionHandleMark | null;
  draggingHandleMark?: ExtensionHandleMark | null;
  showHandles?: boolean;
}): TrajectoryExtensionRenderModel {
  const extensionPolylines = (args.segments ?? [])
    .filter(
      (s) =>
        s &&
        Number.isFinite(s.start?.x) &&
        Number.isFinite(s.start?.y) &&
        Number.isFinite(s.end?.x) &&
        Number.isFinite(s.end?.y)
    )
    .map((s) => ({
      id: s.id,
      index: s.index,
      pointsAttr: rgPathToAttrString([s.start, s.end], args.tablePx) ?? "",
    }))
    .filter((p) => p.pointsAttr.length > 0);

  const showHandles = args.showHandles !== false;
  const activeMark = args.activeHandleMark ?? null;
  const draggingMark = args.draggingHandleMark ?? null;
  const handles = showHandles
    ? (args.segments ?? [])
        .map((s) => {
          const h = buildHandleCircle(s, activeMark, args.tablePx);
          if (!h) return null;
          if (draggingMark === s.index) {
            return { ...h, opacity: HANDLE_OPACITY_ACTIVE, active: true };
          }
          return h;
        })
        .filter((h): h is ExtensionHandleCircleModel => h != null)
    : [];

  return {
    revealPointsAttr: rgPathToAttrString(args.revealPath, args.tablePx),
    extensionPolylines,
    handles,
  };
}
