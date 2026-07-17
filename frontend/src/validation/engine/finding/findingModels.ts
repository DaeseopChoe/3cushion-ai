/**
 * validation/engine/finding/findingModels.ts
 *
 * STEP6-7F — Finding / Aggregation contracts.
 * ExecutionResult = run outcome; Finding = Validation result (VAL-*). Event ≠ Finding.
 */

import type { OutcomeSeverity } from "../execution/executionModels";
import type { ExecutionStatus } from "../types";

/** Catalog Pin cite on a Finding (Consume Only — do not redefine Header). */
export interface FindingPinCite {
  catalogPinId?: string;
  catalogVersion?: string;
  catalogRevision?: string;
}

/** Trace pointers back to Execution (not Event bodies). */
export interface FindingTrace {
  sourceExecutionBatchId: string;
  ruleId: string;
  elapsedTimeMs?: number;
  errorCode?: string;
}

/**
 * Final Validation result (VAL-*).
 * Produced only by FindingEmitter per STEP6-6 §11 policy.
 */
export interface Finding {
  findingId: string;
  ruleId: string;
  executionStatus: ExecutionStatus;
  severity?: OutcomeSeverity;
  evidence?: unknown;
  trace: FindingTrace;
  layer?: string;
  family?: string;
  pin?: FindingPinCite;
  message: string;
}

/**
 * FindingEmitter → Aggregator contract.
 */
export interface FindingBatch {
  kind: "finding.batch";
  findings: Finding[];
  createdAt: string;
  sourceExecutionBatchId: string;
}

export interface AggregatedFindingCounts {
  total: number;
  byExecutionStatus: Partial<Record<ExecutionStatus, number>>;
  bySeverity: Partial<Record<OutcomeSeverity, number>>;
}

/**
 * Aggregator → SummaryBuilder contract (Summary not built in STEP6-7F).
 */
export interface AggregatedFindingSet {
  kind: "finding.aggregated";
  findings: Finding[];
  byRuleId: Record<string, Finding[]>;
  bySeverity: Partial<Record<OutcomeSeverity, Finding[]>>;
  counts: AggregatedFindingCounts;
  sourceFindingBatchIds: string[];
  aggregatedAt: string;
}
