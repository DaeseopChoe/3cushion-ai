/**
 * validation/engine/ValidationEngine.ts
 *
 * STEP6-7A–G Final Integration — full Validation pipeline via run().
 */

import type { IValidationEngine } from "./interfaces";
import type { CatalogSource, RegisterSource } from "./models";
import type { EnginePayload, RuleRef } from "./types";
import { IngressLoadError } from "./errors";
import type {
  ValidationMode,
  ValidationReport,
  ValidationRunInput,
  ValidationSummary,
} from "./report/reportModels";
import type { RuleJudge } from "./execution/RuleJudge";
import { DefaultRuleJudge } from "./execution/RuleJudge";
import {
  Aggregator,
  DependencyResolver,
  EventBus,
  Executor,
  FindingEmitter,
  Ingress,
  OutcomeBus,
  Planner,
  ReportAdapter,
  Scheduler,
  SummaryBuilder,
} from "./components";

export class ValidationEngine implements IValidationEngine {
  readonly ingress: Ingress;
  readonly planner: Planner;
  readonly dependencyResolver: DependencyResolver;
  readonly scheduler: Scheduler;
  executor: Executor;
  readonly eventBus: EventBus;
  readonly outcomeBus: OutcomeBus;
  readonly findingEmitter: FindingEmitter;
  readonly aggregator: Aggregator;
  readonly summaryBuilder: SummaryBuilder;
  readonly reportAdapter: ReportAdapter;

  private initialized = false;
  private runMode: ValidationMode = "Design";
  private runId = "run-unset";
  private ruleJudge: RuleJudge = new DefaultRuleJudge();

  private catalogSource: CatalogSource | null = null;
  private registerSource: RegisterSource | null = null;

  private lastIngressPayload: EnginePayload | null = null;
  private lastExecutionPlan: EnginePayload | null = null;
  private lastExecutionQueue: EnginePayload | null = null;
  private lastExecutionBatch: EnginePayload | null = null;
  private lastFindingBatch: EnginePayload | null = null;
  private lastAggregatedSet: EnginePayload | null = null;
  private lastSummary: ValidationSummary | null = null;
  private lastReport: ValidationReport | null = null;

  constructor() {
    this.ingress = new Ingress();
    this.dependencyResolver = new DependencyResolver();
    this.planner = new Planner(this.dependencyResolver);
    this.scheduler = new Scheduler();
    this.eventBus = new EventBus();
    this.outcomeBus = new OutcomeBus();
    this.executor = new Executor(this.eventBus, this.outcomeBus);
    this.findingEmitter = new FindingEmitter();
    this.aggregator = new Aggregator();
    this.summaryBuilder = new SummaryBuilder();
    this.reportAdapter = new ReportAdapter();
  }

  /** Bind RuleJudge without changing Executor orchestration shape. */
  setRuleJudge(judge: RuleJudge): void {
    this.ruleJudge = judge;
    this.executor = new Executor(this.eventBus, this.outcomeBus, judge);
  }

  /** Reset Engine run context (buses cleared; sources unbound). */
  initialize(): void {
    this.initialized = true;
    this.runMode = "Design";
    this.runId = `run-${Date.now()}`;
    this.catalogSource = null;
    this.registerSource = null;
    this.eventBus.clear();
    this.outcomeBus.clear();
    this.resetDownstreamFrom("ingress");
    this.lastSummary = null;
    this.lastReport = null;
  }

  loadCatalog(source?: CatalogSource): void {
    const src = source ?? this.catalogSource ?? undefined;
    if (!src) {
      throw new IngressLoadError(
        "CATALOG_SOURCE_REQUIRED",
        "loadCatalog requires CatalogSource",
      );
    }
    this.catalogSource = src;
    this.ingress.loadCatalog(src);
    this.resetDownstreamFrom("plan");
  }

  loadRegister(source?: RegisterSource): void {
    const src = source ?? this.registerSource ?? undefined;
    if (!src) {
      throw new IngressLoadError(
        "REGISTER_SOURCE_REQUIRED",
        "loadRegister requires RegisterSource",
      );
    }
    this.registerSource = src;
    this.ingress.loadRegister(src);
    this.resetDownstreamFrom("plan");
  }

  validateHeader(): EnginePayload {
    this.lastIngressPayload = this.ingress.validateHeader();
    if (
      this.lastIngressPayload &&
      typeof this.lastIngressPayload === "object" &&
      "kind" in this.lastIngressPayload &&
      this.lastIngressPayload.kind === "ingress.validated"
    ) {
      this.findingEmitter.bindIngress(this.lastIngressPayload);
    }
    this.resetDownstreamFrom("plan");
    return this.lastIngressPayload;
  }

