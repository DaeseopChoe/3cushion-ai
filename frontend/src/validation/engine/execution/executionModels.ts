/**
 * validation/engine/execution/executionModels.ts
 *
 * STEP6-7E — Executor internal contracts (ExecutionResult).
 * FindingEmitter consumes ExecutionResult later — not in this STEP.
 */

import type { ExecutionStatus } from "../types";

/** Rule Outcome Severity when status = FAILED (Framework meanings). */
export type OutcomeSeverity = "BLOCKER" | "ERROR" | "WARNING" | "INFO";

export interface ExecutionErrorInfo {
  message: string;
  code?: string;
}

/**
 * One Rule Execution outcome (Engine-internal).
 * ≠ Register State. ≠ Queue READY.
 */
export interface ExecutionResult {
  ruleId: string;
  status: ExecutionStatus;
  severity?: OutcomeSeverity;
  evidence?: unknown;
  elapsedTimeMs: number;
  error?: ExecutionErrorInfo;
  layer?: string;
  family?: string;
}

/** Engine Event (progress/meta only — Event ≠ Finding). */
export type EngineEventType =
  | "ValidationStarted"
  | "RulePassed"
  | "RuleFailed"
  | "RuleSkipped"
  | "RuleDeferred"
  | "RuleBlocked"
  | "RuleError"
  | "ValidationFinished";

export interface EngineEvent {
  kind: "engine.event";
  eventType: EngineEventType;
  ruleId?: string;
  status?: ExecutionStatus;
  at: string;
  detail?: unknown;
}

/**
 * Executor → FindingEmitter / Aggregator handoff batch.
 * Scheduler → Executor was ExecutionQueue; this is Executor output.
 */
export interface ExecutionBatch {
  kind: "executor.executionBatch";
  results: ExecutionResult[];
  startedAt: string;
  finishedAt: string;
}

/** Outcome Bus payload (normalize Execution Status for downstream). */
export interface OutcomePublication {
  kind: "executor.outcome";
  result: ExecutionResult;
}
