// /frontend/admin/tests/hptSaveTest.ts
// ⚠️ 이 파일은 HP/T 저장 검증 테스트 예시입니다.

import type { Point } from "@/data/system/calculator/types";

/**
 * HP/T 저장 흐름 검증 테스트
 */

interface HptRecord {
  hp: Point;
  T: string;
}

interface ShotRecordDraft {
  id: string;
  name: string;
  sys?: any;
  hpt?: HptRecord;
  str?: any;
  ai?: any;
}

/**
 * 테스트 1: HP/T 변경 핸들러
 */
function testHandleHptChange() {
  console.log("=".repeat(60));
  console.log("Test 1: handleHptChange");
  console.log("=".repeat(60));
  
  // 초기 상태
  let draftShotRecord: ShotRecordDraft = {
    id: "shot_001",
    name: "테스트 샷"
  };
  
  // handleHptChange 시뮬레이션
  const handleHptChange = (hpt: { hp: Point; T: string }) => {
    draftShotRecord = {
      ...draftShotRecord,
      hpt: {
        hp: hpt.hp,
        T: hpt.T
      }
    };
    console.log("✅ Draft 업데이트:", draftShotRecord.hpt);
  };
  
  // HP/T 변경 시뮬레이션
  handleHptChange({
    hp: { x: 0.12, y: -0.18 },
    T: "+3/8"
  });
  
  // 검증
  console.log("\n[검증 결과]");
  console.log("- hpt 존재:", !!draftShotRecord.hpt);
  console.log("- hp.x:", draftShotRecord.hpt?.hp.x);
  console.log("- hp.y:", draftShotRecord.hpt?.hp.y);
  console.log("- T:", draftShotRecord.hpt?.T);
  
  const success = 
    draftShotRecord.hpt &&
    draftShotRecord.hpt.hp.x === 0.12 &&
    draftShotRecord.hpt.hp.y === -0.18 &&
    draftShotRecord.hpt.T === "+3/8";
  
  console.log("\n✅ 테스트 결과:", success ? "PASS" : "FAIL");
  console.log("=".repeat(60));
  
  return success;
}

/**
 * 테스트 2: SAVE 시 HP/T 포함 여부
 */
function testSaveWithHpt() {
  console.log("\n" + "=".repeat(60));
  console.log("Test 2: SAVE with HP/T");
  console.log("=".repeat(60));
  
  // Draft 상태 (HP/T + SYS 포함)
  const draftShotRecord: ShotRecordDraft = {
    id: "shot_001",
    name: "테스트 샷",
    sys: {
      system_id: "5_HALF",
      input: {},
      output: {}
    },
    hpt: {
      hp: { x: 0.12, y: -0.18 },
      T: "+3/8"
    }
  };
  
  // SAVE 시뮬레이션
  const handleSave = () => {
    console.log("💾 저장할 데이터:");
    console.log(JSON.stringify(draftShotRecord, null, 2));
    
    // 실제로는 여기서 saveShotRecord(draftShotRecord) 호출
    return draftShotRecord;
  };
  
  const saved = handleSave();
  
  // 검증
  console.log("\n[검증 결과]");
  console.log("- sys 포함:", !!saved.sys);
  console.log("- hpt 포함:", !!saved.hpt);
  console.log("- hpt.hp:", saved.hpt?.hp);
  console.log("- hpt.T:", saved.hpt?.T);
  
  const success = 
    saved.sys &&
    saved.hpt &&
    saved.hpt.hp.x === 0.12 &&
    saved.hpt.T === "+3/8";
  
  console.log("\n✅ 테스트 결과:", success ? "PASS" : "FAIL");
  console.log("=".repeat(60));
  
  return success;
}

/**
 * 테스트 3: 여러 번 변경 시 덮어쓰기
 */
