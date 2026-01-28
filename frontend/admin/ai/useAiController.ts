// /frontend/admin/ai/useAiController.ts

import { useCallback } from "react";

/**
 * AI 상태 타입
 */
export interface AiState {
  text: string;  // 코칭 텍스트
}

/**
 * useAiController Props
 */
interface UseAiControllerProps {
  ai?: AiState;
  onChange: (next: AiState) => void;
}

/**
 * AI 버튼 상태 관리 훅
 * 
 * 역할:
 * - AI 텍스트 상태 관리
 * - ❌ 계산 없음
 * - ❌ 저장 없음
 * - ✅ onChange만 호출
 * 
 * v1 범위:
 * - 관리자 텍스트 입력만 담당
 * - AI 자동 생성/추천 없음
 */
export function useAiController({
  ai,
  onChange,
}: UseAiControllerProps) {
  
  // 현재 텍스트
  const text = ai?.text || "";
  
  /**
   * 텍스트 변경
   */
  const setText = useCallback((newText: string) => {
    onChange({
      text: newText
    });
  }, [onChange]);
  
  return {
    text,
    setText,
  };
}
