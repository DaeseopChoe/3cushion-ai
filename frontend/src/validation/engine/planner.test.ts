/**
 * STEP6-7C smoke — Planner Active / Coverage / Dependency → ExecutionPlan.
 */
import { describe, expect, it } from "vitest";
import {
  Ingress,
  Planner,
  ValidationEngine,
} from "./index";
import type { CatalogSource, RegisterSource, RuleRecordView } from "./models";

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
      coverageClass: "Required",
    }),
    rule({
      ruleId: "R-L4-P",
      registerState: "Active",
      primaryLayer: "L4",
      family: "F-PRESENCE",
      coverageClass: "Required",
    }),
    rule({
      ruleId: "R-L4-T",
      registerState: "Active",
      primaryLayer: "L4",
      family: "F-TYPING",
      coverageClass: "Required",
    }),
    rule({
      ruleId: "R-L7-DEF",
      registerState: "Active",
      primaryLayer: "L7",
      family: "F-CONSISTENCY",
      coverageClass: "Deferred",
    }),
    rule({
      ruleId: "R-DRAFT",
      registerState: "Draft",
      primaryLayer: "L3",
      coverageClass: "Required",
    }),
  ],
};

describe("STEP6-7C Planner", () => {
  it("builds ExecutionPlan from IngressValidatedPayload", () => {
    const ingress = new Ingress();
    ingress.loadCatalog(catalogSource);
    ingress.loadRegister(registerSource);
    const validated = ingress.validateHeader();

    const planner = new Planner();
    const plan = planner.plan(validated);

    expect(plan.kind).toBe("planner.executionPlan");
    if (plan.kind !== "planner.executionPlan") throw new Error("unexpected");

    expect(plan.activeRules.map((r) => r.ruleId)).toEqual([
      "R-L1",
      "R-L4-P",
      "R-L4-T",
    ]);
    expect(plan.deferredRules.map((r) => r.ruleId)).toEqual(["R-L7-DEF"]);
    expect(plan.executionOrder).toEqual(["R-L1", "R-L4-P", "R-L4-T"]);
    expect(
      plan.dependencyGraph.edges.some((e) => e.kind === "layer-cascade"),
    ).toBe(true);
    expect(
      plan.dependencyGraph.edges.some(
        (e) =>
          e.kind === "l4-family-chain" &&
          e.fromRuleId === "R-L4-P" &&
          e.toRuleId === "R-L4-T",
      ),
    ).toBe(true);
    expect(plan.skipHints.some((h) => h.plannedStatus === "DEFERRED")).toBe(
      true,
    );
  });

  it("blocks rules with missing prerequisite cites", () => {
    const planner = new Planner();
    const ingress = new Ingress();
    ingress.loadCatalog(catalogSource);
    ingress.loadRegister({
      ...registerSource,
      ruleRecords: [
        rule({
          ruleId: "R-NEED-PRE",
          registerState: "Active",
          primaryLayer: "L5",
          prerequisites: ["R-MISSING"],
        }),
      ],
    });
    const plan = planner.plan(ingress.validateHeader());
    if (plan.kind !== "planner.executionPlan") throw new Error("unexpected");
    expect(plan.blockedRules.map((r) => r.ruleId)).toContain("R-NEED-PRE");
    expect(plan.activeRules).toHaveLength(0);
  });

  it("ValidationEngine.resolveRules + plan wire", () => {
    const engine = new ValidationEngine();
    engine.loadCatalog(catalogSource);
    engine.loadRegister(registerSource);
    engine.validateHeader();
    const active = engine.resolveRules();
    expect(active).toHaveLength(4); // Active only (includes Deferred coverage)
    const plan = engine.plan();
    expect(plan.kind).toBe("planner.executionPlan");
  });
});
