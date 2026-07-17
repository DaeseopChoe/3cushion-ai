/**
 * validation/engine/components/DependencyResolver.ts
 *
 * STEP6-7C — Dependency analysis only (STEP6-6 §7).
 * Builds graph + initial order + skip hints. Does not execute Rules.
 * Does not call Scheduler.
 */

import type { IDependencyResolver } from "../interfaces";
import type { RuleRecordView } from "../models";
import {
  comparePlanOrder,
  isBlockingLayer,
  l4FamilyRank,
  layerRank,
  looksBlockingCandidate,
} from "../plan/layerFamily";
import type {
  DependencyAnalysis,
  DependencyEdge,
  DependencySkipHint,
  RuleDependencyOverride,
} from "../plan/planModels";
import { resolveDependencyOverrides } from "../plan/resolveDependencyIndex";
import type { EnginePayload, RuleRef } from "../types";

export interface DependencyResolveInput {
  candidateRules: RuleRecordView[];
  deferredRules?: RuleRecordView[];
  dependencyIndex?: unknown;
}

function inheritsCascade(
  ruleId: string,
  overrides: Map<string, RuleDependencyOverride>,
): boolean {
  const o = overrides.get(ruleId);
  if (o?.inheritsLayerCascade === false) return false;
  return true;
}

function isRuleRecordView(value: unknown): value is RuleRecordView {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof (value as RuleRecordView).ruleId === "string" &&
    typeof (value as RuleRecordView).registerState === "string"
  );
}

