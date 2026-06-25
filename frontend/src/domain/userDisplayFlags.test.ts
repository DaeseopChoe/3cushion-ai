import { describe, expect, it } from "vitest";
import {
  getUserDisplayFlags,
  isUserDisplayModeActive,
  type TrajectoryCardSource,
  type UserTableDisplayMode,
} from "./userDisplayFlags";

describe("getUserDisplayFlags", () => {
  it("default: corrected path/labels, no grid or card", () => {
    const f = getUserDisplayFlags("default", "corrected");
    expect(f.showCorrectedPath).toBe(true);
    expect(f.showBaselinePath).toBe(false);
    expect(f.showSystemGrid).toBe(false);
    expect(f.showAxisCaptions).toBe(false);
    expect(f.showTrajectoryInfoCard).toBe(false);
    expect(f.showTrajectoryOnTable).toBe(true);
  });

  it("trajectory + baseline: baseline path/labels + card", () => {
    const f = getUserDisplayFlags("trajectory", "baseline");
    expect(f.showTrajectoryMode).toBe(true);
    expect(f.showCorrectedPath).toBe(false);
    expect(f.showBaselinePath).toBe(true);
    expect(f.labelValueSource).toBe("baseline");
    expect(f.showTrajectoryInfoCard).toBe(true);
    expect(f.showSystemGrid).toBe(false);
  });

  it("trajectory + corrected: corrected path/labels + card", () => {
    const f = getUserDisplayFlags("trajectory", "corrected");
    expect(f.showCorrectedPath).toBe(true);
    expect(f.showBaselinePath).toBe(false);
    expect(f.labelValueSource).toBe("corrected");
    expect(f.showTrajectoryInfoCard).toBe(true);
  });

  it("trajectory + axis overlay: trajectory labels + axis grid/captions", () => {
    const f = getUserDisplayFlags("trajectory", "baseline", true);
    expect(f.showBaselinePath).toBe(true);
    expect(f.showTrajectoryLabels).toBe(true);
    expect(f.showTrajectoryOnTable).toBe(true);
    expect(f.showSystemGrid).toBe(true);
    expect(f.showAxisCaptions).toBe(true);
  });

  it("trajectory + axis off: no axis grid", () => {
    const f = getUserDisplayFlags("trajectory", "corrected", false);
    expect(f.showSystemGrid).toBe(false);
    expect(f.showAxisCaptions).toBe(false);
    expect(f.showCorrectedPath).toBe(true);
  });

  it("systemValues: grid + captions, no trajectory", () => {
    const f = getUserDisplayFlags("systemValues", "corrected");
    expect(f.showSystemValuesMode).toBe(true);
    expect(f.showSystemGrid).toBe(true);
    expect(f.showAxisCaptions).toBe(true);
    expect(f.showTrajectoryOnTable).toBe(false);
    expect(f.showTrajectoryLabels).toBe(false);
    expect(f.showTrajectoryInfoCard).toBe(false);
  });
});

describe("isUserDisplayModeActive", () => {
  it("false only for default", () => {
    expect(isUserDisplayModeActive("default")).toBe(false);
    expect(isUserDisplayModeActive("trajectory")).toBe(true);
    expect(isUserDisplayModeActive("systemValues")).toBe(true);
  });
});
