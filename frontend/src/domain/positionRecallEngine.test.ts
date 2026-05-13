/**
 * Position Recall Engine 테스트
 * 실행: npx tsx src/domain/positionRecallEngine.test.ts (또는 vite-node)
 */

import {
  runPositionRecall,
  dist2_6d,
  ball3L1Sum,
} from "./positionRecallEngine";
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
  });
  ok("no-match", r.kind === "no-match");
  ok("reason empty-dataset", r.kind === "no-match" && r.reason === "empty-dataset");
}

function test2_signatureMismatchIgnoredPositionMatch() {
  console.log("\n2. 시그니처와 무관하게 포지션 일치하면 match");
  const balls: Ball3 = { cue: { x: 10, y: 10 }, target: { x: 50, y: 25 }, second: { x: 40, y: 20 } };
  const rec = makeRecord(balls, [makeEntry("S1", SIG_B)]);
  const r = runPositionRecall({
    dataset: [rec],
    balls,
  });
  ok("match", r.kind === "match");
  ok("L1 = 0", r.kind === "match" && r.distance === 0);
}

function test3_exactMatch() {
  console.log("\n3. 완전 동일 balls → L1 = 0");
  const balls: Ball3 = { cue: { x: 10, y: 10 }, target: { x: 50, y: 25 }, second: { x: 40, y: 20 } };
  const rec = makeRecord(balls, [makeEntry("S1", SIG_A)]);
  const r = runPositionRecall({
    dataset: [rec],
    balls,
  });
  ok("match", r.kind === "match");
  ok("distance = 0", r.kind === "match" && r.distance === 0);
}

function test4_l1OrderingPicksSmallerSum() {
  console.log("\n4. L1 거리합 최소가 #1 (동률 시 positionId)");
  const query: Ball3 = { cue: { x: 10, y: 10 }, target: { x: 50, y: 25 }, second: { x: 40, y: 20 } };
  const recFar = makeRecord(
    {
      cue: { x: 12, y: 10 },
      target: { x: 52, y: 25 },
      second: { x: 42, y: 20 },
    },
    [makeEntry("S1", SIG_A)],
    "pos_far"
  );
  const recNear = makeRecord(
    {
      cue: { x: 11, y: 10 },
      target: { x: 50, y: 25 },
      second: { x: 40, y: 20 },
    },
    [makeEntry("S1", SIG_A)],
    "pos_near"
  );
  const l1Far = ball3L1Sum(recFar.balls, query);
  const l1Near = ball3L1Sum(recNear.balls, query);
  const r = runPositionRecall({
    dataset: [recFar, recNear],
    balls: query,
  });
  ok("l1Near < l1Far", l1Near < l1Far);
  ok("match", r.kind === "match");
  ok("#1 is pos_near", r.kind === "match" && r.record.positionId === "pos_near");
}

function test5_coarseEmptyOutsideTolerance() {
  console.log("\n5. 볼별 Manhattan >6 이면 coarse-empty");
  const query: Ball3 = { cue: { x: 10, y: 10 }, target: { x: 50, y: 25 }, second: { x: 40, y: 20 } };
  const rec = makeRecord(
    { cue: { x: 25, y: 25 }, target: { x: 60, y: 30 }, second: { x: 50, y: 30 } },
    [makeEntry("S1", SIG_A)]
  );
  const r = runPositionRecall({
    dataset: [rec],
    balls: query,
  });
  ok("no-match coarse-empty", r.kind === "no-match" && r.reason === "coarse-empty");
}

function test6_top1AmongFourCandidates() {
  console.log("\n6. 후보 4개 중 L1 합 최소 단일 record (Top1)");
  const query: Ball3 = { cue: { x: 10, y: 10 }, target: { x: 50, y: 25 }, second: { x: 40, y: 20 } };
  const mk = (dx: number, id: string) =>
    makeRecord(
      {
        cue: { x: 10 + dx, y: 10 },
        target: { x: 50, y: 25 },
        second: { x: 40, y: 20 },
      },
      [makeEntry("S1", SIG_A)],
      id
    );
  const r = runPositionRecall({
    dataset: [mk(3, "p3"), mk(1, "p1"), mk(2, "p2"), mk(0, "p0")],
    balls: query,
  });
  ok("match", r.kind === "match");
  ok("Top1 is p0", r.kind === "match" && r.record.positionId === "p0");
  ok("distance 0", r.kind === "match" && r.distance === 0);
}

function test7_coarseInsideStillMatchDespiteLarge6d() {
  console.log("\n7. coarse 통과 시 6D dist2와 무관하게 후보·정렬");
  const query: Ball3 = { cue: { x: 10, y: 10 }, target: { x: 50, y: 25 }, second: { x: 40, y: 20 } };
  const rec = makeRecord(
    { cue: { x: 11.5, y: 11.5 }, target: { x: 51.5, y: 26.5 }, second: { x: 41.5, y: 21.5 } },
    [makeEntry("S1", SIG_A)],
    "pos_delta15"
  );
  const dist2Val = dist2_6d(query, rec.balls);
  const r = runPositionRecall({
    dataset: [rec],
    balls: query,
  });
  ok("6D dist2 > 6", dist2Val > 6);
  ok("match", r.kind === "match");
  ok("record 선택됨", r.kind === "match" && r.record.positionId === "pos_delta15");
}

function test8_manhattanPassesWhereChebyshevBoxFailed() {
  console.log("\n8. v1.0 박스(|dx|≤3∧|dy|≤3) 탈락 → v1.1 볼별 |dx|+|dy|≤6 통과");
  const query: Ball3 = { cue: { x: 10, y: 10 }, target: { x: 50, y: 25 }, second: { x: 40, y: 20 } };
  const rec = makeRecord(
    { cue: { x: 16, y: 10 }, target: { x: 50, y: 25 }, second: { x: 40, y: 20 } },
    [makeEntry("S1", SIG_A)],
    "pos_cue_dx6"
  );
  const cueDx = Math.abs(16 - 10);
  const cueManhattan = cueDx + Math.abs(10 - 10);
  const r = runPositionRecall({
    dataset: [rec],
    balls: query,
  });
  ok("old box rejects cue |dx|>3", cueDx > 3);
  ok("cue Manhattan <= 6", cueManhattan <= 6);
  ok("match", r.kind === "match");
  ok("record pos_cue_dx6", r.kind === "match" && r.record.positionId === "pos_cue_dx6");
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

console.log("=== Position Recall Engine Tests ===\n");

test1_emptyDataset();
test2_signatureMismatchIgnoredPositionMatch();
test3_exactMatch();
test4_l1OrderingPicksSmallerSum();
test5_coarseEmptyOutsideTolerance();
test6_top1AmongFourCandidates();
test7_coarseInsideStillMatchDespiteLarge6d();
test8_manhattanPassesWhereChebyshevBoxFailed();

console.log(`\n--- Result: ${passed} passed, ${failed} failed ---`);
