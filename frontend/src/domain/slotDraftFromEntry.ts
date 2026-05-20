/**
 * PHASE 1 — StrategyEntry → slot draft.sys SSOT (full hydrate incl. outputs.result).
 */

import type { StrategyEntry } from "./positionSearchEngine";
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