  getIngressPayload(): EnginePayload | null {
    return this.lastIngressPayload ?? this.ingress.getValidatedPayload();
  }

  resolveRules(): RuleRef[] {
    const ingress = this.requireIngressPayload();
    this.planner.setIngressPayload(ingress);
    return this.planner.resolveActiveRules(ingress);
  }

  plan(): EnginePayload {
    const ingress = this.requireIngressPayload();
    this.planner.setIngressPayload(ingress);
    this.lastExecutionPlan = this.planner.plan(ingress);
    this.lastExecutionQueue = null;
    this.lastExecutionBatch = null;
    this.lastFindingBatch = null;
    this.lastAggregatedSet = null;
    this.lastSummary = null;
    this.lastReport = null;
    return this.lastExecutionPlan;
  }

  getExecutionPlan(): EnginePayload | null {
    return this.lastExecutionPlan ?? this.planner.getLastPlan();
  }

  schedule(): EnginePayload {
    const plan = this.requireExecutionPlan();
    this.lastExecutionQueue = this.scheduler.schedule(plan);
    this.lastExecutionBatch = null;
    this.lastFindingBatch = null;
    this.lastAggregatedSet = null;
    this.lastSummary = null;
    this.lastReport = null;
    return this.lastExecutionQueue;
  }

  getExecutionQueue(): EnginePayload | null {
    return this.lastExecutionQueue ?? this.scheduler.getLastQueue();
  }

  execute(): EnginePayload {
    const queue = this.requireExecutionQueue();
    this.lastExecutionBatch = this.executor.execute(queue);
    this.lastFindingBatch = null;
    this.lastAggregatedSet = null;
    this.lastSummary = null;
    this.lastReport = null;
    return this.lastExecutionBatch;
  }

  getExecutionBatch(): EnginePayload | null {
    return this.lastExecutionBatch ?? this.executor.getLastBatch();
  }

  emitFinding(): EnginePayload {
    const batch = this.requireExecutionBatch();
    this.lastFindingBatch = this.findingEmitter.emitBatch(batch);
    this.lastAggregatedSet = null;
    this.lastSummary = null;
    this.lastReport = null;
    return this.lastFindingBatch;
  }

  getFindingBatch(): EnginePayload | null {
    return this.lastFindingBatch ?? this.findingEmitter.getLastBatch();
  }

  aggregate(): EnginePayload {
    const findingBatch = this.requireFindingBatch();
    this.lastAggregatedSet = this.aggregator.aggregate(findingBatch);
    this.lastSummary = null;
    this.lastReport = null;
    return this.lastAggregatedSet;
  }

  getAggregatedFindingSet(): EnginePayload | null {
    return this.lastAggregatedSet ?? this.aggregator.getLastSet();
  }

  /** STEP6-7G — AggregatedFindingSet → ValidationSummary. */
  buildSummary(): EnginePayload {
    const aggregated = this.requireAggregatedSet();
    const plan = this.getExecutionPlan();
    const queue = this.getExecutionQueue();
    const batch = this.getExecutionBatch();
    const ingress = this.getIngressPayload();

    const pin =
      ingress &&
      typeof ingress === "object" &&
      "kind" in ingress &&
      ingress.kind === "ingress.validated"
        ? {
            catalogPinId: ingress.register.pin.catalogPinId,
            catalogVersion: ingress.register.pin.catalogVersion,
            catalogRevision: ingress.register.pin.catalogRevision,
          }
        : undefined;

    this.summaryBuilder.setContext({
      executionBatch:
        batch && batch.kind === "executor.executionBatch" ? batch : null,
      executionPlan:
        plan && plan.kind === "planner.executionPlan" ? plan : null,
      executionQueue:
        queue && queue.kind === "scheduler.executionQueue" ? queue : null,
      pin,
      mode: this.runMode,
    });

    this.lastSummary = this.summaryBuilder.build(aggregated) as ValidationSummary;
    this.lastReport = null;
    return this.lastSummary;
  }

  getSummary(): ValidationSummary | null {
    return this.lastSummary ?? this.summaryBuilder.getLastSummary();
  }

  /** STEP6-7G — ValidationSummary → ValidationReport (no export). */
  buildReport(): EnginePayload {
    const summary = this.requireSummary();
    const aggregated = this.getAggregatedFindingSet();
    const queue = this.getExecutionQueue();

    this.reportAdapter.setContext({
      runId: this.runId,
      mode: this.runMode,
      aggregated:
        aggregated &&
        typeof aggregated === "object" &&
        "kind" in aggregated &&
        aggregated.kind === "finding.aggregated"
          ? aggregated
          : null,
      executionQueue:
        queue && queue.kind === "scheduler.executionQueue" ? queue : null,
    });

    this.lastReport = this.reportAdapter.build(summary) as ValidationReport;
    return this.lastReport;
  }

