/**
 * STEP6-8 Pilot Validation — Engine pipeline verification with Pilot Fixture.
 */
import { describe, expect, it } from "vitest";
import {
  PILOT_CATALOG,
  PILOT_REGISTER,
  PILOT_RUN_ID,
  runPilotValidation,
} from "./pilot";

describe("STEP6-8 Pilot Validation", () => {
  it("runs full pipeline on Pilot Catalog/Register without exception", () => {
    const result = runPilotValidation();

    expect(result.exception).toBeNull();
    expect(result.ok).toBe(true);
    expect(result.stages.every((s) => s.ok)).toBe(true);

    const stageNames = result.stages.map((s) => s.stage);
    expect(stageNames).toEqual(
      expect.arrayContaining([
        "initialize",
        "loadCatalog",
        "loadRegister",
        "validateHeader",
        "resolveRules",
        "plan",
        "schedule",
        "execute",
        "emitFinding",
        "aggregate",
        "buildSummary",
        "buildReport",
        "run()",
      ]),
    );

    expect(result.report.kind).toBe("report.validation");
    expect(result.report.runId).toBe(PILOT_RUN_ID);
    expect(result.report.mode).toBe("Design");
    expect(result.report.catalogPin?.catalogPinId).toBe(
      PILOT_REGISTER.pin.catalogPinId,
    );

    expect(result.summary.totalRules).toBe(3);
    expect(result.summary.executed).toBe(2);
    expect(result.summary.statusCounts.PASS).toBe(2);
    expect(result.summary.statusCounts.FAILED).toBe(0);
    expect(result.summary.statusCounts.BLOCKED).toBe(0);
    expect(result.summary.statusCounts.SKIPPED).toBe(0);
    expect(result.summary.statusCounts.ERROR).toBe(0);
    expect(result.summary.statusCounts.DEFERRED).toBe(1);
    expect(result.summary.findings).toBe(0);
    expect(result.summary.coverage).toMatchObject({
      inRun: 2,
      deferred: 1,
      blocked: 0,
    });

    expect(result.findingBatch.findings).toHaveLength(0);
    expect(result.report.findings).toHaveLength(0);
    expect(result.report.deferredItems.map((d) => d.ruleId)).toContain("R-DEF");

    // Fixture identity (Consume Only sample)
    expect(PILOT_CATALOG.header.catalogVersion).toBe("1.0");
    expect(PILOT_REGISTER.ruleRecords?.map((r) => r.ruleId)).toEqual([
      "R-L1",
      "R-L4",
      "R-DEF",
    ]);
  });
});
