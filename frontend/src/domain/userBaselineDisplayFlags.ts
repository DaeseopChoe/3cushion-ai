/**
 * @deprecated Use `userDisplayFlags.ts` — legacy 3-Level 기준값 토글.
 */
export {
  getUserDisplayFlags as getUserBaselineDisplayFlags,
  isUserDisplayModeActive as isUserBaselineLayersActive,
  type UserBaselineViewLevel,
} from "./userDisplayFlags";

/** @deprecated */
export const LEVEL_CORRECTED = 0 as const;
/** @deprecated */
export const LEVEL_BASELINE = 1 as const;
/** @deprecated */
export const LEVEL_ALL = 2 as const;

/** @deprecated */
export function cycleUserBaselineViewLevel(level: 0 | 1 | 2): 0 | 1 | 2 {
  return ((level + 1) % 3) as 0 | 1 | 2;
}