  getReport(): ValidationReport | null {
    return this.lastReport ?? this.reportAdapter.getLastReport();
  }

  /**
   * STEP6-7G — Full pipeline Integration.
   * Returns ValidationReport (Engine-internal Report Input Package).
   */
  run(input?: ValidationRunInput): EnginePayload {
    if (!input?.catalog || !input?.register) {
      throw new IngressLoadError(
        "RUN_INPUT_REQUIRED",
        "run() requires { catalog, register }",
      );
    }

    this.initialize();
    this.runMode = input.mode ?? "Design";
    this.runId = input.runId ?? this.runId;
    this.catalogSource = input.catalog;
    this.registerSource = input.register;
    if (input.ruleJudge) {
      this.setRuleJudge(input.ruleJudge);
    } else {
      this.setRuleJudge(this.ruleJudge);
    }

    this.loadCatalog(input.catalog);
    this.loadRegister(input.register);
    this.validateHeader();
    this.resolveRules();
    this.plan();
    this.schedule();
    this.execute();
    this.emitFinding();
    this.aggregate();
    this.buildSummary();
    return this.buildReport();
  }

  private resetDownstreamFrom(stage: "ingress" | "plan"): void {
    if (stage === "ingress") {
      this.lastIngressPayload = null;
    }
    this.lastExecutionPlan = null;
    this.lastExecutionQueue = null;
    this.lastExecutionBatch = null;
    this.lastFindingBatch = null;
    this.lastAggregatedSet = null;
    this.lastSummary = null;
    this.lastReport = null;
  }

  private requireIngressPayload() {
    const payload = this.getIngressPayload();
    if (
      !payload ||
      typeof payload !== "object" ||
      !("kind" in payload) ||
      payload.kind !== "ingress.validated"
    ) {
      throw new IngressLoadError(
        "INGRESS_PAYLOAD_REQUIRED",
        "validateHeader() must succeed before resolveRules/plan",
      );
    }
    return payload;
  }

  private requireExecutionPlan() {
    const plan = this.getExecutionPlan();
    if (
      !plan ||
      typeof plan !== "object" ||
      !("kind" in plan) ||
      plan.kind !== "planner.executionPlan"
    ) {
      throw new IngressLoadError(
        "EXECUTION_PLAN_REQUIRED",
        "plan() must succeed before schedule()",
      );
    }
    return plan;
  }

  private requireExecutionQueue() {
    const queue = this.getExecutionQueue();
    if (
      !queue ||
      typeof queue !== "object" ||
      !("kind" in queue) ||
      queue.kind !== "scheduler.executionQueue"
    ) {
      throw new IngressLoadError(
        "EXECUTION_QUEUE_REQUIRED",
        "schedule() must succeed before execute()",
      );
    }
    return queue;
  }

  private requireExecutionBatch() {
    const batch = this.getExecutionBatch();
    if (
      !batch ||
      typeof batch !== "object" ||
      !("kind" in batch) ||
      batch.kind !== "executor.executionBatch"
    ) {
      throw new IngressLoadError(
        "EXECUTION_BATCH_REQUIRED",
        "execute() must succeed before emitFinding()",
      );
    }
    return batch;
  }

  private requireFindingBatch() {
    const batch = this.getFindingBatch();
    if (
      !batch ||
      typeof batch !== "object" ||
      !("kind" in batch) ||
      batch.kind !== "finding.batch"
    ) {
      throw new IngressLoadError(
        "FINDING_BATCH_REQUIRED",
        "emitFinding() must succeed before aggregate()",
      );
    }
    return batch;
  }

  private requireAggregatedSet() {
    const set = this.getAggregatedFindingSet();
    if (
      !set ||
      typeof set !== "object" ||
      !("kind" in set) ||
      set.kind !== "finding.aggregated"
    ) {
      throw new IngressLoadError(
        "AGGREGATED_SET_REQUIRED",
        "aggregate() must succeed before buildSummary()",
      );
    }
    return set;
  }

  private requireSummary(): ValidationSummary {
    const summary = this.getSummary();
    if (!summary || summary.kind !== "summary.validation") {
      throw new IngressLoadError(
        "SUMMARY_REQUIRED",
        "buildSummary() must succeed before buildReport()",
      );
    }
    return summary;
  }
}
