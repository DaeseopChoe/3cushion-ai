/**
 * Real Interpolation engine — domain orchestration (no App Runtime calculation ownership).
 */

import type { Ball3, PositionRecord } from "../positionSearchEngine";
import { nearestByCue, selectBracket } from "./bracket";
import { computeConfidence } from "./confidence";
import {
  buildEnvelopeIndex,
  type RawPublishedEnvelopeDataset,
} from "./envelopeJoin";
import { passesCueTargetGeometryGate } from "./geometryGate";
import { dist } from "./geometryMath";
import {
  buildKnotIndex,
  modalFingerprint,
} from "./knotCorpus";
import { selectTopStrategyResults } from "./selectTop3";
import { passesSecondScoringGate } from "./secondScoring";
import { interpolateSysInputs } from "./sysInterpolate";
import type {
  EnvelopeGeometryView,
  InterpolationKnotView,
  MatchType,
  RealInterpolationStrategyResult,
} from "./types";

export type RealInterpolationSearchInput = {
  query: Ball3;
  /** Knot corpus (PositionRecord leaf / working dataset). */
  positionRecords: PositionRecord[];
  /** Envelope PublishedDataset JSON (geometry only). */
  envelopeDataset: RawPublishedEnvelopeDataset | null | undefined;
};

function pickPrimaryForInterpolated(
  query: Ball3,
  a: InterpolationKnotView,
  b: InterpolationKnotView
): InterpolationKnotView {
  const da = dist(query.cue, a.balls.cue);
  const db = dist(query.cue, b.balls.cue);
  if (da < db - 1e-12) return a;
  if (db < da - 1e-12) return b;
  return a.strategyRef.localeCompare(b.strategyRef) <= 0 ? a : b;
}

function buildFamilyResult(args: {
  query: Ball3;
  family: InterpolationKnotView[];
  envelopeByRef: Map<string, EnvelopeGeometryView>;
}): RealInterpolationStrategyResult | null {
  const { query, family, envelopeByRef } = args;
  if (!family.length) return null;

  // Gate: at least one knot's Envelope must pass Second + Cue/Target.
  type Gated = {
    knot: InterpolationKnotView;
    env: EnvelopeGeometryView;
    dScore: number;
    dCue: number;
    dTarget: number;
    eShape: number;
  };
  const gated: Gated[] = [];

  for (const knot of family) {
    const env = envelopeByRef.get(knot.strategyRef);
    if (!env) continue;
    const second = passesSecondScoringGate(query.second, env.secondSet);
    if (!second.pass) continue;
    const candidateCue = env.cueSet[0];
    const geom = passesCueTargetGeometryGate({
      queryCue: query.cue,
      queryTarget: query.target,
      candidateCue,
      candidateTarget: env.target,
    });
    if (!geom.pass) continue;
    gated.push({
      knot,
      env,
      dScore: second.dScore,
      dCue: geom.dCue,
      dTarget: geom.dTarget,
      eShape: geom.eShape,
    });
  }

  if (!gated.length) return null;

  const gatedFamily = gated.map((g) => g.knot);
  const gateStats = new Map(
    gated.map((g) => [g.knot.strategyRef, g] as const)
  );

  const bracket = selectBracket(query, gatedFamily);

  if (bracket.kind === "empty") return null;

  if (bracket.kind === "exact") {
    const stats = gateStats.get(bracket.knot.strategyRef)!;
    return {
      authoringStrategyId: bracket.knot.authoringStrategyId,
      strategyRef: bracket.knot.strategyRef,
      matchType: "exact",
      confidence: 100,
      sysInputs: { ...bracket.knot.sysInputs },
      ballsQuery: query,
      sourceKnotRefs: [bracket.knot.strategyRef],
      primaryEntry: bracket.knot.entry,
      diagnostics: {
        secondDistance: stats.dScore,
        dCue: stats.dCue,
        dTarget: stats.dTarget,
        eShape: stats.eShape,
        modalInvariantOk: true,
      },
    };
  }

  if (bracket.kind === "interpolated") {
    const fpA = modalFingerprint(bracket.knotA.entry);
    const fpB = modalFingerprint(bracket.knotB.entry);
    const modalOk = fpA === fpB;
    if (!modalOk) {
      // Refuse INTERPOLATED — fall through to nearest primary.
      const nearest = nearestByCue(query, gatedFamily);
      const stats = gateStats.get(nearest.strategyRef)!;
      return finishNearest(query, nearest, stats, {
        reasons: ["modal_invariant_violation"],
        modalInvariantOk: false,
      });
    }

    const blend = interpolateSysInputs(
      bracket.knotA,
      bracket.knotB,
      bracket.lambda
    );
    if (!blend.ok) {
      const nearest = nearestByCue(query, gatedFamily);
      const stats = gateStats.get(nearest.strategyRef)!;
      return finishNearest(query, nearest, stats, {
        reasons: [blend.reason],
        modalInvariantOk: true,
      });
    }

    const primary = pickPrimaryForInterpolated(
      query,
      bracket.knotA,
      bracket.knotB
    );
    const stats = gateStats.get(primary.strategyRef)!;
    const matchType: MatchType = "interpolated";
    const confidence = computeConfidence({
      matchType,
      dScore: stats.dScore,
      dCue: stats.dCue,
      dTarget: stats.dTarget,
      eShape: stats.eShape,
      lambda: bracket.lambda,
    });

    return {
      authoringStrategyId: primary.authoringStrategyId,
      strategyRef: primary.strategyRef,
      matchType,
      confidence,
      sysInputs: blend.sysInputs,
      ballsQuery: query,
      sourceKnotRefs: [
        bracket.knotA.strategyRef,
        bracket.knotB.strategyRef,
      ],
      interpolationLambda: bracket.lambda,
      primaryEntry: primary.entry,
      diagnostics: {
        secondDistance: stats.dScore,
        dCue: stats.dCue,
        dTarget: stats.dTarget,
        eShape: stats.eShape,
        modalInvariantOk: true,
      },
    };
  }

  // nearest
  const stats = gateStats.get(bracket.knot.strategyRef)!;
  return finishNearest(query, bracket.knot, stats, {
    modalInvariantOk: true,
  });
}

