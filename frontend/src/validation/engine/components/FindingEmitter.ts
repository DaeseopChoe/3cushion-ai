/**
 * validation/engine/components/FindingEmitter.ts
 *
 * STEP6-7F — ExecutionBatch → FindingBatch (VAL-*).
 * Converts ExecutionResult → Finding only; does not re-validate.
 */

import type { IFindingEmitter } from "../interfaces";
import type { ExecutionBatch } from "../execution/executionModels";
import type { IngressValidatedPayload } from "../models";
import {
  allocateValId,
  buildFindingMessage,
  shouldEmitFinding,
  type FindingEmitMode,
} from "../finding/findingPolicy";
import type {
  Finding,
  FindingBatch,
  FindingPinCite,
} from "../finding/findingModels";
import type { EnginePayload, FindingRef } from "../types";

export interface FindingEmitterOptions {
  emitMode?: FindingEmitMode;
  /** Optional Pin cite from Ingress (Consume Only). */
  pinCite?: FindingPinCite;
}

function asExecutionBatch(payload: EnginePayload): ExecutionBatch {
  if (
    payload !== null &&
    typeof payload === "object" &&
    "kind" in payload &&
    (payload as ExecutionBatch).kind === "executor.executionBatch"
  ) {
    return payload as ExecutionBatch;
  }
  throw new Error(
    "FindingEmitter.emit requires ExecutionBatch (kind=executor.executionBatch)",
  );
}

function batchIdOf(batch: ExecutionBatch): string {
  return `exec-${batch.startedAt}-${batch.finishedAt}`;
}

export class FindingEmitter implements IFindingEmitter {
  private seq = 0;
  private lastBatch: FindingBatch | null = null;
  private emitMode: FindingEmitMode;
  private pinCite?: FindingPinCite;

  constructor(options: FindingEmitterOptions = {}) {
    this.emitMode = options.emitMode ?? "includeWarningFailed";
    this.pinCite = options.pinCite;
  }

  setPinCite(pinCite: FindingPinCite | undefined): void {
    this.pinCite = pinCite;
  }

  /** Bind Pin cite from validated Ingress payload (optional). */
  bindIngress(payload: IngressValidatedPayload): void {
    this.pinCite = {
      catalogPinId: payload.register.pin.catalogPinId,
      catalogVersion: payload.register.pin.catalogVersion,
      catalogRevision: payload.register.pin.catalogRevision,
    };
  }

  /**
   * Emit FindingBatch from ExecutionBatch.
   * Returns Finding[] for IFindingEmitter; full batch via getLastBatch().
   */
  emit(outcome: EnginePayload): FindingRef[] {
    const batch = this.emitBatch(outcome);
    return batch.findings;
  }

  emitBatch(outcome: EnginePayload): FindingBatch {
    const execution = asExecutionBatch(outcome);
    const sourceExecutionBatchId = batchIdOf(execution);
    const findings: Finding[] = [];

    for (const result of execution.results) {
      if (!shouldEmitFinding(result, this.emitMode)) continue;

      this.seq += 1;
      const finding: Finding = {
        findingId: allocateValId(this.seq),
        ruleId: result.ruleId,
        executionStatus: result.status,
        severity: result.severity ?? "ERROR",
        evidence: result.evidence,
        trace: {
          sourceExecutionBatchId,
          ruleId: result.ruleId,
          elapsedTimeMs: result.elapsedTimeMs,
          errorCode: result.error?.code,
        },
        layer: result.layer,
        family: result.family,
        pin: this.pinCite,
        message: buildFindingMessage(result),
      };
      findings.push(finding);
    }

    const findingBatch: FindingBatch = {
      kind: "finding.batch",
      findings,
      createdAt: new Date().toISOString(),
      sourceExecutionBatchId,
    };
    this.lastBatch = findingBatch;
    return findingBatch;
  }

  getLastBatch(): FindingBatch | null {
    return this.lastBatch;
  }
}
