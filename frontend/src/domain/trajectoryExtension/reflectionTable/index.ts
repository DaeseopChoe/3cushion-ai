/**
 * index.ts
 * Trajectory Extension reflectionTable public entry (P1-2).
 */

export {
  DEFAULT_REFLECTION_TABLE,
  GLOBAL_REFLECTION_TABLE,
  getReflectionTableIncidentRange,
  type ReflectionTable,
  type ReflectionTableKnot,
} from "./table";

export {
  interpolateReflectDeg,
  lookupReflectionAngle,
  type ReflectionLookupMode,
  type ReflectionLookupResult,
} from "./interpolate";
