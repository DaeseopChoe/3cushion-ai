/**
 * Phase 2 — published edit session identity contracts.
 */
import { describe, expect, it } from "vitest";
import {
  canOverwritePublishedSourceFamily,
  readFamilyIdFromRecordSlot,
  resolveOverwriteSaveIntent,
  resolvePublishedEditSaveIntent,
} from "./publishedEditSession";
import type { PositionRecord } from "../positionSearchEngine";

function sampleRecord(familyId: string | undefined): PositionRecord {
  return {
    positionId: "pos_1",
    balls: {
      cue: { x: 10, y: 10 },
      target: { x: 40, y: 20 },
      second: { x: 60, y: 15 },
    },
    strategies: {
      S1: {
        slot: "S1",
        signature: {
          systemId: "5_half_system",
          formulaHash: "v1",
          shotType: "뒤돌리기",
        },
        sysInputs: { CO_f: 30, C3_r: 20 },
        meta: {
          impact: { x: 1, y: 1 },
          final: { x: 2, y: 2 },
          angle_ci: 0,
          angle_fs: 0,
        },
        ...(familyId
          ? {
              familyId,
              memberId: "mb_authored_1",
              memberOrigin: "AUTHORED" as const,
              authoringStrategyId: "as_1",
            }
          : {}),
      },
    },
  };
}

describe("publishedEditSession Phase 2", () => {
  it("reads familyId from record slot; null when missing (legacy)", () => {
    expect(readFamilyIdFromRecordSlot(sampleRecord("fm_abc"), "S1")).toBe(
      "fm_abc"
    );
    expect(readFamilyIdFromRecordSlot(sampleRecord(undefined), "S1")).toBe(
      null
    );
    expect(readFamilyIdFromRecordSlot(sampleRecord("fm_abc"), "S2")).toBe(
      null
    );
  });

  it("canOverwrite only when trusted published session family exists", () => {
    expect(canOverwritePublishedSourceFamily({ editingPublishedFamilyId: null })).toBe(
      false
    );
    expect(canOverwritePublishedSourceFamily({ editingPublishedFamilyId: "" })).toBe(
      false
    );
    expect(
      canOverwritePublishedSourceFamily({ editingPublishedFamilyId: "fm_abc" })
    ).toBe(true);
  });

  it("CASE A/B: no session → null intent; matching session → UPDATE", () => {
    expect(
      resolveOverwriteSaveIntent({
        editingPublishedFamilyId: null,
        slotIdentity: {
          familyId: "fm_abc",
          memberId: "mb_authored_1",
          memberOrigin: "AUTHORED",
        },
      })
    ).toBe(null);

    expect(
      resolveOverwriteSaveIntent({
        editingPublishedFamilyId: "fm_abc",
        slotIdentity: {
          familyId: "fm_abc",
          memberId: "mb_authored_1",
          memberOrigin: "AUTHORED",
        },
      })
    ).toBe("UPDATE");

    // deprecated alias still works
    expect(
      resolvePublishedEditSaveIntent({
        editingPublishedFamilyId: "fm_abc",
        slotIdentity: {
          familyId: "fm_abc",
          memberId: "mb_authored_1",
          memberOrigin: "AUTHORED",
        },
      })
    ).toBe("UPDATE");
  });

  it("CASE F: session without slot identity does not invent UPDATE", () => {
    expect(
      resolveOverwriteSaveIntent({
        editingPublishedFamilyId: "fm_abc",
        slotIdentity: null,
      })
    ).toBe(null);
  });

  it("mismatched session vs slot family → not UPDATE", () => {
    expect(
      resolveOverwriteSaveIntent({
        editingPublishedFamilyId: "fm_abc",
        slotIdentity: {
          familyId: "fm_other",
          memberId: "mb_authored_1",
          memberOrigin: "AUTHORED",
        },
      })
    ).toBe(null);
  });

  it("Derived / symmetry slot resolves UPDATE to source family", () => {
    expect(
      resolveOverwriteSaveIntent({
        editingPublishedFamilyId: "fm_abc",
        slotIdentity: {
          familyId: "fm_abc",
          memberId: "mb_sym_1",
          memberOrigin: "SYMMETRY",
          generatedFromMemberId: "mb_authored_1",
          symmetryOp: "H",
        },
      })
    ).toBe("UPDATE");

    expect(
      resolveOverwriteSaveIntent({
        editingPublishedFamilyId: "fm_abc",
        slotIdentity: {
          familyId: "fm_abc",
          memberId: "mb_der_1",
          memberOrigin: "DERIVED_CUE_IMPACT",
          generatedFromMemberId: "mb_authored_1",
          derivedRule: "CUE_IMPACT_FIRST_30PCT",
          derivedStep: "0.3",
        },
      })
    ).toBe("UPDATE");
  });
});
