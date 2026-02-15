// data/system/calculator/systems/five_and_half.ts

import {
  SystemCalculator,
  SystemCalcInputV1,
  SystemCalcOutputV1,
  SystemProfile,
  CalculationStep
} from "../types";
import {
  roundSystemValue,
  formatNumber,
  clonePoint
} from "../base";

/**
 * 5&half 시스템 계산기
 * 
 * 공식 (기본):
 * - 1C = CO - 3C
 * - 보정 적용:
 *   - CO_sys = CO_base + curve_ratio
 *   - 3C_sys = 3C_base - slide - draw
 *   - arrival_sys = 3C_sys + departure
 */
export class FiveAndHalfCalculator implements SystemCalculator {
  calculate(
    input: SystemCalcInputV1,
    profile: SystemProfile
  ): SystemCalcOutputV1 {
    const { anchors_input, corrections } = input;
    
    // ⚠️ 필수 앵커 검증
    if (!anchors_input.CO || !anchors_input.C1 || !anchors_input.C3) {
      throw new Error(
        "5&half System requires CO, C1, and C3 anchors"
      );
    }
    
    const steps: CalculationStep[] = [];
    
    // ==========================================
    // 1️⃣ CO 기초값 (FG 역연결 계산)
    // ==========================================
    // ⚠️ v1에서는 관리자 드래그한 CO를 그대로 사용
    // TODO: FG → CO 역연결 로직은 v2에서 추가 예정
    const CO_base = anchors_input.CO.x; // 임시: x 좌표 사용
    
    steps.push({
      stage: "CO_base",
      description: "CO 기초값 (관리자 드래그)",
      formula: "CO_base = anchors_input.CO.x",
      value: CO_base
    });
    
    // ==========================================
    // 2️⃣ CO_sys (곡구 보정 적용)
    // ==========================================
    const CO_sys = roundSystemValue(CO_base + corrections.curve_ratio);
    
    steps.push({
      stage: "CO_sys",
      description: "CO 곡구 보정 적용",
      formula: `CO_sys = CO_base + curve_ratio`,
      value: CO_sys,
      corrections_applied: {
        curve: corrections.curve_ratio
      }
    });
    
    // ==========================================
    // 3️⃣ C3_base (관리자 입력)
    // ==========================================
    const C3_base = anchors_input.C3.x; // 임시: x 좌표 사용
    
    // ==========================================
    // 4️⃣ C1 계산 (5&half 공식: 1C = CO - 3C)
    // ==========================================
    const C1_raw = CO_sys - C3_base;
    const C1_sys = roundSystemValue(C1_raw);
    
    steps.push({
      stage: "C1_calculation",
      description: "1쿠션 계산 (5&half 공식)",
      formula: `C1 = CO_sys - C3_base`,
      value: C1_sys
    });
    
    // ==========================================
    // 5️⃣ C3_sys (밀림/끌림 보정 적용)
    // ==========================================
    // ⚠️ 5&half 공식: 3C는 1C 기반이 아니라 입력값 기반
    // 보정: 밀림은 +, 끌림은 -
    const C3_corrected = C3_base + corrections.slide + corrections.draw;
    const C3_sys = roundSystemValue(C3_corrected);
    
    steps.push({
      stage: "C3_calculation",
      description: "3쿠션 보정 적용",
      formula: `C3_sys = C3_base + slide + draw`,
      value: C3_sys,
      corrections_applied: {
        slide: corrections.slide,
        draw: corrections.draw
      }
    });
    
    // ==========================================
    // 6️⃣ arrival_sys (최종 착점, 출발 보정)
    // ==========================================
    let arrival_sys: number | undefined = undefined;
    
    if (profile.capabilities.usesArrival) {
      const arrival_raw = C3_sys + corrections.departure;
      arrival_sys = roundSystemValue(arrival_raw);
      
      steps.push({
        stage: "arrival_calculation",
        description: "최종 착점 계산 (출발 보정)",
        formula: `arrival = C3_sys + departure`,
        value: arrival_sys,
        corrections_applied: {
          departure: corrections.departure
        }
      });
    }
    
    // ==========================================
    // 7️⃣ 수식 문자열 생성
    // ==========================================
    const original = "1C = CO - 3C";
    
    const withCorrections = corrections.curve_ratio !== 0
      ? `1C = (CO + curve_ratio) - 3C`
      : original;
    
    const substituted = 
      `${formatNumber(C1_sys)} = ` +
      `${formatNumber(CO_sys)} - ${formatNumber(C3_base)}`;
    
    // ==========================================
    // 8️⃣ 결과 반환
    // ==========================================
    return {
      values: {
        CO_sys,
        C1_sys,
        C3_sys,
        arrival_sys
      },
      
      anchors: {
        CO: clonePoint(anchors_input.CO),
        C1: clonePoint(anchors_input.C1),
        C3: clonePoint(anchors_input.C3)
      },
      
      breakdown: {
        formula: {
          original,
          withCorrections,
          substituted
        },
        steps
      },
      
      debug: {
        warnings: [],
        intermediate: {
          CO_base,
          C3_base,
          C1_raw,
          C3_corrected
        }
      }
    };
  }
}
