/**
 * Application bridge — consume existing evaluateStrategy / buildTrajectory.
 * No new physics. Builder/Formula not modified.
 */

import type { EvaluateStrategyInput } from "../evaluateStrategy";
import { evaluateStrategy } from "../evaluateStrategy";
import type {
  RealInterpolationApplicationResult,
  RealInterpolationStrategyResult,
} from "./types";

export type RealInterpolationCalcDeps = {
  resolveEvalProfile: EvaluateStrategyInput["profile"] extends infer P
    ? (systemId: string) => P
    : never;
  resolveAnchorsData?: EvaluateStrategyInput["anchorsData"] extends infer A
    ? (systemId: string) => A
    : never;
  /** Optional trajectory builder injected by App (signature kept loose). */
  buildTrajectory?: (input: unknown) => unknown;
  buildTrajectoryInput?: (
    result: RealInterpolationStrategyResult
  ) => unknown;
};

export function applyCalculatorBridge(
  results: RealInterpolationStrategyResult[],
  deps: RealInterpolationCalcDeps
): RealInterpolationApplicationResult[] {
  return results.map((r) => {
    const systemId = r.primaryEntry.signature.systemId;
    let app: RealInterpolationApplicationResult = { ...r };
    try {
      const out = evaluateStrategy({
        balls: r.ballsQuery,
        sysInputs: r.sysInputs,
        signature: r.primaryEntry.signature,
        systemId,
        profile: deps.resolveEvalProfile(systemId),
        anchorsData: deps.resolveAnchorsData?.(systemId),
        hpT: r.primaryEntry.hpT as EvaluateStrategyInput["hpT"],
        trackId: (r.primaryEntry.track as EvaluateStrategyInput["trackId"]) ?? "B2T_L",
      });
      app = {
        ...r,
        userImpact: out.userImpact,
        userFinal: out.userFinal,
      };
    } catch (e) {
      return {
        ...r,
        calcError: e instanceof Error ? e.message : String(e),
      };
    }

    if (deps.buildTrajectory && deps.buildTrajectoryInput) {
      try {
        const builderInput = deps.buildTrajectoryInput(r);
        // null/undefined → skip Builder (fail-closed; no fake trajectory)
        if (builderInput == null) {
          app = {
            ...app,
            trajectory: null,
            diagnostics: {
              ...app.diagnostics,
              reasons: [
                ...(app.diagnostics?.reasons ?? []),
                "builder_skip:invalid_input",
              ],
            },
          };
        } else {
          const traj = deps.buildTrajectory(builderInput);
          app = { ...app, trajectory: traj };
        }
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e);
        app = {
          ...app,
          trajectory: null,
          diagnostics: {
            ...app.diagnostics,
            reasons: [...(app.diagnostics?.reasons ?? []), `builder_fail:${reason}`],
          },
        };
      }
    }

    return app;
  });
}