export class DependencyResolver implements IDependencyResolver {
  /**
   * Analyze CandidateRuleSet (Active ∩ Coverage In-Run).
   * Analysis only — no Rule execution, no Scheduler call.
   */
  analyze(input: DependencyResolveInput): DependencyAnalysis {
    const candidates = [...input.candidateRules].sort(comparePlanOrder);
    const deferred = input.deferredRules ?? [];
    const overrides = resolveDependencyOverrides(
      [...candidates, ...deferred],
      input.dependencyIndex,
    );

    const nodes = candidates.map((r) => r.ruleId);
    const edges: DependencyEdge[] = [];
    const skipHints: DependencySkipHint[] = [];

    for (const rule of deferred) {
      skipHints.push({
        ruleId: rule.ruleId,
        plannedStatus: "DEFERRED",
        reason: "CoverageClass Deferred (STEP6-6 §7.2 / §9.1)",
      });
    }

    const byLayer = new Map<number, RuleRecordView[]>();
    for (const rule of candidates) {
      const layer = layerRank(rule.primaryLayer);
      const list = byLayer.get(layer) ?? [];
      list.push(rule);
      byLayer.set(layer, list);
    }

    const blockers = candidates.filter(
      (r) =>
        looksBlockingCandidate(r) ||
        overrides.get(r.ruleId)?.blockingCandidate === true,
    );

    for (const blocker of blockers) {
      const blockerLayer = layerRank(blocker.primaryLayer);
      const explicitBlocking =
        overrides.get(blocker.ruleId)?.blockingCandidate === true;
      if (!isBlockingLayer(blockerLayer) && !explicitBlocking) continue;
      if (!inheritsCascade(blocker.ruleId, overrides)) continue;

      for (const deeper of candidates) {
        if (deeper.ruleId === blocker.ruleId) continue;
        if (!inheritsCascade(deeper.ruleId, overrides)) continue;
        const deeperLayer = layerRank(deeper.primaryLayer);
        if (deeperLayer <= blockerLayer || deeperLayer > 7) continue;

        edges.push({
          fromRuleId: blocker.ruleId,
          toRuleId: deeper.ruleId,
          kind: "layer-cascade",
          reason:
            "Framework L1/L2 BLOCKER → deeper SKIPPED (STEP6-6 §7 Lean Option C)",
        });
        skipHints.push({
          ruleId: deeper.ruleId,
          plannedStatus: "SKIPPED",
          triggerRuleId: blocker.ruleId,
          reason:
            "Skip if blocking predecessor FAILED (analysis hint; not executed)",
        });
      }
    }

    const l4 = (byLayer.get(4) ?? []).sort(comparePlanOrder);
    for (let i = 0; i < l4.length; i++) {
      for (let j = i + 1; j < l4.length; j++) {
        const a = l4[i];
        const b = l4[j];
        const ra = l4FamilyRank(a.family, 4);
        const rb = l4FamilyRank(b.family, 4);
        if (ra >= rb) continue;
        if (ra < 1 || ra > 3 || rb < 1 || rb > 3) continue;

        edges.push({
          fromRuleId: a.ruleId,
          toRuleId: b.ruleId,
          kind: "l4-family-chain",
          reason:
            "L4 Family chain Presence → Typing → Domain-check (STEP6-6 §7.2)",
        });
        skipHints.push({
          ruleId: b.ruleId,
          plannedStatus: "SKIPPED",
          triggerRuleId: a.ruleId,
          reason:
            "Skip if prior L4 Family step FAILED (analysis hint; not executed)",
        });
      }
    }

    for (const rule of candidates) {
      const prereqs = overrides.get(rule.ruleId)?.prerequisites ?? [];
      for (const pre of prereqs) {
        edges.push({
          fromRuleId: pre,
          toRuleId: rule.ruleId,
          kind: "prerequisite",
          reason: "Catalog/Register prerequisite override (STEP6-6 §7.1)",
        });
        skipHints.push({
          ruleId: rule.ruleId,
          plannedStatus: "SKIPPED",
          triggerRuleId: pre,
          reason: "Skip if prerequisite FAILED (analysis hint; not executed)",
        });
      }
    }

    const hintKey = (h: DependencySkipHint) =>
      `${h.ruleId}|${h.plannedStatus}|${h.triggerRuleId ?? ""}|${h.reason}`;
    const uniqueHints = [
      ...new Map(skipHints.map((h) => [hintKey(h), h])).values(),
    ];

    const edgeKey = (e: DependencyEdge) =>
      `${e.fromRuleId}|${e.toRuleId}|${e.kind}`;
    const uniqueEdges = [
      ...new Map(edges.map((e) => [edgeKey(e), e])).values(),
    ];

    return {
      graph: { nodes, edges: uniqueEdges },
      initialExecutionOrder: candidates.map((r) => r.ruleId),
      skipHints: uniqueHints,
    };
  }

  /**
   * IDependencyResolver entry — accepts RuleRecordView[] or DependencyResolveInput-like object.
   * Returns a planning intermediate wrapped for EnginePayload consumers via analyze result
   * embedded in a temporary ExecutionPlan-less path: callers should prefer analyze().
   */
  resolve(rules: RuleRef[]): EnginePayload {
    if (
      rules.length === 1 &&
      rules[0] !== null &&
      typeof rules[0] === "object" &&
      "candidateRules" in (rules[0] as object)
    ) {
      const analysis = this.analyze(rules[0] as DependencyResolveInput);
      return {
        kind: "planner.executionPlan",
        activeRules: (rules[0] as DependencyResolveInput).candidateRules,
        dependencyGraph: analysis.graph,
        executionOrder: analysis.initialExecutionOrder,
        deferredRules: (rules[0] as DependencyResolveInput).deferredRules ?? [],
        blockedRules: [],
        skipHints: analysis.skipHints,
      };
    }

    const candidateRules = rules.filter(isRuleRecordView);
    const analysis = this.analyze({ candidateRules });
    return {
      kind: "planner.executionPlan",
      activeRules: candidateRules,
      dependencyGraph: analysis.graph,
      executionOrder: analysis.initialExecutionOrder,
      deferredRules: [],
      blockedRules: [],
      skipHints: analysis.skipHints,
    };
  }
}
