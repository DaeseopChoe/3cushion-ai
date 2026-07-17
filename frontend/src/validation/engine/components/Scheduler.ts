/**
 * validation/engine/components/Scheduler.ts
 *
 * STEP6-7D — Validation Scheduler.
 * Decides WHEN (order / READY queue). Does not execute Rules or call Executor.
 */

import type { IScheduler } from "../interfaces";
import { buildExecutionQueue } from "../schedule/buildExecutionQueue";
import type { ExecutionQueue } from "../schedule/scheduleModels";
import type { EnginePayload } from "../types";

export class Scheduler implements IScheduler {
  private lastQueue: ExecutionQueue | null = null;

  /**
   * ExecutionPlan → ExecutionQueue (READY items + SkipPlan + DeferPlan).
   * Does not run validators; does not change Execution Status (PASS/FAILED/…).
   */
  schedule(plan: EnginePayload): EnginePayload {
    const queue = buildExecutionQueue(plan);
    this.lastQueue = queue;
    return queue;
  }

  getLastQueue(): ExecutionQueue | null {
    return this.lastQueue;
  }
}
