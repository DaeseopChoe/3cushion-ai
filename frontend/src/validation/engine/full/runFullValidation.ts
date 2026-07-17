/**
 * validation/engine/full/runFullValidation.ts
 *
 * STEP6-9 — Full Validation against real package + Full Catalog/Register Snapshot.
 * mode = Production (Report metadata).
 */

import { ValidationEngine } from "../ValidationEngine";
import type { ExecutionBatch } from "../execution/executionModels";
import type { AggregatedFindingSet, FindingBatch } from "../finding/findingModels";
import type { ExecutionPlan } from "../plan/planModels";
import type { ExecutionQueue } from "../schedule/scheduleModels";
import type { ValidationReport, ValidationSummary } from "../report/reportModels";
import {
  FULL_CATALOG,
  FULL_REGISTER,
  FULL_RUN_ID,
} from "./fullDataset";
import { loadFiveHalfTarget } from "./loadFiveHalfTarget";
import { SystemPackageRuleJudge } from "./SystemPackageRuleJudge";

export interface FullValidationResult {
  ok: boolean;
  exception: string | null;
  report: ValidationReport;
  summary: ValidationSummary;
  executionBatch: ExecutionBatch;
  findingBatch: FindingBatch;
  aggregated: AggregatedFindingSet;
  plan: ExecutionPlan;
  queue: ExecutionQueue;
  stages: string[];
}

export function runFullValidation(): FullValidationResult {
  const stages: string[] = [];
  try {
    const target = loadFiveHalfTarget();
    const judge = new SystemPackageRuleJudge(target);
    const engine = new ValidationEngine();

    const report = engine.run({
      catalog: FULL_CATALOG,
      register: FULL_REGISTER,
      mode: "Production",
      runId: FULL_RUN_ID,
      ruleJudge: judge,
    });
    stages.push(
      "initialize",
      "loadCatalog",
      "loadRegister",
      "validateHeader",
      "resolveRules",
      "plan",
      "schedule",
      "execute",
      "emitFinding",
      "aggregate",
      "buildSummary",
      "buildReport",
    );

    if (report.kind !== "report.validation") {
      throw new Error("Expected ValidationReport");
    }

    const summary = engine.getSummary();
    const plan = engine.getExecutionPlan();
    const queue = engine.getExecutionQueue();
    const batch = engine.getExecutionBatch();
    const findings = engine.getFindingBatch();
    const aggregated = engine.getAggregatedFindingSet();

    if (
      !summary ||
      !plan ||
      plan.kind !== "planner.executionPlan" ||
      !queue ||
      queue.kind !== "scheduler.executionQueue" ||
      !batch ||
      batch.kind !== "executor.executionBatch" ||
      !findings ||
      findings.kind !== "finding.batch" ||
      !aggregated ||
      aggregated.kind !== "finding.aggregated"
    ) {
      throw new Error("Full Validation missing stage payloads");
    }

    return {
      ok: true,
      exception: null,
      report,
      summary,
      executionBatch: batch,
      findingBatch: findings,
      aggregated,
      plan,
      queue,
      stages,
    };
  } catch (err) {
    return {
      ok: false,
      exception: err instanceof Error ? err.message : String(err),
      report: null as unknown as ValidationReport,
      summary: null as unknown as ValidationSummary,
      executionBatch: null as unknown as ExecutionBatch,
      findingBatch: null as unknown as FindingBatch,
      aggregated: null as unknown as AggregatedFindingSet,
      plan: null as unknown as ExecutionPlan,
      queue: null as unknown as ExecutionQueue,
      stages,
    };
  }
}
