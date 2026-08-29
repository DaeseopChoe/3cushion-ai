/**
 * PHASE 1 — StrategyEntry → slot draft.sys SSOT (full hydrate incl. outputs.result).
 */

import type { PositionRecord, StrategyEntry, StrategySysCorrections } from "./positionSearchEngine";
import { mergeCorrections } from "./canonicalStrategy";
import { familyIdentityPersistPatch } from "./family/familyIdentity";
import { hydrateFamilyMemberRuntimeHpt } from "./family/familyRuntimeProjection";
import { hydrateSysFromStrategyEntry } from "./strategyHydrate";
import type { SlotDraftSys } from "./slotSysResolve";

export type { SlotDraftSys, SlotDraftSysSlice } from "./slotSysResolve";
export {
  hasRenderableOutputsResult,
  resolveSlotSysForRender,
} from "./slotSysResolve";

/**
 * Canonical entry → full slot.sys (never inputs-only partial).
 */
export function strategyEntryToSlotDraftSys(entry: StrategyEntry): SlotDraftSys {
  const hydrated = hydrateSysFromStrategyEntry(entry);
  return {
    systemId: hydrated.systemId,
    track: hydrated.track,
    inputs: hydrated.inputs,
    outputs: hydrated.outputs,
  };
}

/**
 * Family-native hydrate: AUTHORED/legacy hpT unchanged; opposite-handedness (SYMMETRY or DERIVED_*)
 * gets handedness-resolved runtime HPT. Does not persist the resolved value.
 */
export function runtimeHptFromStrategyEntry(
  entry: StrategyEntry,
  dataset?: PositionRecord[]
): unknown {
  return hydrateFamilyMemberRuntimeHpt(entry, dataset);
}

export function draftFamilyIdentityFromStrategyEntry(entry: StrategyEntry): {
  familyId?: string;
  memberId?: string;
  memberOrigin?: StrategyEntry["memberOrigin"];
  generatedFromMemberId?: string;
  symmetryOp?: StrategyEntry["symmetryOp"];
} {
  return familyIdentityPersistPatch(entry);
}

/** Per-slot runtime fields stored on draft/applied (corrections, shotType, system_values, extensions). */
export function draftRuntimeFieldsFromStrategyEntry(entry: StrategyEntry): {
  corrections: StrategySysCorrections;
  shotType?: string;
  system_values: Record<string, number>;
  trajectoryExtensions?: StrategyEntry["trajectoryExtensions"];
  reflectionOverride?: StrategyEntry["reflectionOverride"];
} {
  const hydrated = hydrateSysFromStrategyEntry(entry);
  const sigShot = entry.signature?.shotType;
  const shotType =
    sigShot && sigShot !== "default" && sigShot !== "_"
      ? sigShot
      : undefined;
  const out: {
    corrections: StrategySysCorrections;
    shotType?: string;
    system_values: Record<string, number>;
    trajectoryExtensions?: StrategyEntry["trajectoryExtensions"];
    reflectionOverride?: StrategyEntry["reflectionOverride"];
  } = {
    corrections: mergeCorrections(entry.corrections ?? hydrated.corrections),
    shotType,
    system_values: { ...hydrated.system_values },
  };
  if (entry.trajectoryExtensions) {
    out.trajectoryExtensions = entry.trajectoryExtensions;
  }
  if (entry.reflectionOverride) {
    out.reflectionOverride = entry.reflectionOverride;
  }
  return out;
}
