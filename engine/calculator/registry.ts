// data/system/calculator/registry.ts

import { SystemCalculator, SystemProfile } from "./types";
import { FiveAndHalfCalculator } from "./systems/five_and_half";

/* ===============================
 * 시스템 프로필 정의
 * =============================== */

const SYSTEM_PROFILES: Record<string, SystemProfile> = {
  "5_HALF": {
    id: "5_HALF",
    display_name: {
      ko: "5&half 시스템",
      en: "5&half System"
    },
    capabilities: {
      uses2C: false,            // 5&half는 2쿠션 값 사용 안 함
      usesArrival: true,        // 최종 착점 계산
      requiresC4Plus: false,    // C4 이상 앵커 불필요
      supportsRailFirst: false  // 레일 퍼스트 미지원
    }
  }
  // 추가 시스템 프로필은 여기에 등록
};

/* ===============================
 * 시스템 계산기 인스턴스
 * =============================== */

const SYSTEM_CALCULATORS: Record<string, SystemCalculator> = {
  "5_HALF": new FiveAndHalfCalculator()
  // 추가 시스템 계산기는 여기에 등록
};

/* ===============================
 * 레지스트리 접근 함수
 * =============================== */

/**
 * 시스템 프로필 조회
 */
export function getSystemProfile(system_id: string): SystemProfile {
  const profile = SYSTEM_PROFILES[system_id];
  
  if (!profile) {
    throw new Error(
      `System profile not found: ${system_id}. ` +
      `Available systems: ${Object.keys(SYSTEM_PROFILES).join(", ")}`
    );
  }
  
  return profile;
}

/**
 * 시스템 계산기 조회
 */
export function getSystemCalculator(system_id: string): SystemCalculator {
  const calculator = SYSTEM_CALCULATORS[system_id];
  
  if (!calculator) {
    throw new Error(
      `System calculator not found: ${system_id}. ` +
      `Available calculators: ${Object.keys(SYSTEM_CALCULATORS).join(", ")}`
    );
  }
  
  return calculator;
}

/**
 * 등록된 모든 시스템 ID 목록
 */
export function getRegisteredSystemIds(): string[] {
  return Object.keys(SYSTEM_PROFILES);
}

/**
 * 시스템 등록 여부 확인
 */
export function isSystemRegistered(system_id: string): boolean {
  return system_id in SYSTEM_PROFILES && system_id in SYSTEM_CALCULATORS;
}
