/**
 * baselineHandleGeometry.ts
 * APP-009-B (Batch 5 STEP 5-5B) — Baseline Handle Geometry SSOT.
 *
 * Domain pure geometry: Rg ↔ SYS handle forward/inverse.
 * No React, no state, no flow, no renderer.
 */

import { getAnchorCoordFromSys } from "../anchorLookupEngine";
import { getLabelNumericSuffix } from "../anchorCoordinateEngine";
import {
  computeRailImpactPoint,
  normalizeAnchor,
  resolveAnchorPoint,
} from "../../utils/geometry/anchorResolve";
import { coStartForCushionPath } from "./pathNodeHelpers";

export type BaselineHandleMark = "CO" | "C1";

export type RgPoint = { x: number; y: number };

export type BaselineLabelSlotSnapshot = {
  CO_f: number | null;
  C1_f: number | null;
};

/** SYS → 앵커 prep (baseline handle forward 체인용) */
function baselineAnchorPrepFromSys(
  mark: BaselineHandleMark,
  sysValue: number,
  track: string,
  systemId: string
): RgPoint | null {
  if (!Number.isFinite(sysValue) || !track || !systemId) return null;
  const sysFieldKey = mark === "CO" ? "CO_f" : "C1_f";
  const hit = getAnchorCoordFromSys({
    systemId,
    track,
    mark,
    sysValue,
    sysFieldKey,
  });
  if (!hit) return null;
  return resolveAnchorPoint(
    normalizeAnchor(hit),
    { track, systemId, mark }
  );
}

/**
 * Handle Position SSOT forward: slot CO_f/C1_f → baseline 노란 핸들 Rg.
 * cushionPathBaselineRg[0/1]과 동일 체인 (computeRailImpactPoint + coStartForCushionPath).
 */
export function baselineForwardHandleRg(
  activeMark: BaselineHandleMark,
  coF: number,
  c1F: number,
  track: string,
  systemId: string
): RgPoint | null {
  if (
    !Number.isFinite(coF) ||
    !Number.isFinite(c1F) ||
    !track ||
    !systemId
  ) {
    return null;
  }
  const ctx = { track, systemId };
  const coPrep = baselineAnchorPrepFromSys("CO", coF, track, systemId);
  const c1Prep = baselineAnchorPrepFromSys("C1", c1F, track, systemId);
  if (!coPrep || !c1Prep) return null;

  if (activeMark === "CO") {
    const coRail = computeRailImpactPoint(coPrep, c1Prep, { ...ctx, mark: "CO" });
    return coStartForCushionPath(coRail, coPrep, c1Prep);
  }
  if (activeMark === "C1") {
    return computeRailImpactPoint(coPrep, c1Prep, { ...ctx, mark: "C1" });
  }
  return null;
}

function baselineHandleRgDistance(
  a: RgPoint | null | undefined,
  b: RgPoint | null | undefined
): number {
  if (
    !a ||
    !b ||
    !Number.isFinite(a.x) ||
    !Number.isFinite(a.y) ||
    !Number.isFinite(b.x) ||
    !Number.isFinite(b.y)
  ) {
    return Infinity;
  }
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Handle Position SSOT inverse: 핸들 Rg → CO_f 또는 C1_f.
 * Forward와 동일한 computeRailImpactPoint(+coStart) 체인으로 역탐색.
 */
export function baselineSysFromHandleRg(
  activeMark: BaselineHandleMark,
  handleRg: RgPoint,
  partnerSys: number,
  track: string,
  systemId: string,
  slotSysForMark: number | null | undefined
): number | null {
  if (
    !handleRg ||
    !Number.isFinite(handleRg.x) ||
    !Number.isFinite(handleRg.y) ||
    !Number.isFinite(partnerSys) ||
    !track ||
    !systemId
  ) {
    return null;
  }

  if (Number.isFinite(slotSysForMark)) {
    const slotCo = activeMark === "CO" ? slotSysForMark! : partnerSys;
    const slotC1 = activeMark === "C1" ? slotSysForMark! : partnerSys;
    const slotHandle = baselineForwardHandleRg(
      activeMark,
      slotCo,
      slotC1,
      track,
      systemId
    );
    if (baselineHandleRgDistance(slotHandle, handleRg) < 0.02) {
      return slotSysForMark!;
    }
  }

  let bestSys: number | null = null;
  let bestDist = Infinity;

  for (let s = 0; s <= 90; s += 0.05) {
    const trialCo = activeMark === "CO" ? s : partnerSys;
    const trialC1 = activeMark === "C1" ? s : partnerSys;
    const candidate = baselineForwardHandleRg(
      activeMark,
      trialCo,
      trialC1,
      track,
      systemId
    );
    const d = baselineHandleRgDistance(candidate, handleRg);
    if (d < bestDist) {
      bestDist = d;
      bestSys = s;
    }
  }

  if (bestSys == null) return null;

  const refineLo = Math.max(0, bestSys - 0.5);
  const refineHi = Math.min(90, bestSys + 0.5);
  for (let s = refineLo; s <= refineHi; s += 0.002) {
    const trialCo = activeMark === "CO" ? s : partnerSys;
    const trialC1 = activeMark === "C1" ? s : partnerSys;
    const candidate = baselineForwardHandleRg(
      activeMark,
      trialCo,
      trialC1,
      track,
      systemId
    );
    const d = baselineHandleRgDistance(candidate, handleRg);
    if (d < bestDist) {
      bestDist = d;
      bestSys = s;
    }
  }

  return bestSys;
}

export function baselinePartnerAndSlotSys(
  activeMark: BaselineHandleMark,
  snapshot: BaselineLabelSlotSnapshot | undefined,
  labelSsotValues: unknown
): { partnerSys: number | null; slotSysForMark: number | null } {
  const coSlot =
    snapshot?.CO_f ?? getLabelNumericSuffix("CO", labelSsotValues);
  const c1Slot =
    snapshot?.C1_f ?? getLabelNumericSuffix("C1", labelSsotValues);
  if (activeMark === "CO") {
    return {
      partnerSys: c1Slot,
      slotSysForMark: coSlot,
    };
  }
  return {
    partnerSys: coSlot,
    slotSysForMark: c1Slot,
  };
}

export function baselineSysValueFromHandleRg(
  activeMark: BaselineHandleMark,
  handleRg: RgPoint,
  track: string,
  systemId: string,
  snapshot: BaselineLabelSlotSnapshot,
  labelSsotValues: unknown
): number | null {
  const { partnerSys, slotSysForMark } = baselinePartnerAndSlotSys(
    activeMark,
    snapshot,
    labelSsotValues
  );
  if (!Number.isFinite(partnerSys)) return null;
  return baselineSysFromHandleRg(
    activeMark,
    handleRg,
    partnerSys!,
    track,
    systemId,
    slotSysForMark
  );
}
