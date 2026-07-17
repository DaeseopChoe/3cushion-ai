/**
 * validation/engine/schedule/buildExecutionQueue.ts
 *
 * STEP6-7D — ExecutionPlan → ExecutionQueue conversion rules.
 */

import type { ExecutionPlan } from "../plan/planModels";
import type {
  DeferPlanEntry,
  ExecutionQueue,
  QueueItem,
  SkipPlanEntry,
} from "./scheduleModels";

function asExecutionPlan(plan: unknown): ExecutionPlan {
  if (
    plan !== null &&
    typeof plan === "object" &&
    "kind" in plan &&
    (plan as ExecutionPlan).kind === "planner.executionPlan"
  ) {
    return plan as ExecutionPlan;
  }
  throw new Error(
    "Scheduler.schedule requires ExecutionPlan (kind=planner.executionPlan)",
  );
}

/**
 * Convert ExecutionPlan → READY ExecutionQueue.
 * Does not execute Rules; does not emit FAIL / VAL / Execution Status.
 */
export function buildExecutionQueue(planInput: unknown): ExecutionQueue {
  const plan = asExecutionPlan(planInput);

  const deferredIds = new Set(plan.deferredRules.map((r) => r.ruleId));
  const blockedIds = new Set(plan.blockedRules.map((r) => r.ruleId));
  const activeById = new Map(plan.activeRules.map((r) => [r.ruleId, r]));

  const deferPlan: DeferPlanEntry[] = plan.deferredRules.map((r) => {
    const hint = plan.skipHints.find(
      (h) => h.ruleId === r.ruleId && h.plannedStatus === "DEFERRED",
    );
    return {
      ruleId: r.ruleId,
      reason:
        hint?.reason ??
        "CoverageClass Deferred — excluded from READY queue (STEP6-6 §9.1)",
    };
  });

  // Also capture DEFERRED skipHints not already on deferredRules (defensive).
  for (const hint of plan.skipHints) {
    if (hint.plannedStatus !== "DEFERRED") continue;
    if (deferPlan.some((d) => d.ruleId === hint.ruleId)) continue;
    deferPlan.push({ ruleId: hint.ruleId, reason: hint.reason });
    deferredIds.add(hint.ruleId);
  }

  const skipPlan: SkipPlanEntry[] = [];
  const skipSeen = new Set<string>();
  for (const hint of plan.skipHints) {
    if (hint.plannedStatus !== "SKIPPED") continue;
    // Do not put deferred/blocked into skipPlan as executable skips.
    if (deferredIds.has(hint.ruleId) || blockedIds.has(hint.ruleId)) continue;
    const key = `${hint.ruleId}|${hint.triggerRuleId ?? ""}|${hint.reason}`;
    if (skipSeen.has(key)) continue;
    skipSeen.add(key);

    const rule = activeById.get(hint.ruleId);
    skipPlan.push({
      ruleId: hint.ruleId,
      reason: hint.reason,
      triggerRuleId: hint.triggerRuleId,
      skipWhen: rule?.skipWhen,
    });
  }

  const items: QueueItem[] = [];
  const queued = new Set<string>();

  for (const ruleId of plan.executionOrder) {
    if (deferredIds.has(ruleId) || blockedIds.has(ruleId)) continue;
    if (queued.has(ruleId)) continue;

    const rule = activeById.get(ruleId);
    if (!rule) continue;

    items.push({
      ruleId,
      layer: rule.primaryLayer,
      family: rule.family,
      priority: items.length,
      status: "READY",
      domain: rule.domain,
      coverageClass: rule.coverageClass,
    });
    queued.add(ruleId);
  }

  // Active rules missing from executionOrder but not deferred/blocked — append stably.
  for (const rule of plan.activeRules) {
    if (queued.has(rule.ruleId)) continue;
    if (deferredIds.has(rule.ruleId) || blockedIds.has(rule.ruleId)) continue;
    items.push({
      ruleId: rule.ruleId,
      layer: rule.primaryLayer,
      family: rule.family,
      priority: items.length,
      status: "READY",
      domain: rule.domain,
      coverageClass: rule.coverageClass,
    });
    queued.add(rule.ruleId);
  }

  return {
    kind: "scheduler.executionQueue",
    items,
    skipPlan,
    deferPlan,
    excludedBlockedRuleIds: [...blockedIds],
  };
}
