/**
 * validation/engine/index.ts
 *
 * Validation Engine package public entry.
 * STEP6-7A–G Final Integration (run → ValidationReport).
 * Schema Validation Engine (SPS STEP6). Not Runtime Contract (`runtime/`).
 */

export { ValidationEngine } from "./ValidationEngine";

export type {
  IValidationEngine,
  IIngress,
  IPlanner,
  IDependencyResolver,
  IScheduler,
  IExecutor,
  IEventBus,
  IOutcomeBus,
  IFindingEmitter,
  IAggregator,
  ISummaryBuilder,
  IReportAdapter,
} from "./interfaces";

export type {
  ExecutionStatus,
  EnginePayload,
  RuleRef,
  FindingRef,
  SummaryRef,
  ReportRef,
} from "./types";

export type {
  CatalogHeader,
  CatalogHeaderStatus,
  CatalogPinRecord,
  CatalogSource,
  CatalogView,
  HeaderValidationResult,
  HeaderValidationStatus,
  IngressValidatedPayload,
  RegisterHeader,
  RegisterSource,
  RegisterState,
  RegisterView,
  RuleRecordView,
} from "./models";

export {
  ENGINE_COMPATIBILITY_BASELINE,
  ENGINE_COMPATIBLE_FRAMEWORK_VERSION,
  ENGINE_COMPATIBLE_PIPELINE_VERSION,
  ENGINE_COMPATIBLE_SPS_VERSION,
} from "./baseline";

export { IngressLoadError, HeaderValidationError } from "./errors";

export {
  CatalogLoader,
  RegisterLoader,
  HeaderValidator,
  readCatalogHeader,
  readRegisterHeader,
  readCatalogPin,
} from "./loaders";

export {
  ActiveRuleResolver,
  CoverageFilter,
  ExecutionPlanBuilder,
  comparePlanOrder,
  l4FamilyRank,
  layerRank,
  resolveDependencyOverrides,
} from "./plan";

export type {
  CoverageClass,
  DependencyAnalysis,
  DependencyEdge,
  DependencyEdgeKind,
  DependencyGraph,
  DependencySkipHint,
  ExecutionPlan,
  RuleDependencyOverride,
} from "./plan";

export { buildExecutionQueue } from "./schedule";
export type {
  DeferPlanEntry,
  ExecutionQueue,
  QueueItem,
  QueueItemStatus,
  SkipPlanEntry,
} from "./schedule";

export { DefaultRuleJudge } from "./execution";
export type {
  EngineEvent,
  EngineEventType,
  ExecutionBatch,
  ExecutionErrorInfo,
  ExecutionResult,
  OutcomePublication,
  OutcomeSeverity,
  RuleJudge,
  RuleJudgeContext,
  RuleJudgeOutcome,
} from "./execution";

export {
  allocateValId,
  buildFindingMessage,
  shouldEmitFinding,
} from "./finding";
export type {
  AggregatedFindingCounts,
  AggregatedFindingSet,
  Finding,
  FindingBatch,
  FindingEmitMode,
  FindingPinCite,
  FindingTrace,
} from "./finding";

export { citeSchemaComplete } from "./report";
export type {
  CoverageSummary,
  ExecutionStatusCounts,
  SchemaCompleteCite,
  ValidationMode,
  ValidationReport,
  ValidationRunInput,
  ValidationSummary,
} from "./report";

export {
  PILOT_CATALOG,
  PILOT_REGISTER,
  PILOT_RUN_ID,
  runPilotValidation,
} from "./pilot";
export type { PilotStageResult, PilotValidationResult } from "./pilot";

export {
  FULL_CATALOG,
  FULL_REGISTER,
  FULL_RUN_ID,
  FULL_TARGET_SYSTEM_ID,
  SystemPackageRuleJudge,
  loadFiveHalfTarget,
  runFullValidation,
} from "./full";
export type { FullValidationResult, SystemPackageFiles } from "./full";

export {
  Ingress,
  Planner,
  DependencyResolver,
  Scheduler,
  Executor,
  EventBus,
  OutcomeBus,
  FindingEmitter,
  Aggregator,
  SummaryBuilder,
  ReportAdapter,
} from "./components";
