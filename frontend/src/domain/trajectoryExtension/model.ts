/**
 * model.ts
 * Trajectory Extension Domain — SSOT types only (P1-1 skeleton).
 *
 * Source of truth: 작업관리/TRAJECTORY_EXTENSION_SSOT.md v1.3
 * No business logic. Dataset payload types only — no Runtime Attachment.
 */

/** Rg plane point. Endpoint / Ball / Origin point coordinates use this shape. */
export type RgPoint = {
  x: number;
  y: number;
};

/**
 * Extension ID — e.g. "EXT-S1-01".
 * Monotonic within a slot; IDs must not be reused (§12).
 */
export type TrajectoryExtensionId = string;

/** Extension ordinal within a chain. v1 max is 2 (§4). */
export type TrajectoryExtensionIndex = 1 | 2;

/**
 * Origin reference only — coordinates are never persisted (§3).
 * Resolved from pathNodes at runtime.
 */
export type TrajectoryExtensionOrigin = {
  kind: "path_node";
  source: "corrected" | "baseline";
};

/**
 * Persisted terminal (endpoint) in Rg.
 * Start points are not stored; they are resolved via Chain (§4 · §12).
 */
export type TrajectoryExtensionTerminal = RgPoint;

/**
 * One Extension item as stored in Dataset (StrategyEntry.trajectoryExtensions).
 * Start point is intentionally absent — Chain integrity is structural (§4).
 */
export type TrajectoryExtension = {
  id: TrajectoryExtensionId;
  index: TrajectoryExtensionIndex;
  /** Rg endpoint only */
  endpoint: TrajectoryExtensionTerminal;
  /** Provenance only — never a hydrate re-propose trigger (§12) */
  userEdited: boolean;
  createdAt: string;
  updatedAt: string;
};

/** Own schema version; independent of export / canonical record versions (§12). */
export const EXTENSION_SCHEMA_VERSION = 1 as const;

export type ExtensionSchemaVersion = typeof EXTENSION_SCHEMA_VERSION;

/**
 * Dataset payload under StrategyEntry.trajectoryExtensions.
 * Runtime Attachment / Snap state must NEVER appear here (§7 · §12 · v1.3).
 */
export type TrajectoryExtensionPayload = {
  extensionSchemaVersion: ExtensionSchemaVersion;
  origin: TrajectoryExtensionOrigin;
  /** Max 2 items (§4) */
  items: TrajectoryExtension[];
};

/**
 * Runtime-resolved chain segment (not persisted).
 * Start is derived: Extension1 ← Origin, Extension2 ← Extension1.endpoint (§4).
 */
export type TrajectoryExtensionChainSegment = {
  id: TrajectoryExtensionId;
  index: TrajectoryExtensionIndex;
  start: RgPoint;
  end: TrajectoryExtensionTerminal;
};

/**
 * Runtime-resolved chain. Not a Dataset type.
 * Direction is always Origin → E1.endpoint → E2.endpoint (§4).
 */
export type TrajectoryExtensionChain = {
  origin: TrajectoryExtensionOrigin;
  segments: TrajectoryExtensionChainSegment[];
};

/** v1 hard limit (§4 · §19). */
export const MAX_TRAJECTORY_EXTENSIONS = 2 as const;

/** Extension2 default length in Rg (§4 · §19). */
export const EXTENSION2_DEFAULT_LENGTH_RG = 20 as const;

/** ID prefix (§2). */
export const TRAJECTORY_EXTENSION_ID_PREFIX = "EXT" as const;
