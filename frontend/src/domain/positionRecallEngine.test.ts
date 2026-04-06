/**
 * Position Recall Engine 테스트
 * 실행: npx tsx src/domain/positionRecallEngine.test.ts (또는 vite-node)
 */

import {
  runPositionRecall,
  dist2_6d,
  weightedBallDistance,
  filterRecordsBySignature,
} from "./positionRecallEngine";
import { makeSignatureKey } from "./search/signatureKey";
import type {
  Ball3,
  PositionRecord,
  SlotStrategiesMap,
  StrategyEntry,
  StrategySignature,
} from "./positionSearchEngine";

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

const SIG_A: StrategySignature = {
  systemId: "5_half_system",
  formulaHash: "v1",
  shotType: "뒤돌리기",
};

const SIG_B: StrategySignature = {
  systemId: "other_system",
  formulaHash: "v1",
  shotType: "T=BANK",
};

function makeRecord(
  balls: Ball3,
  strategies: StrategyEntry[],
  positionId = "pos_1"
): PositionRecord {
  const map: SlotStrategiesMap = {};
  for (const e of strategies) {
    map[e.slot] = e;
  }
  return { positionId, balls, strategies: map };
}

function makeEntry(slot: "S1" | "S2" | "S3", sig: StrategySignature): StrategyEntry {
  return {
    slot,
    signature: sig,
    sysInputs: {},
    meta: {
      impact: { x: 0, y: 0 },
      final: { x: 0, y: 0 },
      angle_ci: 0,
      angle_fs: 0,
    },
  };
}

const THRESHOLDS = { soft: 6.0, hard: 12.0 };
const SIG_KEY_A = makeSignatureKey(SIG_A);

let passed = 0;
let failed = 0;

