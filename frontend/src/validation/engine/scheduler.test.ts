/**
 * STEP6-7D smoke — Scheduler ExecutionPlan → READY ExecutionQueue.
 */
import { describe, expect, it } from "vitest";
import {
  Scheduler,
  ValidationEngine,
} from "./index";
import type { CatalogSource, RegisterSource, RuleRecordView } from "./models";
import type { ExecutionPlan } from "./plan/planModels";

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
      ruleId: "R-L4-P",
      registerState: "Active",
      primaryLayer: "L4",
      family: "F-PRESENCE",
    }),
    rule({
      ruleId: "R-L4-T",
      registerState: "Active",
      primaryLayer: "L4",
      family: "F-TYPING",
    }),
    rule({
      ruleId: "R-L7-DEF",
      registerState: "Active",
      primaryLayer: "L7",
      coverageClass: "Deferred",
    }),
  ],
};

describe("STEP6-7D Scheduler", () => {
  it("builds READY queue from ExecutionPlan and excludes Deferred", () => {
    const engine = new ValidationEngine();
    engine.loadCatalog(catalogSource);
    engine.loadRegister(registerSource);
    engine.validateHeader();
    const plan = engine.plan();
    const queue = engine.schedule();

    expect(queue.kind).toBe("scheduler.executionQueue");
    if (queue.kind !== "scheduler.executionQueue") throw new Error("unexpected");

    expect(queue.items.map((i) => i.ruleId)).toEqual([
      "R-L1",
      "R-L4-P",
      "R-L4-T",
    ]);
    expect(queue.items.every((i) => i.status === "READY")).toBe(true);
    expect(queue.items[0].priority).toBe(0);
    expect(queue.deferPlan.map((d) => d.ruleId)).toContain("R-L7-DEF");
    expect(queue.items.map((i) => i.ruleId)).not.toContain("R-L7-DEF");
    expect(queue.skipPlan.length).toBeGreaterThan(0);

    if (plan.kind !== "planner.executionPlan") throw new Error("unexpected");
    expect(queue.items.map((i) => i.ruleId)).toEqual(plan.executionOrder);
  });

  it("excludes blocked rules from READY queue", () => {
    const scheduler = new Scheduler();
    const plan: ExecutionPlan = {
      kind: "planner.executionPlan",
      activeRules: [
        rule({
          ruleId: "R-OK",
          registerState: "Active",
          primaryLayer: "L3",
        }),
      ],
      dependencyGraph: { nodes: ["R-OK"], edges: [] },
      executionOrder: ["R-OK", "R-BAD"],
      deferredRules: [],
      blockedRules: [
        rule({
          ruleId: "R-BAD",
          registerState: "Active",
          primaryLayer: "L5",
          prerequisites: ["R-MISSING"],
        }),
      ],
      skipHints: [],
    };

    const queue = scheduler.schedule(plan);
    if (queue.kind !== "scheduler.executionQueue") throw new Error("unexpected");
    expect(queue.items.map((i) => i.ruleId)).toEqual(["R-OK"]);
    expect(queue.excludedBlockedRuleIds).toContain("R-BAD");
  });
});
