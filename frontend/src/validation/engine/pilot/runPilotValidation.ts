/**
 * validation/engine/pilot/runPilotValidation.ts
 *
 * STEP6-8 — Execute Pilot Validation against Pilot Fixture.
 * Verifies pipeline stages; does not mutate Catalog/Register/Engine design.
 */

import { ValidationEngine } from "../ValidationEngine";
import type { ExecutionBatch } from "../execution/executionModels";
import type { AggregatedFindingSet, FindingBatch } from "../finding/findingModels";
import type { ExecutionPlan } from "../plan/planModels";
import type { ExecutionQueue } from "../schedule/scheduleModels";
import type { ValidationReport, ValidationSummary } from "../report/reportModels";
import {
  PILOT_CATALOG,
  PILOT_REGISTER,
  PILOT_RUN_ID,
} from "./pilotDataset";

export interface PilotStageResult {
  stage: string;
  ok: boolean;
  detail?: string;
}

export interface PilotValidationResult {
  ok: boolean;
  stages: PilotStageResult[];
  report: ValidationReport;
  summary: ValidationSummary;
  executionBatch: ExecutionBatch;
  findingBatch: FindingBatch;
  aggregated: AggregatedFindingSet;
  plan: ExecutionPlan;
  queue: ExecutionQueue;
  exception: string | null;
}

export function runPilotValidation(): PilotValidationResult {
  const stages: PilotStageResult[] = [];
  const engine = new ValidationEngine();
  let exception: string | null = null;

  const mark = (stage: string, ok: boolean, detail?: string) => {
    stages.push({ stage, ok, detail });
    if (!ok) throw new Error(`Pilot stage failed: ${stage}${detail ? ` — ${detail}` : ""}`);
  };

  try {
    engine.initialize();
    mark("initialize", true);

    engine.loadCatalog(PILOT_CATALOG);
    mark("loadCatalog", true, "Pilot Catalog Header loaded");

    engine.loadRegister(PILOT_REGISTER);
    mark(
      "loadRegister",
      true,
      `${PILOT_REGISTER.ruleRecords?.length ?? 0} Rule Records`,
    );

    const ingress = engine.validateHeader();
    mark(
      "validateHeader",
      ingress.kind === "ingress.validated",
      ingress.kind === "ingress.validated"
        ? ingress.headerValidation.status
        : "unexpected payload",
    );

    const active = engine.resolveRules();
    mark("resolveRules", active.length === 3, `active=${active.length}`);

    const plan = engine.plan();
    mark(
      "plan",
      plan.kind === "planner.executionPlan",
      plan.kind === "planner.executionPlan"
        ? `inRun=${plan.activeRules.length} deferred=${plan.deferredRules.length}`
        : undefined,
    );

    const queue = engine.schedule();
    mark(
      "schedule",
      queue.kind === "scheduler.executionQueue",
      queue.kind === "scheduler.executionQueue"
        ? `ready=${queue.items.length}`
        : undefined,
    );

    const batch = engine.execute();
    mark(
      "execute",
      batch.kind === "executor.executionBatch",
      batch.kind === "executor.executionBatch"
        ? `results=${batch.results.length}`
        : undefined,
    );

    const findings = engine.emitFinding();
    mark(
      "emitFinding",
      findings.kind === "finding.batch",
      findings.kind === "finding.batch"
        ? `findings=${findings.findings.length}`
        : undefined,
    );

    const aggregated = engine.aggregate();
    mark(
      "aggregate",
      aggregated.kind === "finding.aggregated",
      aggregated.kind === "finding.aggregated"
        ? `total=${aggregated.counts.total}`
        : undefined,
    );

    const summary = engine.buildSummary();
    mark(
      "buildSummary",
      summary.kind === "summary.validation",
      summary.kind === "summary.validation"
        ? `schemaComplete=${summary.schemaComplete}`
        : undefined,
    );

    const report = engine.buildReport();
    mark(
      "buildReport",
      report.kind === "report.validation",
      report.kind === "report.validation" ? `runId=${report.runId}` : undefined,
    );

    // Full run() cross-check (fresh engine)
    const engine2 = new ValidationEngine();
    const fullReport = engine2.run({
      catalog: PILOT_CATALOG,
      register: PILOT_REGISTER,
      mode: "Design",
      runId: PILOT_RUN_ID,
    });
    mark(
      "run()",
      fullReport.kind === "report.validation",
      fullReport.kind === "report.validation"
        ? `report.runId=${fullReport.runId}`
        : undefined,
    );

    if (
      plan.kind !== "planner.executionPlan" ||
      queue.kind !== "scheduler.executionQueue" ||
      batch.kind !== "executor.executionBatch" ||
      findings.kind !== "finding.batch" ||
      aggregated.kind !== "finding.aggregated" ||
      summary.kind !== "summary.validation" ||
      fullReport.kind !== "report.validation"
    ) {
      throw new Error("Pilot payload kind mismatch");
    }

    const fullPlan = engine2.getExecutionPlan();
    const fullQueue = engine2.getExecutionQueue();
    const fullBatch = engine2.getExecutionBatch();
    const fullFindings = engine2.getFindingBatch();
    const fullAggregated = engine2.getAggregatedFindingSet();
    const fullSummary = engine2.getSummary();

    if (
      !fullPlan ||
      fullPlan.kind !== "planner.executionPlan" ||
      !fullQueue ||
      fullQueue.kind !== "scheduler.executionQueue" ||
      !fullBatch ||
      fullBatch.kind !== "executor.executionBatch" ||
      !fullFindings ||
      fullFindings.kind !== "finding.batch" ||
      !fullAggregated ||
      fullAggregated.kind !== "finding.aggregated" ||
      !fullSummary
    ) {
      throw new Error("Pilot run() did not retain stage payloads");
    }

    return {
      ok: stages.every((s) => s.ok),
      stages,
      report: fullReport,
      summary: fullSummary,
      executionBatch: fullBatch,
      findingBatch: fullFindings,
      aggregated: fullAggregated,
      plan: fullPlan,
      queue: fullQueue,
      exception: null,
    };
  } catch (err) {
    exception = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      stages,
      report: null as unknown as ValidationReport,
      summary: null as unknown as ValidationSummary,
      executionBatch: null as unknown as ExecutionBatch,
      findingBatch: null as unknown as FindingBatch,
      aggregated: null as unknown as AggregatedFindingSet,
      plan: null as unknown as ExecutionPlan,
      queue: null as unknown as ExecutionQueue,
      exception,
    };
  }
}
