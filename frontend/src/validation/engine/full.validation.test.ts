/**
 * STEP6-9 Full Validation — Production mode against 5_half_system + Full Snapshot.
 */
import { describe, expect, it } from "vitest";
import {
  FULL_CATALOG,
  FULL_REGISTER,
  FULL_RUN_ID,
  FULL_TARGET_SYSTEM_ID,
  runFullValidation,
} from "./full";

describe("STEP6-9 Full Validation", () => {
  it("runs Production Full Validation on 5_half_system without exception", () => {
    const result = runFullValidation();

    expect(result.exception).toBeNull();
    expect(result.ok).toBe(true);
    expect(result.report.mode).toBe("Production");
    expect(result.report.runId).toBe(FULL_RUN_ID);
    expect(result.report.catalogPin?.catalogPinId).toBe(
      FULL_REGISTER.pin.catalogPinId,
    );

    expect(FULL_CATALOG.header.catalogRevision).toBe("r1-full");
    expect(FULL_TARGET_SYSTEM_ID).toBe("5_half_system");

    // Pipeline completed
    expect(result.stages).toEqual(
      expect.arrayContaining([
        "validateHeader",
        "execute",
        "emitFinding",
        "buildReport",
      ]),
    );

    // Coverage: 8 In-Run + 1 Deferred
    expect(result.summary.coverage.inRun).toBe(8);
    expect(result.summary.coverage.deferred).toBe(1);
    expect(result.summary.totalRules).toBe(9);

    // Real package Finding expected: family enum mismatch on L4 Domain-check
    expect(result.summary.statusCounts.FAILED).toBeGreaterThanOrEqual(1);
    expect(result.findingBatch.findings.length).toBeGreaterThanOrEqual(1);
    expect(
      result.findingBatch.findings.some(
        (f) => f.ruleId === "SCH-FV-L4-FLD-DOMAIN",
      ),
    ).toBe(true);
    expect(result.report.findings.length).toBe(
      result.findingBatch.findings.length,
    );
    expect(result.summary.findings).toBe(result.report.findings.length);

    // Production + blocker/error findings → schemaComplete NO
    expect(result.report.schemaComplete).toBe("NO");
    expect(result.summary.schemaComplete).toBe(result.report.schemaComplete);

    // Summary counts align with execution batch
    const batchCounts = result.executionBatch.results.reduce(
      (acc, r) => {
        acc[r.status] = (acc[r.status] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );
    expect(result.summary.statusCounts.PASS).toBe(batchCounts.PASS ?? 0);
    expect(result.summary.statusCounts.FAILED).toBe(batchCounts.FAILED ?? 0);
    expect(result.summary.statusCounts.DEFERRED).toBe(
      batchCounts.DEFERRED ?? 0,
    );
  });
});
