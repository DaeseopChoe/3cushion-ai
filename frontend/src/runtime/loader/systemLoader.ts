/**
 * systemLoader.ts
 * Batch 6 STEP 6-1 — System package load + SystemContract assemble (SYS-002).
 *
 * Loader: locate · load · validate · assemble. No cache (INV-B6-05).
 * Phase-1: delegates profile/anchors to existing data/systems eager maps.
 */

import { SYSTEM_PROFILES } from "../../data/systems";
import { anchorsRegistry } from "../../data/systems/anchorsRegistry";
import {
  SYSTEM_CONTRACT_VERSION,
  type LabelStrategy,
  type SystemContract,
  type SystemContractCapabilities,
  type SystemContractSafety,
} from "../contract/systemContract";

type JsonRecord = Record<string, unknown>;

const logicModules = import.meta.glob<JsonRecord>(
  "../../data/systems/*/logic.json",
  { eager: true, import: "default" }
);

const metaModules = import.meta.glob<JsonRecord>(
  "../../data/systems/*/system_meta.json",
  { eager: true, import: "default" }
);

function systemKeyFromGlobPath(path: string, fileName: string): string | null {
  const normalized = path.replace(/\\/g, "/");
  const match = normalized.match(
    new RegExp(`/data/systems/([^/]+)/${fileName}$`)
  );
  return match?.[1] ?? null;
}

function buildLogicIndex(): Record<string, JsonRecord> {
  const index: Record<string, JsonRecord> = {};
  for (const [path, mod] of Object.entries(logicModules)) {
    const key = systemKeyFromGlobPath(path, "logic.json");
    if (key && mod && typeof mod === "object") {
      index[key] = mod;
    }
  }
  return index;
}

function buildMetaIndex(): Record<string, JsonRecord> {
  const index: Record<string, JsonRecord> = {};
  for (const [path, mod] of Object.entries(metaModules)) {
    const key = systemKeyFromGlobPath(path, "system_meta.json");
    if (key && mod && typeof mod === "object") {
      index[key] = mod;
    }
  }
  return index;
}

const LOGIC_BY_SYSTEM = buildLogicIndex();
const META_BY_SYSTEM = buildMetaIndex();

function cloneSerializable<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function freezeDeep<T extends object>(value: T): T {
  Object.freeze(value);
  for (const key of Object.keys(value)) {
    const child = (value as Record<string, unknown>)[key];
    if (child !== null && typeof child === "object" && !Object.isFrozen(child)) {
      freezeDeep(child as object);
    }
  }
  return value;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseSafety(profile: JsonRecord | undefined): SystemContractSafety {
  const safety = (profile?.safety ?? {}) as JsonRecord;
  return {
    m_min: asNumber(safety.m_min) ?? 0.05,
    theta_t_max: asNumber(safety.theta_t_max) ?? 68,
    offset_fg2rg: asNumber(safety.offset_fg2rg),
  };
}

function parseValueDomains(
  profile: JsonRecord | undefined
): Record<string, [number, number]> | null {
  const raw = profile?.value_domains;
  if (!raw || typeof raw !== "object") return null;

  const result: Record<string, [number, number]> = {};
  for (const [key, value] of Object.entries(raw as JsonRecord)) {
    if (Array.isArray(value) && value.length >= 2) {
      const a = asNumber(value[0]);
      const b = asNumber(value[1]);
      if (a !== null && b !== null) {
        result[key] = [a, b];
      }
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

function parseDisplay(
  profile: JsonRecord | undefined
): Record<string, string | number | boolean | null> | null {
  const display = profile?.display;
  if (!display || typeof display !== "object") return null;
  const result: Record<string, string | number | boolean | null> = {};
  for (const [key, value] of Object.entries(display as JsonRecord)) {
    if (
      value === null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      result[key] = value;
    }
  }
  return Object.keys(result).length > 0 ? result : null;
}

function parseLabelStrategyFromMeta(meta: JsonRecord | null): LabelStrategy | null {
  const render = meta?.render;
  if (!render || typeof render !== "object") return null;
  const strategy = (render as JsonRecord).label_strategy;
  if (strategy === "five_half_reference" || strategy === "anchor_ssot") {
    return strategy;
  }
  return null;
}

function buildCapabilities(
  family: string | null,
  meta: JsonRecord | null
): SystemContractCapabilities {
  const labelStrategy = parseLabelStrategyFromMeta(meta);
  const isFiveHalfFamily = family === "5_half";

  return {
    render: labelStrategy ? { labelStrategy } : null,
    baselineHandle: isFiveHalfFamily
      ? { enabled: true, requireTrackPrefix: "B2T" }
      : null,
  };
}

function parseAnchors(systemId: string): SystemContract["anchors"] {
  const raw = anchorsRegistry[systemId];
  if (!raw) {
    return { trajectories: null, meta: null };
  }

  const cloned = cloneSerializable(raw) as {
    trajectories?: SystemContract["anchors"]["trajectories"];
    meta?: Record<string, string | number | boolean | null>;
  };

  return {
    trajectories: cloned.trajectories ?? null,
    meta: cloned.meta ?? null,
  };
}

function validateAssembly(
  systemId: string,
  profile: JsonRecord | undefined
): SystemContract["validation"] {
  const errors: string[] = [];
  if (!systemId) errors.push("systemId is required");
  if (!profile) errors.push(`profile missing for ${systemId}`);
  return { ok: errors.length === 0, errors };
}

/**
 * Assemble a single SystemContract. No cache (INV-B6-05).
 * Returns undefined when profile package is missing.
 */
export function assembleSystemContract(
  systemId: string
): SystemContract | undefined {
  const profileRaw = SYSTEM_PROFILES[systemId] as JsonRecord | undefined;
  if (!profileRaw) {
    return undefined;
  }

  const profile = cloneSerializable(profileRaw);
  const metaRaw = META_BY_SYSTEM[systemId] ?? null;
  const meta = metaRaw ? cloneSerializable(metaRaw) : null;
  const logicRaw = LOGIC_BY_SYSTEM[systemId];
  const logic = logicRaw ? cloneSerializable(logicRaw) : null;

  const family =
    asString(meta?.family) ??
    asString(meta?.system_id) ??
    asString(profile.system) ??
    null;

  const validation = validateAssembly(systemId, profile);
  const safety = parseSafety(profile);

  const contract: SystemContract = {
    identity: {
      systemId,
      family,
      aliases: null,
    },
    profile: {
      formulaExpr: asString((profile.formula as JsonRecord | undefined)?.expr),
      valueDomains: parseValueDomains(profile),
      safety,
      display: parseDisplay(profile),
    },
    anchors: parseAnchors(systemId),
    logic,
    metadata: meta,
    capabilities: buildCapabilities(family, meta),
    validation,
    version: {
      contractVersion: SYSTEM_CONTRACT_VERSION,
      packageVersion: asString((profile.meta as JsonRecord | undefined)?.version),
    },
  };

  return freezeDeep(contract);
}

/** Discovery list — profile.json registered system ids (eager parity). */
export function listDiscoverableSystemIds(): string[] {
  return Object.keys(SYSTEM_PROFILES).sort();
}
