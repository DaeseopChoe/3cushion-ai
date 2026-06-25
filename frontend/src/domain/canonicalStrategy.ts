/**
 * Canonical strategy types + read/save normalize (no automatic localStorage rewrite).
 */

import { createPositionId } from "./positionId";
import type {
  Ball3,
  PositionRecord,
  StrategyEntry,
  StrategyMeta,
  StrategySignature,
  StrategySysCorrections,
  TargetBall,
} from "./positionSearchEngine";

/** Full zero defaults after hydrate (read path) */
export const STRATEGY_CORRECTIONS_ZERO: Required<
  Pick<StrategySysCorrections, "slide" | "curve_ratio" | "draw" | "departure" | "spin">
> = {
  slide: 0,
  curve_ratio: 0,
  draw: 0,
  departure: 0,
  spin: 0,
};

export const CANONICAL_SCHEMA_VERSION = 1;

/** Runtime / derived keys — never persist on StrategyEntry or sysInputs */
export const CANONICAL_STRIP_TOP_LEVEL_KEYS = new Set([
  "outputs",
  "debug",
  "calculated",
  "adjustedInputs",
  "system_values",
  "finalResult",
  "rawAnchors",
  "resolvedSlotSysValues",
  "trajectorySamples",
  "renderCache",
  "render_cache",
  "display",
  "correctionsStored",
  "schemaVersion",
  "shotType",
]);

export const CANONICAL_STRIP_SYS_INPUT_KEYS = new Set([
  ...CANONICAL_STRIP_TOP_LEVEL_KEYS,
  "system_values",
  "adjustedInputs",
  "calculated",
  "finalResult",
  "debug",
  "outputs",
  "sys_system_mode",
  "sys_use_sn",
]);

/**
 * SSOT:
 * runtime/effective sysInput keys that must never persist into canonical dataset.
 */
export const CANONICAL_STRIP_EFFECTIVE_SYS_INPUT_KEYS = new Set<string>([
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
]);

/** Canonical strategy row (documentation / export shape) */
export type CanonicalStrategyEntry = {
  slot: "S1" | "S2" | "S3";
  signature: StrategySignature;
  track?: string;
  sysInputs: Record<string, number>;
  corrections: StrategySysCorrections;
  hpT?: unknown;
  str?: unknown;
  ai?: unknown;
  meta?: StrategyMeta;
};

export type CanonicalPositionRecord = {
  positionId: string;
  balls: Ball3;
  targetBall?: TargetBall | null;
  strategies: Partial<Record<"S1" | "S2" | "S3", CanonicalStrategyEntry>>;
  schemaVersion?: number;
  source?: PositionRecord["source"];
};

/** SAVE 직전 applied + admin에서 추출한 canonical draft */
export type CanonicalSaveDraft = {
  slot: "S1" | "S2" | "S3";
  signature: StrategySignature;
  track: string;
  sysInputs: Record<string, number>;
  corrections: StrategySysCorrections;
  hpT?: unknown;
  str?: unknown;
  ai?: unknown;
};

export type ExtractBaseSysInputsArgs = {
  /** SYS overlay persisted base map (highest precedence). */
  systemValues?: Record<string, unknown> | null;
  /** slot.applied.sys.inputs */
  appliedSysInputs?: Record<string, unknown> | null;
  /** normalized numeric payload / form base layer */
  normalizedPayload?: Record<string, unknown> | null;
};

export type ToCanonicalStrategyEntryArgs = {
  slotId: "S1" | "S2" | "S3";
  signature: StrategySignature;
  applied?: {
    sys?: {
      inputs?: Record<string, unknown>;
      track?: string;
      outputs?: unknown;
      [key: string]: unknown;
    } | null;
    hpt?: unknown;
    str?: unknown;
    ai?: unknown;
  } | null;
  adminSys?: {
    corrections?: unknown;
    inputs?: Record<string, unknown>;
    shotType?: string;
    track?: string;
    system_values?: Record<string, unknown>;
    /** Optional normalized numeric map when caller supplies it (e.g. future SYS SAVE bridge). */
    normalizedPayload?: Record<string, unknown>;
    adjustedInputs?: Record<string, unknown>;
    calculated?: unknown;
    [key: string]: unknown;
  } | null;
};

/** Merge partial/legacy corrections into full numeric map */
export function mergeCorrections(raw: unknown): StrategySysCorrections {
  const z = STRATEGY_CORRECTIONS_ZERO;
  if (!raw || typeof raw !== "object") {
    return { ...z };
  }
  const c = raw as Record<string, unknown>;
  return {
    slide: Number(c.slide) || 0,
    curve_ratio: Number(c.curve_ratio) || 0,
    draw: Number(c.draw) || 0,
    departure: Number(c.departure) || 0,
    spin: Number(c.spin) || 0,
  };
}

/** Strip runtime / derived keys from a numeric input map */
export function stripRuntimeSysInputs(
  raw: Record<string, unknown> | null | undefined
): Record<string, number> {
  if (!raw || typeof raw !== "object") return {};
  const out: Record<string, number> = {};
  for (const [k, v] of Object.entries(raw)) {
    if (CANONICAL_STRIP_SYS_INPUT_KEYS.has(k)) continue;
    if (CANONICAL_STRIP_EFFECTIVE_SYS_INPUT_KEYS.has(k)) continue;
    if (k.startsWith("_")) continue;
    if (v === "" || v === null || v === undefined) continue;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) continue;
    out[k] = n;
  }
  return out;
}

function mergeNumericSourceLayers(layers: Array<Record<string, unknown> | null | undefined>) {
  const raw: Record<string, unknown> = {};
  for (const layer of layers) {
    if (!layer || typeof layer !== "object") continue;
    for (const [k, v] of Object.entries(layer)) {
      raw[k] = v;
    }
  }
  return raw;
}

