/**
 * Single SSOT: StrategyEntry → base sys inputs / system_values / derived outputs (hydrate).
 */

import { SYSTEM_PROFILES } from "../data/systems";
import type { StrategyEntry } from "./positionSearchEngine";
import {
  defaultHydrateCalculate,
  hydrateSysFromStrategyEntryWithResolver,
  type HydratedSysFromEntry,
  type HydrateSysResolver,
} from "./strategyHydrateCore";

export type { HydratedSysFromEntry, HydrateSysResolver };
export {
  buildExprInputsFromBase,
  defaultHydrateCalculate,
  hydrateSysFromStrategyEntryWithResolver,
  normalizeHydrateSystemId,
} from "./strategyHydrateCore";

const defaultResolver: HydrateSysResolver = {
  getExpr: (systemId) => SYSTEM_PROFILES[systemId]?.formula?.expr,
  calculate: defaultHydrateCalculate,
};

export function hydrateSysFromStrategyEntry(entry: StrategyEntry): HydratedSysFromEntry {
  return hydrateSysFromStrategyEntryWithResolver(entry, defaultResolver);
}
