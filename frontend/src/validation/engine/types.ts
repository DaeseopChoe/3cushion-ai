/**
 * validation/engine/types.ts
 *
 * STEP6-7A/B/C — Validation Engine shared types.
 */

import type {
  CatalogView,
  IngressValidatedPayload,
  RegisterView,
} from "./models";
import type { ExecutionPlan } from "./plan/planModels";
import type { ExecutionQueue } from "./schedule/scheduleModels";
import type {
  EngineEvent,
  ExecutionBatch,
  OutcomePublication,
} from "./execution/executionModels";
import type {
  AggregatedFindingSet,
  Finding,
  FindingBatch,
} from "./finding/findingModels";
import type {
  ValidationReport,
  ValidationSummary,
} from "./report/reportModels";

/** Execution Status (STEP6-5 / STEP6-6). ≠ Register State. ≠ Queue READY. */
export type ExecutionStatus =
  | "PASS"
  | "FAILED"
  | "SKIPPED"
  | "DEFERRED"
  | "BLOCKED"
  | "ERROR"
  | "NOT_RUN";

/**
 * Engine-internal payload union through Report.
 */
export type EnginePayload =
  | CatalogView
  | RegisterView
  | IngressValidatedPayload
  | ExecutionPlan
  | ExecutionQueue
  | ExecutionBatch
  | EngineEvent
  | OutcomePublication
  | FindingBatch
  | AggregatedFindingSet
  | ValidationSummary
  | ValidationReport;

/** Rule identity / record ref used during planning. */
export type RuleRef = import("./models").RuleRecordView | string | unknown;

/** Finding ref = VAL-* Finding record. */
export type FindingRef = Finding;

/** Summary / Report refs (STEP6-7G). */
export type SummaryRef = ValidationSummary;
export type ReportRef = ValidationReport;
