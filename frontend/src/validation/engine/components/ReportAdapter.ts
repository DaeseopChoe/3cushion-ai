/**
 * validation/engine/components/ReportAdapter.ts
 *
 * STEP6-7G — ValidationSummary → ValidationReport (Report Input Package).
 * Presentation only — does not re-validate or export files.
 */

import type { IReportAdapter } from "../interfaces";
import type { AggregatedFindingSet } from "../finding/findingModels";
import type { ExecutionQueue } from "../schedule/scheduleModels";
import type {
  ValidationMode,
  ValidationReport,
  ValidationSummary,
} from "../report/reportModels";
import type { ReportRef, SummaryRef } from "../types";

export interface ReportBuildInput {
  summary: ValidationSummary;
  aggregated?: AggregatedFindingSet | null;
  executionQueue?: ExecutionQueue | null;
  runId: string;
  mode: ValidationMode;
}

function asSummary(summary: SummaryRef): ValidationSummary {
  if (
    summary !== null &&
    typeof summary === "object" &&
    "kind" in summary &&
    (summary as ValidationSummary).kind === "summary.validation"
  ) {
    return summary as ValidationSummary;
  }
  throw new Error(
    "ReportAdapter.build requires ValidationSummary (kind=summary.validation)",
  );
}

export class ReportAdapter implements IReportAdapter {
  private lastReport: ValidationReport | null = null;
  private context: Omit<ReportBuildInput, "summary"> = {
    runId: "run-unknown",
    mode: "Design",
  };

  setContext(context: Omit<ReportBuildInput, "summary">): void {
    this.context = context;
  }

  build(summary: SummaryRef): ReportRef {
    return this.buildFrom({
      summary: asSummary(summary),
      ...this.context,
    });
  }

  buildFrom(input: ReportBuildInput): ValidationReport {
    const deferredItems =
      input.executionQueue?.deferPlan.map((d) => ({
        ruleId: d.ruleId,
        reason: d.reason,
      })) ?? [];

    const report: ValidationReport = {
      kind: "report.validation",
      runId: input.runId,
      mode: input.mode,
      catalogPin: input.summary.pin,
      summary: input.summary,
      findings: input.aggregated?.findings ?? [],
      deferredItems,
      schemaComplete: input.summary.schemaComplete,
      generatedAt: new Date().toISOString(),
    };

    this.lastReport = report;
    return report;
  }

  getLastReport(): ValidationReport | null {
    return this.lastReport;
  }
}
