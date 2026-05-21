/**
 * PHASE 1 — StrategyEntry → slot draft.sys SSOT (full hydrate incl. outputs.result).
 */

import type { StrategyEntry, StrategySysCorrections } from "./positionSearchEngine";
import { mergeCorrections } from "./canonicalStrategy";
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

/** Per-slot runtime fields stored on draft/applied (corrections, shotType, system_values). */
export function draftRuntimeFieldsFromStrategyEntry(entry: StrategyEntry): {
  corrections: StrategySysCorrections;
  shotType?: string;
  system_values: Record<string, number>;
} {
  const hydrated = hydrateSysFromStrategyEntry(entry);
  const sigShot = entry.signature?.shotType;
  const shotType =
    sigShot && sigShot !== "default" && sigShot !== "_"
      ? sigShot
      : undefined;
  return {
    corrections: mergeCorrections(entry.corrections ?? hydrated.corrections),
    shotType,
    system_values: { ...hydrated.system_values },
  };
}
