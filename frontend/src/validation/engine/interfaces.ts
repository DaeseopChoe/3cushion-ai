/**
 * validation/engine/interfaces.ts
 *
 * STEP6-7A/B — Validation Engine component interfaces.
 * Architecture per STEP6-6: Ingress → Planner → Scheduler → Executor →
 * EventBus → OutcomeBus → FindingEmitter → Aggregator → SummaryBuilder → ReportAdapter.
 *
 * STEP6-7B: Ingress load + Header validation return EnginePayload for Planner.
 */

import type { CatalogSource, RegisterSource } from "./models";
import type { ValidationRunInput } from "./report/reportModels";
import type {
  EnginePayload,
  FindingRef,
  ReportRef,
  RuleRef,
  SummaryRef,
} from "./types";

/** Engine public surface (STEP6-7A–G Final Integration). */
export interface IValidationEngine {
  initialize(): void;
  loadCatalog(source?: CatalogSource): void;
  loadRegister(source?: RegisterSource): void;
  validateHeader(): EnginePayload;
  resolveRules(): RuleRef[];
  plan(): EnginePayload;
  schedule(): EnginePayload;
  execute(): EnginePayload;
  emitFinding(): EnginePayload;
  aggregate(): EnginePayload;
  buildSummary(): EnginePayload;
  buildReport(): EnginePayload;
  run(input?: ValidationRunInput): EnginePayload;
}

/**
 * Catalog / Register ingress boundary (L-Ingress).
 * load* → views; validateHeader → IngressValidatedPayload (Planner handoff).
 */
export interface IIngress {
  loadCatalog(source?: CatalogSource): EnginePayload;
  loadRegister(source?: RegisterSource): EnginePayload;
  validateHeader(
    catalog?: EnginePayload,
    register?: EnginePayload,
  ): EnginePayload;
}

/** Active-rule resolution and dependency-aware planning. */
export interface IPlanner {
  resolveActiveRules(payload?: EnginePayload): RuleRef[];
  plan(payload?: EnginePayload): EnginePayload;
}

/** Dependency analysis (STEP6-6 §7) — analysis only, no execution. */
export interface IDependencyResolver {
  resolve(_rules: RuleRef[]): EnginePayload;
}

/** Execution order / readiness scheduling. */
export interface IScheduler {
  schedule(_plan: EnginePayload): EnginePayload;
}

/** Rule execution (stub — no validators). */
export interface IExecutor {
  execute(_schedule: EnginePayload): EnginePayload;
}

/** Progress / meta events only (Event ≠ Finding). */
export interface IEventBus {
  emit(_event: EnginePayload): void;
}

/** Execution outcomes (PASS / FAILED / …). */
export interface IOutcomeBus {
  publish(_outcome: EnginePayload): void;
}

/** VAL-* Finding emission (Finding ≠ Event). Returns Finding[] from FindingBatch. */
export interface IFindingEmitter {
  emit(_outcome: EnginePayload): FindingRef[];
}

/** Finding aggregation — FindingBatch or Finding[] → AggregatedFindingSet. */
export interface IAggregator {
  aggregate(_findings: FindingRef[] | EnginePayload): EnginePayload;
}

/** Summary register construction. */
export interface ISummaryBuilder {
  build(_aggregated: EnginePayload): SummaryRef;
}

/** Report / adapter output boundary. */
export interface IReportAdapter {
  build(_summary: SummaryRef): ReportRef;
}
