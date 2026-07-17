/**
 * validation/engine/components/OutcomeBus.ts
 *
 * STEP6-7E — Accept-only Outcome Bus sink.
 * Normalizes/receives Execution Status publications; no Aggregator fan-out yet.
 */

import type { IOutcomeBus } from "../interfaces";
import type { OutcomePublication } from "../execution/executionModels";
import type { EnginePayload } from "../types";

export class OutcomeBus implements IOutcomeBus {
  private readonly outcomes: OutcomePublication[] = [];

  /** Accept Execution Outcomes. No downstream implementation. */
  publish(outcome: EnginePayload): void {
    if (
      outcome !== null &&
      typeof outcome === "object" &&
      "kind" in outcome &&
      (outcome as OutcomePublication).kind === "executor.outcome"
    ) {
      this.outcomes.push(outcome as OutcomePublication);
      return;
    }
    // Accept raw ExecutionResult-shaped payloads.
    if (
      outcome !== null &&
      typeof outcome === "object" &&
      "ruleId" in outcome &&
      "status" in outcome
    ) {
      this.outcomes.push({
        kind: "executor.outcome",
        result: outcome as OutcomePublication["result"],
      });
    }
  }

  getOutcomes(): readonly OutcomePublication[] {
    return this.outcomes;
  }

  clear(): void {
    this.outcomes.length = 0;
  }
}
