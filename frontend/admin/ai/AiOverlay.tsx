// /frontend/admin/ai/AiOverlay.tsx

import { useState } from "react";
import { useAiController, AiState } from "./useAiController";

interface Props {
  value?: AiState;
  onChange: (next: AiState) => void;
  onClose: () => void;
}

/**
 * AI 코칭 텍스트 입력 오버레이
 * 
 * v1 기능:
 * - Textarea로 멀티라인 텍스트 입력
 * - 길이 제한 없음
 * - 입력 즉시 onChange 호출
 * - ❌ AI 자동 생성 없음
 */
export function AiOverlay({
  value,
  onChange,
  onClose,
}: Props) {
  const ai = useAiController({
    ai: value,
    onChange,
  });
  
  // 로컬 텍스트 상태 (입력 중)
  const [localText, setLocalText] = useState(ai.text);
  
  /**
   * Apply 버튼 - 변경사항 적용
   */
  const handleApply = () => {
    ai.setText(localText);
    onClose();
  };
  
  /**
   * Cancel 버튼 - 변경사항 무시
   */
  const handleCancel = () => {
    onClose();
  };
  
  /**
   * 텍스트 변경 핸들러
   */
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setLocalText(e.target.value);
  };
  
  return (
    <div 
      className="overlay-panel"
      style={{
        padding: "24px",
        backgroundColor: "white",
        borderRadius: "8px",
        minWidth: "400px",
        maxWidth: "600px",
      }}
    >
      <h3 style={{ marginTop: 0, marginBottom: "24px", fontSize: "18px", fontWeight: "700" }}>
        AI 코칭 텍스트
      </h3>
      
      {/* 설명 */}
      <p style={{ 
        marginBottom: "16px", 
        fontSize: "14px", 
        color: "#64748b",
        lineHeight: "1.5"
      }}>
        이 샷에 대한 코칭 메모를 자유롭게 입력하세요.
      </p>
      
      {/* Textarea */}
      <div style={{ marginBottom: "24px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", fontSize: "14px" }}>
          코칭 텍스트
        </label>
        <textarea
          value={localText}
          onChange={handleTextChange}
          placeholder="예: 이 각도에서는 커브가 과하게 먹을 수 있으니&#10;출발 시 스트로크를 부드럽게 가져가세요."
          rows={8}
          style={{
            width: "100%",
            padding: "12px",
            fontSize: "14px",
            lineHeight: "1.6",
            border: "1px solid #cbd5e1",
            borderRadius: "6px",
            fontFamily: "inherit",
            resize: "vertical",
            minHeight: "150px",
          }}
        />
        
        {/* 글자 수 표시 */}
        <div style={{ 
          marginTop: "8px", 
          fontSize: "12px", 
          color: "#94a3b8",
          textAlign: "right"
        }}>
          {localText.length} 글자
        </div>
      </div>
      
      {/* 예시 텍스트 (참고용) */}
      <details style={{ marginBottom: "24px" }}>
        <summary style={{ 
          cursor: "pointer", 
          fontSize: "13px", 
          color: "#64748b",
          marginBottom: "8px"
        }}>
          예시 텍스트 보기
        </summary>
        <div style={{ 
          padding: "12px", 
          backgroundColor: "#f8fafc", 
          borderRadius: "4px",
          fontSize: "13px",
          color: "#475569",
          lineHeight: "1.6"
        }}>
          <p style={{ margin: "0 0 8px 0" }}>
            • "타겟볼을 얇게 맞춰서 3쿠션으로 보내는 샷입니다."
          </p>
          <p style={{ margin: "0 0 8px 0" }}>
            • "큐볼의 회전을 충분히 주어 커브를 만들어야 합니다."
          </p>
          <p style={{ margin: "0" }}>
            • "스트로크는 부드럽게, 팔로우 스루를 길게 가져가세요."
          </p>
        </div>
      </details>
      
      {/* 버튼들 */}
      <div 
        className="actions" 
        style={{ 
          display: "flex", 
          gap: "8px",
          justifyContent: "flex-end"
        }}
      >
        <button 
          onClick={handleCancel}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: "600",
            color: "#64748b",
            backgroundColor: "#f1f5f9",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          취소
        </button>
        <button 
          onClick={handleApply}
          style={{
            padding: "10px 20px",
            fontSize: "14px",
            fontWeight: "600",
            color: "white",
            backgroundColor: "#3b82f6",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          적용
        </button>
      </div>
    </div>
  );
}
