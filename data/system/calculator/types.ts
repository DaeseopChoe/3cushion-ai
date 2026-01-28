/* ===============================
 * 공통 타입
 * =============================== */

export interface Point {
  x: number; // Rg 좌표
  y: number; // Rg 좌표
}

/* ===============================
 * SYS v1 자동 계산 입력
 * =============================== */

export interface SystemCalcInputV1 {
  // 시스템 식별
  system_id: string;          // 예: "5_HALF", "PLUS"
  system_version: "v1";

  // 관리자 배치 기초 앵커 (드래그로 설정한 값)
  anchors_input: {
    CO: Point;                // 기초 CO 앵커 (관리자 드래그)
    C1: Point;                // 1쿠션 근사 위치
    C3: Point;                // 3쿠션 근사 위치
    C4?: Point;
    C5?: Point;
    C6?: Point;
    C7?: Point;
  };

  // HP/T 입력
  hpt: {
    T: string;                // "-3/8" ~ "+8/8"
    hit_point?: Point;        // 타점 (v1에서는 계산 미포함)
  };

  // 보정값 (관리자 입력)
  corrections: {
    curve_ratio: number;      // 곡구 보정 (+/-)
    slide: number;            // 밀림값 (+/-)
    draw: number;             // 끌림값 (+/-)
    departure: number;        // 출발 보정 (시스템별 사용)
  };
}

/* ===============================
 * SYS v1 자동 계산 출력
 * =============================== */

export interface SystemCalcOutputV1 {
  /* ---- 1️⃣ 확정 수치 (SSOT) ---- */
  values: {
    CO_sys: number;           // CO + curve_ratio
    C1_sys: number;           // 1쿠션 계산값
    C3_sys: number;           // 3쿠션 계산값
    arrival_sys?: number;     // 최종 착점 계산값 (선택)
    C2_sys?: number;          // 2쿠션 사용 시스템만 (선택)
  };

  /* ---- 2️⃣ 최종 앵커 좌표 ---- */
  anchors: {
    CO: Point;
    C1: Point;
    C3: Point;
    C4?: Point;
    C5?: Point;
    C6?: Point;
    C7?: Point;
  };

  /* ---- 3️⃣ 코칭/학습용 계산 과정 ---- */
  breakdown: {
    formula: {
      original: string;          // 예: "1C = CO - 3C"
      withCorrections: string;   // 예: "1C = (CO+curve) - (3C-slide)"
      substituted: string;       // 예: "20 = (40+5) - (20-5)"
    };

    steps: CalculationStep[];
  };

  /* ---- 4️⃣ 개발/검증용 ---- */
  debug?: {
    warnings?: string[];
    intermediate?: Record<string, number>;
  };
}

/* ===============================
 * 계산 단계
 * =============================== */

export interface CalculationStep {
  stage:
    | "CO_base"
    | "CO_sys"
    | "C1_calculation"
    | "C3_calculation"
    | "arrival_calculation";

  description: string;          // 사람이 읽는 설명
  formula: string;              // 수식 문자열
  value: number;                // 결과값

  corrections_applied?: {
    curve?: number;
    slide?: number;
    draw?: number;
    departure?: number;
  };
}

/* ===============================
 * 시스템 Capability 정의
 * =============================== */

export interface SystemProfile {
  id: string;
  display_name: {
    ko: string;
    en: string;
  };

  capabilities: {
    uses2C: boolean;            // 2쿠션 값 사용 여부
    usesArrival: boolean;       // 최종 착점 계산 여부
    requiresC4Plus: boolean;    // 4C 이상 앵커 필요 여부
    supportsRailFirst: boolean; // 레일 퍼스트 지원 여부
  };
}

/* ===============================
 * 시스템 계산기 인터페이스
 * =============================== */

export interface SystemCalculator {
  calculate(
    input: SystemCalcInputV1,
    profile: SystemProfile
  ): SystemCalcOutputV1;
}
