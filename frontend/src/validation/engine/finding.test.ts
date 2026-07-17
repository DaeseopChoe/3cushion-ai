/**
 * STEP6-7F smoke — FindingEmitter / Aggregator.
 */
import { describe, expect, it } from "vitest";
import {
  Aggregator,
  Executor,
  EventBus,
  FindingEmitter,
  OutcomeBus,
  ValidationEngine,
  type RuleJudge,
  type QueueItem,
} from "./index";
import type { CatalogSource, RegisterSource, RuleRecordView } from "./models";
import type { ExecutionBatch } from "./execution/executionModels";

const catalogSource: CatalogSource = {
  header: {
    catalogVersion: "1.0",
    catalogRevision: "r1",
    compatibleSpsVersion: "SPS v1.0",
    compatibleFrameworkVersion: "v1.0",
    compatiblePipelineVersion: "v0.6",
    generatedFrom: "STEP6-4",
    lastUpdated: "2026-07-17",
  },
};

function rule(
  partial: Pick<RuleRecordView, "ruleId" | "registerState"> &
    Partial<RuleRecordView>,
): RuleRecordView {
  return {
    catalogVersion: "1.0",
    catalogRevision: "r1",
    coverageClass: "Required",
    ...partial,
  };
}

const registerSource: RegisterSource = {
  header: {
    catalogVersion: "1.0",
    catalogRevision: "r1",
    catalogPinId: "pin-1",
  },
  pin: {
    catalogPinId: "pin-1",
    catalogVersion: "1.0",
    catalogRevision: "r1",
    compatibleSpsVersion: "SPS v1.0",
    compatibleFrameworkVersion: "v1.0",
    compatiblePipelineVersion: "v0.6",
  },
  ruleRecords: [
    rule({
      ruleId: "R-OK",
      registerState: "Active",
      primaryLayer: "L3",
    }),
  ],
};

describe("STEP6-7F FindingEmitter / Aggregator", () => {
  it("emits no Findings for default PASS batch", () => {
    const engine = new ValidationEngine();
    engine.loadCatalog(catalogSource);
    engine.loadRegister(registerSource);
    engine.validateHeader();
    engine.plan();
    engine.schedule();
    engine.execute();
    const findingBatch = engine.emitFinding();

    expect(findingBatch.kind).toBe("finding.batch");
    if (findingBatch.kind !== "finding.batch") throw new Error("unexpected");
    expect(findingBatch.findings).toHaveLength(0);

    const aggregated = engine.aggregate();
    expect(aggregated.kind).toBe("finding.aggregated");
    if (aggregated.kind !== "finding.aggregated") throw new Error("unexpected");
    expect(aggregated.counts.total).toBe(0);
  });

  it("emits VAL-* for FAILED+BLOCKER and aggregates", () => {
    const failingJudge: RuleJudge = {
      judge(item: QueueItem) {
        if (item.ruleId === "R-FAIL") {
          return { status: "FAILED", severity: "BLOCKER", evidence: { x: 1 } };
        }
        return { status: "PASS" };
      },
    };

    const executor = new Executor(new EventBus(), new OutcomeBus(), failingJudge);
    const batch = executor.execute({
      kind: "scheduler.executionQueue",
      items: [
        { ruleId: "R-FAIL", layer: "L1", priority: 0, status: "READY" },
        { ruleId: "R-PASS", layer: "L4", priority: 1, status: "READY" },
      ],
      skipPlan: [],
      deferPlan: [{ ruleId: "R-DEF", reason: "Deferred" }],
      excludedBlockedRuleIds: [],
    }) as ExecutionBatch;

    const emitter = new FindingEmitter({
      pinCite: {
        catalogPinId: "pin-1",
        catalogVersion: "1.0",
        catalogRevision: "r1",
      },
    });
    const findingBatch = emitter.emitBatch(batch);
    expect(findingBatch.findings).toHaveLength(1);
    expect(findingBatch.findings[0].findingId).toBe("VAL-000001");
    expect(findingBatch.findings[0].ruleId).toBe("R-FAIL");
    expect(findingBatch.findings[0].pin?.catalogPinId).toBe("pin-1");

    const aggregator = new Aggregator();
    const set = aggregator.aggregateBatch(findingBatch);
    expect(set.counts.total).toBe(1);
    expect(set.byRuleId["R-FAIL"]).toHaveLength(1);
    expect(set.counts.bySeverity.BLOCKER).toBe(1);
  });
});
