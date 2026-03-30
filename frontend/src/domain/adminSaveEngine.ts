// frontend/src/domain/adminSaveEngine.ts
import type {
  Ball3,
  Point,
  PositionRecord,
  StrategyEntry,
  StrategyMeta,
  StrategySignature,
  TargetBall,
} from "./positionSearchEngine";

/**
 * 공식 실행 콜백 타입 (저장 파이프라인용).
 * balls + sysInputs로 impact/final 좌표를 계산.
 */
export type EvaluateStrategyForSave = (args: {
  balls: Ball3;
  sysInputs: Record<string, number>;
  signature: StrategySignature;
  slot: "S1" | "S2" | "S3";
  track?: string;
}) => { userImpact: Point; userFinal: Point };

// ---------- 1) createPositionRecord ----------
export function createPositionRecord(args: {
  balls: Ball3;
  positionId?: string;
  targetBall?: TargetBall | null;
}): PositionRecord {
  const positionId =
    args.positionId ?? `pos_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  return {
    positionId,
    balls: args.balls,
    strategies: {},
    ...(args.targetBall === "yellow" || args.targetBall === "red"
      ? { targetBall: args.targetBall }
      : {}),
  };
}

// ---------- 2) createStrategyEntry ----------
export function createStrategyEntry(args: {
  slot: "S1" | "S2" | "S3";
  signature: StrategySignature;
  sysInputs: Record<string, number>;
  hpT?: unknown;
  str?: unknown;
  ai?: unknown;
  balls: Ball3;
  track?: string;
  evaluateStrategy: EvaluateStrategyForSave;
}): StrategyEntry {
  const meta = buildStrategyMeta({
    balls: args.balls,
    sysInputs: args.sysInputs,
    signature: args.signature,
    slot: args.slot,
    track: args.track,
    evaluateStrategy: args.evaluateStrategy,
  });

  return {
    slot: args.slot,
    signature: args.signature,
    track: args.track ?? "B2T_L",
    sysInputs: args.sysInputs,
    hpT: args.hpT,
    str: args.str,
    ai: args.ai,
    meta,
  };
}

// ---------- 3) buildStrategyMeta ----------
export function buildStrategyMeta(args: {
  balls: Ball3;
  sysInputs: Record<string, number>;
  signature: StrategySignature;
  slot: "S1" | "S2" | "S3";
  track?: string;
  evaluateStrategy: EvaluateStrategyForSave;
}): StrategyMeta {
  const { balls, sysInputs, signature, slot, track, evaluateStrategy } = args;

  const { userImpact, userFinal } = evaluateStrategy({
    balls,
    sysInputs,
    signature,
    slot,
    track,
  });

  const impact = userImpact;
  const final = userFinal;

  const angle_ci = Math.atan2(
    impact.y - balls.cue.y,
    impact.x - balls.cue.x
  );
  const angle_fs = Math.atan2(
    balls.second.y - final.y,
    balls.second.x - final.x
  );

  return { impact, final, angle_ci, angle_fs };
}

// ---------- 4) appendPositionToDataset ----------
export function appendPositionToDataset(
  dataset: PositionRecord[],
  newPosition: PositionRecord
): PositionRecord[] {
  return [...dataset, newPosition];
}