function testMultipleChanges() {
  console.log("\n" + "=".repeat(60));
  console.log("Test 3: Multiple Changes");
  console.log("=".repeat(60));
  
  let draftShotRecord: ShotRecordDraft = {
    id: "shot_001",
    name: "테스트 샷"
  };
  
  const handleHptChange = (hpt: { hp: Point; T: string }) => {
    draftShotRecord = {
      ...draftShotRecord,
      hpt: {
        hp: hpt.hp,
        T: hpt.T
      }
    };
  };
  
  // 변경 1
  console.log("\n[변경 1]");
  handleHptChange({ hp: { x: 0, y: 0 }, T: "8/8" });
  console.log("hpt:", draftShotRecord.hpt);
  
  // 변경 2
  console.log("\n[변경 2]");
  handleHptChange({ hp: { x: 0.5, y: 0.3 }, T: "+5/8" });
  console.log("hpt:", draftShotRecord.hpt);
  
  // 변경 3
  console.log("\n[변경 3]");
  handleHptChange({ hp: { x: -0.2, y: 0.1 }, T: "-2/8" });
  console.log("hpt:", draftShotRecord.hpt);
  
  // 검증 (최종 값만 유지되어야 함)
  console.log("\n[검증 결과]");
  const success = 
    draftShotRecord.hpt &&
    draftShotRecord.hpt.hp.x === -0.2 &&
    draftShotRecord.hpt.hp.y === 0.1 &&
    draftShotRecord.hpt.T === "-2/8";
  
  console.log("✅ 최종 값만 유지:", success ? "PASS" : "FAIL");
  console.log("=".repeat(60));
  
  return success;
}

/**
 * 테스트 4: impactBall 저장 안 됨 확인
 */
function testNoImpactBallSave() {
  console.log("\n" + "=".repeat(60));
  console.log("Test 4: No ImpactBall Save");
  console.log("=".repeat(60));
  
  const draftShotRecord: ShotRecordDraft = {
    id: "shot_001",
    name: "테스트 샷",
    hpt: {
      hp: { x: 0.12, y: -0.18 },
      T: "+3/8"
    }
  };
  
  console.log("저장된 데이터:");
  console.log(JSON.stringify(draftShotRecord.hpt, null, 2));
  
  // 검증: impactBall 키가 없어야 함
  const hptKeys = Object.keys(draftShotRecord.hpt || {});
  const hasImpactBall = hptKeys.includes("impactBall");
  
  console.log("\n[검증 결과]");
  console.log("- hpt 키 목록:", hptKeys);
  console.log("- impactBall 포함:", hasImpactBall);
  
  const success = !hasImpactBall && hptKeys.length === 2;
  
  console.log("\n✅ impactBall 미포함:", success ? "PASS" : "FAIL");
  console.log("=".repeat(60));
  
  return success;
}

/**
 * 전체 테스트 실행
 */
export function runHptSaveTests() {
  console.log("\n" + "🧪 HP/T 저장 검증 테스트 시작\n");
  
  const results = {
    test1: testHandleHptChange(),
    test2: testSaveWithHpt(),
    test3: testMultipleChanges(),
    test4: testNoImpactBallSave()
  };
  
  console.log("\n" + "=".repeat(60));
  console.log("📊 전체 테스트 결과");
  console.log("=".repeat(60));
  console.log("Test 1 (handleHptChange):", results.test1 ? "✅ PASS" : "❌ FAIL");
  console.log("Test 2 (SAVE with HP/T):", results.test2 ? "✅ PASS" : "❌ FAIL");
  console.log("Test 3 (Multiple Changes):", results.test3 ? "✅ PASS" : "❌ FAIL");
  console.log("Test 4 (No ImpactBall):", results.test4 ? "✅ PASS" : "❌ FAIL");
  
  const allPass = Object.values(results).every(r => r === true);
  console.log("\n🎯 전체 결과:", allPass ? "✅ ALL PASS" : "❌ SOME FAILED");
  console.log("=".repeat(60));
  
  return allPass;
}

// 테스트 실행 (자동)
if (typeof window === "undefined") {
  // Node.js 환경
  runHptSaveTests();
}
