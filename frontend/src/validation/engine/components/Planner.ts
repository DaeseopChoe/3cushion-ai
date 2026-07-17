/**
 * validation/engine/components/Planner.ts
 *
 * STEP6-7C — Validation Planner (L-Plan).
 * Decides WHAT to run. Does not schedule timing or execute Rules.
 */

import type { IPlanner } from "../interfaces";
import type { IngressValidatedPayload, RuleRecordView } from "../models";
import { ActiveRuleResolver } from "../plan/ActiveRuleResolver";
import { CoverageFilter } from "../plan/CoverageFilter";
import { ExecutionPlanBuilder } from "../plan/ExecutionPlanBuilder";
import type { ExecutionPlan } from "../plan/planModels";
import type { EnginePayload, RuleRef } from "../types";
import { IngressLoadError } from "../errors";
import { DependencyResolver } from "./DependencyResolver";

function asIngressValidated(payload: EnginePayload): IngressValidatedPayload {
  if (
    payload !== null &&
    typeof payload === "object" &&
    "kind" in payload &&
    (payload as IngressValidatedPayload).kind === "ingress.validated"
  ) {
    return payload as IngressValidatedPayload;
  }
  throw new IngressLoadError(
    "INGRESS_PAYLOAD_REQUIRED",
    "Planner.plan requires IngressValidatedPayload",
  );
}

export class Planner implements IPlanner {
  readonly activeRuleResolver: ActiveRuleResolver;
  readonly coverageFilter: CoverageFilter;
  readonly dependencyResolver: DependencyResolver;
  readonly executionPlanBuilder: ExecutionPlanBuilder;

  private ingressPayload: IngressValidatedPayload | null = null;
  private lastPlan: ExecutionPlan | null = null;
  private lastActiveRules: RuleRecordView[] = [];

  constructor(dependencyResolver: DependencyResolver = new DependencyResolver()) {
    this.activeRuleResolver = new ActiveRuleResolver();
    this.coverageFilter = new CoverageFilter();
    this.dependencyResolver = dependencyResolver;
    this.executionPlanBuilder = new ExecutionPlanBuilder();
  }

  /** Bind IngressValidatedPayload before resolveActiveRules / plan. */
  setIngressPayload(payload: IngressValidatedPayload): void {
    this.ingressPayload = payload;
    this.lastPlan = null;
    this.lastActiveRules = [];
  }

  /**
   * Active Rule Resolver — registerState=Active only.
   * Coverage split happens in plan(); this returns the Active inventory set.
   */
  resolveActiveRules(payload?: EnginePayload): RuleRef[] {
    const ingress =
      payload !== undefined
        ? asIngressValidated(payload)
        : this.ingressPayload;
    if (!ingress) {
      throw new IngressLoadError(
        "INGRESS_PAYLOAD_REQUIRED",
        "resolveActiveRules requires IngressValidatedPayload",
      );
    }
    this.ingressPayload = ingress;
    this.lastActiveRules = this.activeRuleResolver.resolve(
      ingress.register.ruleRecords,
    );
    return this.lastActiveRules;
  }

  /**
   * Build ExecutionPlan:
   * Active → Coverage filter → Dependency analysis → ExecutionPlan.
   * Does not call Scheduler.
   */
  plan(payload?: EnginePayload): EnginePayload {
    const ingress =
      payload !== undefined
        ? asIngressValidated(payload)
        : this.ingressPayload;
    if (!ingress) {
      throw new IngressLoadError(
        "INGRESS_PAYLOAD_REQUIRED",
        "plan requires IngressValidatedPayload",
      );
    }
    this.ingressPayload = ingress;

    const active = this.activeRuleResolver.resolve(ingress.register.ruleRecords);
    this.lastActiveRules = active;

    const coverage = this.coverageFilter.filter(active);

    const plan = this.executionPlanBuilder.build({
      inRunRules: coverage.inRun,
      deferredRules: coverage.deferred,
      unknownCoverageRules: coverage.unknown,
      dependencyIndex: ingress.register.dependencyIndex,
      dependencyResolver: this.dependencyResolver,
    });

    this.lastPlan = plan;
    return plan;
  }

  getLastPlan(): ExecutionPlan | null {
    return this.lastPlan;
  }

  getLastActiveRules(): RuleRecordView[] {
    return this.lastActiveRules;
  }
}
