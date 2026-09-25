/**
 * Phase F-2F — browser Git client must preserve top-level conflict + leafRevision.
 * Pre-fix nested ["conflict"] lookup always dropped ResolvablePublishOverwriteConflict.
 */
import { describe, expect, it } from "vitest";
import {
  buildConfirmedOverwriteRetryFromResult,
  parseGitPublishClientFailBody,
  parseResolvablePublishOverwriteConflict,
} from "./publishDatasetToLocalRepoGit";

/** Exact HTTP fail shape from F-2E orchestration (body.conflict IS the payload). */
const ORCHESTRATION_FAIL_BODY = {
  ok: false,
  reason: "resolvable-publish-overwrite",
  conflict: {
    code: "RESOLVABLE_PUBLISH_OVERWRITE" as const,
    incomingFamilyId: "fm_2a1440b5-placeholder-incoming",
    existingFamilyId: "fm_3c75c038-dbd9-42b9-b8e2-2a10fd20c1f5",
    authoredPositionId: "200160600200200200",
    authoredSourceSlot: "S1" as const,
    conflictCount: 4,
    uniquePositionIds: ["200160600200200200"],
    slots: ["S1" as const],
    originPairCounts: { "AUTHORED|AUTHORED": 1 },
  },
  leafRevision:
    "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
};

/** Pre-fix bug: treat body.conflict as nested GitPublishClientResult. */
function legacyBrokenConflictParse(bodyConflict: unknown): unknown {
  return bodyConflict && typeof bodyConflict === "object"
    ? (bodyConflict as { conflict?: unknown })["conflict"]
    : undefined;
}

describe("F-2F — preserve overwrite conflict through local Git client", () => {
  it("legacy nested conflict lookup drops payload (pre-fix regression guard)", () => {
    expect(legacyBrokenConflictParse(ORCHESTRATION_FAIL_BODY.conflict)).toBe(
      undefined
    );
  });

  it("parseResolvablePublishOverwriteConflict preserves real-case fields", () => {
    const conflict = parseResolvablePublishOverwriteConflict(
      ORCHESTRATION_FAIL_BODY.conflict
    );
    expect(conflict).toBeDefined();
    expect(conflict!.code).toBe("RESOLVABLE_PUBLISH_OVERWRITE");
    expect(conflict!.existingFamilyId).toBe(
      "fm_3c75c038-dbd9-42b9-b8e2-2a10fd20c1f5"
    );
    expect(conflict!.incomingFamilyId).toBe(
      "fm_2a1440b5-placeholder-incoming"
    );
    expect(conflict!.authoredPositionId).toBe("200160600200200200");
    expect(conflict!.authoredSourceSlot).toBe("S1");
    expect(conflict!.conflictCount).toBe(4);
  });

  it("parseGitPublishClientFailBody preserves conflict + leafRevision", () => {
    const fail = parseGitPublishClientFailBody(ORCHESTRATION_FAIL_BODY);
    expect(fail).not.toBeNull();
    expect(fail!.reason).toBe("resolvable-publish-overwrite");
    expect(fail!.conflict?.existingFamilyId).toBe(
      "fm_3c75c038-dbd9-42b9-b8e2-2a10fd20c1f5"
    );
    expect(fail!.conflict?.incomingFamilyId).toBe(
      "fm_2a1440b5-placeholder-incoming"
    );
    expect(fail!.conflict?.authoredPositionId).toBe("200160600200200200");
    expect(fail!.conflict?.authoredSourceSlot).toBe("S1");
    expect(fail!.leafRevision).toBe(ORCHESTRATION_FAIL_BODY.leafRevision);
    expect(fail!.leafRevision!.length).toBe(64);
  });

  it("confirm→retry builds targetFamilyId + expectedLeafRevision from preserved fields", () => {
    const fail = parseGitPublishClientFailBody(ORCHESTRATION_FAIL_BODY)!;
    const retry = buildConfirmedOverwriteRetryFromResult({
      conflict: fail.conflict,
      leafRevision: fail.leafRevision,
    });
    expect(retry.ok).toBe(true);
    if (!retry.ok) return;
    expect(retry.confirmedOverwrite.targetFamilyId).toBe(
      "fm_3c75c038-dbd9-42b9-b8e2-2a10fd20c1f5"
    );
    expect(retry.confirmedOverwrite.expectedLeafRevision).toBe(
      ORCHESTRATION_FAIL_BODY.leafRevision
    );
  });

  it("incomplete conflict/leafRevision blocks confirmedOverwrite retry", () => {
    expect(
      buildConfirmedOverwriteRetryFromResult({
        conflict: undefined,
        leafRevision: ORCHESTRATION_FAIL_BODY.leafRevision,
      }).ok
    ).toBe(false);
    expect(
      buildConfirmedOverwriteRetryFromResult({
        conflict: ORCHESTRATION_FAIL_BODY.conflict,
        leafRevision: undefined,
      }).ok
    ).toBe(false);
  });
});
