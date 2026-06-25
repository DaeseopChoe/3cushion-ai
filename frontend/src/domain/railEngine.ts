/**
 * 앵커 기반 레일 그룹핑
 * 시스템 값(CO, 1C, 2C 등)을 레일 방향별로 분류
 */
export function groupSystemValuesByRail(
  anchors: Record<string, { x: number; y: number } | undefined>,
  systemValues: Record<string, unknown> | undefined,
  lastCushion: string | undefined
): { BOTTOM: Array<{ mark: string; x?: number; y?: number; sys: unknown }>; TOP: Array<{ mark: string; x?: number; y?: number; sys: unknown }>; LEFT: Array<{ mark: string; x?: number; y?: number; sys: unknown }>; RIGHT: Array<{ mark: string; x?: number; y?: number; sys: unknown }> } {
  const groups = { BOTTOM: [] as Array<{ mark: string; x?: number; y?: number; sys: unknown }>, TOP: [] as Array<{ mark: string; x?: number; y?: number; sys: unknown }>, LEFT: [] as Array<{ mark: string; x?: number; y?: number; sys: unknown }>, RIGHT: [] as Array<{ mark: string; x?: number; y?: number; sys: unknown }> };
  if (!anchors || !systemValues) return groups;

  const markOrder = ["CO", "1C", "2C", "3C", "4C", "5C", "6C"];
  const lastIndex = markOrder.indexOf(lastCushion ?? "");
  const visibleMarks = lastIndex >= 0 ? markOrder.slice(0, lastIndex + 1) : markOrder;

  visibleMarks.forEach((mark) => {
    const coord = anchors[mark];
    if (!coord) return;
    const sys = systemValues?.[mark];
    if (sys == null) return;
    const { x, y } = coord;

    if (Math.abs(y - 0) < 0.5) groups.BOTTOM.push({ mark, x, sys });
    if (Math.abs(y - 40) < 0.5) groups.TOP.push({ mark, x, sys });
    if (Math.abs(x - 0) < 0.5) groups.LEFT.push({ mark, y, sys });
    if (Math.abs(x - 80) < 0.5) groups.RIGHT.push({ mark, y, sys });
  });

  return groups;
}

/**
 * 레일 그룹핑 + strategy에 system 값 붙이기
 * (기존 runStrategyEngine 로직, strategyEngine → railEngine 이전)
 */
export function buildRailGroupedStrategy(params: {
  strategy: unknown[];
  systemValues: Record<string, unknown> | { values?: Record<string, unknown> };
  anchors: Record<string, unknown>;
  lastCushion?: string;
}) {
  const { strategy, systemValues, anchors, lastCushion } = params;

  const values =
    systemValues && typeof systemValues === "object" && "values" in systemValues
      ? (systemValues.values ?? systemValues)
      : (systemValues as Record<string, unknown>);

  const anchorsTyped = anchors as Record<string, { x: number; y: number } | undefined>;
  const railGroups = groupSystemValuesByRail(
    anchorsTyped,
    values as Record<string, unknown>,
    lastCushion
  );

  const processedStrategy = Array.isArray(strategy)
    ? strategy.map((item) => ({
        ...(item as Record<string, unknown>),
        system: values ?? {},
      }))
    : [];

  return { railGroups, processedStrategy };
}