function isNonemptyPlainRecord(value: unknown): value is Record<string, unknown> {
  return (
    value !== null &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    Object.keys(value as object).length > 0
  );
}

/**
 * Merge allowed base layers (applied → normalized → system_values per-key) then persist strip.
 * For SAVE, prefer cascade in `toCanonicalStrategyEntry` so polluted layers are not mixed in.
 */
export function extractBaseSysInputs(args: ExtractBaseSysInputsArgs): Record<string, number> {
  const raw = mergeNumericSourceLayers([
    args.appliedSysInputs,
    args.normalizedPayload,
    args.systemValues,
  ]);
  return stripRuntimeSysInputs(raw);
}

/** Canonical SAVE base sysInputs: cascade sources (no admin.inputs / outputs.result). */
function persistBaseSysInputsFromCanonicalSources(
  admin: ToCanonicalStrategyEntryArgs["adminSys"],
  appliedSys:
    | {
        inputs?: Record<string, unknown>;
        track?: string;
        outputs?: unknown;
      }
    | null
    | undefined
): Record<string, number> {
  if (admin && isNonemptyPlainRecord(admin.system_values)) {
    return extractBaseSysInputs({ systemValues: admin.system_values });
  }
  if (admin && isNonemptyPlainRecord(admin.normalizedPayload)) {
    return extractBaseSysInputs({ normalizedPayload: admin.normalizedPayload });
  }
  const ai =
    typeof appliedSys?.inputs === "object" && appliedSys.inputs ? appliedSys.inputs : undefined;
  return extractBaseSysInputs({ appliedSysInputs: ai });
}

/** SAVE guard + persist: same cascade as toCanonicalStrategyEntry (export-only wrapper). */
export function getPersistableBaseSysInputs(
  adminSys: ToCanonicalStrategyEntryArgs["adminSys"],
  appliedSys?: { inputs?: Record<string, unknown> } | null
): Record<string, number> {
  return persistBaseSysInputsFromCanonicalSources(adminSys, appliedSys ?? undefined);
}

/**
 * Runtime slot.applied + adminState.sys → canonical SAVE draft (meta 제외).
 */
export function toCanonicalStrategyEntry(
  args: ToCanonicalStrategyEntryArgs
): CanonicalSaveDraft {
  const sys = args.applied?.sys;
  const admin = args.adminSys;

  const sysInputs = persistBaseSysInputsFromCanonicalSources(admin, sys ?? undefined);

  return {
    slot: args.slotId,
    signature: args.signature,
    track: sys?.track ?? admin?.track ?? "B2T_L",
    sysInputs,
    corrections: mergeCorrections(admin?.corrections),
    hpT: args.applied?.hpt,
    str: args.applied?.str,
    ai: args.applied?.ai,
  };
}

/**
 * SAVE 직전 draft 정규화 (strip + corrections 필수화).
 */
export function normalizeCanonicalSaveDraft(
  draft: CanonicalSaveDraft
): CanonicalSaveDraft {
  return {
    slot: draft.slot,
    signature: draft.signature,
    track: draft.track ?? "B2T_L",
    sysInputs: stripRuntimeSysInputs(draft.sysInputs),
    corrections: mergeCorrections(draft.corrections),
    hpT: draft.hpT,
    str: draft.str,
    ai: draft.ai,
  };
}

/**
 * createStrategyEntry 결과 + canonical draft → persist용 StrategyEntry.
 */
export function attachCanonicalFieldsToStrategyEntry(
  entry: StrategyEntry,
  draft: CanonicalSaveDraft
): StrategyEntry {
  const stripped: StrategyEntry = { ...entry };
  for (const key of CANONICAL_STRIP_TOP_LEVEL_KEYS) {
    if (key in stripped) {
      delete (stripped as Record<string, unknown>)[key];
    }
  }
  return {
    ...stripped,
    sysInputs: stripRuntimeSysInputs(draft.sysInputs),
    corrections: mergeCorrections(draft.corrections),
    correctionsStored: true,
  };
}

/**
 * Read-time: ensures corrections exist (does not persist).
 */
export function normalizeCanonicalStrategyEntry(entry: StrategyEntry): StrategyEntry {
  const correctionsStored = Object.prototype.hasOwnProperty.call(
    entry as object,
    "corrections"
  );
  return {
    ...entry,
    sysInputs: stripRuntimeSysInputs(entry.sysInputs as Record<string, unknown>),
    corrections: mergeCorrections(entry.corrections),
    correctionsStored,
  };
}

/**
 * Recall / Position LOCK: dataset에 저장된 보정만 entry에서 취하고,
 * 레거시(키 없음)면 adminState 등 세션 보정을 유지한다.
 */
export function mergeCorrectionsForRecallHydrate(
  entry: StrategyEntry | null | undefined,
  prevSys: { corrections?: unknown } | null | undefined
): StrategySysCorrections {
  if (entry?.correctionsStored) {
    return mergeCorrections(entry.corrections);
  }
  if (prevSys?.corrections != null) {
    return mergeCorrections(prevSys.corrections);
  }
  return mergeCorrections(entry?.corrections);
}

/** Upsert된 position row에 schemaVersion 부여 */
export function applySchemaVersionToDatasetRecord(
  dataset: PositionRecord[],
  balls: Ball3,
  schemaVersion: number = CANONICAL_SCHEMA_VERSION
): PositionRecord[] {
  const positionId = createPositionId(balls);
  return dataset.map((rec) =>
    rec.positionId === positionId ? { ...rec, schemaVersion } : rec
  );
}
