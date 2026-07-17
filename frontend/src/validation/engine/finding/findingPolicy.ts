/**
 * validation/engine/finding/findingPolicy.ts
 *
 * STEP6-7F — When to create VAL-* (STEP6-6 §11.1). Consume Only.
 */

import type { ExecutionResult } from "../execution/executionModels";

export type FindingEmitMode = "default" | "includeWarningFailed";

/**
 * Default Finding policy:
 * - FAILED + BLOCKER / ERROR → emit
 * - FAILED + WARNING → emit when includeWarningFailed (U9 pending; lean on)
 * - FAILED + INFO / missing severity → treat as ERROR-class emit
 * - PASS / SKIPPED / DEFERRED / NOT_RUN / BLOCKED → no Finding
 * - ERROR (infra) → no Schema Rule VAL (lean)
 */
export function shouldEmitFinding(
  result: ExecutionResult,
  mode: FindingEmitMode = "includeWarningFailed",
): boolean {
  if (result.status !== "FAILED") return false;

  const severity = result.severity ?? "ERROR";
  if (severity === "BLOCKER" || severity === "ERROR") return true;
  if (severity === "WARNING") return mode === "includeWarningFailed";
  // INFO on FAILED — lean: emit as soft finding
  return mode === "includeWarningFailed";
}

export function allocateValId(seq: number): string {
  return `VAL-${String(seq).padStart(6, "0")}`;
}

export function buildFindingMessage(result: ExecutionResult): string {
  const sev = result.severity ? ` [${result.severity}]` : "";
  const err = result.error?.message ? `: ${result.error.message}` : "";
  return `Rule ${result.ruleId} ${result.status}${sev}${err}`;
}
