/**
 * data/systems/anchorsRegistry.ts
 * Batch 6 STEP 6-7 — Public getAnchorsForSystem / anchorsRegistry removed.
 *
 * Anchors JSON remains under data/systems/<id>/anchors.json.
 * Runtime consumers: getSystemContract(systemId)?.anchors
 * Loader-internal maps: runtime/loader/systemPackageStore.ts
 */

/** Type-only shape for JSDoc / local typing (not a JSON accessor). */
export type AnchorsData = {
  trajectories?: Record<string, { anchors: { id: string }[] }>;
  meta?: Record<string, unknown>;
};