function ok(name: string, cond: boolean) {
  if (cond) {
    console.log(`  ✅ ${name}`);
    passed++;
  } else {
    console.log(`  ❌ ${name}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

function test1_emptyDataset() {
  console.log("\n1. dataset 없음");
  const r = runPositionRecall({
    dataset: [],
    balls: { cue: { x: 10, y: 10 }, target: { x: 50, y: 25 }, second: { x: 40, y: 20 } },
    signatureKey: SIG_KEY_A,
    thresholds: THRESHOLDS,
  });
  ok("no-match", r.kind === "no-match");
  ok("reason empty-dataset", r.kind === "no-match" && r.reason === "empty-dataset");
}

function test2_signatureNotFound() {
  console.log("\n2. signature 매칭 없음");
  const balls: Ball3 = { cue: { x: 10, y: 10 }, target: { x: 50, y: 25 }, second: { x: 40, y: 20 } };
  const rec = makeRecord(balls, [makeEntry("S1", SIG_B)]);
  const r = runPositionRecall({
    dataset: [rec],
    balls,
    signatureKey: SIG_KEY_A,
    thresholds: THRESHOLDS,
  });
  ok("no-match", r.kind === "no-match");
  ok("reason signature-not-found", r.kind === "no-match" && r.reason === "signature-not-found");
}

function test3_exactMatch() {
  console.log("\n3. 완전 동일 balls → distance = 0");
  const balls: Ball3 = { cue: { x: 10, y: 10 }, target: { x: 50, y: 25 }, second: { x: 40, y: 20 } };
  const rec = makeRecord(balls, [makeEntry("S1", SIG_A)]);
  const r = runPositionRecall({
    dataset: [rec],
    balls,
    signatureKey: SIG_KEY_A,
    thresholds: THRESHOLDS,
  });
  ok("match", r.kind === "match");
  ok("distance = 0", r.kind === "match" && r.distance === 0);
}

function test4_weightedOrderReversal() {
  console.log("\n4. TopK 중 weighted 순서 역전 케이스");
  const query: Ball3 = { cue: { x: 10, y: 10 }, target: { x: 50, y: 25 }, second: { x: 40, y: 20 } };
  // A: 6D로 가깝지만 cue가 멀어서 weighted로는 B가 더 가까울 수 있음
  const recA = makeRecord(
    { cue: { x: 11, y: 10 }, target: { x: 50, y: 25 }, second: { x: 40, y: 20 } },
    [makeEntry("S1", SIG_A)],
    "posA"
  );
  const recB = makeRecord(
    { cue: { x: 10, y: 10 }, target: { x: 51, y: 25 }, second: { x: 40, y: 20 } },
    [makeEntry("S1", SIG_A)],
    "posB"
  );
  const r = runPositionRecall({
    dataset: [recA, recB],
    balls: query,
    signatureKey: SIG_KEY_A,
    thresholds: THRESHOLDS,
    topK: 5,
    maxDist2: Infinity,
  });
  ok("match or low-confidence", r.kind === "match" || r.kind === "low-confidence");
  const best = r.kind !== "no-match" ? r.record : null;
  ok("weighted로 더 가까운 것이 선택됨", best != null);
  if (best) {
    const dA = weightedBallDistance(recA.balls, query);
    const dB = weightedBallDistance(recB.balls, query);
    const expected = dA < dB ? "posA" : "posB";
    ok(`선택된 record가 weighted 최소 (expected: ${expected})`, best.positionId === expected);
  }
}

function test5_hardThreshold() {
  console.log("\n5. hard threshold 초과");
  const query: Ball3 = { cue: { x: 10, y: 10 }, target: { x: 50, y: 25 }, second: { x: 40, y: 20 } };
  const rec = makeRecord(
    { cue: { x: 25, y: 25 }, target: { x: 60, y: 30 }, second: { x: 50, y: 30 } },
    [makeEntry("S1", SIG_A)]
  );
  const r = runPositionRecall({
    dataset: [rec],
    balls: query,
    signatureKey: SIG_KEY_A,
    thresholds: { soft: 6.0, hard: 12.0 },
    maxDist2: Infinity,
  });
  const dist = weightedBallDistance(rec.balls, query);
  ok("distance > hard", dist > 12.0);
  ok("no-match hard-threshold", r.kind === "no-match" && r.reason === "hard-threshold");
}

function test6_softThreshold() {
  console.log("\n6. soft threshold 초과 (low-confidence)");
  const query: Ball3 = { cue: { x: 10, y: 10 }, target: { x: 50, y: 25 }, second: { x: 40, y: 20 } };
  // cue (10,10)→(18,14): Δ²=64+16=80, weighted 2*80=160. target/second 작게 → 총 ~8~10 수준
  const rec = makeRecord(
    { cue: { x: 18, y: 14 }, target: { x: 51, y: 26 }, second: { x: 41, y: 21 } },
    [makeEntry("S1", SIG_A)]
  );
  const dist = weightedBallDistance(rec.balls, query);
  const r = runPositionRecall({
    dataset: [rec],
    balls: query,
    signatureKey: SIG_KEY_A,
    thresholds: { soft: 5.0, hard: 200.0 },
    maxDist2: Infinity,
  });
  ok("distance > soft && distance <= hard", dist > 5.0 && dist <= 200.0);
  ok("low-confidence", r.kind === "low-confidence");
  ok("record 반환", r.kind === "low-confidence" && r.record.positionId === rec.positionId);
}

function test7_formerlyFilteredByMaxDist2() {
  console.log("\n7. 기존 maxDist2(6) 때문에 제거되던 후보가 이제 선택되는지");
  const query: Ball3 = { cue: { x: 10, y: 10 }, target: { x: 50, y: 25 }, second: { x: 40, y: 20 } };
  // Δ ≈ 1.5 per dimension → 6D dist2 ≈ 6 * 1.5² = 13.5 > 6 (기존 maxDist2)
  const rec = makeRecord(
    { cue: { x: 11.5, y: 11.5 }, target: { x: 51.5, y: 26.5 }, second: { x: 41.5, y: 21.5 } },
    [makeEntry("S1", SIG_A)],
    "pos_delta15"
  );
  const dist2Val = dist2_6d(query, rec.balls);
  const r = runPositionRecall({
    dataset: [rec],
    balls: query,
    signatureKey: SIG_KEY_A,
    thresholds: { soft: 25.0, hard: 50.0 },
  });
  ok("6D dist2 > 6 (기존 maxDist2)", dist2Val > 6);
  ok("수정 후 match 또는 low-confidence 반환", r.kind === "match" || r.kind === "low-confidence");
  ok("record 선택됨", r.kind !== "no-match" && r.record.positionId === "pos_delta15");
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

console.log("=== Position Recall Engine Tests ===\n");

test1_emptyDataset();
test2_signatureNotFound();
test3_exactMatch();
test4_weightedOrderReversal();
test5_hardThreshold();
test6_softThreshold();
test7_formerlyFilteredByMaxDist2();

console.log(`\n--- Result: ${passed} passed, ${failed} failed ---`);
