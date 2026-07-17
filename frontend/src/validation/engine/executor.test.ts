/**
 * STEP6-7E smoke — Executor ExecutionQueue → ExecutionBatch + cascade SKIPPED.
 */
import { describe, expect, it } from "vitest";
import {
  Executor,
  EventBus,
  OutcomeBus,
  ValidationEngine,
  type RuleJudge,
  type QueueItem,
} from "./index";
import type { CatalogSource, RegisterSource, RuleRecordView } from "./models";
import type { ExecutionQueue } from "./schedule/scheduleModels";

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
      ruleId: "R-L1",
      registerState: "Active",
      primaryLayer: "L1",
      family: "F-PRESENCE",
    }),
    rule({
      ruleId: "R-L4",
      registerState: "Active",
      primaryLayer: "L4",
      family: "F-TYPING",
    }),
    rule({
      ruleId: "R-DEF",
      registerState: "Active",
      primaryLayer: "L7",
      coverageClass: "Deferred",
    }),
  ],
};

describe("STEP6-7E Executor", () => {
  it("executes READY queue with DefaultRuleJudge PASS and emits events/outcomes", () => {
    const engine = new ValidationEngine();
    engine.loadCatalog(catalogSource);
    engine.loadRegister(registerSource);
    engine.validateHeader();
    engine.plan();
    engine.schedule();
    const batch = engine.execute();

    expect(batch.kind).toBe("executor.executionBatch");
    if (batch.kind !== "executor.executionBatch") throw new Error("unexpected");

    const byId = Object.fromEntries(batch.results.map((r) => [r.ruleId, r]));
    expect(byId["R-L1"].status).toBe("PASS");
    expect(byId["R-L4"].status).toBe("PASS");
    expect(byId["R-DEF"].status).toBe("DEFERRED");

    expect(
      engine.eventBus.getEvents().some((e) => e.eventType === "ValidationStarted"),
    ).toBe(true);
    expect(
      engine.eventBus.getEvents().some((e) => e.eventType === "RulePassed"),
    ).toBe(true);
    expect(engine.outcomeBus.getOutcomes().length).toBe(batch.results.length);
  });

  it("applies skipPlan when trigger FAILED", () => {
    const failingJudge: RuleJudge = {
      judge(item: QueueItem) {
        if (item.ruleId === "R-L1") {
          return { status: "FAILED", severity: "BLOCKER" };
        }
        return { status: "PASS" };
      },
    };

    const eventBus = new EventBus();
    const outcomeBus = new OutcomeBus();
    const executor = new Executor(eventBus, outcomeBus, failingJudge);

    const queue: ExecutionQueue = {
      kind: "scheduler.executionQueue",
      items: [
        {
          ruleId: "R-L1",
          layer: "L1",
          priority: 0,
          status: "READY",
        },
        {
          ruleId: "R-L4",
          layer: "L4",
          priority: 1,
          status: "READY",
        },
      ],
      skipPlan: [
        {
          ruleId: "R-L4",
          triggerRuleId: "R-L1",
          reason: "layer-cascade",
        },
      ],
      deferPlan: [],
      excludedBlockedRuleIds: [],
    };

    const batch = executor.execute(queue);
    if (batch.kind !== "executor.executionBatch") throw new Error("unexpected");
    expect(batch.results.find((r) => r.ruleId === "R-L1")?.status).toBe(
      "FAILED",
    );
    expect(batch.results.find((r) => r.ruleId === "R-L4")?.status).toBe(
      "SKIPPED",
    );
    expect(
      eventBus.getEvents().some((e) => e.eventType === "RuleSkipped"),
    ).toBe(true);
  });
});
