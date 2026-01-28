// /frontend/admin/sys/useSysCalculation.ts

import { useEffect, useState } from "react";
import { calculateSystemV1 } from "@/data/system/calculator";
import type {
  SystemCalcInputV1,
  SystemCalcOutputV1,
} from "@/data/system/calculator/types";

/**
 * SYS 버튼 계산 훅
 * 
 * 역할:
 * - 관리자 입력 → SystemCalcInputV1 매핑
 * - calculateSystemV1() 호출
 * - 결과를 즉시 화면 반영용 상태로 반환
 * - ❌ 저장하지 않음 (SAVE 버튼에서만)
 * 
 * @param input - SystemCalcInputV1 | null
 * @returns { result, error }
 */
export function useSysCalculation(input: SystemCalcInputV1 | null) {
  const [result, setResult] = useState<SystemCalcOutputV1 | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 입력이 없으면 초기화
    if (!input) {
      setResult(null);
      setError(null);
      return;
    }

    try {
      // [1] 계산 실행
      const output = calculateSystemV1(input);
      
      // [2] 결과 저장 (화면 반영용 draft)
      setResult(output);
      setError(null);
      
      // [3] 성공 로그
      console.log("✅ [SYS_CALC_SUCCESS]", {
        system_id: input.system_id,
        CO_sys: output.values.CO_sys,
        C1_sys: output.values.C1_sys,
        C3_sys: output.values.C3_sys,
        arrival_sys: output.values.arrival_sys
      });
      
    } catch (e: any) {
      // [4] 에러 처리
      console.error("❌ [SYS_CALC_ERROR]", e);
      setError(e.message ?? "System calculation failed");
      setResult(null);
    }
  }, [input]);

  return {
    result,   // 화면 반영용 (anchors, values, breakdown)
    error,    // UI 표시용
  };
}
