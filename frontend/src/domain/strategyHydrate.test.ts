/**
 * npx tsx src/domain/strategyHydrate.test.ts
 */

import { getPersistableBaseSysInputs } from "./canonicalStrategy";
import type { StrategyEntry } from "./positionSearchEngine";
import {
  defaultHydrateCalculate,
  hydrateSysFromStrategyEntryWithResolver,
} from "./strategyHydrateCore";

const testResolver = {
  getExpr: () => "C4_f = CO_f + C3_r",
  calculate: defaultHydrateCalculate,
};

function hydrate(entry: StrategyEntry) {
  return hydrateSysFromStrategyEntryWithResolver(entry, testResolver);
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const EFFECTIVE_KEYS = [
  "Sn",
  "C4_f",
  "C5_f",
  "C6_f",
  "oneC",
  "threeC",
  "arrival",
  "C1_f",
  "C1_r",
  "C2_f",
  "C2_r",
  "C3_f",
  "C4_r",
] as const;

function makeEntry(
  sysInputs: Record<string, number>,
  corrections?: StrategyEntry["corrections"]
): StrategyEntry {
  return {
    slot: "S1",
    signature: {
      systemId: "5_half_system",
      formulaHash: "test",
      shotType: "뒤돌리기",
    },
    track: "B2T_L",
    sysInputs,
    corrections,
    meta: { impact: { x: 0, y: 0 }, final: { x: 0, y: 0 }, angle_ci: 0, angle_fs: 0 },
  };
}

function assertNoEffectiveKeys(obj: Record<string, number>, label: string) {
  for (const k of EFFECTIVE_KEYS) {
    assert(!(k in obj), `${label}: effective key "${k}" must not be present`);
  }
}

// effective keys stripped from hydrate inputs
{
  const mixed: Record<string, number> = {
    CO_f: 30,
    C3_r: 15,
    baseOneC: 30,
    baseThreeC: 15,
  };
  for (const k of EFFECTIVE_KEYS) {
    mixed[k] = 99;
  }
  const hydrated = hydrate(makeEntry(mixed));
  assertNoEffectiveKeys(hydrated.inputs, "hydrate.inputs");
  assertNoEffectiveKeys(hydrated.system_values, "hydrate.system_values");
  assert(hydrated.inputs.CO_f === 30, "base CO_f kept");
  assert(hydrated.system_values.CO_f === 30, "system_values matches base");
}

// system_values equals stripped base inputs
{
  const entry = makeEntry({ CO_f: 12, C3_r: 8, baseOneC: 12, baseThreeC: 8, Sn: 5 });
  const hydrated = hydrate(entry);
  assert(
    JSON.stringify(hydrated.system_values) === JSON.stringify(hydrated.inputs),
    "system_values must equal stripped inputs"
  );
}

// outputs.result exists; effective keys not merged into inputs/system_values
{
  const entry = makeEntry({
    CO_f: 30,
    C3_r: 15,
    baseOneC: 30,
    baseThreeC: 15,
    C4_f: 999,
    Sn: 3,
  });
  const hydrated = hydrate(entry);
  assert(
    typeof hydrated.outputs?.result === "object" && hydrated.outputs.result !== null,
    "outputs.result must exist"
  );
  assertNoEffectiveKeys(hydrated.inputs, "outputs must not pollute inputs");
  assert(
    !("result" in hydrated.inputs) && !("result" in hydrated.system_values),
    "outputs.result must not appear on inputs/system_values"
  );
}

// corrections preserved
{
  const corr = { slide: 1, curve_ratio: 2, draw: 3, departure: 4, spin: 5 };
  const hydrated = hydrate(makeEntry({ CO_f: 1, C3_r: 2 }, corr));
  assert(hydrated.corrections.slide === 1, "corrections.slide");
  assert(hydrated.corrections.curve_ratio === 2, "corrections.curve_ratio");
  assert(hydrated.corrections.draw === 3, "corrections.draw");
}

// hydrate inputs usable as SAVE persist source (no effective keys)
{
  const entry = makeEntry({
    CO_f: 20,
    C3_r: 10,
    baseOneC: 20,
    baseThreeC: 10,
    Sn: 7,
    C4_f: 88,
  });
  const hydrated = hydrate(entry);
  const persistBase = getPersistableBaseSysInputs(
    { system_values: hydrated.system_values },
    null
  );
  assertNoEffectiveKeys(persistBase, "getPersistableBaseSysInputs from hydrate system_values");
  assert(persistBase.CO_f === 20, "persist base CO_f");
}

console.log("strategyHydrate.test.ts: all passed");
