/**
 * StrategyEntry hydrate (no SYSTEM_PROFILES import — safe for tsx unit tests).
 */

import { calculateByProfileExpr } from "../utils/systemCalculator";
import type { StrategyEntry, StrategySysCorrections } from "./positionSearchEngine";
import { mergeCorrections, stripRuntimeSysInputs } from "./canonicalStrategy";

export type HydratedSysFromEntry = {
  systemId: string;
  track: string;
  inputs: Record<string, number>;
  system_values: Record<string, number>;
  outputs: { result: Record<string, number> };
  corrections: StrategySysCorrections;
};

export type HydrateSysResolver = {
  getExpr: (systemId: string) => string | undefined;
  calculate: (
    expr: string,
    inputs: Record<string, number>
  ) => Record<string, number>;
};

export const defaultHydrateCalculate = calculateByProfileExpr;

export function normalizeHydrateSystemId(systemId: string | undefined | null): string {
  if (systemId === "5_HALF") return "5_half_system";
  return systemId ?? "5_half_system";
}

export function buildExprInputsFromBase(
  baseInputs: Record<string, number>
): Record<string, number> {
  const baseThreeC =
    typeof baseInputs.baseThreeC === "number"
      ? baseInputs.baseThreeC
      : typeof baseInputs.C3 === "number"
        ? baseInputs.C3
        : typeof baseInputs.C3_r === "number"
          ? baseInputs.C3_r
          : 0;
  const baseOneC =
    typeof baseInputs.baseOneC === "number"
      ? baseInputs.baseOneC
      : typeof baseInputs.CO === "number"
        ? baseInputs.CO
        : typeof baseInputs.CO_f === "number"
          ? baseInputs.CO_f
          : 0;
  return {
    ...baseInputs,
    baseThreeC,
    baseOneC,
    CO_f: typeof baseInputs.CO_f === "number" ? baseInputs.CO_f : baseOneC,
    C3_r: typeof baseInputs.C3_r === "number" ? baseInputs.C3_r : baseThreeC,
  };
}

/**
 * Hydrate canonical entry.sysInputs → stripped base + expr-derived outputs.result.
 */
export function hydrateSysFromStrategyEntryWithResolver(
  entry: StrategyEntry,
  resolve: HydrateSysResolver
): HydratedSysFromEntry {
  const systemId = normalizeHydrateSystemId(entry.signature?.systemId);
  const track = entry.track ?? "B2T_L";
  const inputs = stripRuntimeSysInputs(
    (entry.sysInputs ?? {}) as Record<string, unknown>
  );
  const system_values = { ...inputs };

  const expr = resolve.getExpr(systemId);
  const exprInputs = buildExprInputsFromBase(inputs);

  let calcResult: Record<string, number> = {};
  if (expr) {
    calcResult = resolve.calculate(expr, exprInputs);
  }

  return {
    systemId,
    track,
    inputs,
    system_values,
    outputs: { result: calcResult },
    corrections: mergeCorrections(entry.corrections),
  };
}
