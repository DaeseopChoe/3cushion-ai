/**
 * adminStrict parity: runSpatialRecall vs legacy runPositionRecall
 * Run: npx tsx src/domain/recall/recallEngine.parity.test.ts
 * Also collected by vitest via harness describe below.
 */

import { describe, expect, it } from "vitest";
import { runSpatialRecall } from "./recallEngine";
import { runPositionRecall, ball3L1Sum } from "../positionRecallEngine";
import type {
  Ball3,
  PositionRecord,
  SlotStrategiesMap,
  StrategyEntry,
  StrategySignature,
} from "../positionSearchEngine";

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

function parity(
  label: string,
  dataset: PositionRecord[],
  balls: Ball3,
  targetBall?: "red" | "yellow" | null
) {
  const legacy = runPositionRecall({ dataset, balls, targetBall });
  const spatial = runSpatialRecall({
    dataset,
    query: { balls, targetBall },
    profile: "adminStrict",
  });

  ok(`${label} kind`, legacy.kind === spatial.kind);
  if (legacy.kind === "match" && spatial.kind === "match") {
    ok(
      `${label} positionId`,
      legacy.record.positionId === spatial.positionId
    );
    ok(`${label} distance`, legacy.distance === spatial.distance);
  }
  if (legacy.kind === "no-match" && spatial.kind === "no-match") {
    ok(
      `${label} reason`,
      legacy.reason === spatial.reason ||
        (legacy.reason === "coarse-empty" && spatial.reason === "coarse-empty")
    );
  }
}

console.log("=== adminStrict Parity (spatial vs legacy) ===\n");

const baseBalls: Ball3 = {
  cue: { x: 10, y: 10 },
  target: { x: 50, y: 25 },
  second: { x: 40, y: 20 },
};

parity("empty", [], baseBalls);

parity(
  "exact",
  [makeRecord(baseBalls, [makeEntry("S1", SIG_A)])],
  baseBalls
);

const query = baseBalls;
parity(
  "l1 order",
  [
    makeRecord(
      { cue: { x: 12, y: 10 }, target: { x: 52, y: 25 }, second: { x: 42, y: 20 } },
      [makeEntry("S1", SIG_A)],
      "pos_far"
    ),
    makeRecord(
      { cue: { x: 11, y: 10 }, target: { x: 50, y: 25 }, second: { x: 40, y: 20 } },
      [makeEntry("S1", SIG_A)],
      "pos_near"
    ),
  ],
  query
);

parity(
  "coarse empty",
  [
    makeRecord(
      { cue: { x: 25, y: 25 }, target: { x: 60, y: 30 }, second: { x: 50, y: 30 } },
      [makeEntry("S1", SIG_A)]
    ),
  ],
  query
);

// userStrict: near-exact USER Search (coarse required, cap 6)
console.log("\n=== userStrict ===\n");
const publishedExact: Ball3 = {
  cue: { x: 20, y: 16 },
  target: { x: 20, y: 20 },
  second: { x: 60, y: 20 },
};
const rUserExact = runSpatialRecall({
  dataset: [makeRecord(publishedExact, [makeEntry("S1", SIG_A)], "pub_exact")],
  query: { balls: publishedExact },
  profile: "userStrict",
});
ok("userStrict exact match", rUserExact.kind === "match" && rUserExact.distance === 0);

const rUserCoarseFail = runSpatialRecall({
  dataset: [makeRecord(publishedExact, [makeEntry("S1", SIG_A)], "pub_exact")],
  query: {
    balls: { cue: { x: 23.01, y: 16 }, target: { x: 20, y: 20 }, second: { x: 60, y: 20 } },
  },
  profile: "userStrict",
});
ok(
  "userStrict coarse fail (cue Manhattan > 3)",
  rUserCoarseFail.kind === "no-match" && rUserCoarseFail.reason === "coarse-empty"
);

// adminSearch: LocalDB ADMIN Search (Euclidean 2.0 Rg per-ball)
console.log("\n=== adminSearch (euclidean 2Rg) ===\n");
const rAdminNear = runSpatialRecall({
  dataset: [
    makeRecord(
      { cue: { x: 11, y: 10 }, target: { x: 50, y: 25 }, second: { x: 40, y: 20 } },
      [makeEntry("S1", SIG_A)],
      "admin_near"
    ),
  ],
  query: { balls: baseBalls },
  profile: "adminSearch",
});
ok("adminSearch near match (cue+1 Euclidean)", rAdminNear.kind === "match");

const rAdminDiagonalReject = runSpatialRecall({
  dataset: [makeRecord(baseBalls, [makeEntry("S1", SIG_A)], "diag")],
  query: {
    balls: {
      cue: { x: 11.5, y: 11.5 },
      target: baseBalls.target,
      second: baseBalls.second,
    },
  },
  profile: "adminSearch",
});
ok(
  "adminSearch rejects Euclidean>2 (dx=1.5 dy=1.5)",
  rAdminDiagonalReject.kind === "no-match" &&
    rAdminDiagonalReject.reason === "coarse-empty"
);

const rAdminCapBoundary = runSpatialRecall({
  dataset: [
    makeRecord(
      { cue: { x: 12, y: 10 }, target: { x: 50, y: 25 }, second: { x: 40, y: 20 } },
      [makeEntry("S1", SIG_A)],
      "admin_exact_2"
    ),
  ],
  query: { balls: baseBalls },
  profile: "adminSearch",
});
ok(
  "adminSearch cue Euclidean exactly 2.0 matches",
  rAdminCapBoundary.kind === "match" &&
    rAdminCapBoundary.distance === 2
);

const far = makeRecord(
  { cue: { x: 20, y: 10 }, target: { x: 58, y: 25 }, second: { x: 48, y: 20 } },
  [makeEntry("S1", SIG_A)],
  "far_pos"
);

const rAdminFar = runSpatialRecall({
  dataset: [far],
  query: { balls: baseBalls },
  profile: "adminSearch",
});
ok(
  "adminSearch far coarse fail",
  rAdminFar.kind === "no-match" && rAdminFar.reason === "coarse-empty"
);

// userRelaxed (deprecated): Phase 4 Role Search — no target/second permutation
console.log("\n=== userRelaxed wrong-role (no swap) ===\n");
const storedSwapped: Ball3 = {
  cue: { x: 10, y: 10 },
  target: { x: 40, y: 20 },
  second: { x: 50, y: 25 },
};
const rRelaxed = runSpatialRecall({
  dataset: [makeRecord(storedSwapped, [makeEntry("S1", SIG_A)], "perm_pos")],
  query: { balls: baseBalls },
  profile: "userRelaxed",
});
ok("userRelaxed no match wrong roles", rRelaxed.kind === "no-match");

const rStrict = runSpatialRecall({
  dataset: [makeRecord(storedSwapped, [makeEntry("S1", SIG_A)])],
  query: { balls: baseBalls },
  profile: "adminStrict",
});
ok("adminStrict no match wrong roles", rStrict.kind === "no-match");

const rCap = runSpatialRecall({
  dataset: [far],
  query: { balls: baseBalls },
  profile: "userRelaxed",
});
ok(
  "userRelaxed over cap",
  rCap.kind === "no-match" && rCap.reason === "over-max-distance"
);

console.log(`\n--- Result: ${passed} passed, ${failed} failed ---`);
if (!process.env.VITEST) {
  process.exit(failed > 0 ? 1 : 0);
}
if (failed > 0) {
  throw new Error(`recallEngine.parity: ${failed} failed`);
}

describe("recallEngine.parity harness", () => {
  it("all inline Role/Search parity checks passed", () => {
    expect(failed).toBe(0);
  });
});
