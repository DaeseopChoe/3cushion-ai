/**
 * Single SSOT: StrategyEntry → base sys inputs / system_values / derived outputs (hydrate).
 * Batch 6 STEP 6-5: formulaExpr via Contract supply (D-006 Domain Closed).
 */

import type { StrategyEntry } from "./positionSearchEngine";
import { resolveDomainFormulaExpr } from "./runtimeContractSupply";
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
  getExpr: (systemId) => resolveDomainFormulaExpr(systemId) ?? undefined,
  calculate: defaultHydrateCalculate,
};

export function hydrateSysFromStrategyEntry(entry: StrategyEntry): HydratedSysFromEntry {
  return hydrateSysFromStrategyEntryWithResolver(entry, defaultResolver);
}
