/**
 * USER Search result — canonical strategy display slot resolution.
 *
 * Search 직후 표시 슬롯은 session activeSlot에 의존하지 않는다.
 * record.strategies에서 S1 → S2 → S3 순으로 첫 존재 슬롯을 선택한다.
 *
 * Search 이후 사용자가 공략 버튼으로 S1/S2/S3를 명시 선택하는 것은
 * activateStrategySlot() 경로로 별도 처리한다.
 */

import type { PositionRecord } from "./positionSearchEngine";

export const USER_STRATEGY_SLOT_IDS = ["S1", "S2", "S3"] as const;
export type UserStrategySlotId = (typeof USER_STRATEGY_SLOT_IDS)[number];

/** Grep dist bundle for this string to verify Mobile loads Working Tree artifact. */
export const USER_SEARCH_DISPLAY_SLOT_BUILD_MARKER =
  "3cushion-user-search-slot-canonical-s1-wt-20260901";

/**
 * Deterministic canonical display slot for a matched PositionRecord.
 * Ignores pre-search session activeSlot (FDP-A fix).
 */
export function resolveCanonicalUserSearchDisplaySlotId(
  record: PositionRecord | null | undefined
): UserStrategySlotId | null {
  const strategies = record?.strategies;
  if (!strategies || typeof strategies !== "object") return null;
  for (const slotId of USER_STRATEGY_SLOT_IDS) {
    if (strategies[slotId]) return slotId;
  }
  return null;
}
