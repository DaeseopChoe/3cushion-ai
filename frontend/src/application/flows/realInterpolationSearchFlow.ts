/**
 * Application flow — Real Interpolation search (parallel to userSearchFlow).
 * Does not own calculation inside Runtime Host; domain engine + bridge only.
 */

import type { Ball3, PositionRecord } from "../../domain/positionSearchEngine";
import { applyCalculatorBridge } from "../../domain/realInterpolation/applicationBridge";
import { runRealInterpolationSearch } from "../../domain/realInterpolation/engine";
import type { RawPublishedEnvelopeDataset } from "../../domain/realInterpolation/envelopeJoin";
import type { RealInterpolationApplicationResult } from "../../domain/realInterpolation/types";
import type { EvaluateStrategyInput } from "../../domain/evaluateStrategy";

export type RealInterpolationSearchFlowContext = {
  query: Ball3;
  positionRecords: PositionRecord[];
  envelopeDataset: RawPublishedEnvelopeDataset | null | undefined;
  resolveEvalProfile: (systemId: string) => EvaluateStrategyInput["profile"];
  resolveAnchorsData?: (
    systemId: string
  ) => EvaluateStrategyInput["anchorsData"];
  buildTrajectory?: (input: unknown) => unknown;
  buildTrajectoryInput?: (
    result: import("../../domain/realInterpolation/types").RealInterpolationStrategyResult
  ) => unknown;
};

export type RealInterpolationSearchFlowResult = {
  results: RealInterpolationApplicationResult[];
};

/**
 * Run Real Interpolation → top-3 Strategy results with Calculator consume.
 */
export function runRealInterpolationSearchFlow(
  ctx: RealInterpolationSearchFlowContext
): RealInterpolationSearchFlowResult {
  const searchResults = runRealInterpolationSearch({
    query: ctx.query,
    positionRecords: ctx.positionRecords,
    envelopeDataset: ctx.envelopeDataset,
  });

  const results = applyCalculatorBridge(searchResults, {
    resolveEvalProfile: ctx.resolveEvalProfile,
    resolveAnchorsData: ctx.resolveAnchorsData,
    buildTrajectory: ctx.buildTrajectory,
    buildTrajectoryInput: ctx.buildTrajectoryInput,
  });

  return { results };
}
