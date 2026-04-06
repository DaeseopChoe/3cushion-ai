import { groupSystemValuesByRail } from "./railEngine";

type Params = {
  strategy: unknown[];
  systemValues: Record<string, unknown> | { values?: Record<string, unknown> };
  anchors: Record<string, unknown>;
  lastCushion?: string;
};

export function runStrategyEngine({ strategy, systemValues, anchors, lastCushion }: Params) {
  const values = (systemValues && typeof systemValues === "object" && "values" in systemValues)
    ? (systemValues.values ?? systemValues)
    : (systemValues as Record<string, unknown>);

  const anchorsTyped = anchors as Record<string, { x: number; y: number } | undefined>;

  const railGroups = groupSystemValuesByRail(anchorsTyped, values as Record<string, unknown>, lastCushion);

  const processedStrategy = Array.isArray(strategy)
    ? strategy.map((item) => ({
        ...(item as Record<string, unknown>),
        system: values ?? {},
      }))
    : [];

  return { railGroups, processedStrategy };
}
