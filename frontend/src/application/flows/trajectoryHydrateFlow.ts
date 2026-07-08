/**
 * trajectoryHydrateFlow.ts
 * AD-B5-07 (Batch 5 STEP 5-7A) — Slot → adminState + trajectory phase hydrate.
 *
 * Application Flow: sequencing only (INV-B5-04).
 * No trajectory build, geometry, or renderer logic.
 */

import { adminSysShallowEqual } from "../../domain/adminSysFromSlot";
import {
  buildSlotRuntimePayload,
  type SlotRuntimeDraftSlice,
} from "../../domain/slotRuntimeHydrate";

export type TrajectoryHydrateTrajectoryApi = {
  setAdjusting: (data: {
    sys: { oneC: number; threeC: number };
  }) => void;
  applySysResult: (result: unknown) => void;
  resetTrajectory: () => void;
};

export type TrajectoryHydrateFlowContext = {
  slotId: string;
  slots: Record<string, SlotRuntimeDraftSlice | undefined>;
  setAdminState: (
    updater: (prev: Record<string, unknown>) => Record<string, unknown>
  ) => void;
  trajectory: TrajectoryHydrateTrajectoryApi;
};

/** sys/hpt/str/ai + trajectory phase — targetColor / isTargetSelected untouched. */
export function runTrajectoryHydrate(ctx: TrajectoryHydrateFlowContext): void {
  const payload = buildSlotRuntimePayload(ctx.slots[ctx.slotId]);

  ctx.setAdminState((prev) => {
    const nextSys = payload.adminSys;
    console.log("[SYNC_ADMIN_SYS]", {
      prevShotType: (prev.sys as { shotType?: string } | undefined)?.shotType,
      nextShotType: nextSys?.shotType,
      nextSys,
    });
    if (adminSysShallowEqual(prev.sys, nextSys)) {
      return {
        ...prev,
        hpt: payload.hpt,
        str: payload.str,
        ai: payload.ai,
      };
    }
    return {
      ...prev,
      hpt: payload.hpt,
      str: payload.str,
      ai: payload.ai,
      sys: nextSys,
    };
  });

  const result = payload.trajectoryResult;
  const hasTraj =
    result &&
    (typeof result.oneC === "number" || typeof result.threeC === "number");

  if (hasTraj) {
    ctx.trajectory.setAdjusting({
      sys: {
        oneC: Number(result.oneC) || 0,
        threeC: Number(result.threeC) || 0,
      },
    });
    ctx.trajectory.applySysResult(result);
  } else {
    ctx.trajectory.resetTrajectory();
  }
}
