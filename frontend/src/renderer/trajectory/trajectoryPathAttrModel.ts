/**
 * trajectoryPathAttrModel.ts
 * RND-003 / AD-B5-09 — SVG path attribute display model.
 *
 * TrajectoryBuildResult (Rg) → px polyline attr strings.
 * Renderer only; no trajectory calculation.
 */

import type { TrajectoryBuildResult } from "../../domain/trajectory/trajectoryBuilder";
import { toPx } from "../../utils/geometry/coords";

export type PathPoint = { x: number; y: number };

export type TablePxConfig = {
  scale: number;
  tableH: number;
  padding: number;
};

export type TrajectoryPathAttrModel = {
  cushionPathAttrRaw: string;
  cushionPathAttrBase: string | null;
  cushionPathRgSnapshot: PathPoint[];
};

/** Rg path → SVG points attribute string. */
export function rgPathToAttrString(
  path: PathPoint[] | null | undefined,
  config: TablePxConfig
): string | null {
  if (!path || path.length === 0) {
    return null;
  }
  return path
    .map((pt) => {
      const p = toPx(pt, config.scale, config.tableH);
      return `${p.x + config.padding},${p.y + config.padding}`;
    })
    .join(" ");
}

function copyRgPath(path: PathPoint[]): PathPoint[] {
  return path.map((p) =>
    p && typeof p.x === "number" && typeof p.y === "number"
      ? { x: p.x, y: p.y }
      : p
  );
}

/** TrajectoryBuildResult → path attr display model (INV-B5-06). */
export function buildTrajectoryPathAttrModel(
  result: TrajectoryBuildResult,
  config: TablePxConfig
): TrajectoryPathAttrModel {
  const cushionPathForRender = result.corrected.cushionPathForRender;
  const cushionPathAttrRaw =
    rgPathToAttrString(cushionPathForRender, config) ?? "";
  const cushionPathAttrBase = result.baseline?.cushionPath
    ? rgPathToAttrString(result.baseline.cushionPath, config)
    : null;

  return {
    cushionPathAttrRaw,
    cushionPathAttrBase,
    cushionPathRgSnapshot: copyRgPath(cushionPathForRender),
  };
}
