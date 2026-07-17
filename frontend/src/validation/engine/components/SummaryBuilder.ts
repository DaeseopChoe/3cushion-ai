/**
 * validation/engine/components/SummaryBuilder.ts
 *
 * STEP6-7G — AggregatedFindingSet → ValidationSummary.
 * Does not recompute Findings; consumes Aggregator + Execution cites.
 */

import type { ISummaryBuilder } from "../interfaces";
import type { ExecutionBatch } from "../execution/executionModels";
import type { AggregatedFindingSet } from "../finding/findingModels";
import type { FindingPinCite } from "../finding/findingModels";
import type { ExecutionPlan } from "../plan/planModels";
import type { ExecutionQueue } from "../schedule/scheduleModels";
import { citeSchemaComplete } from "../report/schemaComplete";
import type {
  ExecutionStatusCounts,
  ValidationMode,
  ValidationSummary,
} from "../report/reportModels";
import type { EnginePayload, ExecutionStatus, SummaryRef } from "../types";

export interface SummaryBuildInput {
  aggregated: AggregatedFindingSet;
  executionBatch?: ExecutionBatch | null;
  executionPlan?: ExecutionPlan | null;
  executionQueue?: ExecutionQueue | null;
  pin?: FindingPinCite;
  mode?: ValidationMode;
}

function emptyStatusCounts(): ExecutionStatusCounts {
  return {
    PASS: 0,
    FAILED: 0,
    SKIPPED: 0,
    DEFERRED: 0,
    BLOCKED: 0,
    ERROR: 0,
    NOT_RUN: 0,
  };
}

function countStatuses(
  batch: ExecutionBatch | null | undefined,
): ExecutionStatusCounts {
  const counts = emptyStatusCounts();
  if (!batch) return counts;
  for (const r of batch.results) {
    const key = r.status as ExecutionStatus;
    if (key in counts) counts[key] += 1;
  }
  return counts;
}

function asAggregated(payload: EnginePayload): AggregatedFindingSet {
  if (
    payload !== null &&
    typeof payload === "object" &&
    "kind" in payload &&
    (payload as AggregatedFindingSet).kind === "finding.aggregated"
  ) {
    return payload as AggregatedFindingSet;
  }
  throw new Error(
    "SummaryBuilder.build requires AggregatedFindingSet (kind=finding.aggregated)",
  );
}

export class SummaryBuilder implements ISummaryBuilder {
  private lastSummary: ValidationSummary | null = null;
  private context: Omit<SummaryBuildInput, "aggregated"> = {};

  setContext(context: Omit<SummaryBuildInput, "aggregated">): void {
    this.context = context;
  }

  build(aggregated: EnginePayload): SummaryRef {
    return this.buildFrom({
      aggregated: asAggregated(aggregated),
      ...this.context,
    });
  }

  buildFrom(input: SummaryBuildInput): ValidationSummary {
    const statusCounts = countStatuses(input.executionBatch);
    const plan = input.executionPlan;
    const queue = input.executionQueue;
    const mode = input.mode ?? "Design";

    const totalRules =
      (plan?.activeRules.length ?? 0) +
      (plan?.deferredRules.length ?? 0) +
      (plan?.blockedRules.length ?? 0);

    const executed = queue?.items.length ?? statusCounts.PASS + statusCounts.FAILED +
      statusCounts.SKIPPED + statusCounts.ERROR;

    const schemaComplete = citeSchemaComplete({
      mode,
      executionBatch: input.executionBatch ?? null,
      aggregated: input.aggregated,
    });

    const summary: ValidationSummary = {
      kind: "summary.validation",
      totalRules,
      executed,
      findings: input.aggregated.counts.total,
      statusCounts,
      coverage: {
        totalActiveRules: totalRules,
        inRun: plan?.activeRules.length ?? 0,
        deferred: plan?.deferredRules.length ?? statusCounts.DEFERRED,
        blocked: plan?.blockedRules.length ?? statusCounts.BLOCKED,
      },
      schemaComplete,
      pin: input.pin,
      sourceAggregatedAt: input.aggregated.aggregatedAt,
      builtAt: new Date().toISOString(),
    };

    this.lastSummary = summary;
    return summary;
  }

  getLastSummary(): ValidationSummary | null {
    return this.lastSummary;
  }
}
