import { PATH_NODE_MARKS } from "../../domain/trajectoryPathDisplayPolicy";

interface DisplayCap {
  endIndex: number;
  [key: string]: unknown;
}

interface TrajectoryRenderModelArgs {
  systemIdForGrid: string;
  useBaselineLabelAnchors: boolean;
  cushionPathBaselineRg: unknown[] | null;
  capBaseline: DisplayCap;
  capCorrected: DisplayCap;
}

interface TrajectoryRenderModel {
  activeDisplayCap: DisplayCap;
  visibleKeysForLabels: string[];
  labelStrategy: "five_half_reference" | "anchor_ssot";
}

export function buildTrajectoryRenderModel({
  systemIdForGrid,
  useBaselineLabelAnchors,
  cushionPathBaselineRg,
  capBaseline,
  capCorrected,
}: TrajectoryRenderModelArgs): TrajectoryRenderModel {
  const activeDisplayCap =
    useBaselineLabelAnchors && cushionPathBaselineRg
      ? capBaseline
      : capCorrected;

  const visibleKeysForLabels =
    activeDisplayCap.endIndex >= 0
      ? PATH_NODE_MARKS.slice(0, activeDisplayCap.endIndex + 1)
      : [];

  // D-005: systemIdForGrid === "5_half_system" 직접 비교 → Batch 6 해소 예정
  const labelStrategy: "five_half_reference" | "anchor_ssot" =
    systemIdForGrid === "5_half_system"
      ? "five_half_reference"
      : "anchor_ssot";

  return { activeDisplayCap, visibleKeysForLabels, labelStrategy };
}
