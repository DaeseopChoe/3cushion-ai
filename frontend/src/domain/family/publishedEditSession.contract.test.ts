/**
 * Phase 2+ — edit-session source ownership (LOCAL | PUBLISHED | NONE).
 */
import { describe, expect, it } from "vitest";
import {
  canOverwritePublishedSourceFamily,
  canOverwriteTrustedSourceFamily,
  readFamilyIdFromRecordSlot,
  resolveEditSourceKind,
  resolveOverwriteSaveIntent,
  resolvePublishedEditSaveIntent,
  resolveTrustedOverwriteSourceFamilyId,
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

describe("publishedEditSession Phase 2+", () => {
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

  it("resolveEditSourceKind is mutually exclusive (dual → NONE)", () => {
    expect(
      resolveEditSourceKind({
        editingPublishedFamilyId: null,
        editingLocalFamilyId: null,
      })
    ).toBe("NONE");
    expect(
      resolveEditSourceKind({
        editingPublishedFamilyId: "fm_pub",
        editingLocalFamilyId: null,
      })
    ).toBe("PUBLISHED");
    expect(
      resolveEditSourceKind({
        editingPublishedFamilyId: null,
        editingLocalFamilyId: "fm_loc",
      })
    ).toBe("LOCAL");
    expect(
      resolveEditSourceKind({
        editingPublishedFamilyId: "fm_pub",
        editingLocalFamilyId: "fm_loc",
      })
    ).toBe("NONE");
  });

  it("canOverwriteTrustedSourceFamily for LOCAL or PUBLISHED", () => {
    expect(
      canOverwriteTrustedSourceFamily({
        editingPublishedFamilyId: null,
        editingLocalFamilyId: null,
      })
    ).toBe(false);
    expect(
      canOverwriteTrustedSourceFamily({
        editingPublishedFamilyId: "fm_abc",
        editingLocalFamilyId: null,
      })
    ).toBe(true);
    expect(
      canOverwriteTrustedSourceFamily({
        editingPublishedFamilyId: null,
        editingLocalFamilyId: "fm_loc",
      })
    ).toBe(true);
    expect(canOverwritePublishedSourceFamily({ editingPublishedFamilyId: null })).toBe(
      false
    );
    expect(
      canOverwritePublishedSourceFamily({ editingPublishedFamilyId: "fm_abc" })
    ).toBe(true);
  });

  it("CASE A/B: no session → null intent; matching LOCAL/PUBLISHED → UPDATE", () => {
    expect(
      resolveOverwriteSaveIntent({
        editingPublishedFamilyId: null,
        editingLocalFamilyId: null,
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
        editingLocalFamilyId: null,
        slotIdentity: {
          familyId: "fm_abc",
          memberId: "mb_authored_1",
          memberOrigin: "AUTHORED",
        },
      })
    ).toBe("UPDATE");

    expect(
      resolveOverwriteSaveIntent({
        editingPublishedFamilyId: null,
        editingLocalFamilyId: "fm_abc",
        slotIdentity: {
          familyId: "fm_abc",
          memberId: "mb_authored_1",
          memberOrigin: "AUTHORED",
        },
      })
    ).toBe("UPDATE");

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
        editingLocalFamilyId: "fm_abc",
        slotIdentity: null,
      })
    ).toBe(null);
  });

  it("mismatched session vs slot family → not UPDATE", () => {
    expect(
      resolveOverwriteSaveIntent({
        editingLocalFamilyId: "fm_abc",
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
        editingLocalFamilyId: "fm_abc",
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

  it("resolveTrustedOverwriteSourceFamilyId returns the active owner", () => {
    expect(
      resolveTrustedOverwriteSourceFamilyId({
        editingPublishedFamilyId: "fm_pub",
        editingLocalFamilyId: null,
      })
    ).toBe("fm_pub");
    expect(
      resolveTrustedOverwriteSourceFamilyId({
        editingPublishedFamilyId: null,
        editingLocalFamilyId: "fm_loc",
      })
    ).toBe("fm_loc");
    expect(
      resolveTrustedOverwriteSourceFamilyId({
        editingPublishedFamilyId: "fm_pub",
        editingLocalFamilyId: "fm_loc",
      })
    ).toBe(null);
  });
});
