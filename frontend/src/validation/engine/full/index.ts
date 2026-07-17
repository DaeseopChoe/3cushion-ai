/**
 * validation/engine/full/index.ts
 * STEP6-9 — Full Validation barrel.
 */

export {
  FULL_CATALOG,
  FULL_REGISTER,
  FULL_RUN_ID,
  FULL_TARGET_SYSTEM_ID,
} from "./fullDataset";
export { SystemPackageRuleJudge } from "./SystemPackageRuleJudge";
export type { SystemPackageFiles } from "./SystemPackageRuleJudge";
export { loadFiveHalfTarget } from "./loadFiveHalfTarget";
export { runFullValidation } from "./runFullValidation";
export type { FullValidationResult } from "./runFullValidation";
