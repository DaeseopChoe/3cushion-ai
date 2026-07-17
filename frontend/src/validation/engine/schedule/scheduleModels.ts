/**
 * validation/engine/schedule/scheduleModels.ts
 *
 * STEP6-7D — Scheduler internal contracts (ExecutionQueue).
 * Queue expresses WHEN (order / readiness). Not Execution Status (PASS/FAILED/…).
 */

/** Queue readiness only — not Framework Execution Status. */
export type QueueItemStatus = "READY";

/**
 * One executable slot in the READY queue.
 * Executor consumes these; Scheduler does not run Rules.
 */
export interface QueueItem {
  ruleId: string;
  layer?: string;
  family?: string;
  /** Stable schedule priority (0 = first). Derived from ExecutionPlan.executionOrder. */
  priority: number;
  status: QueueItemStatus;
  domain?: string;
  coverageClass?: string;
}

/** SkipPlan entry (STEP6-6 §9.3) — recorded for Executor; not applied as FAIL here. */
export interface SkipPlanEntry {
  ruleId: string;
  reason: string;
  triggerRuleId?: string;
  skipWhen?: string;
}

/** DeferPlan entry (STEP6-6 §9.3). */
export interface DeferPlanEntry {
  ruleId: string;
  reason: string;
}

/**
 * Engine-internal Scheduler → Executor contract.
 * Executor consumes ExecutionQueue only; Scheduler does not call Executor.
 */
export interface ExecutionQueue {
  kind: "scheduler.executionQueue";
  /** Ordered READY items only (Deferred / Blocked excluded). */
  items: QueueItem[];
  /** Conditional skip hints carried forward for Executor. */
  skipPlan: SkipPlanEntry[];
  /** Deferred rules excluded from READY queue. */
  deferPlan: DeferPlanEntry[];
  /** Blocked rule ids excluded from READY queue. */
  excludedBlockedRuleIds: string[];
}