function finishNearest(
  query: Ball3,
  knot: InterpolationKnotView,
  stats: {
    dScore: number;
    dCue: number;
    dTarget: number;
    eShape: number;
  },
  diagnostics: {
    reasons?: string[];
    modalInvariantOk?: boolean;
  }
): RealInterpolationStrategyResult {
  const nearestCueDist = dist(query.cue, knot.balls.cue);
  const confidence = computeConfidence({
    matchType: "nearest",
    dScore: stats.dScore,
    dCue: stats.dCue,
    dTarget: stats.dTarget,
    eShape: stats.eShape,
    nearestCueDist,
  });
  return {
    authoringStrategyId: knot.authoringStrategyId,
    strategyRef: knot.strategyRef,
    matchType: "nearest",
    confidence,
    sysInputs: { ...knot.sysInputs },
    ballsQuery: query,
    sourceKnotRefs: [knot.strategyRef],
    primaryEntry: knot.entry,
    diagnostics: {
      ...diagnostics,
      secondDistance: stats.dScore,
      dCue: stats.dCue,
      dTarget: stats.dTarget,
      eShape: stats.eShape,
    },
  };
}

/**
 * Run Real Interpolation search → up to 3 Strategy results.
 * Does not mutate datasets. Does not call Calculator/Builder.
 */
export function runRealInterpolationSearch(
  input: RealInterpolationSearchInput
): RealInterpolationStrategyResult[] {
  const knotIndex = buildKnotIndex(input.positionRecords);
  const envelopeByRef = buildEnvelopeIndex(input.envelopeDataset);

  const results: RealInterpolationStrategyResult[] = [];
  for (const [authoringStrategyId, family] of knotIndex) {
    void authoringStrategyId;
    const result = buildFamilyResult({
      query: input.query,
      family,
      envelopeByRef,
    });
    if (result) results.push(result);
  }

  return selectTopStrategyResults(results);
}
