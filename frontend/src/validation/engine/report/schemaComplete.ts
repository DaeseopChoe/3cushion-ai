/**
 * validation/engine/report/schemaComplete.ts
 *
 * Lean schemaComplete cite (Framework owns semantics; algorithms Pending).
 * ValidationMode is Report metadata: only Production may claim YES (U8 lean).
 */

import type { ExecutionBatch } from "../execution/executionModels";
import type { AggregatedFindingSet } from "../finding/findingModels";
import type { SchemaCompleteCite, ValidationMode } from "./reportModels";

export function citeSchemaComplete(input: {
  mode: ValidationMode;
  executionBatch: ExecutionBatch | null;
  aggregated: AggregatedFindingSet;
}): SchemaCompleteCite {
  if (!input.executionBatch || input.executionBatch.results.length === 0) {
    return "NOT_RUN";
  }

  const hasBlockerFinding = input.aggregated.findings.some(
    (f) => f.severity === "BLOCKER" || f.severity === "ERROR",
  );
  if (hasBlockerFinding) return "NO";

  // Design / Pilot: do not claim Production schemaComplete YES.
  if (input.mode === "Design" || input.mode === "Pilot") {
    return "UNDECIDED";
  }

  const hasError = input.executionBatch.results.some((r) => r.status === "ERROR");
  if (hasError) return "UNDECIDED";

  const allPassOrSkippedOrDeferred = input.executionBatch.results.every((r) =>
    ["PASS", "SKIPPED", "DEFERRED"].includes(r.status),
  );
  if (allPassOrSkippedOrDeferred && input.aggregated.findings.length === 0) {
    return "YES";
  }

  return "UNDECIDED";
}
