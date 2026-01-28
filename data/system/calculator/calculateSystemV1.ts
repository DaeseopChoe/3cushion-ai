// data/system/calculator/calculateSystemV1.ts

import { SystemCalcInputV1, SystemCalcOutputV1 } from "./types";
import { getSystemCalculator, getSystemProfile } from "./registry";

/**
 * SYS v1 자동 계산 엔진 (단일 진입점)
 * 
 * @param input - 관리자 입력값 (앵커, 보정값 등)
 * @returns 계산 결과 (값, 앵커, breakdown, debug)
 * 
 * @example
 * const result = calculateSystemV1({
 *   system_id: "5_HALF",
 *   system_version: "v1",
 *   anchors_input: { CO: {...}, C1: {...}, C3: {...} },
 *   hpt: { T: "+3/8" },
 *   corrections: { curve_ratio: 5, slide: 0, draw: 0, departure: 0 }
 * });
 * 
 * console.log(result.values.C1_sys); // 1쿠션 계산값
 */
export function calculateSystemV1(
  input: SystemCalcInputV1
): SystemCalcOutputV1 {
  // 1️⃣ 시스템 프로필 조회
  const profile = getSystemProfile(input.system_id);
  
  // 2️⃣ 시스템 계산기 조회
  const calculator = getSystemCalculator(input.system_id);
  
  // 3️⃣ 계산 실행
  const result = calculator.calculate(input, profile);
  
  // 4️⃣ Capability 기반 검증 및 정리
  
  // 2쿠션 값 검증
  if (!profile.capabilities.uses2C && result.values.C2_sys !== undefined) {
    console.warn(
      `[calculateSystemV1] ${input.system_id} doesn't use C2_sys ` +
      `but it was calculated. Removing it.`
    );
    delete result.values.C2_sys;
  }
  
  if (profile.capabilities.uses2C && result.values.C2_sys === undefined) {
    throw new Error(
      `[calculateSystemV1] ${input.system_id} requires C2_sys ` +
      `but it was not calculated.`
    );
  }
  
  // 착점 값 검증
  if (!profile.capabilities.usesArrival && result.values.arrival_sys !== undefined) {
    console.warn(
      `[calculateSystemV1] ${input.system_id} doesn't use arrival_sys ` +
      `but it was calculated. Removing it.`
    );
    delete result.values.arrival_sys;
  }
  
  // 5️⃣ 반환
  return result;
}
