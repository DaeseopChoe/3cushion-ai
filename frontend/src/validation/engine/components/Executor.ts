/**
 * validation/engine/components/Executor.ts
 *
 * STEP6-7E — Validation Executor.
 * Consumes ExecutionQueue → ExecutionResult(s). Calls EventBus / OutcomeBus.
 * Does not emit Findings / VAL / Report.
 */

import type { IEventBus, IExecutor, IOutcomeBus } from "../interfaces";
import {
  DefaultRuleJudge,
  type RuleJudge,
} from "../execution/RuleJudge";
import type {
  EngineEvent,
  EngineEventType,
  ExecutionBatch,
  ExecutionResult,
} from "../execution/executionModels";
import type { ExecutionQueue, QueueItem } from "../schedule/scheduleModels";
import type { EnginePayload, ExecutionStatus } from "../types";
import { EventBus } from "./EventBus";
import { OutcomeBus } from "./OutcomeBus";

function asExecutionQueue(payload: EnginePayload): ExecutionQueue {
  if (
    payload !== null &&
    typeof payload === "object" &&
    "kind" in payload &&
    (payload as ExecutionQueue).kind === "scheduler.executionQueue"
  ) {
    return payload as ExecutionQueue;
  }
  throw new Error(
    "Executor.execute requires ExecutionQueue (kind=scheduler.executionQueue)",
  );
}

function eventTypeForStatus(status: ExecutionStatus): EngineEventType {
  switch (status) {
    case "PASS":
      return "RulePassed";
    case "FAILED":
      return "RuleFailed";
    case "SKIPPED":
      return "RuleSkipped";
    case "DEFERRED":
      return "RuleDeferred";
    case "BLOCKED":
      return "RuleBlocked";
    case "ERROR":
      return "RuleError";
    default:
      return "RuleBlocked";
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

export class Executor implements IExecutor {
  readonly eventBus: IEventBus;
  readonly outcomeBus: IOutcomeBus;
  readonly ruleJudge: RuleJudge;

  private lastBatch: ExecutionBatch | null = null;

  constructor(
    eventBus: IEventBus = new EventBus(),
    outcomeBus: IOutcomeBus = new OutcomeBus(),
    ruleJudge: RuleJudge = new DefaultRuleJudge(),
  ) {
    this.eventBus = eventBus;
    this.outcomeBus = outcomeBus;
    this.ruleJudge = ruleJudge;
  }

  /**
   * Execute READY queue in order; apply skip/defer/blocked plans.
   * Returns ExecutionBatch (EnginePayload). No FindingEmitter call.
   */
  execute(schedule: EnginePayload): EnginePayload {
    const queue = asExecutionQueue(schedule);
    const startedAt = nowIso();
    const results: ExecutionResult[] = [];
    const statusByRule = new Map<string, ExecutionStatus>();

    this.emitEvent({
      kind: "engine.event",
      eventType: "ValidationStarted",
      at: startedAt,
      detail: { itemCount: queue.items.length },
    });

    // Deferred (not in READY queue) → DEFERRED results
    for (const deferred of queue.deferPlan) {
      const result = this.recordResult(
        {
          ruleId: deferred.ruleId,
          status: "DEFERRED",
          evidence: { reason: deferred.reason },
          elapsedTimeMs: 0,
        },
        statusByRule,
        results,
      );
      void result;
    }

    // Plan-blocked (not in READY queue) → BLOCKED results
    for (const ruleId of queue.excludedBlockedRuleIds) {
      this.recordResult(
        {
          ruleId,
          status: "BLOCKED",
          evidence: {
            reason: "Excluded from READY queue (Planner blocked)",
          },
          elapsedTimeMs: 0,
        },
        statusByRule,
        results,
      );
    }

    // READY items in schedule order
    for (const item of queue.items) {
      const skip = this.resolveSkip(item, queue, statusByRule);
      if (skip) {
        this.recordResult(
          {
            ruleId: item.ruleId,
            status: "SKIPPED",
            layer: item.layer,
            family: item.family,
            evidence: {
              reason: skip.reason,
              triggerRuleId: skip.triggerRuleId,
              skipWhen: skip.skipWhen,
            },
            elapsedTimeMs: 0,
          },
          statusByRule,
          results,
        );
        continue;
      }

      const t0 = performance.now();
      try {
        const judged = this.ruleJudge.judge(item, {
          priorResults: statusByRule,
        });
        const elapsedTimeMs = Math.max(0, performance.now() - t0);

        if (judged.status === "FAILED" && !judged.severity) {
          judged.severity = this.defaultSeverityForLayer(item.layer);
        }

        this.recordResult(
          {
            ruleId: item.ruleId,
            status: judged.status,
            severity: judged.severity,
            evidence: judged.evidence,
            error: judged.error,
            elapsedTimeMs,
            layer: item.layer,
            family: item.family,
          },
          statusByRule,
          results,
        );
      } catch (err) {
        const elapsedTimeMs = Math.max(0, performance.now() - t0);
        this.recordResult(
          {
            ruleId: item.ruleId,
            status: "ERROR",
            layer: item.layer,
            family: item.family,
            elapsedTimeMs,
            error: {
              message: err instanceof Error ? err.message : String(err),
              code: "RULE_JUDGE_FAULT",
            },
          },
          statusByRule,
          results,
        );
      }
    }

    const finishedAt = nowIso();
    this.emitEvent({
      kind: "engine.event",
      eventType: "ValidationFinished",
      at: finishedAt,
      detail: { resultCount: results.length },
    });

    const batch: ExecutionBatch = {
      kind: "executor.executionBatch",
      results,
      startedAt,
      finishedAt,
    };
    this.lastBatch = batch;
    return batch;
  }

  getLastBatch(): ExecutionBatch | null {
    return this.lastBatch;
  }

  private resolveSkip(
    item: QueueItem,
    queue: ExecutionQueue,
    statusByRule: Map<string, ExecutionStatus>,
  ): { reason: string; triggerRuleId?: string; skipWhen?: string } | null {
    const hints = queue.skipPlan.filter((s) => s.ruleId === item.ruleId);
    for (const hint of hints) {
      if (!hint.triggerRuleId) continue;
      const triggerStatus = statusByRule.get(hint.triggerRuleId);
      // Cascade / prereq skip when predecessor FAILED (STEP6-6 §7.2).
      if (triggerStatus === "FAILED" || triggerStatus === "ERROR") {
        return {
          reason: hint.reason,
          triggerRuleId: hint.triggerRuleId,
          skipWhen: hint.skipWhen,
        };
      }
    }
    return null;
  }

  private defaultSeverityForLayer(
    layer: string | undefined,
  ): "BLOCKER" | "ERROR" {
    if (!layer) return "ERROR";
    const m = String(layer).trim().match(/^L?([12])$/i);
    return m ? "BLOCKER" : "ERROR";
  }

  private recordResult(
    result: ExecutionResult,
    statusByRule: Map<string, ExecutionStatus>,
    results: ExecutionResult[],
  ): ExecutionResult {
    statusByRule.set(result.ruleId, result.status);
    results.push(result);

    this.emitEvent({
      kind: "engine.event",
      eventType: eventTypeForStatus(result.status),
      ruleId: result.ruleId,
      status: result.status,
      at: nowIso(),
      detail: {
        severity: result.severity,
        elapsedTimeMs: result.elapsedTimeMs,
      },
    });

    this.outcomeBus.publish({
      kind: "executor.outcome",
      result,
    });

    return result;
  }

  private emitEvent(event: EngineEvent): void {
    this.eventBus.emit(event);
  }
}
