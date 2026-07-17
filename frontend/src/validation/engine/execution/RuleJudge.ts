/**
 * validation/engine/execution/RuleJudge.ts
 *
 * STEP6-7E — Pluggable Rule JUDGE boundary.
 * Default judge returns PASS (no Catalog Rule body / Runtime target yet).
 * Real validators plug in later without changing Executor orchestration.
 */

import type { QueueItem } from "../schedule/scheduleModels";
import type { ExecutionStatus } from "../types";
import type { ExecutionErrorInfo, OutcomeSeverity } from "./executionModels";

export interface RuleJudgeOutcome {
  status: Extract<
    ExecutionStatus,
    "PASS" | "FAILED" | "BLOCKED" | "ERROR"
  >;
  severity?: OutcomeSeverity;
  evidence?: unknown;
  error?: ExecutionErrorInfo;
}

export interface RuleJudgeContext {
  /** Prior Execution Status by ruleId. */
  priorResults: ReadonlyMap<string, ExecutionStatus>;
}

export interface RuleJudge {
  judge(item: QueueItem, context: RuleJudgeContext): RuleJudgeOutcome;
}

/**
 * Default Consume-safe judge: PASS when no validator is registered.
 * Does not invent Catalog Rule semantics.
 */
export class DefaultRuleJudge implements RuleJudge {
  judge(_item: QueueItem, _context: RuleJudgeContext): RuleJudgeOutcome {
    return {
      status: "PASS",
      evidence: {
        judge: "DefaultRuleJudge",
        note: "No validator bound (STEP6-7E)",
      },
    };
  }
}
