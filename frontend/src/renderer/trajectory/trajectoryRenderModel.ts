/**
 * trajectoryRenderModel.ts
 * TRJ-002 / Batch 6 STEP 6-3 — display cap + labelStrategy from Contract (D-005).
 *
 * Renderer consumes Contract flags only — no systemId / family branching.
 */

import { PATH_NODE_MARKS } from "../../domain/trajectoryPathDisplayPolicy";

interface DisplayCap {
  endIndex: number;
  [key: string]: unknown;
}

export type LabelStrategy = "five_half_reference" | "anchor_ssot";

interface TrajectoryRenderModelArgs {
  /** From TrajectoryContractView.render.labelStrategy (App injection hub). */
  labelStrategy: LabelStrategy;
  useBaselineLabelAnchors: boolean;
  cushionPathBaselineRg: unknown[] | null;
  capBaseline: DisplayCap;
  capCorrected: DisplayCap;
}

interface TrajectoryRenderModel {
  activeDisplayCap: DisplayCap;
  visibleKeysForLabels: string[];
  labelStrategy: LabelStrategy;
}

export function buildTrajectoryRenderModel({
  labelStrategy,
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

  return { activeDisplayCap, visibleKeysForLabels, labelStrategy };
}
