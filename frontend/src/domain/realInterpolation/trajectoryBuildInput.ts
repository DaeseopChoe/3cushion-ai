/**
 * Thin RI result → existing buildTrajectory input packaging.
 * No SYS/Modal re-interpolation; App supplies runtime trajectory context.
 */

import { strategyEntryToSlotDraftSys } from "../slotDraftFromEntry";
import type { TrajectoryBuildInput } from "../trajectory/trajectoryBuilder";
import { projectRealInterpolationResultToStrategyEntry } from "./strategySlotHydrate";
import type { RealInterpolationStrategyResult } from "./types";

/** App-owned snapshot of the same fields used for USER render buildTrajectory. */
export type RealInterpolationTrajectoryAppContext = Omit<
  TrajectoryBuildInput,
  "balls" | "slotRenderSys" | "baseSysValues"
> & {
  balls?: TrajectoryBuildInput["balls"];
  slotRenderSys?: TrajectoryBuildInput["slotRenderSys"];
  baseSysValues?: TrajectoryBuildInput["baseSysValues"];
};

/**
 * Package RI engine result for existing buildTrajectory.
 * Returns null → caller must skip Builder (fail-closed, no fake trajectory).
 */
export function buildRealInterpolationTrajectoryBuildInput(
  result: RealInterpolationStrategyResult | null | undefined,
  appCtx: RealInterpolationTrajectoryAppContext | null | undefined
): TrajectoryBuildInput | null {
  if (!appCtx || typeof appCtx !== "object") return null;

  const projection = projectRealInterpolationResultToStrategyEntry(result);
  if (!projection.ok) return null;

  const slotRenderSys = strategyEntryToSlotDraftSys(projection.entry);
  const ballsQuery = result!.ballsQuery;
  if (
    !ballsQuery ||
    typeof ballsQuery !== "object" ||
    !ballsQuery.cue ||
    !ballsQuery.target ||
    !ballsQuery.second
  ) {
    return null;
  }

  const baseSysValues = {
    ...(slotRenderSys.inputs ?? {}),
    ...(slotRenderSys.outputs?.result ?? {}),
  };

  const primaryHpT = projection.entry.hpT;
  const adminState =
    primaryHpT != null
      ? {
          ...(appCtx.adminState ?? {}),
          hpt: primaryHpT as NonNullable<TrajectoryBuildInput["adminState"]>["hpt"],
        }
      : appCtx.adminState;

  return {
    ...appCtx,
    balls: {
      cue: ballsQuery.cue,
      target: ballsQuery.target,
      target_center: ballsQuery.target,
      second: ballsQuery.second,
    },
    slotRenderSys,
    baseSysValues,
    adminState: adminState ?? null,
  };
}
