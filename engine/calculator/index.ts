// data/system/calculator/index.ts

/* ===============================
 * 단일 진입점 export
 * =============================== */
export { calculateSystemV1 } from "./calculateSystemV1";

/* ===============================
 * 타입 export
 * =============================== */
export type {
  Point,
  SystemCalcInputV1,
  SystemCalcOutputV1,
  SystemProfile,
  SystemCalculator,
  CalculationStep
} from "./types";

/* ===============================
 * 레지스트리 유틸 export
 * =============================== */
export {
  getSystemProfile,
  getSystemCalculator,
  getRegisteredSystemIds,
  isSystemRegistered
} from "./registry";

/* ===============================
 * 공통 유틸 export (필요 시)
 * =============================== */
export {
  distance,
  clonePoint,
  roundSystemValue,
  formatNumber
} from "./base";
