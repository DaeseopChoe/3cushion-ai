/**
 * npx tsx src/domain/canonicalStrategy.test.ts
 */

import {
  CANONICAL_STRIP_EFFECTIVE_SYS_INPUT_KEYS,
  extractBaseSysInputs,
  getPersistableBaseSysInputs,
  stripRuntimeSysInputs,
  toCanonicalStrategyEntry,
} from "./canonicalStrategy";

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

const BASE_KEYS = ["CO_f", "C3_r", "baseOneC", "baseThreeC"] as const;

const signature = {
  systemId: "5_half_system",
  formulaHash: "abc",
  shotType: "뒤돌리기",
};

function assertNoEffectiveKeys(obj: Record<string, number>, label: string) {
  for (const k of EFFECTIVE_KEYS) {
    assert(!(k in obj), `${label}: effective key "${k}" must not be present`);
  }
}

function assertHasBaseKeys(obj: Record<string, number>, label: string) {
  for (const k of BASE_KEYS) {
    assert(k in obj, `${label}: expected base key "${k}"`);
  }
}

// stripRuntimeSysInputs — effective removed, base kept
{
  const mixed: Record<string, unknown> = {
    CO_f: 30,
    C3_r: 15,
    baseOneC: 30,
    baseThreeC: 15,
  };
  for (const k of EFFECTIVE_KEYS) {
    mixed[k] = k === "Sn" ? 2 : 22;
  }
  const out = stripRuntimeSysInputs(mixed);
  assertNoEffectiveKeys(out, "stripRuntimeSysInputs");
  assertHasBaseKeys(out, "stripRuntimeSysInputs");
  assert(out.CO_f === 30 && out.C3_r === 15, "stripRuntimeSysInputs numeric values");
}

// stripRuntimeSysInputs — SSOT set matches EFFECTIVE_KEYS list
{
  for (const k of EFFECTIVE_KEYS) {
    assert(
      CANONICAL_STRIP_EFFECTIVE_SYS_INPUT_KEYS.has(k),
      `CANONICAL_STRIP_EFFECTIVE_SYS_INPUT_KEYS missing ${k}`
    );
  }
}

// stripRuntimeSysInputs — null/undefined safe
{
  assert(Object.keys(stripRuntimeSysInputs(null)).length === 0, "null input");
  assert(Object.keys(stripRuntimeSysInputs(undefined)).length === 0, "undefined input");
}

// extractBaseSysInputs — system_values wins over lower layers (per-key merge)
{
  const out = extractBaseSysInputs({
    appliedSysInputs: { CO_f: 1, Sn: 9 },
    normalizedPayload: { C3_r: 2, oneC: 99 },
    systemValues: { CO_f: 30, C3_r: 26, baseOneC: 30, baseThreeC: 26, C4_f: 40 },
  });
  assert(out.CO_f === 30, "system_values overrides applied CO_f");
  assert(out.C3_r === 26, "system_values overrides normalized C3_r");
  assertNoEffectiveKeys(out, "extractBaseSysInputs merged");
  assertHasBaseKeys(out, "extractBaseSysInputs merged");
}

// extractBaseSysInputs — system_values only layer
{
  const out = extractBaseSysInputs({
    systemValues: { CO_f: 30, C3_r: 26, Sn: 1 },
  });
  assert(out.CO_f === 30 && out.C3_r === 26, "system_values only");
  assertNoEffectiveKeys(out, "extractBaseSysInputs system_values only");
}

// extractBaseSysInputs — normalizedPayload when no system_values
{
  const out = extractBaseSysInputs({
    appliedSysInputs: { Sn: 5 },
    normalizedPayload: { CO_f: 28, C3_r: 24, C4_f: 30 },
  });
  assert(out.CO_f === 28 && out.C3_r === 24, "normalized + applied merge");
  assertNoEffectiveKeys(out, "extractBaseSysInputs normalized fallback");
}

// extractBaseSysInputs — applied.sys.inputs fallback only
{
  const out = extractBaseSysInputs({
    appliedSysInputs: {
      CO_f: 30,
      C3_r: 26,
      baseOneC: 30,
      baseThreeC: 26,
      Sn: 2,
      oneC: 100,
    },
  });
  assertHasBaseKeys(out, "extractBaseSysInputs applied only");
  assertNoEffectiveKeys(out, "extractBaseSysInputs applied only");
}

