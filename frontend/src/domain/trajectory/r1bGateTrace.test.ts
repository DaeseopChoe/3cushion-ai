/**
 * DEV diagnostic observer for R1b gate — does not own gate SSOT.
 */
import { describe, expect, it } from "vitest";
import {
  FRAME_BOTTOM_Y as BOTTOM_Y,
  FRAME_TOP_Y as TOP_Y,
} from "./frameProgressionReflection";
import { shouldApplyFrameProgressionR1b } from "./reflectionPolicy";
import { buildR1bGateTrace } from "./r1bGateTrace";

describe("r1bGateTrace (DEV diagnostic only)", () => {
  it("reports P3 when C1 sysFieldKey is missing (gate SSOT still false)", () => {
    const reference = {
      co: {
        point: { x: 20, y: TOP_Y },
        sysFieldKey: "CO_f",
        valueSpace: "Fg" as const,
      },
      c1Aim: {
        point: { x: 60, y: BOTTOM_Y },
        // missing sysFieldKey
        valueSpace: "Fg" as const,
      },
    };
    const gate = shouldApplyFrameProgressionR1b(reference);
    expect(gate).toBe(false);
    const trace = buildR1bGateTrace({
      reference,
      gateResultFromPolicy: gate,
      r1bConstructionAttempted: false,
      r1bConstructionSucceeded: false,
    });
    expect(trace.p3C1SysFieldKeyValid).toBe(false);
    expect(trace.p3C1FrameAimProvenance).toBe(false);
    expect(trace.firstFailedPredicate).toBe("P3_C1_SYS_FIELD_KEY");
    expect(trace.fallbackReason).toBe("gate_failed");
    expect(trace.A?.y).toBe(TOP_Y);
    expect(trace.B?.y).toBe(BOTTOM_Y);
  });

  it("reports P7 when provenance ok but A/B are Rail coords (y=40/0)", () => {
    const reference = {
      co: {
        point: { x: 20, y: 40 },
        sysFieldKey: "CO_f",
        valueSpace: "Fg" as const,
      },
      c1Aim: {
        point: { x: 60, y: 0 },
        sysFieldKey: "C1_f",
        valueSpace: "Fg" as const,
      },
    };
    const gate = shouldApplyFrameProgressionR1b(reference);
    expect(gate).toBe(false);
    const trace = buildR1bGateTrace({
      reference,
      gateResultFromPolicy: gate,
      r1bConstructionAttempted: false,
      r1bConstructionSucceeded: false,
    });
    expect(trace.p3C1FrameAimProvenance).toBe(true);
    expect(trace.p7ParallelOppositeFrame).toBe(false);
    expect(trace.firstFailedPredicate).toBe("P7_PARALLEL_OPPOSITE_FRAME");
    expect(trace.A).toEqual({ x: 20, y: 40 });
    expect(trace.B).toEqual({ x: 60, y: 0 });
    expect(trace.A_frameRoles?.horizontal).toBeNull();
    expect(trace.B_frameRoles?.horizontal).toBeNull();
  });

  it("firstFailedPredicate null when gate would pass Frame TOP↔BOTTOM", () => {
    const reference = {
      co: {
        point: { x: 20, y: TOP_Y },
        sysFieldKey: "CO_f",
        valueSpace: "Fg" as const,
      },
      c1Aim: {
        point: { x: 60, y: BOTTOM_Y },
        sysFieldKey: "C1_f",
        valueSpace: "Fg" as const,
      },
    };
    const gate = shouldApplyFrameProgressionR1b(reference);
    expect(gate).toBe(true);
    const trace = buildR1bGateTrace({
      reference,
      gateResultFromPolicy: gate,
      r1bConstructionAttempted: true,
      r1bConstructionSucceeded: true,
    });
    expect(trace.firstFailedPredicate).toBeNull();
    expect(trace.p7ParallelOppositeFrame).toBe(true);
    expect(trace.fallbackReason).toBe("r1b_succeeded");
    expect(trace.rawAnchorsNote).toBe(
      "RAW ANCHOR NOT AVAILABLE AT GATE SCOPE"
    );
  });

  it("distinguishes construction_failed from gate_failed", () => {
    const reference = {
      co: {
        point: { x: 20, y: TOP_Y },
        valueSpace: "Fg" as const,
      },
      c1Aim: {
        point: { x: 60, y: BOTTOM_Y },
        sysFieldKey: "C1_f",
        valueSpace: "Fg" as const,
      },
    };
    const gate = shouldApplyFrameProgressionR1b(reference);
    expect(gate).toBe(true);
    const trace = buildR1bGateTrace({
      reference,
      gateResultFromPolicy: gate,
      r1bConstructionAttempted: true,
      r1bConstructionSucceeded: false,
    });
    expect(trace.fallbackReason).toBe("construction_failed");
    expect(trace.r1bGatePassed).toBe(true);
    expect(trace.r1bConstructionSucceeded).toBe(false);
  });
});
