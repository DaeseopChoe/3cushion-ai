/**
 * Phase 5 Mission 01 — Real Interpolation types / result contracts.
 */

import type {
  Ball3,
  StrategyEntry,
  StrategySignature,
  StrategySysCorrections,
} from "../positionSearchEngine";

export type MatchType = "exact" | "interpolated" | "nearest";

export type GeometryFailReason =
  | "pos_cue"
  | "pos_target"
  | "shape"
  | "angle"
  | "zero_vector";

export type InterpolationKnotView = {
  authoringStrategyId: string;
  strategyRef: string;
  positionId: string;
  slot: "S1" | "S2" | "S3";
  balls: Ball3;
  sysInputs: Record<string, number>;
  signature: StrategySignature;
  hpT?: unknown;
  str?: unknown;
  ai?: unknown;
  corrections?: StrategySysCorrections;
  track?: string;
  /** Full entry reference for Modal / Primary (not blended). */
  entry: StrategyEntry;
};

/** Envelope geometry consumed for gates (join by strategyRef). */
export type EnvelopeGeometryView = {
  strategyRef: string;
  target: { x: number; y: number };
  cueSet: Array<{ x: number; y: number }>;
  secondSet: Array<{ x: number; y: number }>;
};

export type RealInterpolationDiagnostics = {
  reasons?: string[];
  modalInvariantOk?: boolean;
  secondDistance?: number;
  geometryFail?: GeometryFailReason;
  dCue?: number;
  dTarget?: number;
  eShape?: number;
};

export type RealInterpolationStrategyResult = {
  authoringStrategyId: string;
  strategyRef: string;
  matchType: MatchType;
  confidence: number;
  sysInputs: Record<string, number>;
  ballsQuery: Ball3;
  sourceKnotRefs: string[];
  interpolationLambda?: number;
  primaryEntry: StrategyEntry;
  diagnostics?: RealInterpolationDiagnostics;
};

export type RealInterpolationApplicationResult =
  RealInterpolationStrategyResult & {
    userImpact?: { x: number; y: number };
    userFinal?: { x: number; y: number };
    /** Injected Builder output; null when Builder failed but calc may remain. */
    trajectory?: unknown | null;
    trajectoryError?: string;
    calcError?: string;
  };
