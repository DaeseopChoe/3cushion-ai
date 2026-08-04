import { describe, expect, it } from "vitest";
import { PATH_INDEX_C4 } from "../../domain/trajectoryPathDisplayPolicy";
import { resolveTrajectoryExtensionOverlayVisibility } from "./trajectoryExtensionOverlayVisibility";

describe("resolveTrajectoryExtensionOverlayVisibility (Phase 2A)", () => {
  it("no draft → attach false", () => {
    const v = resolveTrajectoryExtensionOverlayVisibility({
      appMode: "USER",
      activeBranch: "corrected",
      extensionDraftCount: 0,
    });
    expect(v.attach).toBe(false);
    expect(v.reason).toBe("no_draft");
  });

  it("ADMIN + Extension → attach true · handles when canEdit", () => {
    const v = resolveTrajectoryExtensionOverlayVisibility({
      appMode: "ADMIN",
      activeBranch: "baseline",
      extensionDraftCount: 2,
      canEdit: true,
    });
    expect(v.attach).toBe(true);
    expect(v.showReveal).toBe(true);
    expect(v.showExtensionSegments).toBe(true);
    expect(v.showHandles).toBe(true);
    expect(v.reason).toBe("admin");
  });

  it("USER corrected + Extension → attach true", () => {
    const v = resolveTrajectoryExtensionOverlayVisibility({
      appMode: "USER",
      activeBranch: "corrected",
      extensionDraftCount: 1,
    });
    expect(v.attach).toBe(true);
    expect(v.showHandles).toBe(false);
    expect(v.reason).toBe("user_corrected");
  });

  it("USER baseline + CASE B (C4 end, no continuation) → attach false", () => {
    const v = resolveTrajectoryExtensionOverlayVisibility({
      appMode: "USER",
      activeBranch: "baseline",
      extensionDraftCount: 2,
      baselineContinuationAllowed: false,
      baselineCap: { endIndex: PATH_INDEX_C4, reason: "baseline_physical" },
    });
    expect(v.attach).toBe(false);
    expect(v.showReveal).toBe(false);
    expect(v.showExtensionSegments).toBe(false);
    expect(v.reason).toBe("user_baseline_case_b_c4_end");
  });

  it("USER baseline + continuation allowed → attach true (CASE A extension point)", () => {
    const v = resolveTrajectoryExtensionOverlayVisibility({
      appMode: "USER",
      activeBranch: "baseline",
      extensionDraftCount: 2,
      baselineContinuationAllowed: true,
      baselineCap: { endIndex: PATH_INDEX_C4 },
    });
    expect(v.attach).toBe(true);
    expect(v.reason).toBe("user_baseline_continuation_allowed");
  });
});
