/**
 * Phase G-2: Layout Calculator
 * 제약 기반 동적 레이아웃 계산 (PC-first Stage SSOT)
 */

// ============================================
// 핵심 상수
// ============================================

// 당구대 고정 비율 (불변)
const TABLE_ASPECT = 2.0;  // 가로:세로 = 2:1

// Stage 최소 요구 비율 (버튼 포함)
const REQUIRED_ASPECT = 2.3;  // 가로:세로 = 2.3:1

// 세로 여백 (세로 기준 비율)
const TOP_MARGIN = 0.03;     // 3%
const BOTTOM_MARGIN = 0.03;  // 3%

// 가로 구성 비율 (stageWidth 기준)
const L_MARGIN_RATIO = 0.02;      // 2%
const CONTROL_ZONE_RATIO = 0.13;  // 13%
const INNER_GAP_RATIO = 0.025;    // 2.5%
const R_MARGIN_RATIO = 0.02;      // 2%

// ============================================
// Case 1: Height-based Layout
// (가로 여유 충분할 때)
// ============================================
function calculateHeightBased(availableW, availableH) {
  // 1. Stage 높이 = 사용 가능 높이 전체
  const stageHeight = availableH;
  
  // 2. Stage 가로 (2.3:1 비율로 산출)
  const stageWidth = stageHeight * REQUIRED_ASPECT;
  
  // 🔴 PM 수정 1: stageWidth 초과 검증
  if (stageWidth > availableW) {
    return calculateWidthBased(availableW);
  }
  
  // 3. 당구대 높이 (세로 여백 제외)
  const tableHeight = stageHeight * (1 - TOP_MARGIN - BOTTOM_MARGIN);
  
  // 4. 당구대 가로 (2:1 비율)
  const tableWidth = tableHeight * TABLE_ASPECT;
  
  // 🔴 PM 수정 2: 가로 요소는 stageWidth 기준으로 계산
  const lMargin = stageWidth * L_MARGIN_RATIO;
  const controlWidth = stageWidth * CONTROL_ZONE_RATIO;
  const innerGap = stageWidth * INNER_GAP_RATIO;
  const rMargin = stageWidth * R_MARGIN_RATIO;
  
  // 5. 세로 여백
  const topMargin = stageHeight * TOP_MARGIN;
  const bottomMargin = stageHeight * BOTTOM_MARGIN;
  
  return {
    mode: 'height-based',
    stageWidth,
    stageHeight,
    tableWidth,
    tableHeight,
    controlWidth,
    lMargin,
    rMargin,
    innerGap,
    topMargin,
    bottomMargin,
  };
}

// ============================================
// Case 2: Width-based Layout
// (가로 여유 부족할 때)
// ============================================
function calculateWidthBased(availableW) {
  // 1. Stage 가로 = 사용 가능 가로 전체
  const stageWidth = availableW;
  
  // 2. Stage 높이 (2.3:1 비율 유지)
  const stageHeight = stageWidth / REQUIRED_ASPECT;
  
  // 3. 가로 구성요소 (stageWidth 기준)
  const lMargin = stageWidth * L_MARGIN_RATIO;
  const controlWidth = stageWidth * CONTROL_ZONE_RATIO;
  const innerGap = stageWidth * INNER_GAP_RATIO;
  const rMargin = stageWidth * R_MARGIN_RATIO;
  
  // 4. 당구대 가로 (남은 공간)
  const tableWidth = stageWidth - (lMargin + controlWidth + innerGap + rMargin);
  
  // 5. 당구대 세로 (2:1 비율)
  const tableHeight = tableWidth / TABLE_ASPECT;
  
  // 6. 세로 여백 (stageHeight 기준)
  const topMargin = stageHeight * TOP_MARGIN;
  const bottomMargin = stageHeight * BOTTOM_MARGIN;
  
  return {
    mode: 'width-based',
    stageWidth,
    stageHeight,
    tableWidth,
    tableHeight,
    controlWidth,
    lMargin,
    rMargin,
    innerGap,
    topMargin,
    bottomMargin,
  };
}

// ============================================
// 메인 계산 함수
// ============================================
export function calculateLayout(availableW, availableH) {
  const currentAspect = availableW / availableH;
  
  let layout;
  
  if (currentAspect >= REQUIRED_ASPECT) {
    // 가로 여유 충분 → Height-based
    layout = calculateHeightBased(availableW, availableH);
  } else {
    // 가로 여유 부족 → Width-based
    layout = calculateWidthBased(availableW);
  }
  
  if (process.env.NODE_ENV === 'development') {
    validateLayout(layout);
  }

  return layout;
}

// ============================================
// 수학적 검증 (개발용)
// ============================================
function validateLayout(layout) {
  const {
    stageWidth,
    stageHeight,
    tableWidth,
    tableHeight,
    lMargin,
    controlWidth,
    innerGap,
    rMargin,
    topMargin,
    bottomMargin,
  } = layout;
  
  // 1. Stage 비율 검증 (2.3:1)
  const stageAspect = stageWidth / stageHeight;
  const aspectError = Math.abs(stageAspect - REQUIRED_ASPECT);
  if (aspectError > 0.01) {
    console.warn(`⚠️ Stage 비율 오차: ${stageAspect.toFixed(3)} (목표: 2.3)`);
  }
  
  // 2. 당구대 비율 검증 (2:1)
  const tableAspect = tableWidth / tableHeight;
  const tableAspectError = Math.abs(tableAspect - TABLE_ASPECT);
  if (tableAspectError > 0.01) {
    console.warn(`⚠️ 당구대 비율 오차: ${tableAspect.toFixed(3)} (목표: 2.0)`);
  }
  
  // 3. 가로 합산 검증
  const horizontalSum = lMargin + controlWidth + innerGap + tableWidth + rMargin;
  const horizontalError = Math.abs(horizontalSum - stageWidth);
  if (horizontalError > 1) {
    console.warn(`⚠️ 가로 합산 오차: ${horizontalError.toFixed(2)}px`);
  }
  
  // 4. 세로 합산 검증
  const verticalSum = topMargin + tableHeight + bottomMargin;
  const verticalError = Math.abs(verticalSum - stageHeight);
  if (verticalError > 1) {
    console.warn(`⚠️ 세로 합산 오차: ${verticalError.toFixed(2)}px`);
  }
}
