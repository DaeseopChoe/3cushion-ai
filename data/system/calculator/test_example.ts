// data/system/calculator/test_example.ts
// ⚠️ 이 파일은 테스트/검증용이며 프로덕션에는 포함하지 않습니다

import { calculateSystemV1, SystemCalcInputV1 } from "./index";

/**
 * 5&half 시스템 테스트 예제
 */
function testFiveAndHalf() {
  console.log("=".repeat(60));
  console.log("5&half System Calculator Test");
  console.log("=".repeat(60));
  
  const input: SystemCalcInputV1 = {
    system_id: "5_HALF",
    system_version: "v1",
    
    anchors_input: {
      CO: { x: 40, y: 10 },
      C1: { x: 20, y: 5 },
      C3: { x: 15, y: 8 }
    },
    
    hpt: {
      T: "+3/8"
    },
    
    corrections: {
      curve_ratio: 5,
      slide: 2,
      draw: -1,
      departure: 3
    }
  };
  
  try {
    const result = calculateSystemV1(input);
    
    console.log("\n✅ 계산 성공!");
    console.log("\n[values]");
    console.log(`  CO_sys: ${result.values.CO_sys}`);
    console.log(`  C1_sys: ${result.values.C1_sys}`);
    console.log(`  C3_sys: ${result.values.C3_sys}`);
    console.log(`  arrival_sys: ${result.values.arrival_sys}`);
    
    console.log("\n[formula]");
    console.log(`  original: ${result.breakdown.formula.original}`);
    console.log(`  withCorrections: ${result.breakdown.formula.withCorrections}`);
    console.log(`  substituted: ${result.breakdown.formula.substituted}`);
    
    console.log("\n[steps]");
    result.breakdown.steps.forEach((step, i) => {
      console.log(`  ${i + 1}. ${step.stage}`);
      console.log(`     ${step.description}`);
      console.log(`     ${step.formula} = ${step.value}`);
      if (step.corrections_applied) {
        console.log(`     보정: ${JSON.stringify(step.corrections_applied)}`);
      }
    });
    
    if (result.debug) {
      console.log("\n[debug]");
      console.log(`  intermediate: ${JSON.stringify(result.debug.intermediate)}`);
    }
    
  } catch (error) {
    console.error("\n❌ 계산 실패:", error);
  }
  
  console.log("\n" + "=".repeat(60));
}

// 실행
testFiveAndHalf();
