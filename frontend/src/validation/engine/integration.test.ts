/**
 * STEP6-7G smoke — Full ValidationEngine.run() Integration.
 * Uses STEP6-8 Pilot Fixture (same minimal sample; no new Rules).
 */
import { describe, expect, it } from "vitest";
import { ValidationEngine } from "./index";
import { PILOT_CATALOG, PILOT_REGISTER } from "./pilot";

describe("STEP6-7G Final Integration", () => {
  it("run() executes full pipeline and returns ValidationReport", () => {
    const engine = new ValidationEngine();
    const report = engine.run({
      catalog: PILOT_CATALOG,
      register: PILOT_REGISTER,
      mode: "Design",
      runId: "run-test-7g",
    });

    expect(report.kind).toBe("report.validation");
    if (report.kind !== "report.validation") throw new Error("unexpected");

    expect(report.runId).toBe("run-test-7g");
    expect(report.mode).toBe("Design");
    expect(report.summary.kind).toBe("summary.validation");
    expect(report.summary.totalRules).toBe(3);
    expect(report.summary.executed).toBe(2);
    expect(report.summary.statusCounts.PASS).toBe(2);
    expect(report.summary.statusCounts.DEFERRED).toBe(1);
    expect(report.summary.findings).toBe(0);
    expect(report.schemaComplete).toBe("UNDECIDED");
    expect(report.deferredItems.map((d) => d.ruleId)).toContain("R-DEF");
    expect(report.catalogPin?.catalogPinId).toBe("pin-pilot-1");
    expect(engine.getSummary()?.coverage.inRun).toBe(2);
  });
});
