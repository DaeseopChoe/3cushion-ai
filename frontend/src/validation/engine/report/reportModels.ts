/**
 * validation/engine/report/reportModels.ts
 *
 * STEP6-7G / STEP6-9 — ValidationSummary · ValidationReport (Report Input Package).
 * Adapter only — no Report SSOT rewrite, no file/JSON export.
 */

import type { Finding, FindingPinCite } from "../finding/findingModels";

/** schemaComplete cite (Framework §10 — rollup algorithms Pending where noted). */
export type SchemaCompleteCite = "YES" | "NO" | "UNDECIDED" | "NOT_RUN";

/**
 * ValidationReport Mode metadata (STEP6-8 Pilot / STEP6-9 Full).
 * Report-only — does not change Planner/Scheduler/Executor logic.
 */
export type ValidationMode = "Design" | "Pilot" | "Production";

export interface CoverageSummary {
  /** Active inventory rules considered for the run. */
  totalActiveRules: number;
  inRun: number;
  deferred: number;
  blocked: number;
}

export interface ExecutionStatusCounts {
  PASS: number;
  FAILED: number;
  SKIPPED: number;
  DEFERRED: number;
  BLOCKED: number;
  ERROR: number;
  NOT_RUN: number;
}

/**
 * SummaryBuilder output — consumes AggregatedFindingSet (+ execution cites).
 * Does not recompute Findings.
 */
export interface ValidationSummary {
  kind: "summary.validation";
  totalRules: number;
  executed: number;
  findings: number;
  statusCounts: ExecutionStatusCounts;
  coverage: CoverageSummary;
  schemaComplete: SchemaCompleteCite;
  pin?: FindingPinCite;
  sourceAggregatedAt?: string;
  builtAt: string;
}

/**
 * ReportAdapter output — Engine-internal Report Input Package (STEP6-6 §12.1).
 * No Export / UI / File I/O in this STEP.
 */
export interface ValidationReport {
  kind: "report.validation";
  runId: string;
  mode: ValidationMode;
  catalogPin?: FindingPinCite;
  summary: ValidationSummary;
  findings: Finding[];
  deferredItems: Array<{ ruleId: string; reason?: string }>;
  schemaComplete: SchemaCompleteCite;
  generatedAt: string;
}

/** Input required to drive ValidationEngine.run(). */
export interface ValidationRunInput {
  catalog: import("../models").CatalogSource;
  register: import("../models").RegisterSource;
  /** Report metadata only (Design | Pilot | Production). */
  mode?: ValidationMode;
  runId?: string;
  /** Optional RuleJudge binding (STEP6-9 Full Validation). */
  ruleJudge?: import("../execution/RuleJudge").RuleJudge;
}
