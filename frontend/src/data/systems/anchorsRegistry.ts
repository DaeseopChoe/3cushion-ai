/**
 * anchorsRegistry.ts
 * Auto-load anchors.json from data/systems/(each system)/
 */

export type AnchorsData = {
  trajectories?: Record<string, { anchors: { id: string }[] }>;
  meta?: Record<string, unknown>;
};

// Exclude: 0tip_plus (JSON comments), double_rail (Python script)
const anchorModules = import.meta.glob<{ default: AnchorsData }>(
  ["./*/anchors.json", "!./0tip_plus/anchors.json", "!./double_rail/anchors.json"],
  { eager: true }
);

const registry: Record<string, AnchorsData> = {};

for (const path in anchorModules) {
  const mod = anchorModules[path] as { default?: AnchorsData };
  const normalizedPath = path.replace(/\\/g, "/");
  const match = normalizedPath.match(/([^/]+)\/anchors\.json$/);
  if (!match) continue;

  const systemId = match[1];
  registry[systemId] = mod.default ?? (mod as unknown as AnchorsData);
}

export const anchorsRegistry = registry;
console.log("anchors registry", anchorsRegistry);

export function getAnchorsForSystem(systemId?: string | null): AnchorsData | undefined {
  if (!systemId) return undefined;
  const normalized = systemId === "5_HALF" ? "5_half_system" : systemId;
  return registry[normalized];
}
