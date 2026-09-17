/**
 * Rebuild canonical StrategyEntry.meta for derived/Product members.
 *
 * Product/Cue/C3+ change balls geometry while keeping base sysInputs —
 * therefore meta must be REBUILT via evaluateStrategy → buildStrategyMeta.
 * Never COPY source meta, transformStrategyMeta, or placeholder {}.
 *
 * Profile/anchors come from domain runtimeContractSupply (App-bound),
 * not React globals.
 */

import {
  buildStrategyMeta,
  type EvaluateStrategyForSave,
} from "../adminSaveEngine";
import {
  evaluateStrategy,
  type HptLike,
} from "../evaluateStrategy";
import type {
  Ball3,
  StrategyEntry,
  StrategyMeta,
  StrategySignature,
} from "../positionSearchEngine";
import type { TrackId } from "../finalCoordinateEngine";
import {
  resolveDomainAnchorsData,
  resolveDomainFormulaExpr,
} from "../runtimeContractSupply";
import type {
  FamilyCompatibilityPayload,
  LogicalFamilyMemberCandidate,
} from "./familyAwareWriter";

export type RebuildCanonicalMemberMetaArgs = {
  balls: Ball3;
  signature: StrategySignature;
  sysInputs: Record<string, number>;
  slot?: StrategyEntry["slot"];
  track?: string;
  hpT?: HptLike;
  /**
   * Optional override (tests). Default uses domain evaluateStrategy +
   * runtimeContractSupply profile/anchors.
   */
  evaluateStrategyForSave?: EvaluateStrategyForSave;
};

function defaultEvaluateStrategyForSave(
  hpT: HptLike | undefined
): EvaluateStrategyForSave {
  return (args) => {
    const signature = args.signature as StrategySignature;
    const systemId = String(signature?.systemId ?? "").trim();
    const expr = resolveDomainFormulaExpr(systemId);
    const profile = expr ? { formula: { expr } } : {};
    return evaluateStrategy({
      balls: args.balls as Ball3,
      sysInputs: (args.sysInputs ?? {}) as Record<string, number>,
      signature,
      systemId: systemId || "5_half_system",
      profile,
      anchorsData: resolveDomainAnchorsData(systemId),
      hpT,
      trackId: ((args.track as string | undefined) ?? "B2T_L") as TrackId,
    });
  };
}

/**
 * Deterministic meta rebuild for a member's balls + canonical inputs.
 */
export function rebuildCanonicalMemberMeta(
  args: RebuildCanonicalMemberMetaArgs
): StrategyMeta {
  const signature = args.signature;
  const sysInputs = args.sysInputs ?? {};
  const evaluate =
    args.evaluateStrategyForSave ??
    defaultEvaluateStrategyForSave(args.hpT);

  return buildStrategyMeta({
    balls: args.balls,
    sysInputs,
    signature,
    slot: args.slot ?? "S1",
    track: args.track,
    evaluateStrategy: evaluate,
  });
}

function hpTFromCompatibility(
  compatibility: FamilyCompatibilityPayload
): HptLike {
  const raw = compatibility.hpT;
  if (raw == null || typeof raw !== "object") return undefined;
  const T = (raw as { T?: unknown }).T;
  return typeof T === "string" ? { T } : undefined;
}

/**
 * Attach rebuilt meta onto a LogicalFamilyMemberCandidate (immutable).
 */
export function withRebuiltCanonicalMeta(
  candidate: LogicalFamilyMemberCandidate,
  options?: {
    slot?: StrategyEntry["slot"];
    evaluateStrategyForSave?: EvaluateStrategyForSave;
  }
): LogicalFamilyMemberCandidate {
  const meta = rebuildCanonicalMemberMeta({
    balls: candidate.balls,
    signature: candidate.compatibility.signature,
    sysInputs: { ...(candidate.compatibility.sysInputs ?? {}) },
    slot: options?.slot ?? "S1",
    track: candidate.track,
    hpT: hpTFromCompatibility(candidate.compatibility),
    evaluateStrategyForSave: options?.evaluateStrategyForSave,
  });
  return { ...candidate, meta };
}
