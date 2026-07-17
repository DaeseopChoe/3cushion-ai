/**
 * validation/engine/components/Aggregator.ts
 *
 * STEP6-7F — FindingBatch → AggregatedFindingSet.
 * Collects Findings only; does not build Summary or Report.
 */

import type { IAggregator } from "../interfaces";
import type { OutcomeSeverity } from "../execution/executionModels";
import type {
  AggregatedFindingSet,
  Finding,
  FindingBatch,
} from "../finding/findingModels";
import type { EnginePayload, FindingRef } from "../types";

function asFindingBatch(
  findings: FindingRef[] | EnginePayload,
): FindingBatch {
  if (
    findings !== null &&
    typeof findings === "object" &&
    !Array.isArray(findings) &&
    "kind" in findings &&
    (findings as FindingBatch).kind === "finding.batch"
  ) {
    return findings as FindingBatch;
  }

  if (Array.isArray(findings)) {
    const list = findings as Finding[];
    return {
      kind: "finding.batch",
      findings: list,
      createdAt: new Date().toISOString(),
      sourceExecutionBatchId: list[0]?.trace.sourceExecutionBatchId ?? "unknown",
    };
  }

  throw new Error(
    "Aggregator.aggregate requires FindingBatch or Finding[]",
  );
}

export class Aggregator implements IAggregator {
  private lastSet: AggregatedFindingSet | null = null;

  /**
   * Aggregate FindingBatch into AggregatedFindingSet.
   * No SummaryBuilder / ReportAdapter calls.
   */
  aggregate(findings: FindingRef[] | EnginePayload): EnginePayload {
    const batch = asFindingBatch(findings);
    const set = this.aggregateBatch(batch);
    this.lastSet = set;
    return set;
  }

  /** Prefer typed FindingBatch input. */
  aggregateBatch(batch: FindingBatch): AggregatedFindingSet {
    const byRuleId: Record<string, Finding[]> = {};
    const bySeverity: Partial<Record<OutcomeSeverity, Finding[]>> = {};
    const byExecutionStatus: AggregatedFindingSet["counts"]["byExecutionStatus"] =
      {};
    const severityCounts: AggregatedFindingSet["counts"]["bySeverity"] = {};

    for (const finding of batch.findings) {
      (byRuleId[finding.ruleId] ??= []).push(finding);

      byExecutionStatus[finding.executionStatus] =
        (byExecutionStatus[finding.executionStatus] ?? 0) + 1;

      if (finding.severity) {
        (bySeverity[finding.severity] ??= []).push(finding);
        severityCounts[finding.severity] =
          (severityCounts[finding.severity] ?? 0) + 1;
      }
    }

    const set: AggregatedFindingSet = {
      kind: "finding.aggregated",
      findings: [...batch.findings],
      byRuleId,
      bySeverity,
      counts: {
        total: batch.findings.length,
        byExecutionStatus,
        bySeverity: severityCounts,
      },
      sourceFindingBatchIds: [
        `${batch.sourceExecutionBatchId}@${batch.createdAt}`,
      ],
      aggregatedAt: new Date().toISOString(),
    };
    this.lastSet = set;
    return set;
  }

  getLastSet(): AggregatedFindingSet | null {
    return this.lastSet;
  }
}
