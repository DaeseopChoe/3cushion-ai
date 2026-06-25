import {
  findNearestPositions,
  listStrategiesInRecord,
  type Ball3,
  type PositionRecord,
  type StrategyEntry,
  type StrategySignature,
} from "./positionSearchEngine";

/**
 * Dataset
 */
export type Dataset = PositionRecord[];

/**
 * StrategyEngine options
 */
export type RecommendOptions = {
  signature?: StrategySignature;
  topK?: number;
};

// Re-export for consumers
export type { Ball3, PositionRecord, StrategyEntry, StrategySignature };

/**
 * Filter strategies by signature
 */
function filterStrategiesBySignature(
  strategies: StrategyEntry[],
  signature?: StrategySignature
) {
  if (!signature) return strategies;

  return strategies.filter((s) => {
    return (
      s.signature.systemId === signature.systemId &&
      s.signature.formulaHash === signature.formulaHash &&
      s.signature.shotType === signature.shotType
    );
  });
}

/**
 * ADMIN MODE
 * 가장 가까운 PositionRecord 그대로 반환
 */
export function recommendForAdmin(
  balls: Ball3,
  dataset: Dataset
): PositionRecord | null {
  const nearest = findNearestPositions(balls, dataset, 1);

  if (!nearest || nearest.length === 0) return null;

  return nearest[0];
}

/**
 * USER MODE
 * 전략 3개 추천 (S1 S2 S3)
 */
export function recommendForUser(
  balls: Ball3,
  dataset: Dataset,
  options: RecommendOptions = {}
): StrategyEntry[] {
  const { signature, topK = 3 } = options;

  const nearestPositions = findNearestPositions(balls, dataset, topK);

  if (!nearestPositions || nearestPositions.length === 0) return [];

  const collected: StrategyEntry[] = [];

  for (const pos of nearestPositions) {
    const filtered = filterStrategiesInRecord(pos, signature);
    collected.push(...filtered);
  }

  const slotMap: Record<string, StrategyEntry> = {};

  for (const s of collected) {
    if (!slotMap[s.slot]) {
      slotMap[s.slot] = s;
    }
  }

  return ["S1", "S2", "S3"]
    .map((slot) => slotMap[slot])
    .filter(Boolean) as StrategyEntry[];
}

/**
 * FUTURE: interpolation
 */
export function recommendWithInterpolation(balls: Ball3, dataset: Dataset) {
  const nearest = findNearestPositions(balls, dataset, 3);

  return {
    basePositions: nearest,
    interpolated: null,
  };
}
