/**
 * systemPackageStore.ts
 * Batch 6 STEP 6-7 — Loader-internal System package maps (JSON access SSOT).
 *
 * Sole JSON access layer for profile/anchors eager maps.
 * Not part of Runtime Public API. Consumers must use Registry.getSystemContract().
 */

type SystemProfile = {
  id?: string;
  name?: string;
  description?: string;
  [key: string]: unknown;
};

export type PackageAnchorsData = {
  trajectories?: Record<string, { anchors: { id: string }[] }>;
  meta?: Record<string, unknown>;
};

const profileModules = import.meta.glob("../../data/systems/*/profile.json", {
  eager: true,
});

const anchorModules = import.meta.glob<{ default: PackageAnchorsData }>(
  [
    "../../data/systems/*/anchors.json",
    "!../../data/systems/0tip_plus/anchors.json",
    "!../../data/systems/double_rail/anchors.json",
  ],
  { eager: true }
);

function systemKeyFromPath(path: string, fileName: string): string | null {
  const normalized = path.replace(/\\/g, "/");
  const match = normalized.match(
    new RegExp(`/data/systems/([^/]+)/${fileName}$`)
  );
  return match?.[1] ?? null;
}

const PROFILE_BY_SYSTEM: Record<string, SystemProfile> = Object.fromEntries(
  Object.entries(profileModules)
    .map(([path, module]) => {
      const key = systemKeyFromPath(path, "profile.json");
      if (!key) return null;
      return [key, (module as { default?: SystemProfile }).default ?? module];
    })
    .filter(Boolean) as [string, SystemProfile][]
);

const ANCHORS_BY_SYSTEM: Record<string, PackageAnchorsData> = {};

for (const path in anchorModules) {
  const key = systemKeyFromPath(path, "anchors.json");
  if (!key) continue;
  const mod = anchorModules[path] as { default?: PackageAnchorsData };
  ANCHORS_BY_SYSTEM[key] =
    mod.default ?? (mod as unknown as PackageAnchorsData);
}

/** Loader-internal: raw profile package by canonical system folder id. */
export function getPackageProfile(
  systemId: string
): SystemProfile | undefined {
  return PROFILE_BY_SYSTEM[systemId];
}

/** Loader-internal: discoverable system ids (profile.json present). */
export function listPackageSystemIds(): string[] {
  return Object.keys(PROFILE_BY_SYSTEM).sort();
}

/** Loader-internal: raw anchors package. */
export function getPackageAnchors(
  systemId: string
): PackageAnchorsData | undefined {
  const normalized = systemId === "5_HALF" ? "5_half_system" : systemId;
  return ANCHORS_BY_SYSTEM[normalized];
}
