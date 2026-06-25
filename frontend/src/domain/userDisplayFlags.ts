/** USER 테이블 표시 모드 — 동선분석 / 시스템값 (pure). */

export type UserTableDisplayMode = "default" | "trajectory" | "systemValues";
export type TrajectoryCardSource = "baseline" | "corrected";
export type LabelValueSource = "corrected" | "baseline";
export type LabelAnchorSource = "corrected" | "baseline";

export interface UserDisplayFlags {
  showTrajectoryMode: boolean;
  showSystemValuesMode: boolean;
  showCorrectedPath: boolean;
  showBaselinePath: boolean;
  showBaselineReferenceOverlay: boolean;
  labelValueSource: LabelValueSource;
  labelAnchorSource: LabelAnchorSource;
  showSystemGrid: boolean;
  showAxisCaptions: boolean;
  showTrajectoryInfoCard: boolean;
  showTrajectoryOnTable: boolean;
  showTrajectoryLabels: boolean;
}

export function getUserDisplayFlags(
  mode: UserTableDisplayMode,
  trajectoryCardSource: TrajectoryCardSource,
  trajectoryShowAxisValues = false
): UserDisplayFlags {
  if (mode === "systemValues") {
    return {
      showTrajectoryMode: false,
      showSystemValuesMode: true,
      showCorrectedPath: false,
      showBaselinePath: false,
      showBaselineReferenceOverlay: false,
      labelValueSource: "corrected",
      labelAnchorSource: "corrected",
      showSystemGrid: true,
      showAxisCaptions: true,
      showTrajectoryInfoCard: false,
      showTrajectoryOnTable: false,
      showTrajectoryLabels: false,
    };
  }

  if (mode === "trajectory") {
    const isBaseline = trajectoryCardSource === "baseline";
    const showAxisOverlay = trajectoryShowAxisValues;
    return {
      showTrajectoryMode: true,
      showSystemValuesMode: false,
      showCorrectedPath: !isBaseline,
      showBaselinePath: isBaseline,
      showBaselineReferenceOverlay: false,
      labelValueSource: isBaseline ? "baseline" : "corrected",
      labelAnchorSource: isBaseline ? "baseline" : "corrected",
      showSystemGrid: showAxisOverlay,
      showAxisCaptions: showAxisOverlay,
      showTrajectoryInfoCard: true,
      showTrajectoryOnTable: true,
      showTrajectoryLabels: true,
    };
  }

  return {
    showTrajectoryMode: false,
    showSystemValuesMode: false,
    showCorrectedPath: true,
    showBaselinePath: false,
    showBaselineReferenceOverlay: false,
    labelValueSource: "corrected",
    labelAnchorSource: "corrected",
    showSystemGrid: false,
    showAxisCaptions: false,
    showTrajectoryInfoCard: false,
    showTrajectoryOnTable: true,
    showTrajectoryLabels: true,
  };
}

export function isUserDisplayModeActive(mode: UserTableDisplayMode): boolean {
  return mode !== "default";
}

/** @deprecated Use UserTableDisplayMode */
export type UserBaselineViewLevel = 0 | 1 | 2;
