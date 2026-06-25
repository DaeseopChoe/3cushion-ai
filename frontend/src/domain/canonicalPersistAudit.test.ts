/**
 * npx tsx src/domain/canonicalPersistAudit.test.ts
 */

import {
  auditSysInputsBoundary,
  findForbiddenKeyPaths,
  validateCanonicalDataset,
  validateCanonicalStrategyEntry,
} from "./canonicalPersistAudit";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const validEntry = {
  slot: "S1",
  signature: { systemId: "5_half_system", formulaHash: "abc", shotType: "뒤돌리기" },
  track: "B2T_L",
  sysInputs: { CO_f: 30, C3_r: 26, baseOneC: 30, baseThreeC: 26 },
  corrections: { slide: 0, curve_ratio: 1, draw: 0, departure: 0, spin: 0 },
  correctionsStored: true,
  meta: {
    impact: { x: 1, y: 2 },
    final: { x: 3, y: 4 },
    angle_ci: 0,
    angle_fs: 0,
  },
};

const validDataset = [
  {
    positionId: "pos_1",
    balls: {
      cue: { x: 10, y: 10 },
      target: { x: 50, y: 25 },
      second: { x: 40, y: 20 },
    },
    schemaVersion: 1,
    strategies: { S1: validEntry },
  },
];

// forbidden outputs on strategy
{
  const bad = { ...validEntry, outputs: { result: { oneC: 1 } } };
  const r = validateCanonicalStrategyEntry(bad);
  assert(!r.ok, "outputs should fail validation");
  assert(r.forbidden.length > 0, "forbidden paths expected");
}

// valid strategy
{
  const r = validateCanonicalStrategyEntry(validEntry);
  assert(r.ok, `valid entry: missing=${r.missing.join()} forbidden=${r.forbidden.join()}`);
}

// valid dataset
{
  const r = validateCanonicalDataset(validDataset);
  assert(r.ok, `valid dataset: ${JSON.stringify(r.issues)}`);
}

// forbidden in dataset walk
{
  const bad = [
    {
      ...validDataset[0],
      strategies: {
        S1: { ...validEntry, debug: { x: 1 } },
      },
    },
  ];
  const r = validateCanonicalDataset(bad);
  assert(!r.ok, "debug in strategy should fail dataset validate");
}

// boundary audit
{
  const a = auditSysInputsBoundary({
    adminInputs: { CO_f: 30, Sn: 1 },
    appliedInputs: { CO_f: 30, C3_r: 26 },
    canonicalSysInputs: { CO_f: 30, C3_r: 26 },
  });
  assert(a.suspectedEffectiveKeys.includes("Sn") || a.onlyInAdmin.includes("Sn"), "Sn suspicion");
}

// findForbiddenKeyPaths
{
  const paths = findForbiddenKeyPaths({ outputs: { result: { a: 1 } } });
  assert(paths.some((p) => p.includes("outputs")), "outputs path");
}

console.log("canonicalPersistAudit.test.ts: all passed");
