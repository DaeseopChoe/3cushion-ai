import { describe, expect, it } from "vitest";
import type { SystemContract } from "./systemContract";
import {
  extractTrajectoryContractView,
  isBaselineEndpointEditingEnabled,
} from "./trajectoryContract";

const TRACKS = ["B2T_L", "B2T_R", "T2B_L", "T2B_R"] as const;

const enabledAllTracks = {
  enabled: true,
  requireTrackPrefix: null,
};

function stubFiveHalfContract(
  baselineHandle: SystemContract["capabilities"]["baselineHandle"]
): SystemContract {
  return {
    identity: {
      systemId: "5_half_system",
      family: "5_half",
      aliases: null,
    },
    profile: {
      formulaExpr: "C1_f = CO_f - C3_r",
      valueDomains: null,
      safety: { m_min: 0.05, theta_t_max: 68, offset_fg2rg: 2.25 },
      display: null,
    },
    anchors: { trajectories: null, meta: null },
    logic: null,
    metadata: null,
    capabilities: {
      render: null,
      baselineHandle,
    },
    validation: { ok: true, errors: [] },
    version: { contractVersion: 1, packageVersion: null },
  };
}

describe("isBaselineEndpointEditingEnabled", () => {
  it("enables CO/C1 handles on all four tracks when prefix is null", () => {
    for (const track of TRACKS) {
      expect(
        isBaselineEndpointEditingEnabled(enabledAllTracks, track),
        track
      ).toBe(true);
    }
  });

  it("does not require a B2T||T2B string check in the caller", () => {
    expect(
      isBaselineEndpointEditingEnabled(enabledAllTracks, "T2B_R")
    ).toBe(true);
    expect(
      isBaselineEndpointEditingEnabled(
        { enabled: true, requireTrackPrefix: "B2T" },
        "T2B_R"
      )
    ).toBe(false);
  });

  it("stays off when the system capability is disabled", () => {
    expect(
      isBaselineEndpointEditingEnabled(
        { enabled: false, requireTrackPrefix: null },
        "B2T_L"
      )
    ).toBe(false);
  });
});

describe("extractTrajectoryContractView baselineHandle", () => {
  it("uses loader capability enabled + null prefix for every track", () => {
    const view = extractTrajectoryContractView(
      stubFiveHalfContract(enabledAllTracks)
    );
    expect(view.baselineHandle).toEqual(enabledAllTracks);
    for (const track of TRACKS) {
      expect(
        isBaselineEndpointEditingEnabled(view.baselineHandle, track)
      ).toBe(true);
    }
  });

  it("falls back to enabled-all-tracks for 5_half when capability is missing", () => {
    const view = extractTrajectoryContractView(stubFiveHalfContract(null));
    expect(view.baselineHandle.enabled).toBe(true);
    expect(view.baselineHandle.requireTrackPrefix).toBeNull();
    expect(
      isBaselineEndpointEditingEnabled(view.baselineHandle, "T2B_L")
    ).toBe(true);
  });
});
