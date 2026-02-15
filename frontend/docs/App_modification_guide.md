/**
 * Phase G-2: App.jsx 수정 가이드
 * 
 * 목표: 기존 시뮬레이션 로직은 최대한 유지하고,
 *       LayoutContext에서 tableWidth/tableHeight만 받아서 사용
 */

// ============================================
// 수정 1: LayoutContext import 추가
// ============================================
import { useContext } from "react";
import { LayoutContext } from "./contexts/LayoutContext";

// ============================================
// 수정 2: App 함수 내부 (최상단)
// ============================================
function App({ currentButtonId }) {
  // Layout context 가져오기
  const layout = useContext(LayoutContext);
  
  // Layout이 아직 준비 안 됐으면 대기
  if (!layout) {
    return <div style={{ color: 'white' }}>Loading...</div>;
  }
  
  // ============================================
  // 수정 3: SCALE 동적 계산
  // ============================================
  // Before:
  // const SCALE = 10;
  
  // After:
  const SCALE = layout.tableWidth / 80;  // Rg 기준 (80 units)
  
  // TABLE_W, TABLE_H는 layout에서 직접 사용
  const TABLE_W = layout.tableWidth;
  const TABLE_H = layout.tableHeight;
  
  // PADDING은 제거 (Stage에서 이미 처리)
  // const PADDING = 100;  // ❌ 제거
  
  // ============================================
  // 수정 4: SVG 크기 및 viewBox
  // ============================================
  // Before:
  // <svg width={TABLE_W + PADDING*2} height={TABLE_H + PADDING*2}>
  
  // After:
  return (
    <svg 
      width={TABLE_W} 
      height={TABLE_H}
      viewBox={`0 0 ${TABLE_W} ${TABLE_H}`}
      preserveAspectRatio="xMidYMid meet"
      style={{ display: 'block' }}
    >
      {/* 기존 당구대 렌더링 로직 그대로 */}
      {/* 공, 선, 쿠션 등 */}
    </svg>
  );
  
  // ============================================
  // 수정 5: 버튼 관련 코드 제거
  // ============================================
  // Before:
  // <div className="buttons">
  //   <button onClick={...}>S-1</button>
  //   ...
  // </div>
  
  // After:
  // ❌ 버튼은 Stage.jsx로 이동했으므로 제거
  
  // 버튼 클릭 처리는 currentButtonId prop으로 받음
  // useEffect(() => {
  //   if (currentButtonId === 'SYS') {
  //     setOverlayContent('SYS');
  //   }
  //   // ...
  // }, [currentButtonId]);
}

// ============================================
// 주의사항
// ============================================
/**
 * 1. toPx 함수는 그대로 유지
 *    - SCALE 값만 동적으로 계산되므로 기존 로직 정상 작동
 * 
 * 2. 좌표 계산 로직 변경 없음
 *    - CO, 1C, 2C, 3C 등 모든 앵커 계산 그대로
 * 
 * 3. PADDING 제거로 좌표 조정 필요
 *    - Before: cx={p.x + PADDING}
 *    - After:  cx={p.x}  (Stage가 이미 중앙 정렬)
 * 
 * 4. 오버레이 카드 위치
 *    - Stage 내부에서 렌더링되므로 position 조정 불필요
 */

// ============================================
// 예상 수정 라인 수: ~20 lines
// ============================================
