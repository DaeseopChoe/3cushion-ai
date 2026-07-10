/**
 * systemRegistry.ts
 * Batch 6 STEP 6-1 — Runtime Registry (SYS-001).
 *
 * Sole Public Entry: getSystemContract().
 * Registry owns cache (INV-B6-04). Loader has no cache (INV-B6-05).
 */

import type { SystemContract } from "../contract/systemContract";
import {
  assembleSystemContract,
  listDiscoverableSystemIds,
} from "../loader/systemLoader";

function canonicalRegistryKey(
  systemId: string | null | undefined
): string | null {
  if (systemId == null || systemId === "") return "5_half_system";
  return systemId === "5_HALF" ? "5_half_system" : systemId;
}

const contractCache = new Map<string, SystemContract>();
let bootstrapComplete = false;

function registerContract(contract: SystemContract): void {
  contractCache.set(contract.identity.systemId, contract);
}

function loadAndRegister(systemId: string): SystemContract | undefined {
  const contract = assembleSystemContract(systemId);
  if (contract) {
    registerContract(contract);
  }
  return contract;
}

/** Eager bootstrap — AD-B6-06. Runs once on first registry access. */
export function bootstrapRegistry(): void {
  if (bootstrapComplete) return;

  for (const systemId of listDiscoverableSystemIds()) {
    if (!contractCache.has(systemId)) {
      loadAndRegister(systemId);
    }
  }

  bootstrapComplete = true;
}

/**
 * Public Entry — Registry.getSystemContract() (AD-B6-04).
 * Consumers must not call Loader directly.
 */
export function getSystemContract(
  systemId: string | null | undefined
): SystemContract | undefined {
  bootstrapRegistry();

  const key = canonicalRegistryKey(systemId);
  if (!key) return undefined;

  const cached = contractCache.get(key);
  if (cached) return cached;

  return loadAndRegister(key);
}

export function listRegisteredSystemIds(): string[] {
  bootstrapRegistry();
  return Array.from(contractCache.keys()).sort();
}

export function isRegistered(systemId: string): boolean {
  bootstrapRegistry();
  const key = canonicalRegistryKey(systemId);
  return key ? contractCache.has(key) : false;
}

// Smoke bootstrap — scaffold ready without App wiring (STEP 6-1).
bootstrapRegistry();
