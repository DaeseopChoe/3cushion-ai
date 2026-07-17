/**
 * validation/engine/plan/ExecutionPlanBuilder.ts
 *
 * STEP6-7C — Assemble ExecutionPlan for Scheduler consumption.
 */

import type { RuleRecordView } from "../models";
import type { DependencyResolver } from "../components/DependencyResolver";
import type { DependencyAnalysis, ExecutionPlan } from "./planModels";

export interface ExecutionPlanBuilderInput {
  inRunRules: RuleRecordView[];
  deferredRules: RuleRecordView[];
  /** Active rules with unknown coverage — treated as blocked at plan time. */
  unknownCoverageRules?: RuleRecordView[];
  dependencyIndex?: unknown;
  dependencyResolver: DependencyResolver;
}

function findBrokenPrerequisiteRules(
  inRun: readonly RuleRecordView[],
  analysis: DependencyAnalysis,
): Set<string> {
  const known = new Set(inRun.map((r) => r.ruleId));
  const broken = new Set<string>();

  // Prefer RuleRecordView.prerequisites (Catalog/Register cite).
  for (const rule of inRun) {
    for (const pre of rule.prerequisites ?? []) {
      if (!known.has(pre)) broken.add(rule.ruleId);
    }
  }

  // Also honor graph prerequisite edges from Dependency Index merges.
  for (const edge of analysis.graph.edges) {
    if (edge.kind !== "prerequisite") continue;
    if (!known.has(edge.fromRuleId)) {
      broken.add(edge.toRuleId);
    }
  }
  return broken;
}

function findCycleNodes(analysis: DependencyAnalysis): Set<string> {
  const graph = new Map<string, string[]>();
  for (const id of analysis.graph.nodes) graph.set(id, []);
  for (const e of analysis.graph.edges) {
    if (!graph.has(e.fromRuleId) || !graph.has(e.toRuleId)) continue;
    graph.get(e.fromRuleId)!.push(e.toRuleId);
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const cyclic = new Set<string>();

  function dfs(node: string): void {
    if (visited.has(node)) return;
    if (visiting.has(node)) {
      cyclic.add(node);
      return;
    }
    visiting.add(node);
    for (const next of graph.get(node) ?? []) dfs(next);
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of graph.keys()) dfs(node);
  return cyclic;
}

export class ExecutionPlanBuilder {
  build(input: ExecutionPlanBuilderInput): ExecutionPlan {
    const analysis = input.dependencyResolver.analyze({
      candidateRules: input.inRunRules,
      deferredRules: input.deferredRules,
      dependencyIndex: input.dependencyIndex,
    });

    const brokenPrereq = findBrokenPrerequisiteRules(
      input.inRunRules,
      analysis,
    );
    const cyclic = findCycleNodes(analysis);
    const blockedIds = new Set<string>([
      ...brokenPrereq,
      ...cyclic,
      ...(input.unknownCoverageRules ?? []).map((r) => r.ruleId),
    ]);

    const blockedRules: RuleRecordView[] = [
      ...input.inRunRules.filter((r) => blockedIds.has(r.ruleId)),
      ...(input.unknownCoverageRules ?? []),
    ];
    // Dedupe blocked by ruleId
    const blockedMap = new Map(blockedRules.map((r) => [r.ruleId, r]));
    const blockedUnique = [...blockedMap.values()];

    const activeRules = input.inRunRules.filter((r) => !blockedIds.has(r.ruleId));
    const activeIdSet = new Set(activeRules.map((r) => r.ruleId));

    const executionOrder = analysis.initialExecutionOrder.filter((id) =>
      activeIdSet.has(id),
    );

    const graphNodes = activeRules.map((r) => r.ruleId);
    const graphEdges = analysis.graph.edges.filter(
      (e) => activeIdSet.has(e.fromRuleId) && activeIdSet.has(e.toRuleId),
    );

    const skipHints = analysis.skipHints.filter(
      (h) =>
        activeIdSet.has(h.ruleId) ||
        input.deferredRules.some((d) => d.ruleId === h.ruleId),
    );

    return {
      kind: "planner.executionPlan",
      activeRules,
      dependencyGraph: { nodes: graphNodes, edges: graphEdges },
      executionOrder,
      deferredRules: [...input.deferredRules],
      blockedRules: blockedUnique,
      skipHints,
    };
  }
}