// toCanonicalStrategyEntry — system_values base persist (admin.inputs ignored)
{
  const draft = toCanonicalStrategyEntry({
    slotId: "S1",
    signature,
    applied: {
      sys: {
        track: "B2T_L",
        inputs: { CO_f: 99, Sn: 9, oneC: 50 },
        outputs: { result: { Sn: 1, C4_f: 22, oneC: 50 } },
      },
    },
    adminSys: {
      inputs: { Sn: 8, C4_f: 20, oneC: 40 },
      system_values: { CO_f: 30, C3_r: 26, baseOneC: 30, baseThreeC: 26 },
      corrections: { slide: 0, curve_ratio: 1, draw: 0, departure: 0, spin: 0 },
    },
  });
  assert(draft.slot === "S1", "slot");
  assertNoEffectiveKeys(draft.sysInputs, "toCanonical system_values");
  assert(draft.sysInputs.CO_f === 30, "toCanonical uses system_values not applied/admin");
  assert(draft.corrections.curve_ratio === 1, "corrections preserved");
  assert(!("outputs" in draft), "draft has no outputs top-level");
  assert(!("outputs" in (draft.sysInputs as object)), "sysInputs has no outputs");
}

// toCanonicalStrategyEntry — normalizedPayload fallback when no system_values
{
  const draft = toCanonicalStrategyEntry({
    slotId: "S2",
    signature,
    applied: { sys: { inputs: { Sn: 1 } } },
    adminSys: {
      normalizedPayload: { CO_f: 28, C3_r: 24, C4_f: 30 },
      corrections: { slide: 0.5 },
    },
  });
  assert(draft.sysInputs.CO_f === 28 && draft.sysInputs.C3_r === 24, "normalizedPayload cascade");
  assertNoEffectiveKeys(draft.sysInputs, "toCanonical normalizedPayload");
  assert(draft.corrections.slide === 0.5, "corrections from admin");
}

// toCanonicalStrategyEntry — applied.sys.inputs fallback
{
  const draft = toCanonicalStrategyEntry({
    slotId: "S3",
    signature,
    applied: {
      sys: {
        inputs: { CO_f: 30, C3_r: 26, baseOneC: 30, baseThreeC: 26, Sn: 2, C4_f: 22 },
      },
    },
    adminSys: {
      inputs: { Sn: 99, oneC: 99 },
      corrections: {},
    },
  });
  assertHasBaseKeys(draft.sysInputs, "toCanonical applied fallback");
  assertNoEffectiveKeys(draft.sysInputs, "toCanonical applied fallback");
  assert(
    !("outputs" in (draft as Record<string, unknown>)),
    "toCanonical draft excludes outputs"
  );
}

// getPersistableBaseSysInputs — admin.system_values only (Recall hydrate path)
{
  const out = getPersistableBaseSysInputs(
    {
      system_values: { CO_f: 30, C3_r: 26, baseOneC: 30, baseThreeC: 26 },
      inputs: { Sn: 99 },
    },
    null
  );
  assert(Object.keys(out).length > 0, "system_values only: non-empty");
  assert(out.CO_f === 30 && out.C3_r === 26, "system_values values");
  assertNoEffectiveKeys(out, "getPersistable system_values only");
}

// getPersistableBaseSysInputs — empty applied, admin.system_values wins
{
  const out = getPersistableBaseSysInputs(
    { system_values: { CO_f: 28, C3_r: 24 } },
    { inputs: {} }
  );
  assert(out.CO_f === 28, "empty applied inputs ignored when system_values set");
  assertNoEffectiveKeys(out, "getPersistable admin over empty applied");
}

// getPersistableBaseSysInputs — effective strip on system_values layer
{
  const out = getPersistableBaseSysInputs(
    { system_values: { CO_f: 30, Sn: 2, C4_f: 22 } },
    undefined
  );
  assert(out.CO_f === 30, "base key kept");
  assert(!("Sn" in out) && !("C4_f" in out), "effective stripped from system_values");
}

// getPersistableBaseSysInputs — appliedSys.inputs fallback when no system_values
{
  const out = getPersistableBaseSysInputs(
    { inputs: { Sn: 99 } },
    { inputs: { CO_f: 30, C3_r: 26, Sn: 1 } }
  );
  assert(out.CO_f === 30 && out.C3_r === 26, "applied fallback");
  assertNoEffectiveKeys(out, "getPersistable applied fallback");
}

console.log("canonicalStrategy.test.ts: all passed");
