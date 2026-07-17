/**
 * validation/engine/plan/planModels.ts
 *
 * STEP6-7C — Planner internal contracts (ExecutionPlan).
 * Consume Catalog/Register only; do not redefine Dependency cascade rules.
 */

import type { RuleRecordView } from "../models";

/** CoverageClass (STEP6-4 / STEP6-6 §9.1). */
export type CoverageClass = "Required" | "Optional" | "Deferred";

/** Dependency edge kinds (STEP6-6 §7 Lean Option C). */
export type DependencyEdgeKind =
  | "layer-cascade"
  | "l4-family-chain"
  | "prerequisite";

export interface DependencyEdge {
  fromRuleId: string;
  toRuleId: string;
  kind: DependencyEdgeKind;
  /** Human-readable cite of STEP6-6 cascade / Catalog override. */
  reason: string;
}

export interface DependencyGraph {
  nodes: string[];
  edges: DependencyEdge[];
}

/**
 * Skip / defer hints from analysis only (not Execution Status).
 * Actual SKIPPED/DEFERRED outcomes are produced at Execute time.
 */
export interface DependencySkipHint {
  ruleId: string;
  plannedStatus: "SKIPPED" | "DEFERRED";
  reason: string;
  triggerRuleId?: string;
}

export interface DependencyAnalysis {
  graph: DependencyGraph;
  /** Initial order: Layer L1→L7, then L4 Family Presence→Typing→Domain-check. */
  initialExecutionOrder: string[];
  skipHints: DependencySkipHint[];
}

/**
 * Engine-internal Planner → Scheduler contract.
 * Scheduler consumes this only; Planner does not call Scheduler.
 */
export interface ExecutionPlan {
  kind: "planner.executionPlan";
  /** Active ∩ Coverage In-Run (Required | Optional). */
  activeRules: RuleRecordView[];
  dependencyGraph: DependencyGraph;
  /** Initial order from Dependency analysis — Scheduler may refine timing. */
  executionOrder: string[];
  /** Active ∩ Coverage Deferred (Deferred Item path). */
  deferredRules: RuleRecordView[];
  /**
   * Rules that cannot enter the executable set at plan time
   * (e.g. broken prerequisite cite, cycle).
   */
  blockedRules: RuleRecordView[];
  /** Analysis-only skip/defer hints for Scheduler / Executor. */
  skipHints: DependencySkipHint[];
}

/** Optional dependency override fields on Rule / Index (STEP6-4 Option C). */
export interface RuleDependencyOverride {
  ruleId: string;
  inheritsLayerCascade?: boolean;
  prerequisites?: string[];
  skipWhen?: string;
  blockingCandidate?: boolean;
}
